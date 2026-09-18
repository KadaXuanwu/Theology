---
name: drafts-are-inspiration
description: A stub or draft body is inspiration for the sourcing run; only the frontmatter points bind. Protection covers sourced text only.
metadata:
  type: feedback
---

A node below `sourced` is the author's thinking, not text to preserve. The sourcing run treats its body as leads and its outline as one suggestion, and researches the node from the evidence up. The only thing in a stub or a draft that binds the run is the `points` list in the frontmatter, which the author owns: every point is carried with a source or reported as not carried with the reason, and no skill ever edits the list.

**Why:** the verifier's protection rule, which forbids cutting text that existed before the run, was written so a rework cannot quietly destroy verified work. Applied to a stub or a draft it did the opposite of what the user wants: rough notes became protected text the pipeline had to keep, and the finished node inherited the draft's guesses and framing. Set by the user on 2026-09-14, together with what each status promises: `stub` is hand written notes, `drafted` is the idea in the node's shape and unverified, `sourced` has passed the verifier.

**How to apply:**

- `existing.md`, the verifier's protection list, is filled only when the node was `sourced` or `sourced-stale` when the run started. Otherwise it is empty and the old body goes to the researchers and the writer as notes.
- Protection is not the author's mark and not immunity. It stops the verifier cutting earlier verified text on its own judgment; the writer may still change or drop a protected sentence under a ruling or a sourced correction, and the arbiter may remove one whose source was opened and does not carry it, each quoted in the delivery. What the author wants kept goes in `points`. Settled with the user on 2026-09-18, when the two were confused.
- Leads in a draft are where to look, not sources. Nothing enters the sourced node unless a researcher opened it.
- The gates for the three statuses live in `.agents/skills/source-node/references/templates.md`, section "Status". `draft-node` produces `drafted`, `source-node` produces `sourced`, and nothing but the author writes a stub.
- The points show on the site, folded at the foot of the note, exactly as written. What happened to a point that could not be carried reaches the user in chat only, by the user's decision. See [[one-node-at-a-time]].
