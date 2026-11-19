/*
 * 序章〈味變〉：遭遇對象（§9 遭遇圖鑑；開始／穩定文字取自 §7、§8 各場次）。
 * 行為機率（%）直接寫成 weight。一般對象穩定時不加四向度（§14.3 的播只來自死潮、慢拱與抉擇），故 dims:{}。
 */
(function (V) {
  'use strict';
  var D = V.data;
  function E(id, def) { def.zone = def.zone || 'miststep'; D.encounters[id] = def; }
  var Z = { miststep: 0 };

  // ======================= 只嚐不治的取樣（§9.1）=======================
  E('enc.p0.tutorial_first_pool', {
    name: '初階池水樣', sequence: '鹹苦焦', endOnReveal: true, noRetreat: true,
    locked: ['treat', 'clear'],
    sprite: { shape: 'mote', body: '#2b6b6b', dark: '#102626', glow: '#73D6D0', wild: 0.15 },
    bg: 'pool', ambience: 'village', tutorial: 'T-01',
    intro: '初階池的水樣在管裡微微發青。它不是病人，它是一句還沒唸出來的話。',
    desc: '它不是病人，它是一句還沒唸出來的話。',
    readText: '三個味道，照順序來的。',
    rewards: { exp: 10, flags: { 'flag.prologue.tasted_first_pool': true } },
    calmText: ['〔旁白〕池緣的水是溫的，比昨天溫一點。'],
    events: {
      reveal: {
        1: ['〔旁白〕一滴水樣，兌一管淨水。珂潾把它點在舌尖。', '珂潾：先是鹹。銅鏽一樣的鹹，貼在舌尖。', '珂潾：這個每天都有。初泉環的水本來就含礦。'],
        2: ['珂潾：等一下——', '珂潾：苦在後面。先涼，像薄荷，然後轉苦。', '珂潾：昨天沒有這個。'],
        3: ['珂潾：……焦。', '珂潾：很淡，拖在最後，像燒過的纖維。']
      },
      locked: ['〔旁白〕這是一池水，不是一個病人。現在能做的只有讀。'],
      read: ['珂潾：先鹹，後苦，最後拖著焦。', '珂潾：三個味道，照順序來的。不是一個味道，是一句話。']
    }
  });

  E('enc.p0.spring_source_sample', {
    name: '三階泉源水樣', sequence: '鹹甜', endOnReveal: true,
    locked: ['treat', 'clear'],
    sprite: { shape: 'mote', body: '#3b7a8a', dark: '#12262c', glow: '#bff1ea', wild: 0.05 },
    bg: 'pool', ambience: 'village',
    intro: '泉源的水樣是清的，溫度比初階池高。管壁上很快結了一圈細小的礦點。',
    desc: '泉源的水樣是清的。',
    readText: '沒有苦。沒有焦。',
    rewards: { exp: 10 },
    calmText: ['〔旁白〕泉源口冒著成串的細泡。'],
    events: {
      revealGlyph: { '鹹': ['珂潾：鹹。比站裡的濃。'], '甜': ['珂潾：……然後是甜。清涼，長尾。'] },
      locked: ['〔旁白〕這是一池水，不是一個病人。現在能做的只有讀。']
    }
  });

  // ======================= 一般對象（§9.2）=======================
  E('enc.p0.quarrel_sutureleaf', {
    name: '爭光的縫葉「五嘴」', sequence: '苦澀', imbalance: 30, noIsolate: true, noRetreat: true,
    sprite: { shape: 'plant', body: '#4f7a5a', dark: '#1d2a24', glow: '#e0d48a', accent: '#8fc9a3', plant: '#5f9a78', wild: 0.45, calmBody: '#5f9a78' },
    bg: 'wild', ambience: 'village', tutorial: 'T-02',
    intro: '五嘴的癒合縫一明一暗。刺緣葉又往裡收了一分，葉尖抵著薄葉的葉脈。它不是在攻擊誰，它是在跟自己吵架。',
    moods: [{ gte: 60, text: '刺緣葉全部朝內，壓得薄葉的邊都捲了。' }, { gte: 25, text: '五道縫一明一暗，還在吵。' }, { gte: 0, text: '縫的光暗下來了。' }],
    behaviors: [
      { id: 'rebound', type: 'attack', power: 2, weight: 40, tell: '刺緣葉的葉緣繃緊了。', text: '葉緣回彈，掃過手背。' },
      { id: 'bitter', type: 'load', power: 3, weight: 30, tell: '縫裡滲出一點苦霧。', text: '苦霧撲上來。' },
      { id: 'still', type: 'idle', weight: 30, tell: '它靜了一下。', text: '五嘴靜止不動。' }
    ],
    rules: [
      { id: 'restock', type: 'idle', when: { cond: { any: ['!item:item.med.suran_trace', '!item:item.med.pool_sugar'] } }, text: '楔姨又遞來一組藥。',
        say: ['楔姨：手這麼快？嚐了沒有？', '楔姨：（再遞一組）拿去。這是我今天的午飯錢。'],
        actions: [['give', 'item.med.suran_trace', 1], ['give', 'item.med.pool_sugar', 1]] }
    ],
    rewards: { exp: 15, items: { 'item.sample.suture_thornleaf': 2 }, dims: {}, conn: Z,
      flags: { 'flag.prologue.suture_stabilized': true, 'folio.f006.c2': true, 'folio.f006.c3': true, 'folio.f174.c1': true } },
    stableText: '刺緣葉一片一片鬆開，轉回朝外。薄葉的邊慢慢攤平，葉面起了一層很細的水光。五道縫暗下去，暗成平常的顏色。',
    calmText: ['〔旁白〕五嘴的五片葉朝同一個方向。'],
    softFail: { on: ['collapsed'], imbalance: 30, text: '五嘴嚇到了。讓它喘一下，再來。',
      lines: ['楔姨：停停停。', '〔旁白〕楔姨用兩根手指把主莖扶正，在縫上抹了一點癒合膠。', '楔姨：它嚇到了。讓它喘一下，妳再來。先嚐。'] },
    events: { allRevealed: { actions: [['flag', 'folio.f006.c3']] } }
  });

  E('enc.p0.salt_crust_seep', {
    name: '鹹殼滲口', sequence: '鹹澀', imbalance: 35,
    sprite: { shape: 'plant', body: '#8a5a3a', dark: '#2a1a12', glow: '#c58a52', accent: '#b5653a', plant: '#6a4a32', wild: 0.4, calmBody: '#6a7a5a' },
    bg: 'pool', ambience: 'village',
    approach: '靠近鹹殼滲口？',
    intro: '礦殼底下有東西在一鼓一鼓地頂。滲口想吐水，吐不出來，每頂一次，殼縫就噴出一點帶鏽味的霧。',
    behaviors: [
      { id: 'mist', type: 'load', power: 4, weight: 40, tell: '殼縫鼓起來，要噴了。', text: '噴出一股礦霧。' },
      { id: 'shard', type: 'attack', power: 3, weight: 30, tell: '殼片邊緣翹了起來。', text: '殼片彈裂，碎片打在手上。' },
      { id: 'press', type: 'surge', power: 4, weight: 30, tell: '底下的頂撞停住了，在悶著。', text: '滲口悶頂了一下。' }
    ],
    rewards: { exp: 15, items: { 'item.sample.salt_crust': 1, 'item.sample.spring_crystal': 1 }, dims: {}, conn: { miststep: 1 } },
    isolate: { exp: 5, conn: { miststep: -1 }, dims: { fen: 1 },
      text: '珂潾把封脈夾探到殼底下，夾住滲口下方那條細管，收口。殼不再長了。滲口也不會再吐水。',
      resultText: '棧道通了。這一小塊活土從今天起，得靠旁邊的口喝水。' },
    stableText: '殼從邊緣開始鬆，一片一片剝落。底下的滲口重新張開，吐出來的水是清的。活土在她腳下很慢地回彈了一下，像鬆了一口氣。',
    calmText: ['〔旁白〕滲口吐出來的水是清的。'],
    events: { isolated: ['珂潾：快。……很快。'] }
  });

  E('enc.p0.shrivelled_sugar_sac', {
    name: '乾癟的池糖囊', sequence: '澀甜澀', imbalance: 35,
    sprite: { shape: 'plant', body: '#3a5a7a', dark: '#12202c', glow: '#9fd8e3', accent: '#9fd8e3', plant: '#2a4a6a', wild: 0.3, calmBody: '#4a7a9a' },
    bg: 'pool', ambience: 'village',
    approach: '靠近乾癟的池糖囊？',
    intro: '癟掉的囊貼著葉托，一動也不動。只有中間那顆還在很慢地轉著它的糖。',
    behaviors: [
      { id: 'shrink', type: 'surge', power: 5, weight: 30, tell: '囊壁皺了起來。', text: '囊壁收縮。' },
      { id: 'ooze', type: 'load', power: 3, weight: 30, tell: '囊口滲出一點汁。', text: '滲出的澀汁沾上舌根。' },
      { id: 'still', type: 'idle', weight: 40, tell: '它一動也不動。', text: '池糖囊靜止。' }
    ],
    rewards: { exp: 15, items: { 'item.sample.sugar_sac': 2 }, dims: {}, conn: { miststep: 1 }, flags: { 'folio.f005.c3': true } },
    isolate: { exp: 5, conn: { miststep: -1 }, dims: { fen: 1 }, flags: { 'folio.f005.c3': true },
      text: '珂潾夾住那株的主莖基部，收口。癟囊不會再拖累旁邊的叢。那顆還飽的囊，跟著一起被留在夾子的另一邊。' },
    stableText: '兩顆癟囊慢慢鼓回來，皺紋一道一道撐平。中間那顆飽的從頭到尾沒有變——它本來就不需要變。',
    calmText: ['〔旁白〕三顆囊都是飽的，糖流朝同一個方向轉。'],
    events: {
      allRevealed: { actions: [['flag', 'folio.f005.c3']] },
      revealGlyph: { '甜': { lines: ['珂潾：甜。清涼，尾巴很長。', '珂潾：這一顆是好的。', { tutorial: 'T-05' }] } },
      sweetHurt: ['〔旁白〕池糖液灌進一顆本來就飽的囊。囊壁繃到發白，裂開一道細口，糖水沿著葉托流掉了。', '珂潾：……我剛才治了一個沒有病的地方。'],
      stabilized: ['珂潾：三顆裡面，一顆不用我。', '珂潾：記下來：不是每個味道都在求救。']
    }
  });

  E('enc.p0.drawmite_clot', {
    name: '汲蟲淤塞', sequence: '腥焦', imbalance: 40,
    sprite: { shape: 'swarm', body: '#8a8a80', dark: '#2a2a26', glow: '#5a6a66', accent: '#c9c2b0', wild: 0.5, calmBody: '#7a9a92' },
    bg: 'pool', ambience: 'village',
    approach: '清開導管口的汲蟲淤塞？',
    intro: '水位尺底下的導管口有拳頭粗。口上糊著一團灰白的東西——幾百隻死汲蟲黏在一起。水從牠們中間擠過來，帶著一股死水的腥。',
    behaviors: [
      { id: 'back', type: 'attack', power: 3, weight: 40, tell: '管口的水往外頂。', text: '水逆湧上來。' },
      { id: 'reek', type: 'load', power: 5, weight: 40, tell: '一股腥氣在聚。', text: '腥氣灌進鼻腔。' },
      { id: 'still', type: 'idle', weight: 20, tell: '水從縫裡一滴一滴擠出來。', text: '淤塞靜止。' }
    ],
    rewards: { exp: 15, items: { 'item.sample.drawmite_husk': 1 }, dims: {}, conn: { miststep: 1 } },
    isolate: { exp: 5, conn: { miststep: -2 }, dims: { fen: 1 },
      text: '珂潾夾住管口後面一掌的地方，收口。死蟲不會再漂進池裡。水也不會。' },
    stableText: '最後一團順著水滑了出來。管口「咕」地響了一聲，一股清水湧進池裡，水位尺上的水線顫了顫。',
    calmText: ['〔旁白〕管口通了。鐘管草還在叫。']
  });

  E('enc.p0.droning_bellpipe', {
    name: '低鳴的鐘管草', sequence: '焦澀焦', imbalance: 40,
    sprite: { shape: 'plant', body: '#7a5a3a', dark: '#2a1a12', glow: '#73D6D0', accent: '#c58a52', plant: '#98613C', wild: 0.55, calmBody: '#8a7a5a' },
    bg: 'wild', ambience: 'village',
    approach: '靠近低鳴的鐘管草？',
    intro: '這叢鐘管草收不到「可以停了」。它的根管裡一半是氣、一半是不流動的水，每一次共鳴都把自己震得更乾。',
    behaviors: [
      { id: 'hum', type: 'load', power: 5, weight: 50, tell: '低鳴越壓越低。', text: '低鳴震進胸口。' },
      { id: 'spray', type: 'attack', power: 3, weight: 20, tell: '根管滴口鼓了起來。', text: '根管噴出汁液。' },
      { id: 'wheeze', type: 'surge', power: 4, weight: 30, tell: '它喘了一下。', text: '喘鳴。' }
    ],
    rewards: { exp: 18, items: { 'item.sample.bellpipe_sap': 2 }, dims: {}, conn: { miststep: 1 }, flags: { 'folio.f004.c2': true, 'folio.f004.c3': true } },
    isolate: { exp: 6, conn: { miststep: -2 }, dims: { fen: 1 }, flags: { 'folio.f004.c3': true },
      text: '珂潾夾住這一叢共用的根座，收口。聲音停了——不是好了，是沒有水可以吹了。' },
    stableText: '根管裡「噗」地退出一口氣。低鳴斷了一下，換成兩個音，一高一低，像有人終於想起來要呼吸。',
    calmText: ['〔旁白〕這叢鐘管草一高一低地換著氣。'],
    events: {
      allRevealed: { actions: [['flag', 'folio.f004.c3']] },
      stabilized: ['〔旁白〕這一叢停了。遠處，橋的方向，那個更低的音還在。', '珂潾：這一叢是被吵醒的，不是源頭。源頭還在叫。']
    }
  });

  E('enc.p0.scrambled_lampmoths', {
    name: '亂光的燈蛾群', sequence: '苦甜苦', imbalance: 45,
    sprite: { shape: 'swarm', body: '#c9b06a', dark: '#3a2e12', glow: '#ffe9a0', accent: '#e0d48a', wild: 0.6, calmBody: '#d8c88a' },
    bg: 'wild', ambience: 'village',
    approach: '靠近亂光的燈蛾群？',
    before: ['〔旁白〕藍昏。發光花亮了，可是亮得太淡。一群燈蛾在花上方打轉，閃光本該是同一拍，現在各閃各的，像一句話被拆成了單字。', '珂潾：牠們找不到花。花還在，是花的光不夠了。'],
    intro: '燈蛾群繞著珂潾掌心的脈光轉。牠們把她當成了一朵比較亮的花。',
    behaviors: [
      { id: 'flash', type: 'load', power: 7, weight: 45, tell: '閃光越來越亂。', text: '亂閃刺進眼裡。' },
      { id: 'face', type: 'drain', power: { stamina: 2, load: 3 }, weight: 30, tell: '蛾群壓低了。', text: '燈蛾撲上臉。' },
      { id: 'scatter', type: 'forget', weight: 25, tell: '蛾群要散開了。', text: '燈蛾散開又重聚。' }
    ],
    rewards: { exp: 18, items: { 'item.sample.moth_dust': 1 }, dims: {}, conn: { miststep: 1 } },
    isolate: { exp: 6, conn: { miststep: -1 }, dims: { fen: 1 },
      text: '珂潾抖開濾霧面巾（沒有面巾則用外衣），把牠們往下風處趕。牠們散進霧裡，沒有回到花上。' },
    stableText: '閃光一隻接一隻對上了拍。整群燈蛾升高，在發光花上方排成一道弧，落下去。',
    calmText: ['〔旁白〕燈蛾在發光花上方同拍閃著。'],
    events: { revealGlyph: { '甜': ['珂潾：中間這一拍是齊的。有一部分的牠們還記得怎麼閃。不要動那一部分。'] } }
  });

  E('enc.p0.sick_spore_clump', {
    name: '濾幕上的病孢團', sequence: '苦鹹', imbalance: 30,
    sprite: { shape: 'mote', body: '#6a6a62', dark: '#22221e', glow: '#a9a49a', wild: 0.4, calmBody: '#9a9a8a' },
    bg: 'wild', ambience: 'village', noRetreat: false,
    approach: '靠近濾幕中幅的灰斑？',
    intro: '灰斑在風裡一鼓一鼓。它不是想害誰——它只是黏到了一個有水有糖的地方，就不想走了。',
    behaviors: [
      { id: 'spore', type: 'load', power: 5, weight: 50, tell: '灰絨揚起來了。', text: '揚孢。' },
      { id: 'stick', type: 'attack', power: 2, weight: 20, tell: '灰斑黏向掌套。', text: '黏掌。' },
      { id: 'still', type: 'idle', weight: 30, tell: '它貼著膜不動。', text: '病孢團靜止。' }
    ],
    rewards: { exp: 15, items: {}, dims: {}, conn: Z },
    isolate: { exp: 0, conn: Z, dims: {}, text: '珂潾夾住灰斑底下那一塊膜，收口。', resultText: '（視同割掉這一塊。）' },
    collapse: { conn: Z, text: '灰斑猛地揚起一大片粉，整幅膜都灰了一層。' },
    stableText: '灰絨一層一層塌下去，褪成膜本來的半透色。風穿過來，是乾淨的。'
  });

  E('enc.p0.collapsed_sponge', {
    name: '塌陷的儲水共生體', sequence: '澀鹹澀甜', imbalance: 45,
    sprite: { shape: 'plant', body: '#4a5a7a', dark: '#141a28', glow: '#9fb8e0', accent: '#6d86a8', plant: '#3a4a6a', wild: 0.45, calmBody: '#5a7aa0' },
    bg: 'cave',
    approach: '靠近塌陷的水囊？',
    intro: '水囊的每一個孔都在找水。它吸進來的是帶鏽味的濕氣，吐出來的還是。',
    behaviors: [
      { id: 'twitch', type: 'attack', power: 4, weight: 30, tell: '孔洞一縮一縮。', text: '水囊抽搐。' },
      { id: 'brine', type: 'load', power: 5, weight: 30, tell: '孔裡積著鹹水。', text: '噴出一股鹹水。' },
      { id: 'sag', type: 'surge', power: 6, weight: 25, tell: '它又往下垂了一點。', text: '再塌一分。' },
      { id: 'still', type: 'idle', weight: 15, tell: '它靜止了一下。', text: '水囊靜止。' }
    ],
    rewards: { exp: 20, items: { 'item.sample.sponge_chip': 1, 'item.sample.clean_water': 2 }, dims: {}, conn: { miststep: 1 } },
    isolate: { exp: 6, conn: { miststep: -2 }, dims: { fen: 1 },
      text: '珂潾夾住水囊的柄，收口。它整團落下來，被她推到廊邊。路通了。橋腹少了一只水囊。' },
    stableText: '孔洞一個接一個張圓了。水囊很慢地往上收，收回洞頂原來的位置，底下讓出一條路。一滴水從孔裡落下來，是清的。',
    calmText: ['〔旁白〕水囊收在洞頂，孔洞張圓了。']
  });

  E('enc.p0.sulfur_scab', {
    name: '滲硫的痂口', sequence: '鹹焦鹹腥', imbalance: 50,
    sprite: { shape: 'plant', body: '#c9b06a', dark: '#3a2e12', glow: '#e0d48a', accent: '#7a5a2e', plant: '#5a4a2a', wild: 0.5, calmBody: '#e6dcc4' },
    bg: 'cave',
    approach: '靠近滲硫的痂口？',
    intro: '痂口後面是一段已經死了的水。它想把自己封好，可是夾痕歪了一點，每一次鼓起來都漏一口。',
    behaviors: [
      { id: 'breath', type: 'drain', power: { stamina: 4, load: 3 }, weight: 40, tell: '痂口鼓了起來。', text: '漏出一口硫息。' },
      { id: 'press', type: 'load', power: 6, weight: 30, tell: '熱氣悶在通道裡。', text: '悶壓。' },
      { id: 'crack', type: 'surge', power: 5, weight: 20, tell: '痂緣發黑的地方在裂。', text: '痂裂。' },
      { id: 'still', type: 'idle', weight: 10, tell: '它靜了一下。', text: '痂口靜止。' }
    ],
    rewards: { exp: 22, items: { 'item.sample.scab_flake': 1 }, dims: {}, conn: { miststep: 1 } },
    isolate: { exp: 7, conn: { miststep: -2 }, dims: { fen: 1 },
      text: '珂潾在舊夾痕上又下了一道夾。痂口閉死，連旁邊一掌寬的管壁一起硬掉了。' },
    stableText: '痂口不再鼓了。黃白色的邊慢慢轉成乾淨的骨白，那股熱氣收了回去。',
    calmText: ['〔旁白〕它還是一道痂——封住的東西沒有打開。但它不漏了。'],
    events: { stabilized: ['〔旁白〕它還是一道痂——封住的東西沒有打開。但它不漏了。'] }
  });

  // ======================= 中頭目（§9.3）=======================
  E('enc.p0.mid_dead_tide', {
    name: '橋腹栓塞「死潮」', rank: 'mid', sequence: '腥焦鹹腥焦', imbalance: 55, misImbalance: 12,
    sprite: { shape: 'swarm', body: '#6a6a60', dark: '#1a1a16', glow: '#3a4a46', accent: '#a9a49a', wild: 0.75, calmBody: '#7a9a92' },
    bg: 'cave',
    approach: '靠近栓塞點？',
    intro: '死潮。這是老聆替這種東西取的名字：蟲死得比水沖得快，屍體自己漲成一道潮。牆後面的水壓在頂它，它頂回來。',
    behaviors: [
      { id: 'back', type: 'attack', power: 5, weight: 35, tell: '牆後的水在頂。', text: '逆湧。' },
      { id: 'reek', type: 'load', power: 7, weight: 35, tell: '腥硫氣在牆縫裡聚。', text: '腥硫氣撲面。' },
      { id: 'press', type: 'surge', power: 5, weight: 20, tell: '淤牆又壓實了一層。', text: '淤壓。' },
      { id: 'still', type: 'idle', weight: 10, tell: '水從牆縫裡一滴一滴擠出來。', text: '死潮靜止。' }
    ],
    rules: [
      { id: 'drift', type: 'grow', glyph: '腥', at: 'end', when: { every: 3, has: '焦' }, limit: 2, text: '還在漂來。',
        say: ['〔旁白〕牆的上游側又貼上來一層。裡面還有蟲在死，還在漂過來。', '珂潾：焦沒通之前，它會一直長。先把堵的打通，再清。'] }
    ],
    rewards: { exp: 40, items: { 'item.sample.drawmite_husk': 2, 'item.sample.bellpipe_sap': 1 }, dims: { bo: 1 }, conn: { miststep: 3 },
      flags: { 'flag.prologue.embolus_cleared': true } },
    isolate: { exp: 12, conn: { miststep: -4 }, dims: { fen: 2 }, flags: { 'flag.prologue.embolus_isolated': true },
      text: '珂潾在栓塞前一臂的地方架上封脈夾，收口。管壁在夾子後面慢慢起了一層痂。死潮不會再往站裡漂了。',
      resultText: '這條管，也不會再有水了。' },
    clampText: '珂潾在栓塞前一臂的地方架上封脈夾。牆後的水壓頂了上來。',
    softFail: { on: ['collapsed'], imbalance: 45, text: '牆整個塌實了。重新來過。',
      lines: ['珂潾：硬推不行。先看它哪一層是堵的，哪一層是屍體。'] },
    stableText: '牆從中間塌開一個洞。先是一股黑水，然後是灰的，然後——慢慢地——清的。',
    calmText: ['〔旁白〕管腔通了。洞頂的根管鬆了半個音。'],
    events: {
      stabilized: ['〔旁白〕洞頂的根管長長地退出一口氣。那個壓在胸口上的音鬆了，往上滑了半個音。', '〔旁白〕只滑了半個。更低的那一個，還在下面。'],
      isolated: ['珂潾：這條我夾死了。水不走這裡，底下的階梯不會退。', '珂潾：東邊那支空管。空的管子，至少是通的。']
    }
  });

  // ======================= 首領（§9.4）=======================
  E('enc.p0.boss_slowarch', {
    name: '慢拱', rank: 'boss', sequence: '苦鹹焦腥澀甜', imbalance: 50, treatImbalance: 8, misImbalance: 12,
    clampMul: 1.5, sweetFlag: 'flag.prologue.slowarch_sweet_hurt',
    sprite: { shape: 'beast', body: '#6a4a4a', dark: '#2a1618', glow: '#A64232', accent: '#98613C', plant: '#7a3a2a', vein: '#A64232', wild: 0.7, calmBody: '#6a7a6a' },
    bg: 'cave',
    approach: '慢拱就在前面。',
    intro: '慢拱不是在看妳。牠在看妳身後那條路——牠三個月沒走出去的那條路。牠不知道自己餓不餓。牠只知道沒有任何東西叫牠停。',
    moods: [{ gte: 75, text: '牠用肩胛頂著空氣，背脊那道暗紅的熱在跳。' }, { gte: 40, text: '牠低著頭，左中肢懸著，不肯落地。' }, { gte: 0, text: '牠的胸腔音慢下來了。' }],
    behaviors: [
      // 前段（已消除 0–2 符）
      { id: 'growl', type: 'load', power: 6, weight: 40, when: { clearedLt: 3 }, tell: '牠的喉嚨裡在滾。', text: '低吼。' },
      { id: 'ram', type: 'attack', power: 8, weight: 25, when: { clearedLt: 3 }, tell: '牠把頭壓低，肩胛拱起。', text: '頂撞。' },
      { id: 'scrape', type: 'surge', power: 4, weight: 20, when: { clearedLt: 3 }, tell: '牠轉向那面牆。', text: '刮牆。' },
      { id: 'heat', type: 'drain', power: { stamina: 4, load: 4 }, weight: 15, when: { clearedLt: 3 }, tell: '背脊的熱浮了上來。', text: '熱息。' },
      // 後段（已消除 3 符以上）
      { id: 'trim', type: 'settle', power: 3, weight: 30, when: { clearedGte: 3 }, tell: '牠看向一叢枯鐘管草。', text: '修剪。',
        say: ['〔旁白〕牠忽然不理珂潾了。牠走到一叢枯鐘管草前面，低頭，很仔細地把一支已經齊平的根管又啃平了一點。', '〔旁白〕然後牠抬頭，像在等誰說「好」。'] },
      { id: 'growl2', type: 'load', power: 6, weight: 30, when: { clearedGte: 3 }, tell: '牠的喉嚨裡在滾。', text: '低吼。' },
      { id: 'ram2', type: 'attack', power: 8, weight: 15, when: { clearedGte: 3 }, tell: '牠把頭壓低，肩胛拱起。', text: '頂撞。' },
      { id: 'heat2', type: 'drain', power: { stamina: 4, load: 4 }, weight: 15, when: { clearedGte: 3 }, tell: '背脊的熱浮了上來。', text: '熱息。' },
      { id: 'sniff', type: 'reveal', weight: 10, when: { clearedGte: 3 }, tell: '牠的鼻吻湊了過來。', text: '嗅掌。',
        say: ['〔旁白〕牠把鼻吻湊到珂潾的掌套前，吸了一口氣。', '〔旁白〕掌套上有池站的味道：濾幕的孢粉、蓴嬸的湯、味診台的陶。牠停了很久。'] }
    ],
    rules: [
      { id: 'return', type: 'grow', glyph: '苦', at: 'front', when: { clearedHas: '焦' }, limit: 1, text: '回返。',
        say: ['〔旁白〕牠體內有一段堵著的東西通了。三個月沒收到的訊號，一下子全湧進來——太多，太遲。', '〔旁白〕牠全身都在發苦。', '珂潾：通了反而更躁。遲到的訊號一次到齊。', '珂潾：再鎮一次。微量。不要多。'] },
      { id: 'agitate', type: 'grow', glyph: '苦', at: 'beforeSweet', when: { mis: true }, limit: 2, text: '越治越躁。' },
      { id: 'toss', type: 'swap', when: { every: 4, turnLt: 9, lenGte: 2 }, text: '甩背。', shake: true,
        say: ['〔旁白〕慢拱猛地甩了一下背。枯葉和礦塵落了一地。牠身上的味道全亂了。', '珂潾：重排了。剛才讀的不算。', '珂潾：重讀。'] }
    ],
    rewards: { exp: 80, items: {}, dims: { bo: 2 }, conn: { miststep: 3 },
      flags: { 'flag.prologue.slowarch_stabilized': true, 'folio.f007.c2': true, 'folio.f007.c3': true },
      actions: [['give', 'item.key.backgarden_sprout', 1]] },
    isolate: { exp: 30, conn: { miststep: -4 }, dims: { fen: 2 },
      flags: { 'flag.prologue.slowarch_isolated': true, 'folio.f007.c2': true, 'folio.f007.c3': true },
      actions: [['give', 'item.key.backgarden_remnant', 1]],
      text: '珂潾繞到牠右邊。第一道夾下在背園那支暗紅的主莖上——夾住，收口。病紅的那一半背園從牠身上鬆脫，落在地上，還是熱的。',
      resultText: '病源不會經由牠往外走。' },
    clampText: '珂潾繞到牠右邊，把封脈夾架上背園那支暗紅的主莖。牠察覺了，整個身體繃緊。',
    isolateConfirm: '隔離會把病紅的那一半背園夾下來，再把牠圈進支管。病源不會往外走，但妳拿不到牠的樣本，這一帶的連通度會下降。這個決定收不回來。',
    retreatWarp: { map: 'map.miststep.conduit_lower', x: 18, y: 3, dir: 'down' },
    softFail: { on: ['collapsed', 'evacuated'], imbalance: 40, heal: true, text: '慢拱撞開了珂潾。回到中島舊龕，重新來過。',
      warp: { map: 'map.miststep.conduit_lower', x: 18, y: 3, dir: 'down' },
      lines: ['〔旁白〕慢拱撞開了珂潾，自己退回牆邊，把頭抵在牆上不動。珂潾退到通道口，背貼著壁滑坐下來。', '珂潾：每次牠甩背，我之前讀的就不算了。', '珂潾：亂下藥，牠只會更躁。重讀。每一口都重讀。'] },
    stableText: '那道暗紅色的熱從牠背脊上退下去了。牠的六條腿一條一條彎下來。左邊中間那條最先落地。',
    calmText: ['〔旁白〕慢拱趴在六叢修得整整齊齊的枯草中間。胸腔裡的聲音很慢，很低，一下一下。'],
    events: {
      allRevealed: { actions: [['flag', 'folio.f007.c3']] },
      revealGlyph: { '甜': ['珂潾：……甜。', '珂潾：背園最裡面。那一叢池糖囊是飽的。', '珂潾：三個月。牠一口都沒有動它。', '珂潾：最後一味不要治。那是牠還在的部分。'] },
      sweetHurt: ['〔旁白〕藥落在那叢飽滿的池糖囊上。一顆囊裂了。', '〔旁白〕慢拱發出一聲很短的、幼獸才有的叫聲，往後縮了一步。', '珂潾：……手太快了。那不是病。'],
      stabilized: [
        '〔旁白〕牠趴在六叢修得整整齊齊的枯草中間。胸腔裡的聲音回到了拱背獸該有的音高，很慢，很低，一下一下。',
        '〔旁白〕背園最裡面，那叢池糖囊轉著它的糖。旁邊一支枯掉的鐘管草根部，有一點點青。',
        '珂潾：牠安靜了。',
        '珂潾：這不是好了。這是「現在」安靜。封口還在，牠還是收不到站那邊的訊號。',
        '珂潾：可是牠認得我的掌套。',
        '〔旁白〕珂潾很慢地走到牠右側，蹲下，用取樣刀從那支帶青的根部旁邊取了米粒大的一點。慢拱的耳膜動了一下，沒有抬頭。'
      ],
      isolated: [
        '〔旁白〕前廳北側有一段短支管。她把掌套湊近牠的鼻吻，往支管退。牠跟著走了——像以前跟著芽芽的霧罩那樣。',
        '〔旁白〕她在牠身後下了第二道夾。管口慢慢結了一道痂欄，欄上留著透氣的孔。',
        '〔旁白〕牠沒有回頭。牠在裡面找到一面牆，開始頂。',
        '珂潾：隔離完成。病源不會經由牠往外走。',
        '珂潾：……牠還在頂牆。',
        '〔旁白〕珂潾在痂欄前放下一只淺槽，倒滿池糖液。然後撿起地上一片還沒黑掉的背園葉。'
      ]
    }
  });
})(window.VELLORA);
