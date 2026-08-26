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
