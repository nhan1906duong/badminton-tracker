---
title: "Firework Champion Effect"
description: "Show a firework celebration when a player views ended session results and is the champion (rank #1)."
status: completed
priority: P2
effort: 2h
branch: main
tags: [feature, frontend, ui]
created: 2026-05-25
---

# Firework Champion Effect

## Overview

When a session ends and a player views the session results (`SessionStatsPage`), they see a canvas-based firework celebration effect if they are the champion — the player ranked #1 in that session's weekly rankings.

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Create Firework Component | Completed | 1h | [phase-01](./phase-01-firework-component.md) |
| 2 | Integrate Champion Detection | Completed | 1h | [phase-02](./phase-02-integrate-champion-detection.md) |

## Dependencies

- No new npm packages (pure Canvas 2D)
- Uses existing `useProfile`, `useAuth`, `useSessionWeeklyRankings` hooks
