# Plan: Session Types Expansion

**Status:** Pending  
**Created:** 2026-05-30  
**Branch:** main  

## Overview

Expand sessions from implicit types to explicit 3-type system: `regular`, `tournament`, `league`.

Regular and tournament are mostly type-marking changes. League is the new feature: fixed teams, single match type, round-robin schedule, team standings.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Database Migration | pending | [phase-01-database-migration.md](phase-01-database-migration.md) |
| 2 | Types & Constants | pending | [phase-02-types-and-constants.md](phase-02-types-and-constants.md) |
| 3 | League Hooks & Utils | pending | [phase-03-league-hooks-and-utils.md](phase-03-league-hooks-and-utils.md) |
| 4 | Update Session Hooks | pending | [phase-04-update-session-hooks.md](phase-04-update-session-hooks.md) |
| 5 | Create Session Wizard | pending | [phase-05-create-session-wizard.md](phase-05-create-session-wizard.md) |
| 6 | League Team Management | pending | [phase-06-league-team-management.md](phase-06-league-team-management.md) |
| 7 | League Session Detail | pending | [phase-07-league-session-detail.md](phase-07-league-session-detail.md) |
| 8 | League Match Creation | pending | [phase-08-league-match-creation.md](phase-08-league-match-creation.md) |
| 9 | Testing & Validation | pending | [phase-09-testing-and-validation.md](phase-09-testing-and-validation.md) |

## Dependencies

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
                         │           │           │
                         ▼           ▼           ▼
                      Phase 6 ◄─── Phase 7 ◄─── Phase 8
                         │
                         ▼
                      Phase 9
```

## Key Decisions

- **Option A (Minimal League)** — no fixtures table, schedule computed client-side
- **Single match type per league** — decided at creation (MD/MS/WD/WS/XD)
- **Team standings derived** from match history, not stored separately
- **Backward compatible** — existing sessions get `type='regular'` or `type='tournament'`
