---
name: bash-heredoc-apostrophes
description: In the desktop app's Bash tool on Windows a heredoc with an odd number of apostrophes fails to parse; write the script with the file tool and run it.
metadata:
  type: reference
---

On 2026-11-27, in the source run on The New Testament Has More Manuscript Support Than Other Ancient Works, three Bash calls failed with "unexpected EOF while looking for matching `'`". Each held a quoted heredoc (`<<'EOF'`) whose body had an odd number of apostrophes ("master's", "d'uso"). Heredocs with an even number went through. The fault is in how the tool hands the command to Git Bash on this PC, not in the script (my reading; not confirmed on the other PC).

**How to apply:**

- Write node bodies, Python helpers and anything with prose in it through the file write tool, then run the file. Do not paste them into a heredoc.
- The same run showed the cold verifiers can return full reports as their final message without loss, and that the queue's cold checker found a misquotation the two verifier passes had read past (Holmes prints Koester's "confirmed by any external evidence" as "affirmed by any evidence"). A quotation taken through a second author is worth a snippet check of the first printing. See [[quotes-from-raw-text]] and [[subagent-stalls]].
