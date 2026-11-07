---
name: graph-settle-test
description: The "comes to rest" layout test in site/test.mjs runs on the real vault graph and sits near its tick limit (6000 since 2026-11-07), so adding nodes can fail it with no bug in the content.
metadata:
  type: project
---

The check "a released node comes back to the middle / it comes to rest rather than running forever" in `site/test.mjs` builds the force layout from the real `dist/graph.*.json`, drags `g.nodes[0]` four radii out from one fixed seed, releases it and fails if settling takes 4000 ticks or more.

Measured on 2026-11-02 over 18 seed and node choices: settling takes about 1300 to 5400 ticks, and on the clean tree of that day one choice already took 4240. The default seed passed at 2610 before the Plantinga run and took 5399 after it added 11 nodes; removing any one of the eight new terms made it pass again. So a failure here after adding notes says the limit is near the spread of normal settle times, not that the notes or the physics broke.

On 2026-11-07 the Faith Can Be Rational Before the Evidence Is In run added seven notes and the default seed took 4726 ticks; the author approved raising the limit from 4000 to 6000.

**How to apply:** when it fails after a content change, run the clean tree and a few seeds before touching any note. Changing the test or the physics is a site change for the author to approve, see [[site-build]] and [[one-node-at-a-time]].
