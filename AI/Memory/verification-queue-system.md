---
name: verification-queue-system
description: Since 2026-11-01 the pipeline, not the user, works the Verification queue; every entry gets a full attempt, partial closures are recorded, and what is left shows in _Gaps.md.
metadata:
  type: project
---

On 2026-11-01 the user said they will not review the queue's entries (94 open at the time) one by one. They want the AI to try to close every entry, even if only partly, and the list of what stays partial or open kept where people can see the possible gaps.

What was built: the `clear-queue` skill (finder, cold checker, arbiter), the route list `.agents/skills/source-node/references/access-routes.md`, the statuses `partial` and `pending`, the entry fields Kind, Needs and Tried, and `site/queue.mjs`, which writes `Verification/_Gaps.md` (`npm run queue`) and lints the entries inside `npm run check`. `source-node` and `refresh-node` now end by running `clear-queue` on the node's own file.

**The user's decisions:**

- A pipeline check closes an entry. It is signed "(pipeline, not a human)". Consistent with "no human gate" in [[pipeline-review-2026-09-18]].
- A source read in another copy is cited as that copy (citation style rule 8) instead of being queued.
- A missing citation detail is looked up, never queued.
- Gaps that nothing online can close stay listed and do not block `sourced`.

**How to apply:** do not ask the user to settle entries. Run `clear-queue`, and report only `pending` changes (a known error in a node) and the top of "By what would close them". Keyless Google Books and Semantic Scholar hit their quotas (429) on the first test; HathiTrust and BASE answer with Cloudflare challenges and are never used. Internet Archive full-text search finds phrases in lending library books but gives no page without a borrow, which the pipeline may not do.
