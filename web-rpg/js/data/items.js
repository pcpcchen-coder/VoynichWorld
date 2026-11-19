/*
 * 序章〈味變〉：物品、調劑配方、以物易物（§10）。
 * 藥材樣本以 material:true 標記：不算「未入庫的診斷樣本」，撤離時不會掉、也不在種源龕換籤。
 */
(function (V) {
  'use strict';
  var D = V.data;

  function I(id, def) { D.items[id] = def; }

  // ---- 藥材樣本（可採集、可調劑）----
  I('item.sample.spring_crystal', { name: '礦泉結晶', cat: 'sample', material: true, icon: { shape: 'crystal', color: '#c9d6d2' }, desc: '溫泉在池階邊緣留下的細小晶簇。研細後拌進站存的燼冠灰，就是池站用的燼灰。' });
  I('item.sample.bellpipe_sap', { name: '鐘管草汁', cat: 'sample', material: true, icon: { shape: 'drop', color: '#e8e2d0' }, desc: '從根管滴口接下的乳白汁液。兌水後是靛乳。採的時候要記水位，不然下次沒得比。' });
  I('item.sample.suture_thornleaf', { name: '縫葉刺緣葉', cat: 'sample', material: true, icon: { shape: 'leaf', color: '#5f9a78' }, desc: '縫葉五種葉裡負責防禦的那一圈。一片葉兌一管水——再濃就不是藥了。' });
  I('item.sample.sugar_sac', { name: '池糖囊', cat: 'sample', material: true, icon: { shape: 'pouch', color: '#9fd8e3' }, desc: '飽滿的儲水共生囊，透光看得見糖流。蓴嬸拿它煮湯，味診台拿它調池糖液。' });
  I('item.sample.clean_water', { name: '淨池水', cat: 'sample', material: true, icon: { shape: 'vial', color: '#bfe8ff' }, desc: '濾過、靜置過的池水。稀釋樣本、沖洗掌舌、調藥，樣樣要它。' });

  // ---- 診斷樣本（穩定對象後取得；種源龕入庫每件換 1 支池糖籤）----
  I('item.sample.salt_crust', { name: '鹹殼片', cat: 'sample', icon: { shape: 'shell', color: '#b5653a' }, desc: '從滲口剝下的礦殼。銅鏽色，內側還黏著一點活土的纖維。' });
  I('item.sample.drawmite_husk', { name: '死汲蟲殼', cat: 'sample', icon: { shape: 'shell', color: '#a9a49a' }, desc: '肚子裡的光已經熄了。交給記脈院可以數出牠缺氣了多久。' });
  I('item.sample.moth_dust', { name: '亂光鱗粉', cat: 'sample', icon: { shape: 'pouch', color: '#e0d48a' }, desc: '燈蛾翼端落下的發光粉。離了蛾，還會亂閃一陣子才暗。' });
  I('item.sample.sick_spore', { name: '病孢樣本', cat: 'sample', icon: { shape: 'vial', color: '#8a8f86' }, desc: '封在蠟管裡的灰絨。不可開管嗅聞。' });
  I('item.sample.sponge_chip', { name: '儲水海綿片', cat: 'sample', icon: { shape: 'shell', color: '#6d86a8' }, desc: '橋腹水囊自己脫落的一小片。按下去會慢慢回彈。' });
  I('item.sample.scab_flake', { name: '硬痂片', cat: 'sample', icon: { shape: 'shell', color: '#e6dcc4' }, desc: '痂口邊緣的骨白碎片。斷面上看得見一道不是自然長出來的直線。' });

  // ---- 處置藥（treatFlag：第一次對症使用時設旗標，F-174 診斷條件用）----
  I('item.med.emberash', { name: '燼灰', cat: 'medicine', treats: '鹹', treatFlag: 'flag.prologue.treated_emberash', icon: { shape: 'pouch', color: '#c58a52' }, desc: '中和硫化與礦毒。站裡的灰都兌過結晶，純灰太烈。' });
  I('item.med.suran_trace', { name: '縫苦（微量）', cat: 'medicine', treats: '苦', treatFlag: 'flag.prologue.treated_suran', icon: { shape: 'vial', color: '#8fc9a3' }, desc: '淡到幾乎沒有味道才是對的。它讓吵的安靜，不是讓它睡。' });
  I('item.med.indolk', { name: '靛乳', cat: 'medicine', treats: '焦', treatFlag: 'flag.prologue.treated_indolk', icon: { shape: 'drop', color: '#5b7bd6' }, desc: '讓堵住的管子暫時鬆開。多了，訊號會四處亂走。' });
  I('item.med.pool_sugar', { name: '池糖液', cat: 'medicine', treats: '澀', treatFlag: 'flag.prologue.treated_pool_sugar', icon: { shape: 'vial', color: '#73D6D0' }, desc: '給乾掉的組織一口帶糖的水。對健康的囊用，囊會撐裂。' });

  // ---- 消耗品 ----
  I('item.use.palate_rinse', { name: '味覺沖洗液', cat: 'consumable', icon: { shape: 'vial', color: '#9fe3dc' }, desc: '把上一句話洗掉，才聽得見下一句。（感官負荷 −20；清除味覺殘留）', use: { load: -20, clearResidue: true } });
  I('item.use.spring_cake', { name: '溫泉微生物餅', cat: 'consumable', icon: { shape: 'pouch', color: '#98613C' }, desc: '池邊菌膜烘成的薄餅。鹹，耐放，越嚼越有礦味。（體力 +15）', use: { stamina: 15 } });
  I('item.use.mycomat_roll', { name: '菌毯卷', cat: 'consumable', icon: { shape: 'leaf', color: '#7a6a4a' }, desc: '整片菌毯捲起來蒸的。慢拱以前也愛吃這個，生的。（體力 +30）', use: { stamina: 30 } });
  I('item.use.mist_veil', { name: '濾霧面巾', cat: 'consumable', usable: 'battle', icon: { shape: 'page', color: '#c9bc9f' }, desc: '紗織的，比站裡發的密。一場用一條。（使用後該場遭遇內，受到的感官灌入 −30%，與防護相乘）', use: { veil: 0.3, text: '珂潾把面巾繫上口鼻。（本場感官灌入 −30%）' } });
  I('item.currency.sugar_tally', { name: '池糖籤', cat: 'key', icon: { shape: 'ticket', color: '#D8CCB3' }, desc: '霧階池站的配給憑證。出了霧階，就是一根竹片。' });

  // ---- 重要物品 ----
  I('item.key.seal_clamp', { name: '封脈夾', cat: 'key', unlock: 'isolate', icon: { shape: 'key', color: '#e6dcc4' }, desc: '骨白色的夾，夾口包著耐熱纖維。夾下去的那一段，就不是網裡的了。解鎖「隔離／切除」。' });
  I('item.key.backgarden_sprout', { name: '背園新芽', cat: 'key', icon: { shape: 'leaf', color: '#73D6D0' }, desc: '從慢拱背園一支枯鐘管草根部取下的一點青。不知道會不會長。' });
  I('item.key.backgarden_remnant', { name: '背園殘葉', cat: 'key', icon: { shape: 'leaf', color: '#7a5a3a' }, desc: '從夾下來的那半座背園裡撿的，還沒黑掉的一片葉。' });
  I('item.key.auri_leaf_01', { name: '奧芮殘葉①〈霧階·舊接口〉', cat: 'key', icon: { shape: 'page', color: '#e8dcc0' }, desc: '一張對摺的犢皮。「往上，看水從哪一階開始不回答。」頁角的汲蟲有七條腿。' });
  I('item.key.puma_knot', { name: '蒲嬤的池守結', cat: 'key', icon: { shape: 'key', color: '#98613C' }, desc: '池守交班時繫在水位尺上的繩結。她沒說為什麼放在藥匣裡。本章無功能。' });
  I('item.key.tide_slip', { name: '潮汐曆抄片', cat: 'key', icon: { shape: 'page', color: '#c9bc9f' }, desc: '汐伯抄的一旬潮汐，「三尺同」旁邊畫了一個圈。本章無功能，可閱讀。' });
  I('item.key.sealed_gloves', { name: '無孔掌套', cat: 'key', passive: { guardCut: 0.3 }, icon: { shape: 'gloves', color: '#2B7D79' }, desc: '絡補過的掌套。防護時受到的體力傷害與感官灌入只剩三成。' });
  I('item.quest.sealed_soup', { name: '封罐的池況湯', cat: 'key', icon: { shape: 'vial', color: '#c58a52' }, desc: '霧階今天的水，煮成了能帶著走的樣子。罐子要還。' });
  I('item.quest.membrane_patch', { name: '半透膜片', cat: 'key', icon: { shape: 'page', color: '#e6f0ea' }, desc: '外環來的補膜料，薄得能透光。' });

  // ---- 調劑配方（味診台；下層舊味診盤同）。首次調劑的劑量三選一之後才出現在清單上 ----
  var OPEN = 'flag.prologue.dosage_done';
  D.recipes = D.recipes || {};
  D.recipes['rcp.p0.emberash'] = { name: '燼灰', inputs: { 'item.sample.spring_crystal': 2 }, output: 'item.med.emberash', count: 1, hidden: OPEN, flags: ['flag.prologue.brewed_emberash'], desc: '礦泉結晶 ×2。站存的燼冠灰作引子，不另計。' };
  D.recipes['rcp.p0.suran_trace'] = { name: '縫苦（微量）', inputs: { 'item.sample.suture_thornleaf': 1, 'item.sample.clean_water': 1 }, output: 'item.med.suran_trace', count: 2, hidden: OPEN, flags: ['flag.prologue.brewed_suran'], desc: '縫葉刺緣葉 ×1 ＋ 淨池水 ×1。劑量固定為「淡」：一滴汁，兌一整管淨水。' };
  D.recipes['rcp.p0.indolk'] = { name: '靛乳', inputs: { 'item.sample.bellpipe_sap': 1, 'item.sample.clean_water': 1 }, output: 'item.med.indolk', count: 1, hidden: OPEN, flags: ['flag.prologue.brewed_indolk'], desc: '鐘管草汁 ×1 ＋ 淨池水 ×1。' };
  D.recipes['rcp.p0.pool_sugar'] = { name: '池糖液', inputs: { 'item.sample.sugar_sac': 1, 'item.sample.clean_water': 1 }, output: 'item.med.pool_sugar', count: 2, hidden: OPEN, flags: ['flag.prologue.brewed_pool_sugar'], desc: '池糖囊 ×1 ＋ 淨池水 ×1。' };
  D.recipes['rcp.p0.palate_rinse'] = { name: '味覺沖洗液', inputs: { 'item.sample.clean_water': 2 }, output: 'item.use.palate_rinse', count: 1, hidden: OPEN, desc: '淨池水 ×2。' };

  // ---- 以物易物：梭的貨攤（§10.4）----
  D.shops = D.shops || {};
  D.shops['shop.p0.suo'] = {
    name: '梭的貨攤',
    stock: [
      { item: 'item.sample.clean_water', price: 1 },
      { item: 'item.use.spring_cake', price: 2, qty: 6 },
      { item: 'item.use.mycomat_roll', price: 4, qty: 2 },
      { item: 'item.use.palate_rinse', price: 3, qty: 4 },
      { item: 'item.sample.spring_crystal', price: 2, qty: 6 },
      { item: 'item.med.pool_sugar', price: 3, qty: 3 },
      { item: 'item.med.emberash', price: 4, qty: 3 },
      { item: 'item.med.indolk', price: 4, qty: 3 },
      { item: 'item.med.suran_trace', price: 5, qty: 2, say: '梭：這個我只帶兩份。多了我自己也怕。' },
      { item: 'item.use.mist_veil', price: 6, qty: 1 }
    ],
    buys: [
      { item: 'item.sample.salt_crust', price: 2 },
      { item: 'item.sample.drawmite_husk', price: 2 },
      { item: 'item.sample.moth_dust', price: 2 },
      { item: 'item.sample.sponge_chip', price: 2 },
      { item: 'item.sample.scab_flake', price: 2 },
      { item: 'item.sample.spring_crystal', price: 1 },
      { item: 'item.sample.sugar_sac', price: 1 }
    ]
  };
})(window.VELLORA);
