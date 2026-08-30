---
name: answer-length
description: Keep chat answers short. Report what changed, not how every decision was reached.
metadata:
  type: feedback
---

Answers in chat stay short and concise. This is in `CLAUDE.md` already; it is here because it kept slipping on multi part UI and design work, where every finished change came back as a long write up with tables of measurements, contrast ratios, per file breakdowns and paragraphs of reasoning.

**Why:** The reasoning belongs in the code comments and the tests, which is where this repo already keeps it and where it will still be readable next month. Repeating it in chat is the same content twice, and it buries the one thing actually being asked for: what changed and whether it works.

**How to apply:**

- Say what changed and that it passed. A few lines. Name files as links so they can be opened.
- Numbers only when they are the answer to the question asked, or when a number is the thing that was wrong. Not as evidence that the work was done.
- No recap of options already discussed and decided, and no restating a plan that was just carried out.
- Anything worth keeping goes in a comment next to the code or in a check in `site/test.mjs`, not in the reply. See [[site-build]].
- Flag real caveats in one sentence each. Do not build a section around them.
- Never narrate the work. Problems hit, bugs found in your own code, near misses and how they were fixed are all noise. Fix it and move on. Sharpened in `CLAUDE.md` on 2026-08-30 after a run of replies that reported every issue solved along the way.
- Never list an absence. A bullet reading "nothing else", "no other issues" or "no decisions pending" is padding dressed as thoroughness. If there is nothing, the list just ends. Called out on 2026-08-30, after a three item list of what was needed from the user whose third item was "nothing else".
- A request for a suggestion is different: print the suggestion formatted to copy and paste, per `CLAUDE.md`.
