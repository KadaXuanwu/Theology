# Access routes

Where to look for a source the first search could not open, by what an open `Verification/` entry is missing, and what each route can and cannot confirm. `clear-queue` works through this list on every entry. `source-node` and `refresh-node` try the record routes before they write an entry, so a missing page range or forename is never queued.

The routes were tested from the pipeline on 2026-11-01. A route marked "keyless" worked without an account. Never sign in, register, borrow or pass a bot check to reach a source, and never change the user agent or other headers to get past a refusal. Never put the user's email or name in a request.

## Records: titles, forenames, volume, issue, pages, dates

1. **Crossref**, keyless: `https://api.crossref.org/works?query.bibliographic=<author title year>&rows=3`, or `/works/<DOI>`. Gives title, every author's given name, volume, issue and page range. Take the year from `published-print` or `issued`, not from the DOI, which carries the online-first year. See the citation year drift note in `AI/Memory`.
2. **OpenAlex**, keyless on a small daily budget shared by everyone on the same IP address: `https://api.openalex.org/works?search=<terms>&select=doi,title,biblio,authorships,best_oa_location,locations`. Covers books and chapters Crossref misses.
3. **The publisher's own page** for the article or chapter, and the journal issue's table of contents.
4. **Library catalogues** for books: the Library of Congress, the Deutsche Nationalbibliothek, the BnF, swisscovery, Open Library. A catalogue gives the edition, publisher, year and page count, never the page a sentence sits on.
5. **People's dates**: an institutional or publisher biography, an obituary in a newspaper or a learned society's journal, a national authority file (GND, LC Name Authority). A date of birth needs the source that states it, not a wiki that repeats it.

A record closes a `metadata` entry. It confirms nothing about what the source says.

## Free copies of articles and chapters

1. **OpenAlex** `best_oa_location` and `locations`: the open copies the index knows of, with the version each is (`publishedVersion`, `acceptedVersion`, `submittedVersion`).
2. **The author's own page** and their university's repository. Search the title in quotation marks with the author's surname.
3. **DOAJ**, keyless, for open access journals: `https://doaj.org/api/search/articles/<terms>`.
4. **PhilArchive, PhilPapers, CORE**: they refuse a plain `curl` (403). Try the web fetch tool. If a bot check answers, drop the route.
5. **Semantic Scholar**, `openAccessPdf`: refuses keyless requests (429) most of the time. Try once and move on.
6. **The Wayback Machine**, keyless: `https://web.archive.org/web/*/<URL>` for a copy that was once public and is now gone, where the live address answers 404 or no longer exists. Say which capture was read and its date. Never use a capture to reach a page whose live address answers with a bot check, a login or a paywall: that is getting past the check by another door.

Note the version of every copy found. An accepted manuscript read in full confirms what the article argues and, almost always, its wording. It does not confirm the published pages. See citation style rule 8.

## Books

1. **Internet Archive full-text search**, keyless: `https://archive.org/services/search/beta/page_production/?service_backend=fts&user_query="<exact phrase>"&hits_per_page=20`. Searches the text of scanned books, including the lending library's in-copyright scans, and returns the item, its year and a highlighted snippet. It confirms that a phrase stands in a given printing. It does not give the page: the scan text and page map of a lending book answer 403 without a borrow. Public domain items open in full, with page numbers.
2. **Google Books**, search inside a volume and its preview. The keyless API ran out of its shared daily quota during the test (429). The web search tool still reaches Google Books pages. A snippet with a page number in its URL or heading gives a page; a snippet view without one does not.
3. **Older printed texts in full**: Internet Archive's public domain scans, Gallica, MDZ (the Munich digital collections), e-rara, Persée for French journals, CCEL and New Advent for older translations of church texts, the Vatican's site for papal and conciliar texts, Corpus Thomisticum for Aquinas in Latin.
4. **Jewish texts**: Sefaria, keyless, `https://www.sefaria.org/api/v3/texts/<ref>`, with the Hebrew or Aramaic and the William Davidson English. That English sets the translation in bold and the added explanation in plain type, so the bold alone is what the text says.
5. **Reviews of the book** in academic journals, read in full. A review reports what a book argues. It is a second hand account, so it moves a `content` entry to `partial`, never to `confirmed`.
6. **Never**: HathiTrust answers with a Cloudflare challenge, and so does BASE's search page. Academia.edu and ResearchGate want an account or a bot check. A whole in-copyright book uploaded by a user, such as a shadow library file re-posted to Internet Archive, is not downloaded or read through; its full-text search snippets count as snippets, like any other.

## What a finding earns

| Found | Closes | Leaves open |
| --- | --- | --- |
| A record | `metadata` | everything about what the source says |
| The cited version, read in full with its pages | `copy`, `page`, `content` | nothing |
| Another version read in full (manuscript, reprint, web text) | `content`, and the wording | the cited version's pages, until the node cites the copy read |
| A full-text snippet from the cited printing | that the phrase is in that printing | the page, and what the author means by it |
| A snippet from another printing or edition | that the phrase exists | the cited printing's page and wording |
| Two independent reviews or citing works read in full | what the source argues, as others report it | the source's own words and pages |
| An abstract | what the abstract says | the body |

A snippet is never verification of what an author argues. It shows a phrase on a page and nothing about whether the author holds it. The verifier's rule in `agents/verifier.md` applies here unchanged.
