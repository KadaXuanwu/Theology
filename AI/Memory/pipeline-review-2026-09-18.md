---
name: pipeline-review-2026-09-18
description: The 2026-09-18 review of the node pipeline against published work on AI research systems, what changed because of it, and the three decisions the user made.
metadata:
  type: project
---

On 2026-09-18 the pipeline was evaluated against the one node it had fully sourced and against published work on AI research pipelines, then changed in seven places. The state before: the only fully sourced argument was over the 2000 word cap and marked `sourced` anyway, nothing mechanical enforced the node rules, the debater personas carried conclusions and unequal register, the balance ledger and verifier counts were lost after each session, and technical terms were unexplained.

**What the literature said, in one line each, with the sources that carry it:**

- Links that resolve are not sources that support the claim: link validity above 94% but the source supports the claim in only 39% to 77% of cases across 14 models ([Cited but Not Verified](https://arxiv.org/html/2605.06635v1)); 3% to 13% of deep research citations never existed, theology the worst domain tested, and a URL health tool cut that under 1% ([arXiv 2604.03173](https://arxiv.org/abs/2604.03173)). Hence the lint's URL check and the verifier's `unopened` verdict.
- Grade statements as cited and supported, cited but unsupported, or uncited, blind: how FutureHouse's WikiCrow beat Wikipedia at 86.1% precision against 71.2% ([arXiv 2409.13740](https://arxiv.org/html/2409.13740v1)). Hence the run record's counts.
- Debate beats a one sided expert only with verifiable quotes and a strong judge, and gets worse for weak judges after two rounds ([Khan et al. 2024](https://arxiv.org/html/2402.06782)); it often fails to beat cheaper methods, and different models for the agents was the one change that reliably helped ([arXiv 2502.08788](https://arxiv.org/abs/2502.08788), [arXiv 2511.07784](https://arxiv.org/abs/2511.07784)); judges favour the case read first, fixed by swapping order ([IJCNLP 2025](https://aclanthology.org/2025.ijcnlp-long.18.pdf)). Hence two rounds kept, the double ruling, and debaters on different model families.
- STORM's Wikipedia writer read as unneutral to 7 of 10 editors because tone transferred from sources, and its most frequent citation error was joining true facts into an inference no source draws ([arXiv 2402.14207](https://arxiv.org/html/2402.14207)). Hence the verifier's inference check.
- Neutrality is testable as equal treatment of mirrored cases ([Anthropic paired prompts](https://www.anthropic.com/news/political-even-handedness), [arXiv 2605.28911](https://arxiv.org/abs/2605.28911)). Hence the effort check, as bounded by [[same-effort-not-same-length]].
- Every evidence synthesis body requires human accountability and full reporting of AI judgments ([Cochrane, Campbell, JBI, CEE 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12603384/)); reviewing only the final output misses pitfalls, keep the trace ([arXiv 2509.08713](https://arxiv.org/abs/2509.08713)). Hence the run record. Nothing in the literature gates on readability.

**The three decisions, all the user's:**

- **No human gate.** The pipeline keeps writing, committing and pushing to main, and the user does not read a node before it deploys. Every project surveyed has a person sign off first; the user chose otherwise, knowingly. Do not suggest a branch or pull request per node again.
- **No cap on the Description.** Keep it in proportion; a Description that outweighs the node is carrying detail that belongs in Based On. A soft sentence in style.md, no number.
- **Working papers are not kept.** The run record at the top of `Verification/<Node>.md` is the whole trace: fields, ledger, counts, whether the two rulings agreed, crux, strong counter, points, lint. Short and complete. Cards and claim lists stay in the scratch directory.

**How to apply:** the changes live in `.agents/skills/`, `site/lint.mjs`, `Verification/README.md` and `AI/Skills/README.md`. `npm run check` now includes the lint, and CI runs it. The lint fails on mechanical rules and only warns on length and sentence length, because the one fully sourced node is 25 words of prose over the cap and a hard failure would have blocked every deploy until someone cut it. See [[glossary-terms]] for the term mechanism and [[link-direction]] for the table it checks.
