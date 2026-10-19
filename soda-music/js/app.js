/* ============================================================
 * 汽水音乐 · 主逻辑
 *   三个视图（推荐 / 精选 / 我的）
 *   全屏竖滑切歌 · 三种播放模式 · 歌词 · 频谱 · 评论 · 记忆
 * ============================================================ */

(function () {
  'use strict';

  var TRACKS = window.SODA_TRACKS || [];
  var A = window.SodaAudio;
  var STORE = 'soda-music-v1';

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };

  var stage = $('stage');
  var nav = $('nav');
  var drawer = $('drawer');
  var drawerList = $('drawerList');
  var toastEl = $('toast');
  var nowplayEl = $('nowplay');
  var intro = $('intro');

  var playBtn = $('playBtn');
  var prevBtn = $('prevBtn');
  var nextBtn = $('nextBtn');
  var loopBtn = $('loopBtn');
  var shuffleBtn = $('shuffleBtn');
  var muteBtn = $('muteBtn');
  var likeBtn = $('likeBtn');
  var likeCount = $('likeCount');
  var commentBtn = $('commentBtn');
  var commentCount = $('commentCount');
  var shareBtn = $('shareBtn');
  var listBtn = $('listBtn');
  var progress = $('progress');
  var progressIn = $('progressIn');
  var progressDot = $('progressDot');
  var curTimeEl = $('curTime');
  var totalTimeEl = $('totalTime');
  var volRange = $('volRange');
  var miniCover = $('miniCover');
  var miniTitle = $('miniTitle');
  var miniArtist = $('miniArtist');
  var searchInput = $('searchInput');

  var picksGrid = $('picksGrid');
  var mineList = $('mineList');
  var mineTip = $('mineTip');

  var sheet = $('commentSheet');
  var sheetSong = $('sheetSong');
  var sheetCount = $('sheetCount');
  var commentList = $('commentList');
  var commentInput = $('commentInput');

  /* ---------- 状态 ---------- */
  var state = {
    index: 0,
    playing: false,
    liked: {},
    mode: 1,            // 1 列表循环 · 2 单曲循环 · 3 随机播放
    volume: 0.35,
    lastVolume: 0.35,   // 记住非零音量，静音解除时用
    muted: false,
    lyricsKey: -1
  };

  /* ---------- 本地记忆 ---------- */
  function savePrefs() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        liked: state.liked,
        volume: state.volume,
        lastVolume: state.lastVolume,
        muted: state.muted,
        index: state.index,
        mode: state.mode
      }));
    } catch (e) { /* 隐私模式下忽略 */ }
  }

  function loadPrefs() {
    var p = {};
    try { p = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { p = {}; }
    if (p.liked) state.liked = p.liked;
    if (typeof p.volume === 'number') state.volume = p.volume;
    if (typeof p.lastVolume === 'number' && p.lastVolume > 0) state.lastVolume = p.lastVolume;
    else if (state.volume > 0) state.lastVolume = state.volume;
    if (typeof p.muted === 'boolean') state.muted = p.muted;
    if (typeof p.mode === 'number') state.mode = p.mode;
    if (typeof p.index === 'number' && p.index >= 0 && p.index < TRACKS.length) state.index = p.index;
  }

  /* ---------- 工具 ---------- */
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function coverStyle(t) {
    return '--c1:' + t.cover[0] + ';--c2:' + t.cover[1] + ';--c3:' + t.cover[2];
  }

  function current() { return TRACKS[state.index]; }

  function flashNowPlaying(t) {
    nowplayEl.innerHTML = '<b>' + t.title + '</b><span>' + t.artist + '</span>';
    nowplayEl.classList.add('show');
    clearTimeout(nowplayEl._t);
    nowplayEl._t = setTimeout(function () { nowplayEl.classList.remove('show'); }, 1500);
  }

  /* ---------- 视图切换 ---------- */
  function setView(name) {
    document.body.setAttribute('data-view', name);
    nav.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === name);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view' + name.charAt(0).toUpperCase() + name.slice(1));
    });
    if (name === 'picks') renderPicks();
    if (name === 'mine') renderMine();
  }

  /* ---------- 渲染：竖滑页 ---------- */
  function renderSlides() {
    stage.innerHTML = TRACKS.map(function (t, i) {
      var bars = '';
      for (var b = 0; b < 28; b++) bars += '<i></i>';
      var lyr = t.lyrics.map(function (l) {
        return '<p class="lyric" data-t="' + l.t + '" title="跳到这里">' + l.text + '</p>';
      }).join('');

      return '' +
        '<section class="slide" data-index="' + i + '" style="' + coverStyle(t) + '">' +
          '<div class="slide-inner">' +
            '<div class="cover-col">' +
              '<div class="cover" data-cover="' + i + '" data-pattern="' + (t.pattern || 'sun') + '">' +
                '<span class="cover-shine"></span>' +
                '<span class="cover-badge">SODA · ' + String(i + 1).padStart(2, '0') + '</span>' +
                '<span class="cover-name">' + t.title + '</span>' +
              '</div>' +
              '<div class="spectrum" data-spectrum="' + i + '">' + bars + '</div>' +
            '</div>' +
            '<div class="info-col">' +
              '<div class="album-tag">专辑 · ' + t.album + '</div>' +
              '<h1 class="song-title">' + t.title + '</h1>' +
              '<div class="song-artist">' + t.artist +
                (t.tags ? '<span class="tags">' + t.tags.map(function (g) {
                  return '<i>' + g + '</i>';
                }).join('') + '</span>' : '') +
              '</div>' +
              '<div class="lyrics" data-lyrics="' + i + '"><div class="lyrics-list">' + lyr + '</div></div>' +
              '<div class="hint">滚轮 / ↑↓ 切歌 &nbsp;·&nbsp; 空格 播放暂停 &nbsp;·&nbsp; 点歌词可跳转</div>' +
            '</div>' +
          '</div>' +
        '</section>';
    }).join('');

    // 封面：点击播放 + 鼠标 3D 倾斜
    stage.querySelectorAll('.cover').forEach(function (c) {
      c.addEventListener('click', function () { A.unlock(); A.toggle(); });

      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(900px) rotateY(' + (px * 13).toFixed(2) +
          'deg) rotateX(' + (-py * 13).toFixed(2) + 'deg) translateY(-6px) scale(1.02)';
      });
      c.addEventListener('mouseleave', function () { c.style.transform = ''; });
    });

    // 歌词：点哪句跳哪句
    stage.querySelectorAll('.lyric').forEach(function (l) {
      l.addEventListener('click', function () { A.seek(parseFloat(l.dataset.t) + 0.01); });
    });
  }

  /* ---------- 渲染：播放列表 ---------- */
  function renderDrawer(filter) {
    var kw = (filter || '').trim().toLowerCase();
    var hitCount = 0;

    drawerList.innerHTML = TRACKS.map(function (t, i) {
      var hit = !kw || (t.title + t.artist + t.album).toLowerCase().indexOf(kw) > -1;
      if (hit) hitCount++;
      return '' +
        '<button class="drawer-item' + (i === state.index ? ' active' : '') + (hit ? '' : ' hidden') + '" data-goto="' + i + '">' +
          '<span class="di-cover" data-pattern="' + (t.pattern || 'sun') + '" style="' + coverStyle(t) + '"></span>' +
          '<span class="di-meta"><b>' + t.title + '</b><small>' + t.artist + ' · ' + t.album + '</small></span>' +
          '<span class="di-time">' + fmt(t.duration) + '</span>' +
        '</button>';
    }).join('') + (hitCount ? '' : '<p class="drawer-empty">没有找到相关歌曲</p>');

    bindGoto(drawerList);
  }

  /* ---------- 渲染：精选页 ---------- */
  function renderPicks() {
    picksGrid.innerHTML = TRACKS.map(function (t, i) {
      return '' +
        '<button class="pick-card' + (i === state.index ? ' current' : '') + '" data-goto="' + i + '">' +
          '<span class="pick-cover" data-pattern="' + (t.pattern || 'sun') + '" style="' + coverStyle(t) + '"></span>' +
          '<span class="pick-info">' +
            '<b>' + t.title + '</b>' +
            '<small>' + t.artist + ' · ' + t.album + '</small>' +
          '</span>' +
          '<span class="pick-tags">' + (t.tags || []).map(function (g) {
            return '<i>' + g + '</i>';
          }).join('') + '</span>' +
          '<span class="pick-dur">' + fmt(t.duration) + '</span>' +
        '</button>';
    }).join('');
    bindGoto(picksGrid);
  }

  /* ---------- 渲染：我的喜欢 ---------- */
  function renderMine() {
    var list = TRACKS.map(function (_, i) { return i; }).filter(function (i) { return state.liked[i]; });

    mineTip.textContent = list.length
      ? '共 ' + list.length + ' 首 · 点一下就能听'
      : '还没有喜欢的歌，去推荐页点个 ♥ 吧';

    if (!list.length) {
      mineList.innerHTML = '<div class="empty"><span>♡</span><p>空空如也</p></div>';
      return;
    }

    mineList.innerHTML = list.map(function (i) {
      var t = TRACKS[i];
      return '' +
        '<button class="drawer-item" data-goto="' + i + '">' +
          '<span class="di-cover" data-pattern="' + (t.pattern || 'sun') + '" style="' + coverStyle(t) + '"></span>' +
          '<span class="di-meta"><b>' + t.title + '</b><small>' + t.artist + ' · ' + t.album + '</small></span>' +
          '<span class="di-time">' + fmt(t.duration) + '</span>' +
        '</button>';
    }).join('');
    bindGoto(mineList);
  }

  function bindGoto(root) {
    root.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () {
        goTo(parseInt(b.dataset.goto, 10), true, true);
      });
    });
  }

  /* ---------- 评论面板 ---------- */
  function openComments() {
    var t = current();
    var list = t.commentList || [];
    sheetSong.textContent = t.title + ' · ' + t.artist;
    sheetCount.textContent = list.length ? list.length + ' 条' : '';
    commentList.innerHTML = list.map(function (c) {
      return '' +
        '<div class="comment">' +
          '<span class="cm-avatar">' + c.user.slice(0, 1) + '</span>' +
          '<div class="cm-body">' +
            '<div class="cm-user">' + c.user + '</div>' +
            '<p class="cm-text">' + c.text + '</p>' +
            '<div class="cm-meta">' + c.time + ' · ' + c.likes + ' 赞</div>' +
          '</div>' +
        '</div>';
    }).join('');
    sheet.classList.add('open');
  }

  /* ---------- 曲目切换 ---------- */
  function applyTrack(i) {
    var t = TRACKS[i], root = document.documentElement.style;

    root.setProperty('--c1', t.cover[0]);
    root.setProperty('--c2', t.cover[1]);
    root.setProperty('--c3', t.cover[2]);

    miniCover.style.cssText = coverStyle(t);
    miniCover.setAttribute('data-pattern', t.pattern || 'sun');
    miniTitle.textContent = t.title;
    miniArtist.textContent = t.artist;
    totalTimeEl.textContent = fmt(t.duration);
    commentCount.textContent = t.comments;

    var liked = !!state.liked[i];
    likeBtn.classList.toggle('liked', liked);
    likeCount.textContent = liked ? (t.likes + '+') : t.likes;

    syncLists();
    if (sheet.classList.contains('open')) openComments();   // 评论面板开着时跟着换

    state.lyricsKey = -1;
    updateMediaSession();
  }

  /* 播放列表抽屉和"我的喜欢"用的是同一个 .drawer-item 类，
     而且"我的"在 DOM 里排在抽屉前面，所以必须按 data-goto 匹配，不能用下标 */
  function syncLists() {
    [drawerList, mineList].forEach(function (root) {
      root.querySelectorAll('[data-goto]').forEach(function (el) {
        el.classList.toggle('active', parseInt(el.dataset.goto, 10) === state.index);
      });
    });
    picksGrid.querySelectorAll('.pick-card').forEach(function (el) {
      el.classList.toggle('current', parseInt(el.dataset.goto, 10) === state.index);
    });
  }

  function goTo(i, autoplay, jumpView) {
    var n = TRACKS.length;
    i = ((i % n) + n) % n;
    var changed = i !== state.index;
    state.index = i;

    A.load(TRACKS[i], autoplay);
    applyTrack(i);
    savePrefs();

    if (jumpView) setView('flow');

    if (changed) {
      flashNowPlaying(TRACKS[i]);
      resetSpectrum(i);
      scrollToIndex(i);          // 不管从哪触发，舞台都要滚过去
    }
    renderDrawer(searchInput.value);
  }

  /* 平滑滚到第 i 屏。
     滚动动画会依次经过中间的每一屏，IntersectionObserver 会误以为"用户滑到了"
     从而连着切歌，所以滚动期间先把它屏蔽掉 */
  var suppressIO = false;

  function scrollToIndex(i) {
    suppressIO = true;
    var top = i * stage.clientHeight;
    if (stage.scrollTo) stage.scrollTo({ top: top, behavior: 'smooth' });
    else stage.scrollTop = top;
    clearTimeout(scrollToIndex._t);
    scrollToIndex._t = setTimeout(function () { suppressIO = false; }, 900);
  }

  function pickRandom() {
    if (TRACKS.length < 2) return state.index;
    var i;
    do { i = Math.floor(Math.random() * TRACKS.length); } while (i === state.index);
    return i;
  }

  /* 一首放完了自动换下一首：进度到头 和 <audio> 的 ended 两条路径可能同时到，
     加把锁，避免一次跳过两首歌 */
  var advancing = false;

  function advance() {
    if (advancing) return;
    advancing = true;
    next();
    setTimeout(function () { advancing = false; }, 1000);
  }

  function next() {
    if (state.mode === 2) { A.seek(0); A.play(); return; }
    goTo(state.mode === 3 ? pickRandom() : state.index + 1, true);
  }

  function prev() {
    if (A.getTime() > 4) { A.seek(0); return; }
    goTo(state.mode === 3 ? pickRandom() : state.index - 1, true);
  }

  /* ---------- 播放模式 ---------- */
  function updateModeUI() {
    var single = state.mode === 2;
    var shuffle = state.mode === 3;
    loopBtn.classList.toggle('single', single);
    loopBtn.classList.toggle('off', shuffle);
    shuffleBtn.classList.toggle('on', shuffle);
    loopBtn.title = single ? '单曲循环' : '列表循环';
    shuffleBtn.title = shuffle ? '随机播放（点一下恢复列表循环）' : '随机播放';
  }

  function setMode(m) {
    state.mode = m;
    updateModeUI();
    savePrefs();
    toast(m === 2 ? '单曲循环' : m === 3 ? '随机播放' : '列表循环');
  }

  /* ---------- 系统媒体控制 ---------- */
  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    var t = current();
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: t.title, artist: t.artist, album: t.album
      });
      navigator.mediaSession.setActionHandler('play', function () { A.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { A.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { prev(); });
      navigator.mediaSession.setActionHandler('nexttrack', function () { next(); });
    } catch (e) { /* 部分浏览器不支持，忽略 */ }
  }

  /* ---------- 滚动切歌 ---------- */
  function watchScroll() {
    var io = new IntersectionObserver(function (entries) {
      if (suppressIO) return;                 // 程序滚动期间不接管
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          var i = parseInt(e.target.dataset.index, 10);
          if (i !== state.index) {
            state.index = i;
            A.unlock();
            A.load(TRACKS[i], true);      // 滑到哪首就播哪首
            applyTrack(i);
            savePrefs();
            flashNowPlaying(TRACKS[i]);
            renderDrawer(searchInput.value);
          }
        }
      });
    }, { root: stage, threshold: [0.6] });

    stage.querySelectorAll('.slide').forEach(function (s) { io.observe(s); });
  }

  /* ---------- 歌词 / 频谱 ---------- */
  var bars = [];
  var lyricCache = { index: -1, wrap: null, list: null, lines: null };

  function collectBars() {
    bars = [];
    TRACKS.forEach(function (_, i) {
      var box = document.querySelector('[data-spectrum="' + i + '"]');
      if (box) bars.push({ i: i, items: box.querySelectorAll('i') });
    });
  }

  function resetSpectrum(except) {
    bars.forEach(function (b) {
      if (b.i === except) return;
      for (var k = 0; k < b.items.length; k++) b.items[k].style.transform = 'scaleY(0.06)';
    });
  }

  function getLyricNodes(i) {
    if (lyricCache.index !== i) {
      var wrap = document.querySelector('[data-lyrics="' + i + '"]');
      lyricCache = {
        index: i,
        wrap: wrap,
        list: wrap ? wrap.querySelector('.lyrics-list') : null,
        lines: wrap ? wrap.querySelectorAll('.lyric') : []
      };
    }
    return lyricCache;
  }

  function updateLyrics(t) {
    var c = getLyricNodes(state.index);
    if (!c.wrap || !c.lines.length) return;

    var active = 0;
    for (var k = 0; k < c.lines.length; k++) {
      if (t >= parseFloat(c.lines[k].dataset.t)) active = k;
    }
    var key = state.index * 1000 + active;
    if (key === state.lyricsKey) return;
    state.lyricsKey = key;

    for (var j = 0; j < c.lines.length; j++) {
      c.lines[j].classList.toggle('active', j === active);
    }
    var h = c.wrap.clientHeight;
    var offset = c.lines[active].offsetTop + c.lines[active].offsetHeight / 2 - h / 2;
    c.list.style.transform = 'translateY(' + (-offset) + 'px)';
  }

  function drawSpectrum() {
    var b = bars[state.index];
    if (!b) return;
    var data = A.isPlaying() ? A.getSpectrum() : null;
    var n = b.items.length;
    for (var k = 0; k < n; k++) {
      var v = 0;
      if (data) {
        var idx = Math.floor(k / n * 90) + 2;
        v = data[idx] / 255;
      }
      b.items[k].style.transform = 'scaleY(' + (0.06 + v * 0.94).toFixed(3) + ')';
    }
  }

  function frame() {
    var t = A.getTime();
    var d = A.getDuration();

    if (state.playing && d > 0 && t >= d) advance();

    var pct = d > 0 ? Math.min(1, t / d) : 0;
    progressIn.style.width = (pct * 100) + '%';
    progressDot.style.left = (pct * 100) + '%';
    curTimeEl.textContent = fmt(t);

    updateLyrics(t);
    drawSpectrum();

    requestAnimationFrame(frame);
  }

  /* ---------- 事件 ---------- */
  function bind() {
    /* 引导层 */
    $('introBtn').addEventListener('click', function () {
      intro.classList.add('hide');
      A.unlock();
      A.load(TRACKS[state.index], true);      // 用户点击过，可以放心播放
      setTimeout(function () { intro.style.display = 'none'; }, 650);
    });

    /* 播放控制 */
    playBtn.addEventListener('click', function () { A.unlock(); A.toggle(); });
    prevBtn.addEventListener('click', function () { A.unlock(); prev(); });
    nextBtn.addEventListener('click', function () { A.unlock(); next(); });

    loopBtn.addEventListener('click', function () { setMode(state.mode === 2 ? 1 : 2); });
    shuffleBtn.addEventListener('click', function () { setMode(state.mode === 3 ? 1 : 3); });

    /* 喜欢 */
    likeBtn.addEventListener('click', function () {
      state.liked[state.index] = !state.liked[state.index];
      applyTrack(state.index);
      savePrefs();
      renderMine();
      if (state.liked[state.index]) toast('已加入我喜欢的音乐 ♥');
    });

    /* 评论 / 分享 / 列表 */
    commentBtn.addEventListener('click', openComments);
    shareBtn.addEventListener('click', share);
    listBtn.addEventListener('click', function () {
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) {
        var act = drawerList.querySelector('.drawer-item.active');
        if (act) act.scrollIntoView({ block: 'center' });
      }
    });

    /* 关闭遮罩 */
    document.querySelectorAll('[data-close]').forEach(function (m) {
      m.addEventListener('click', function () {
        if (m.dataset.close === 'drawer') drawer.classList.remove('open');
        if (m.dataset.close === 'comment') sheet.classList.remove('open');
      });
    });

    /* 评论发送（仅本地演示） */
    function sendComment() {
      var v = commentInput.value.trim();
      if (!v) { toast('先写点什么吧'); return; }
      var t = current();
      t.commentList = t.commentList || [];
      t.commentList.unshift({ user: '涂玮轩', text: v, likes: '0', time: '刚刚' });
      commentInput.value = '';
      openComments();
      toast('评论已发布（演示）');
    }
    $('commentSend').addEventListener('click', sendComment);
    commentInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendComment();
    });

    /* 搜索：输入即过滤并展开列表 */
    searchInput.addEventListener('input', function () {
      renderDrawer(searchInput.value);
      if (!drawer.classList.contains('open')) drawer.classList.add('open');
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { searchInput.blur(); drawer.classList.remove('open'); return; }
      if (e.key === 'Enter') {
        var first = drawerList.querySelector('.drawer-item:not(.hidden)');
        if (first) {
          goTo(parseInt(first.dataset.goto, 10), true, true);
          searchInput.blur();
        }
      }
    });

    /* 进度条 */
    function seekByEvent(e) {
      var r = progress.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      A.seek(Math.max(0, Math.min(1, x / r.width)) * A.getDuration());
    }
    var dragging = false;
    progress.addEventListener('mousedown', function (e) { dragging = true; seekByEvent(e); });
    window.addEventListener('mousemove', function (e) { if (dragging) seekByEvent(e); });
    window.addEventListener('mouseup', function () { dragging = false; });
    progress.addEventListener('touchstart', function (e) { seekByEvent(e); }, { passive: true });

    /* 音量 / 静音 */
    volRange.addEventListener('input', function () {
      state.volume = volRange.value / 100;
      if (state.volume > 0) state.lastVolume = state.volume;   // 记住非零音量
      state.muted = state.volume === 0;
      A.setVolume(state.volume);
      muteBtn.classList.toggle('muted', state.muted);
      savePrefs();
    });
    muteBtn.addEventListener('click', function () {
      state.muted = !state.muted;
      // 之前拖到 0 的话，解除静音要恢复记忆里的音量，不然解锁了还是没声
      if (!state.muted && state.volume === 0) state.volume = state.lastVolume || 0.35;
      A.setVolume(state.muted ? 0 : state.volume);
      volRange.value = state.muted ? 0 : Math.round(state.volume * 100);
      muteBtn.classList.toggle('muted', state.muted);
      savePrefs();
    });

    /* 顶部导航 */
    nav.querySelectorAll('.nav-item').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });

    $('playerLeft').addEventListener('click', function () {
      setView('flow');
      requestAnimationFrame(function () { scrollToIndex(state.index); });
    });

    $('avatarBtn').addEventListener('click', function () {
      toast('涂玮轩，今天也想听点什么呢 🌙');
    });

    /* 键盘 */
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); A.unlock(); A.toggle(); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); goTo(state.index + 1, true); }
      else if (e.code === 'ArrowUp') { e.preventDefault(); goTo(state.index - 1, true); }
      else if (e.code === 'ArrowRight') { A.seek(A.getTime() + 5); }
      else if (e.code === 'ArrowLeft') { A.seek(A.getTime() - 5); }
      else if (e.key === 'l' || e.key === 'L') { likeBtn.click(); }
      else if (e.key === 'Escape') { drawer.classList.remove('open'); sheet.classList.remove('open'); }
    });

    /* 播放状态 → 按钮图标 */
    A.onStateChange = function (playing) {
      state.playing = playing;
      playBtn.classList.toggle('playing', playing);
      playBtn.setAttribute('aria-label', playing ? '暂停' : '播放');
    };
    A.onEnded = function () { advance(); };

    window.addEventListener('resize', function () {
      stage.scrollTop = state.index * stage.clientHeight;
    });
  }

  /* ---------- 分享 ---------- */
  function share() {
    var t = current();
    var text = '《' + t.title + '》- ' + t.artist + ' ｜ 汽水音乐';
    if (navigator.share) {
      navigator.share({ title: '汽水音乐', text: text }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('已复制：' + text);
      }).catch(function () { toast(text); });
    } else {
      toast(text);
    }
  }

  /* ---------- 启动 ---------- */
  function init() {
    loadPrefs();

    renderSlides();
    renderDrawer();
    renderPicks();
    renderMine();
    collectBars();
    bind();
    updateModeUI();

    volRange.value = state.muted ? 0 : Math.round(state.volume * 100);
    muteBtn.classList.toggle('muted', state.muted);
    A.setVolume(state.muted ? 0 : state.volume);

    A.load(TRACKS[state.index], false);   // 先载入不播放（自动播放会被浏览器拦）
    applyTrack(state.index);

    var tip = $('drawerTip');
    if (tip) {
      tip.textContent = '共 ' + TRACKS.length + ' 首 · ' +
        (TRACKS.some(function (t) { return t.src; }) ? '本地音频' : '合成音源');
    }

    // 恢复上次听到的那首
    requestAnimationFrame(function () {
      stage.scrollTop = state.index * stage.clientHeight;
    });

    watchScroll();
    requestAnimationFrame(frame);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
