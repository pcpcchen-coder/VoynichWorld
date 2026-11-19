#!/usr/bin/env node
/*
 * 遊玩時間估算（不是實測）：node tools/estimate-playtime.js
 * 1. 對白：依資料檔分組統計台詞行數與字數（主線＝story-main-*.js 與遭遇／教學／葉帖台詞；支線＝story-side.js；
 *    居民閒聊＝story-residents.js）。對話樹遇到選項時，只算「各選項平均」那一份，條件分支取第一條。
 * 2. 步行：在地形上做 BFS（只看圖塊可否行走，不看實體與水位 patches），依主線必經的地點順序累加格數。
 * 3. 遭遇：主線必經遭遇的味符數 → 估計回合數（嚐味約 0.75 回合／符＋處置 1 回合／符＋1）。
 * 假設見檔尾 ASSUME，可直接改數字重算。
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const sb = { console }; sb.window = sb; vm.createContext(sb);
const run = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
['js/engine/core.js', 'js/engine/rules.js', 'js/engine/tiledefs.js', 'js/engine/mapparse.js', 'js/data/manifest.js'].forEach(run);
const V = sb.VELLORA; V.resetData();
const owner = {};   // 對話／過場 id → 資料檔
V.dataManifest.official.forEach((rel) => {
  const D = V.data, before = new Set(Object.keys(D.dialogues || {}).concat(Object.keys(D.cutscenes || {}).map((k) => 'cs:' + k)));
  run(rel);
  Object.keys(D.dialogues || {}).forEach((k) => { if (!before.has(k)) owner[k] = rel; });
  Object.keys(D.cutscenes || {}).forEach((k) => { if (!before.has('cs:' + k)) owner['cs:' + k] = rel; });
});
const D = V.data;

const ASSUME = {
  charsPerSec: 6,        // 一般玩家讀繁中對白約每秒 6 字（360 字／分；默讀約 400～500 字／分，打折算進看演出）
  secPerLine: 0.8,       // 每行額外的翻頁、等字跑完
  tilesPerSec: 5.6 * 0.6, // 角色每秒 5.6 格；玩家會停頓、轉向、找路，打六折
  secPerRound: 12,       // 遭遇每回合：讀徵兆、選指令、看結果
  secPerEncounter: 25,   // 遭遇開場、結果畫面、轉場
  explore: 1.35          // 走錯路、看地圖、開選單、採集等額外步行與操作的倍率
};

// ---- 對白 ----
function textOf(l) { if (typeof l === 'string') return l.replace(/^〔若[^〕]*〕/, '').replace(/^〔[^〕]*〕/, ''); return ''; }
function linesStat(arr) { let n = 0, c = 0; (arr || []).forEach((l) => { const t = textOf(l); if (t) { n++; c += t.length; } }); return { n, c }; }
function add(a, b, k) { a.n += b.n * (k || 1); a.c += b.c * (k || 1); return a; }
function dlgStat(d) {
  const out = { n: 0, c: 0 };
  if (!d) return out;
  if (Array.isArray(d)) return linesStat(d);
  if (d.lines) add(out, linesStat(d.lines));
  if (d.nodes) {
    let id = d.start, guard = 0; const seen = {};
    while (id && d.nodes[id] && guard++ < 60 && !seen[id]) {
      seen[id] = 1; const nd = d.nodes[id];
      add(out, linesStat(nd.text));
      if (nd.choices && nd.choices.length) {
        const avg = { n: 0, c: 0 }; nd.choices.forEach((ch) => add(avg, linesStat(ch.lines), 1 / nd.choices.length));
        add(out, avg); id = nd.choices[0].next;
      } else if (nd.branch && nd.branch.length) id = nd.branch[0].next;
      else id = nd.next;
    }
  }
  return out;
}
function csStat(cs) { const o = { n: 0, c: 0 }; (cs || []).forEach((c) => { if (Array.isArray(c) && c[0] === 'say') add(o, linesStat([c[1]])); }); return o; }
const groups = {};
Object.keys(owner).forEach((k) => {
  const f = owner[k], g = /story-main/.test(f) ? 'main' : /story-side/.test(f) ? 'side' : /story-residents/.test(f) ? 'residents' : 'other';
  let st = k.startsWith('cs:') ? csStat(D.cutscenes[k.slice(3)]) : dlgStat(D.dialogues[k]);
  // 居民閒聊（npc() 產生的 hub 分支）：把各階段的台詞全部加總，換算時再取一部分
  if (g === 'residents' && !k.startsWith('cs:') && D.dialogues[k].nodes) { st = { n: 0, c: 0 }; Object.values(D.dialogues[k].nodes).forEach((nd) => add(st, linesStat(nd.text))); }
  groups[g] = add(groups[g] || { n: 0, c: 0 }, st);
});
// 居民閒聊：只算每位居民在每個階段聽一輪的 1/3（多數玩家不會每階段都找每個人）
// 遭遇事件台詞、教學頁、葉帖筆記（主線必經）
const encMain = ['enc.p0.tutorial_first_pool', 'enc.p0.spring_source_sample', 'enc.p0.quarrel_sutureleaf', 'enc.p0.salt_crust_seep', 'enc.p0.shrivelled_sugar_sac',
  'enc.p0.drawmite_clot', 'enc.p0.droning_bellpipe', 'enc.p0.collapsed_sponge', 'enc.p0.mid_dead_tide', 'enc.p0.sulfur_scab', 'enc.p0.boss_slowarch'];
const encSide = ['enc.p0.sick_spore_clump'];
const evStat = { n: 0, c: 0 };
encMain.forEach((id) => {
  const e = D.encounters[id]; if (!e) return;
  [e.intro].concat(e.stableText || []).forEach((t) => add(evStat, linesStat([t])));
  Object.values(e.events || {}).forEach((v) => {
    if (Array.isArray(v)) add(evStat, linesStat(v));
    else if (v && typeof v === 'object') Object.values(v).forEach((w) => { if (Array.isArray(w)) add(evStat, linesStat(w)); });
  });
});
const tut = { n: 0, c: 0 };
Object.values(D.tutorials || {}).forEach((t) => (t.pages || []).forEach((p) => add(tut, linesStat([String(p.html || p.text || '').replace(/<[^>]+>/g, '')]))));
const fol = { n: 0, c: 0 };
Object.values(D.folios || {}).forEach((f) => { add(fol, linesStat(f.before || [])); add(fol, linesStat(f.after || [])); add(fol, linesStat(f.note || []), f.nameAlt ? 0.5 : 1); });

// ---- 步行 ----
function pos(map, ref) {
  if (Array.isArray(ref)) return { x: ref[0], y: ref[1] };
  const e = (D.maps[map].entities || []).find((x) => x.id === ref); if (!e) throw new Error(map + ' 沒有 ' + ref);
  return { x: e.x, y: e.y };
}
function bfs(map, a, b) {
  const pm = V.parseMap(map, D.maps[map]);
  const key = (x, y) => y * pm.w + x, dist = new Map([[key(a.x, a.y), 0]]), qu = [[a.x, a.y]];
  while (qu.length) {
    const [x, y] = qu.shift(), d = dist.get(key(x, y));
    if (Math.abs(x - b.x) + Math.abs(y - b.y) <= 1) return d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (dist.has(key(nx, ny)) || !V.tileWalkable(pm, nx, ny)) continue;
      dist.set(key(nx, ny), d + 1); qu.push([nx, ny]);
    }
  }
  return Math.round((Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * 1.3);   // 走不到（水位、擋路物件）：曼哈頓 ×1.3
}
function walk(legs) {
  let t = 0;
  legs.forEach(([m, pts]) => { const map = 'map.miststep.' + m; for (let i = 1; i < pts.length; i++) t += bfs(map, pos(map, pts[i - 1]), pos(map, pts[i])); });
  return t;
}
const MAIN = [
  ['station', [[24, 18], 'pool', 'puma', 'm0_04', 'obs_bellpipe', 'xibo', 'gauge', 'sha', 'filter_c', 'congye', 'shrine', 'xieyi', 'wuzui', 'altar', 'door_pool']],
  ['sheds', [[14, 9], 'puma', 'out_pool']],
  ['station', [[5, 5], 'north']],
  ['terrace', [[19, 30], 'seep', 'sac', 'view', 'source', 'south']],
  ['station', [[19, 1], 'clot', 'east']],
  ['soilflat', [[1, 8], 'bellpipe', 'gao', 'east']],
  ['bridge', [[1, 10], 'center', 'boards', 'hatch']],
  ['conduit_upper', [[2, 2], 'sponge', 'root_a_east', 'root_a_south', 'root_b_west', 'root_b_mid', 'root_b_east', 'dead_tide', 'valve', 'stairs']],
  ['conduit_lower', [[2, 4], 'valve_jia', 'gauge', 'shrine', 'valve_yi', 'pedal', 'scab', 'trim', 'boss_in', 'boss', 'niche']],
  ['sheds', [[14, 9], 'm0_17', 'out_pool']],
  ['station', [[5, 5], 'north']]
];
const SIDE = [
  ['terrace', [[19, 30], 'gauge2', [19, 22]]], ['soilflat', [[1, 8], 'gauge3', 'li', [1, 8]]], ['station', ['xibo', 'yaya', 'congye']],
  ['station', ['sha', 'spore', 'luo', 'suo', 'door_soup']], ['sheds', [[24, 9], 'chun', 'out_soup']], ['station', [[30, 23], 'suo', 'luo']],
  ['terrace', [[19, 30], 'g_sac', [19, 30]]]
];
const tilesMain = walk(MAIN), tilesSide = walk(SIDE);

// ---- 遭遇 ----
function rounds(id) { const e = D.encounters[id]; const g = String(e.sequence || '').length; return e.endOnReveal ? g : Math.round(g * 0.75 + g + 1); }
const roundsMain = encMain.reduce((a, id) => a + rounds(id), 0) + 4;   // 慢拱甩背重讀約 +4
const roundsSide = encSide.reduce((a, id) => a + rounds(id), 0) + rounds('enc.p0.scrambled_lampmoths');

// ---- 換算 ----
const A = ASSUME;
const read = (s) => s.c / A.charsPerSec + s.n * A.secPerLine;
const res = groups.residents || { n: 0, c: 0 };
const mainReadSec = read(groups.main) + read(evStat) + read(tut) + read(fol) + read({ n: res.n * 0.2, c: res.c * 0.2 });
const sideReadSec = read(groups.side) + read({ n: res.n * 0.25, c: res.c * 0.25 });
const mainWalkSec = tilesMain / A.tilesPerSec * A.explore, sideWalkSec = tilesSide / A.tilesPerSec * A.explore;
const mainEncSec = roundsMain * A.secPerRound + encMain.length * A.secPerEncounter;
const sideEncSec = roundsSide * A.secPerRound + 2 * A.secPerEncounter;
const craftSec = 4 * 60;   // 味診台調劑、劑量三選一、葉帖繪製演出、升級畫面等（估）
const m = (s) => (s / 60).toFixed(1);
const r0 = (x) => Math.round(x);
console.log('對白（行／字）：主線 ' + r0(groups.main.n) + '／' + r0(groups.main.c) + '，支線 ' + r0(groups.side.n) + '／' + r0(groups.side.c) + '，居民閒聊 ' + res.n + '／' + res.c + '（全階段合計）');
console.log('遭遇台詞 ' + evStat.n + '／' + evStat.c + '，教學 ' + tut.n + '／' + tut.c + '，葉帖筆記 ' + Math.round(fol.n) + '／' + Math.round(fol.c));
console.log('步行格數：主線 ' + tilesMain + '，支線額外 ' + tilesSide);
console.log('遭遇回合：主線 ' + roundsMain + '（' + encMain.length + ' 場），支線 ' + roundsSide);
console.log('主線：閱讀 ' + m(mainReadSec) + ' 分、步行 ' + m(mainWalkSec) + ' 分、遭遇 ' + m(mainEncSec) + ' 分、調劑等 ' + m(craftSec) + ' 分 → 約 ' + m(mainReadSec + mainWalkSec + mainEncSec + craftSec) + ' 分');
const all = mainReadSec + mainWalkSec + mainEncSec + craftSec + sideReadSec + sideWalkSec + sideEncSec;
console.log('支線：閱讀 ' + m(sideReadSec) + ' 分、步行 ' + m(sideWalkSec) + ' 分、遭遇 ' + m(sideEncSec) + ' 分');
console.log('主線＋全支線：約 ' + m(all) + ' 分');
console.log('假設：' + JSON.stringify(A));
