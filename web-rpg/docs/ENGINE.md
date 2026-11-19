# 《薇蘿：葉帖紀行》引擎資料格式（ENGINE.md）

這份文件是把劇本做成可玩資料的**唯一依據**，內容與 `js/engine/` 的程式一一對應。
活範例是測試房 `js/data-demo/`（meta、items、encounters、maps、story 五個檔），本文的範例多直接取自那裡。

- 引擎版本：`VELLORA.engineVersion = '1.0.0'`
- 條件／動作語法與圖塊表的程式來源：`js/engine/rules.js`、`js/engine/tiledefs.js`（驗證器也讀這兩份，所以三者一致）。
- 寫完資料一定要跑：`node tools/validate-data.js`（零錯誤）與 `node tests/smoke.js --official`。

---

## 0. 速覽：做一段內容的流程

1. 在 `js/data/` 新增資料檔，列入 `js/data/manifest.js` 的 `official` 陣列。
2. 每個檔都是一個立即函式，把物件掛到 `VELLORA.data` 底下的集合。
3. `node tools/validate-data.js` → 修到零錯誤。
4. 雙擊 `index.html`（正式清單不為空就載入正式資料；`?demo=1` 強制載入測試房）。

---

## 1. 清單檔與載入方式

- **純靜態**：`index.html` 用傳統 `<script src>` 依序載入引擎，再載入兩份清單，最後 `main.js` 以動態 `<script>`（`async=false`）依清單順序插入資料檔。**不用 ES modules、不 `fetch`**，所以 `file://` 雙擊可開。
- `js/data/manifest.js`：

```js
(function (root) {
  root.VELLORA = root.VELLORA || {};
  root.VELLORA.dataManifest = root.VELLORA.dataManifest || {};
  root.VELLORA.dataManifest.official = [
    'js/data/meta.js', 'js/data/items.js', 'js/data/encounters.js', 'js/data/maps-village.js', 'js/data/story.js'
  ];
})(typeof window !== 'undefined' ? window : this);
```

- 選擇規則：網址帶 `?demo=1`，或 `official` 為空 → 載入 `dataManifest.demo`（測試房）。正式資料任一檔載入失敗 → console 警告並改載入測試房。
- 路徑相對於 `index.html`。檔案順序只影響「後寫的同 id 覆蓋先寫的」；集合之間可以互相參照，不必在意先後。

### 資料檔骨架

```js
(function (V) {
  'use strict';
  var D = V.data;
  D.items['med.ash'] = { ... };          // 一筆一筆加
  D.maps['mist.village'] = { ... };
  // 或整批：D.quests = { ... }（注意：整批指定會蓋掉先前檔案放進同一集合的內容）
})(window.VELLORA);
```

**集合**（`V.COLLECTIONS`）：`maps actors dialogues cutscenes quests items recipes shops encounters folios skills glossary zones tutorials`，另有三個單值：`meta`、`start`、`levels`。
建議多檔共用同一集合時用 `D.maps['id'] = …` 逐筆加入，不要整批指定。

### 網址參數

| 參數 | 作用 |
|---|---|
| `?demo=1` | 強制載入測試房 |
| `?debug=1` | 掛上偵錯 API `window.__vellora`（見 §17） |
| `?speed=4` | 遊戲時間倍速（0.25–16），測試用 |

### id 命名慣例（建議，不強制）

`item.*`／`key.*`（重要物品）／`con.*`（消耗品）／`smp.*`（樣本）／`med.*`（處置藥）、`enc.*`、`dlg.*`、`cs.*`、`q.*`、`rcp.*`、`shop.*`、`skill.*`、`g.*`（詞彙）、葉帖 `F-004`（排序用字串排序）、教學 `T-00`、旗標 `flag.章.名稱`。

---

## 2. meta 與起始狀態

```js
D.meta = {
  id: 'vellora-ch00',            // 存檔鍵前綴：localStorage 'vellora.<id>.<slot>'；換 id＝換一套存檔
  title: '薇蘿：葉帖紀行',
  chapter: '序章〈味變〉',        // 標題畫面副標、章末畫面預設 kicker
  currency: 'item.sugar_ticket', // 以物易物的貨幣（物品 id）
  titleImage: 'assets/title.jpg',
  battleRules: { tasteHighLoad: 4 }, // 選填：覆寫遭遇預設數值（§12.6）
  endings: {                     // 章末畫面，['ending', id] 使用；省略 id＝'default'
    default: {
      kicker: '序章・完', title: '味變', image: 'assets/ending.jpg',
      text: ['段落一', '段落二'],
      note: '小字說明（畫面最下方）',
      allowContinue: true        // 顯示「繼續探索」（取消鍵也可關閉）；false＝只能回標題
    }
  }
};

D.start = {
  map: 'demo.village', at: 'S',   // 或 x: 6, y: 6（at＝地圖 markers 層的標記字元）
  dir: 'down',
  name: '珂潾',
  sprite: { hair: '#1e2440', cloth: '#D8CCB3', accent: '#2B7D79', style: 'bob' }, // 主角外觀（§6.1）
  items: { 'item.sugar_ticket': 2, 'key.gloves': 1 },
  flags: {}, skills: [], quests: [],   // quests：一開始就進行中的任務 id
  level: 1, exp: 0,                    // 選填；等級會依 exp 推回
  dims: { 'axis.sow': 0 }, conn: { miststep: 62 }, glossary: [], // 選填
  respawn: { map: 'demo.village', x: 6, y: 6 }, // 選填，預設＝起始點
  cutscene: 'cs.demo.intro'           // 新遊戲進入地圖後立刻播放的過場
};
```

新遊戲：體力＝上限、感官負荷 0；`levels` 中等級 ≤ 起始等級的 `learn` 手技會自動學會。

---

## 3. 等級與手技

### 3.1 等級表 `D.levels`

```js
D.levels = [
  { level: 1, exp: 0,   stamina: 30, load: 40 },
  { level: 2, exp: 30,  stamina: 36, load: 46, learn: 'skill.double_read' },
  { level: 3, exp: 80,  stamina: 42, load: 52, learn: 'skill.steady_palm' },
  { level: 4, exp: 150, stamina: 50, load: 58, learn: 'skill.backwash' },
  { level: 5, exp: 240, stamina: 58, load: 64, learn: 'skill.triple_read' }
];
```

- `exp`＝累計見識門檻；`stamina`＝體力上限；`load`＝感官負荷上限（**點數**）；`learn`＝升到該級學會的手技（字串或陣列）。
- 升級時：體力回滿、感官負荷歸零、提示＋說明視窗（列出學會的手技），說明視窗在回到地圖空閒時才彈出（不打斷遭遇結算）。

### 3.2 手技 `D.skills`

```js
D.skills = {
  'skill.double_read': { name: '一口兩讀', desc: '解鎖低稀釋嚐味……', unlock: 'tasteLow', passive: { tasteLow: 2 } },
  'skill.steady_palm': { name: '穩掌', desc: '防護的回合，感官負荷額外 −6。', passive: { guardLoad: 6 } },
  'skill.backwash':    { name: '回沖', desc: '每場遭遇 1 次……', unlock: 'rinse' },
  'skill.triple_read': { name: '三讀', desc: '低稀釋改為一次讀 3 個味符。', passive: { tasteLow: 3 } },
  'skill.clear':       { name: '清淤', desc: '……', unlock: 'clear' }   // 劇情用 ['learn','skill.clear'] 學會
};
```

| 欄位 | 值 | 效果 |
|---|---|---|
| `unlock` | `tasteLow` | 嚐味子選單的「低稀釋」可用 |
| | `clear` | 指令列出現「清淤」 |
| | `rinse` | 指令列出現「回沖」 |
| | `isolate` | 指令列出現「隔離／切除」 |
| `passive.tasteLow` | 數字 | 低稀釋一次讀幾個（取所有來源的**最大值**，預設 2） |
| `passive.guardLoad` | 數字 | 防護回合額外降低的負荷（所有來源**加總**） |

`unlock`／`passive` 也可以寫在**物品**上：持有該物品（數量 > 0）即生效。例：封脈夾 `{ name:'封脈夾', cat:'key', unlock:'isolate' }`——取得後指令列出現「隔離／切除」。
`unlock` 可為字串或陣列。

---

## 4. 區域：連通度與脈況

```js
D.zones = { miststep: { name: '初泉環・霧階', start: 62, vein: 'taste_shift' } };
```

- `start`：連通度起始值（0–100，省略＝50）；`vein`：起始脈況。
- 脈況階段（依先後）：`taste_shift` 味變 → `mist_recede` 霧退 → `slow_flow` 流慢 → `sealed` 封脈 → `withered` 乾化／野化。
- **劇本代號都接受**：`world.connectivity.miststep` ≡ `miststep`（條件與動作皆可），`world.veinstate.miststep` ≡ `miststep`。
- 地圖 `zone` 指定所屬區域；遭遇預設影響的區域＝遭遇 `zone` 或所在地圖的 `zone`。
- 選單「狀態」與章末畫面會顯示各區連通度與脈況。

---

## 5. 地圖

```js
D.maps['demo.village'] = {
  name: '霧階聚落', subtitle: '初泉環・霧階',   // 進入時的地名橫幅（name 改變時才顯示）
  zone: 'miststep',
  tone: 'dawn',            // 色調：none dawn day dusk cave indoor wither（可被 ['tone',...] 動作改）
  ambience: 'village',     // 環境音：village cave indoor wither none（省略時依 tone 推定）
  particles: { spores: 16, mist: 3 },  // 選填：孢子粒子與霧團數量（省略依 tone 預設）
  ground:  [ 'RRRR…', … ],  // 必填：地面層，每列一個字串，每個字元一格
  objects: [ '    …', … ],  // 選填：物件層（空白或 '.' 為空）
  overlay: [ … ],           // 選填：上層遮蔽層
  markers: [ '      S  …' ],// 選填：標記層，任何非空白字元都是標記，供 at／toAt 引用
  onEnter: [ { cond: '!flag.demo.wild_seen', cutscene: 'cs.x', actions: [ ['flag','flag.demo.wild_seen'] ] } ],
  entities: [ … ]           // §5.3
};
```

- **所有層的列數與每列字元數都必須和 `ground` 相同**（驗證器會檢查，錯誤時指出第幾列）。
- 1 格＝16×16 像素；地圖比畫面小時自動置中。
- `onEnter`：每次進入（傳送、讀檔後的傳送）依序檢查，`cond` 成立就播 `cutscene`、執行 `actions`。要「只觸發一次」請自己設旗標。

### 5.1 圖塊代碼表（`js/engine/tiledefs.js`）

**地面層 `ground`**

| 字元 | id | 名稱 | 可走 | 備註 |
|---|---|---|---|---|
| `.` | soil | 活土地面 | ✓ | |
| `,` | path | 活土小徑 | ✓ | 與相鄰地面自動交融 |
| `;` | moss | 靛苔地 | ✓ | |
| `~` | shallow | 淺池水 | ✓ | 動畫、水、走過有水聲 |
| `W` | deep | 深池水 | ✗ | 動畫、水 |
| `s` | spring | 溫泉池階 | ✓ | 動畫、水 |
| `^` | plateau | 礦物台地 | ✓ | |
| `R` | rock | 岩 | ✗ | |
| `=` | bridge | 脈橋（根橋） | ✓ | |
| `"` | tallgrass | 高草 | ✓ | |
| `x` | cracked | 乾裂活土（脈枯） | ✓ | |
| `!` | vent | 硫氣孔 | ✓ | 動畫；**每踩一步體力 −4**，歸零即撤離 |
| `_` | cavefloor | 導管洞地面 | ✓ | |
| `#` | cavewall | 導管洞壁 | ✗ | |
| `:` | floor | 屋內地板 | ✓ | |
| `\|` | wall | 屋內牆 | ✗ | |
| `H` | housewall | 屋牆／屋頂 | ✗ | 外觀；一塊 H 區域的最下一列畫成牆面，其上畫成屋頂 |
| `D` | door | 門 | ✓ | 放 warp 實體才會通往室內 |
| `>` | stairs | 階梯 | ✓ | |
| `0` | void | 虛空 | ✗ | 地圖外；列寬不足的格也視為 `0` |

**物件層 `objects`**（空白或 `.`＝無）

| 字元 | id | 名稱 | 可走 | 備註 |
|---|---|---|---|---|
| `b` | bush | 靛藍灌叢 | ✗ | |
| `t` | bellgrass | 鐘管草 | ✗ | 動畫 |
| `f` | flower | 發光花 | ✓ | 動畫、光源 |
| `Y` | tree | 管根樹 | ✗ | 樹冠自動畫在上層（會遮住上一格） |
| `r` | boulder | 礦石塊 | ✗ | |
| `n` | fence | 根籬 | ✗ | |
| `P` | pipe | 導管根柱 | ✗ | 動畫、光源 |
| `k` | shelf | 櫃架 | ✗ | 家具 |
| `c` | table | 桌 | ✗ | 家具 |
| `p` | jars | 陶罐 | ✗ | 家具 |
| `h` | hearth | 爐 | ✗ | 動畫、光源 |
| `m` | mat | 菌絲氈墊 | ✓ | 家具 |

**上層遮蔽 `overlay`**（畫在角色之上，不影響行走）

| 字元 | id | 名稱 |
|---|---|---|
| `o` | canopy | 葉蓋 |
| `a` | roots | 垂根 |

字元放錯層（例如在 `objects` 放 `R`）或未知字元都是驗證錯誤。

### 5.2 座標

- 實體座標：`x`, `y`（0 起算，左上為原點），或 `at: '字元'`（取 markers 層中該字元的**第一個**位置）。
- 傳送目標：`tx`, `ty`，或 `toAt: '字元'`（目標地圖的 markers）。

### 5.3 實體（`entities`）

所有實體共用欄位：

| 欄位 | 說明 |
|---|---|
| `type` | `npc`／`object`／`encounter`／`warp`／`trigger` |
| `id` | 同一張地圖內唯一；過場的 `move`／`face`／`camera`、`actor` 動作用它指名。省略時自動為 `type+索引` |
| `x`,`y` 或 `at` | 位置 |
| `cond` | 顯示條件（不成立＝不存在：看不到、不擋路、不能互動）。`['actor', id, 'show'|'hide']` 會覆寫它 |
| `mark` | 條件成立時頭上顯示「！」 |
| `solid` | 是否擋路（npc 預設 true；object 預設 true，但 `kind:'observe'` 預設 false） |

#### npc

```js
{ type: 'npc', id: 'kid', actor: 'kid', x: 3, y: 8,
  move: { type: 'wander', radius: 1 },
  talk: [                                    // 由上往下，第一個 cond 成立的那一項生效
    { cond: 'quest:q.demo.moss=done', lines: ['小汀：縫葉不咳了！'] },
    { cond: 'quest:q.demo.moss', dialogue: 'dlg.demo.kid_quest' }
  ],
  lines: ['小汀：老聆說池水變鹹了。'] }        // talk 全不成立時：有 dialogue 就播 dialogue，否則說這些
```

| 欄位 | 說明 |
|---|---|
| `actor` | 參照 `D.actors[id]`（取 `name` 與 `sprite`） |
| `name`／`sprite` | 直接指定（覆寫 actor） |
| `dialogue` | 對話 id（沒有 talk 項成立時使用） |
| `talk` | `[{ cond, dialogue }]` 或 `[{ cond, lines }]`；**居民 P1／P2／P3 對白就用這個**（把 P3 條件放最上面） |
| `lines` | 簡式對白（行格式 §7.1；沒寫名牌的行自動套上 NPC 名字）；talk 全不成立且沒有 dialogue 時使用 |
| `actions` | 對話結束後執行 |
| `move` | `{ type:'wander', radius:2, interval:[1.2,3], speed:2, water:false }` 或 `{ type:'path', path:'L2 R2', speed:2.2, pause:0.05 }` |
| `fixedDir` | true＝說話時不轉身 |
| `inWater` | true＝站在水裡（遊走只在水格上） |
| `dir` | 初始朝向 |

**角色 `D.actors`**：`{ elder: { name: '老聆', sprite: { hair, skin, cloth, accent, boots, glow, style, hood, naiad } } }`
`style`：`bob`／`bun`／`tall`／`hood`（`hood` 時頭巾色取 `hood`）；`naiad: true`＝潾者（半透明珍珠皮膚與藻脈）。

#### object（互動物件）

```js
{ type: 'object', id: 'moss', kind: 'gather', x: 4, y: 8, name: '灰苔',
  text: ['〔旁白〕石縫裡長著一片灰色的苔。'], items: { 'smp.ash_moss': 1 },
  actions: [['quest', 'q.demo.moss', 'brew']] }
```

| `kind` | 外觀與內建行為 |
|---|---|
| `shrine` | 種源龕：設定撤離回歸點→選單「入庫並歇息（樣本入庫、全回復、自動存檔）／記下此刻（存檔）／離開」 |
| `altar` | 味診台：開啟調劑介面（台名＝`name`） |
| `bed` | 床：詢問休息→全回復 |
| `gather` | 採集點（預設只能用一次） |
| `observe` | 觀察點（預設一次、不擋路、未用時微光、使用時鈴聲） |
| `chest` | 寶匣（預設一次） |
| `gauge` 水位尺、`filter` 孢子濾幕、`sign` 告示 | 只有外觀，行為由 text／dialogue／actions 決定 |

| 欄位 | 說明 |
|---|---|
| `text` | 使用時先播的行（§7.1）；或用 `dialogue` |
| `items` | `{物品id: 數量}`，使用時給予 |
| `flags` | 旗標名或陣列，使用時設為 true（**葉帖的「觀察」條件就用這個**） |
| `actions` | 最後執行 |
| `once` | 只能用一次（gather／observe／chest 預設 true，其餘 false）。有 items／flags 的物件用過也會記為已用 |
| `usedText` | 用過之後再互動的台詞（observe 沒有 usedText 時重播 text） |
| `useCond`＋`lockedText` | 使用條件與不成立時的台詞 |

#### encounter（可見遭遇對象）

```js
{ type: 'encounter', id: 'mite', encounter: 'enc.demo.mite', x: 14, y: 6,
  onResult: { stabilized: [['quest', 'q.demo.moss', 'done']] } }
```

| 欄位 | 說明 |
|---|---|
| `encounter` | 遭遇 id（§12） |
| `onResult` | `{ 結果: [動作…] }`，結果：`stabilized` `isolated` `collapsed` `retreated` `read`（`evacuated` 不觸發） |
| `prompt` | 靠近確認的文字（預設取遭遇 `approach`） |
| `noConfirm` | true＝不跳「靠近／先不要」 |
| `before` | 確認前先播的行 |
| `auto`＋`range` | true＝玩家走進 range 格內自動觸發（預設要走到相鄰格按確認） |
| `calm` | 結束後再互動的描述（預設取遭遇 `calmText`） |
| `hideOnDone` | 穩定／讀完後也消失（預設：穩定／讀完留在原地變健康外觀；隔離／失穩後消失） |
| `sprite`／`size` | 覆寫外觀／地圖上的尺寸（預設 20 像素） |
| `move` | 同 npc |

結果寫入：旗標 `last_result`（字串）；`stabilized/isolated/collapsed/read` 會記錄在存檔中，這個對象不再觸發遭遇。`retreated` 時對象留在原地，下次重新開始（味序與失衡重置）。

#### warp（傳送點，踩上去觸發）

```js
{ type: 'warp', id: 'to_wild', x: 15, y: 5, to: 'demo.wild', tx: 1, ty: 5, dir: 'right' }
```

`to` 目標地圖、`tx,ty` 或 `toAt` 落點、`dir` 抵達朝向、`w,h` 範圍（預設 1×1）、`sfx`（預設 `warp`）、`requires` 條件＋`lockedText`（不成立時說明並把玩家退一步）。
落點不可與目標地圖的傳送點重疊（驗證器會擋）。

#### trigger（踩踏觸發）

```js
{ type: 'trigger', id: 'end', x: 14, y: 9, once: false, dialogue: 'dlg.demo.end' }
```

依序執行 `cutscene` → `dialogue` → `lines` → `actions`。`once` 預設 true（只觸發一次）；`w,h` 範圍；`cond` 控制何時存在。

---

## 6. 外觀規格

### 6.1 人物 sprite
見 §5.3 actors。顏色皆為 `#rrggbb`。

### 6.2 遭遇對象 sprite

`{ shape, body, dark, glow, accent, plant, wild, calmBody, vein }`
- `shape`：`beast`（四足獸形）／`swarm`（群聚）／`plant`（植物）／`mote`（孢團光球）
- `wild`：0–1，越高越躁動扭曲；穩定後自動 0，主體色換成 `calmBody`、脈絡變青光。

### 6.3 物品圖示 icon

`{ shape, color, dark }`，`shape`：`vial` `crystal` `leaf` `pouch` `drop` `page` `key` `ticket` `shell` `gloves`。

---

## 7. 對話

### 7.1 行格式（對白、旁白、`lines` 動作、物件 text、遭遇 events 都通用）

每個「行」是字串或物件。字串依序比對：

| 寫法 | 顯示 |
|---|---|
| `名字：台詞` | 名牌＋台詞（名字 1–12 字，不可含空白） |
| `〔旁白〕文字` 或 `旁白：文字` 或沒有冒號的文字 | 無名牌旁白 |
| `名字〔標註〕：台詞` | 名牌附小字標註 |
| `穹母〔眾聲〕：台詞` | 眾聲名牌（文字疊影） |
| `名字（標註）：台詞` | 名牌附小字標註（括號版） |
| `漣〔訊號：鹹—停頓〕（珂潾譯：上游……）` | 訊號名牌＋波形＋「（珂潾譯）」譯文 |
| `〔若 條件〕任何上述寫法` | 條件成立才出現（條件語法 §8） |

文字中可用樣板：`{flag:名稱}` `{item:id}`（持有數）`{conn:區域}` `{dim:bo}` `{level}`。
長句會依對話框實際大小**自動分頁**（優先在標點斷開）。

物件行：

```js
{ cond: 'item:med.ash', text: '小汀：好嗆！' }          // 條件成立才播
{ cond: …, lines: ['…', '…'], speaker: '老聆' }         // 一組行；speaker＝沒名牌的行套用此名
{ tutorial: 'T-01' }                                     // 彈出教學（看過不再彈）
{ actions: [['give', 'con.rinse', 1]] }                 // 執行動作（對話框先收起）
```

### 7.2 對話資料 `D.dialogues`

三種寫法：

```js
// 1) 行陣列
'dlg.a': ['老聆：早。', '〔旁白〕風從池面吹過來。'],

// 2) 簡式物件
'dlg.demo.kid_quest': {
  cond: '…',                 // 選填：不成立整段不播
  speaker: '小汀',           // 選填
  lines: ['小汀：縫葉還在咳嗎？', '〔若 item:med.ash〕小汀：妳手上的灰聞起來好嗆！'],
  actions: [['toast', '…']]
},

// 3) 節點式（選項分支）
'dlg.demo.elder': {
  start: 'hub',
  nodes: {
    hub: {
      speaker: '老聆',
      text: ['老聆：要問什麼？'],           // 或 lines；字串或陣列
      choices: [
        { text: '池水怎麼了？', next: 'pool' },
        { text: '我想換點東西', actions: [['shop', 'shop.elder']], next: null },
        { text: '我去處理縫葉', cond: '!quest:q.demo.moss', next: 'quest' },
        { text: '沒事', next: null }
      ]
    },
    pool:  { text: ['老聆：鹹。像舔到銅板。'], next: 'hub' },
    quest: { text: ['老聆：先去採灰苔。'], actions: [['quest', 'q.demo.moss']], next: null }
  }
}
```

節點欄位：`text`／`lines`、`speaker`、`actions`（播完行後執行）、`choices`、`next`（下一節點，`null` 或省略＝結束）、`branch`。
選項欄位：`text`（必填，可用樣板）、`cond`（不成立就不列出）、`lines`（選後先播）、`actions`、`next`（**寫了才覆寫**節點的 `next`；寫 `null`＝結束）。
`branch`：`[{ cond, next }]`，不播任何東西，第一個成立的跳過去，全不成立走節點的 `next`：

```js
check: { branch: [{ cond: 'folio:F-004', next: 'done' }], next: 'notyet' }
```

**劇本 `▶ 選項` 的對應**：一個 `▶` 群組＝一個節點的 `choices`；各分支縮排內容＝`lines`／`actions` 或另一個節點。

---

## 8. 條件語法（`rules.js`）

條件可以是：字串（原子）、陣列（**全部**成立）、`{ any: [...] }`（任一）、`{ all: [...] }`、`{ not: 條件 }`、`true`／省略（永遠成立）、`false`。
原子格式：`[!]種類[:參數][運算子 值]`，運算子：`= == != >= <= > <`（以及任務專用 `@`）。

| 原子 | 意義 |
|---|---|
| `flag:名稱` | 旗標為真值 |
| `flag:名稱=值`、`flag:名稱>=3` | 比較（數字或字串；未設定視為 0） |
| `item:id`、`item:id>=3` | 持有 ≥1／比較數量 |
| `quest:id` | 已接（進行中或完成） |
| `quest:id=active`／`=done`／`=none` | 任務狀態 |
| `quest:id@階段id` | 目前**正位於**此階段（進行中） |
| `quest:id>=階段id`（`> < <=` 同理） | 已到達／超過此階段（完成＝最大） |
| `level>=N` | 等級（無參數，必須有運算子） |
| `dim:bo>=N` | 四向度；參數可寫 `bo fen rong lu`、`sow burn merge record`、`axis.sow` 等、`播焚融錄` |
| `conn:區域>=N` | 連通度；參數可寫 `world.connectivity.區域` |
| `vein:區域=slow_flow` | 脈況；`>=` 等比較先後（味變<霧退<流慢<封脈<乾化） |
| `seen:tut:T-01` | 看過某教學 |
| `folio:F-004` | 已繪製；`folio:F-004=ready`＝條件齊備可繪製 |
| `stamina>=N` | 目前體力（點數） |
| `load>=N` | 目前感官負荷（**百分比**） |
| `!任何原子` | 否定 |

**劇本記號簡寫**（含「.」的裸名稱，直接照劇本抄即可）：

| 寫法 | 等同 |
|---|---|
| `flag.prologue.drawmites_dying`、`!flag.prologue.puma_confessed` | `flag:flag.prologue.drawmites_dying`、`!flag:…` |
| `flag.x.count>=2` | `flag:flag.x.count>=2` |
| `world.connectivity.miststep>=60` | `conn:miststep>=60` |
| `world.veinstate.miststep=slow_flow` | `vein:miststep=slow_flow` |
| `axis.sow>=2` | `dim:axis.sow>=2` |

例：居民 P1／P2／P3：

```js
talk: [
  { cond: 'flag.prologue.puma_confessed', dialogue: 'dlg.res.p3' },
  { cond: 'flag.prologue.drawmites_dying', dialogue: 'dlg.res.p2' },
  { cond: true, dialogue: 'dlg.res.p1' }
]
```

---

## 9. 動作語法（`rules.js` 的 `R.ACTIONS`）

每個動作是陣列 `[名稱, 參數…]`；動作清單是動作的陣列（單一動作也可直接寫成一個陣列）。依序執行，會等待需要玩家操作的動作結束。

| 動作 | 參數 | 說明 |
|---|---|---|
| `['flag', 名稱, 值?]` | 值省略＝true | 設旗標 |
| `['unflag', 名稱]` | | 清除旗標 |
| `['addflag', 名稱, n?]` | n 省略＝1 | 數值旗標加減 |
| `['give', 物品id, n?]` | | 給物品（提示） |
| `['take', 物品id, n?]` | | 收物品（不足時收到 0 為止） |
| `['quest', 任務id]` 或 `['quest', id, 'start']` | | 開任務 |
| `['quest', id, 階段id]` | | 推進到該階段（只會往前；未接時自動開） |
| `['quest', id, 'done']` | | 完成並發放 `rewards` |
| `['encounter', 遭遇id]` | | 立即開始遭遇（不經確認），等待結束；結果寫入旗標 `last_result` |
| `['warp', 地圖id, x, y, 方向?]` | | 傳送 |
| `['cutscene', id]` | | 播放過場並等待 |
| `['dialogue', id]` | | 播放對話並等待 |
| `['lines', [行…]]` | | 就地播放幾行（§7.1） |
| `['dim', 向度, n]` | `axis.sow` 等皆可 | 四向度增減 |
| `['conn', 區域, n]` | `world.connectivity.x` 皆可 | 連通度增減（夾在 0–100） |
| `['vein', 區域, 階段]` | `world.veinstate.x` 皆可 | 設定脈況 |
| `['exp', n]` | | 給見識（可能升級） |
| `['heal', 體力?, 負荷降量?]` | 皆省略＝全回復 | 回復 |
| `['hurt', n]` | | 扣體力（歸零＝撤離） |
| `['load', n]` | 點數，可負 | 感官負荷增減 |
| `['learn', 手技id]` | | 學會手技（說明視窗） |
| `['shop', 商店id]` | | 開啟以物易物並等待 |
| `['craft', 台名?]` | | 開啟調劑介面並等待 |
| `['save']` | | 開啟存檔介面 |
| `['sfx', 音效]` | 見下 | 播音效 |
| `['toast', 文字]` | 可用樣板 | 短提示 |
| `['tone', 色調, 地圖id?]` | `none dawn day dusk cave indoor wither` | 改地圖色調（存檔保留） |
| `['respawn', 地圖id, x, y]` | | 設定撤離回歸點 |
| `['glossary', 詞彙id]` | | 收錄詞彙 |
| `['actor', 實體id, 'show'\|'hide']` | | 目前地圖的實體顯示／隱藏（存檔保留，覆寫 cond） |
| `['tutorial', 教學id, 'force'?]` | | 彈出教學（看過不再彈，除非 force） |
| `['ending', 結尾id?]` | 省略＝default | 章末畫面 |

音效 `sfx`：`confirm cancel cursor blip taste treat backfire hit heal item save folio warp door splash hiss craft level alert guard isolate quest error rumble chime step`。

**劇本 `→〔動作〕` 對應**：設旗標→`flag`；給／收物品→`give`／`take`；開／推進任務→`quest`；啟動遭遇→`encounter`；傳送→`warp`；增減四向度→`dim`；連通度→`conn`；脈況→`vein`；給見識→`exp`；`〔教學：T-xx〕`→`tutorial`（或行物件 `{tutorial:'T-xx'}`）。

---

## 10. 過場 `D.cutscenes`

過場是指令陣列（或 `{ commands: [...] }`）。**所有 §9 的動作都能直接當過場指令**，另外有以下畫面控制指令。過場期間玩家自動鎖定、不自動存檔。

| 指令 | 說明 |
|---|---|
| `['say', '名：文']` 或 `['say', 名, 文]` | 一頁對白（播完收起對話框） |
| `['move', 實體id\|'player', 'U2 L3', 速度?]` | 依路徑移動（無視碰撞；速度＝格/秒，預設 3.5）。路徑：U/D/L/R＋格數，空白分隔 |
| `['face', 實體id\|'player', 方向]` | 轉向 |
| `['camera', x, y, 毫秒?]` | 鏡頭移到格子 |
| `['camera', 實體id, 毫秒?]` | 鏡頭移到實體 |
| `['camera', 'player', 毫秒?]` | 鏡頭回到玩家（跟隨） |
| `['fade', 'out'\|'in', 毫秒?, 顏色?]` | 淡出／淡入（預設 500ms、`#0b0a0e`） |
| `['image', 路徑, 旁白?, 標題?]` | 全幅圖片；有旁白就播旁白（字串或行陣列），否則等玩家確認 |
| `['imageclose']` | 關閉圖片（過場結束也會自動關） |
| `['narrate', 文字]` | 黑底置中旁白，`\n` 換行，等確認 |
| `['wait', 毫秒]` | 等待 |
| `['shake', 毫秒?, 強度?]` | 震動＋低鳴 |
| `['banner', 文字]` | 地名橫幅 |
| `['if', 條件, [指令…], [否則…]?]` | 條件分支（也可在一般動作清單中使用） |
| `['lock']`／`['unlock']` | 一般不需要 |

範例（測試房開場）：

```js
'cs.demo.intro': [
  ['fade', 'out', 0],
  ['narrate', '初泉環・霧階。\n池水的味道，從這個早上開始不對了。'],
  ['fade', 'in', 600],
  ['banner', '霧階聚落'],
  ['camera', 'elder', 500],
  ['say', '老聆：珂潾，妳醒了。'],
  ['move', 'elder', 'L1', 3],
  ['face', 'elder', 'left'],
  ['camera', 'player', 400],
  ['glossary', 'g.sequence'],
  ['tutorial', 'T-00']
]
```

---

## 11. 任務、物品、配方、商店

### 11.1 任務 `D.quests`

```js
'q.demo.moss': {
  name: '鹹掉的池水', type: 'main',          // main 主線／side 支線
  desc: '老聆說池水變鹹了……',
  stages: [                                   // 至少一個；id 在任務內唯一
    { id: 'ask', text: '到池畔採一份灰苔' },
    { id: 'brew', text: '回味診台把灰苔調成燼灰' },
    { id: 'heal', text: '讓池邊的五嘴縫葉穩定下來' }
  ],
  rewards: { exp: 10, items: { 'item.sugar_ticket': 1 }, flags: { 'flag.x': true }, dims: { 'axis.sow': 1 }, conn: { miststep: 2 } }
}
```

選單「任務」顯示進行中與完成的任務、目前階段文字。

### 11.2 物品 `D.items`

```js
'med.ash': { name: '燼灰', cat: 'medicine', treats: '鹹', icon: { shape: 'pouch', color: '#c58a52' }, desc: '中和「鹹」的處置藥。' },
'con.rinse': { name: '味覺沖洗液', cat: 'consumable', icon: {…}, desc: '…', use: { load: -12, clearResidue: true } },
'key.clamp': { name: '封脈夾', cat: 'key', icon: { shape: 'key' }, unlock: 'isolate' }
```

| 欄位 | 說明 |
|---|---|
| `cat` | `sample` 樣本／`medicine` 處置藥／`consumable` 消耗品／`key` 重要物品（選單依此分類） |
| `treats` | 處置藥對應的味符：`鹹 苦 焦 澀 腥 甜`（序章：燼灰→鹹、縫苦→苦、靛乳→焦、池糖液→澀） |
| `use` | 消耗品效果 `{ stamina, load, clearResidue, text }`（load 為點數，負數＝降低） |
| `usable` | `'battle'`＝只能在遭遇中用；`'field'`＝只能在地圖用；省略＝都可 |
| `unlock`／`passive` | 持有時生效的能力（§3.2） |

**樣本**（`cat:'sample'`）取得後是「未入庫」狀態；在種源龕「入庫並歇息」才入庫。撤離時未入庫樣本失去一半（無條件捨去）。

### 11.3 調劑配方 `D.recipes`

```js
'rcp.ash': { name: '燼灰', inputs: { 'smp.ash_moss': 1 }, output: 'med.ash', count: 2, flags: ['flag.demo.brewed'], desc: '…' }
```

`level`（需要等級）、`cond`（可調條件）、`hidden`（條件；`true` 或條件不成立時不列出）、`flags`（調成時設為 true）。

### 11.4 以物易物 `D.shops`

```js
'shop.elder': { name: '老聆的雜物籃',
  stock: [{ item: 'con.cake', price: 1 }],      // 換入：花 price 張貨幣
  buys:  [{ item: 'smp.ash_moss', price: 1 }],  // 換出：得到 price 張貨幣
  currency: 'item.sugar_ticket' }               // 選填，預設 meta.currency
```

---

## 12. 遭遇（嚐味診療）

### 12.1 對象定義 `D.encounters`

```js
'enc.demo.mite': {
  name: '五嘴縫葉', rank: 'normal', zone: 'miststep',
  sequence: '鹹甜鹹',                 // 味序（先到在左）；或 sequences: ['鹹甜鹹','鹹鹹甜'] 隨機選一
  imbalance: 40,                     // 起始失衡（0–100，預設 50）
  sprite: { shape: 'beast', body: '#4f7a5a', … }, bg: 'pool',   // 背景：cave（預設）pool wild wither
  tutorial: 'T-02',                  // 第一次遭遇時先彈出
  approach: '池邊的五嘴縫葉抽著氣……',  // 地圖上「靠近／先不要」的提示
  intro: '……',                       // 進入時紀錄的第一行
  moods: [{ gte: 70, text: '…' }, { gte: 30, text: '…' }, { gte: 0, text: '…' }],  // 依失衡顯示的狀態描述（由高到低排）
  behaviors: [ … ],                  // 對象每回合擲一次（§12.3）
  rules: [ … ],                      // 特殊規則，每回合行動後逐條檢查（§12.3）
  rewards: { exp: 30, items: { 'smp.mite': 1 }, flags: {…}, dims: { bo: 1 }, conn: { miststep: 2 }, actions: [] },
  isolate:  { exp, flags, dims, conn, actions, text, resultText },
  collapse: { flags, dims, conn, actions, text },
  stableText: '…', readText: '…', calmText: '…',
  events: { … }                      // §12.4
}
```

| 欄位 | 說明 |
|---|---|
| `rank` | `normal`（隔離 1 回合）／`mid`、`boss`（隔離需連續 2 回合：架夾→收口） |
| `endOnReveal` | true＝**只嚐不治型**：所有味符都可靠地讀出即結束，結果 `read`；不顯示失衡條；`desc` 為描述 |
| `noIsolate`／`noRetreat`／`noEvac` | 不提供隔離／撤離；noEvac＝體力不會降到 0 以下（劇情戰） |
| `locked` | 指令陣列（`taste treat clear guard rinse item isolate retreat`）：顯示但按了只播 `events.locked` 或 `lockedText` |
| `misImbalance`／`treatImbalance` | 覆寫此對象的誤治失衡增量／對症失衡降量 |
| `isolateConfirm`、`clampText` | 隔離確認文字、架夾時的紀錄 |
| `retreatWarp` | `{ map, x, y, dir }`：撤離後傳送（首領處撤離回下層舊龕） |
| `ambience` | 遭遇環境音（預設 cave） |

**結束與獎勵**

| 結果 | 條件 | 預設效果 |
|---|---|---|
| `stabilized` 穩定 | 味序清空 | `rewards`；見識預設 20；未寫 dims 時播 +1；未寫 conn 時所在區域 +2；誤治過甜 n 次則物品少 n 件 |
| `read` 讀完 | endOnReveal 且全部讀出 | `rewards`（見識預設 0，無預設 dims／conn） |
| `isolated` 隔離 | 隔離成功 | `isolate`；無樣本；見識預設＝穩定見識的一半；未寫 dims 時焚 +1；未寫 conn 時 −3 |
| `collapsed` 失穩 | 失衡 ≥ 100 | `collapse`；無樣本；見識三成；未寫 conn 時 −1 |
| `retreated` 撤離 | 指令撤離 | 對象留在原地，下次重置 |
| `evacuated` 力竭 | 體力 0 | 回最近碰過的種源龕，體力一半，未入庫樣本失去一半 |

### 12.2 指令與規則（預設數值即序章 §4.2）

| 指令 | 出現條件 | 效果 |
|---|---|---|
| 嚐味・高稀釋 | 永遠 | 揭示最前面一個未揭示（或上次讀值不可靠）的味符；負荷 +4 |
| 嚐味・低稀釋 | `unlock:'tasteLow'` | 揭示 `passive.tasteLow` 個；負荷 +10；30% 留下味覺殘留 |
| 處置 | 有 `treats` 的藥 | 對最前面的味符用藥。對症：消除、失衡 −10。不對症：誤治（失衡 +15、該回合對象傷害 ×1.5、該味符回到未讀）。對甜：失衡 +20、穩定獎勵少 1 件 |
| 清淤 | `unlock:'clear'` | 體力 −4；最前面是腥則消除；是甜同「對甜處置」；其他＝誤治 |
| 防護 | 永遠 | 本回合體力傷害與感官灌入減半（無條件捨去）；清除殘留；`passive.guardLoad` 降負荷 |
| 回沖 | `unlock:'rinse'` | 每場 1 次，負荷 −15，清除殘留 |
| 物品 | 有可用消耗品 | 使用 `use` |
| 隔離／切除 | `unlock:'isolate'` 且非 noIsolate | 確認後執行；mid／boss 需下一回合「收口」，換指令＝鬆開 |
| 撤離 | 非 noRetreat | 結束，結果 retreated |

- **甜**：回合結束時最前面是甜、且本回合指令不是處置／清淤 → 自動流走（`events.sweetPassed`）。
- **味覺殘留**：下一次嚐味的第一個讀值顯示為殘留的味（不可靠）。
- **負荷門檻**：負荷 ≥ 上限 70% 時讀值都標為不可靠（晃動、可重讀），且有 25% 機率其中一個讀值是假的；負荷 100% 時嚐味變灰。
- **回合順序**：玩家指令 → 結算 → 對象依行為表行動 → 特殊規則 → 甜流走檢查 → 下一回合。

### 12.3 行為表 `behaviors` 與特殊規則 `rules`

兩者格式相同。`behaviors` 每回合依 `weight` 加權隨機選一個「可用的」作為**徵兆**（`tell` 顯示在畫面上，玩家下指令前就看得到），玩家行動後執行。`rules` 每回合在行動後依序檢查，可用且通過 `chance` 就執行。

共用欄位：`id`（`when.once` 與台詞只說一次的依據；省略用 type）、`type`、`weight`（預設 1）、`tell`、`text`（紀錄文字）、`say`（第一次發生時播的行，或 `{lines, actions}`）、`shake`（配合 say 震動）、`when`、`chance`（只用於 rules，0–1）。

| `type` | 參數 | 效果 |
|---|---|---|
| `attack` | `power`：數字或 `[最小,最大]`（預設 `[3,5]`） | 體力傷害 |
| `load` | `power`（預設 `[4,6]`） | 感官負荷 + |
| `drain` | `power: { stamina, load }`（預設 2／3） | 同時扣體力、加負荷 |
| `reorder` | — | 味序隨機重排，所有讀值作廢（味序 ≥2 才可用） |
| `grow` | `glyph` 或 `pool:[…]`（預設苦）、`at: 'front'|'end'|'random'`（預設 end）、`max`（預設 7）、`imbalance` | 長出一個未讀的新味符 |
| `surge` | `power`（預設 8） | 失衡 + |
| `settle` | `power`（預設 5） | 失衡 − |
| `idle` | — | 只顯示 text |

誤治回合傷害 ×1.5，防護回合減半；以上都會被「防護」與「誤治」修正（surge／settle 不受影響）。

`when`（全部列出的都要成立）：

| 鍵 | 成立條件 |
|---|---|
| `imbalanceGte: n`／`imbalanceLt: n` | 失衡 ≥ n／< n |
| `front: '腥'` 或 `['苦','焦']` | 最前面的味符是其中之一 |
| `turnGte`／`turnLt` | 回合數 |
| `every: n` | 回合數是 n 的倍數 |
| `lenGte`／`lenLt` | 味序長度 |
| `clamped: true` | 封脈夾已架上 |
| `once: true` | 這場只發生一次 |

```js
behaviors: [
  { id: 'snap', type: 'attack', power: [2, 3], weight: 3, tell: '牠的嘴縮成一條線。', text: '縫葉猛地一咬。' },
  { id: 'calm', type: 'settle', power: 4, when: { imbalanceLt: 50 }, tell: '牠側耳聽著水聲。' }
],
rules: [
  { id: 'spread', type: 'grow', pool: ['苦', '焦'], at: 'end', when: { every: 3, lenLt: 6 }, chance: 0.5, text: '病灶擴散。',
    say: ['珂潾：又長出新的味了。'] }
]
```

### 12.4 事件台詞 `events`

值是行陣列，或 `{ lines: [...], actions: [...] }`。

| 鍵 | 時機 |
|---|---|
| `start` | 進入後 |
| `turn: { 1: […], 3: […] }` | 第 n 回合開始 |
| `reveal: { 1: […], 2: […] }` | 累計揭示到第 n 個味符時 |
| `allRevealed` | 所有味符第一次全部揭示 |
| `cleared` | 每次對症消除一個味符 |
| `sweetPassed` | 甜流走 |
| `locked` | 按了 `locked` 指令 |
| `stabilized` `read` `isolated` `collapsed` `retreated` `evacuated` | 結束時（結算畫面前） |

### 12.5 只嚐不治型範例

```js
'enc.demo.mote': { name: '孢語團', sequence: '苦焦', endOnReveal: true,
  sprite: { shape: 'mote', … }, bg: 'wild', tutorial: 'T-01',
  desc: '它不是病人，是一句還沒唸出來的話。', readText: '…',
  rewards: { exp: 10, flags: { 'flag.demo.mote_read': true } },
  events: { allRevealed: ['珂潾：苦，然後焦……'] } }
```

### 12.6 `meta.battleRules` 可覆寫的預設值

`tasteHighLoad 4`、`tasteLowLoad 10`、`residueChance 0.3`、`noisyAt 70`、`falseChance 0.25`、`treatImbalance 10`、`misImbalance 15`、`misDamage 1.5`、`sweetImbalance 20`、`clearCost 4`、`rinseLoad 15`、`collapseExp 0.3`、`collapseConn -1`、`stableConn 2`、`isolateConn -3`、`stableExp 20`。

---

## 13. 葉帖 `D.folios`

```js
'F-004': {
  name: '五嘴縫葉', cat: '池畔・草本',
  image: 'assets/folios/page-004.jpg',
  conditions: { observe: 'flag.demo.obs_pool', sample: 'item:smp.mite', diagnose: 'flag.demo.mite_stable' },
  hints: { observe: '觀察池面的白霜。', sample: '取得縫葉嘴膜。', diagnose: '讓五嘴縫葉穩定。' },
  note: '五張嘴輪流開合……',
  visible: false,                      // true＝還沒達成任何條件也顯示名稱
  reward: { exp: 10, lu: 1, flags: { 'flag.demo.folio_drawn': true } }   // 預設 exp 10、錄 +1
}
```

- `conditions` 三項可省略任一；值是**旗標名**（不含 `:` 與運算子的字串）或完整條件。
- 三項齊備時提示「可以繪製」；在選單「葉帖」選取繪製（顯影動畫）。之後 `folio:F-004` 成立。
- 現有圖檔：`assets/folios/page-004|005|006|007|161|174.jpg`。

---

## 14. 教學與詞彙

```js
D.tutorials = { 'T-01': { title: '首次嚐味', pages: [
  { title: '味序', text: '……\n換行用 \\n' },
  { title: '…', html: '<p>可用 HTML</p>' } ] } };
D.glossary = { 'g.sequence': { term: '味序', text: '……' } };
```

教學以 `['tutorial','T-01']`、行物件 `{tutorial:'T-01'}` 或遭遇 `tutorial` 彈出，看過的可在選單「教學」重看。詞彙以 `['glossary', id]` 收錄，在選單「教學」頁下方列出。

---

## 15. 章末畫面

`['ending', 'default']` → 顯示 `meta.endings.default`：背景圖、kicker、標題、段落、統計（遊玩時間、等級、葉帖、穩定／隔離次數、各區連通度）、四向度長條與傾向描述、「待續」、note。確認＝回標題；`allowContinue` 時可「繼續探索」。

---

## 16. 地圖上的系統行為（不需資料，供撰寫參考）

- 遭遇外每走 5 格負荷 −1；硫氣孔每步體力 −4。
- 體力在地圖上歸零 → 撤離到 `respawn`（最近碰過的種源龕，或 `respawn` 動作設定），體力一半、負荷 0、未入庫樣本失去一半。
- 傳送時自動存檔（`auto` 欄位）；種源龕歇息也會自動存檔。手動欄位 3 個。`localStorage` 不可用時改存記憶體（可玩、關頁即失）。
- 存檔內容：旗標、物品、任務、等級、四向度、連通度、脈況、葉帖、已用物件、遭遇結果、實體顯示覆寫、色調、位置。存檔帶 `version`，載入時依 `V.save.migrations` 遷移。

---

## 17. 偵錯 API（`?debug=1`）

`window.__vellora`：

| 成員 | 說明 |
|---|---|
| `state()` | 目前遊戲狀態物件 |
| `scene()` | `boot`／`title`／`field` |
| `ui()` | 目前開啟的視窗種類堆疊（`dialogue pages choose wait menu craft battle result folio ending title settings`） |
| `busy()` | 腳本／視窗／移動中，或有待彈出的說明 |
| `player()` | `{ map, x, y, dir, moving }` |
| `entities()` | 目前地圖實體 `{ id, type, kind, x, y, visible, done }` |
| `teleport(map, x, y, dir)` | 傳送（不自動存檔；會執行 onEnter） |
| `press(name)`／`hold(name, on)` | 模擬輸入：`up down left right confirm cancel menu` |
| `setFlag(n, v)`、`give(id, n)`、`setStat(k, v)`、`face(dir)`、`speed(n)` | 改狀態 |
| `battle()` | 遭遇狀態 `{ id, turn, menu, imbalance, result, residue, truth, known, reliable, readOnly, awaiting, items }` |
| `battleExec({cmd:'taste',low:false})` | 直接下遭遇指令：`taste`（low）、`treat`（item）、`clear`、`guard`、`rinse`、`use`（item）、`isolate`（架夾後再送一次＝收口；不經確認視窗）、`unclamp`、`retreat` |
| `winEncounter()` | 自動以正確處置完成目前遭遇 |
| `skipDialogue()` | 一路按確認直到對話結束 |
| `save(slot)` | 寫入存檔欄位 |
| `snapshot()`／`loadSnapshot(obj)` | 取得目前的存檔物件；直接以存檔物件讀檔（不經 localStorage，`tests/routes.js` 從主線節點快照開始測分歧用） |
| `errors` | 頁面錯誤紀錄 |

---

## 18. 驗證與測試

```bash
node tools/validate-data.js          # 驗證正式資料（js/data/manifest.js）
node tools/validate-data.js --demo   # 驗證測試房
node tests/smoke.js                  # 瀏覽器冒煙測試（測試房，桌機＋手機觸控），截圖到 tests/out/
node tests/smoke.js --official       # 正式資料：開新遊戲、走完開場過場、確認無 console 錯誤（清單為空則略過）
node tests/playthrough.js            # 序章主線通關（VELLORA_CKPT=目錄 時在主線節點寫出存檔快照）
node tests/routes.js                 # 分歧路線：隔離路線、失敗重來、支線、章末 9 種組合、存讀檔、無 localStorage（--only=iso,fail,side,endings,save,nols；--fresh 重產快照）
node tools/estimate-playtime.js      # 遊玩時間估算（對白字數、步行格數、遭遇回合數換算；不是實測）
```

驗證器檢查：地圖各層尺寸一致與圖塊字元合法；起始點可行走；傳送點目標地圖存在、落點可行走且不疊在傳送點上；從起始點與所有傳送落點出發，每個傳送點／觸發點走得到、每個 NPC／物件／遭遇的相鄰格走得到；所有條件可解析且參照存在（含任務階段 id）；所有動作名稱、參數型別、參照（物品、任務、遭遇、地圖、過場、對話、手技、商店、教學、詞彙、區域、四向度、音效、色調、脈況、方向、結尾）正確；對話節點 next／branch 指向存在；物品分類與 treats、配方、商店、遭遇味序與行為種類、等級表手技、葉帖條件與圖檔存在。錯誤訊息格式：`檔案 集合「id」…：說明`，有錯誤時回傳 1。

冒煙測試（測試房）流程：標題 → 新遊戲 → 開場過場 → 方向鍵移動 → NPC 選項分支開任務 → 商店交換 → 採集、觀察 → 味診台調劑 → 只嚐不治遭遇 → 診療遭遇（嚐味＋對症處置到穩定）→ 繪製葉帖 → 種源龕歇息與存檔 → 重新載入讀檔比對 → 章末；再以 390×844 觸控走開場、虛擬方向鍵移動、開選單、轉橫向。任何 console 錯誤都算失敗。
**正式資料**的冒煙測試目前只走到開場結束；做完序章後建議仿照 `desktop()` 為主線加一條流程。

---

## 19. 擴充（序章〈味變〉實作時加入）

以下欄位都是選填；不寫時行為與前面各節相同。測試房不使用它們。

### 19.1 meta

| 欄位 | 說明 |
|---|---|
| `ventDamage` | 硫氣孔每步扣的體力（覆寫圖塊預設 4） |
| `autoDrawFolios` | true＝葉帖三項條件齊備時，地圖空閒就自動播放 `before` 行 → 繪製 → `after` 行（不必進選單） |
| `gatherRespawn` | true＝在種源龕「入庫並歇息」或床休息後，`kind:'gather'` 的採集點重新長出來（實體寫 `respawn:false` 可排除） |
| `bankReward` | `{ item, per }`：種源龕入庫時每件診斷樣本換 `per` 個 `item` |
| `medCap` | 每種處置藥（`cat:'medicine'`）的持有上限；調劑與交換到上限時變暗 |
| `battleRules.isolateAutoRead` | >0：隔離（收口）前若味序未讀全，自動補嚐（負荷 +此值）並觸發 `events.allRevealed` |
| `battleRules.mistreatFlag` | 每次誤治（含對甜）把這個數值旗標 +1 |
| `battleRules.noisyTutorial` | 遭遇中負荷第一次 ≥ `noisyAt` 時彈出的教學 id |
| `endings.*.text` | 每行可用 `〔若 條件〕` 開頭（條件成立才顯示）與樣板 `{conn:區域}` 等 |
| `endings.*.hideDims` | true＝章末畫面不顯示四向度數值（仍顯示傾向文字） |
| `endings.*.after` | 「待續」之後的段落（下一章預告） |

等級表每列可加 `tutorial: 'T-09'`：升到該級後（說明視窗之後）彈出教學。

### 19.2 物品

| 欄位 | 說明 |
|---|---|
| `material: true` | `cat:'sample'` 的藥材：不算「未入庫的診斷樣本」（撤離不損失、入庫不換籤） |
| `treatFlag` | 處置藥對症使用時設為 true 的旗標 |
| `use.veil` | 0–1：使用後本場遭遇受到的感官灌入再減這個比例（與防護相乘） |
| `passive.guardCut` | 防護時保留的傷害比例（預設 0.5；多個來源取最小）。例：無孔掌套 0.3 |

商店 `stock` 項目可加 `qty`（存量，換完變暗；存檔保留）與 `say`（第一次換入時的提示文字）。

### 19.3 遭遇

| 欄位 | 說明 |
|---|---|
| `softFail` | `{ on:['collapsed','evacuated'], imbalance, heal, warp:{map,x,y,dir}, lines, text, actions }`：失穩／力竭不算結束——對象留在原地（下次以 `imbalance` 開始），結果記為 `retreated`；`heal` 全回復；`warp` 傳送；`lines` 結算前播放、`text` 顯示在結算框 |
| `clampMul` | 架夾（mid／boss 第一回合）期間，對象行為效果的倍率 |
| `sweetFlag` | 本場對甜誤治時設為 true 的旗標 |
| `events.revealGlyph` | `{ '甜': 行 }`：該味符第一次被正確讀出時 |
| `events.sweetHurt` | 對甜處置或清淤時 |

行為／規則新增種類：`swap`（最前面兩個互換，所有讀值作廢）、`forget`（讀值全部作廢，味序不變）、`reveal`（免費揭示最前面的味符）。
`grow` 的 `at` 可寫 `'beforeSweet'`（插在甜的前一格；沒有甜就放最後）。
新增欄位：`limit`（這場最多發生幾次）、`actions`（每次發生都執行的動作；`say` 只在第一次）。
`when` 新增：`clearedGte`／`clearedLt`（已消除的味符數）、`has`（味序中含有某味）、`clearedHas`（某味已被消除過）、`mis: true`（本回合誤治）、`cond`（一般條件語法）。

每場結束時引擎把本場誤治次數寫入旗標 `last_mistreats`。

### 19.4 地圖與實體

- **地圖 `patches`**：`[{ cond, x, y, ground: ['列', …] }]`，條件成立時用 `ground`（空白＝不改）覆寫該矩形的地面層。載入地圖時套用；狀態改變後用 `['warp', 同一張地圖, x, y]` 重新載入即更新。驗證器只檢查未套用 patches 的基本地形，所以請把基本地形畫成「都走得到」的狀態，再用 patches 擋路。
- **遭遇實體 `dialogue`**：互動時先播這段對話（可用選項），對話裡用 `['engage', 實體id]` 開始遭遇；遭遇完成後改顯示 `calm`。
- **遭遇實體 `override`**：覆寫同一遭遇定義的任何欄位（例：同 id 的「三符型」味序與獎勵）。
- **object 新外觀 `kind`**：`hidden`（不畫，用來讓牆上或家具圖塊可互動）、`filterpatch`（補過的濾幕）、`valve`（隔膜瓣）、`membrane`（骨白乾膜／封板／硬化斷面）、`hatch`（舊排水口）。

### 19.5 動作與其他

| 動作 | 說明 |
|---|---|
| `['engage', 實體id]` | 直接開始目前地圖上某個遭遇實體的診療（不經確認）；結果記錄、`onResult` 與一般遭遇相同 |
| `['heal', '50%', 0]` | 體力參數可寫百分比字串（上限的比例） |
| `['image', 路徑, 行陣列]` | 旁白參數可為行陣列（原本即支援，驗證器已放寬） |
| `['menu', 分頁id]` | 開啟主選單到指定分頁（例：記脈棚繪圖桌 `['menu','folios']`），等選單關閉再繼續 |

**支線關閉（`meta.sideQuestClose: { flag, label }`）**：該旗標成立的那一刻，所有尚未完成的支線（含沒接的）狀態改為 `missed`，不再推進或完成；條件 `quest:id=missed` 可判斷。任務日誌另列一節，標題與右側標記用 `label`（序章：「沒來得及」）。`quest:id`（不帶運算子）對 `missed` 也成立，所以「沒接才出現」的接取選項會一起消失。

**目前目標（`meta.objectives: [{cond, text}]`）**：由上而下取第一個條件成立的項目，顯示在 HUD 體力列下方一行，並附在任務日誌主線卡片的「目前目標」。只寫地點與方向，不寫劇情。`V.game.objective()` 取得目前文字。

**章末畫面**：面板比畫面高時可以捲動（觸控拖曳、鍵盤上下）；按確認時若還沒捲到底，先往下捲一頁，到底才回標題。按鈕列固定在面板底部。

**`V.screens.loadSlot(slot)`**：`slot` 也可以是存檔物件。

葉帖新增欄位：`labels`（`{observe, sample, diagnose}` 的顯示名稱，例：觀察點一／二／三）、`nameAlt: [{cond, name}]`（依條件換名稱）、`note` 可為行陣列（行首 `〔若 條件〕`、可用樣板，換行顯示）、`before`／`after`（自動繪製前後播放的行）。

工具：`python3 tools/gen-prologue-maps.py` 重新產生序章地形 `js/data/maps-tiles.js`；`node tools/print-map.js <地圖id>` 印出含實體位置的 ASCII 預覽。通關測試：`node tests/playthrough.js`。
