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

**The first full run, 2026-11-01:** all 94 entries tried, about 21 finders, 17 checkers, 2 verifiers and 17 arbiters. It ended at 25 closed, 46 partial, 14 open and 20 pending node changes, and it found real errors of fact in nodes (Saunders, Murphy, Swinburne 1989, Himma and Effingham, the Royal Touch dates, Brown's place of death, the Invincible ignorance people). Lessons now in the route rules: the harness refuses a Wayback capture of a page whose live address has a bot check, so a capture counts only where the page is gone; finders kept reaching whole in-copyright books uploaded by users ("folkscanomy", Anchor Bible bundles), which are searched for snippets and never read through; a repository file marked restricted is not opened; Claude Code runs at most 20 subagents at once.

**How to apply:** do not ask the user to settle entries. Run `clear-queue`, and report only `pending` changes (a known error in a node) and the top of "By what would close them". Keyless Google Books and Semantic Scholar hit their quotas (429) on the first test; HathiTrust and BASE answer with Cloudflare challenges and are never used. Internet Archive full-text search finds phrases in lending library books but gives no page without a borrow, which the pipeline may not do.
