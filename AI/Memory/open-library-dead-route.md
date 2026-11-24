---
name: open-library-dead-route
description: Open Library answers scripted requests with a human verification page, so a person or term node must not cite its records; use publisher, library catalogue or institute pages.
metadata:
  type: reference
---

On 2026-11-24, in the source run on The Messianic Prophecies Were Written Before Jesus, the person agents cited Open Library records for book titles and years in four of seven person nodes. The cold verifiers could open none of them: the pages returned "Human Verification" to curl and the JSON API timed out. Every fact had to be found again elsewhere, and one catalogue value was wrong for the vault's purpose (it gave "1517 Media" where the imprint is Fortress Press).

**Why:** a footnote the verifier cannot open is `unopened`, and a bot check is a dead route under `access-routes.md`.

**How to apply:**

- Brief person and term agents not to cite Open Library. Routes that opened in that run: the publisher's own page (Eerdmans, Fortress through a web archive capture, Lutterworth), the hbz union catalogue through `https://lobid.org/resources/<id>` and the GND through `https://lobid.org/gnd/<id>`, a learned society's or institute's profile page, and the author's own academic site.
- The older person nodes that cite Open Library were not rechecked. See [[subagent-stalls]] for the other lessons of the same pipeline.
