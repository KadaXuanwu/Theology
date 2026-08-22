# Source balance

A node can have a source on every sentence and still be slanted, because *which* sources were reachable is not neutral. On religion the free web is thick with apologetics and counter apologetics, while the careful academic middle sits behind paywalls. Left alone, a pipeline that verifies only what it can open drifts toward polemics at both ends. These rules exist to stop that.

## Register

Every source gets a register alongside its tier. Tier is how reliable it is. Register is where it comes from.

- **academic**: peer reviewed journals, university and academic press monographs, excavation reports, museum catalogues, critical editions
- **neutral-secondary**: signed reference works, Biblical Archaeology Society, university department pages, press coverage of a named study
- **confessional**: apologetics sites, seminary and denominational presses, ministry publications, church statements
- **counter**: counter apologetics sites, atheist and sceptic advocacy, debate content

`confessional` and `counter` are both **advocacy**. Register is about the publishing venue, not the author's beliefs. A Christian scholar publishing with Oxford is `academic`. The same scholar's blog post is `confessional`.

## Rules

1. **Academic majority.** At least half the distinct sources cited in a node are `academic` register. If a node cannot reach that, it says so in the delivery notes rather than pretending otherwise.

2. **Advocacy never carries a fact.** No factual claim rests on an advocacy source alone. Advocacy sources are citable for the existence and popularity of a position, never for whether it is true. Attribute them: "Copan argues that" rather than "the fact is that".

3. **Register symmetry.** The best source behind the counter position must sit in the same register and tier as the best source behind the main position. Peer reviewed argument answered by a blog post is a slanted node even though both have citations. Where the asymmetry cannot be fixed, state it in Limits and name what is missing.

4. **No one sided advocacy.** If a node cites advocacy from one camp and none from the other, that is a flag. Either find the matching one or drop both and stay academic.

5. **Continental check.** This field is disproportionately German language, and secondarily French. The scholarship researcher states whether German or French work was checked and what came back. "Checked, found nothing reachable" is a fine answer. Saying nothing is not.

6. **Vintage check.** If the newest academic source for a position is more than 25 years old, check whether it still stands. An old consensus presented as the current one is its own kind of bias.

7. **Reachability disclosure.** Where the real state of the field is behind a paywall and only the polemics were openable, the node says the academic literature was not reachable on this point. It does not present the polemics as the state of play.

## The false balance guard

Read this before applying the rules above.

Balance here means balanced **sourcing**, not balanced **conclusions**. If the scholarly field is lopsided on a question, the node says it is lopsided and cites someone qualified saying so. Do not manufacture symmetry between a mainstream position and a fringe one, do not pad the thin side, and do not soften a well supported finding to make the node feel even handed. Inventing a two sided debate where there is not one is a worse failure than the slant these rules are built to prevent.

Balance the sourcing. Report the field as it is.

## Balance ledger

Every node ships with this. It does not go into the vault, it goes in the chat.

```
Sources: <n> total
academic <n> | neutral-secondary <n> | confessional <n> | counter <n>
Academic share: <percent>
Main position best source: <tier>, <register>
Counter position best source: <tier>, <register>
Continental scholarship: checked | not checked | <what was found>
Newest academic source: <year>
Failing rules: <list, or none>
```
