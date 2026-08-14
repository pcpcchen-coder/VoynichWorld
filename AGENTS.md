# AGENTS.md

This file is the tool-neutral operating contract for Codex, OpenClaw, Hermes, Claude Code, and other coding agents working in VoynichWorld.

## Mission

Build VoynichWorld as one IP with multiple surfaces while preserving the repo's two-track truth model:

- research material stays evidence-based;
- VELLORA stays explicitly fictional;
- Roblox adapts VELLORA into an exploration/research game without erasing the existing canon.

## Work routing

| Task | Read first | Write primarily to |
|---|---|---|
| Manuscript fact/research | `README.md`, `guide/`, `guide-full/`, `data/` | research track |
| VELLORA lore/worldbuilding | `docs/Vellora_WorldBible_v0.1.md` | `docs/`, `ip-bible/` |
| Roblox gameplay | `CLAUDE.md`, `roblox/docs/GDD.md`, `roblox/docs/MVP.md` | `roblox/` |
| Roblox architecture/code | `CLAUDE.md`, `roblox/docs/ARCHITECTURE.md` | `roblox/src/` |
| Roblox lore/content | World Bible + `roblox/docs/LORE_GUARDRAILS.md` | `roblox/` content files |

## Agent handoff format

Every substantial agent task should leave a handoff note in its PR/issue or task response containing:

- Goal
- Scope changed
- Files changed
- Decisions made
- Acceptance checks run
- Known gaps
- Recommended next issue

## Change discipline

- One issue should produce one coherent behavioral change.
- Prefer additive, reversible changes before migrations or large refactors.
- Do not rename canon terms without updating all cross-references and documenting the reason.
- Do not modify generated assets/binaries unless the task explicitly requires it.
- Do not duplicate source-of-truth data into Roblox by copy/paste when a generated/exported representation can be created later.
- Never silently replace research uncertainty with fictional certainty.

## Review gates

A Roblox PR should be blocked if any of these are true:

- a client can directly award persistent progress;
- profile schema changed without versioning/migration notes;
- a manuscript interpretation is presented as historical fact;
- gameplay depends on an instance always being streamed in;
- mobile interaction is impossible for a core action;
- a monetized product bypasses discovery, evidence, puzzle, or ending progression;
- a new major lore concept has no mapping to the World Bible or an explicit canon-extension decision.

## Agent sizing guidance

Use small agents for bounded implementation and validation; use stronger reasoning models for canon changes, profile migrations, architecture changes, or cross-system design. Split large tasks into issue-sized packets with explicit acceptance criteria before dispatching multiple agents.
