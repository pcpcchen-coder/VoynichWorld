/*
 * 正式資料清單。
 * 把正式內容的資料檔（相對於 index.html 的路徑）依載入順序列在 official 陣列中即可，不必改引擎。
 * 例：official: ['js/data/meta.js', 'js/data/items.js', 'js/data/maps-mist.js', ...]
 * 清單為空時，index.html 會自動改載入 js/data-demo/ 的測試房。
 * 資料格式見 docs/ENGINE.md；寫完後請執行 node tools/validate-data.js。
 */
(function (root) {
  root.VELLORA = root.VELLORA || {};
  root.VELLORA.dataManifest = root.VELLORA.dataManifest || {};
  root.VELLORA.dataManifest.official = [
  ];
})(typeof window !== 'undefined' ? window : this);
