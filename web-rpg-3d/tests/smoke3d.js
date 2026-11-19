#!/usr/bin/env node
/*
 * 3D 版冒煙＋畫面檢查：node web-rpg-3d/tests/smoke3d.js [--quality=low|high] [--only=desktop,portrait,landscape]
 * 不只是按確認：每個畫面都有內容斷言——
 *   - 3D 畫布不是單一顏色（取畫布像素算色彩分散度）
 *   - 過場旁白、對話框、全幅圖是畫面最上層（elementFromPoint 打到自己，不被黑幕蓋住）
 *   - 玩家真的移動了、鏡頭真的轉了、遭遇對象的模型在舞台內
 *   - 選單各分頁、調劑、葉帖、章末的文字與圖片可見
 * 截圖：web-rpg-3d/tests/out/s3-*.png（桌機 1280×720、手機 390×844 直向、844×390 橫向）
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const QUALITY = arg('quality', 'low');
const ONLY = arg('only', 'desktop,portrait,landscape').split(',');
const URL_BASE = 'file://' + path.join(ROOT, 'index.html') + '?debug=1&speed=4&quality=' + QUALITY + '&scale=' + arg('scale', '0.6');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
let page, prefix = 'd', shotNo = 0, passed = 0;
const ST = 'map.miststep.station', SH = 'map.miststep.sheds', TE = 'map.miststep.terrace', SF = 'map.miststep.soilflat',
  BR = 'map.miststep.bridge', UP = 'map.miststep.conduit_upper', LO = 'map.miststep.conduit_lower';

function log(m) { console.log('  ' + m); }
function check(c, msg) { if (!c) throw new Error('檢查失敗：' + msg); passed++; log('✓ ' + msg); }
function q(fn, a) { return page.evaluate(fn, a); }
async function shot(name) { shotNo++; const f = path.join(OUT, 's3-' + prefix + '-' + String(shotNo).padStart(2, '0') + '-' + name + '.png'); await page.screenshot({ path: f }); return f; }
async function waitFor(fn, a, ms, what) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await q(fn, a)) return; await sleep(80); } throw new Error('等待逾時：' + (what || fn.toString())); }
async function key(k) { await page.keyboard.press(k); await sleep(80); }

// 3D 畫布的像素統計：取樣點的亮度分散度與不同顏色數
async function canvasStats() {
  return q(() => {
    const src = document.getElementById('view3d');
    const c = document.createElement('canvas'); c.width = 96; c.height = 54;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0, 96, 54);
    const d = x.getImageData(0, 0, 96, 54).data; const seen = {}; let n = 0, sum = 0, sum2 = 0;
    for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; sum += l; sum2 += l * l; n++; seen[(d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)] = 1; }
    const mean = sum / n; return { mean: Math.round(mean), sd: Math.round(Math.sqrt(sum2 / n - mean * mean)), colors: Object.keys(seen).length };
  });
}
async function checkCanvas(what) {
  await sleep(300);
  const s = await canvasStats();
  check(s.colors >= 12 && s.sd >= 6 && s.mean > 8, what + '：3D 畫面有內容（顏色 ' + s.colors + ' 種、亮度均值 ' + s.mean + '、標準差 ' + s.sd + '）');
  return s;
}
// 元素是畫面最上層：中心點的 elementFromPoint 是它自己或它的子孫
async function topmost(sel, what) {
  const r = await q((sel) => {
    const els = Array.from(document.querySelectorAll(sel)).filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
    if (!els.length) return { ok: false, why: '找不到 ' + sel };
    const e = els[els.length - 1], b = e.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) return { ok: false, why: '尺寸太小' };
    if (b.right < 0 || b.bottom < 0 || b.left > innerWidth || b.top > innerHeight) return { ok: false, why: '在畫面外' };
    const x = Math.min(innerWidth - 2, Math.max(1, b.left + b.width / 2)), y = Math.min(innerHeight - 2, Math.max(1, b.top + Math.min(b.height / 2, 30)));
    const pe = e.style.pointerEvents; e.style.pointerEvents = 'auto';   // pointer-events:none 的元素也要能被打到
    const hit = document.elementFromPoint(x, y); e.style.pointerEvents = pe;
    const fade = parseFloat(getComputedStyle(document.getElementById('fade')).opacity);
    return { ok: !!hit && (hit === e || e.contains(hit)), why: '最上層是 ' + (hit ? hit.className || hit.tagName : '無'), fade, text: (e.innerText || '').slice(0, 30) };
  }, sel);
  check(r.ok, what + '：可見且在最上層' + (r.text ? '（「' + r.text.replace(/\s+/g, ' ') + '」）' : '') + (r.ok ? '' : '——' + r.why));
  return r;
}
async function ui() { return q(() => window.__vellora.ui()); }
async function idle() { return q(() => !window.__vellora.busy() && window.__vellora.ui().length === 0); }
// 推進對話與過場到可以操作；每 n 步截圖一次
async function drive(o) {
  o = o || {};
  for (let i = 0; i < (o.max || 400); i++) {
    const u = await ui(), top = u[u.length - 1];
    if (!top) { if (await idle()) return; await sleep(120); continue; }
    if (top === 'battle') { await q(() => window.__vellora.winEncounter()); continue; }
    if (top === 'dialogue' && await q(() => !!document.querySelector('.dlg-choices:not([hidden]) .li'))) { await q(() => document.querySelector('.dlg-choices:not([hidden]) .li').click()); await sleep(200); continue; }
    if (top === 'choose') { await q(() => { const e = document.querySelector('.choose .li:not(.disabled)'); if (e) e.click(); }); await sleep(200); continue; }
    if (top === 'craft' || top === 'menu') { await key('KeyX'); continue; }
    await key('KeyZ');
  }
}
async function tele(map, x, y, dir) { await q((a) => window.__vellora.teleport(a[0], a[1], a[2], a[3]), [map, x, y, dir]); await sleep(700); await drive(); }
async function newGame() {
  await page.goto(URL_BASE);
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 20000, '標題畫面');
  await sleep(1200);
}

// ======================= 桌機 =======================
async function desktop(browser) {
  console.log('桌機 1280×720（畫質：' + QUALITY + '）');
  prefix = 'd'; shotNo = 0;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await ctx.newPage(); hook();
  await newGame();
  await shot('title'); await checkCanvas('標題背景');
  check((await q(() => window.__vellora.r3d().mode)) === 'title', '標題畫面由 3D 場景繪製');
  await page.click('.title-menu [data-id="new"]');
  // 開場過場：逐步截圖，旁白／對話框必須在最上層（2D 版吃過黑幕蓋住旁白的虧）
  let steps = 0;
  for (let i = 0; i < 300 && steps < 40; i++) {
    await sleep(250);
    const u = await ui(), top = u[u.length - 1];
    if (!top && await idle()) break;
    if (top === 'wait' || top === 'dialogue') {
      steps++;
      if (steps <= 6 || steps % 5 === 0) {
        await shot('opening-' + steps);
        const sel = top === 'wait' ? (await q(() => !!document.querySelector('.cs-narrate')) ? '.cs-narrate p' : '.cs-image img') : '.dlg';
        await topmost(sel, '開場第 ' + steps + ' 步（' + top + '）');
      }
      if (await q(() => !!document.querySelector('.dlg-choices:not([hidden]) .li'))) { await q(() => document.querySelector('.dlg-choices:not([hidden]) .li').click()); continue; }
      await key('KeyZ');
    } else if (top) await key('KeyZ');
  }
  await drive();
  await shot('first-field');
  check((await q(() => window.__vellora.scene())) === 'field', '開場結束後回到地圖');
  const fade = await q(() => parseFloat(getComputedStyle(document.getElementById('fade')).opacity));
  check(fade < 0.05, '地圖上沒有殘留的黑幕（opacity ' + fade + '）');
  await checkCanvas('第一個可操作的畫面');
  const ps = await q(() => window.__vellora.screenOf('player'));
  check(ps && ps.x > 100 && ps.x < 1180 && ps.y > 80 && ps.y < 680, '珂潾的模型在畫面內（' + Math.round(ps.x) + ',' + Math.round(ps.y) + '）');
  // 真實鍵盤移動
  const a = await q(() => window.__vellora.p3());
  await page.keyboard.down('KeyA'); await sleep(900); await page.keyboard.up('KeyA'); await sleep(300);
  const b = await q(() => window.__vellora.p3());
  check(Math.hypot(b.fx - a.fx, b.fy - a.fy) > 0.5, '按住 A 珂潾真的移動了（' + a.fx.toFixed(2) + ' → ' + b.fx.toFixed(2) + '）');
  await page.keyboard.down('KeyE'); await sleep(500); await page.keyboard.up('KeyE');
  const c = await q(() => window.__vellora.p3());
  check(Math.abs(c.yaw - b.yaw) > 0.1, 'E 轉動鏡頭（yaw ' + b.yaw.toFixed(2) + ' → ' + c.yaw.toFixed(2) + '）');
  await q(() => window.__vellora.setYaw(0));
  // 互動提示與對話：走到蒲嬤旁邊
  await tele(ST, 8, 12, 'left'); await sleep(500);
  const t = await q(() => window.__vellora.target());
  check(t && t.id === 'puma', '面向蒲嬤時出現互動提示（目標 ' + (t && t.id) + '）');
  await topmost('#prompt3d', '互動提示');
  await shot('prompt');
  await key('KeyZ'); await sleep(900);
  await shot('dialogue');
  await topmost('.dlg', '對話框');
  await drive();
  // 各張地圖
  const spots = [[ST, 19, 12, 'up', '霧階池站'], [SH, 14, 8, 'up', '站內棚屋'], [TE, 19, 23, 'up', '階梯池・下層'], [TE, 19, 13, 'up', '階梯池・中層'], [TE, 19, 5, 'up', '階梯池・泉源'],
    [SF, 14, 9, 'right', '活土地表'], [BR, 24, 10, 'right', '脈橋'], [UP, 10, 8, 'down', '導管洞上層'], [LO, 17, 15, 'down', '導管洞下層']];
  for (const s of spots) {
    await q((s) => { const V = window.__vellora.V; V.field.load(s[0], s[1], s[2], s[3]); V.field.snapCamera(); }, s);
    await sleep(1600);
    await shot('map-' + s[4]);
    const r = await q(() => window.__vellora.r3d());
    check(r.mode === 'field' && r.calls > 5, s[4] + '：3D 場景（draw calls ' + r.calls + '、三角形 ' + r.tris + '）');
    await checkCanvas(s[4]);
  }
  // 遭遇：教學遭遇、中頭目、首領
  await tele(ST, 22, 18, 'left');
  for (const [id, name] of [['enc.p0.tutorial_first_pool', '教學遭遇（初階池水樣）'], ['enc.p0.quarrel_sutureleaf', '五嘴'], ['enc.p0.mid_dead_tide', '中頭目死潮'], ['enc.p0.boss_slowarch', '首領慢拱']]) {
    await q((id) => { const V = window.__vellora.V; ['T-01', 'T-02', 'T-03', 'T-05', 'T-06', 'T-07', 'T-08', 'T-09', 'T-10', 'T-11'].forEach((t) => { V.game.s.seen['tut:' + t] = 1; }); V.battle.start(id); }, id);
    for (let i = 0; i < 60; i++) { const bb = await q(() => window.__vellora.battle()); if (bb && bb.awaiting) break; await key('KeyZ'); await sleep(150); }
    await sleep(900);
    await shot('battle-' + name);
    const cs = await q(() => window.__vellora.creatureScreen());
    const stage = await q(() => { const r = document.querySelector('.battle .b-stage').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    check(cs && cs.x > stage.l && cs.x < stage.r && cs.y > stage.t && cs.y < stage.b, name + '：對象模型在舞台內（' + Math.round(cs.x) + ',' + Math.round(cs.y) + '）');
    check((await q(() => window.__vellora.r3d().mode)) === 'battle', name + '：由 3D 診療場景繪製');
    await checkCanvas(name);
    await topmost('.battle .b-cmdwrap', name + '：指令面板');
    if (id === 'enc.p0.quarrel_sutureleaf') {
      await q(() => window.__vellora.battleExec({ cmd: 'taste', low: false })); await sleep(1500);
      for (let i = 0; i < 20; i++) { const bb = await q(() => window.__vellora.battle()); if (bb && bb.awaiting) break; await key('KeyZ'); await sleep(200); }
      await shot('battle-after-taste');
      const known = await q(() => window.__vellora.battle().known.filter(Boolean).length);
      check(known >= 1, '嚐味後讀出味符（' + known + ' 個）');
    }
    await q(() => window.__vellora.winEncounter());
    await sleep(400); await drive();
  }
  // 調劑
  await q(() => { window.__vellora.give('smp.ash_moss', 2); window.__vellora.V.craft.openAltar('味診台'); });
  await sleep(700); await shot('craft'); await topmost('.craft, .menu-frame, .panel', '調劑介面'); await key('KeyX'); await sleep(300); await drive();
  // 葉帖繪製（顯影動畫）
  await q(() => { window.__vellora.V.folio.view('F-004', true); }); await sleep(3200); await shot('folio-draw');
  const img = await q(() => { const i = document.querySelector('.folio-view img'); return i && i.complete && i.naturalWidth > 0; });
  check(img, '葉帖頁圖已載入（assets/folios）');
  await topmost('.folio-view .fv-side', '葉帖筆記欄');
  await key('KeyZ'); await sleep(400); await key('KeyZ'); await sleep(400); await drive();
  // 選單各分頁
  for (const tab of ['status', 'items', 'folios', 'quests', 'glossary', 'save', 'settings']) {
    await q((tab) => { window.__vellora.V.menu.open(tab); }, tab); await sleep(500);
    await shot('menu-' + tab); await topmost('.menu-frame', '選單「' + tab + '」');
    if (tab === 'settings') check(await q(() => document.querySelector('.menu-frame').innerText.indexOf('畫質') >= 0), '設定分頁有「畫質」');
    await q(() => { window.__vellora.V.menu.close(); }); await sleep(200);
  }
  // 章末
  await q(() => { window.__vellora.V.screens.ending('default'); }); await sleep(1200);
  await shot('ending'); await topmost('.ending', '章末畫面');
  await ctx.close();
}

// ======================= 手機 =======================
async function mobile(browser, w, h, name) {
  console.log('手機 ' + w + '×' + h + '（' + name + '）');
  prefix = name; shotNo = 0;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  page = await ctx.newPage(); hook();
  const cdp = await ctx.newCDPSession(page);
  await newGame();
  await shot('title'); await checkCanvas('標題背景');
  await topmost('.title-menu', '標題選單');
  await page.tap('.title-menu [data-id="new"]');
  for (let i = 0; i < 8; i++) { await sleep(400); const u = await ui(); if (u.length) break; }
  await sleep(500); await shot('opening');
  await drive();
  await shot('field'); await checkCanvas('地圖');
  await topmost('.tp-stick', '虛擬搖桿');
  await topmost('.tp-a', 'A 鈕');
  // 真實觸控：拖曳搖桿往上
  const st = await q(() => { const r = document.querySelector('.tp-stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; });
  const a = await q(() => window.__vellora.p3());
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: st.x, y: st.y, id: 1 }] });
  for (let k = 1; k <= 5; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: st.x, y: st.y - st.r * 0.18 * k, id: 1 }] }); await sleep(40); }
  await sleep(1000);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(300);
  const b = await q(() => window.__vellora.p3());
  check(Math.hypot(b.fx - a.fx, b.fy - a.fy) > 0.4, '觸控搖桿推動珂潾（' + a.fy.toFixed(2) + ' → ' + b.fy.toFixed(2) + '）');
  // 觸控拖曳畫面轉鏡頭
  const y0 = (await q(() => window.__vellora.p3())).yaw;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: w * 0.7, y: h * 0.4, id: 2 }] });
  for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: w * 0.7 - k * 20, y: h * 0.4, id: 2 }] }); await sleep(40); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
  const y1 = (await q(() => window.__vellora.p3())).yaw;
  check(Math.abs(y1 - y0) > 0.1, '觸控拖曳畫面轉動鏡頭');
  await q(() => window.__vellora.setYaw(0));
  // 對話
  await tele(ST, 8, 12, 'left'); await sleep(400);
  await page.tap('.tp-a'); await sleep(900);
  await shot('dialogue'); await topmost('.dlg', '對話框');
  await drive();
  // 遭遇
  await q(() => { const V = window.__vellora.V; ['T-01', 'T-02'].forEach((t) => { V.game.s.seen['tut:' + t] = 1; }); V.battle.start('enc.p0.boss_slowarch'); });
  for (let i = 0; i < 60; i++) { const bb = await q(() => window.__vellora.battle()); if (bb && bb.awaiting) break; await key('KeyZ'); await sleep(150); }
  await sleep(900); await shot('battle');
  const cs = await q(() => window.__vellora.creatureScreen());
  const stage = await q(() => { const r = document.querySelector('.battle .b-stage').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  check(cs && cs.x > stage.l && cs.x < stage.r && cs.y > stage.t && cs.y < stage.b, '首領模型在舞台內');
  await topmost('.battle .b-cmdwrap', '指令面板');
  const cmdVisible = await q(() => Array.from(document.querySelectorAll('.b-cmd .li')).every((e) => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; }));
  check(cmdVisible, '所有指令都在畫面內（沒有被裁切）');
  await q(() => window.__vellora.winEncounter()); await sleep(500); await drive();
  // 選單
  await page.tap('.tp-menu'); await sleep(700);
  await shot('menu'); await topmost('.menu-frame', '選單');
  await q(() => { window.__vellora.V.menu.close(); }); await sleep(300);
  await q(() => { window.__vellora.V.screens.ending('default'); }); await sleep(1200);
  await shot('ending'); await topmost('.ending', '章末畫面');
  await ctx.close();
}

function hook() {
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[' + prefix + ' console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[' + prefix + ' pageerror] ' + e.message));
}

(async () => {
  const browser = await chromium.launch();
  try {
    if (ONLY.includes('desktop')) await desktop(browser);
    if (ONLY.includes('portrait')) await mobile(browser, 390, 844, 'portrait');
    if (ONLY.includes('landscape')) await mobile(browser, 844, 390, 'landscape');
  } catch (e) {
    console.error('失敗：' + e.message);
    try { await shot('FAIL'); } catch (x) { /* 忽略 */ }
    if (errors.length) console.log(errors.join('\n'));
    await browser.close(); process.exit(1);
  }
  await browser.close();
  if (errors.length) { console.log('console 錯誤：\n' + errors.join('\n')); process.exit(1); }
  console.log('結果：' + passed + ' 項檢查全部通過（截圖於 web-rpg-3d/tests/out/s3-*.png）');
})();
