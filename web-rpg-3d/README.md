# 薇蘿：葉帖紀行 3D

**VELLORA — The Loose Folios · 3D 網頁 RPG**

《薇蘿：葉帖紀行》的 3D 版。內容進度與 2D 版（[`../web-rpg/`](../web-rpg/)）相同：**序章〈味變〉完整可玩**。
第三人稱、可旋轉的斜上視角，在立體的霧階池站、階梯溫泉池、活土地表、脈橋與橋腹導管洞之間探索；遭遇是 3D 的嚐味診療現場。

> 全部內容為**原創虛構**（C 層製作提案），不是對《伏尼契手稿》的翻譯、解讀或學術主張。葉帖與手稿掃描頁的配對是遊戲設計。
> 授權沿用主倉庫：**CC BY-NC-SA 4.0**。three.js 為 MIT 授權（`vendor/THREE-LICENSE.txt`）。

## 怎麼玩

純靜態網頁，執行時沒有外部相依，不需要安裝或建置。**3D 版會讀取同一個倉庫裡 `web-rpg/` 的引擎與資料，兩個目錄要放在一起。**

- **直接開**：clone 或下載整個倉庫後，用瀏覽器雙擊 `web-rpg-3d/index.html`（`file://` 可用）。
- **本機伺服器**：在倉庫根目錄執行 `python3 -m http.server 8000`，開 <http://localhost:8000/web-rpg-3d/>。
- **GitHub Pages**：倉庫開啟 Pages（`main` / root）後，網址是 `/web-rpg-3d/`。

需要支援 WebGL 的瀏覽器。無法建立 3D 畫面時會顯示說明，可改玩 2D 版。

### 操作

| 動作 | 鍵盤／滑鼠 | 觸控 |
|---|---|---|
| 移動（相對鏡頭方向） | WASD／方向鍵 | 左下類比搖桿 |
| 轉鏡頭 | Q／E，或滑鼠拖曳畫面 | 在畫面空白處拖曳 |
| 俯仰 | 滑鼠上下拖曳 | 上下拖曳 |
| 縮放 | 滾輪、R／F | 雙指開合 |
| 確認、互動、對話前進 | Z／Enter／空白 | A 鈕，或直接點對話框與選項 |
| 取消、開選單 | X／Esc | B 鈕、右上角 ≡ |

靠近可互動的對象時，它上方會出現「Z 交談 老聆」之類的提示。

### 設定

選單「設定」最上面是**畫質**：自動／高／低。

- **高**：即時陰影、最多 6 盞動態點光源、霧氣面片、完整孢子與高草、裝置像素比最高 2。
- **低**：關閉陰影與霧氣面片、2 盞點光源、孢子與高草減量、像素比 1。
- **自動**：觸控小螢幕預設低，其他預設高；高畫質下連續數秒低於 24 fps 會自動降為低並提示。
- 網址加 `?quality=low` 或 `?quality=high` 可強制指定。

存檔寫在瀏覽器的 `localStorage`（3 個手動欄位＋自動存檔），**與 2D 版共用**：兩版使用同一個存檔鍵（`vellora.vellora-ch00.*`），所以在同一個網域下，2D 版的存檔也能在 3D 版讀取（反之亦然）。`localStorage` 不可用時（隱私模式、檔案權限），標題畫面會提示存檔只保留到關閉頁面為止，遊戲照常進行。

## 與 2D 版的關係

3D 版**不複製**劇情資料與遊戲規則：資料檔、規則、狀態、存檔、對話、過場、遭遇規則、調劑、葉帖、選單都直接載入 `../web-rpg/` 的同一份檔案；3D 版只替換地圖呈現、移動與鏡頭、輸入、遭遇現場與版面。詳見 [`docs/TECH.md`](docs/TECH.md)。

與劇本、2D 版的出入與取捨見 [`docs/NOTES.md`](docs/NOTES.md)。

## 目錄

```
web-rpg-3d/
├── index.html          # 入口
├── css/game3d.css      # 3D 版版面（疊在 ../web-rpg/css/game.css 之上）
├── js/                 # 3D 呈現層（見 docs/TECH.md）
├── vendor/             # three.js r170（MIT）
├── tools/build-three/  # 重建 vendor/three.min.js 的設定
├── assets/             # 標題、章末、葉帖頁圖（自 web-rpg/assets 複製）
├── tests/              # 3D 版測試
└── docs/               # 技術文件、出入紀錄
```

## 測試

需要 Node.js 與 Playwright（僅測試用）。無頭 Chromium 以 SwiftShader 軟體繪圖執行 WebGL，畫面很慢（約 5–10 fps），所以測試預設用低畫質。

```bash
node web-rpg-3d/tests/smoke3d.js           # 冒煙＋畫面檢查：標題、開場、各地圖、遭遇、選單、手機直橫向；檢查畫布不是單色、文字可見
VELLORA_3D=1 node web-rpg/tests/playthrough.js   # 與 2D 版同一支通關測試，改開 3D 版：從新遊戲玩到章末
VELLORA_3D=1 node web-rpg/tests/routes.js        # 分歧路線：隔離、失敗重來、支線、章末抉擇、存讀檔、無本機儲存
node web-rpg-3d/tests/real-input.js        # 只用真實鍵盤輸入（不傳送、不自動完成遭遇）
```

截圖輸出到 `web-rpg-3d/tests/out/`。

## 已知限制

（見 docs/NOTES.md 的「已知限制」，完成後更新。）
