/*
 * 測試房：地圖與角色外觀。
 *   demo.village 霧階聚落（種源龕、味診台、老聆〔選項＋商店〕、小汀〔任務〕）
 *   demo.wild    霧階池畔（採集點、觀察點、兩種遭遇、章末觸發）
 * 地圖每一列字元數必須相同；圖塊代碼見 docs/ENGINE.md。
 */
(function (V) {
  'use strict';
  var D = V.data;

  D.actors = {
    elder: { name: '老聆', sprite: { hair: '#c9c2b0', cloth: '#5a4636', accent: '#98613C', style: 'bun', skin: '#d9b48f' } },
    kid: { name: '小汀', sprite: { hair: '#3a2418', cloth: '#2B7D79', accent: '#D66A32', style: 'tall', skin: '#e2bf98' } }
  };

  D.maps['demo.village'] = {
    name: '霧階聚落', subtitle: '初泉環・霧階', zone: 'miststep', tone: 'dawn', ambience: 'village',
    ground: [
      'RRRRRRRRRRRRRRRR',
      'R;;;..........;R',
      'R.HHHH....HHH..R',
      'R.HHHH....HHH..R',
      'R.HHHH....HHH..R',
      'R....,,,,,,,,,,,',
      'R....,.......~~R',
      'R....,......~WWR',
      'R....,......~WWR',
      'R....,.........R',
      'R;;..,.......;;R',
      'RRRRRRRRRRRRRRRR'
    ],
    objects: [
      '                ',
      ' Y  f   Y     Y ',
      '                ',
      '                ',
      '                ',
      '                ',
      ' b              ',
      '                ',
      ' f              ',
      '                ',
      '   f   n n    Y ',
      '                '
    ],
    markers: [
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '      S         ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                '
    ],
    entities: [
      { type: 'npc', id: 'elder', actor: 'elder', x: 8, y: 6, dialogue: 'dlg.demo.elder',
        mark: '!quest:q.demo.moss' },
      { type: 'npc', id: 'kid', actor: 'kid', x: 3, y: 8, move: { type: 'wander', radius: 1 },
        talk: [
          { cond: 'quest:q.demo.moss=done', lines: ['小汀：縫葉不咳了！妳是味師嗎？'] },
          { cond: 'quest:q.demo.moss', dialogue: 'dlg.demo.kid_quest' }
        ],
        lines: ['小汀：老聆說池水變鹹了。妳去問問他。'] },
      { type: 'object', id: 'shrine', kind: 'shrine', x: 11, y: 9, name: '種源龕',
        text: ['〔旁白〕一座半埋在活土裡的小龕。青光沿著根脈一下一下地亮。'] },
      { type: 'object', id: 'altar', kind: 'altar', x: 6, y: 9, name: '味診台',
        actions: [['if', 'item:med.ash', [['quest', 'q.demo.moss', 'heal']]]] },
      { type: 'object', id: 'sign', kind: 'sign', x: 9, y: 4, text: ['〔旁白〕告示：往東是池畔。池水有怪味時，先找味師。'] },
      { type: 'warp', id: 'to_wild', x: 15, y: 5, to: 'demo.wild', tx: 1, ty: 5, dir: 'right' }
    ]
  };

  D.maps['demo.wild'] = {
    name: '霧階池畔', subtitle: '初泉環・霧階', zone: 'miststep', tone: 'day', ambience: 'village',
    particles: { spores: 16, mist: 3 },
    ground: [
      'RRRRRRRRRRRRRRRRRR',
      'R;;;"""....~~~~;;R',
      'R;;.......~~WW~..R',
      'R.........~WWW~..R',
      'R..,,,,,,,,~~~...R',
      ',,,,......,......R',
      'R.........,......R',
      'R..""".....,,,,,.R',
      'R.."""...........R',
      'R.......!.....>..R',
      'R;;;..........;;;R',
      'RRRRRRRRRRRRRRRRRR'
    ],
    objects: [
      '                  ',
      '        Y         ',
      '  b               ',
      '                  ',
      '                  ',
      '                  ',
      ' t             Y  ',
      '                  ',
      '                  ',
      '  f               ',
      '      r      f    ',
      '                  '
    ],
    onEnter: [{ cond: '!flag.demo.wild_seen', actions: [['flag', 'flag.demo.wild_seen'], ['lines', ['珂潾：池水的味道……從這裡就聞得到。']]] }],
    entities: [
      { type: 'warp', id: 'to_village', x: 0, y: 5, to: 'demo.village', tx: 14, ty: 5, dir: 'left' },
      { type: 'object', id: 'moss', kind: 'gather', x: 4, y: 8, name: '灰苔',
        text: ['〔旁白〕石縫裡長著一片灰色的苔。'], items: { 'smp.ash_moss': 1 },
        actions: [['quest', 'q.demo.moss', 'brew']] },
      { type: 'object', id: 'pool', kind: 'observe', x: 15, y: 4, name: '池面',
        text: ['〔旁白〕池面浮著一層細細的白霜。底下有東西在動。', '珂潾：鹽霜……縫葉在吐鹽。'],
        usedText: ['〔旁白〕白霜比剛才淡了一些。'],
        flags: ['flag.demo.obs_pool'] },
      { type: 'encounter', id: 'mite', encounter: 'enc.demo.mite', x: 14, y: 6,
        onResult: { stabilized: [['quest', 'q.demo.moss', 'done']] } },
      { type: 'encounter', id: 'mote', encounter: 'enc.demo.mote', x: 5, y: 7, size: 16 },
      { type: 'trigger', id: 'end', x: 14, y: 9, once: false, dialogue: 'dlg.demo.end' }
    ]
  };
})(window.VELLORA);
