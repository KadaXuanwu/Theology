---
name: commit-identity
description: Commits in this repo are authored as Claude <noreply@anthropic.com>; on a PC with no git identity, pass it per commit instead of setting global config.
metadata:
  type: project
---

The repo's commits are authored as `Claude <noreply@anthropic.com>`. The Windows laptop (KadaLaptop) has no git `user.name` or `user.email` configured, so a plain `git commit` fails there with "Author identity unknown". On 2026-10-16 the fix was a per-command identity, which changes no config:

`git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "<one line>"`

**Why:** setting a global git identity is a persistent change to the user's machine, which needs their say. The per-command form matches the history without touching config.

**How to apply:**

- Check `git log -5 --format='%an <%ae>'` before committing on a new machine; if the identity is missing, use the `-c` form above.
- The same laptop had no Node.js until 2026-10-12, when the user had it installed with `winget install OpenJS.NodeJS.LTS`. In a shell started before that, refresh `Path` from the machine and user environment first.
- One site test, "and every graph on the page is laid out again", fails on Windows checkouts only: `core.autocrlf` gives `site/assets/graphs.js` CRLF line endings and the test's regex expects `\n`. It passes on the committed LF text and in CI. Message style is in [[commit-message-style]].
