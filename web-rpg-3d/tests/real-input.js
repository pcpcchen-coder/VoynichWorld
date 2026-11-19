#!/usr/bin/env node
/*
 * 只用真實輸入的實測：node web-rpg-3d/tests/real-input.js [--scale=0.6] [--until=folio|m0-07]
 * 規則：所有「操作」都是 Playwright 的真實鍵盤事件（方向鍵、Z、X）。
 *   - 不使用偵錯傳送、不自動完成遭遇、不直接呼叫遭遇指令、不改遊戲狀態。
 *   - 只「讀」狀態：用來規劃路線（BFS）、判斷目前畫面與選單游標位置、在遭遇中決定下一步（像玩家看畫面一樣）。
 * 從標題畫面的「新遊戲」開始，走到完成第一張葉帖（F-006，五嘴穩定）；--until=m0-07 再繼續到首次調劑。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const URL_BASE = 'file://' + path.join(ROOT, 'index.html') + '?debug=1&quality=low&scale=' + arg('scale', '0.6');
const UNTIL = arg('until', 'folio');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page, shotNo = 0, keys = 0;
const errors = [];
const log = (m) => console.log('  ' + m);
function check(c, m) { if (!c) throw new Error('檢查失敗：' + m); log('✓ ' + m); }
const q = (fn, a) => page.evaluate(fn, a);
async function shot(n) { shotNo++; await page.screenshot({ path: path.join(OUT, 'ri-' + String(shotNo).padStart(2, '0') + '-' + n + '.png') }); }
async function press(k) { keys++; await page.keyboard.press(k); await sleep(90); }
const S = (expr) => q(new Function('return (function(s){ return ' + expr + '; })(window.__vellora.state());'));
const flag = (n) => S("s.flags['" + n + "']");
const top = async () => { const u = await q(() => window.__vellora.ui()); return u[u.length - 1] || null; };

// 清單游標：按方向鍵直到選中 data-id（或文字）符合的項目，再按 Z
async function chooseItem(want, scope) {
  for (let i = 0; i < 16; i++) {
    const st = await q((a) => {
      const els = Array.from(document.querySelectorAll((a.scope || '') + ' button.li')).filter((e) => e.offsetParent !== null);
      const sel = els.findIndex((e) => e.classList.contains('sel'));
      const idx = typeof a.want === 'number' ? a.want : els.findIndex((e) => e.getAttribute('data-id') === a.want || e.textContent.indexOf(a.want) >= 0);
      return { sel, idx, n: els.length };
    }, { want, scope });
    if (st.idx < 0) throw new Error('清單裡找不到「' + want + '」');
    if (st.sel === st.idx) { await press('KeyZ'); return; }
    await press(st.sel < st.idx ? 'ArrowDown' : 'ArrowUp');
    // 兩欄清單：上下移不動時改左右
    const st2 = await q((sc) => Array.from(document.querySelectorAll((sc || '') + ' button.li')).filter((e) => e.offsetParent !== null).findIndex((e) => e.classList.contains('sel')), scope);
    if (st2 === st.sel) await press(st.sel < st.idx ? 'ArrowRight' : 'ArrowLeft');
  }
  throw new Error('游標移不到「' + want + '」');
}
// 推進對話、教學、葉帖等；choices 是遇到選項時依序要選的項目
async function advance(choices, battleFn) {
  const queue = (choices || []).slice();
  for (let i = 0; i < 600; i++) {
    const t = await top();
    if (!t) { if (!(await q(() => window.__vellora.busy()))) return; await sleep(150); continue; }
    if (t === 'battle') { await (battleFn || solveBattle)(); continue; }
    if (t === 'dialogue' && await q(() => !!document.querySelector('.dlg-choices:not([hidden]) .li'))) { await chooseItem(queue.length ? queue.shift() : 0, '.dlg-choices'); continue; }
    if (t === 'choose') { await chooseItem(queue.length ? queue.shift() : 0, '.choose'); continue; }
    if (t === 'folio') { await sleep(2600); await shot('folio'); await press('KeyZ'); await sleep(300); continue; }
    if (t === 'craft' || t === 'menu') { await press('KeyX'); continue; }
    await press('KeyZ');
  }
  throw new Error('advance 逾時');
}
// 遭遇：像玩家一樣看味序決定——有沒讀的就嚐（學會一口兩讀就用低稀釋），讀完就對最前面的味符用對症的藥
async function solveBattle() {
  for (let i = 0; i < 400; i++) {
    const t = await top();
    if (t !== 'battle') { if (t === 'result' || t === 'dialogue' || t === 'pages' || t === 'wait') { await press('KeyZ'); continue; } if (!t) return; }
    const b = await q(() => window.__vellora.battle());
    if (!b) return;
    if (!b.awaiting) { await sleep(150); continue; }
    const view = await q(() => {
      const st = window.__vellora.V.battle.st, s = window.__vellora.state(), D = window.__vellora.V.data;
      const meds = {}; Object.keys(s.items).forEach((id) => { const it = D.items[id]; if (it && it.treats && s.items[id] > 0) meds[it.treats] = id; });
      return { menu: st.menu, known: st.seq.map((g) => g.known && g.reliable ? g.known : null), meds, load: window.__vellora.V.game.loadPct(), low: window.__vellora.V.battle.can('tasteLow'), clear: window.__vellora.V.battle.can('clear') };
    });
    if (view.menu !== 'main') { await press('KeyX'); continue; }
    const front = view.known[0];
    if (view.known.some((k) => !k) && view.load < 90) {
      await chooseItem('taste', '.battle'); await sleep(200);
      await chooseItem(view.low && view.load < 60 ? 'taste:low' : 'taste:high', '.battle');
    } else if (front === '腥' && view.clear) await chooseItem('clear', '.battle');
    else if (front && front !== '甜' && view.meds[front]) { await chooseItem('treat', '.battle'); await sleep(200); await chooseItem(view.meds[front], '.battle'); }
    else await chooseItem('guard', '.battle');
    await sleep(600);
  }
}
// 路線：在目前地圖上 BFS（讀地圖與實體），再用方向鍵一格一格走
async function route(tx, ty) {
  return q((a) => {
    const F = window.__vellora.V.field, p = F.player, W = F.map.pm.w, H = F.map.pm.h;
    const prev = {}, k = (x, y) => x + ',' + y, qu = [[p.x, p.y]]; prev[k(p.x, p.y)] = null;
    while (qu.length) {
      const [x, y] = qu.shift();
      if (x === a.tx && y === a.ty) break;
      for (const [dx, dy, d] of [[1, 0, 'ArrowRight'], [-1, 0, 'ArrowLeft'], [0, 1, 'ArrowDown'], [0, -1, 'ArrowUp']]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || k(nx, ny) in prev) continue;
        if (F.blocked(nx, ny, p) && !(nx === a.tx && ny === a.ty)) continue;
        // 不經過傳送點與觸發點（除非就是目的地）
        if (F.entsAt(nx, ny).some((e) => e.type === 'warp' || e.type === 'trigger') && !(nx === a.tx && ny === a.ty)) continue;
        prev[k(nx, ny)] = [x, y, d]; qu.push([nx, ny]);
      }
    }
    if (!(k(a.tx, a.ty) in prev)) return null;
    const steps = []; let c = [a.tx, a.ty];
    while (prev[k(c[0], c[1])]) { const pv = prev[k(c[0], c[1])]; steps.unshift(pv[2]); c = [pv[0], pv[1]]; }
    return steps;
  }, { tx, ty });
}
async function step(k) {
  const a = await q(() => window.__vellora.player());
  await page.keyboard.down(k); keys++;
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    await sleep(30);
    const b = await q(() => ({ p: window.__vellora.player(), c: window.__vellora.p3(), busy: window.__vellora.busy() }));
    if (b.p.map !== a.map) break;
    if (b.p.x !== a.x || b.p.y !== a.y) { if (b.busy) break; if (Math.abs(b.c.fx - (b.p.x + 0.5)) < 0.2 && Math.abs(b.c.fy - (b.p.y + 0.5)) < 0.2) break; }
  }
  await page.keyboard.up(k); await sleep(120);
}
async function goTo(tx, ty, face) {
  for (let tries = 0; tries < 12; tries++) {
    const p = await q(() => window.__vellora.player());
    if (p.x === tx && p.y === ty) break;
    const r = await route(tx, ty);
    if (!r) throw new Error('找不到路線到 (' + tx + ',' + ty + ')');
    for (const k of r.slice(0, 6)) {
      await step(k);
      if (await q(() => window.__vellora.busy())) { await advance(); break; }
    }
  }
  const p = await q(() => window.__vellora.player());
  if (p.x !== tx || p.y !== ty) throw new Error('走不到 (' + tx + ',' + ty + ')，停在 (' + p.x + ',' + p.y + ')');
  if (face) { await page.keyboard.down(face); await sleep(60); await page.keyboard.up(face); keys++; await sleep(150); }
}
async function act(x, y, face, choices) { await goTo(x, y, face); await press('KeyZ'); await sleep(300); await advance(choices); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now();
  try {
    await page.goto(URL_BASE);
    for (let i = 0; i < 100 && (await q(() => !window.__vellora || window.__vellora.scene() !== 'title')); i++) await sleep(200);
    await sleep(1000); await shot('title');
    console.log('標題 → 新遊戲（按 Z）');
    await press('KeyZ');
    await advance();
    check(await flag('flag.prologue.intro_done'), '開場過場以 Z 推進完畢');
    await shot('field');
    console.log('M0-02 初階池取樣');
    await act(21, 18, 'ArrowLeft');
    check(await flag('flag.prologue.tasted_first_pool'), '走到池邊、按 Z、在遭遇中以方向鍵＋Z 嚐味讀完三符');
    console.log('M0-03 回報蒲嬤');
    await act(8, 12, 'ArrowLeft', [0]);
    check(await flag('flag.prologue.reported_to_puma'), '走到蒲嬤身邊回報');
    console.log('M0-04／M0-05 巡檢');
    await goTo(16, 9); await goTo(15, 9); await advance();
    check(await flag('flag.prologue.m0_04_seen'), '老聆（踩到觸發點）');
    await act(12, 10, 'ArrowUp');
    check(await flag('flag.prologue.observed_station_bellpipe'), '觀察站內鐘管草');
    await act(8, 15, 'ArrowLeft');
    await act(8, 15, 'ArrowUp', [0]);
    check(await flag('flag.prologue.round_gauge'), '水位尺巡檢');
    await act(28, 5, 'ArrowUp');
    await act(27, 3, 'ArrowUp', [0]);
    check(await flag('flag.prologue.round_filter'), '孢子濾幕巡檢');
    await act(20, 25, 'ArrowLeft');
    await act(17, 24, 'ArrowDown', [0, 'rest', 'leave']);
    check(await flag('flag.prologue.round_shrine'), '種源龕巡檢（選單以方向鍵選「入庫並歇息」再「離開」）');
    await shot('after-rounds');
    console.log('M0-06 五嘴');
    await act(24, 11, 'ArrowUp');
    check(await flag('flag.prologue.suture_stabilized'), '五嘴穩定（真實按鍵嚐味、對症處置）');
    check(await S("!!s.folios['F-006']"), '完成第一張葉帖 F-006');
    await shot('folio-done');
    if (UNTIL === 'm0-07') {
      console.log('M0-07 首次調劑');
      await act(25, 14, 'ArrowRight', [0]);
      check(await flag('flag.prologue.first_compound_done') || await flag('flag.prologue.dosage_done'), '味診台調劑');
    }
  } catch (e) {
    console.error('停在：' + e.message);
    await shot('STOP');
    const p = await q(() => ({ p: window.__vellora.player(), ui: window.__vellora.ui() })).catch(() => null);
    console.log('位置：' + JSON.stringify(p));
    console.log('真實按鍵次數：' + keys + '；耗時 ' + Math.round((Date.now() - t0) / 1000) + ' 秒');
    await browser.close(); process.exit(1);
  }
  console.log('真實按鍵次數：' + keys + '；耗時 ' + Math.round((Date.now() - t0) / 1000) + ' 秒（軟體繪圖，不代表遊玩時間）');
  if (errors.length) { console.log('console 錯誤：\n' + errors.join('\n')); await browser.close(); process.exit(1); }
  console.log('結果：只用真實鍵盤輸入，從新遊戲走到第一張葉帖完成');
  await browser.close();
})();
