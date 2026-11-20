#!/usr/bin/env node
/*
 * 把 3D 版打包成「單一 HTML 檔」：node web-rpg-3d/tools/build-single.js [輸出路徑]
 * 內嵌：three.js、共用引擎、3D 呈現層、兩份樣式表、序章資料檔，以及資料中引用的圖檔（data URI）。
 * 用途：在沒有整個倉庫的地方（例如線上預覽）也能直接開來玩。平常請直接開 web-rpg-3d/index.html。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const D3 = path.resolve(__dirname, '..');
const REPO = path.resolve(D3, '..');
const ART = process.argv.includes('--artifact');   // Artifact 版：不輸出 doctype／html／head／body（由發佈端包上）
const out = process.argv.filter((a) => !a.startsWith('--'))[2] || path.join(D3, 'dist', ART ? 'vellora-3d-artifact.html' : 'vellora-3d.html');
let html = fs.readFileSync(path.join(D3, 'index.html'), 'utf8');
const read = (rel) => fs.readFileSync(path.resolve(D3, rel), 'utf8');
const esc = (js) => js.replace(/<\/script/gi, '<\\/script');
// 圖檔改成 data URI
function inlineAssets(js) {
  return js.replace(/(['"])assets\/([^'"]+\.(?:jpg|png))\1/g, (m, q, f) => {
    const b = fs.readFileSync(path.join(D3, 'assets', f));
    return q + 'data:image/' + (f.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + b.toString('base64') + q;
  });
}
// 樣式表
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => '<style>\n' + read(href) + '\n</style>');
// 資料檔：依清單內嵌在 main3d.js 之前
const manifest = fs.readFileSync(path.join(REPO, 'web-rpg/js/data/manifest.js'), 'utf8');
const dataFiles = (manifest.match(/'js\/data\/[^']+'/g) || []).map((s) => s.slice(1, -1));
const dataJs = dataFiles.map((f) => '<script>\n' + esc(inlineAssets(fs.readFileSync(path.join(REPO, 'web-rpg', f), 'utf8'))) + '\n</script>').join('\n');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  let js = read(src);
  if (/manifest\.js$/.test(src)) return '<script>\n' + esc(js) + '\n</script>\n' + dataJs + '\n<script>window.VELLORA.dataInlined = true;</script>';
  if (/main3d\.js$/.test(src)) js = js;
  return '<script>\n' + esc(js) + '\n</script>';
});
// 標題圖（meta 之外的引用）
html = html.replace('<title>', '<!-- 單檔版：由 web-rpg-3d/tools/build-single.js 產生，請勿手改 -->\n<title>');
if (ART) {
  const title = '<title>薇蘿：葉帖紀行 3D</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n';
  const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>')).replace(/<meta[^>]*>\s*/g, '').replace(/<title>[^<]*<\/title>\s*/, '').replace(/<!--[^]*?-->\s*/, '');
  const body = html.slice(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body>'));
  const bodyAttrs = '<script>document.body.setAttribute("data-scene","boot");document.body.classList.add("v3d");</script>\n';
  html = title + head + '\n' + bodyAttrs + body;
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('已輸出 ' + path.relative(REPO, out) + '（' + Math.round(fs.statSync(out).size / 1024) + ' KB）');
