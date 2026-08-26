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

## Testing locally

```bash
wrangler dev
```

Needs a `.dev.vars` file next to this one holding `GEMINI_API_KEY=...`. That
file is gitignored.

The parts that decide what the model reads are in `context.js` and have no
Cloudflare dependencies, so they are covered by `site/test.mjs` and run in CI
without any of the above.
