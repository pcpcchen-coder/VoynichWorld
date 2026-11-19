#!/usr/bin/env node
/*
 * 資料驗證器：node tools/validate-data.js [--demo]
 *   預設驗證正式資料（js/data/manifest.js 的 official 清單）；--demo 驗證測試房。
 * 與遊戲共用 js/engine/core.js、rules.js、tiledefs.js、mapparse.js 的定義（條件／動作語法、圖塊表），
 * 因此文件、驗證器與執行期三者一致。有錯誤時回傳 1。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DEMO = process.argv.includes('--demo');
const errors = [], warns = [];

// ---- 載入引擎的純邏輯部分 ----
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
function run(rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel }); }
['js/engine/core.js', 'js/engine/rules.js', 'js/engine/tiledefs.js', 'js/engine/mapparse.js'].forEach(run);
const V = sandbox.VELLORA, R = V.rules;
// 遭遇行為種類：直接取自 battle.js，避免兩份清單不一致
const battleSrc = fs.readFileSync(path.join(ROOT, 'js/engine/battle.js'), 'utf8');
const BEHAVIOR_TYPES = JSON.parse(/B\.BEHAVIOR_TYPES = (\[[^\]]*\])/.exec(battleSrc)[1].replace(/'/g, '"'));
const RESULTS = JSON.parse(/B\.RESULTS = (\[[^\]]*\])/.exec(battleSrc)[1].replace(/'/g, '"'));
const BG = ['cave', 'pool', 'wild', 'wither'];
const CATS = ['sample', 'medicine', 'consumable', 'key'];
const KINDS = ['altar', 'gauge', 'filter', 'shrine', 'bed', 'gather', 'observe', 'chest', 'sign', 'hidden', 'filterpatch', 'valve', 'membrane', 'hatch'];

run(DEMO ? 'js/data-demo/manifest.js' : 'js/data/manifest.js');
const list = (V.dataManifest || {})[DEMO ? 'demo' : 'official'] || [];
if (!list.length) {
  console.log(DEMO ? '測試房清單為空。' : '正式資料清單（js/data/manifest.js）為空：沒有可驗證的資料。用 --demo 驗證測試房。');
  process.exit(DEMO ? 1 : 0);
}

// ---- 逐檔載入，記錄每個 id 來自哪個檔案 ----
V.resetData();
const origin = {};   // 'maps/demo.village' → 檔名
for (const f of list) {
  const before = {};
  V.COLLECTIONS.forEach((c) => { before[c] = new Set(Object.keys(V.data[c])); });
  try { run(f); } catch (e) { errors.push(f + '：載入失敗 — ' + e.message); continue; }
  V.COLLECTIONS.forEach((c) => Object.keys(V.data[c]).forEach((k) => {
    if (!before[c].has(k)) origin[c + '/' + k] = f;
  }));
  ['meta', 'start', 'levels'].forEach((k) => { if (!origin[k] && V.data[k] && (Array.isArray(V.data[k]) ? V.data[k].length : Object.keys(V.data[k]).length)) origin[k] = f; });
}
const D = V.data;
function where(coll, id) { return (origin[coll + '/' + id] || origin[coll] || '?') + ' ' + coll + '「' + id + '」'; }
function err(loc, msg) { errors.push(loc + '：' + msg); }
function warn(loc, msg) { warns.push(loc + '：' + msg); }

// ---- 參照檢查 ----
const REF = {
  item: (v) => !!D.items[v], quest: (v) => !!D.quests[v], encounter: (v) => !!D.encounters[v], map: (v) => !!D.maps[v],
  cutscene: (v) => !!D.cutscenes[v], dialogue: (v) => !!D.dialogues[v], dim: (v) => R.isDim(v), zone: (v) => !!D.zones[R.zoneKey(v)],
  skill: (v) => !!D.skills[v], shop: (v) => !!D.shops[v], tutorial: (v) => !!D.tutorials[v], glossary: (v) => !!D.glossary[v],
  folio: (v) => !!D.folios[v]
};
const ENUM = { sfx: R.SFX, tone: R.TONES, dir: R.DIRS, vein: R.VEIN_STAGES };

function checkCond(cond, loc) {
  let atoms;
  try { atoms = R.condAtoms(cond); } catch (e) { return err(loc, e.message); }
  atoms.forEach((a) => {
    const def = R.COND_KINDS[a.kind];
    if (def.ref && !REF[def.ref](a.arg)) err(loc, '條件參照不存在的 ' + def.ref + '「' + a.arg + '」');
    if (a.kind === 'quest' && D.quests[a.arg] && (a.op === '@' || /^[<>]/.test(a.op || ''))) {
      if (Gidx(a.arg, a.val) < 0) err(loc, '條件中任務「' + a.arg + '」沒有階段「' + a.val + '」');
    }
    if (a.kind === 'vein' && a.op && R.VEIN_STAGES.indexOf(a.val) < 0) err(loc, '脈況階段「' + a.val + '」不存在（' + R.VEIN_STAGES.join('／') + '）');
    if (a.kind === 'seen' && /^tut:/.test(a.arg) && !D.tutorials[a.arg.slice(4)]) err(loc, '條件參照不存在的教學「' + a.arg.slice(4) + '」');
  });
}
function Gidx(qid, st) { const q = D.quests[qid]; const i = (q.stages || []).findIndex((s) => s.id === st); return i >= 0 ? i : (isNaN(Number(st)) ? -1 : Number(st)); }

function checkLines(lines, loc) {
  V.util.toArray(lines).forEach((ln, i) => {
    const l2 = loc + ' 第' + (i + 1) + '行';
    if (typeof ln === 'string') { const lc = R.lineCond(ln); if (lc) checkCond(lc.cond, l2); return; }
    if (!ln || typeof ln !== 'object') return err(l2, '對白行必須是字串或物件');
    if (ln.cond != null) checkCond(ln.cond, l2);
    if (ln.lines) checkLines(ln.lines, l2);
    if (ln.tutorial && !D.tutorials[ln.tutorial]) err(l2, '教學「' + ln.tutorial + '」不存在');
    if (ln.actions) checkActions(ln.actions, l2);
  });
}

function checkArg(type, v, loc, name) {
  const opt = /\?$/.test(type); type = type.replace(/\?$/, '');
  if (v === undefined || v === null) { if (!opt) err(loc, '動作「' + name + '」缺少參數（' + type + '）'); return; }
  if (type === 'any') return;
  if (type === 'number') { if (typeof v !== 'number') err(loc, '動作「' + name + '」參數應為數字，卻是 ' + JSON.stringify(v)); return; }
  if (type === 'string') { if (typeof v !== 'string') err(loc, '動作「' + name + '」參數應為字串'); return; }
  if (type === 'lines') return checkLines(v, loc);
  if (type === 'cond') return checkCond(v, loc);
  if (type === 'array') { if (!Array.isArray(v)) err(loc, '「' + name + '」參數應為指令陣列'); else checkActions(v, loc, true); return; }
  if (type === 'path') { try { R.parsePath(v); } catch (e) { err(loc, e.message); } return; }
  if (ENUM[type]) { if (ENUM[type].indexOf(v) < 0) err(loc, '「' + name + '」的 ' + type + '「' + v + '」不在清單：' + ENUM[type].join('、')); return; }
  const m = /^ref:(\w+)$/.exec(type);
  if (m && !REF[m[1]](v)) err(loc, '動作「' + name + '」參照不存在的 ' + m[1] + '「' + v + '」');
}
function checkActions(list, loc, inCutscene) {
  if (!Array.isArray(list)) return err(loc, '動作清單必須是陣列');
  if (list.length && !Array.isArray(list[0])) list = [list];
  list.forEach((a, i) => {
    const l2 = loc + ' 動作#' + (i + 1);
    if (!Array.isArray(a) || typeof a[0] !== 'string') return err(l2, '動作必須是 [名稱, 參數…] 陣列');
    const sig = R.ACTIONS[a[0]] || R.CUTSCENE_CMDS[a[0]];
    if (!sig) return err(l2, '未知的動作「' + a[0] + '」');
    if (a.length - 1 > sig.length) err(l2, '動作「' + a[0] + '」參數過多');
    sig.forEach((t, k) => checkArg(t, a[k + 1], l2, a[0]));
    if (a[0] === 'quest' && a[2] && !['start', 'done'].includes(a[2]) && D.quests[a[1]] && Gidx(a[1], a[2]) < 0) err(l2, '任務「' + a[1] + '」沒有階段「' + a[2] + '」');
    if (a[0] === 'ending' && D.meta.endings && !D.meta.endings[a[1] || 'default']) err(l2, 'meta.endings 沒有「' + (a[1] || 'default') + '」');
    if (a[0] === 'warp' && D.maps[a[1]]) walkableAt(a[1], a[2], a[3], l2 + ' 傳送目標');
    if (a[0] === 'actor' && ['show', 'hide'].indexOf(a[2]) < 0) err(l2, 'actor 第二參數只能是 show 或 hide');
  });
}

// ---- 地圖 ----
const parsed = {};
Object.keys(D.maps).forEach((id) => {
  const pm = parsed[id] = V.parseMap(id, D.maps[id]);
  pm.errors.forEach((e) => err(where('maps', id), e));
});
function walkableAt(mapId, x, y, loc) {
  const pm = parsed[mapId]; if (!pm) return false;
  if (!V.tileWalkable(pm, x, y)) { err(loc, '地圖「' + mapId + '」(' + x + ',' + y + ') 不可行走或超出範圍'); return false; }
  return true;
}
function reach(mapId, seeds) {
  const pm = parsed[mapId], seen = new Set(), qq = [];
  seeds.forEach((p) => { if (V.tileWalkable(pm, p.x, p.y)) { seen.add(p.x + ',' + p.y); qq.push(p); } });
  while (qq.length) {
    const p = qq.shift();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const x = p.x + dx, y = p.y + dy, k = x + ',' + y;
      if (!seen.has(k) && V.tileWalkable(pm, x, y)) { seen.add(k); qq.push({ x, y }); }
    });
  }
  return seen;
}
const arrivals = {};   // mapId → [{x,y}]
function addArrival(m, p) { (arrivals[m] = arrivals[m] || []).push(p); }

// 起始點
if (!D.start || !D.start.map) err(origin.start || '?', 'start.map 未設定');
else if (!D.maps[D.start.map]) err(origin.start, 'start.map「' + D.start.map + '」不存在');
else {
  const p = V.resolvePos(parsed[D.start.map], D.start);
  if (!p) err(origin.start, 'start 的座標（x,y 或 at 標記）無效');
  else if (walkableAt(D.start.map, p.x, p.y, origin.start + ' start')) addArrival(D.start.map, p);
  if (D.start.cutscene && !D.cutscenes[D.start.cutscene]) err(origin.start, 'start.cutscene「' + D.start.cutscene + '」不存在');
  Object.keys(D.start.items || {}).forEach((i) => { if (!D.items[i]) err(origin.start, 'start.items 的物品「' + i + '」不存在'); });
  (D.start.skills || []).forEach((i) => { if (!D.skills[i]) err(origin.start, 'start.skills 的手技「' + i + '」不存在'); });
}
if (D.meta.currency && !D.items[D.meta.currency]) err(origin.meta, 'meta.currency「' + D.meta.currency + '」不是物品');

Object.keys(D.maps).forEach((mid) => {
  const def = D.maps[mid], pm = parsed[mid], loc = where('maps', mid);
  if (def.zone && !D.zones[def.zone]) err(loc, 'zone「' + def.zone + '」不存在於 zones');
  if (def.tone && R.TONES.indexOf(def.tone) < 0) err(loc, 'tone「' + def.tone + '」不在清單：' + R.TONES.join('、'));
  V.util.toArray(def.onEnter).forEach((o, i) => {
    if (o.cond != null) checkCond(o.cond, loc + ' onEnter#' + (i + 1));
    if (o.cutscene && !D.cutscenes[o.cutscene]) err(loc, 'onEnter 過場「' + o.cutscene + '」不存在');
    if (o.actions) checkActions(o.actions, loc + ' onEnter#' + (i + 1));
  });
  (def.patches || []).forEach((pt, i) => {   // 擴充：條件地形覆寫
    const pl = loc + ' patches#' + (i + 1);
    if (pt.cond != null) checkCond(pt.cond, pl);
    if (typeof pt.x !== 'number' || typeof pt.y !== 'number') err(pl, '需要數字 x、y');
    (pt.ground || []).forEach((row, dy) => row.split('').forEach((ch, dx) => {
      if (ch === ' ') return;
      const t = V.TILES[ch];
      if (!t || t.layer !== 'ground') err(pl, '(' + (pt.x + dx) + ',' + (pt.y + dy) + ') 字元「' + ch + '」不是地面圖塊');
      if (pt.x + dx >= pm.w || pt.y + dy >= pm.h) err(pl, '超出地圖範圍');
    }));
  });
  const ids = {};
  (def.entities || []).forEach((e, i) => {
    const el = loc + ' 實體 ' + (e.id || '#' + i) + '（' + e.type + '）';
    if (e.id) { if (ids[e.id]) err(el, '實體 id 重複'); ids[e.id] = 1; }
    if (['npc', 'object', 'encounter', 'warp', 'trigger'].indexOf(e.type) < 0) return err(el, 'type 必須是 npc／object／encounter／warp／trigger');
    const p = V.resolvePos(pm, e);
    if (!p) return err(el, '沒有有效座標（x,y 或 at 標記）');
    if (p.x < 0 || p.y < 0 || p.x >= pm.w || p.y >= pm.h) return err(el, '座標超出地圖範圍');
    ['cond', 'mark', 'useCond', 'requires'].forEach((k) => { if (e[k] != null) checkCond(e[k], el + ' ' + k); });
    ['dialogue'].forEach((k) => { if (e[k] && !D.dialogues[e[k]]) err(el, '對話「' + e[k] + '」不存在'); });
    if (e.cutscene && !D.cutscenes[e.cutscene]) err(el, '過場「' + e.cutscene + '」不存在');
    if (e.lines) checkLines(e.lines, el); if (e.text) checkLines(e.text, el); if (e.usedText) checkLines(e.usedText, el); if (e.before) checkLines(e.before, el); if (e.calm) checkLines(e.calm, el);
    if (e.actions) checkActions(e.actions, el);
    if (e.type === 'npc') {
      if (e.actor && !D.actors[e.actor]) err(el, '角色「' + e.actor + '」不存在於 actors');
      (e.talk || []).forEach((t, k) => {
        if (t.cond != null) checkCond(t.cond, el + ' talk#' + (k + 1));
        if (t.dialogue && !D.dialogues[t.dialogue]) err(el, 'talk 對話「' + t.dialogue + '」不存在');
        if (t.lines) checkLines(t.lines, el + ' talk#' + (k + 1));
      });
      if (!e.dialogue && !e.talk && !e.lines) warn(el, 'NPC 沒有任何對話');
    }
    if (e.type === 'object') {
      if (e.kind && KINDS.indexOf(e.kind) < 0) err(el, 'kind「' + e.kind + '」不在清單：' + KINDS.join('、'));
      Object.keys(e.items || {}).forEach((it) => { if (!D.items[it]) err(el, '物品「' + it + '」不存在'); });
    }
    if (e.type === 'encounter') {
      if (!D.encounters[e.encounter]) err(el, '遭遇「' + e.encounter + '」不存在');
      Object.keys(e.onResult || {}).forEach((r) => { if (RESULTS.indexOf(r) < 0) err(el, 'onResult 的結果「' + r + '」不在清單：' + RESULTS.join('、')); checkActions(e.onResult[r], el + ' onResult.' + r); });
    }
    if (e.type === 'warp') {
      if (!D.maps[e.to]) return err(el, '目標地圖「' + e.to + '」不存在');
      const tp = V.resolvePos(parsed[e.to], e, 'tx', 'ty', 'toAt');
      if (!tp) return err(el, '目標座標（tx,ty 或 toAt）無效');
      if (walkableAt(e.to, tp.x, tp.y, el + ' 落點')) addArrival(e.to, tp);
      const onWarp = V.util.toArray(pm.markers && []).length; void onWarp;
      // 落點不可再踩在另一個傳送點上（會連環傳送）
      (D.maps[e.to].entities || []).forEach((o) => { if (o.type === 'warp') { const op = V.resolvePos(parsed[e.to], o); if (op && op.x === tp.x && op.y === tp.y) err(el, '落點與目標地圖的傳送點「' + (o.id || '') + '」重疊'); } });
    }
  });
});
// 可達性：每張地圖從所有抵達點出發，傳送點與觸發點必須走得到（站上去）；NPC／物件／遭遇必須能站到相鄰格
const reachSets = {};
Object.keys(D.maps).forEach((mid) => {
  const seeds = arrivals[mid] || [];
  if (!seeds.length) { warn(where('maps', mid), '沒有任何傳送點或起始點通往這張地圖'); return; }
  const rs = reachSets[mid] = reach(mid, seeds);
  (D.maps[mid].entities || []).forEach((e, i) => {
    const p = V.resolvePos(parsed[mid], e); if (!p) return;
    const el = where('maps', mid) + ' 實體 ' + (e.id || '#' + i);
    const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => rs.has((p.x + dx) + ',' + (p.y + dy)));
    if (e.type === 'warp' || e.type === 'trigger') { if (!rs.has(p.x + ',' + p.y)) err(el, '從抵達點走不到這個' + (e.type === 'warp' ? '傳送點' : '觸發點') + ' (' + p.x + ',' + p.y + ')'); }
    else if (!near) err(el, '從抵達點走不到它的旁邊 (' + p.x + ',' + p.y + ')');
  });
});

// ---- 對話 ----
Object.keys(D.dialogues).forEach((id) => {
  const d = D.dialogues[id], loc = where('dialogues', id);
  if (Array.isArray(d)) return checkLines(d, loc);
  if (d.cond != null) checkCond(d.cond, loc);
  if (!d.nodes) { checkLines(d.lines || [], loc); if (d.actions) checkActions(d.actions, loc); return; }
  if (d.start && !d.nodes[d.start]) err(loc, 'start 節點「' + d.start + '」不存在');
  Object.keys(d.nodes).forEach((nid) => {
    const n = d.nodes[nid], nl = loc + ' 節點 ' + nid;
    const nx = (v, w) => { if (v != null && !d.nodes[v]) err(nl, w + ' 指向不存在的節點「' + v + '」'); };
    nx(n.next, 'next');
    checkLines(n.text != null ? n.text : n.lines, nl);
    if (n.actions) checkActions(n.actions, nl);
    (n.branch || []).forEach((b, k) => { checkCond(b.cond, nl + ' branch#' + (k + 1)); nx(b.next, 'branch'); });
    (n.choices || []).forEach((c, k) => {
      const cl = nl + ' 選項#' + (k + 1);
      if (!c.text) err(cl, '選項缺少 text');
      if (c.cond != null) checkCond(c.cond, cl);
      if (c.lines) checkLines(c.lines, cl);
      if (c.actions) checkActions(c.actions, cl);
      nx(c.next, '選項');
    });
  });
});
Object.keys(D.cutscenes).forEach((id) => { const c = D.cutscenes[id]; checkActions(Array.isArray(c) ? c : c.commands, where('cutscenes', id), true); });

// ---- 任務、物品、配方、商店 ----
Object.keys(D.quests).forEach((id) => {
  const q = D.quests[id], loc = where('quests', id);
  if (!q.name) err(loc, '缺少 name');
  if (!Array.isArray(q.stages) || !q.stages.length) err(loc, 'stages 至少要有一個階段');
  const seen = {}; (q.stages || []).forEach((s) => { if (!s.id || !s.text) err(loc, '每個階段需要 id 與 text'); if (seen[s.id]) err(loc, '階段 id「' + s.id + '」重複'); seen[s.id] = 1; });
  const rw = q.rewards || {};
  Object.keys(rw.items || {}).forEach((i) => { if (!D.items[i]) err(loc, '獎勵物品「' + i + '」不存在'); });
  Object.keys(rw.dims || {}).forEach((k) => { if (!R.isDim(k)) err(loc, '四向度「' + k + '」不存在'); });
  Object.keys(rw.conn || {}).forEach((z) => { if (!REF.zone(z)) err(loc, '區域「' + z + '」不存在'); });
});
Object.keys(D.items).forEach((id) => {
  const it = D.items[id], loc = where('items', id);
  if (!it.name) err(loc, '缺少 name');
  if (CATS.indexOf(it.cat) < 0) err(loc, 'cat 必須是 ' + CATS.join('／'));
  if (it.treats && !V.GLYPHS[it.treats]) err(loc, 'treats「' + it.treats + '」不是味符（' + V.GLYPH_ORDER.join('') + '）');
  if (it.cat === 'medicine' && !it.treats) err(loc, '處置藥需要 treats');
});
Object.keys(D.recipes).forEach((id) => {
  const r = D.recipes[id], loc = where('recipes', id);
  if (!D.items[r.output]) err(loc, '產物「' + r.output + '」不存在');
  Object.keys(r.inputs || {}).forEach((i) => { if (!D.items[i]) err(loc, '材料「' + i + '」不存在'); });
  if (!r.inputs || !Object.keys(r.inputs).length) err(loc, 'inputs 不可為空');
  if (r.cond != null) checkCond(r.cond, loc); if (r.hidden != null && r.hidden !== true) checkCond(r.hidden, loc);
});
Object.keys(D.shops).forEach((id) => {
  const s = D.shops[id], loc = where('shops', id);
  const cur = s.currency || D.meta.currency; if (!cur || !D.items[cur]) err(loc, '沒有有效的貨幣（shop.currency 或 meta.currency）');
  (s.stock || []).concat(s.buys || []).forEach((e) => { if (!D.items[e.item]) err(loc, '物品「' + e.item + '」不存在'); if (typeof e.price !== 'number') err(loc, '「' + e.item + '」缺少數字 price'); });
});

// ---- 遭遇 ----
Object.keys(D.encounters).forEach((id) => {
  const e = D.encounters[id], loc = where('encounters', id);
  if (!e.name) err(loc, '缺少 name');
  const seqs = e.sequences || (e.sequence ? [e.sequence] : []);
  if (!seqs.length) err(loc, '缺少 sequence 或 sequences');
  seqs.forEach((sq) => (typeof sq === 'string' ? sq.split('') : sq).forEach((g) => { if (!V.GLYPHS[g]) err(loc, '味序中的「' + g + '」不是味符'); }));
  if (e.bg && BG.indexOf(e.bg) < 0) err(loc, 'bg 必須是 ' + BG.join('／'));
  if (e.zone && !REF.zone(e.zone)) err(loc, 'zone「' + e.zone + '」不存在');
  if (e.tutorial && !D.tutorials[e.tutorial]) err(loc, '教學「' + e.tutorial + '」不存在');
  if (e.rank && ['normal', 'mid', 'boss'].indexOf(e.rank) < 0) err(loc, 'rank 必須是 normal／mid／boss');
  V.util.toArray(e.locked).forEach((c) => { if (['taste', 'treat', 'clear', 'guard', 'rinse', 'item', 'isolate', 'retreat'].indexOf(c) < 0) err(loc, 'locked 的指令「' + c + '」不存在'); });
  (e.behaviors || []).concat(e.rules || []).forEach((b, k) => {
    if (BEHAVIOR_TYPES.indexOf(b.type) < 0) err(loc, '行為#' + (k + 1) + ' type「' + b.type + '」不在清單：' + BEHAVIOR_TYPES.join('、'));
    if (b.glyph && !V.GLYPHS[b.glyph]) err(loc, '行為#' + (k + 1) + ' glyph「' + b.glyph + '」不是味符');
    (b.pool || []).forEach((g) => { if (!V.GLYPHS[g]) err(loc, '行為#' + (k + 1) + ' pool 中「' + g + '」不是味符'); });
    if (b.say) checkLines(b.say.lines || b.say, loc + ' 行為#' + (k + 1));
    if (b.actions) checkActions(b.actions, loc + ' 行為#' + (k + 1));
    if (b.when && b.when.cond != null) checkCond(b.when.cond, loc + ' 行為#' + (k + 1) + ' when.cond');
  });
  const blocks = { rewards: e.rewards, isolate: e.isolate, collapse: e.collapse };
  Object.keys(blocks).forEach((bk) => {
    const b = blocks[bk]; if (!b) return;
    Object.keys(b.items || {}).forEach((i) => { if (!D.items[i]) err(loc, bk + ' 物品「' + i + '」不存在'); });
    Object.keys(b.dims || {}).forEach((k) => { if (!R.isDim(k)) err(loc, bk + ' 四向度「' + k + '」不存在'); });
    Object.keys(b.conn || {}).forEach((z) => { if (!REF.zone(z)) err(loc, bk + ' 區域「' + z + '」不存在'); });
    if (b.actions) checkActions(b.actions, loc + ' ' + bk);
  });
  Object.keys(e.events || {}).forEach((k) => {
    const v = e.events[k];
    const one = (x, kk) => { if (x && (x.lines || x.actions)) { if (x.lines) checkLines(x.lines, loc + ' events.' + kk); if (x.actions) checkActions(x.actions, loc + ' events.' + kk); } else if (x) checkLines(x, loc + ' events.' + kk); };
    if (v && !Array.isArray(v) && typeof v === 'object' && !v.lines && !v.actions) Object.keys(v).forEach((n) => one(v[n], k + '.' + n)); else one(v, k);
  });
  if (e.softFail) {
    if (e.softFail.lines) checkLines(e.softFail.lines, loc + ' softFail');
    if (e.softFail.actions) checkActions(e.softFail.actions, loc + ' softFail');
    if (e.softFail.warp) { if (D.maps[e.softFail.warp.map]) walkableAt(e.softFail.warp.map, e.softFail.warp.x, e.softFail.warp.y, loc + ' softFail.warp'); else err(loc, 'softFail.warp 地圖不存在'); }
  }
  if (e.retreatWarp && D.maps[e.retreatWarp.map]) walkableAt(e.retreatWarp.map, e.retreatWarp.x, e.retreatWarp.y, loc + ' retreatWarp');
  else if (e.retreatWarp) err(loc, 'retreatWarp 地圖不存在');
});

// ---- 葉帖、等級、手技、區域、教學 ----
Object.keys(D.folios).forEach((id) => {
  const f = D.folios[id], loc = where('folios', id);
  if (!f.name) err(loc, '缺少 name');
  if (!f.image) err(loc, '缺少 image'); else if (!fs.existsSync(path.join(ROOT, f.image))) err(loc, '圖檔不存在：' + f.image);
  const c = f.conditions || {};
  if (!Object.keys(c).length) warn(loc, '沒有任何條件，永遠無法繪製');
  Object.keys(c).forEach((k) => {
    if (['observe', 'sample', 'diagnose'].indexOf(k) < 0) err(loc, 'conditions 只能有 observe／sample／diagnose');
    if (!R.isFlagRef(c[k])) checkCond(c[k], loc + ' conditions.' + k);
  });
  Object.keys((f.reward || {}).flags || {}).forEach(() => {});
  if (f.before) checkLines(f.before, loc + ' before'); if (f.after) checkLines(f.after, loc + ' after');
  (f.nameAlt || []).forEach((n, k) => checkCond(n.cond, loc + ' nameAlt#' + (k + 1)));
});
(D.levels || []).forEach((row, i) => {
  const loc = (origin.levels || '?') + ' levels[' + i + ']';
  ['level', 'exp', 'stamina', 'load'].forEach((k) => { if (typeof row[k] !== 'number') err(loc, '缺少數字 ' + k); });
  V.util.toArray(row.learn).forEach((s) => { if (!D.skills[s]) err(loc, '手技「' + s + '」不存在'); });
});
Object.keys(D.zones).forEach((z) => { const zd = D.zones[z]; if (zd.vein && R.VEIN_STAGES.indexOf(zd.vein) < 0) err(where('zones', z), '脈況「' + zd.vein + '」不在清單'); });
Object.keys(D.tutorials).forEach((t) => { if (!Array.isArray(D.tutorials[t].pages) || !D.tutorials[t].pages.length) err(where('tutorials', t), 'pages 不可為空'); });
Object.keys((D.meta && D.meta.endings) || {}).forEach((k) => { const e = D.meta.endings[k]; if (e.image && !fs.existsSync(path.join(ROOT, e.image))) err(origin.meta + ' endings.' + k, '圖檔不存在：' + e.image); });
if (D.meta.titleImage && !fs.existsSync(path.join(ROOT, D.meta.titleImage))) err(origin.meta, 'titleImage 圖檔不存在：' + D.meta.titleImage);

// ---- 輸出 ----
const n = (c) => Object.keys(D[c]).length;
console.log('驗證 ' + (DEMO ? '測試房' : '正式資料') + '：' + list.length + ' 個檔案；地圖 ' + n('maps') + '、對話 ' + n('dialogues') + '、過場 ' + n('cutscenes') +
  '、任務 ' + n('quests') + '、物品 ' + n('items') + '、配方 ' + n('recipes') + '、商店 ' + n('shops') + '、遭遇 ' + n('encounters') + '、葉帖 ' + n('folios'));
warns.forEach((w) => console.log('  警告　' + w));
errors.forEach((e) => console.log('  錯誤　' + e));
console.log(errors.length ? '共 ' + errors.length + ' 個錯誤、' + warns.length + ' 個警告。' : '零錯誤（' + warns.length + ' 個警告）。');
process.exit(errors.length ? 1 : 0);
