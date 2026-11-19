#!/usr/bin/env node
// 印出正式資料某張地圖的 ASCII 預覽（地面＋物件＋實體首字）：node tools/print-map.js map.miststep.station
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const sb = { console }; sb.window = sb; vm.createContext(sb);
const run = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
['js/engine/core.js', 'js/engine/rules.js', 'js/engine/tiledefs.js', 'js/engine/mapparse.js', 'js/data/manifest.js'].forEach(run);
sb.VELLORA.resetData();
sb.VELLORA.dataManifest.official.forEach(run);
const id = process.argv[2], def = sb.VELLORA.data.maps[id];
if (!def) { console.log('沒有地圖', id, Object.keys(sb.VELLORA.data.maps)); process.exit(1); }
const pm = sb.VELLORA.parseMap(id, def);
const grid = [];
for (let y = 0; y < pm.h; y++) { let r = []; for (let x = 0; x < pm.w; x++) r.push(pm.objects[y * pm.w + x] || pm.ground[y * pm.w + x]); grid.push(r); }
(def.entities || []).forEach((e) => { const p = sb.VELLORA.resolvePos(pm, e); if (p) grid[p.y][p.x] = { npc: '@', object: '*', encounter: 'E', warp: 'O', trigger: '+' }[e.type] || '?'; });
console.log('    ' + Array.from({ length: pm.w }, (_, i) => i % 10).join(''));
grid.forEach((r, y) => console.log(String(y).padStart(3) + ' ' + r.join('')));
