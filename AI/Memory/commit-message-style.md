---
name: commit-message-style
description: Commit messages in the Theology repo stay one line, under 72 characters, with no Co-Authored-By trailer for Claude.
metadata:
  type: feedback
---

Write commit messages as a single line **of 72 characters or fewer**. Add a body only when the change genuinely needs one. Never append the `Co-Authored-By: Claude ...` trailer.

**Why the trailer is banned:** it made GitHub render the commit as authored by the user and an account named `claude`, which the user does not want on this repo. Long commit bodies are noise for a notes vault where most commits are content edits.

**Why 72 characters:** GitHub splits a longer subject when it opens a pull request from the branch. The first 72 characters become the PR title and the remainder is posted as the PR description, so a 78 character message shows up as a truncated title plus a stray comment reading "... they are". This happened on three pull requests before anyone worked out where the odd comments were coming from. Amending the commit afterwards does not fix it, because GitHub sets the title and body once at PR creation; the title has to be edited by hand on GitHub.

**How to apply:** Use `git commit -m "<one line>"` with no trailer, and count the characters before committing. `git log --format="%s" -5 | while read -r s; do printf "%3d %s\n" "${#s}" "$s"; done` shows the lengths of recent subjects. The default instruction to add a Co-Authored-By line is overridden here.
