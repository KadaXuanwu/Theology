---
name: quotes-from-raw-text
description: A fetch tool returns a model's summary, and a reference work can misframe the author it quotes; quotations in a node are checked against the raw page and, where it can be reached, the author's own text.
metadata:
  type: feedback
---

On 2026-11-07, in the refresh of God Is the Reason Anything Exists at All, two kinds of quotation error got past the first checks.

**Fetch summaries.** The term researchers' quotes came back through a web fetch tool that returns a model's summary of the page, not its text. The glossary entries built on them carried a reversed claim (that Leibniz confined the principle of sufficient reason to contingent truths) and wording the source did not use. Pulling the page with `curl` and grepping the text settled every quote in seconds.

**Framing borrowed from a reference work.** The Stanford Encyclopedia wrote that "Pruss goes further to suggest" the principle is self-evident. In Pruss's own book the words describe why people believe the principle, and he adds that "if we want to convince others, we need arguments". The node first copied the SEP's framing; the queue's cold checker caught it in the book's full-text snippets.

**How to apply:**

- Brief researchers and verifiers to check every quotation against raw page text (`curl`, then strip tags), not the fetch tool's answer. A site that refuses `curl` is a dead route under the access rules, not a reason to trust the summary.
- When a node quotes an author through a reference work, check the author's own sentence before writing "X suggests" or "X holds". If only the reference work was read, attribute the framing to it and give the author's text a Verification entry.
- See [[pipeline-review-2026-09-18]] for the verifier's inference check, which is the rule this extends.
