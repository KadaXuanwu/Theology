---
name: chat-worker
description: The site's chat bubble runs on a Cloudflare Worker deployed by hand, not by CI, and the model id matters.
metadata:
  type: project
---

The chat bubble on <https://kadaxuanwu.github.io/Theology> is served by a Cloudflare Worker at `https://theology-chat.kadaxuanwu.workers.dev`, deployed 2026-08-26. Code in `worker/`, deployment steps in `worker/README.md`.

**Deployed by hand.** `wrangler deploy` from the `worker` folder, on the user's PC. It is deliberately not in CI, so no Cloudflare token is stored in GitHub. Nothing in `.github/workflows` touches it. A change to anything in `worker/` is not live until someone runs that command, which is easy to forget when a commit touching `worker/` sails through CI green.

**The API key** lives only in Cloudflare, set with `wrangler secret put GEMINI_API_KEY`. Never in the repo, never in the browser. `.dev.vars` is gitignored for local runs.

**Model ids move.** `gemini-2.5-flash-lite` is closed to new Google accounts and returns a 404 telling you to use `gemini-3.5-flash-lite`, which is what `wrangler.toml` now pins. Expect this again. `PROVIDER` and `MODEL` in `wrangler.toml` are the swap points, and `worker/providers.js` holds one async generator per provider.

**The user is in Switzerland**, so Google's regional carve-out applies: the paid data terms cover the free Gemini quota there, and visitors' questions are not used to improve Google's products. That is why the panel's disclaimer only covers accuracy and says nothing about data. If the account ever moves out of the EEA, Switzerland or the UK, that disclaimer needs a sentence added.

**Two invariants worth not breaking.** `dist/chat-corpus.json` is the only unhashed file in `dist/`, because the Worker fetches it by a fixed URL every ten minutes, which is what lets notes change daily without redeploying the Worker. And `CHAT_ENDPOINT` in `site/build.mjs` can be set empty to build with no bubble at all, which is what a fork gets. Both are covered by checks in `site/test.mjs`. See [[site-build]].

**The model never sees a url.** The catalogue lists titles only, the model writes `[[Title]]`, and `resolveLinks` in `worker/context.js` turns that into a url from the corpus. Any markdown link the model writes anyway is flattened to plain words first, because it could only have guessed the slug. This is also why `splitAtOpenLink` in `worker/index.js` holds half written brackets back: the page rebuilds its markup from the whole answer on every chunk, so two halves would otherwise meet there and link somewhere wrong.

**Measured on 2026-08-26, at 28 notes.** A question costs 7,000 to 8,200 tokens. The catalogue plus system prompt is 2,043 of that and is the only part identical between requests. Real ratio is about 4.24 characters per token, not the 3.7 usually assumed.

**The free tier stalls, and the stalls cluster.** Roughly a quarter to a half of requests fail to produce a first token for over twenty seconds, while the rest answer in two or three. Spacing requests 25 seconds apart does not change it, so it is not rate limiting; the rate also varies by the hour, so no single percentage is stable. `thinking_level: low` fixed the fast path, which was previously anywhere from 0.7s to 56s.

The important part, because it is easy to get wrong twice: **stalls are not independent.** Of four first-attempt stalls measured in one batch, two stalled again on the retry, against the ~30% you would predict from independence. They come in bad windows. A retry therefore halves failures rather than reducing them by the square, which is what an independence assumption predicts and what was wrongly promised before measuring. Do not model this as independent when reasoning about a third attempt or a longer timeout.

**Full Flash was tried and reverted. Do not try it again without reading this.** `gemini-3.6-flash` genuinely fixes the stalls: fourteen timed requests, none over 17.5s, versus Flash Lite stalling on half. It is still the wrong model, because the free tier gives it **20 requests per day** against Flash Lite's 500. Twenty questions a day is the entire site's allowance across every visitor. Latency was measured first and the daily cap was not checked until the user opened their dashboard, which is the mistake to avoid repeating: check the RPD column before measuring anything else.

Google does not publish these numbers. They are at <https://aistudio.google.com/rate-limit> per project. Read 2026-08-26: 3.6 Flash is 5 RPM / 20 RPD, 3.1 Flash Lite is ~15 RPM / 500 RPD, both about 250K input tokens per minute.

**Implicit caching is not firing yet, and that is expected.** Gemini 3.x needs a shared prefix of 4,096 tokens; the catalogue is half that at this size. It should engage on its own somewhere past roughly 100 notes, with no code change, because the prompt already puts the stable content first and the bodies last. Re-check with `wrangler tail` around then rather than assuming. If it still reports no `cachedContentTokenCount` once the catalogue is well past 4,096, the cause is Flash Lite: it is the one family Google's caching docs omit and there are open reports of implicit caching not firing on it. Switching `MODEL` to a full Flash would be the fix.

**Do not chase tokens further without measuring first.** Bodies are capped at `MAX_NOTES` (8) rather than by characters, because keyword ranking is useful for the first few notes and noise after that. Eight, not fewer, because a question phrased entirely in synonyms ranked the right note seventh. Excerpts stay at 155 characters for the same reason: the second sentence is often a separate idea and is exactly what a half remembered search matches on.
