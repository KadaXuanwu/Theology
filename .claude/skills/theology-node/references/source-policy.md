# Source policy

Read `references/balance.md` with this. Tier is reliability. Register is provenance. A node needs both to be right.

## Tiers

**Tier A, primary or peer reviewed**
Excavation reports, museum catalogue entries, published inscriptions and their scholarly translations, peer reviewed journal articles, academic monographs from university or academic presses, critical editions and manuscript catalogues.

**Tier B, named secondary**
Reporting that names the excavator, author or publication behind it. Biblical Archaeology Society, university department pages, encyclopaedia entries with signed authorship, reputable press coverage of a named study.

**Tier C, general web**
Blogs, apologetics and counter apologetics sites, forums, video content, unsigned pages. Useful for finding out that a position exists and who holds it. Never usable as proof that it is correct.

## Access levels

Replace any yes or no notion of having read something. Report one of these:

- **full**: you read the relevant text
- **snippet**: you saw a fragment, Google Books snippet view, a search result excerpt, an abstract quoting a line. Confirms wording exists. Does **not** confirm context, and does not tell you whether the author was stating the view or attacking it.
- **abstract**: abstract or catalogue record only
- **none**: cited from another source's reference to it

`snippet` and `abstract` cannot support a claim about what an author argues, only that a phrase appears. `none` cannot support anything and must be disclosed.

## Rules

1. Every factual sentence needs Tier A or Tier B.
2. A load bearing claim, meaning one the node's conclusion collapses without, needs Tier A at `full` access.
3. Tier C is only citable for the existence and popularity of a position. Attribute it by name.
4. Numbers, dates and quotations need the source that carries them, not one that repeats them.
5. Where the source is a book or paywalled article that could not be opened, cite it precisely (author, title, publisher, year, page if known), mark access `none` or `abstract`, and list it in the delivery notes as not independently checked. Never present it as verified.
6. Never invent a page number, a DOI, a catalogue number or a journal volume.

## Local sources

Files the user has provided sit in `sources/` in the working directory, or were attached to the conversation. Check there **before** searching the web.

**Never commit a supplied file.** This repo is public and a push to `main` deploys the site, so a copyrighted PDF committed here is one published to the world. Read it, cite it properly, quote it the way any paper would, and leave the file where it is. Do not `git add` it and do not suggest the user commit it.

A supplied file counts as `full` access, since you can actually read it. That is the whole of the advantage. It does **not** get a tier or a register for having been supplied, and it does not outrank anything: work out its tier and register from what it is, exactly as you would for a source you found yourself. A conference handout the user happens to own is still Tier C. Cite it by its real bibliographic details, not by filename.

## Known limits of this pipeline

- Web search here is weighted to a US index. Non English and continental European scholarship is under-surfaced rather than absent. Search for it deliberately.
- JSTOR, Brill, De Gruyter, Mohr Siebeck, Cambridge Core and most journal and monograph paywalls cannot be fetched. Expect rule 5 often.
- Worth trying before falling back: museum catalogues, Archive.org and Open Library, SBL's open access series, Persée for French work, university repositories and author uploaded copies, DOAJ.

Say all of this plainly in the delivery notes. A citation chain that looks research grade but was never opened is worse than an honest gap.
