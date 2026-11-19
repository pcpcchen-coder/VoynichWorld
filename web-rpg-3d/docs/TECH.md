# 3D 版技術文件（web-rpg-3d）

本文件說明《薇蘿：葉帖紀行》3D 版的結構、與 2D 版共用了什麼、場景與資料格式，以及如何把後續章節做進 3D 版。

## 1. 總體決定：3D 版是 2D 版的另一個「呈現層」

**3D 版不複製任何劇情資料或遊戲規則。** `web-rpg-3d/index.html` 直接以傳統 `<script src>` 載入：

| 來源 | 內容 | 3D 版的處理 |
|---|---|---|
| `../web-rpg/js/data/*.js` | 序章全部資料（地圖格、對話、過場、任務、物品、配方、商店、遭遇、葉帖、教學、章末） | **原封不動共用**。`main3d.js` 讀 `../web-rpg/js/data/manifest.js`，在每個路徑前加 `../web-rpg/` 後依序插入 |
| `../web-rpg/js/engine/` 的 core、rules、tiledefs、mapparse、state、save、dialogue、cutscene、battle、craft、folio、menu、screens、ui、input、audio、debug | 規則與條件／動作語法、狀態與存檔、對話與過場流程、遭遇規則、調劑、葉帖判定、選單與介面 | **共用**（同一份檔案） |
| `../web-rpg/js/engine/field.js` | 格狀地圖邏輯：碰撞、傳送、踩踏觸發、NPC 遊走、互動、遭遇觸發、onEnter | **共用邏輯**，3D 版覆寫其中的 `control`（玩家移動）、`cameraTo`、`snapCamera`、`render` |
| `../web-rpg/js/engine/gfx.js`、`sprites.js` | 2D 點陣繪圖 | 仍載入：選單裡的物品圖示與紙紋由它們產生；地圖不再用它們繪製 |
| `../web-rpg/js/engine/main.js` | 2D 主迴圈 | **不載入**，由 `js/main3d.js` 取代 |
| `../web-rpg/css/game.css` | 犢皮手稿風的介面樣式 | **共用**，再疊上 `css/game3d.css`（3D 版版面、搖桿、互動提示、遭遇版面） |

理由：

1. 劇本與資料只有一份，修一個錯字兩版同時生效，不會「各自演化」。
2. 2D 版的資料格式本來就與繪圖無關（地圖是字元格，人物外觀是顏色規格），足夠驅動 3D 場景。
3. 2D 版已有通關、分歧、過場可見性等自動測試；3D 版用**同一套測試腳本**（`VELLORA_3D=1`）跑，等於規則層的行為被同一組斷言鎖住。

### 為共用而對 2D 引擎做的修改（不改變 2D 行為）

- `field.js`：把 `F.interact` 拆出 `F.interactWith(e)` 與 `F.canInteract(e)`；公開 `F._internal`（onPlayerStep、updateActor 等）。
- `battle.js`：在既有的 `fx()`、`drop()`、嚐味時多發出事件 `battle:fx`、`battle:drop`、`battle:taste`，3D 版據此播放特效。
- `web-rpg/tests/playthrough.js`、`routes.js`：加上 `VELLORA_3D=1` 開關（改開 3D 版、走路改成「按住直到走進下一格」）。

2D 版的五支測試在修改後重新執行並全部通過（見 README）。

## 2. 目錄

```
web-rpg-3d/
├── index.html            # 入口：載入 three.js → 共用引擎 → 3D 呈現層 → 共用資料清單 → main3d.js
├── css/game3d.css        # 疊在 ../web-rpg/css/game.css 之上
├── js/
│   ├── quality.js        # 畫質（自動／高／低）、WebGLRenderer、每幀分派（標題／地圖／遭遇）
│   ├── tex3d.js          # 程式生成貼圖（活土細節、岩面、樹皮、犢皮、光點、霧、葉、「！」標記）
│   ├── models3d.js       # 人物（讀 2D 的 sprite 規格）與互動物件（種源龕、味診台、水位尺……）
│   ├── creatures3d.js    # 遭遇對象（孢團／水樣、植物形、群聚形、拱背獸）
│   ├── layouts3d.js      # 每張地圖的 3D 配置（高度、峽谷、太陽、鏡頭、蒸氣）
│   ├── world3d.js        # 由格狀地圖生成地形、水面、天空、光、霧、孢子、植被、小棚、脈橋、室內
│   ├── input3d.js        # 類比搖桿、鏡頭拖曳／旋轉／縮放
│   ├── field3d.js        # 連續移動、碰撞、互動提示、實體同步、鏡頭、過場鏡頭
│   ├── battle3d.js       # 嚐味診療的 3D 現場與特效
│   ├── screens3d.js      # 標題畫面的 3D 背景
│   └── main3d.js         # 啟動與主迴圈
├── vendor/three.min.js   # three.js r170（MIT），以 tools/build-three 打包成 IIFE
├── tools/build-three/    # 重建 vendor/three.min.js 的設定（esbuild）
├── assets/               # 標題圖、章末圖、葉帖頁圖（自 web-rpg/assets 複製，讓資料中的 assets/… 路徑在兩版都成立）
├── tests/                # 3D 版測試（見 README）
└── docs/
```

## 3. 場景生成

### 3.1 座標

格 `(x, y)` 的中心在世界座標 `(x + 0.5, 高度, y + 0.5)`；1 格＝1 單位，珂潾身高約 1.25。鏡頭方位 `yaw = 0` 時從南往北看，與 2D 版「上＝北」一致。

### 3.2 地形（`world3d.js` 的 `buildTerrain`）

- 每格細分 4×4 的高度網格，範圍向地圖外延伸 `margin` 格。
- 先算每格到最近「非實心格」（岩 `R`、洞壁 `#`、虛空 `0` 以外）的距離場；實心區依距離平滑隆起成岩崖，外圍再緩緩抬升（`cliff`、`margin`）。
- 非實心格以鄰格加權得到高度偏移：淺池 `~` −0.24、溫泉 `s` −0.18、深池 `W` −0.75，岸邊自然成斜坡。
- 頂點色依圖塊（活土、小徑、靛苔、台地、乾裂、硫氣孔、洞地、地板……）混合，再疊靛苔斑與礦物斑的低頻雜訊；細節用一張可平鋪的程式貼圖。
- `layouts3d.js` 的 `rows` 定義基準高度（階梯池三層），`lowRows` 讓層與層之間的岩格只隆起一道矮緣。

### 3.3 其他元素

| 元素 | 來源 | 做法 |
|---|---|---|
| 水面 | `~ W s` 與水上的 `=` | 依水位分組，每組一張網格；頂點記錄「水位－地形」深度，shader 依深度混色、岸邊淡出、菲涅耳反射天空、生物發光斑點 |
| 峽谷 | `chasm: true`（脈橋） | 深水格成為深谷，谷底一條河與霧層；橋面範圍內的草、花格也算橋 |
| 植被 | 物件層 `b t f Y r n P` 與地面 `"` | 灌叢、鐘管草、高草用 InstancedMesh；發光花與導管根柱登記為點光源候選 |
| 浮基小棚 | 地面 `H` 的連通區塊，`D` 是門 | 根腳托起的平台、犢皮膜牆、靛葉穹頂；門朝向 `D` 格，門邊有燈 |
| 室內 | `kind: 'indoor'`（站內棚屋） | `|` 牆用實例化方塊，靠鏡頭的那一排牆壓低（剖面視角） |
| 天空 | `outdoor` | shader：靛→橙漸層、低角度橙矮星、雲帶、遠方台地剪影 |
| 孢子 | 地圖 `particles.spores` | shader 粒子，在鏡頭焦點周圍循環 |
| 點光源 | 光源候選清單 | 每 0.4 秒挑離焦點最近的幾個（高畫質 6 個、低畫質 2 個） |

### 3.4 實體

`field.js` 的實體（npc、object、encounter）在 `mapload` 事件時各建一個 3D 物件，每幀從共用邏輯的 `px／py／dir／step／visible／done／marked` 同步：

- 人物：`models3d.character(sprite)` 直接讀 `D.actors[*].sprite` 的 hair／skin／cloth／accent／style／hood／naiad；有行走、待機（呼吸、轉頭）、朝向動畫。
- 物件：依 `kind` 建造型；`observe` 未使用時有光點與擴散的光環，`gather` 用過會變小。
- 遭遇對象：`creatures3d.build(遭遇id, sprite)`；穩定或讀完後慢慢放鬆、脈絡轉青；隔離／失穩後依共用邏輯消失。
- 頭上的「！」：`mark` 條件成立時顯示。

## 4. 移動、互動與鏡頭

- 玩家是**連續移動**（相對鏡頭方向；搖桿是類比）。碰撞以半徑 0.28 的圓對格子（`F.blocked`），沿軸夾住、可滑行；沿格線走時會把另一軸拉回格心。
- 每跨進一格就呼叫共用的 `onPlayerStep()`：傳送、踩踏觸發、硫氣孔、自動遭遇、步數與感官負荷回復都與 2D 版相同。
- 互動對象：先找面向那一格（與 2D 版相同），沒有就在 1.75 格內挑前方最近的；畫面上顯示「Z／A ＋ 動詞 ＋ 名稱」。
- 過場的 `move`、`face` 仍是格狀（共用 `updateActor`），3D 版平滑呈現；`camera` 指令改成移動鏡頭焦點。
- 鏡頭：第三人稱斜上視角，可旋轉（Q／E、滑鼠或觸控拖曳）、俯仰（上下拖曳）、縮放（滾輪、R／F、雙指）。近裁切面隨距離放大，擋在鏡頭前的樹冠與柱子會被切開。

## 5. 遭遇

規則、指令、面板文字都是共用的 `battle.js`。3D 版：

- `.battle` 面板改成透明底，`.b-stage` 變成一塊「舞台」區域；`battle3d.js` 用 `setViewOffset` 讓對象落在舞台中央（桌機在左、手機直向在上）。
- 場地依遭遇的 `bg`（pool／wild／cave／wither）換地面、霧色與周邊物件；珂潾的背影在前景。
- 外觀隨狀態變化：失衡越高扭動越大、腳下光圈由青轉橙轉紅；穩定後放鬆、脈絡回青；架夾時出現封脈夾，隔離時被黑膜包住。
- 事件特效：對症（青光）、誤治／受傷（紅光與震動）、感官灌入（紫光）、重排（對象翻轉）、防護（光膜）、藥滴從珂潾手上飛向對象、嚐味時味符的顏色從對象飄回珂潾。

## 6. 把後續章節做進 3D 版

1. **照 2D 版的流程做資料**（`web-rpg/docs/ENGINE.md`）：在 `web-rpg/js/data/` 新增檔案並列入 `manifest.js`。3D 版自動讀到，不需要另外登記。
2. 新地圖不寫 3D 配置也能玩：`layouts3d.js` 沒有該地圖時，依 `tone` 套用預設（戶外／洞穴／室內）。要有高低差、峽谷、蒸氣或特定光線，再加一筆配置。
3. 新的人物外觀直接寫在 `D.actors` 的 sprite 規格；新的遭遇對象依 `sprite.shape` 走通用造型，要專屬造型再在 `creatures3d.js` 加一個分支。
4. 新的圖塊字元要同時加到 `tiledefs.js`（2D）與 `world3d.js` 的顏色／高度表。
5. 跑 `node web-rpg/tools/validate-data.js`，再跑 2D 與 3D 兩套測試。
