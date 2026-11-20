/*
 * 標題畫面的 3D 背景：載入起始地圖的地形（不放人物與實體），鏡頭在霧階池站上空緩慢環繞。
 * 標題選單本身是共用的 screens.js。
 */
(function () {
  'use strict';
  var V = window.VELLORA, THREE = window.THREE, W = V.world3d;
  var S3 = V.screens3d = {};
  var camera = null, built = false, t = 0;
  S3.renderTitle = function (dt, raw) {
    if (!camera) { camera = new THREE.PerspectiveCamera(45, 1, 0.1, 900); }
    if (!built || (V.field.map && W.pm !== V.field.map.pm && !W._titleMap)) {
      var st = V.data.start || {}, def = V.data.maps[st.map];
      if (!def) return;
      W.build({ id: st.map, def: def, pm: V.parseMap(st.map, def) });
      W._titleMap = true; built = true;
    }
    t += raw;
    camera.aspect = V.r3d.w / V.r3d.h; camera.updateProjectionMatrix();
    var pm = W.pm, cx = pm.w / 2, cz = pm.h / 2 + 2, a = t * 0.035 + 0.4, R = Math.max(pm.w, pm.h) * 0.3;
    var focus = new THREE.Vector3(cx, 0.6, cz);
    camera.position.set(cx + Math.sin(a) * R, 7.5 + Math.sin(t * 0.07) * 1.0, cz + Math.cos(a) * R);
    camera.lookAt(focus);
    W.update(raw, focus, camera);
    V.r3d.renderer.render(W.scene, camera);
  };
  // 進入地圖後由 mapload 重建世界；回到標題時重新建一次背景
  V.on('mapload', function () { W._titleMap = false; built = false; });
})();
