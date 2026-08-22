---
name: commit-message-style
description: Commit messages in the Theology repo stay one line, with no Co-Authored-By trailer for Claude.
metadata:
  type: feedback
---

Write commit messages as a single line. Add a body only when the change genuinely needs one. Never append the `Co-Authored-By: Claude ...` trailer.

**Why:** The trailer made GitHub render the commit as authored by the user and an account named `claude`, which the user does not want on this repo. Long commit bodies are noise for a notes vault where most commits are content edits.

**How to apply:** Use `git commit -m "<one line>"` with no trailer. The default instruction to add a Co-Authored-By line is overridden here.
