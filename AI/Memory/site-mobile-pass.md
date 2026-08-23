---
name: site-mobile-pass
description: The site's mobile view still needs its own design pass. Raised 2026-08-23, deliberately deferred.
metadata:
  type: project
---

The public site works on a phone but has never been designed for one. Kada asked on 2026-08-23 to note it and come back to it later, not to fix it then.

What is known to be cramped or unresolved, from measuring the built pages:

- The header holds six controls on one line. At 320px wide it only fits after the padding, the gap and the site title all shrink, and the font picker collapses to an "Aa" mark instead of showing the chosen face. Anything added to the header from here needs measuring at 320px, not just 375px.
- Below the layout breakpoint the right rail is hidden entirely, so the mini graph and the table of contents are only reachable through the Graph tab.
- The whole vault graph on a phone fits its width but ends up small, since the layout is wider than it is tall and a phone screen is the other way round.

**Why:** raised as its own piece of work rather than folded into a feature, so it gets a proper pass instead of small fixes each time something is added.

**How to apply:** do not start this unprompted. When it does come up, treat it as a layout question for the header and the rail rather than a graph question, and see [[site-build]] for how to check and preview.
