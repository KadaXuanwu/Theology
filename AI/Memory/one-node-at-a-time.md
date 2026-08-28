---
name: one-node-at-a-time
description: Only edit the node you were told to edit. A change to any other node needs approval first.
metadata:
  type: feedback
---

Work touches one node at a time. Only the node the user named gets written. If the work needs a change somewhere else, print that change in chat as a block the user can paste and wait for approval.

**Why:** the vault is research grade. An edit nobody asked for can move a sourced sentence, break a chain of reasoning or quietly change what a node claims, and it is hard to catch later because it sits inside a commit about something else. Set by the user on 2026-08-28.

**How to apply:**

- Suggest, never apply, when the fix lands outside the target node. This covers backlinks, links a new node breaks, and errors the research turned up elsewhere.
- The same holds for a rule change that touches the whole vault. Report the list first, edit after approval. See [[link-direction]] for the case that started this.
- The node pipeline in `.claude/skills/theology-node` carries this as a non negotiable, so it writes one file and reports the rest.
