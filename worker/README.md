# Chat Worker

The small server behind the chat bubble. It holds the API key, reads the vault
from the published site, picks which notes the model may read, and streams the
answer back. The browser only ever sends a question.

## Deploying

Four commands, once:

```bash
npm install -g wrangler
wrangler login
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

Run them from this folder. `wrangler deploy` prints the Worker's URL. Put that
URL into `CHAT_ENDPOINT` in `site/build.mjs`, rebuild, and the bubble appears.

The key is stored by Cloudflare. It is never in this repo and never reaches the
browser.

## Changing the model

`PROVIDER` and `MODEL` in `wrangler.toml`, then `wrangler deploy` again. The
providers live in `providers.js`; adding a third one means adding an async
generator that yields text.

## What a question costs

Measured 2026-08-26 at 28 notes, read off `wrangler tail`.

| | now | projected at 300 notes |
| --- | --- | --- |
| Catalogue, every note, one line each | 2,000 tok | 20,500 tok |
| Note bodies, 8 of them | 5,000 tok | 4,600 tok |
| A question, all in | 7,000 to 8,200 tok | ~25,000 tok |

The catalogue grows with the vault and the bodies do not, which is the whole
shape of this thing: the part that scales is the part that is identical on
every request, and therefore the part a cache can serve.

About 4.24 characters per token in practice, not the 3.7 usually assumed. Use
the real figure when estimating.

## Dials you can turn

Anything under `worker/` needs `wrangler deploy` before it is live. CI will go
green without it. The excerpt length is the exception: it lives in the build
and needs a site rebuild instead.

| Setting | Where | Now | What it does |
| --- | --- | --- | --- |
| `MAX_NOTES` | `context.js` | 8 | How many note bodies get sent. The main cost dial. |
| `BODY_BUDGET` | `context.js` | 90,000 chars | Second ceiling, for a freakishly long note. `MAX_NOTES` is what normally bites. |
| `HISTORY_CONTEXT` | `context.js` | 600 chars | How much of the last answer is used to rank notes for a follow-up. |
| Score weights | `context.js` | title 10, tags 5, body 1 (max 5) | How notes are ranked. A word in a title says what a note is about; a word in the body may be one passing mention. |
| `STOPWORDS` | `context.js` | ~90 words | Words too common to say anything about relevance. |
| Excerpt length | `site/build.mjs`, `trimTo(..., 155)` | 155 chars | The description in each catalogue line. **Rebuild the site, not the Worker.** |
| `maxOutputTokens` | `providers.js` | 800 | Length ceiling on an answer. |
| `FIRST_TOKEN_MS`, `ATTEMPTS` | `providers.js` | 12s, 2 | How long a stalled request waits before being abandoned and retried. Measured on the live endpoint, about a quarter of free tier requests take over twenty seconds while the rest answer in two or three, and spacing them out does not change it. Only a stall before any text retries; once a word has been sent, restarting would rewrite what the reader is watching. |
| `temperature` | `providers.js` | 0.2 | Low, because the job is reading supplied text accurately, not writing something new. |
| `MODEL`, `PROVIDER` | `wrangler.toml` | `gemini-3.6-flash`, `gemini` | The model. `providers.js` holds one async generator per provider. |
| `THINKING_LEVEL` | `wrangler.toml` | `low` | Gemini 3.x thinks by default and this task does not need it. Set to `""` to stop sending the field, for a model that rejects it. It nests as `generationConfig.thinkingConfig.thinkingLevel`; put directly in `generationConfig` the API says "Cannot find field", which reads like the feature is missing rather than misplaced. Gemini 2.5 models want `thinkingBudget` here instead. |
| `RATE_LIMIT`, `RATE_WINDOW_MS` | `index.js` | 6 per minute | Per address. In memory, so a speed bump rather than a guarantee. Gemini's own free tier limit for Flash is around five a minute and is per project, not per address, so this cannot fully protect it. |
| `MAX_QUESTION` | `index.js` | 1,000 chars | Longest question accepted. |
| `MAX_HISTORY`, `MAX_HISTORY_CHARS` | `index.js` | 8 messages, 6,000 chars | How much conversation is sent back. |
| `CORPUS_TTL_MS` | `index.js` | 10 min | How long a fetched vault is reused. Lower means notes appear sooner and more refetches. |
| `HOLD_LIMIT` | `index.js` | 500 chars | How long an unclosed bracket is held before giving up and flushing. |

## Why it is set up this way

Undoing one of these without knowing the reason is easy, so:

**Eight notes, not thirty.** It used to fill 90,000 characters of bodies, about
30 notes, when an answer uses three or four. Keyword ranking is good for the
first few and noise after that. Cutting to 8 roughly halved the cost of a
question. Not fewer than 8, because a question phrased entirely in synonyms
pushed the right note to rank 7.

**Excerpts stay at 155 characters.** Trimming to 90 would save about 5,000
tokens at 300 notes, and it is still the wrong trade. The second sentence of an
excerpt is usually a separate idea, and that is exactly what someone
half remembering a note searches on.

**The catalogue holds no urls.** A url is the title and section under the
site's slug rules, so sending both was the same information twice, about 3,800
tokens per question at 300 notes. The model writes `[[Title]]` and
`resolveLinks` turns it into a url from the corpus. The side effect is the
better half: the model never sees a url, so it cannot invent one, and any
markdown link it writes anyway is flattened to plain words before titles are
resolved. A link can only point at a note that exists.

**Nothing matched means nothing is sent.** A question matching no note used to
fall back to reading order, which under a cap means arbitrary notes: tokens
spent on unrelated text and a model invited to answer from it. The catalogue
still lists everything, so it can name the right note and say it has not read
it.

**Follow-ups rank against the previous answer.** "Tell me more about that"
carries no keywords, so on its own it scored nothing and dropped the very notes
under discussion.

**Errors reach the reader as a sentence, and the log as the truth.** A quota
rejection used to arrive in the chat bubble as raw API JSON telling a visitor
to go and check somebody else's billing details. The status and the API's own
text now go to `console.log`, which means `wrangler tail`, and the reader gets
one plain line.

Worth knowing when something breaks: a wrong model id or a misplaced field used
to announce itself in the chat, which is how the `thinking_level` mistake was
caught. It is still just as visible, only in the log now rather than on the
public site. Run `wrangler tail` before assuming a deploy went cleanly.

## Caching

Google charges about a tenth for a prefix you send repeatedly, and applies it
automatically. The system prompt and catalogue are identical on every request
and sit at the front of the prompt for exactly this reason.

It is not firing yet. Gemini 3.x wants a shared prefix of at least 4,096 tokens
and the catalogue is 2,043. It should start on its own somewhere past roughly
100 notes, with no code change. Check with `wrangler tail` and look for
`cachedContentTokenCount` in the logged usage block.

If the catalogue is well past 4,096 and there is still no such field, check
which model is set. Flash Lite is the one family Google's caching docs omit and
there are open reports of implicit caching not firing on it, so moving `MODEL`
to a full Flash is the fix in that case.

## Testing locally

```bash
wrangler dev
```

Needs a `.dev.vars` file next to this one holding `GEMINI_API_KEY=...`. That
file is gitignored.

The parts that decide what the model reads are in `context.js` and have no
Cloudflare dependencies, so they are covered by `site/test.mjs` and run in CI
without any of the above.
