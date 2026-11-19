/*
 * 測試房：對話、過場、任務、葉帖。
 */
(function (V) {
  'use strict';
  var D = V.data;

  D.cutscenes = {
    'cs.demo.intro': [
      ['fade', 'out', 0],
      ['narrate', '初泉環・霧階。\n池水的味道，從這個早上開始不對了。'],
      ['fade', 'in', 600],
      ['banner', '霧階聚落'],
      ['camera', 'elder', 500],
      ['say', '老聆：珂潾，妳醒了。池子那邊的縫葉從天亮咳到現在。'],
      ['move', 'elder', 'L1', 3],
      ['face', 'elder', 'left'],
      ['camera', 'player', 400],
      ['say', '珂潾：我去看看。'],
      ['glossary', 'g.sequence'],
      ['tutorial', 'T-00']
    ]
  };

  D.dialogues = {
    // 節點式：選項分支＋商店＋開任務
    'dlg.demo.elder': {
      start: 'hub',
      nodes: {
        hub: {
          speaker: '老聆',
          text: ['老聆：要問什麼？', '〔若 quest:q.demo.moss=done〕老聆：池水好多了。謝謝妳。'],
          choices: [
            { text: '池水怎麼了？', next: 'pool' },
            { text: '我想換點東西', actions: [['shop', 'shop.elder']], next: null },
            { text: '我去處理縫葉', cond: '!quest:q.demo.moss', next: 'quest' },
            { text: '沒事', next: null }
          ]
        },
        pool: {
          text: ['老聆：鹹。像舔到銅板。', '老聆：池邊的五嘴縫葉一直在吐鹽霜。'],
          next: 'hub'
        },
        quest: {
          text: ['老聆：先去池畔採灰苔，回味診台燒成燼灰，再去看縫葉。'],
          actions: [['quest', 'q.demo.moss'], ['give', 'con.rinse', 1]],
          next: null
        }
      }
    },
    'dlg.demo.kid_quest': {
      lines: ['小汀：縫葉還在咳嗎？', '〔若 item:med.ash〕小汀：妳手上的灰聞起來好嗆！'],
      actions: [['toast', '目前任務階段可在選單「任務」查看']]
    },
    // 章末觸發：葉帖畫好才結束
    'dlg.demo.end': {
      start: 'check',
      nodes: {
        check: { branch: [{ cond: 'folio:F-004', next: 'done' }], next: 'notyet' },
        notyet: { text: ['珂潾：還不能走。池邊的事，得先畫進葉帖裡。'], next: null },
        done: { text: ['珂潾：這一頁畫好了。往下走吧。'], actions: [['ending', 'default']], next: null }
      }
    }
  };

  D.quests = {
    'q.demo.moss': {
      name: '鹹掉的池水', type: 'main',
      desc: '老聆說池水變鹹了，池邊的五嘴縫葉一直在吐鹽霜。',
      stages: [
        { id: 'ask', text: '到池畔採一份灰苔' },
        { id: 'brew', text: '回味診台把灰苔調成燼灰' },
        { id: 'heal', text: '讓池邊的五嘴縫葉穩定下來' }
      ],
      rewards: { exp: 10, items: { 'item.sugar_ticket': 1 } }
    }
  };

  D.folios = {
    'F-004': {
      name: '五嘴縫葉', cat: '池畔・草本',
      image: 'assets/folios/page-004.jpg',
      conditions: { observe: 'flag.demo.obs_pool', sample: 'item:smp.mite', diagnose: 'flag.demo.mite_stable' },
      hints: { observe: '觀察池面的白霜。', sample: '取得縫葉嘴膜。', diagnose: '讓五嘴縫葉穩定。' },
      note: '五張嘴輪流開合；鹹時吐鹽霜，甜是牠自己的糖流。',
      reward: { exp: 10, lu: 1, flags: { 'flag.demo.folio_drawn': true } }
    }
  };
})(window.VELLORA);
