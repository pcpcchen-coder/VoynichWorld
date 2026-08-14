# CLAUDE.md

## Repository purpose

VoynichWorld contains two deliberately separated tracks built from the Voynich Manuscript (Beinecke MS 408):

1. **Research track** — evidence-based guide and page-level source material.
2. **VELLORA fiction/IP track** — a scientifically constrained fictional world derived from the manuscript.

The Roblox game is a product surface of the VELLORA track. It must reuse canon rather than silently inventing a parallel world.

## Source-of-truth order

When instructions conflict, use this precedence:

1. User request in the current task.
2. `CLAUDE.md` / `AGENTS.md`.
3. `docs/Vellora_WorldBible_v0.1.md` for canon, factions, ecology, story, and scientific constraints.
4. `data/voynich_pages_classification.json` and research-guide material for manuscript-grounded facts.
5. `roblox/docs/` for game design and technical decisions.
6. Existing implementation.

Do not rewrite canon merely to simplify implementation. If canon and gameplay appear incompatible, document the conflict and propose an adaptation layer.

## Non-negotiable content boundaries

- Never present a fictional interpretation as a real-world decipherment of the Voynich Manuscript.
- Preserve the repo's separation between research facts and VELLORA fiction.
- VELLORA's core principle remains: **fantasy may occupy unknown space, but should not contradict well-established science without an explicit fictional mechanism.**
- Core VELLORA concepts that must remain recognizable: 綠脈 / The Chlora, 嵌合成形, 脈枯 / The Withering, 珂潾 / Korin, the pool ecology, manuscript-derived field notes, and the existing faction/end-state framework.
- Avoid converting the game into a generic combat/grind simulator. Discovery, diagnosis, evidence, field-note reconstruction, ecological intervention, and consequential choices are the primary verbs.
- Never monetize puzzle answers, evidence, canon endings, or direct power advantages.

## Roblox product boundary

All Roblox-specific work lives under `roblox/` unless a cross-project file truly needs updating.

Required documents before large implementation changes:

- `roblox/docs/GDD.md` — player experience and game loop.
- `roblox/docs/ARCHITECTURE.md` — runtime and data boundaries.
- `roblox/docs/LORE_GUARDRAILS.md` — canon mapping and forbidden drift.
- `roblox/docs/MVP.md` — current milestone and acceptance criteria.
- `roblox/docs/ISSUE_MAP.md` — implementation order and issue-sized work.

## Engineering rules

- Language: Luau.
- Source-control workflow: Rojo project under `roblox/`.
- Client never owns authoritative progression, inventory, discoveries, or rewards.
- Validate every client-to-server request on the server.
- Persistent player knowledge/progress belongs behind a server-side data service abstraction.
- Ephemeral cross-server state must not be mixed into the persistent profile.
- World streaming must be treated as a normal runtime state; client code must tolerate instances not being loaded yet.
- Do not put business/gameplay rules directly inside UI controllers.
- Prefer small services/modules with explicit ownership over singleton scripts with broad responsibilities.
- All player-profile schema changes require a `profileVersion` migration path.
- All content identifiers must be stable, lowercase, machine-readable IDs; display text is localized separately.

## Recommended Roblox code shape

```text
roblox/
  default.project.json
  src/
    shared/
      Config/
      Types/
      Util/
    server/
      Services/
      Systems/
      Main.server.lua
    client/
      Controllers/
      UI/
      Main.client.lua
  docs/
```

Server service ownership target:

- `PlayerDataService` — profile load/save/migration.
- `DiscoveryService` — observations and evidence registration.
- `CodexService` — manuscript/page reconstruction state.
- `DiagnosisService` — taste/chemical-signal puzzle evaluation.
- `InterventionService` — graft/treat/cut ecological decisions.
- `ExpeditionService` — party/session lifecycle.
- `WorldEventService` — temporary world events.

## Task execution protocol for AI agents

Before editing:

1. Read this file.
2. Read the relevant `roblox/docs/*` file(s).
3. For lore/content work, read the corresponding World Bible section.
4. Inspect the implementation files actually involved; do not sweep the whole repo without need.

During work:

- State the smallest intended change set.
- Do not mix unrelated refactors into feature work.
- If a requirement is ambiguous, choose the option that preserves canon and minimizes irreversible architecture.
- Record durable decisions in docs, not only in chat.
- Add or update acceptance criteria whenever behavior changes.

Before finishing:

- Verify Rojo project structure remains valid.
- Run available lint/type/test/build checks.
- Report files changed, user-visible behavior, known gaps, and next issue.

## Definition of done

A feature is not done when code merely exists. It is done when:

- behavior matches the current GDD/MVP acceptance criteria;
- server/client authority is correct;
- profile/data implications are handled;
- mobile and desktop interaction paths are considered;
- streaming assumptions are safe;
- canon terms and manuscript facts are not conflated;
- relevant docs are updated;
- the next agent can continue without reconstructing context from chat history.
