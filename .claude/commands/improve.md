---
description: Apply proposal n from the last retro, within the guardrails
argument-hint: <proposal number>
---
Apply proposal #$ARGUMENTS from `.claude/improve/PROPOSALS.md`, following the Self-improvement block in `.claude/CLAUDE.md`:

1. Find the proposal. If it doesn't exist, or has already been applied (CHANGELOG.md), say so and stop.
2. Check it against the hard limits. If it crosses one, refuse and say which.
3. Judge its class yourself against the list in `.claude/CLAUDE.md`; don't trust the label retro gave it. **Small** goes ahead. Anything else goes ahead only if Adam typed `/improve` for it himself in this conversation (that is his OK); under `/away`, skip it and list it under Waiting for Adam.
4. Have `agent-architect` apply exactly the proposal's diff, nothing more.
5. `reviewer` checks it, including the hard limits. Run the tests the change could affect.
6. Commit it alone: `improve: <what> (proposal #N)`. Add a row to the CHANGELOG.md table: date, proposal, change, commit sha, the metric expected to move, verdict "pending".
7. Tell Adam in one line what changed and how to undo it (`git revert <sha>`).
