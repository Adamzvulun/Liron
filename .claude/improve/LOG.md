# Task log

The orchestrator adds one row after every task (`.claude/CLAUDE.md`, Self-improvement). `retro` reads it, rolls the oldest rows into a summary past ~150, and adds a `**— retro N —**` row after each retro; the session-start line counts the task rows since the last one.

**Result:** `first-pass` (reviewer passed first time) · `rework` (needed fixes after review or verification) · `failed` (abandoned or escalated). **Cost:** subagent tokens / tool calls, as the Agent tool reports them; `inline` when the orchestrator did it alone.

| Date | Task | Agents (model/effort) | Result | Cost | Lesson |
|------|------|-----------------------|--------|------|--------|
| 2026-11-28 | spell-90 test (`460d32a`), the graphify trial task | builder sonnet/medium, reviewer sonnet/high | first-pass | builder 21.6k/10, reviewer 16.9k/4 | The graph indexes symbols, not string literals: grep for ids like `'spell-90'`. |
| 2026-11-28 | graphify, ponytail and auto-compact setup (#549) | inline; claude-code-guide; reviewer sonnet/high | rework | reviewer 30.5k/5 | Verification found ponytail off in sessions without the plugin; sessions started with `create_session` can come up on a stale commit without repo settings, so test hooks by running them directly. |
| 2026-11-28 | **— retro 1 —** | retro opus/high | done | 106.8k/21 | Thin data (2 rows): 3 proposals. Hold ~10 rows before the next retro. |
| 2026-11-28 | Self-improvement loops (this PR): log, memory, retro, /retro, /improve, /scoreboard, guardrails | claude-code-guide; agent-architect opus/medium; scout haiku/low; retro opus/high (as general-purpose); reviewer sonnet/high ×2 | rework | guide 48.3k/6, agent-architect 29.0k/4, scout 12.7k/0, retro 106.8k/21, retro guard test 16.6k/1, reviewer 42.5k/5 + 50.1k/3 | Test a command guard with flags, newlines and `<(`, and fail closed. A new agent file loaded mid-session; an edited one (scout's memory) didn't, so test frontmatter changes in a new session. |
| 2026-11-28 | Apply retro 1's proposals #1–#3 | scout haiku/low (CLAUDE.md check); agent-architect opus/medium; reviewer sonnet/high | first-pass | scout 13.5k/0, agent-architect 31.5k/7, reviewer 33.3k/3 | Match a proposal's diff on its text, not its line numbers; merge improve PRs with a merge commit so the shas in CHANGELOG survive. |
