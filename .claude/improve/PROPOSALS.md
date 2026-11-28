# Proposals: retro 1, 2026-11-28

**Data is thin.** LOG.md has 2 rows. The other evidence is git (#531 to #549) and HANDOFF items 203 to 206, which predate the log and carry no token counts. So there are 3 proposals, not 5. Nothing had been applied by the loop, so nothing was measured.

## #1 Say that the graph has no string literals, and merge scout's two Grep lines

**Class:** small (clarify a prompt).

**Problem and evidence:**
- LOG.md, row 1 (`460d32a`): "The graph indexes symbols, not string literals: grep for ids like `'spell-90'`." HANDOFF 206 says the same: `'spell-90'` "still needed a grep".
- `scout.md:18` and `architect.md:16` say "Grep only for exact text in files the graph already named". For an event id, key or test name the graph names no file, so that rule sends the agent around in circles.
- `scout.md:20` ("Then Grep and Glob for exact text…") repeats line 18 and contradicts its "only".

**Change:**

```diff
--- a/.claude/agents/scout.md
+++ b/.claude/agents/scout.md
@@ -18,3 +18,2 @@
-- **Ask the code graph first** (`.claude/CLAUDE.md`, The code graph): `graphify query "<question>"`, `graphify affected "<X>"`, `graphify path "<A>" "<B>"` or `graphify explain "<X>"`, then read only the files and lines it names. Grep only for exact text in files the graph already named. If files changed since the last graph update, run `graphify update .` first.
+- **Ask the code graph first** (`.claude/CLAUDE.md`, The code graph): `graphify query "<question>"`, `graphify affected "<X>"`, `graphify path "<A>" "<B>"` or `graphify explain "<X>"`, then read only the excerpts it names, never whole large files. The graph holds symbols, not string literals: Grep ids, keys and test names (`'spell-90'`) directly; otherwise Grep only for exact text in files the graph named. If files changed since the last graph update, run `graphify update .` first.
 - Use Bash only for `graphify` commands; never for anything that changes files.
-- Then Grep and Glob for exact text; read only the excerpts you need, never whole large files.
--- a/.claude/agents/architect.md
+++ b/.claude/agents/architect.md
@@ -16 +16 @@
-- **Ask the code graph first** (`.claude/CLAUDE.md`, The code graph): `graphify query "<question>"`, `graphify affected "<X>"`, `graphify path "<A>" "<B>"` or `graphify explain "<X>"`, then read only the files and lines it names. Grep only for exact text in files the graph already named. If files changed since the last graph update, run `graphify update .` first.
+- **Ask the code graph first** (`.claude/CLAUDE.md`, The code graph): `graphify query "<question>"`, `graphify affected "<X>"`, `graphify path "<A>" "<B>"` or `graphify explain "<X>"`, then read only the files and lines it names. The graph holds symbols, not string literals: Grep ids, keys and test names directly; otherwise Grep only for exact text in files the graph named. If files changed since the last graph update, run `graphify update .` first.
```

**Expected effect:** fewer wasted graph queries on literal lookups. Net prompt lines -1.

**Measure:** the scout and architect tool calls per lookup (LOG Cost column), and prompt lines.

## #2 State the memory rule once, in CLAUDE.md, instead of in seven agents

**Class:** needs-Adam (it changes `.claude/CLAUDE.md`, the orchestrator rules).

**Problem and evidence:**
- The same 1-line memory rule, word for word, is in 7 agents: `architect.md:21`, `builder.md:28`, `cleanup.md:24`, `researcher.md:16`, `reviewer.md:23`, `scout.md:23`, `tester.md:24`. ROSTER.md (Deliberate choices, Memory) says it an eighth time.
- Subagents load `.claude/CLAUDE.md`: this retro run received it as project instructions. So one copy reaches every agent.
- CLAUDE.md "Keep it lean": "Each retro looks for text to merge or delete." This is the largest exact duplicate in the prompts.
- `.claude/agent-memory/` doesn't exist yet: no agent has written memory, so nothing depends on the agents' own wording.

**Change:** delete that line from the 7 agent files (each the same hunk), and extend the existing CLAUDE.md sentence:

```diff
--- a/.claude/agents/builder.md
+++ b/.claude/agents/builder.md
@@ -28 +27,0 @@
-- **Memory:** save only stable, reusable facts (project quirks, where things live, recurring failures and their fixes, commands that work). Never task-specific state, secrets, guesses or personal data (the repo is public). Correct or delete a note as soon as it's proven wrong.
```

(The same deletion in `architect.md:21`, `cleanup.md:24`, `researcher.md:16`, `reviewer.md:23`, `scout.md:23` and `tester.md:24`.)

```diff
--- a/.claude/CLAUDE.md
+++ b/.claude/CLAUDE.md
@@ -87 +87 @@
-- **Log every task:** after each one, add one row to `improve/LOG.md`: date, task, agents (model/effort), result (`first-pass`, `rework` or `failed`), the tokens and tool calls each agent call reported, and the lesson (from the agents' `Lessons:` lines). Memory agents keep stable facts in `.claude/agent-memory/<name>/`.
+- **Log every task:** after each one, add one row to `improve/LOG.md`: date, task, agents (model/effort), result (`first-pass`, `rework` or `failed`), the tokens and tool calls each agent call reported, and the lesson (from the agents' `Lessons:` lines). Memory agents keep only stable, reusable facts in `.claude/agent-memory/<name>/` (quirks, where things live, recurring failures and their fixes, commands that work), never task state, secrets, guesses or personal data (the repo is public), and fix or delete a note once it's proven wrong.
```

**Expected effect:** net prompt lines -7, with the same rule in force. No safety rule is removed: the privacy part moves to the file every agent loads.

**Measure:** prompt lines (the scoreboard). At the next retro, read `.claude/agent-memory/*/MEMORY.md` for task state or personal data. If any shows up, revert.

## #3 Stop rerunning intermittent tests: name them, and make a second sighting a root-cause task

**Class:** small (add a project fact, clarify a prompt).

**Problem and evidence:**
- `tester.md:20`: "Never call a red result a flake."
- HANDOFF 203 did exactly that twice during the /away run. It said `arabic-words.spec.ts:201` ("sentence-long choices stack on a phone…") was "flaky once… Watch it" (#538). It called the load-budget @timing test "noise" after a 3-of-3 rerun (#544). Neither got a task, and "Watch it" is in no agent's prompt or memory, so the next run starts blind.

**Change:**

```diff
--- a/.claude/agents/tester.md
+++ b/.claude/agents/tester.md
@@ -20 +20,2 @@
 - Never call a red result a flake. Reproduce it, find the cause, and fix the cause (with `--trace on` only for the failing test).
+- Known intermittent, cause not found yet: `arabic-words.spec.ts:201` (phone choices stack, #538) and the load-budget `@timing` test (#544). If one fails again, report it as a root-cause task for the orchestrator, not a pass on rerun.
```

**Expected effect:** the next failure of either test becomes a fix instead of a rerun. It raises the bar, so it stays inside the hard limits.

**Measure:** first-time review pass rate and rework, and whether a LOG row names either test. Once one is fixed, delete its name from the line.
