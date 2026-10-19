/* ============================================================
 * 汽水音乐 · 曲库数据
 * ------------------------------------------------------------
 * 想换成自己的歌：把 mp3 放进 audio/ 文件夹，然后给对应曲目
 * 加上  src: 'audio/xxx.mp3'  这一行即可（不写 src 就用合成音源）。
 *
 * 字段说明：
 *   cover   三个主色 [c1, c2, c3]，决定封面花纹和整页配色
 *   pattern 封面花纹：sun / blob / grid / wave / ring
 *   bpm     速度      key 调式（半音偏移）      duration 时长（秒）
 *   tone    合成音色：wave 波形  cut 低通截止频率  bright 副歌提亮
 *   chords  和弦进行（每个和弦三个半音数）
 *   lyrics  歌词，t = 这句开始出现的秒数
 *   comments 评论区演示数据
 * ============================================================ */

window.SODA_TRACKS = [
  {
    title: '夏夜晚风',
    artist: '涂玮轩',
    album: '汽水星球',
    tags: ['夏日', '清新', '入睡'],
    cover: ['#ffd36e', '#ff6b5b', '#a63fa8'],
    pattern: 'sun',
    bpm: 92,
    key: 0,
    duration: 84,
    tone: { wave: 'triangle', cut: 3200, bright: 1.25 },
    likes: '12.8万',
    comments: '3421',
    chords: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [2, 5, 9]],
    lyrics: [
      { t: 0,   text: '夏夜晚风 吹过我的耳朵' },
      { t: 9,   text: '汽水瓶里 藏着一整个夏天' },
      { t: 18,  text: '你笑着说的那句 我还记得' },
      { t: 27,  text: '像气泡一样 轻轻往上飘' },
      { t: 36,  text: '路灯把影子拉得很长很长' },
      { t: 45,  text: '我们走了很久 也没说完' },
      { t: 54,  text: '如果时间可以慢一点' },
      { t: 63,  text: '我想一直在 这个夏天里' },
      { t: 72,  text: '（间奏）' }
    ],
    commentList: [
      { user: '小汽水', text: '副歌一出来鸡皮疙瘩都起来了', likes: '1.2万', time: '2 小时前' },
      { user: '涂玮轩', text: '第三句歌词是写给夏天的。', likes: '8642', time: '5 小时前' },
      { user: '夜猫子', text: '循环了一整个晚上，睡不着但很幸福', likes: '2109', time: '昨天' }
    ]
  },
  {
    title: '气泡失控',
    artist: '汽水少年',
    album: '汽水星球',
    tags: ['蹦迪', '上头'],
    cover: ['#d7ff3e', '#22d3ee', '#0ea5e9'],
    pattern: 'blob',
    bpm: 124,
    key: 3,
    duration: 78,
    tone: { wave: 'square', cut: 4200, bright: 1.4 },
    likes: '8.6万',
    comments: '1902',
    chords: [[0, 3, 7], [5, 8, 12], [-2, 2, 5], [-4, 0, 3]],
    lyrics: [
      { t: 0,   text: '摇一摇 整个世界都在冒泡' },
      { t: 8,   text: '盖子一拧 谁都别想逃' },
      { t: 16,  text: '糖分超标 心跳也超标' },
      { t: 24,  text: '这一秒 我只要快乐就好' },
      { t: 32,  text: '气泡失控 冲上屋顶' },
      { t: 40,  text: '把烦恼全都冲进下水道' },
      { t: 48,  text: '再来一杯 不要停' },
      { t: 56,  text: '今晚我们 不许睡着' },
      { t: 66,  text: '（间奏）' }
    ],
    commentList: [
      { user: '快乐星球', text: '跑步歌单第一名，配速直接拉满', likes: '9301', time: '1 小时前' },
      { user: '汽水少年', text: '录这首歌的时候喝了三罐汽水', likes: '5210', time: '3 小时前' },
      { user: '阿糖', text: '124 的 BPM 刚刚好，不会太累', likes: '806', time: '昨天' }
    ]
  },
  {
    title: '城市睡眠',
    artist: '夜航船',
    album: '夜行列车',
    tags: ['深夜', '助眠', '独处'],
    cover: ['#6366f1', '#312e81', '#0f172a'],
    pattern: 'grid',
    bpm: 76,
    key: -4,
    duration: 96,
    tone: { wave: 'sine', cut: 2200, bright: 1.1 },
    likes: '5.2万',
    comments: '876',
    chords: [[0, 4, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]],
    lyrics: [
      { t: 0,   text: '凌晨三点 城市终于安静' },
      { t: 11,  text: '最后一班地铁 载走了人群' },
      { t: 22,  text: '便利店的灯 还亮着' },
      { t: 33,  text: '有人在等 一句晚安' },
      { t: 44,  text: '我们都是 睡不着的孩子' },
      { t: 55,  text: '数着心跳 等天亮' },
      { t: 66,  text: '别怕 黑夜也会累' },
      { t: 77,  text: '它只是 舍不得走' },
      { t: 87,  text: '（间奏）' }
    ],
    commentList: [
      { user: '凌晨四点', text: '加班回家路上听这首，突然就不委屈了', likes: '2.3万', time: '4 小时前' },
      { user: '夜航船', text: '写给所有睡不着的人。', likes: '1.1万', time: '8 小时前' },
      { user: '小夜灯', text: '76 的速度像心跳，听着听着就睡着了', likes: '3355', time: '2 天前' }
    ]
  },
  {
    title: '海盐柠檬',
    artist: '林晚 & 涂玮轩',
    album: '汽水星球',
    tags: ['夏天', '旅行', '合唱'],
    cover: ['#5eead4', '#0ea5e9', '#1e3a8a'],
    pattern: 'wave',
    bpm: 104,
    key: 5,
    duration: 72,
    tone: { wave: 'triangle', cut: 3800, bright: 1.3 },
    likes: '21.4万',
    comments: '5603',
    chords: [[0, 4, 9], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]],
    lyrics: [
      { t: 0,   text: '海盐柠檬 加冰三分糖' },
      { t: 8,   text: '你说的口味 我一直没忘' },
      { t: 16,  text: '风吹过发梢 有一点点咸' },
      { t: 24,  text: '像那天的海 和那天的你' },
      { t: 32,  text: '我们坐在礁石上' },
      { t: 40,  text: '把心事说给浪听' },
      { t: 48,  text: '如果还能再来一次' },
      { t: 56,  text: '我还是想 遇见你' },
      { t: 64,  text: '（间奏）' }
    ],
    commentList: [
      { user: '海风', text: '去年夏天在海边听过，今年还在听', likes: '3.4万', time: '30 分钟前' },
      { user: '林晚', text: '和玮轩第一次合唱，很开心～', likes: '2.7万', time: '6 小时前' },
      { user: '柠檬不加冰', text: '副歌和声太好听了，谁懂', likes: '6120', time: '1 天前' }
    ]
  },
  {
    title: '午夜霓虹',
    artist: '霓虹乐队',
    album: '夜行列车',
    tags: ['City Pop', '雨后', '兜风'],
    cover: ['#f472b6', '#a21caf', '#4c1d95'],
    pattern: 'ring',
    bpm: 118,
    key: 7,
    duration: 88,
    tone: { wave: 'sawtooth', cut: 2600, bright: 1.35 },
    likes: '9.9万',
    comments: '2314',
    chords: [[0, 3, 8], [-2, 2, 7], [-4, 0, 5], [-5, -1, 4]],
    lyrics: [
      { t: 0,   text: '霓虹在雨里 化成一滩颜色' },
      { t: 9,   text: '我踩着水洼 走向没有你的街' },
      { t: 18,  text: '出租车灯 一闪而过' },
      { t: 27,  text: '谁在唱 一首很老的歌' },
      { t: 36,  text: '午夜的城市 从不睡觉' },
      { t: 45,  text: '它只是在 假装睡着' },
      { t: 54,  text: '把心事扔进 自动贩卖机' },
      { t: 63,  text: '换一罐 冰镇的自由' },
      { t: 75,  text: '（间奏）' }
    ],
    commentList: [
      { user: '摩托车后座', text: '骑车听这首，整条街都是我的 MV', likes: '1.8万', time: '3 小时前' },
      { user: '霓虹乐队', text: '合成器是乐队老古董了，声音很有味', likes: '9903', time: '1 天前' },
      { user: '雨天限定', text: '真的要在下雨的晚上听', likes: '4421', time: '2 天前' }
    ]
  },
  {
    title: '白桃气泡',
    artist: '涂玮轩',
    album: '汽水星球',
    tags: ['甜', '恋爱', '夏日'],
    cover: ['#fda4af', '#fb7185', '#c026d3'],
    pattern: 'sun',
    bpm: 98,
    key: 2,
    duration: 80,
    tone: { wave: 'triangle', cut: 3600, bright: 1.28 },
    likes: '15.3万',
    comments: '4102',
    chords: [[0, 4, 7], [2, 5, 9], [-3, 0, 4], [-5, -1, 2]],
    lyrics: [
      { t: 0,   text: '白桃气泡 在舌尖上炸开' },
      { t: 9,   text: '像你抬头 笑的那一瞬间' },
      { t: 18,  text: '甜得刚好 不腻不淡' },
      { t: 27,  text: '是我偷偷 调了很久的配方' },
      { t: 36,  text: '把喜欢 装进易拉罐' },
      { t: 45,  text: '摇一摇 就喷得到处都是' },
      { t: 54,  text: '你要不要 尝一口看看' },
      { t: 63,  text: '我的整个 夏天都在里面' },
      { t: 72,  text: '（间奏）' }
    ],
    commentList: [
      { user: '桃子味', text: '表白成功了，谢谢这首歌壮胆', likes: '4.1万', time: '刚刚' },
      { user: '涂玮轩', text: '是甜甜的歌，也是甜甜的夏天。', likes: '2.2万', time: '2 小时前' },
      { user: '一杯冰', text: '前奏一响就想谈恋爱', likes: '7702', time: '昨天' }
    ]
  }
];
