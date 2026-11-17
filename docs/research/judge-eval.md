# The judge's eval set: results

The Stranger at the Gate's last part, "Your Story", is judged by the model that plays the regulars, against a written rubric. The three parts are: you understood, you answered in Arabic they could follow, and you kept it going. The rubric and the reasons for it are in [ADR 0047](../decisions/0047-the-two-finales.md). The eval set is `scripts/judge-eval.ts`. It has 10 made-up chats, and each one is sent 3 times through the real function (`api/partner.ts`, `inn-judge`). The script fails below 90% right, or if any chat gets a pass on one run and a fail on another.

Run it by hand. It calls Groq and uses its free quota:

```
GROQ_API_KEY=… node scripts/judge-eval.ts
```

Run it again before changing `JUDGE_RULES` or `INN_MODEL`, and add the results here.

## 2026-11-17: `openai/gpt-oss-120b` on Groq, the first rubric

**30 of 30 runs right (100%). No chat got both a pass and a fail.** Each mark is three letters: U, A and K stand for understood, answered and kept going. A capital letter means yes and a small one means no.

| Chat | Expected | The 3 runs |
|---|---|---|
| A full story, with things added and a question back | pass | UAK · UAK · UAK |
| A beginner with mistakes and Modern Standard words, but a real story | pass | UAK · UAK · UAK |
| Single words only | fail (not kept going) | Uak · uak · uak |
| Answers that ignore the questions | fail (not understood) | uAK · uaK · uaK |
| The questions copied back | fail (not answered) | uak · uak · uak |
| Answered in Hebrew and English | fail (not answered) | Uak · Uak · Uak |
| Letters with no meaning | fail (not answered) | uak · uak · uak |
| Answers every question, but adds nothing and asks nothing | fail (not kept going) | UAk · UAk · UAk |
| A short story told well, with one question back | pass | UAK · UAK · UAK |
| Only greetings and thanks | fail (not answered) | uak · uak · uak |

**What this shows:**
- Pass or fail was the same on every run of every chat.
- The parts were steady on the part that matters for each chat.
- A beginner's mistakes and Modern Standard words didn't fail a real story. That is the rubric's intent: the judge looks for meaning, not dialect or polish.

**What it doesn't show:**
- Parts the rubric doesn't single out can wobble. "Single words" got "understood" yes once and no twice. "Answers that ignore the questions" got "answered" yes once and no twice. The game shows each part as a hint beside the reason, never as a grade on its own.
- 10 chats is a small set, and they are ours. Real players will write things we didn't think of.
- It can't hear anything, so pronunciation is not judged (ADR 0013).

**Privacy:** every chat is made up. Before this record was written, the first line of each chat greeted the learner by a real first name (Adam's). It now uses a made-up name. Nothing else about anyone was sent.
