---
name: link-direction
description: Nothing links up the stack. Arguments link anything, claims link claims and evidence, evidence links evidence.
metadata:
  type: feedback
---

Outgoing `[[links]]` never run up the stack.

- `Arguments For` and `Arguments Against` may link `Claims`, `Evidence` and other arguments.
- `Claims` may link other `Claims` and `Evidence`, never an argument.
- `Evidence` may link other `Evidence`, nothing above it.

One extra restriction: the `Description` of an argument may not link another argument. The argument gets stated on its own terms before anything is thrown at it. Every other section on an argument may link across.

**Why:** the map is meant to be read downward, from a position to what it rests on. An upward link duplicates what the site already builds on its own, and it drags one position into a node that is supposed to sit under both. Set by the user on 2026-08-28.

**How to apply:**

- A claim's `Carries` and `Disputed By` sections stop naming arguments in brackets. The arguments that use the claim link down to it, and the site lists them under "Linked from". See [[site-build]].
- Evidence keeps to facts and links only other evidence, which is what [[evidence-nodes-are-facts]] already said.
- The vault was brought into line on 2026-08-28. 15 links were removed across 5 nodes, and the sentences around them were rewritten so the argument is no longer named at all, not just unlinked. Only one pair lost its edge, The Bible Only Speaks Truth and General Revelation Leaves People Without Excuse, which shared an untestability point and nothing else.
