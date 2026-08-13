# Gameplay Systems — VOYNICH: The Living Manuscript

## 1. Core Loop

`Explore → Observe → Collect Evidence → Form Hypothesis → Test → Decode → Restore a Page → Unlock New World`

系統設計必須服務這個循環，而不是把遊戲拉回傳統戰鬥 grind。

## 2. Discovery System

### Discovery Types

- Plant
- Glyph
- Star
- Location
- Artifact
- Mechanism
- Folio Fragment

### Discovery State

```text
Unknown
  ↓
Seen
  ↓
Observed
  ↓
Documented
  ↓
Connected
```

同一物件可有多層 Evidence，避免「碰一下就 100% 完成」。

## 3. Voynich Lens / Scanner

玩家核心工具。

功能：
- 對焦可研究物件
- 顯示尚未取得的 Observation Slot
- 標記可疑 glyph / pattern
- 記錄位置與時間
- 將發現送入 Codex

不直接顯示答案。

## 4. Codex System

每個研究物件有自己的 Entry。

範例：

```text
SPECIMEN V-037

Observed:
✓ leaf
✓ flower
✓ root
□ fruit
□ night behavior

Associated Glyphs:
qo / daiin / ...

Evidence:
3 supporting
1 conflicting

Player Notes:
...
```

## 5. Hypothesis System

玩家可對 entity / glyph / system 建立假說。

### Example

`daiin` 可能代表：
- Plant
- Water
- Quantity
- Ritual
- Unknown

系統保存：
- hypothesis target
- hypothesis label
- evidence links
- supporting count
- conflicting count
- confidence score (只表示證據覆蓋，不代表真實正確率)

### Rule

系統不得宣告「你破解成功」。

## 6. Asymmetric Observation

為了促進合作，一部分 Observation 依條件不同而顯示：

- 玩家 profile
- day / night
- world state
- equipment state
- party role
- location angle
- prior evidence

注意：差異必須可重現，不可讓玩家覺得純 RNG 不公平。

## 7. Puzzle Families

### Glyph Alignment
旋轉 / 排列 glyph，使空間結構匹配。

### Astral Ring
多人控制 Sun / Moon / Zodiac / Stars。

### Fluid Routing
控制 valve、flow、pressure、water level。

### Botanical Morphology
依根、莖、葉、花結構拼出指定 pattern。

### Archive Pattern
依 glyph co-occurrence / spacing / position 做群組。

### Rosette Connection
重建圓盤之間的連線，作為世界級 puzzle。

## 8. Co-op Roles

不做 rigid class，但 puzzle 可暫時分配研究角色：

- Observer — 看環境提示
- Operator — 操作機械
- Recorder — 管理 Codex / sequence
- Decoder — 操作 glyph / pattern

同一玩家可自由切換。

## 9. Failure System

失敗語彙：`THE PAGE REJECTED YOU`

失敗後：
- 玩家 ink dissolve
- 回到 Anchor Glyph
- 不損失永久 Codex
- Chamber 狀態依 puzzle 類型重置或部分保留

## 10. Ink Corruption

用途：提供壓力與節奏，而非傳統戰鬥。

可造成：
- 視野 glyph 化
- 地形失真
- interaction disabled
- movement distortion
- temporary evidence noise

玩家透過 Anchor Glyph、合作操作或完成研究行為恢復穩定。

## 11. Progression

### Knowledge Tree

```text
                    Reader
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Botany      Astronomy    Glyphology
          │           │           │
       Herbalist   Stargazer   Decoder
          │           │           │
          └───────┐   │   ┌───────┘
                  ▼   ▼
              Archivist
                  │
                  ▼
            Cartographer
                  │
                  ▼
            Master Reader
```

進度來源：Discovery、Puzzle、Experiment、Hypothesis、Collaboration。

## 12. Study Room

私人長期空間。

展示：
- specimens
- stars
- fragments
- glyph boards
- screenshots / records
- rare artifacts
- trophies

玩家研究史本身就是裝飾內容。

## 13. Live Event — Lost Folio

週期性或特殊活動中出現暫時 Folio。

特徵：
- 限時入口
- 特殊 biome / puzzle / artifact
- server contribution
- 可永久留下 Lost Fragment 或研究記錄

## 14. Monetization Guardrails

### Allowed
- cosmetics
- Study Room furniture
- Codex skins
- Lantern skins
- backpacks
- visual companions
- private server / private expedition benefits

### Forbidden
- direct answer purchase
- evidence purchase
- paid puzzle solution
- paid confidence boost
- paid exclusive canonical knowledge
