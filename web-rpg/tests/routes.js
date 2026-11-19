#!/usr/bin/env node
/*
 * 序章〈味變〉分歧路線測試：node tests/routes.js [--only=名稱,名稱] [--fresh]
 * 需要主線節點的存檔快照（tests/out/ckpt/*.json）；沒有或加 --fresh 時先跑
 * `VELLORA_CKPT=tests/out/ckpt node tests/playthrough.js` 產生（約 4 分鐘）。
 * 每條路線從快照讀檔（偵錯 API loadSnapshot）後，用真實按鍵＋偵錯 API 推進：
 *   iso      死潮與首領都選隔離：空管斜坡 → F-007 B 版 → 蒲嬤／居民的隔離版對白 → 章末統計
 *   fail     死潮、慢拱的失穩／力竭／撤離都不卡關、不弄丟進度；一般遭遇力竭撤回種源龕
 *   side     S0-2 修復與割除兩種、S0-5 全流程、P3 後支線標「沒來得及」、繪圖桌開葉帖
 *   endings  章末兩個抉擇的 9 種組合都到章末，統計文字對應
 *   save     三個階段存檔 → 重新載入 → 讀檔，狀態一致
 *   nols     localStorage 不可用時可開始、遊玩、存檔介面有提示
 * 失敗時回傳非零。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

// VELLORA_3D=1：改測 3D 版（web-rpg-3d/），同一套流程；走路改成按住直到走進下一格（3D 版是連續移動）
const IS3D = process.env.VELLORA_3D === '1';
const ROOT = IS3D ? path.resolve(__dirname, '..', '..', 'web-rpg-3d') : path.resolve(__dirname, '..');
const OUT = IS3D ? path.join(ROOT, 'tests', 'out') : path.join(__dirname, 'out');
const CK = path.join(OUT, 'ckpt');
fs.mkdirSync(OUT, { recursive: true });
const URL_BASE = 'file://' + path.join(ROOT, 'index.html') + '?debug=1&speed=4' + (IS3D ? '&quality=' + (process.env.VELLORA_QUALITY || 'low') : '');
const ST = 'map.miststep.station', SH = 'map.miststep.sheds', TE = 'map.miststep.terrace',
  UP = 'map.miststep.conduit_upper', LO = 'map.miststep.conduit_lower';
const Q = 'quest.main.p0_taste_shift';
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page, browser, shotNo = 0, fails = 0;

function log(m) { console.log('  ' + m); }
function check(c, msg) { if (!c) throw new Error('檢查失敗：' + msg); log('✓ ' + msg); }
async function shot(name) { shotNo++; await page.screenshot({ path: path.join(OUT, 'rt-' + String(shotNo).padStart(2, '0') + '-' + name + '.png') }); }
function q(fn, arg) { return page.evaluate(fn, arg); }
async function info() { return q(() => { const a = window.__vellora; return { ui: a.ui(), busy: a.busy(), scene: a.scene(), p: a.player() }; }); }
async function waitFor(fn, arg, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) { if (await q(fn, arg)) return; await sleep(60); }
  throw new Error('等待逾時：' + (what || fn.toString()));
}
async function key(k) { await page.keyboard.press(k); await sleep(60); }
// 3D：按住方向鍵直到走進下一格並接近格心（真實鍵盤輸入）；進入傳送點或觸發劇情就停
async function walk3d(k, n) {
  await q(() => window.__vellora.speed(1));
  for (let i = 0; i < n; i++) {
    const a = await q(() => window.__vellora.player());
    await page.keyboard.down(k);
    const t0 = Date.now();
    while (Date.now() - t0 < 5000) {
      await sleep(25);
      const b = await q(() => { const p = window.__vellora.player(), c = window.__vellora.p3 ? window.__vellora.p3() : null; return { p: p, c: c, busy: window.__vellora.busy() }; });
      if (!b.p || b.p.map !== a.map) break;
      if (b.p.x !== a.x || b.p.y !== a.y) {
        if (b.busy) break;
        if (!b.c || (Math.abs(b.c.fx - (b.p.x + 0.5)) < 0.18 && Math.abs(b.c.fy - (b.p.y + 0.5)) < 0.18)) break;
      }
    }
    await page.keyboard.up(k); await sleep(120); await waitIdleMove();
  }
  await q(() => window.__vellora.speed(4));
}
async function waitIdleMove() { for (let i = 0; i < 40; i++) { const p = await q(() => window.__vellora.player()); if (p && !p.moving) return; await sleep(40); } }
async function walk(k, n) {
  if (IS3D) return walk3d(k, n);
  await q(() => window.__vellora.speed(1));
  for (let i = 0; i < n; i++) { await page.keyboard.down(k); await sleep(60); await page.keyboard.up(k); await sleep(120); await waitIdleMove(); }
  await q(() => window.__vellora.speed(4));
}
async function S(expr) { return q(new Function('return (function(s){ return ' + expr + '; })(window.__vellora.state());')); }
const flag = (n) => S("s.flags['" + n + "']");
const qst = (id) => S("s.quests['" + id + "']?s.quests['" + id + "'].status:'none'");
const stage = () => S("(function(){var x=s.quests['" + Q + "'];var d=window.__vellora.V.data.quests['" + Q + "'];return x?(x.status==='done'?'done':d.stages[x.stage].id):'none';})()");
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
// 對白紀錄：包住 V.dialogue.say，記下實際播放的每一行（已套用〔若〕條件）
async function hookSaid() {
  await q(() => {
    const V = window.__vellora.V; window.__said = [];
    if (V.dialogue.__hooked) return; V.dialogue.__hooked = true;
    const o = V.dialogue.say; V.dialogue.say = function (line) { window.__said.push(typeof line === 'string' ? line : JSON.stringify(line)); return o.apply(this, arguments); };
  });
}
const said = () => q(() => (window.__said || []).join('\n'));
const clearSaid = () => q(() => { window.__said = []; });

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
      if (opts.noAutoWin) return 'battle';
      await q(() => window.__vellora.winEncounter()); continue;
    }
    if (top === 'folio') {
      if (opts.onFolio) { const f = opts.onFolio; opts.onFolio = null; await f(); }
      await sleep(400); await key('KeyZ'); continue;
    }
    if (top === 'menu') { if (opts.onMenu) { const f = opts.onMenu; opts.onMenu = null; await f(); } await key('KeyX'); continue; }
    if (top === 'dialogue') {
      if (await choicesVisible()) { const w = queue.length ? queue.shift() : 0; if (!(await pick(w))) throw new Error('找不到選項：' + w); await sleep(150); }
      else await key('KeyZ');
      continue;
    }
    if (top === 'choose') { const w = queue.length ? queue.shift() : 'go'; if (!(await pick(w))) { if (!(await pick(0))) throw new Error('choose 找不到：' + w); } await sleep(200); continue; }
    if (top === 'craft') { await key('KeyX'); await sleep(150); continue; }
    if (top) { await key('KeyZ'); continue; }
    if (!s.busy) { if (++idle > 3) return 'idle'; } else idle = 0;
    await sleep(90);
  }
  throw new Error('drive 逾時：' + JSON.stringify(await info()));
}
async function untilAwaiting() {
  for (let i = 0; i < 300; i++) {
    const b = await q(() => window.__vellora.battle()); const ui = await q(() => window.__vellora.ui());
    if (b && b.awaiting && ui[ui.length - 1] === 'battle') return;
    if (!b || b.result) return;
    const top = ui[ui.length - 1];
    if (top === 'pages' || top === 'dialogue' || top === 'wait' || top === 'result') await key('KeyZ'); else await sleep(80);
  }
  throw new Error('等不到遭遇指令');
}
async function tele(map, x, y, dir) { await q((a) => { window.__vellora.teleport(a[0], a[1], a[2], a[3]); }, [map, x, y, dir]); await sleep(450); await drive(); }
async function act(map, x, y, dir, opts) {
  const p = await q(() => window.__vellora.player());
  if (!p || p.map !== map || p.x !== x || p.y !== y) await tele(map, x, y, dir);
  await q((d) => window.__vellora.face(d), dir);
  await sleep(80); await key('KeyZ'); await sleep(200);
  return drive(opts);
}
// 遭遇中：把遭遇推到指定結局（collapsed／evacuated／retreated），不經自動完成
async function forceEnd(kind) {
  await untilAwaiting();
  if (kind === 'retreated') { await q(() => window.__vellora.battleExec({ cmd: 'retreat' })); }
  else {
    await q((k) => {
      const V = window.__vellora.V;
      if (k === 'collapsed') V.battle.st.imbalance = 100; else V.game.s.stamina = 0;
      window.__vellora.battleExec({ cmd: 'guard' });
    }, kind);
  }
  await sleep(300);
}
// 隔離：架夾 → 再送一次收口
async function isolateNow() {
  await untilAwaiting();
  await q(() => window.__vellora.battleExec({ cmd: 'isolate' }));
  for (let i = 0; i < 3; i++) {
    await untilAwaiting();
    const b = await q(() => window.__vellora.battle());
    if (!b || b.result) return;
    await q(() => { const st = window.__vellora.V.battle.st; window.__vellora.state().stamina = 30; window.__vellora.battleExec({ cmd: 'isolate' }); });
    await sleep(300);
  }
}

async function newPage(opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  if (opts.init) await ctx.addInitScript(opts.init);
  page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto(URL_BASE);
  await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
  await hookSaid();
  return ctx;
}
async function fromCkpt(name) {
  const snap = JSON.parse(fs.readFileSync(path.join(CK, name + '.json'), 'utf8'));
  await q((o) => window.__vellora.loadSnapshot(o), snap);
  await waitFor(() => window.__vellora.scene() === 'field' && window.__vellora.ui().length === 0, null, 8000, '讀快照');
  await sleep(300);
  await drive();
}
async function endingText() { return q(() => { const e = document.querySelector('.ending .end-box'); return e ? e.innerText : ''; }); }
async function pageErrors() { const pe = await q(() => window.__vellora.errors); if (pe.length) errors.push.apply(errors, pe); }

// ============================ 路線 ============================
const R = {};

// (a) 死潮與慢拱都選隔離
R.iso = async function () {
  await newPage(); await fromCkpt('pre_tide');
  await act(UP, 17, 11, 'down', { onBattle: isolateNow });
  check(await flag('flag.prologue.embolus_isolated') && !(await flag('flag.prologue.embolus_cleared')), '死潮：隔離（embolus_isolated）');
  await act(UP, 16, 14, 'down');
  check(!(await flag('flag.prologue.valve_upper_open')), '上層活瓣按不動（栓塞被夾，水不走這裡）');
  await act(UP, 29, 10, 'up');
  check(await flag('flag.prologue.k_cut'), '東支空管：割開痂膜');
  await tele(UP, 29, 24, 'down'); await walk('ArrowDown', 1); await drive();
  const p = await q(() => window.__vellora.player());
  check(p.map === LO && p.x === 2 && p.y === 2, '空管斜坡下到下層（' + p.x + ',' + p.y + '）');
  await shot('iso-slope');
  await act(LO, 3, 2, 'up');
  check(await flag('flag.prologue.valve_jia_open'), '活瓣甲');
  await tele(LO, 4, 4, 'right');
  for (let i = 0; i < 9; i++) await walk('ArrowRight', 1);
  await act(LO, 14, 5, 'up');
  await act(LO, 18, 3, 'up', { choices: ['leave', 0] });
  await act(LO, 17, 6, 'down');
  check(await flag('flag.prologue.valve_yi_open'), '活瓣乙');
  await tele(LO, 21, 4, 'right');
  for (let i = 0; i < 8; i++) await walk('ArrowRight', 1);
  await drive();
  await act(LO, 30, 4, 'right');
  await walk('ArrowRight', 3); await drive();
  check(await flag('flag.prologue.slowarch_recognized'), '認出慢拱');
  await walk('ArrowRight', 1);
  let folioText = '';
  for (let i = 0; i < 8; i++) await walk('ArrowDown', 1);
  await drive({ onBattle: isolateNow, onFolio: async () => { await sleep(2700); folioText = await q(() => document.querySelector('.folio-view').innerText); await shot('iso-folio'); } });
  check(await flag('flag.prologue.slowarch_isolated') && await S("s.items['item.key.backgarden_remnant']===1"), '慢拱：隔離、取得背園殘葉');
  check(await S("!!s.folios['F-007']"), 'F-007 繪製');
  check(folioText.indexOf('慢拱的背園·夾下來的一半') >= 0, 'F-007 顯示 B 版名稱');
  check(folioText.indexOf('中縫是下夾的位置') >= 0 && folioText.indexOf('仍然下了夾') >= 0, 'F-007 B 版筆記');
  await tele(LO, 10, 16, 'left'); await walk('ArrowLeft', 1); await drive();
  for (let i = 0; i < 6; i++) await walk('ArrowLeft', 1);
  await drive({ ms: 120000 });
  check(await flag('flag.prologue.got_auri_leaf') && (await stage()) === 's7', 'M0-16 殘葉、階段 s7');
  await clearSaid();
  await walk('ArrowUp', 1); await drive(); await walk('ArrowUp', 1);
  await drive({ choices: [0, 0], ms: 120000 });
  const conf = await said();
  check(await flag('flag.prologue.puma_confessed'), 'M0-17 坦白');
  check(conf.indexOf('我把牠病掉的那半背園夾掉了') >= 0 && conf.indexOf('已夾閉') >= 0, '蒲嬤坦白中的隔離版台詞（慢拱、中支管）');
  // 居民 p3b
  await clearSaid();
  await act(SH, 23, 8, 'up');
  check((await said()).indexOf('慢慢喜歡甜的') >= 0, '芽芽的隔離版對白（p3b）');
  await clearSaid();
  await tele(ST, 16, 9, 'left');
  const ll = (await q(() => window.__vellora.entities())).find((e) => /ling/.test(e.id) && e.visible);
  check(!!ll, 'P3 找到老聆（' + (ll && ll.id) + '）');
  await act(ST, ll.x, ll.y + 1, 'up');
  check((await said()).indexOf('那條管沒水可以吹了') >= 0, '老聆的隔離版對白（p3b）');
  await tele(ST, 19, 2, 'up'); await walk('ArrowUp', 2);
  const end = await drive({ choices: [0], ms: 120000 });
  check(end === 'ending', '到章末畫面');
  await sleep(800); await shot('iso-ending');
  const t = await endingText();
  check(t.indexOf('慢拱：隔離。會喝糖液。還在頂牆。') >= 0 && t.indexOf('橋腹中支管：夾閉') >= 0, '章末：隔離版統計文字');
  check(t.indexOf('慢拱：安靜') < 0 && t.indexOf('橋腹中支管：通了') < 0, '章末：沒有穩定版文字');
  check(/隔離\s*\d+\s*次/.test(t) && !/隔離\s*0\s*次/.test(t), '章末：隔離次數 > 0');
  await pageErrors();
};

// (b) 失敗與重來
R.fail = async function () {
  // 一般遭遇力竭 → 撤回種源龕
  await newPage(); await fromCkpt('p1');
  const resp = await S('JSON.stringify(s.respawn)');
  const stBefore = await stage();
  await tele(TE, 19, 23, 'up');
  await act(TE, 19, 23, 'up', { onBattle: () => forceEnd('evacuated') });
  const pe = await q(() => window.__vellora.player());
  const rp = JSON.parse(resp);
  check(pe.map === rp.map && Math.abs(pe.x - rp.x) + Math.abs(pe.y - rp.y) <= 1, '一般遭遇體力歸零 → 撤回種源龕（' + pe.map + ' ' + pe.x + ',' + pe.y + '）');
  check((await stage()) === stBefore && (await S('s.stamina')) > 0, '撤離後主線階段不變、體力回復');
  check(await S("window.__vellora.state().encDone['" + TE + "/seep']") !== 'stabilized', '滲口仍在原處，可以再來');
  await act(TE, 19, 23, 'up');
  check(await S("window.__vellora.state().encDone['" + TE + "/seep']==='stabilized'"), '重來後穩定滲口');
  await page.context().close();

  // 死潮：失穩、撤離、力竭
  await newPage(); await fromCkpt('pre_tide');
  for (const k of ['collapsed', 'retreated']) {
    await act(UP, 17, 11, 'down', { onBattle: () => forceEnd(k) });
    const e = (await q(() => window.__vellora.entities())).find((x) => x.id === 'dead_tide');
    check(e && e.visible && !(await flag('flag.prologue.embolus_cleared')) && (await stage()) === 's6', '死潮 ' + k + '：對象還在、階段 s6 不變');
  }
  check(await S("s.encImb && s.encImb['enc.p0.mid_dead_tide']") === 45, '死潮失穩後下次失衡 45');
  await act(UP, 17, 11, 'down', { onBattle: () => forceEnd('evacuated') });
  const pv = await q(() => window.__vellora.player());
  check((await stage()) === 's6' && await flag('flag.prologue.entered_conduit'), '死潮力竭撤離後主線進度保留（撤到 ' + pv.map + '）');
  await act(UP, 17, 11, 'down');
  check(await flag('flag.prologue.embolus_cleared'), '回來重打死潮：穩定');
  await page.context().close();

  // 首領：失穩、力竭、撤離
  await newPage(); await fromCkpt('pre_boss');
  await walk('ArrowRight', 1);
  for (let i = 0; i < 8; i++) await walk('ArrowDown', 1);
  await drive({ onBattle: () => forceEnd('collapsed') });
  let p = await q(() => window.__vellora.player());
  check(p.map === LO && p.x === 18 && p.y === 3 && !(await flag('flag.prologue.boss_done')), '慢拱失穩 → 回中島舊龕、首領未結束');
  check(await S("s.encImb['enc.p0.boss_slowarch']") === 40 && (await S('s.stamina')) === (await S('window.__vellora.V.game.maxStamina()')), '下次失衡 40、體力全滿');
  async function engageBoss(opts) {
    const b = (await q(() => window.__vellora.entities())).find((e) => e.id === 'boss');
    return act(LO, b.x + 1, b.y, 'left', opts);
  }
  await engageBoss({ onBattle: () => forceEnd('evacuated') });
  p = await q(() => window.__vellora.player());
  check(p.map === LO && p.x === 18 && p.y === 3, '慢拱力竭 → 回中島舊龕（不是種源龕）');
  await engageBoss({ onBattle: () => forceEnd('retreated') });
  p = await q(() => window.__vellora.player());
  check(p.map === LO && p.x === 18 && p.y === 3 && (await stage()) === 's6', '慢拱撤離 → 中島舊龕、階段不變');
  await engageBoss();
  check(await flag('flag.prologue.slowarch_stabilized') && await flag('flag.prologue.boss_done'), '重來後慢拱穩定');
  await pageErrors();
};

// (c) 支線 S0-2（兩種）、S0-5；P3 後「沒來得及」；繪圖桌
R.side = async function () {
  await newPage(); await fromCkpt('p1');
  check(await qst('quest.side.p0_filter_spots') === 'active', 'S0-2 已接（快照 p1）');
  const base = await q(() => window.__vellora.snapshot());
  await tele(ST, 30, 4, 'up');
  const sp = (await q(() => window.__vellora.entities())).find((e) => e.id === 'spore');
  await act(ST, sp.x, sp.y + 1, 'up', { choices: ['治它'] });
  check(await flag('flag.prologue.filter_repaired') && await qst('quest.side.p0_filter_spots') === 'done', 'S0-2 修復：完成');
  check(await S("s.items['item.use.mist_veil']>=1"), 'S0-2 修復：取得面巾');
  await q((o) => window.__vellora.loadSnapshot(o), base); await sleep(600); await drive();
  await tele(ST, 30, 4, 'up');
  const sp2 = (await q(() => window.__vellora.entities())).find((e) => e.id === 'spore');
  await clearSaid();
  await act(ST, sp2.x, sp2.y + 1, 'up', { choices: ['割掉'] });
  check(await flag('flag.prologue.filter_cut') && await qst('quest.side.p0_filter_spots') === 'done' && !(await flag('flag.prologue.filter_repaired')), 'S0-2 割除：完成');
  check((await said()).indexOf('在鼻子上開洞') >= 0, 'S0-2 割除：湯棚進霧的台詞');
  await shot('side-filter-cut');

  // S0-5
  const ents = await q(() => window.__vellora.entities());
  const luo = ents.find((e) => e.id === 'luo' && e.visible);
  check(!!luo, '找到絡');
  await act(ST, luo.x, luo.y + 1, 'up', { choices: ['能補嗎'] });
  check(await S("s.quests['quest.side.p0_barter_gloves']&&s.quests['quest.side.p0_barter_gloves'].stage===0"), 'S0-5 接取（s1）');
  const suo = (await q(() => window.__vellora.entities())).find((e) => e.id === 'suo' && e.visible);
  await act(ST, suo.x, suo.y + 1, 'up', { choices: ['半透膜片'] });
  check(await S("s.quests['quest.side.p0_barter_gloves'].stage===1") && await flag('flag.prologue.heard_burner_rumor'), 'S0-5 梭要湯（s2）');
  // 沒有池糖囊時蓴嬸要求一顆
  await q(() => { const s = window.__vellora.state(); delete s.items['item.sample.sugar_sac']; });
  await act(SH, 27, 3, 'up', { choices: ['封一罐湯'] });
  check(await S("s.quests['quest.side.p0_barter_gloves'].stage===1"), 'S0-5 沒有池糖囊：蓴嬸請妳去採，階段不變');
  await q(() => window.__vellora.give('item.sample.sugar_sac', 1));
  await act(SH, 27, 3, 'up', { choices: ['封一罐湯'] });
  check(await S("s.quests['quest.side.p0_barter_gloves'].stage===2 && s.items['item.quest.sealed_soup']===1"), 'S0-5 蓴嬸封湯（s3）');
  await act(ST, suo.x, suo.y + 1, 'up', { choices: ['封罐的池況湯'] });
  check(await S("s.quests['quest.side.p0_barter_gloves'].stage===3 && s.items['item.quest.membrane_patch']===1"), 'S0-5 湯換膜片（s4）');
  await act(ST, luo.x, luo.y + 1, 'up');
  check(await qst('quest.side.p0_barter_gloves') === 'done' && await S("s.items['item.key.sealed_gloves']===1"), 'S0-5 完成：無孔掌套');

  // 繪圖桌
  let tabOk = false;
  await act(SH, 3, 3, 'up', { onMenu: async () => { tabOk = await q(() => !!document.querySelector('.menu .tab.on[data-tab="folios"]')); await shot('draw-table'); } });
  check(tabOk, '記脈棚繪圖桌：開啟葉帖分頁');

  // P3：未完成的支線標「沒來得及」
  await newPage(); await fromCkpt('pre_confess');
  const before = await S("JSON.stringify(Object.keys(s.quests).map(function(k){return k+':'+s.quests[k].status;}))");
  await walk('ArrowUp', 1); await drive(); await walk('ArrowUp', 1);
  await drive({ choices: [0, 0], ms: 120000 });
  check(await flag('flag.prologue.puma_confessed'), '進入 P3');
  const sides = await S("['quest.side.p0_tide_marks','quest.side.p0_filter_spots','quest.side.p0_shrine_slot','quest.side.p0_soft_ground','quest.side.p0_barter_gloves'].map(function(k){return s.quests[k]?s.quests[k].status:'none';}).join(',')");
  check(sides.indexOf('active') < 0 && sides.indexOf('none') < 0 && sides.indexOf('missed') >= 0, 'P3 後未完成支線改為 missed（' + sides + '；之前 ' + before + '）');
  await key('Escape'); await sleep(300);
  await q(() => document.querySelector('.menu .tab[data-tab="quests"]').click()); await sleep(300);
  const qtext = await q(() => document.querySelector('.menu').innerText);
  check(qtext.indexOf('沒來得及') >= 0 && qtext.indexOf('三支籤換不到的東西') >= 0, '任務日誌顯示「沒來得及」與未接的支線');
  await shot('quests-missed');
  await key('KeyX'); await sleep(200);
  await pageErrors();
};

// (d) 章末兩個抉擇的 9 種組合
const SEAL = [['flag.prologue.seal_reopened', '舊接口：留了一條細流'], ['flag.prologue.seal_reinforced', '舊接口：補牢'], ['flag.prologue.seal_kept', '舊接口：原樣']];
const REP = [['flag.prologue.report_full', '寫了全部。第一個名字是蒲'], ['flag.prologue.report_partial', '沒有寫手'], ['flag.prologue.report_shared', '一人一口']];
R.endings = async function () {
  await newPage();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    await fromCkpt('pre_confess');
    await walk('ArrowUp', 1); await drive(); await walk('ArrowUp', 1);
    await drive({ choices: [i, j], ms: 120000 });
    check(await flag(SEAL[i][0]) && await flag(REP[j][0]), '組合 ' + (i + 1) + '-' + (j + 1) + '：旗標 ' + SEAL[i][0].split('.').pop() + '／' + REP[j][0].split('.').pop());
    await tele(ST, 19, 2, 'up'); await walk('ArrowUp', 2);
    const end = await drive({ choices: [0], ms: 120000 });
    if (end !== 'ending') throw new Error('組合 ' + (i + 1) + '-' + (j + 1) + ' 沒到章末');
    await sleep(500);
    const t = await endingText();
    const okSeal = SEAL.every((x, k) => (t.indexOf(x[1]) >= 0) === (k === i));
    const okRep = REP.every((x, k) => (t.indexOf(x[1]) >= 0) === (k === j));
    check(okSeal && okRep, '組合 ' + (i + 1) + '-' + (j + 1) + '：章末統計文字對應');
    if (i === 2 && j === 2) await shot('ending-3-3');
    // 回到可操作狀態：「繼續探索」
    await q(() => { const b = document.querySelector('.ending [data-a="stay"]'); if (b) b.click(); });
    await sleep(300); await drive();
  }
  await pageErrors();
};

// (e) 三個階段存檔 → 重新載入 → 讀檔
R.save = async function () {
  await newPage();
  const keyState = () => q(() => { const s = JSON.parse(JSON.stringify(window.__vellora.state())); delete s.playtime; return JSON.stringify(s); });
  for (const [ck, slot] of [['p1', 'slot1'], ['pre_tide', 'slot2'], ['pre_confess', 'slot3']]) {
    await fromCkpt(ck);
    // 用選單存檔（真實按鍵＋點選）
    await key('Escape'); await sleep(300);
    await q(() => document.querySelector('.menu .tab[data-tab="save"]').click()); await sleep(200);
    await pick(slot); await sleep(250);
    await pick('save'); await sleep(250);
    if ((await q(() => window.__vellora.ui())).indexOf('choose') >= 0) { await pick(0); await sleep(250); }
    await key('KeyX'); await sleep(200); await drive();
    const before = await keyState();
    await page.reload();
    await waitFor(() => window.__vellora && window.__vellora.scene() === 'title', null, 10000, '標題畫面');
    await sleep(300);
    await page.click('.title-menu [data-id="load"]'); await sleep(300);
    await page.click('[data-id="' + slot + '"]'); await sleep(200);
    await page.click('[data-id="load"]').catch(() => {});
    await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '讀檔進入地圖');
    await drive();
    const after = await keyState();
    check(before === after, '階段 ' + ck + '：' + slot + ' 存檔 → 重新載入 → 讀檔，狀態一致');
    await hookSaid();
  }
  await pageErrors();
};

// (f) localStorage 不可用
R.nols = async function () {
  await newPage({ init: () => { Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { throw new Error('SecurityError: localStorage blocked'); } }); } });
  check(await q(() => window.__vellora.V.save.persistent === false), '偵測到無法寫入本機儲存');
  const titleText = await q(() => document.querySelector('.title').innerText);
  check(titleText.indexOf('存檔只會保留到關閉頁面為止') >= 0, '標題畫面提示存檔不會保留');
  await page.click('.title-menu [data-id="new"]');
  await waitFor(() => window.__vellora.scene() === 'field', null, 8000, '進入地圖');
  await drive();
  await walk('ArrowLeft', 3);
  check((await q(() => window.__vellora.player())).x === 21, '可以移動');
  await key('Escape'); await sleep(300);
  await q(() => document.querySelector('.menu .tab[data-tab="save"]').click()); await sleep(200);
  const mt = await q(() => document.querySelector('.menu').innerText);
  check(mt.indexOf('不允許寫入本機儲存') >= 0, '存檔分頁顯示提示');
  await pick('slot1'); await sleep(250); await pick('save'); await sleep(400);
  const toast = await q(() => Array.from(document.querySelectorAll('.toast')).map((e) => e.innerText).join('|'));
  check(toast.indexOf('存入') >= 0 || toast.indexOf('暫存') >= 0, '存檔給出回饋（' + toast + '）');
  await shot('nols-save');
  for (let i = 0; i < 4 && (await q(() => window.__vellora.ui().length)); i++) { await key('KeyX'); await sleep(250); }
  await drive();
  await q(() => window.__vellora.face('left')); await sleep(100);
  await key('KeyZ'); await sleep(300); await drive();
  check(await flag('flag.prologue.tasted_first_pool'), '無本機儲存仍可進行第一場遭遇');
  await pageErrors();
};

async function main() {
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
  const need = ['p1', 'pre_tide', 'pre_boss', 'pre_confess'];
  if (process.argv.includes('--fresh') || need.some((n) => !fs.existsSync(path.join(CK, n + '.json')))) {
    console.log('產生主線快照（tests/playthrough.js）…');
    execFileSync(process.execPath, [path.join(__dirname, 'playthrough.js')], { env: Object.assign({}, process.env, { VELLORA_CKPT: CK }), stdio: 'ignore' });
  }
  browser = await chromium.launch();
  for (const name of Object.keys(R)) {
    if (only.length && only.indexOf(name) < 0) continue;
    console.log('路線 ' + name);
    try { await R[name](); }
    catch (e) { fails++; console.error('  ✗ ' + e.message); try { await shot('FAIL-' + name); } catch (x) { /* 忽略 */ } }
    for (const c of browser.contexts()) await c.close();
  }
  await browser.close();
}
main().then(() => {
  if (errors.length) { console.log('console 錯誤：\n' + errors.join('\n')); fails++; }
  if (fails) { console.log('結果：' + fails + ' 項失敗'); process.exit(1); }
  console.log('結果：分歧路線測試全部通過（截圖於 tests/out/rt-*.png）');
}).catch((e) => { console.error('失敗：' + e.stack); process.exit(1); });
