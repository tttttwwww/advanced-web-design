# AGENTS.md

Static HTML/CSS exercise collection plus one self-contained sub-project. There is **no build, no dependencies, never was a package.json, no tests, no lint**. Do not invent `npm`/`pip`/test commands; verification means opening the page in a browser (VS Code Live Server on port 5501 per `.vscode/settings.json`, or double-clicking the file).

## Layout

- Root `*.html` — standalone course exercises, one file each, styles inline in `<style>`. Numbered by lesson (`6-1`, `6-2`, `7-1 上图下文`, `8-1`, `10-*`, `11-*`, `13-*`).
- `index.html` — homepage linking every exercise page (cards grouped by lesson) plus `soda-music/`.
- `img/` — shared images referenced by root exercises (e.g. `10-2.html` → `img/1.png`).
- `cdn/` — locally vendored icon libraries used by `13-1.html` / `13-2.html`: `cdn/font-awesome/` (Free 6.7.2 CSS + woff2 subsets) and `cdn/lucide/lucide.min.js` (1.59.0 UMD). No network needed; do not replace these with remote CDN links.
- `soda-music/` — self-contained music player; `soda-music/README.md` (Chinese) documents features and how to add tracks.
- `soda-app.html` — 汽水音乐风格单页 App（底部导航五视图 + Web Audio 合成播放器）；CSS/JS 全部内联，不依赖任何构建。
- `icons/` — 阿里图标库 SVG（30 个），供 `soda-app.html` 以 `<img src="icons/xxx.svg">` 引用。图标文件本身是黑色，深色界面靠 CSS `filter: invert(1)` 反相；`全部.svg` / `维修.svg` 已删除自带白底。不要改成远程 CDN 链接。
- `tu_prompt.md` — append-only prompt log (see rules below).

## Gotchas

- The repo directory itself is **named `6-2.html` but is a folder**, and a file `6-2.html` exists inside it. A path ending in `.html` may be a directory.
- Filenames contain Chinese characters and spaces; `6-2.html` links to them verbatim (e.g. `href="7-1 上图下文.html"`). Do not rename files or URL-encode these hrefs — they work as-is from `file://`.
- All source is **UTF-8 without BOM** with heavy Chinese text. PowerShell 5.1 `Get-Content`/`Set-Content` default encoding corrupts it; use `-Encoding UTF8` or the agent's file tools.
- New exercise pages follow: `<html lang="zh-CN">`, UTF-8 charset, viewport meta, all CSS inline, author credit 涂玮轩. (Older files like `6-2.html` use `lang="en"` / `<title>Document</title>` — don't "fix" them.)

## Naming & logging rules (user-mandated)

- **`tu_` prefix**: every CSS class name, id name, and JS variable must start with `tu_` (e.g. `.tu_card`, `id="tu_abs-title"`, `@keyframes tu_cube-tumble`). Applies to all newly created/edited pages. Element tag selectors (`body`, `h2`) and pseudo-classes are exempt.
- **Prompt log**: before executing any user prompt, append it to `tu_prompt.md` — **append only, never overwrite**. Each entry: `## YYYY-MM-DD HH:mm:ss` heading, then 时间 / 模型 / 提示词 (prompt inside a fenced code block). Model: `MiMo-V2.6-Flash Free (provider: opencode, model: mimo-v2.6-flash-free)`.
- **Homepage link**: every newly created HTML file must include a link to `index.html` (the homepage). Use the `.tu_home` pill link (`<a class="tu_home" href="index.html">← 返回首页</a>`) in the page header, and add the page to `index.html`'s card grid. When adding a new exercise, also add its card under the matching lesson section in `index.html`.

## soda-music specifics

- No bundler: three globals loaded in fixed order at the end of `index.html` —
  `js/data.js` (`window.SODA_TRACKS`) → `js/audio.js` (`window.SodaAudio`) → `js/app.js`. Scripts are IIFEs with `'use strict'`; preserve the order and the `window.*` pattern.
- Track data lives in `js/data.js`. Adding `src: 'audio/xxx.mp3'` switches a track to a real file; without `src` audio is synthesized via Web Audio. `audio/` is intentionally empty.
- Player state persists in `localStorage` under key `soda-music-v1`.
- Autoplay is blocked by browsers: the intro overlay ("进入") gates first playback — keep it.
