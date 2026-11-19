/*
 * 地圖解析：把手寫字元陣列轉成格狀資料，解析標記點（markers）。
 * 純邏輯，遊戲與驗證器共用。
 */
(function (root) {
  'use strict';
  var V = root.VELLORA;

  // 回傳 { id, w, h, ground[], objects[], overlay[], markers{字元:[{x,y}]}, errors[] }
  V.parseMap = function (id, def) {
    var errors = [];
    var g = def.ground;
    if (!Array.isArray(g) || !g.length) {
      return { id: id, w: 0, h: 0, ground: [], objects: [], overlay: [], markers: {}, errors: ['地圖「' + id + '」缺少 ground（字元陣列）'] };
    }
    var h = g.length, w = 0, x, y;
    g.forEach(function (row) { if (row.length > w) w = row.length; });
    function layer(name, rows, kind) {
      var out = new Array(w * h);
      if (rows && rows.length !== h) errors.push('地圖「' + id + '」的 ' + name + ' 有 ' + rows.length + ' 列，與 ground 的 ' + h + ' 列不符');
      for (y = 0; y < h; y++) {
        var row = rows ? (rows[y] || '') : '';
        if (rows && row.length !== w) errors.push('地圖「' + id + '」的 ' + name + ' 第 ' + (y + 1) + ' 列寬 ' + row.length + '，應為 ' + w);
        for (x = 0; x < w; x++) {
          var ch = row.charAt(x) || (kind === 'ground' ? '0' : ' ');
          if (kind === 'markers') { out[y * w + x] = V.EMPTY_CHARS[ch] ? null : ch; continue; }
          if (kind !== 'ground' && V.EMPTY_CHARS[ch]) { out[y * w + x] = null; continue; }
          var t = V.TILES[ch];
          if (!t) { errors.push('地圖「' + id + '」的 ' + name + ' (' + x + ',' + y + ') 有未知圖塊字元「' + ch + '」'); out[y * w + x] = kind === 'ground' ? '0' : null; continue; }
          if (t.layer !== kind) { errors.push('地圖「' + id + '」的 ' + name + ' (' + x + ',' + y + ') 字元「' + ch + '」（' + t.name + '）不屬於 ' + kind + ' 層'); out[y * w + x] = kind === 'ground' ? '0' : null; continue; }
          out[y * w + x] = ch;
        }
      }
      return out;
    }
    var m = {
      id: id, w: w, h: h,
      ground: layer('ground', g, 'ground'),
      objects: layer('objects', def.objects, 'object'),
      overlay: layer('overlay', def.overlay, 'overlay'),
      markers: {}, errors: errors
    };
    var mk = layer('markers', def.markers, 'markers');
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var c = mk[y * w + x];
      if (c) (m.markers[c] = m.markers[c] || []).push({ x: x, y: y });
    }
    return m;
  };

  // 靜態可行走（只看圖塊）
  V.tileWalkable = function (pm, x, y) {
    if (x < 0 || y < 0 || x >= pm.w || y >= pm.h) return false;
    var i = y * pm.w + x;
    var gt = V.TILES[pm.ground[i]];
    if (!gt || !gt.walk) return false;
    var o = pm.objects[i];
    if (o && !V.TILES[o].walk) return false;
    return true;
  };

  // 解析實體座標：{x,y} 或 {at:'標記字元'}；回傳 {x,y} 或 null
  V.resolvePos = function (pm, ent, keyX, keyY, keyAt) {
    keyX = keyX || 'x'; keyY = keyY || 'y'; keyAt = keyAt || 'at';
    if (ent[keyAt] != null) {
      var list = pm.markers[ent[keyAt]];
      if (!list || !list.length) return null;
      return { x: list[0].x, y: list[0].y };
    }
    if (typeof ent[keyX] === 'number' && typeof ent[keyY] === 'number') return { x: ent[keyX], y: ent[keyY] };
    return null;
  };
})(typeof window !== 'undefined' ? window : this);
