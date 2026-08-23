---
name: commit-cadence
description: Commit when a piece of work is actually finished, not once per prompt.
metadata:
  type: feedback
---

Do not commit after every reply. Keep working across several prompts and commit when the thing is genuinely done: a feature complete, a fix verified, a round of edits that stands on its own. Small follow up tweaks to something just committed belong in that same piece of work, not in a commit of their own.

**Why:** Committing per prompt turned one feature into a long trail of tiny commits, which buries the real shape of the change in the history. It also matters more here than in most repos: every push to `main` that touches `Theology/`, `site/` or the build files runs the deploy workflow, so a commit per prompt is also a deploy per prompt. See [[site-build]].

**How to apply:**

- Leave work uncommitted between prompts while a feature is still in progress. That is expected, not something to apologise for or work around.
- Commit when it is finished, or when the user asks, or before anything risky like a branch switch or a merge.
- One commit describing the finished change beats five describing the steps. Message style is in [[commit-message-style]].
- Say plainly what is committed and what is still sitting in the working tree, so the state is never a surprise.
