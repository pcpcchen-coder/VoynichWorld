# Technical Architecture — Roblox

## 1. Goal

建立可用 Rojo / Roblox Studio 長期維護的模組化架構，支援大型世界、多人探索、跨 session 研究進度與未來多 Place 擴充。

## 2. Proposed Project Structure

```text
roblox-game/
├── README.md
├── AGENTS.md
├── docs/
└── src/
    ├── shared/
    │   ├── Types/
    │   ├── Config/
    │   └── Constants/
    ├── server/
    │   ├── Services/
    │   └── Main.server.lua
    └── client/
        ├── Controllers/
        └── Main.client.lua
```

Roblox Studio logical mapping:

```text
Workspace/
└── World/
    ├── RosetteHub/
    ├── HerbalWilds/
    ├── AstralRealm/
    ├── GreenBaths/
    ├── Apothecary/
    └── Portals/

ReplicatedStorage/
├── Shared/
├── Remotes/
└── Assets/

ServerScriptService/
└── Services/

StarterPlayer/
└── StarterPlayerScripts/
    └── Controllers/

StarterGui/
├── CodexUI/
├── ScannerUI/
├── HypothesisUI/
└── DiscoveryUI/

ServerStorage/
├── Specimens/
├── PuzzleTemplates/
└── WorldEvents/
```

## 3. Core Services

### PlayerDataService
- profile load/save
- schema migration
- session locking strategy

### DiscoveryService
- discovery registration
- observation state
- evidence linking

### CodexService
- Codex entries
- specimen metadata
- page restoration state

### HypothesisService
- user hypothesis CRUD
- evidence support/conflict links
- confidence calculation

### PuzzleService
- puzzle lifecycle
- party synchronization
- chamber reset / checkpoint

### ExpeditionService
- party creation
- research instance assignment
- teleport payload

### WorldEventService
- Lost Folio scheduling
- global / server state
- temporary portals

## 4. Client Controllers

- InteractionController
- ScannerController
- CodexController
- PuzzleController
- StudyRoomController
- DiscoveryFXController

Client 只負責輸入、UI、視覺預測；權威研究結果與永久資料由 server 驗證。

## 5. Player Data Schema

```lua
PlayerProfile = {
    version = 1,

    discoveries = {
        plants = {},
        glyphs = {},
        stars = {},
        locations = {},
        artifacts = {},
    },

    codex = {
        pages = {},
        specimens = {},
    },

    hypotheses = {},

    skills = {
        botany = 0,
        astronomy = 0,
        glyphology = 0,
        alchemy = 0,
        cartography = 0,
    },

    unlockedRegions = {
        rosetteHub = true,
        herbalWilds = true,
    },

    studyRoom = {
        decorations = {},
        trophies = {},
    },
}
```

## 6. Persistence Strategy

### DataStore
永久資料：
- profile
- Codex
- progression
- unlocks
- Study Room
- hypotheses

### MemoryStore
短期高頻資料：
- party matchmaking
- expedition reservation
- Lost Folio transient state
- cross-server queue / ephemeral coordination

不要把永久研究成果只存在 MemoryStore。

## 7. World Loading

Overworld 使用 StreamingEnabled。

建議：
- Rosette Hub + adjacent regions 在同一主 Place
- 大型 dungeon / special chamber 拆成額外 Place
- 由 TeleportService 以 party 為單位進入

## 8. Networking Rules

RemoteEvent / RemoteFunction 只傳遞「玩家意圖」，server 驗證：

- discovery 是否在合理距離
- puzzle interaction 是否合法
- specimen 是否存在
- reward 是否可授予
- hypothesis evidence 是否已取得

禁止 client 直接宣告：
- discovery complete
- reward amount
- skill XP
- region unlock

## 9. Content IDs

所有研究實體使用穩定 ID：

```text
plant.herbal.001
plant.herbal.002
glyph.vms.qo
location.rosette.center
puzzle.herbal.root_gate_01
artifact.folio.fragment_001
```

不要把 UI 顯示名稱當 persistence key。

## 10. Localization

首發語言：
- en
- zh-tw

Voynich glyph / transcription 原文不可送進一般翻譯替換流程。

## 11. Security / Exploit Resistance

最低要求：
- server authoritative rewards
- remote rate limits
- distance validation
- puzzle state ownership
- immutable content IDs
- schema versioning
- telemetry for impossible progression

## 12. Future Repo Additions

實作階段新增：

```text
roblox-game/
├── default.project.json
├── aftman.toml
├── selene.toml
├── stylua.toml
├── src/
├── tests/
└── scripts/
```

工具版本與套件選型在開始 coding 前再固定，避免規劃文件綁死可能過期的版本。
