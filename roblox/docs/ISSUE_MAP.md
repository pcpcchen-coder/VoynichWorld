# Implementation Issue Map

Status: v0.1

This document defines issue-sized work packets for Chapter 1. Create GitHub issues from these packets when implementation begins.

## Dependency graph

```text
RBLX-001 Tooling/Rojo skeleton
   ├── RBLX-002 Core shared IDs + content schema
   ├── RBLX-003 PlayerDataService + profile migration
   └── RBLX-004 Interaction framework

RBLX-002 + 003 + 004
   ├── RBLX-005 Discovery + Codex vertical slice
   └── RBLX-006 Herbal Wilds specimen set

RBLX-005 + 006
   ├── RBLX-007 Taste/chemical diagnosis
   └── RBLX-008 Network routing chamber

RBLX-007 + 008
   └── RBLX-009 Intervention + Chapter 1 closure

RBLX-009
   └── RBLX-010 Multiplayer/device/streaming hardening
```

---

## RBLX-001 — Bootstrap Rojo project

Goal: repository can build/sync a minimal Roblox place.

Deliverables:

- `default.project.json`
- minimal client/server/shared entrypoints
- pinned Rojo tool
- local run/build instructions

Acceptance:

- `rojo build default.project.json` succeeds;
- server and client entrypoints appear in the expected services;
- no gameplay dependencies introduced.

Risk: low.

---

## RBLX-002 — Stable content IDs and specimen schema

Goal: define machine-readable content before persistence depends on it.

Deliverables:

- typed/stable IDs or validation helpers;
- specimen definition schema;
- first 10 specimen content stubs;
- region/chapter/folio ID constants.

Acceptance:

- no persistent data uses display names;
- duplicate IDs fail validation in development;
- every specimen can declare evidence and manuscript traceability references.

Risk: medium because IDs become durable.

---

## RBLX-003 — PlayerDataService and profile v1

Goal: durable progress boundary exists before game systems write data.

Deliverables:

- default profile v1;
- persistence adapter interface;
- dev/mock adapter;
- DataStore adapter;
- migration function scaffold;
- safe load/save lifecycle.

Acceptance:

- fresh profile loads;
- save/rejoin restores known fixture data;
- duplicate/malformed mutations are rejected;
- all durable writes go through the service;
- migration test fixture exists.

Risk: high.

---

## RBLX-004 — Cross-device interaction framework

Goal: one interaction model supports desktop, touch, and controller.

Deliverables:

- interactable tagging/config;
- prompt/controller layer;
- server-side context/proximity validation;
- semantic interaction event.

Acceptance:

- same object can be triggered on keyboard/touch/controller path;
- spoofed remote from invalid range is rejected;
- streamed-out/in interactable can recover.

Risk: medium.

---

## RBLX-005 — Discovery + Codex vertical slice

Goal: first observation visibly reconstructs Codex progress and persists.

Deliverables:

- DiscoveryService;
- CodexService;
- one specimen with 3+ evidence layers;
- simple Codex UI;
- folio milestone state.

Acceptance:

- first observation updates Codex;
- duplicate observation is idempotent;
- rejoin restores result;
- client cannot directly complete a folio.

Risk: high; this proves the core progression loop.

---

## RBLX-006 — Herbal Wilds content slice

Goal: create a small explorable region that demonstrates VELLORA biology.

Deliverables:

- 10 chimeric plant definitions and placements;
- 3 location discoveries;
- one visibly failing Chlora node;
- environmental storytelling cues.

Acceptance:

- every plant follows chimeric/canon design rules;
- every specimen has at least one unique observation hook;
- first discovery reachable within 3 minutes of VELLORA arrival.

Risk: art/content heavy.

---

## RBLX-007 — Taste / chemical-signal diagnosis

Goal: implement the signature mechanic.

Deliverables:

- logical signal model;
- sensory presentation controller;
- diagnosis challenge state;
- server validation;
- accessibility-equivalent cues.

Acceptance:

- one challenge combines at least two evidence channels;
- color/audio are not sole answer carriers;
- wrong diagnosis produces useful feedback and remains recoverable;
- no client-submitted success boolean is trusted.

Risk: high; unique product identity depends on this feeling good.

---

## RBLX-008 — Chlora network chamber

Goal: prove cooperation and ecology can be the puzzle, not combat.

Deliverables:

- network graph/chamber state;
- route/isolate interactions;
- 2–4 player contribution;
- solo fallback;
- disconnect recovery.

Acceptance:

- chamber remains solvable after one player disconnects;
- solo fallback preserves reasoning;
- network state has an ecological explanation;
- success is server authoritative.

Risk: high multiplayer state complexity.

---

## RBLX-009 — Intervention choice + Chapter 1 closure

Goal: turn evidence into a consequential decision.

Deliverables:

- intervention options from approved verb set;
- at least 2 defensible outcomes;
- visible consequence;
- persisted story choice;
- Astral/Tide teaser unlock.

Acceptance:

- choice cannot be purchased/skipped;
- environment or Codex reflects outcome;
- rejoin preserves outcome;
- Chapter 1 completion flag persists.

Risk: medium.

---

## RBLX-010 — MVP hardening and playtest gate

Goal: make Chapter 1 pass the full MVP acceptance matrix.

Deliverables:

- desktop/touch/controller pass;
- solo/2-player/4-player pass;
- streaming churn test;
- reconnect test;
- exploit-path checks;
- onboarding timing observations.

Acceptance:

- all `MVP.md` acceptance checks resolved or explicitly waived with reason;
- no known progression blocker;
- no client-authoritative durable reward path;
- fresh-profile → complete → leave → rejoin journey succeeds.

Risk: release gate.

## Agent dispatch rule

Do not run RBLX-003, RBLX-005, RBLX-007, and RBLX-008 as unconstrained parallel agents because they share persistence/authority contracts. Parallelize content/art/documentation around a stable interface instead.
