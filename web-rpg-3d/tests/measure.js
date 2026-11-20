#!/usr/bin/env node
/*
 * 量測：node web-rpg-3d/tests/measure.js
 * 初次載入的檔案大小（index.html 引用的全部檔案＋資料檔＋標題圖，原始與 gzip），
 * 以及桌機 1280×720 與模擬手機 390×844（裝置像素比 3）在高／低畫質下、霧階池站與遭遇場景的幀率與繪製量。
 * 注意：無頭 Chromium 以 SwiftShader（CPU 軟體繪圖）執行 WebGL，幀率遠低於實體 GPU，只能當相對比較；
 *       draw calls 與三角形數與 GPU 無關，可直接參考。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { chromium } = require('playwright');
const D3 = path.resolve(__dirname, '..'), REPO = path.resolve(D3, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sizes() {
  const html = fs.readFileSync(path.join(D3, 'index.html'), 'utf8');
  const files = [path.join(D3, 'index.html')];
  html.replace(/(?:src|href)="([^"]+)"/g, (m, f) => { files.push(path.resolve(D3, f)); });
  const man = fs.readFileSync(path.join(REPO, 'web-rpg/js/data/manifest.js'), 'utf8');
  (man.match(/'js\/data\/[^']+'/g) || []).forEach((s) => files.push(path.join(REPO, 'web-rpg', s.slice(1, -1))));
  files.push(path.join(D3, 'assets/title.jpg'));
  let raw = 0, gz = 0;
  files.forEach((f) => { const b = fs.readFileSync(f); raw += b.length; gz += zlib.gzipSync(b).length; });
  return { files: files.length, rawKB: Math.round(raw / 1024), gzipKB: Math.round(gz / 1024) };
}

async function run(browser, vp, quality) {
  const ctx = await browser.newContext(vp);
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(D3, 'index.html') + '?debug=1&quality=' + quality);
  for (let i = 0; i < 100 && !(await page.evaluate(() => window.__vellora && window.__vellora.scene() === 'title')); i++) await sleep(200);
  await page.evaluate(() => { document.querySelector('.title-menu [data-id="new"]').click(); });
  for (let i = 0; i < 300; i++) { await sleep(150); const s = await page.evaluate(() => ({ u: window.__vellora.ui().length, b: window.__vellora.busy() })); if (!s.u && !s.b) break; await page.keyboard.press('KeyZ'); }
  const out = {};
  await page.evaluate(() => { const V = window.__vellora.V; V.field.load('map.miststep.station', 19, 12, 'up'); V.field.snapCamera(); });
  await sleep(4000);
  out.field = await page.evaluate(() => window.__vellora.r3d());
  await page.evaluate(() => { const V = window.__vellora.V; V.game.s.seen['tut:T-01'] = 1; V.battle.start('enc.p0.boss_slowarch'); });
  for (let i = 0; i < 40; i++) { const b = await page.evaluate(() => window.__vellora.battle()); if (b && b.awaiting) break; await page.keyboard.press('KeyZ'); await sleep(200); }
  await sleep(4000);
  out.battle = await page.evaluate(() => window.__vellora.r3d());
  await ctx.close();
  return out;
}

(async () => {
  console.log('初次載入：', JSON.stringify(sizes()));
  const browser = await chromium.launch();
  const cases = [['桌機 1280×720', { viewport: { width: 1280, height: 720 } }], ['手機 390×844（DPR 3）', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]];
  for (const [name, vp] of cases) for (const q of ['high', 'low']) {
    const r = await run(browser, vp, q);
    console.log(name + ' 畫質 ' + q + '：地圖 ' + r.field.fps + ' fps（' + r.field.frameMs + ' ms/幀，draw calls ' + r.field.calls + '，三角形 ' + r.field.tris + '）；遭遇 ' + r.battle.fps + ' fps（' + r.battle.frameMs + ' ms，calls ' + r.battle.calls + '，三角形 ' + r.battle.tris + '）');
  }
  await browser.close();
})();
