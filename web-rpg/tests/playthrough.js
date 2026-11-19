#!/usr/bin/env node
/*
 * 序章〈味變〉通關測試：node tests/playthrough.js
 * 以 file:// 開正式資料（?debug=1），用偵錯 API 傳送與自動完成遭遇、配合真實按鍵推進對話，
 * 從新遊戲走完主線全部階段到章末畫面；沿途斷言主線階段旗標、6 張葉帖、兩條以上支線、存讀檔、console 無錯誤。
 * 截圖輸出到 tests/out/pt-*.png。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const URL_BASE = 'file://' + path.join(ROOT, 'index.html') + '?debug=1&speed=4';
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page, shotNo = 0;
const Q = 'quest.main.p0_taste_shift';
const ST = 'map.miststep.station', SH = 'map.miststep.sheds', TE = 'map.miststep.terrace', SF = 'map.miststep.soilflat',
  BR = 'map.miststep.bridge', UP = 'map.miststep.conduit_upper', LO = 'map.miststep.conduit_lower';

function log(m) { console.log('  ' + m); }
// 環境變數 VELLORA_CKPT=<目錄>：在幾個主線節點把存檔快照寫成 JSON，供 tests/routes.js 從中途開始測支線與分歧
const CKPT = process.env.VELLORA_CKPT;
async function ckpt(name) { if (!CKPT) return; const snap = await q(() => window.__vellora.V.save.snapshot()); fs.mkdirSync(CKPT, { recursive: true }); fs.writeFileSync(path.join(CKPT, name + '.json'), JSON.stringify(snap)); }
async function shot(name) { shotNo++; await page.screenshot({ path: path.join(OUT, 'pt-' + String(shotNo).padStart(2, '0') + '-' + name + '.png') }); }
function q(fn, arg) { return page.evaluate(fn, arg); }
async function info() { return q(() => { const a = window.__vellora; return { ui: a.ui(), busy: a.busy(), scene: a.scene(), p: a.player() }; }); }
async function waitFor(fn, arg, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) { if (await q(fn, arg)) return; await sleep(60); }
  throw new Error('等待逾時：' + (what || fn.toString()));
}
async function key(k) { await page.keyboard.press(k); await sleep(60); }
// 一次走一格：暫時把遊戲速度調回 1 倍，避免按住時多走
async function walk(k, n) {
  await q(() => window.__vellora.speed(1));
  for (let i = 0; i < n; i++) { await page.keyboard.down(k); await sleep(60); await page.keyboard.up(k); await sleep(120); await waitIdleMove(); }
  await q(() => window.__vellora.speed(4));
}
async function waitIdleMove() { for (let i = 0; i < 40; i++) { const p = await q(() => window.__vellora.player()); if (p && !p.moving) return; await sleep(40); } }
function check(c, msg) { if (!c) throw new Error('檢查失敗：' + msg); log('✓ ' + msg); }
async function S(expr) { return q(new Function('return (function(s){ return ' + expr + '; })(window.__vellora.state());')); }
const flag = (n) => S("s.flags['" + n + "']");
const stage = () => S("(function(){var x=s.quests['" + Q + "'];var d=window.__vellora.V.data.quests['" + Q + "'];return x?(x.status==='done'?'done':d.stages[x.stage].id):'none';})()");

// 點選目前最上層視窗中的清單項目（依 data-id 或文字）
async function pick(want) {
  return q((w) => {
    const els = Array.from(document.querySelectorAll('button.li')).filter((e) => e.offsetParent !== null && !e.classList.contains('disabled'));
    let el = null;
    if (typeof w === 'number') el = els[w];
    else el = els.find((e) => e.getAttribute('data-id') === w) || els.find((e) => e.textContent.indexOf(w) >= 0);
    if (!el) return false;
    el.click(); return true;
  }, want);
}
async function choicesVisible() { return q(() => !!document.querySelector('.dlg-choices:not([hidden]) .li')); }

// 推進對話／教學／遭遇／葉帖等，直到回到可操作的地圖。opts.choices：依序要選的項目（文字或 data-id）
async function drive(opts) {
  opts = opts || {};
  const queue = (opts.choices || []).slice();
  const t0 = Date.now();
  let idle = 0;
  while (Date.now() - t0 < (opts.ms || 90000)) {
    const s = await info();
    const top = s.ui[s.ui.length - 1];
    if (top === 'ending') return 'ending';
    if (top === 'battle') {
      if (opts.onBattle) { const f = opts.onBattle; opts.onBattle = null; await f(); continue; }
      await q(() => window.__vellora.winEncounter()); continue;
    }
    if (top === 'folio') {
      if (opts.onFolio) { const f = opts.onFolio; opts.onFolio = null; await f(); }
      await sleep(400); await key('KeyZ'); continue;
    }
    if (top === 'dialogue') {
      if (await choicesVisible()) { const w = queue.length ? queue.shift() : 0; if (!(await pick(w))) throw new Error('找不到選項：' + w); await sleep(150); }
      else await key('KeyZ');
      continue;
    }
    if (top === 'choose') { const w = queue.length ? queue.shift() : 'go'; if (!(await pick(w))) { if (!(await pick(0))) throw new Error('choose 找不到：' + w); } await sleep(200); continue; }
    if (top === 'craft') { if (opts.onCraft) { const f = opts.onCraft; opts.onCraft = null; await f(); } else await key('KeyX'); await sleep(150); continue; }
    if (top === 'pages' || top === 'wait' || top === 'result' || top === 'image' || top === 'narrate') { await key('KeyZ'); continue; }
    if (top) { await key('KeyZ'); continue; }
    if (!s.busy) { if (++idle > 3) return 'idle'; } else idle = 0;
    await sleep(90);
  }
  throw new Error('drive 逾時：' + JSON.stringify(await info()));
}
// 遭遇中：把教學、事件台詞推完，直到可以下指令
async function untilAwaiting() {
  for (let i = 0; i < 300; i++) {
    const b = await q(() => window.__vellora.battle()); const ui = await q(() => window.__vellora.ui());
    if (b && b.awaiting && ui[ui.length - 1] === 'battle') return;
    const top = ui[ui.length - 1];
    if (top === 'pages' || top === 'dialogue' || top === 'wait') await key('KeyZ'); else await sleep(80);
  }
  throw new Error('等不到遭遇指令');
}
// 傳送（偵錯 API）後推進 onEnter
async function tele(map, x, y, dir) { await q((a) => { window.__vellora.teleport(a[0], a[1], a[2], a[3]); }, [map, x, y, dir]); await sleep(450); await drive(); }
// 站在 (x,y) 面向 dir，按真實的 Z 互動
async function act(map, x, y, dir, opts) {
  const p = await q(() => window.__vellora.player());
  if (!p || p.map !== map || p.x !== x || p.y !== y) await tele(map, x, y, dir);
  await q((d) => window.__vellora.face(d), dir);
  await sleep(80); await key('KeyZ'); await sleep(200);
  return drive(opts);
}

async function main() {
  const browser = await chromium.launch();
  if (process.argv.includes('--mobile')) { await mobile(browser); await browser.close(); return; }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto(URL_BASE);
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await sleep(500); await shot('title');

  console.log('T1 開場與教學');
  await page.click('.title-menu [data-id="new"]');
  await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '進入地圖');
  await drive();
  check(await flag('flag.prologue.intro_done') && (await stage()) === 's1', 'M0-01 開場：intro_done、任務階段 s1');
  await shot('station-start');
  await walk('ArrowLeft', 3);
  const p1 = await q(() => window.__vellora.player());
  check(p1.x === 21 && p1.y === 18, '真實按鍵向左走 3 格到取樣點旁（' + p1.x + ',' + p1.y + '）');
  await key('KeyZ');
  await drive({ onBattle: async () => {
    await untilAwaiting();
    await shot('battle-first-pool');
    await page.click('.battle [data-id="taste"]'); await sleep(150); await page.click('.battle [data-id="taste:high"]'); await sleep(300);
  } });
  check(await flag('flag.prologue.tasted_first_pool'), 'M0-02 第一次嚐味（三符讀完）');
  await act(ST, 8, 12, 'left', { choices: [0] });
  check(await flag('flag.prologue.reported_to_puma') && (await stage()) === 's2', 'M0-03 回報蒲嬤、取得巡檢藥料、階段 s2');
  check(await S("s.items['item.sample.spring_crystal']") === 4, '巡檢藥料：礦泉結晶 ×4');

  console.log('T2 池站巡檢');
  await tele(ST, 16, 9, 'left'); await walk('ArrowLeft', 1); await drive();
  check(await flag('flag.prologue.m0_04_seen'), 'M0-04 老聆（觀察點教學）');
  await act(ST, 12, 10, 'up');
  check(await flag('flag.prologue.observed_station_bellpipe') && await flag('folio.f004.c1'), 'M0-04 觀察站內鐘管草（F-004 觀察）');
  await act(ST, 8, 15, 'left');
  await act(ST, 8, 15, 'up', { choices: [0] });
  check(await flag('flag.prologue.round_gauge') && await S("s.quests['quest.side.p0_tide_marks'].status==='active'"), 'M0-05 水位尺巡檢＋接取 S0-1');
  await act(ST, 28, 5, 'up');
  await act(ST, 27, 3, 'up', { choices: [0] });
  check(await flag('flag.prologue.round_filter'), 'M0-05 孢子濾幕巡檢');
  await act(ST, 20, 25, 'left');
  await act(ST, 17, 24, 'down', { choices: [0, 'rest', 'leave'] });
  check(await flag('flag.prologue.round_shrine') && await S("s.quests['quest.side.p0_shrine_slot'].status==='active'"), 'M0-05 種源龕巡檢＋接取 S0-3');
  check(await S('s.level') === 2 && await S("s.skills.indexOf('skill.double_read')>=0"), '三處巡檢後升到等級 2（一口兩讀）');
  await act(ST, 24, 11, 'up');
  check(await flag('flag.prologue.suture_stabilized') && await S("!!s.folios['F-006']"), 'M0-06 五嘴穩定、葉帖 F-006 繪製');
  await act(ST, 25, 14, 'right', { choices: [0], onCraft: async () => {
    await shot('altar');
    for (const r of ['rcp.p0.emberash', 'rcp.p0.indolk', 'rcp.p0.pool_sugar']) { await pick(r); await sleep(150); await pick(r); await sleep(200); }
    await key('KeyX');
  } });
  check(await flag('flag.prologue.dosage_done') && await flag('flag.prologue.first_compound_done') && await flag('folio.f174.c2'), 'M0-07 首次調劑（劑量三選一）、四味各調一份');
  await tele(SH, 13, 5, 'up'); await shot('shed-pool');
  await act(SH, 13, 5, 'up');
  check(await flag('flag.prologue.got_seal_clamp') && await flag('flag.prologue.terrace_open') && (await stage()) === 's3', 'M0-07 取得封脈夾、北口開放、階段 s3');
  check(await S('s.level') === 3, '等級 3（穩掌）');
  // 記脈棚：行囊匣
  await act(SH, 6, 2, 'up');
  check(await S("s.items['item.currency.sugar_tally']") >= 6, '記脈棚行囊匣（池糖籤 ×6）');
  await ckpt('p1');

  console.log('支線 S0-4 別踩那一塊（P1）');
  await tele(ST, 18, 24, 'down');
  const ya = (await q(() => window.__vellora.entities())).find((e) => e.id === 'yaya' && e.visible);
  await act(ST, ya.x, ya.y - 1, 'down', { choices: [0] });
  check(await S("s.quests['quest.side.p0_soft_ground'].status==='active'"), '接取 S0-4');
  await tele(SF, 22, 12, 'right'); await walk('ArrowRight', 1); await drive();
  check(await S("s.seen['tut:T-12']===true"), '走到乾裂區邊緣（教學 T-12）');
  await walk('ArrowRight', 1); await walk('ArrowRight', 1); await walk('ArrowUp', 1); await walk('ArrowRight', 1); await walk('ArrowUp', 1);
  const pli = await q(() => window.__vellora.player());
  check(pli.x === 26 && pli.y === 10, '沿著還長草的落腳點走到礫身邊（' + pli.x + ',' + pli.y + '）');
  await q(() => window.__vellora.face('right')); await key('KeyZ'); await drive();
  check(await flag('flag.prologue.li_rescued') && await S("s.quests['quest.side.p0_soft_ground'].status==='done'"), 'S0-4 完成（礫回到小徑）');
  await act(SF, 4, 16, 'left');
  check(await flag('flag.prologue.tide_read_soilflat'), 'S0-1：讀活土原邊尺');
  await shot('soilflat-p1');

  console.log('T3 階梯泉');
  await tele(ST, 19, 2, 'up'); await walk('ArrowUp', 2); await drive();
  check((await q(() => window.__vellora.player())).map === TE, '由北口進入階梯泉');
  await act(TE, 19, 23, 'up');
  check(await S("window.__vellora.state().encDone['" + TE + "/seep']==='stabilized'"), 'M0-08 鹹殼滲口穩定（棧道通行）');
  await shot('terrace');
  await act(TE, 4, 12, 'left');
  await act(TE, 9, 12, 'up');
  await act(TE, 5, 15, 'up');
  check(await S("!!s.folios['F-005']"), 'M0-08 池糖囊叢：葉帖 F-005 繪製');
  await act(TE, 31, 11, 'up');
  check(await flag('flag.prologue.tide_read_terrace'), 'S0-1：讀二階水位尺');
  await tele(TE, 9, 3, 'left'); await walk('ArrowLeft', 1); await drive();
  check(await flag('folio.f161.c2'), 'M0-09 泉源望台（F-161 觀察點二）');
  await act(TE, 19, 5, 'up');
  check(await flag('flag.prologue.tasted_spring_source'), 'M0-09 三階泉源比對：鹹、甜');

  console.log('T4 汲蟲死亡與低鳴');
  await tele(TE, 19, 30, 'down'); await walk('ArrowDown', 1); await drive();
  check(await flag('flag.prologue.drawmites_dying') && await flag('flag.prologue.puma_forbade_bridge') && (await stage()) === 's5', 'M0-10 汲蟲淤塞、清淤、蒲嬤不准去橋、階段 s5');
  check(await S("s.vein.miststep==='slow_flow'") && await S("s.skills.indexOf('skill.desilt')>=0"), '脈況改為流慢；學會清淤');
  check(await S("!!s.folios['F-174']"), '葉帖 F-174 繪製（四味各對症使用過）');
  await shot('station-p2');
  await act(ST, 8, 15, 'left');
  check(await flag('flag.prologue.side_tide_done'), 'S0-1 回報汐伯（三尺同）');
  if (!(await S("s.items['item.med.pool_sugar']||0"))) await q(() => window.__vellora.give('item.med.pool_sugar', 1));
  await act(ST, 20, 25, 'left', { choices: [0] });
  check(await flag('flag.prologue.shrine_slot_filled'), 'S0-3 回潤第七格種莢');
  await ckpt('p2');
  // 存檔與讀檔
  const saved = await q(() => window.__vellora.save('slot1'));
  check(saved !== false, '存檔到 slot1');
  const before = await q(() => { const s = window.__vellora.state(); return JSON.stringify({ exp: s.exp, lv: s.level, fol: Object.keys(s.folios).sort(), map: s.map, q: s.quests, f: s.flags['flag.prologue.drawmites_dying'] }); });
  await page.reload();
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await sleep(300);
  await page.click('.title-menu [data-id="load"]'); await sleep(300);
  await page.click('[data-id="slot1"]'); await sleep(200);
  await page.click('[data-id="load"]').catch(() => {});
  await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '讀檔進入地圖');
  await drive();
  const after = await q(() => { const s = window.__vellora.state(); return JSON.stringify({ exp: s.exp, lv: s.level, fol: Object.keys(s.folios).sort(), map: s.map, q: s.quests, f: s.flags['flag.prologue.drawmites_dying'] }); });
  check(before === after, '重新載入後讀檔，狀態一致');

  console.log('T5 循聲');
  await tele(ST, 38, 12, 'right'); await walk('ArrowRight', 1); await drive();
  check((await q(() => window.__vellora.player())).map === SF, '由東口進入活土原');
  await act(SF, 13, 8, 'right');
  check(await S("!!s.folios['F-004']"), 'M0-11 低鳴鐘管草穩定、葉帖 F-004 繪製');
  await act(SF, 40, 22, 'right', { choices: [0] });
  check(await flag('flag.prologue.bridge_open') && await flag('flag.prologue.gao_told_hatch'), 'M0-11 篙放行');
  await tele(SF, 42, 22, 'right'); await walk('ArrowRight', 1); await drive();
  check((await q(() => window.__vellora.player())).map === BR, '進入脈橋');
  await tele(BR, 23, 10, 'right'); await walk('ArrowRight', 1); await drive();
  check(await S("!!s.folios['F-161']"), 'M0-12 橋心：葉帖 F-161 繪製');
  await shot('bridge');
  await act(BR, 24, 9, 'up');
  check(await flag('flag.prologue.smelled_sulfur'), 'M0-12 封板：硫');
  await act(BR, 36, 11, 'down', { choices: [0] });
  check(await flag('flag.prologue.entered_conduit') && (await stage()) === 's6', 'M0-12 下橋腹、階段 s6');

  console.log('T6 橋腹導管洞');
  check((await q(() => window.__vellora.player())).map === UP, '進入導管洞上層');
  await act(UP, 7, 2, 'right');
  await act(UP, 12, 2, 'up'); await act(UP, 10, 3, 'left');
  check(await flag('flag.prologue.heard_fork_a'), 'M0-13 岔口甲：聽音高');
  await ckpt('pre_tide');
  await shot('conduit-upper');
  await act(UP, 17, 11, 'down');
  check(await flag('flag.prologue.embolus_cleared'), 'M0-13 死潮穩定（embolus_cleared）');
  check(await S('s.level') === 5, '等級 5（三讀）');
  await act(UP, 17, 15, 'left');
  check(await flag('flag.prologue.valve_upper_open'), 'M0-13 上層活瓣打開、階梯排乾');
  await tele(UP, 17, 19, 'down'); await walk('ArrowDown', 1); await drive();
  check((await q(() => window.__vellora.player())).map === LO, '下到下層');
  // 活瓣謎題
  await act(LO, 3, 2, 'up');
  check(await flag('flag.prologue.valve_jia_open'), 'M0-14 活瓣甲：西落東起');
  await tele(LO, 4, 4, 'right');
  for (let i = 0; i < 9; i++) await walk('ArrowRight', 1);
  const pis = await q(() => window.__vellora.player());
  check(pis.x === 13, '涉過變淺的西池到中島（x=' + pis.x + '）');
  await act(LO, 14, 5, 'up');
  check(await flag('flag.prologue.read_old_gauge'), 'M0-14 舊水位尺（刻痕）');
  await act(LO, 18, 3, 'up', { choices: ['rest', 'leave', 0] });
  await act(LO, 17, 6, 'down');
  check(await flag('flag.prologue.valve_yi_open'), 'M0-14 活瓣乙：東落西起');
  await tele(LO, 21, 4, 'right');
  for (let i = 0; i < 8; i++) await walk('ArrowRight', 1);
  await drive();
  check((await q(() => window.__vellora.player())).x === 29, '涉過東池到東通道');
  await shot('conduit-lower');
  await act(LO, 30, 4, 'right');
  check(await S("window.__vellora.state().encDone['" + LO + "/scab']==='stabilized'"), 'M0-14 滲硫痂口穩定');
  await walk('ArrowRight', 3); await drive();
  check(await flag('flag.prologue.slowarch_recognized') && await flag('folio.f007.c1'), 'M0-14 修剪痕：認出慢拱');
  await ckpt('pre_boss');

  console.log('T7 首領：慢拱');
  await walk('ArrowRight', 1);
  for (let i = 0; i < 8; i++) await walk('ArrowDown', 1);
  await drive({ onBattle: async () => {
    await untilAwaiting();
    await shot('boss-battle');
    // 先嚐再治：低稀釋讀兩次
    await q(() => window.__vellora.battleExec({ cmd: 'taste', low: true })); await sleep(1200);
  }, onFolio: async () => { await sleep(2600); await shot('folio-f007'); } });
  check(await flag('flag.prologue.slowarch_stabilized') && await S("s.items['item.key.backgarden_sprout']===1"), 'M0-15 慢拱穩定、背園新芽');
  check(await S("!!s.folios['F-007']"), '葉帖 F-007 繪製');

  console.log('T8 殘葉、坦白、出發');
  await tele(LO, 10, 16, 'left'); await walk('ArrowLeft', 1); await drive();
  for (let i = 0; i < 6; i++) await walk('ArrowLeft', 1);
  await drive({ ms: 120000 });
  check(await flag('flag.prologue.got_auri_leaf') && (await stage()) === 's7' && await S("s.items['item.key.auri_leaf_01']===1"), 'M0-16 奧芮殘葉①、階段 s7');
  check((await q(() => window.__vellora.player())).map === ST, '回到池站（池守棚門外）');
  await ckpt('pre_confess');
  await walk('ArrowUp', 1); await drive();
  check((await q(() => window.__vellora.player())).map === SH, '池守棚門已解鎖');
  await walk('ArrowUp', 1);
  await drive({ choices: [0, 0], ms: 120000 });
  check(await flag('flag.prologue.puma_confessed') && await flag('flag.prologue.seal_reopened') && await flag('flag.prologue.report_full'), 'M0-17 蒲嬤的坦白、兩個抉擇');
  await act(ST, 21, 3, 'left', { choices: ['聊聊'] });
  check(await S("Object.keys(s.folios).length") === 6, '6 張葉帖都已繪製');
  const sides = await S("['quest.side.p0_tide_marks','quest.side.p0_filter_spots','quest.side.p0_shrine_slot','quest.side.p0_soft_ground','quest.side.p0_barter_gloves'].filter(function(k){return s.quests[k]&&s.quests[k].status==='done';}).length");
  check(sides >= 2, '完成支線 ' + sides + ' 條（≥2）');
  await tele(ST, 19, 2, 'up'); await walk('ArrowUp', 2);
  const end = await drive({ choices: [0], ms: 120000 });
  check(end === 'ending', 'M0-18 出發 → 章末畫面');
  check(await flag('flag.prologue.completed') && (await stage()) === 'done', '主線任務完成（flag.prologue.completed）');
  await sleep(800); await shot('ending');

  const pageErr = await q(() => window.__vellora.errors);
  if (pageErr.length) errors.push.apply(errors, pageErr);
  if (!CKPT) await mobile(browser);
  await browser.close();
}

async function mobile(browser) {
  console.log('手機 390×844');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  page = await m.newPage();
  page.on('console', (x) => { if (x.type() === 'error') errors.push('[mobile console] ' + x.text()); });
  page.on('pageerror', (e) => errors.push('[mobile pageerror] ' + e.message));
  await page.goto(URL_BASE);
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await sleep(400); await shot('mobile-title');
  await page.click('.title-menu [data-id="new"]');
  await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '手機新遊戲');
  await drive();
  await shot('mobile-field');
  await tele(ST, 24, 11, 'up'); await q(() => window.__vellora.face('up'));
  await key('KeyZ'); await sleep(700);
  await shot('mobile-dialogue');
  await drive();
  check(true, '手機：開場對話與地圖');
}

main().then(() => {
  if (errors.length) { console.log('console 錯誤：\n' + errors.join('\n')); process.exit(1); }
  console.log('結果：通關測試全部通過（截圖於 tests/out/pt-*.png）');
}).catch(async (e) => {
  console.error('失敗：' + e.message);
  try { await shot('FAIL'); } catch (x) { /* 忽略 */ }
  if (errors.length) console.log('console 錯誤：\n' + errors.join('\n'));
  process.exit(1);
});
