# Prompt for the next Claude session (written 2026-11-02)

Use this only once Adam has said "go" on M1. Paste it as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Work on the default branch `claude/learning-hub-arabic-morse-20ckww`.

Before you do anything, read `docs/process/STATUS.md` and `CLAUDE.md`, and follow them.

Your task: start M1 (Foundations) with E1 (#2), beginning with #12 (app scaffold), following the stack in ADR 0005. Then #13 (tests) and #14 (CI). For #15 (Vercel) and #16 (Supabase), ask me first: I need to create the free accounts.

Speech is decided (ADR 0013 + 0014): Groq `whisper-large-v3` for "did it understand you?", no per-sound scoring. Nothing in E1 needs it yet.
