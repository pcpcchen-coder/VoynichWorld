#!/usr/bin/env node
/*
 * 冒煙測試：以 file:// 開啟遊戲（?debug=1），用偵錯 API 與真實按鍵走完測試房主要流程。
 *   node tests/smoke.js            測試房（?demo=1）
 *   node tests/smoke.js --official 正式資料（正式清單為空時略過）
 * 截圖輸出到 tests/out/。任何階段失敗或 console 有錯誤即回傳非零。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const OFFICIAL = process.argv.includes('--official');
fs.mkdirSync(OUT, { recursive: true });

if (OFFICIAL) {
  const sb = { window: {} }; sb.window.VELLORA = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/data/manifest.js'), 'utf8'), sb);
  const list = sb.window.VELLORA.dataManifest.official || [];
  if (!list.length) { console.log('正式資料清單為空，略過 --official 測試。'); process.exit(0); }
}

const URL_BASE = 'file://' + path.join(ROOT, 'index.html') + '?debug=1&speed=4' + (OFFICIAL ? '' : '&demo=1');
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page, stepNo = 0;

function log(msg) { console.log('  ' + msg); }
async function shot(name) { stepNo++; const f = path.join(OUT, String(stepNo).padStart(2, '0') + '-' + name + '.png'); await page.screenshot({ path: f }); }
function q(fn, arg) { return page.evaluate(fn, arg); }
async function info() { return q(() => { const a = window.__vellora; return { ui: a.ui(), busy: a.busy(), scene: a.scene(), p: a.player() }; }); }
async function waitFor(fn, arg, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) { if (await q(fn, arg)) return; await sleep(60); }
  throw new Error('等待逾時：' + (what || fn.toString()));
}
async function key(k) { await page.keyboard.press(k); await sleep(70); }
// 一路按 Z，直到沒有對話／教學／等待視窗、玩家可操作（遇到 choose 等其他視窗就停）
async function flush(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 20000)) {
    const s = await info();
    const top = s.ui[s.ui.length - 1];
    if (!top && !s.busy) return s;
    if (top === 'dialogue' || top === 'wait' || top === 'pages' || top === 'result') await key('KeyZ');
    else if (top && top !== 'dialogue') return s;
    else await sleep(80);
  }
  throw new Error('flush 逾時：' + JSON.stringify(await info()));
}
async function click(sel) { await page.click(sel, { timeout: 5000 }); await sleep(120); }
// 傳送不等待 onEnter 腳本（其中可能有需要按鍵的對白），之後以 flush 推進
async function tele(map, x, y, dir) { await q((a) => { window.__vellora.teleport(a[0], a[1], a[2], a[3]); }, [map, x, y, dir]); await sleep(500); await flush(); }
async function walk(k, n) { for (let i = 0; i < n; i++) { await page.keyboard.down(k); await sleep(120); await page.keyboard.up(k); await sleep(120); } }
function check(cond, msg) { if (!cond) throw new Error('檢查失敗：' + msg); log('✓ ' + msg); }
async function stateGet(expr) { return q(new Function('return (function(s){ return ' + expr + '; })(window.__vellora.state());')); }

async function openPage(browser, viewport, touch) {
  const ctx = await browser.newContext({ viewport, hasTouch: !!touch, isMobile: !!touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  p.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  return { ctx, p };
}

async function desktop(browser) {
  const o = await openPage(browser, { width: 1280, height: 720 });
  page = o.p;
  await page.goto(URL_BASE);
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await sleep(400); await shot('title');

  log('— 新遊戲 → 開場過場');
  await click('.title-menu [data-id="new"]');
  await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '進入地圖');
  await sleep(300); await shot('cutscene');
  let s = await flush(30000);
  check(s.scene === 'field' && !s.ui.length, '過場結束、回到地圖');
  if (OFFICIAL) { await shot('official-field'); return o.ctx; }
  check(await stateGet("s.seen['tut:T-00'] === true"), '教學 T-00 已顯示');
  await shot('field');

  log('— 移動（真實按鍵）');
  const p0 = s.p;
  await walk('ArrowDown', 2);
  s = await info();
  check(s.p.y === p0.y + 2, '方向鍵向下走兩格（' + p0.y + '→' + s.p.y + '）');

  log('— 對話選項：老聆');
  await tele('demo.village', 7, 5, 'down');
  const elder = (await q(() => window.__vellora.entities())).find((e) => e.id === 'elder');
  await tele('demo.village', elder.x, elder.y - 1, 'down');
  await key('KeyZ');
  await waitFor(() => window.__vellora.ui().indexOf('dialogue') >= 0, null, 5000, '老聆對話');
  // 推到選項出現
  for (let i = 0; i < 30 && !(await q(() => !!document.querySelector('.dlg-choices:not([hidden]) .li'))); i++) await key('KeyZ');
  await shot('dialogue-choice');
  await click('.dlg-choices [data-id="choice2"]'); // 我去處理縫葉
  s = await flush();
  check(await stateGet("s.quests['q.demo.moss'] && s.quests['q.demo.moss'].status === 'active'"), '選項分支開啟任務 q.demo.moss');

  log('— 商店（同一位 NPC 的第二個選項）');
  await key('KeyZ');
  for (let i = 0; i < 30 && !(await q(() => !!document.querySelector('.dlg-choices:not([hidden]) .li'))); i++) await key('KeyZ');
  await click('.dlg-choices [data-id="choice1"]');
  await waitFor(() => window.__vellora.ui().indexOf('craft') >= 0, null, 5000, '商店視窗');
  await click('.craft .menu-list [data-id="con.cake"]');
  await click('.craft .menu-list [data-id="con.cake"]');
  check(await stateGet("(s.items['con.cake']||0) >= 1"), '以池糖籤換到苔餅');
  await shot('shop');
  await key('KeyX');
  s = await flush();

  log('— 取物：採集點、觀察點');
  await tele('demo.wild', 4, 7, 'down');
  s = await flush();
  await key('KeyZ');
  s = await flush();
  check(await stateGet("s.items['smp.ash_moss'] === 1"), '採到灰苔');
  await tele('demo.wild', 15, 5, 'up');
  await key('KeyZ'); s = await flush();
  check(await stateGet("s.flags['flag.demo.obs_pool'] === true"), '觀察池面');

  log('— 調劑：味診台');
  await tele('demo.village', 6, 8, 'down');
  await key('KeyZ');
  await waitFor(() => window.__vellora.ui().indexOf('craft') >= 0, null, 5000, '調劑視窗');
  await click('.craft .menu-list [data-id="rcp.ash"]');
  await click('.craft .menu-list [data-id="rcp.ash"]');
  check(await stateGet("s.items['med.ash'] === 2"), '調出燼灰 ×2');
  await shot('craft');
  await key('KeyX');
  s = await flush();
  check(await stateGet("s.quests['q.demo.moss'].stage === 2"), '任務推進到「heal」階段');

  log('— 只嚐不治遭遇：孢語團');
  await tele('demo.wild', 5, 8, 'up');
  s = await flush();
  await key('KeyZ');
  await waitFor(() => window.__vellora.ui().indexOf('choose') >= 0, null, 5000, '靠近確認');
  await click('[data-id="go"]');
  await battle('read');
  check(await stateGet("s.flags['flag.demo.mote_read'] === true"), '孢語團讀完');

  log('— 診療遭遇：五嘴縫葉（嚐味＋對症處置）');
  await tele('demo.wild', 13, 6, 'right');
  s = await flush();
  await key('KeyZ');
  await waitFor(() => window.__vellora.ui().indexOf('choose') >= 0, null, 5000, '靠近確認');
  await click('[data-id="go"]');
  await battle('stabilized');
  s = await flush(30000);
  check(await stateGet("s.quests['q.demo.moss'].status === 'done'"), '任務完成');
  check(await stateGet("s.items['smp.mite'] === 1 && s.flags['flag.demo.mite_stable'] === true"), '取得樣本與診斷旗標');

  log('— 繪製葉帖');
  await key('Escape');
  await waitFor(() => window.__vellora.ui().indexOf('menu') >= 0, null, 5000, '選單');
  await click('.menu [data-tab="folios"]');
  await sleep(200);
  await shot('menu-folios');
  await click('.menu .menu-list [data-id="F-004"]');
  await click('.menu .menu-list [data-id="F-004"]').catch(() => {});
  await waitFor(() => window.__vellora.ui().indexOf('folio') >= 0, null, 8000, '葉帖顯影');
  await sleep(2500); await shot('folio');
  for (let i = 0; i < 20 && (await q(() => window.__vellora.ui().indexOf('folio') >= 0)); i++) { await key('KeyZ'); await sleep(200); }
  check(await stateGet("!!s.folios['F-004']"), '葉帖 F-004 已繪製');
  await shot('menu-after-folio');
  for (let i = 0; i < 10 && (await q(() => window.__vellora.ui().length > 0)); i++) await key('KeyX');
  s = await flush();

  log('— 種源龕：入庫並歇息＋存檔');
  await tele('demo.village', 11, 8, 'down');
  await key('KeyZ');
  for (let i = 0; i < 20 && !(await q(() => window.__vellora.ui().indexOf('choose') >= 0)); i++) await key('KeyZ');
  await waitFor(() => window.__vellora.ui().indexOf('choose') >= 0, null, 8000, '種源龕選單');
  await click('[data-id="rest"]');
  await sleep(300);
  await click('[data-id="leave"]');
  s = await flush();
  const ok = await q(() => window.__vellora.save('slot1'));
  check(ok !== false, '存檔到 slot1');
  const before = await q(() => { const s = window.__vellora.state(); return { exp: s.exp, folio: !!s.folios['F-004'], map: s.map }; });

  log('— 重新載入並讀檔');
  await page.reload();
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await sleep(200);
  await click('.title-menu [data-id="load"]');
  await sleep(300);
  await shot('load');
  await click('[data-id="slot1"]');
  await click('[data-id="load"]').catch(() => {});
  await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '讀檔進入地圖');
  s = await flush();
  const after = await q(() => { const s = window.__vellora.state(); return { exp: s.exp, folio: !!s.folios['F-004'], map: s.map }; });
  check(JSON.stringify(before) === JSON.stringify(after), '讀檔後狀態一致 ' + JSON.stringify(after));

  log('— 章末');
  await tele('demo.wild', 14, 8, 'down');
  s = await flush();
  await walk('ArrowDown', 1);
  for (let i = 0; i < 30 && !(await q(() => window.__vellora.ui().indexOf('ending') >= 0)); i++) await key('KeyZ');
  await waitFor(() => window.__vellora.ui().indexOf('ending') >= 0, null, 8000, '章末畫面');
  await sleep(600); await shot('ending');
  check(true, '章末畫面顯示');
  return o.ctx;
}

// 遭遇：依真實味序決定指令（嚐味用真實按鍵點選指令列；處置用偵錯 API 指定藥）
async function battle(expect) {
  await waitFor(() => !!window.__vellora.battle(), null, 8000, '進入遭遇');
  let shotTaken = false, tastedByClick = false;
  for (let guard = 0; guard < 400; guard++) {
    const b = await q(() => window.__vellora.battle());
    const ui = await q(() => window.__vellora.ui());
    if (!b) break;
    const top = ui[ui.length - 1];
    if (top === 'dialogue' || top === 'pages' || top === 'result' || top === 'wait') { if (top === 'result' && !shotTaken) { await shot('battle-result-' + expect); shotTaken = true; } await key('KeyZ'); continue; }
    if (b.awaiting && !b.result) {
      if (!tastedByClick || b.turn === 2) await shot('battle-' + expect + '-t' + b.turn);
      const front = b.truth[0], known = b.known[0] && b.reliable[0];
      if (!known || b.readOnly) {
        if (!tastedByClick) {
          await click('.battle [data-id="taste"]');
          await click('.battle [data-id="taste:high"]');
          tastedByClick = true;
        } else await q(() => window.__vellora.battleExec({ cmd: 'taste', low: false }));
      } else if (front === '甜') await q(() => window.__vellora.battleExec({ cmd: 'guard' }));
      else await q(() => window.__vellora.battleExec({ cmd: 'treat', item: 'med.ash' }));
      await sleep(150);
      continue;
    }
    await sleep(80);
  }
  await flush(30000);
  const res = await stateGet("s.flags.last_result");
  check(res === expect, '遭遇結果為 ' + expect + '（實得 ' + res + '）');
}

async function mobile(browser) {
  const o = await openPage(browser, { width: 390, height: 844 }, true);
  page = o.p;
  await page.goto(URL_BASE);
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面（手機）');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await sleep(300); await shot('m-title');
  await page.tap('.title-menu [data-id="new"]'); await sleep(200);
  if (await q(() => window.__vellora.ui().indexOf('choose') >= 0)) await page.tap('[data-id="yes"], .choose .li >> nth=0');
  await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '進入地圖（手機）');
  // 點對話框／等待畫面前進
  for (let i = 0; i < 80; i++) {
    const s = await info(); const top = s.ui[s.ui.length - 1];
    if (!top && !s.busy) break;
    if (i === 6) await shot('m-cutscene');
    const sel = top === 'dialogue' ? '.dlg' : top === 'wait' ? '.cs-narrate, .cs-image' : top === 'pages' ? '.pages [data-id="next"], .pages .btn' : null;
    if (sel && await q((x) => !!document.querySelector(x), sel)) await page.tap(sel).catch(() => {}); else await page.tap('.tp-a').catch(() => {});
    await sleep(150);
  }
  let s = await info();
  check(s.scene === 'field' && !s.ui.length, '手機：以觸控走完開場');
  check(await q(() => document.body.classList.contains('pad-on') && !!document.querySelector('.tp-dpad')), '手機：虛擬方向鍵顯示');
  await shot('m-field');
  const box = await page.locator('.tp-dpad').boundingBox();
  const y0 = s.p.y;
  // 按住方向鍵下半部
  await page.evaluate((b) => {
    const el = document.querySelector('.tp-dpad');
    const o = { pointerId: 7, bubbles: true, clientX: b.x + b.width / 2, clientY: b.y + b.height * 0.9, pointerType: 'touch' };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
  }, box);
  await sleep(450);
  await page.evaluate(() => document.querySelector('.tp-dpad').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true })));
  await sleep(300);
  s = await info();
  check(s.p.y > y0, '手機：虛擬方向鍵可移動（' + y0 + '→' + s.p.y + '）');
  // 選單可點
  await page.tap('.tp-menu'); await sleep(300);
  check(await q(() => window.__vellora.ui().indexOf('menu') >= 0), '手機：≡ 開啟選單');
  await shot('m-menu');
  // 橫向
  await page.setViewportSize({ width: 844, height: 390 }); await sleep(400);
  await shot('m-landscape-menu');
  await page.tap('[data-id="menu-close"]'); await sleep(300);
  await shot('m-landscape-field');
  return o.ctx;
}

function race(p, ms, what) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(async () => {
    let st = ''; try { st = JSON.stringify(await info()); } catch (e) { /* 忽略 */ }
    rej(new Error(what + ' 逾時（' + ms + 'ms），目前狀態：' + st));
  }, ms))]);
}

(async () => {
  const browser = await chromium.launch();
  let failed = false;
  try {
    console.log('桌機 1280×720' + (OFFICIAL ? '（正式資料）' : '（測試房）'));
    await race(desktop(browser), 240000, '桌機流程').then((c) => c.close());
    console.log('手機 390×844（觸控）');
    await race(mobile(browser), 90000, '手機流程').then((c) => c.close());
  } catch (e) {
    failed = true;
    console.error('✗ ' + (e && e.stack || e));
    try { await shot('FAIL'); } catch (e2) { /* 忽略 */ }
  }
  try {
    const extra = page ? await q(() => (window.__vellora && window.__vellora.errors) || []).catch(() => []) : [];
    extra.forEach((x) => errors.push('[debug] ' + x));
  } catch (e) { /* 忽略 */ }
  await browser.close();
  if (errors.length) { failed = true; console.error('console 錯誤 ' + errors.length + ' 則：\n' + errors.join('\n')); }
  console.log(failed ? '結果：失敗' : '結果：全部通過（截圖於 tests/out/）');
  process.exit(failed ? 1 : 0);
})();
