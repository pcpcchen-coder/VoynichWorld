/*
 * 測試房：遭遇對象。
 *   enc.demo.mite：一般診療（鹹 甜 鹹）——嚐味、對症處置、讓甜流走、穩定。
 *   enc.demo.mote：只嚐不治（endOnReveal）——讀完味序即結束。
 */
(function (V) {
  'use strict';
  var D = V.data;

  D.encounters = {
    'enc.demo.mite': {
      name: '五嘴縫葉',
      rank: 'normal',
      zone: 'miststep',
      sequence: '鹹甜鹹',
      imbalance: 40,
      sprite: { shape: 'beast', body: '#4f7a5a', dark: '#1d2a24', glow: '#c58a52', accent: '#98613C', wild: 0.6, calmBody: '#5f9a78' },
      bg: 'pool',
      tutorial: 'T-02',
      approach: '池邊的五嘴縫葉抽著氣，五張嘴輪流開合。',
      intro: '五嘴縫葉擋在池邊。嘴邊結著一圈白色的鹽霜。',
      moods: [
        { gte: 70, text: '牠的五張嘴同時張開，鹽霜簌簌落下。' },
        { gte: 30, text: '牠繃著身子，但還聽得進水聲。' },
        { gte: 0, text: '牠的呼吸慢下來，跟上了池水。' }
      ],
      behaviors: [
        { id: 'snap', type: 'attack', power: [2, 3], weight: 3, tell: '牠的嘴縮成一條線，準備咬合。', text: '縫葉猛地一咬。' },
        { id: 'salt', type: 'load', power: [3, 4], weight: 2, tell: '鹽霜在嘴邊冒泡。', text: '鹹苦的氣味灌進鼻腔。' },
        { id: 'calm', type: 'settle', power: 4, weight: 1, when: { imbalanceLt: 50 }, tell: '牠側耳聽著水聲。', text: '牠慢慢吐了一口氣。' }
      ],
      rewards: { exp: 30, items: { 'smp.mite': 1 }, flags: { 'flag.demo.mite_stable': true }, dims: { bo: 1 }, conn: { miststep: 2 } },
      stableText: '鹽霜化開了。五嘴縫葉把嘴一張一張闔上，伏回池邊。',
      calmText: '五嘴縫葉伏在池邊，嘴膜隨著水聲輕輕起伏。',
      events: {
        start: ['珂潾：先嚐，再治。只治最前面的那一味。'],
        reveal: { 1: ['珂潾：鹹……銅鏽味。燼灰應該壓得住。'] },
        sweetPassed: ['珂潾：甜是牠自己的糖流，不用管它。'],
        stabilized: ['珂潾：好了。妳聽，水聲回來了。']
      }
    },
    'enc.demo.mote': {
      name: '孢語團',
      rank: 'normal',
      sequence: '苦焦',
      endOnReveal: true,
      noRetreat: false,
      sprite: { shape: 'mote', body: '#2b4a6b', dark: '#101826', glow: '#73D6D0', wild: 0.2 },
      bg: 'wild',
      tutorial: 'T-01',
      approach: '一團發光的孢子懸在高草上，不像生病，像在等人來讀。',
      desc: '它不是病人，是一句還沒唸出來的話。',
      readText: '兩個味都讀清楚了：苦，然後是焦。孢語團散成一片微光。',
      rewards: { exp: 10, flags: { 'flag.demo.mote_read': true } },
      calmText: '孢子散在草尖上，偶爾閃一下。',
      events: { allRevealed: ['珂潾：苦，然後焦……上游有東西卡住了。'] }
    }
  };
})(window.VELLORA);
