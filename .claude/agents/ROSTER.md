# Agent roster

The team the orchestrator (the main Claude session) delegates to. The orchestrating rules are in [`../CLAUDE.md`](../CLAUDE.md#orchestrator). Keep this file current: `agent-architect` updates it whenever an agent changes.

**Budget first.** Adam is on a small plan. A subagent starts cold and re-reads what it needs, so delegating costs more than doing a small task inline. Delegate big, parallel or isolated work only. Preloaded skills cost about 1–2k tokens each per spawn, so agents preload few and load the rest with the Skill tool.

| Agent | Model / effort | Tools | Preloads | Use it for |
|---|---|---|---|---|
| `scout` | haiku / low | Read, Grep, Glob, Bash (`graphify` only); writes only its memory | none | Lookups: where is X, who calls Y, reading logs and docs |
| `researcher` | sonnet / medium | read-only + WebSearch, WebFetch; writes only its memory | none | Outside facts: licenses, prices, limits, learning research |
| `builder` | sonnet / medium | read + edit + Bash | `ponytail`, `typescript-pro` | Features, fixes, migrations, content data, UI |
| `tester` | sonnet / medium | read + edit + Bash | `ponytail`, `test-master` | The full local checks, e2e and axe tests, root causes of red tests |
| `reviewer` | sonnet / high | Read, Grep, Glob, Bash (read-only use); writes only its memory | `ponytail-review` | The gate before every PR: correctness, tests, security, over-engineering |
| `architect` | opus / high | read + edit + Bash | `ponytail`, `architecture-designer` | ADRs, specs, hard bugs, multi-file refactors, a phase's final review. Sparingly |
| `scribe` | sonnet / low | read + edit + Bash | `ponytail` | STATUS, HANDOFF, release notes, docs true to code |
| `cleanup` | sonnet / medium | Read, Grep, Glob, Bash (read-only use); writes only its memory | `ponytail-audit`, `ponytail-debt` | Debt and bloat report on request; changes nothing |
| `agent-architect` | opus / medium | read + edit, Bash (`graphify` only) | `ponytail` | A new or changed agent when the roster has a gap |
| `retro` | opus / high | read; writes only `.claude/improve/`; read-only Bash (hook-enforced) | none | The retrospective: `/retro`, every ~10 logged tasks, after a task that failed twice. Proposes only |

## The code graph (graphify)
- **Ask the graph first:** the orchestrator, `scout`, `architect` and `agent-architect` run `graphify query`, `path`, `explain` or `affected` before searching, then read only what it names. The rules are in [`../CLAUDE.md`](../CLAUDE.md#orchestrator).
- **`reviewer`** runs `graphify affected` on what a change touches, after `graphify update .`.
- **`builder`, `tester` and `scribe`** don't query; the orchestrator's brief names their files, callers and tests.
- **Long runners** (`architect`, `agent-architect`, `reviewer`, `builder`, `tester`) carry `autoCompactWindow: 450000`, as the main session does in `settings.json`. The short ones keep the default.

## Escalation
- A failing task goes to the same agent once more with the error. Next it moves up: `tester` to `effort: high` (say so in the prompt), then `architect`. The second failure on the same task goes to Adam.
- Ponytail runs at its default level, `full`. With the plugin loaded, its `SubagentStart` hook adds its rules to every subagent. The `skills:` preloads name the repo's copies (`.claude/skills/ponytail*`), so they work with or without the plugin.

## Deliberate choices
- **No `isolation: worktree`.** A worktree starts without `node_modules` and its branch has to be merged back. Nothing here runs two writers at once, so it costs more than it saves. Add it to `builder` if parallel builders ever become normal.
- **Merged roles:** debugging lives in `tester`, visual and game work in `builder` (it loads `frontend-design` and `game-developer` on demand), content data in `builder`, docs in `scribe`.
- **Memory** (`memory: project`, in `.claude/agent-memory/<name>/MEMORY.md`): `architect`, `builder`, `researcher`, `reviewer`, `tester`, `scout`, `cleanup`. Stable, reusable facts only, never task state, secrets or personal data: the repo is public. Memory turns on Write and Edit, so the read-only ones (`scout`, `cleanup`, `reviewer`, `researcher`) carry a hook (`.claude/hooks/write-only-under.sh`) that blocks writes outside their memory folder. `retro` has the same hook for `.claude/improve/`, plus read-only Bash.

## Self-improvement
- Every agent's report ends with a `Lessons:` line; the orchestrator logs each task in [`../improve/LOG.md`](../improve/LOG.md). `retro` turns the log into ranked proposals; `/improve <n>` applies one. The guardrails and hard limits are in [`../CLAUDE.md`](../CLAUDE.md#orchestrator) (Self-improvement).
- The team is 10 agents, the top of the 6–10 range: a new agent now means merging or removing one.
