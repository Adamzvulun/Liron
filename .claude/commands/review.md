---
description: Reviewer agent checks everything changed since the last commit
---
Run the `reviewer` agent on everything changed since the last commit (`git diff HEAD` and untracked files; if that's empty, the last commit). Pass it the list of changed files, not their contents. Relay its verdict and findings briefly. Fix nothing until Adam says so.
