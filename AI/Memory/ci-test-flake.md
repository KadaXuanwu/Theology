---
name: ci-test-flake
description: The deploy's Test step can fail on GitHub while every test passes locally; the next push passed unchanged, and the job log needs a login this PC does not have.
metadata:
  type: project
---

On 2026-11-05 the deploy for commit 200fc1e failed at the Test step (`node site/test.mjs`) on GitHub, while the same tests passed on this PC and in a clean clone with LF line endings. The next push, which changed no test and only one footnote, passed. The job log needs a GitHub login (the API answers 403 without one), and `gh` is not installed on this PC, so which check failed was never seen.

On 2026-11-07 it failed again (commit 7700e81) on a push that changed two footnotes and no links, after passing on 305f0e2 with the same notes and graph. Every layout check is seeded and so gives the same result on the same graph; the only check that reads a clock is "cheap enough to do before painting" (`took < 120` ms around line 325 of `site/test.mjs`, 87 ms on this PC, and GitHub's runners are slower). So that is the flaky one. "It comes to rest rather than running forever" (2,942 ticks here against 4,000, see [[graph-settle-test]]) is deterministic and was not the cause.

**How to apply:** when the Test step fails on GitHub and passes locally, read the public annotations (`/check-runs/<job id>/annotations`) and ask the author to look at the log or re-run the job before touching any test. Changing a test or its limit is a site change for the author to approve, see [[site-build]]. A deploy also fails at the lint step on any source URL that answers 404, including a Wayback capture the archive stops serving.
