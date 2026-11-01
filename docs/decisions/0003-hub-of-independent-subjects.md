# 0003 — The hub is a lobby of independent subjects

- **Status:** Accepted
- **Date:** 2026-11-01


> **Amended by [0011](0011-simplification-pass.md)** (simplification pass). Where they conflict, 0011 wins.

## Context
Adam's vision: the site is a lobby/hub with no connection between themes. It should expand later with more things he wants to learn. Progression and tracking should feel like Duolingo, and the look should be cute and game-like.

## Decision
Two layers:

**1. Platform (shared, subject-agnostic)**
- Lobby world, avatar, profile, XP/level, currency/rewards, streaks, daily goal.
- A spaced-repetition engine (FSRS) as a *service* any subject may use.
- Progress storage, and later social features (friends, leaderboards, challenges).

**2. Subjects (self-contained modules)**
- Each subject brings its own content, lesson types, mini-games, and its "place" in the lobby.
- It reports progress to the platform through a small contract, e.g. `awardXP`, `recordReview`, `progressSummary`.

**No feature may depend on two subjects at once.**

## Consequences
- Adding a subject is just adding a new module.
- Cross-subject ideas from brainstorm 01 (Arabic Morse, Koch-for-Arabic) are dropped as *product* features. They can return as ordinary in-subject mechanics.
- The module contract must be designed carefully in M1.
