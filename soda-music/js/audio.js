/* ============================================================
 * 汽水音乐 · 音频引擎
 * ------------------------------------------------------------
 * 两种模式，对外接口完全一样，app.js 不需要关心用的是哪种：
 *   1) 真实音频：曲目里写了 src（例如 'audio/xxx.mp3'）→ 用 <audio> 播放
 *   2) 合成音源：没写 src → 用 Web Audio 现场合成（和弦 + 贝斯 + 鼓 + 琶音）
 * 因为不用网络、也不用音频文件，双击 index.html 就有声音。
 * ============================================================ */

window.SodaAudio = (function () {
  'use strict';

  /* ---------- 内部状态 ---------- */
  var ctx = null;              // AudioContext
  var master = null;           // 总音量
  var analyser = null;         // 频谱分析
  var freqData = null;
  var noiseBuffer = null;

  var reverbIn = null;         // 混响发送入口
  var reverbNode = null;       // 卷积混响
  var voiceBus = null;         // 所有合成音先汇到这条总线，方便一次性停声

  var el = null;               // 真实音频模式下的 <audio>
  var mode = 'synth';          // 'synth' | 'file'
  var track = null;            // 当前曲目

  var playing = false;
  var volume = 0.35;

  var schedulerId = null;
  var stepIndex = 0;
  var nextNoteTime = 0;

  // 进度用 AudioContext 的时钟记录（比墙钟准，页面卡顿/挂起都不会跑偏）
  var elapsed = 0;             // 暂停时记住的位置
  var anchorCtxTime = 0;       // 上次起播时的 ctx.currentTime
  var anchorElapsed = 0;       // 上次起播时的位置

  var LOOKAHEAD = 0.12;        // 提前调度的时间（秒）
  var TICK = 25;               // 调度器间隔（毫秒）

  /* ---------- 工具 ---------- */
  function semi(n) {           // 半音 → 频率，以 A3(220Hz) 为基准
    return 220 * Math.pow(2, n / 12);
  }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    freqData = new Uint8Array(analyser.frequencyBinCount);

    master.connect(comp);
    comp.connect(analyser);
    analyser.connect(ctx.destination);

    // 混响：脉冲响应用程序生成，不依赖任何音频文件
    reverbNode = ctx.createConvolver();
    reverbNode.buffer = makeImpulse(ctx, 1.9, 2.4);
    reverbIn = ctx.createGain();
    var wet = ctx.createGain();
    wet.gain.value = 0.3;
    reverbIn.connect(reverbNode);
    reverbNode.connect(wet);
    wet.connect(master);              // 湿声一样受总音量控制

    newVoiceBus();

    // hi-hat 用的白噪声
    var len = Math.floor(ctx.sampleRate * 0.4);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    return ctx;
  }

  // 新开一条发声总线：干声直连总音量，湿声经高通再进混响（低音不糊）
  function newVoiceBus() {
    voiceBus = ctx.createGain();
    voiceBus.gain.value = 1;
    voiceBus.connect(master);

    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 240;
    voiceBus.connect(hp);
    hp.connect(reverbIn);
    voiceBus.hp = hp;                 // 回收时一起断开
  }

  // 让当前所有在响的音快速收尾，然后换一条干净的总线
  // （拖进度条 / 暂停 / 切歌时用，避免旧和弦的尾音叠在新位置上）
  function killVoices() {
    if (!ctx || !voiceBus) return;
    var old = voiceBus;
    var now = ctx.currentTime;
    try {
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(old.gain.value, now);
      old.gain.linearRampToValueAtTime(0.0001, now + 0.07);
    } catch (e) { /* 忽略 */ }
    newVoiceBus();
    setTimeout(function () {
      try { old.disconnect(); } catch (e) { /* 忽略 */ }
      try { if (old.hp) old.hp.disconnect(); } catch (e) { /* 忽略 */ }
    }, 400);
  }

  // 造一段衰减噪声当混响的脉冲响应，听感像小房间
  function makeImpulse(context, seconds, decay) {
    var rate = context.sampleRate;
    var len = Math.floor(rate * seconds);
    var buf = context.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  /* ---------- 音色 ---------- */

  // 通用音：type 波形，dur 时长，gain 音量，cut 低通截止
  function tone(freq, t, dur, type, gain, cut) {
    if (!isFinite(freq) || freq <= 0) return;       // 防御：算不出频率就不发声
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    osc.type = type || 'triangle';
    osc.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cut || 4000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f); f.connect(g); g.connect(voiceBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  // 铺底和弦：两个轻微失谐的三角波，声音更厚（副歌更亮）
  function pad(note, t, dur, chorus) {
    [0, 7].forEach(function (detune) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      var f = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = semi(note);
      osc.detune.value = detune;
      f.type = 'lowpass';
      f.frequency.setValueAtTime(600, t);
      f.frequency.linearRampToValueAtTime(chorus ? 2800 : 1700, t + dur * 0.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(chorus ? 0.07 : 0.055, t + 0.5);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(f); f.connect(g); g.connect(voiceBus);
      osc.start(t); osc.stop(t + dur + 0.1);
    });
  }

  // 贝斯
  function bass(note, t, dur) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = semi(note - 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(voiceBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  // 底鼓
  function kick(t) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(g); g.connect(voiceBus);
    osc.start(t); osc.stop(t + 0.3);
  }

  // 踩镲
  function hat(t, dur, gain) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuffer;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(hp); hp.connect(g); g.connect(voiceBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  /* ---------- 合成调度 ---------- */

  function stepDuration() {
    return 60 / track.bpm / 2;   // 八分音符
  }

  function scheduleStep(i, t) {
    var chords = track.chords;
    var key = track.key || 0;
    var cfg = track.tone || {};
    var wave = cfg.wave || 'triangle';
    var cut = cfg.cut || 3400;
    var bright = cfg.bright || 1.25;

    var beat = i % 16;                                   // 一个小节 16 个八分音符
    var chord = chords[Math.floor(i / 16) % chords.length] || chords[0];
    if (!chord) return;
    var sd = stepDuration();

    /* 4 小节一个乐句，循环 4 种段落：主歌 → 推进 → 副歌 → 收尾
       所以音乐是有起伏的，而不是一个 loop 从头混到尾 */
    var section = Math.floor(i / 64) % 4;
    var chorus = section === 2;

    if (beat === 0) {
      chord.forEach(function (n) { pad(n + key, t, sd * 15, chorus); });
      bass(chord[0] + key, t, sd * 5);
    } else if (beat === 8) {
      bass(chord[0] + key, t, sd * 5);
    } else if (beat % 4 === 0) {
      bass(chord[0] + key, t, sd * 2.4);
    }

    // 琶音（旋律感来源）：副歌升八度、更亮、更响
    var arpNote = chord[((i % chord.length) + chord.length) % chord.length] + key + (chorus ? 24 : 12);
    tone(semi(arpNote), t, sd * 1.6, wave, chorus ? 0.085 : 0.065, cut * (chorus ? bright : 1));
    if (beat % 8 === 4) {
      tone(semi(arpNote + 4), t + sd * 0.5, sd * 1.2, 'square', 0.026, 2600);
    }

    // 节奏组：段落不同，密度不同
    if (beat % 8 === 0 && section !== 3) kick(t);

    if (chorus) {
      if (beat % 4 === 2) hat(t, 0.04, 0.08);
      if (beat % 2 === 1) hat(t, 0.025, 0.032);
    } else if (section === 1 || section === 3) {
      if (beat % 4 === 2) hat(t, 0.04, 0.055);
    }

    if (beat === 12 && section !== 0) hat(t, 0.12, 0.09);
  }

  function scheduler() {
    if (!ctx || !track || !playing) return;
    try {
      while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
        scheduleStep(stepIndex, nextNoteTime);
        nextNoteTime += stepDuration();
        stepIndex++;
      }
    } catch (e) {
      // 单个音符出问题不能让整个调度器卡死
      nextNoteTime = ctx.currentTime + 0.1;
      stepIndex++;
    }
  }

  function startSynth() {
    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
    killVoices();                                  // 干净地开始，清掉上一首的尾巴

    var n = track.chords.length * 16;
    stepIndex = ((Math.floor(elapsed / stepDuration()) % n) + n) % n;
    nextNoteTime = ctx.currentTime + 0.08;

    anchorCtxTime = ctx.currentTime;
    anchorElapsed = elapsed;

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.4);

    if (schedulerId) clearInterval(schedulerId);
    schedulerId = setInterval(scheduler, TICK);
  }

  function stopSynth() {
    if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
    killVoices();
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    }
  }

  /* ---------- 真实音频 ---------- */

  function ensureEl() {
    if (el) return el;
    el = new Audio();
    el.preload = 'auto';
    el.loop = false;
    el.volume = volume;
    el.addEventListener('ended', function () {
      if (api.onEnded) api.onEnded();
    });

    // 只有 http(s) 下才把 <audio> 接进 Web Audio 做频谱：
    // file:// 直开时 createMediaElementSource 会让本地音频变哑，也会被当成跨域
    if (ctx && analyser && location.protocol !== 'file:') {
      try {
        el.crossOrigin = 'anonymous';
        ctx.createMediaElementSource(el).connect(analyser);
      } catch (e) { /* 忽略重复连接 */ }
    }
    return el;
  }

  /* ---------- 对外接口 ---------- */
  var api = {
    onEnded: null,

    /** 载入一首歌（切换歌曲时调用） */
    load: function (t, autoplay) {
      var wasPlaying = playing;
      api.pause();                      // 用的是切换前的模式，正好停掉上一首
      track = t;
      elapsed = 0;
      anchorElapsed = 0;

      if (t.src) {
        mode = 'file';
        ensureCtx();                    // 为了频谱和音量总线
        var a = ensureEl();
        if (a.dataset.src !== t.src) {
          a.src = t.src;
          a.dataset.src = t.src;
        }
        // 同一首歌再次进入也要从头播，否则会停在结尾直接触发 ended
        try { a.currentTime = 0; } catch (e) { /* 元数据未就绪时忽略 */ }
        a.volume = volume;
      } else {
        mode = 'synth';
      }
      if (autoplay || wasPlaying) api.play();
    },

    play: function () {
      if (!track) return;
      if (mode === 'file') {
        ensureCtx();
        if (ctx.state === 'suspended') ctx.resume();
        var a = ensureEl();
        a.volume = volume;
        var p = a.play();
        if (p && p.catch) p.catch(function () { /* 浏览器策略：等用户点击 */ });
      } else {
        startSynth();
      }
      playing = true;
      if (api.onStateChange) api.onStateChange(true);
    },

    pause: function () {
      if (mode === 'file') {
        if (el) el.pause();
      } else {
        if (playing) elapsed = api.getTime();
        stopSynth();
      }
      playing = false;
      if (api.onStateChange) api.onStateChange(false);
    },

    toggle: function () {
      if (playing) api.pause(); else api.play();
    },

    isPlaying: function () { return playing; },
    getMode: function () { return mode; },

    /** 当前播放秒数 */
    getTime: function () {
      if (mode === 'file' && el) return el.currentTime || 0;
      if (!track) return 0;
      if (!playing || !ctx) return elapsed;
      // ctx.currentTime 在挂起时不会前进，所以进度不会跑在音乐前面
      return anchorElapsed + Math.max(0, ctx.currentTime - anchorCtxTime);
    },

    getDuration: function () {
      if (mode === 'file' && el && el.duration && isFinite(el.duration)) return el.duration;
      return (track && track.duration) || 0;
    },

    /** 跳到第 s 秒 */
    seek: function (s) {
      if (!track) return;
      var dur = api.getDuration() || 0;
      s = Math.max(0, Math.min(s, dur));            // 负数 / 超长都要夹住

      if (mode === 'file' && el) {
        try { el.currentTime = s; } catch (e) { /* 忽略 */ }
      } else {
        killVoices();                                // 切掉残留的旧和弦
        elapsed = s;
        if (playing && ctx) {
          anchorCtxTime = ctx.currentTime;
          anchorElapsed = s;
          var n = track.chords.length * 16;
          stepIndex = ((Math.floor(s / stepDuration()) % n) + n) % n;
          nextNoteTime = ctx.currentTime + 0.06;
        }
      }
    },

    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (el) el.volume = volume;
      if (ctx && master && playing) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.15);
      }
    },

    getVolume: function () { return volume; },

    /** 给频谱条用的数据（0~255 的数组） */
    getSpectrum: function () {
      if (!analyser) return null;
      analyser.getByteFrequencyData(freqData);
      return freqData;
    },

    /** 页面上第一次用户交互时调用，解锁浏览器音频 */
    unlock: function () {
      ensureCtx();
      if (ctx.state === 'suspended') ctx.resume();
    }
  };

  return api;
})();
