---
description: Run the retro agent now and show its proposals
---
Run the `retro` agent (`.claude/agents/retro.md`). Pass it no file contents: it reads `.claude/improve/` and the rest itself. When it finishes, show Adam `.claude/improve/PROPOSALS.md` briefly: each proposal's number, title, class (small or needs Adam), evidence in one line and expected effect, plus the measured verdicts and the scoreboard line. Apply nothing. Commit the `.claude/improve/` changes as `improve: retro N` on the current branch.
