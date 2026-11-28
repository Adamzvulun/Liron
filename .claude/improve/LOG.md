# Task log

The orchestrator adds one row after every task (`.claude/CLAUDE.md`, Self-improvement). `retro` reads it, rolls the oldest rows into a summary past ~150, and adds a `**— retro N —**` row after each retro; the session-start line counts the task rows since the last one.

**Result:** `first-pass` (reviewer passed first time) · `rework` (needed fixes after review or verification) · `failed` (abandoned or escalated). **Cost:** subagent tokens / tool calls, as the Agent tool reports them; `inline` when the orchestrator did it alone.

| Date | Task | Agents (model/effort) | Result | Cost | Lesson |
|------|------|-----------------------|--------|------|--------|
| 2026-11-28 | spell-90 test (`460d32a`), the graphify trial task | builder sonnet/medium, reviewer sonnet/high | first-pass | builder 21.6k/10, reviewer 16.9k/4 | The graph indexes symbols, not string literals: grep for ids like `'spell-90'`. |
| 2026-11-28 | graphify, ponytail and auto-compact setup (#549) | inline; claude-code-guide; reviewer sonnet/high | rework | reviewer 30.5k/5 | Verification found ponytail off in sessions without the plugin; sessions started with `create_session` can come up on a stale commit without repo settings, so test hooks by running them directly. |
| 2026-11-28 | **— retro 1 —** | retro opus/high | done | 106.8k/21 | Thin data (2 rows): 3 proposals. Hold ~10 rows before the next retro. |
