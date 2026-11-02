# Prompt for the next Claude session (written 2026-11-02)

Use this only once Adam has said "go" on M1. Paste it as the first message of a new session:

---

We're continuing work on Waymark, my personal learning hub for Arabic and Morse (repo: Liron). Branch from `dev` (ADR 0015); PRs go into `dev`.

Before you do anything, read `docs/process/STATUS.md` and `CLAUDE.md`, and follow them.

Your task: continue M1 (Foundations) with #15 (Vercel: production = `main`, a stable dev URL for `dev`). I have free Vercel and Supabase accounts; walk me through the dashboard steps you can't do yourself.

Speech is decided (ADR 0013 + 0014): Groq `whisper-large-v3` for "did it understand you?", no per-sound scoring. Nothing in E1 needs it yet.
