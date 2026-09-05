---
name: manager-level-explanations
description: Report finished work the way you would to a manager who does not know the code, and link every name you use so it has a referent.
metadata:
  type: feedback
---

When reporting on finished work, write for a software manager who knows the product but not the code. Plain language. A term like `MaxNodes` or `TryNearest` may be used, but only with a link to the file or line it lives in, so the reader can tell whether it is a config value, a function, something from a library, or something written that day.

**Why:** on 2026-09-05 a report on the Slimeout pathfinding opened with "MaxNodes was 1024 and the map wants 3207". The user had no way to tell what MaxNodes was, whether it belonged to A*, to a structure built during that session, or to a setting they could change, and no link to find out. The names were doing the explaining, and they only explain to whoever just wrote them.

**How to apply:**

- Open with the effect on the game or the product, then the cause in one sentence.
- The first time a file, setting, type or function is named, link it. Use a path relative to the working directory when it is inside it, and the full path when the work is in another repo.
- Say what a name *is* in the same breath: "the cap on how many waypoints the map gets", not "MaxNodes".
- Leave out implementation choices that do not change the outcome. A structure written to make something faster is worth one clause, not a bullet.
- Numbers only where a number is the answer.
- Same length as always, see [[answer-length]].
