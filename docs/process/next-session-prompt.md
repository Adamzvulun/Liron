# Prompt for the next Claude session (written 2026-11-02)

Use this only once Adam has said "go" on M1. Paste it as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Work on the default branch `claude/learning-hub-arabic-morse-20ckww`.

Before you do anything, read `docs/process/STATUS.md` and `CLAUDE.md`, and follow them.

Your task: continue M1 (Foundations). #12 and #13 are done, and #14 (CI) waits on my answers in STATUS. Next comes #15 (Vercel); ask me first, because I need to create the free accounts for Vercel and Supabase (#16).

Speech is decided (ADR 0013 + 0014): Groq `whisper-large-v3` for "did it understand you?", no per-sound scoring. Nothing in E1 needs it yet.
