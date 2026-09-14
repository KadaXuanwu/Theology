# Citation style

Every citation in the vault lives in a footnote at the foot of its node. This file says how to write one. It is a house style, not a named standard. It sits close to Chicago notes style, which is what the humanities and the SBL Handbook both build on, but it is lighter, and where the two differ this file wins.

The reason it is written down at all: before footnotes, citations were scattered through prose and drift was invisible. Now every citation on a node sits in one visible list, so an inconsistency is the first thing a reader sees.

## The shape

```markdown
Some claim the node makes.[^author-year]

[^author-year]: Author, "Article Title", *Journal* 59/4 (2023), 572–588.
```

Keys are `surname-year`, lower case, hyphenated. Never numbers: a number renumbers every time you insert a citation above it and the diff becomes unreadable. Where one author has two works in a node, add a word: `adams-1975`, `adams-1993`.

The marker goes **after the punctuation that closes the thought it supports**, never inside a sentence. `site/test.mjs` fails the build if one lands mid-sentence.

## Volume and issue: slash, never colon

```
*Religious Studies* 59/4 (2023), 572–588.
```

**The colon is reserved for chapter and verse.** It carries that meaning 133 times in this vault, and a citation can hold both at once:

```
Richard Alan Young, "The Knowledge of God in Romans 1:18–23", *JETS* 43/4 (2000), 695–707.
```

Written with a colon that reads `Romans 1:18–23", *JETS* 43:4`, which is two meanings of the same mark seven words apart. Chicago would write `59, no. 4`, which removes the clash but is heavier than anything else here.

A journal with no issue number takes the volume alone: `*Journal of Analytic Theology* 4 (2016), 291–316.`

## Worked examples, one per kind

**Journal article.** Page range is not optional.
```
Stephen Napier, "Is there non-resistant non-belief?", *Religious Studies* 59/4 (2023), 572–588.
```

**Book.** Comma before the year. Page only where the node leans on a particular one.
```
Alvin Plantinga, *Warranted Christian Belief* (Oxford University Press, 2000), 351.
```

**Chapter in an edited volume.**
```
Sean Carroll, "Does the Universe Need God?", in *The Blackwell Companion to Science and Christianity*, ed. J. B. Stump and Alan G. Padgett (Wiley-Blackwell, 2012), 185–197.
```

**Signed encyclopedia entry.** Give the revision date, since these change under you.
```
Del Ratzsch and Jeffrey Koperski, "Teleological Arguments for God's Existence", *Stanford Encyclopedia of Philosophy*, revised 5 April 2023.
```

**Primary text with its own divisions.** Cite the divisions, not a page, so the citation survives any edition.
```
Aquinas, *Summa theologiae* Ia.104.1.
Anselm, *Cur Deus Homo* I.21.
Aristotle, *Meteorologica* II.9, 369a10–369b11.
```

**Older printed work.** Publisher as printed on it.
```
Henry Drummond, *The Lowell Lectures on the Ascent of Man* (James Pott, 1894), 333.
```

**Report or institutional source.** Full date, no publisher.
```
Pew Research Center, "Religious 'Nones' in America", 24 January 2024.
```

**Something with a URL.** Link the title, keep the rest plain.
```
Deborah Kelemen, [Are Children "Intuitive Theists"?](https://www.bu.edu/cdl/files/2013/08/2004_Kelemen_IntuitiveTheist.pdf), *Psychological Science* 15 (2004), 295–301.
```

## Authors

Up to three, name them all, joined by `and`. Four or more, first author then `et al.`

```
Cristine H. Legare, E. Margaret Evans, Karl S. Rosengren and Paul L. Harris, ...
Will M. Gervais et al., ...
```

Never "and colleagues" or "and others". They read as prose, not citation, and the vault has held all three forms at once.

## Rules that are easy to break

1. **Comma before the year** in a publisher parenthesis: `(Routledge, 2009)`, not `(Routledge 2009)`.
2. **Page ranges on journal articles**, always. A volume and year alone does not locate anything.
3. **En dash in ranges**, `572–588`, never a hyphen. That is the one dash this vault permits.
4. **The same source is cited the same way** in every node that uses it. Shortening it in one node and not another is the most common drift.
5. **A page the node argues from goes in the prose**, not the citation: "he writes at p. 652 that ...". The footnote carries the work, the sentence carries the place. This keeps one citation reusable across a node instead of one per page.
6. **Never invent** a page, a DOI, a volume or a publisher. See `source-policy.md`.

## Scripture is not a footnote

Bible references stay inline as links, in the vault's existing form:

```
[Joshua 6:20–21](https://www.biblegateway.com/passage/?search=Joshua%206:20-21&version=NIV)
```

They read as part of the sentence and a reader wants them where the claim is, not at the foot of the page.
