# Roblox Technical Architecture

Status: v0.1 foundation

## 1. Goals

Architecture must support:

- 1–4 player authored expeditions first;
- later public exploration spaces;
- persistent personal Codex/progression;
- temporary party and world-event state;
- large streamed environments;
- multi-place expansion without rewriting progression;
- code review and AI-agent development through source control.

## 2. Runtime boundary

```text
Client
  Controllers / UI / presentation / input
        │
        │ validated RemoteEvents/RemoteFunctions
        ▼
Server
  Services = authority and rules
        │
        ├── persistent profile abstraction
        ├── content definitions
        └── expedition/world state
```

The client may request an action; it never awards durable rewards or declares puzzle success authoritatively.

## 3. Source tree

```text
roblox/
├── default.project.json
├── rokit.toml
├── src/
│   ├── shared/
│   │   ├── Config/
│   │   ├── Types/
│   │   ├── Content/
│   │   └── Util/
│   ├── server/
│   │   ├── Services/
│   │   ├── Systems/
│   │   └── Main.server.lua
│   └── client/
│       ├── Controllers/
│       ├── UI/
│       └── Main.client.lua
└── docs/
```

## 4. Service ownership

### PlayerDataService
Owns:

- profile load/save
- schema migration
- session safety
- default profile creation
- controlled mutation API

Never let unrelated services call DataStoreService directly.

### DiscoveryService
Owns:

- first-seen observations
- evidence registration
- specimen completion
- discovery reward eligibility

Inputs are semantic events such as `ObserveSpecimen`, not arbitrary client-provided reward values.

### CodexService
Owns:

- Codex page/entry state
- folio reconstruction milestones
- hypothesis/evidence links
- unlock checks tied to documented knowledge

### DiagnosisService
Owns:

- diagnosis challenge state
- server-known evidence requirements
- validation of player diagnosis submissions
- accessibility-neutral logical representation

Presentation cues remain client-side; puzzle truth remains server-side.

### InterventionService
Owns:

- graft/treat/isolate/cut/wait choices
- consequence evaluation
- persisted major choice flags
- local expedition outcome updates

### ExpeditionService
Owns:

- party/session state
- authored chamber lifecycle
- reconnect/recovery policy
- shared expedition progression

### WorldEventService
Later-phase service for temporary events that can coordinate across servers.

## 5. Persistent profile

Initial profile contract:

```lua
{
    profileVersion = 1,
    codex = {
        specimens = {},
        folios = {},
        glyphEvidence = {},
    },
    discoveries = {
        locations = {},
        observations = {},
        artifacts = {},
    },
    skills = {
        botany = 0,
        diagnosis = 0,
        astronomy = 0,
        cartography = 0,
        glyphology = 0,
        intervention = 0,
    },
    story = {
        chapter = "chapter_01",
        flags = {},
        interventions = {},
    },
    settings = {
        sensoryAccessibility = "multichannel",
    },
}
```

Rules:

- every schema change increments `profileVersion`;
- migrations are forward-only functions and must be testable against old fixtures;
- stable IDs are stored, never localized display strings;
- transient expedition state does not enter the profile unless it becomes a durable outcome.

## 6. Data-store strategy

Use a server-side persistent-store adapter so gameplay code is not coupled directly to Roblox persistence calls.

Production intent:

- long-term player knowledge/progress → DataStoreService-backed adapter;
- frequent ephemeral cross-server coordination → MemoryStoreService-backed adapter when needed;
- local development → mock/in-memory adapter where feasible.

Do not enable Studio API access against a live production experience for normal development.

## 7. Remote contract

Prefer a small number of domain remotes over one remote per object instance.

Example namespaces:

```text
Remotes/
  Discovery/
    RequestObservation
  Diagnosis/
    SubmitDiagnosis
  Intervention/
    SubmitChoice
  Expedition/
    Ready
```

Every server handler validates:

- requesting player identity
- proximity/context when relevant
- current expedition/challenge state
- allowed action enum
- rate/frequency
- reward idempotency

Never accept from client:

- XP amount
- reward amount
- arbitrary content ID without checking that it is currently interactable
- final puzzle success boolean
- profile patches

## 8. Streaming-safe world code

Streaming is assumed on for exploration places.

Rules:

- client code cannot cache a Workspace instance forever without handling removal;
- UI/state is driven by semantic IDs, not direct permanent instance references;
- interactions should recover if the visual instance streams out/in;
- server validates interaction range/state independently;
- essential game state lives outside streamed Workspace geometry.

Tagging via CollectionService can be used for discoverable/interactable categories, but tags are not security boundaries.

## 9. Place topology

MVP starts as one place where possible to minimize publishing/test complexity.

Future topology:

```text
Experience
├── Hub / broad exploration place
├── authored expedition place(s)
├── event place(s)
└── future region place(s)
```

TeleportService is introduced only when content scale or isolation justifies it. Persistent profiles must be place-agnostic from day one.

## 10. Content data

Separate content definition from logic.

Example specimen definition:

```lua
return {
    id = "hv_010",
    regionId = "herbal_wilds",
    codexFolio = "folio_botany_01",
    evidence = {
        "leaf_form",
        "root_interface",
        "signal_copper",
        "signal_sulfur_weak",
    },
    manuscriptRefs = { "f001r" },
}
```

`manuscriptRefs` are traceability references, not claims that the fictional species is the historical identity of the drawing.

## 11. Logging and observability

All important server mutations should emit structured development logs with:

- player userId
- domain
- action
- stable content ID
- result
- correlation/expedition ID when available

Do not log sensitive free-form chat or unnecessary personal information.

## 12. Testing strategy

### Unit-level
Prioritize pure modules for:

- profile migrations
- evidence completion
- diagnosis scoring/validation
- intervention consequence rules
- unlock predicates

### Integration-level
Validate:

- duplicate observation idempotency
- reconnect during chamber
- profile save/load round trip
- client spoof attempts rejected
- streamed-out interactable recovery

### Playtest matrix

- solo desktop
- solo touch
- 2-player party
- 4-player party
- low bandwidth / streaming churn
- reconnect after server-side progress mutation

## 13. Performance budget philosophy

MVP prioritizes correctness and interaction clarity, but world/content code must not assume unlimited instances.

Use:

- streamed world geometry;
- reusable meshes/materials;
- pooled effects where repeated;
- bounded particle counts;
- server-side spatial validation that avoids per-frame full-world scans.

## 14. Security checklist

Before merging a gameplay system:

- [ ] server owns outcome
- [ ] remote input schema validated
- [ ] action context validated
- [ ] duplicate reward protected
- [ ] rate abuse considered
- [ ] profile writes pass through PlayerDataService
- [ ] no secret/config intended for server is replicated to client

## 15. Architecture decisions deferred

Do not prematurely lock these before MVP need appears:

- external state-management framework
- dependency-injection framework
- ECS
- custom networking framework
- cross-server matchmaking design
- procedural world generation

Prefer Roblox primitives + small modules until complexity proves the need.
