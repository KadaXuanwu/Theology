---
name: ci-test-flake
description: The deploy's Test step can fail on GitHub while every test passes locally; the next push passed unchanged, and the job log needs a login this PC does not have.
metadata:
  type: project
---

On 2026-11-05 the deploy for commit 200fc1e failed at the Test step (`node site/test.mjs`) on GitHub, while the same tests passed on this PC and in a clean clone with LF line endings. The next push, which changed no test and only one footnote, passed. The job log needs a GitHub login (the API answers 403 without one), and `gh` is not installed on this PC, so which check failed was never seen.

Two checks sit close to their limits and are the likely ones: "cheap enough to do before painting" (87 ms here against a 120 ms limit, and GitHub's runners are slower) and "it comes to rest rather than running forever" (2,942 ticks here against 4,000, see [[graph-settle-test]]). Both grow with the number of notes.

**How to apply:** when the Test step fails on GitHub and passes locally, read the public annotations (`/check-runs/<job id>/annotations`) and ask the author to look at the log or re-run the job before touching any test. Changing a test or its limit is a site change for the author to approve, see [[site-build]]. A deploy also fails at the lint step on any source URL that answers 404, including a Wayback capture the archive stops serving.
