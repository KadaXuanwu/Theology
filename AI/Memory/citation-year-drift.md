---
name: citation-year-drift
description: Journal years in this vault drift because Cambridge and Wiley stamp the DOI at online-first, not at the issue.
metadata:
  type: project
---

Several vault citations carried the wrong year for the same reason: Cambridge Core and Wiley mint a DOI when an article goes online ahead of print, so the DOI string carries the earlier year and anyone reading the year off the DOI gets it wrong. Found and fixed across seven nodes on 2026-08-30.

**The cases, all checked against `api.crossref.org` directly:**

| Paper | Issue | Online first |
| --- | --- | --- |
| O'Connell, "Would More Miracles Solve the Problem?" | *Heythrop Journal* 54/2, 261–267, March 2013 | Oct 2011 |
| Blanton, "a response to Max Baker-Hytch" | *Religious Studies* 61/3, 700–716, Sept 2025 | Oct 2023 |
| Baker-Hytch, "On sin-based responses" | *Religious Studies* 61/3, 650–664, Sept 2025 | Nov 2023 |
| Launonen, "Non-belief as self-deception?" | *Religious Studies* 61/2, 263–279, June 2025 | March 2024 |

O'Connell's DOI is literally `10.1111/j.1468-2265.2011.00705.x` for a 2013 issue. Baker-Hytch's is `10.1017/s003441252300094x` for a 2025 one.

**Why it matters here beyond neatness.** The vault cites the same paper from several nodes, so a wrong year does not stay in one place, it appears next to a right one. Blanton was `(2023)` in one argument and `61/3 (2025)` in two other notes at the same time. `citation-style.md` already says the same source is cited the same way everywhere, and this is the failure mode that rule exists to catch.

**How to apply.** Take the year from Crossref's `published-print`, never from the DOI and never from the landing page's "first published online" line. `https://api.crossref.org/works/<DOI>` is open, fast and returns volume, issue and page range in one call, which also satisfies the house rule that journal articles always carry a page range. A citation with a year but no volume, issue or pages is the tell that somebody read it off a DOI.

**Still open.** `[^calvin-institutes]` is `I.iii` in one node and `I.3–5` in another. That one is not drift of this kind and cannot be settled from a metadata record; somebody has to open the *Institutes* and decide what each node actually rests on. See [[one-node-at-a-time]] for why it was left rather than guessed.
