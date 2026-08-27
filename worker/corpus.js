// The vault, fetched from the published site and held for a while.
//
// This is what lets notes change daily while the Worker itself sits untouched:
// the corpus is a normal build artefact served at a fixed URL, so a deploy of
// the site is a content update here, with no wrangler deploy involved.

export function createCorpusReader({ ttlMs }) {
  let cache = { at: 0, data: null }

  return async function loadCorpus(env) {
    const now = Date.now()
    if (cache.data && now - cache.at < ttlMs) return cache.data

    const response = await fetch(env.CORPUS_URL, { cf: { cacheTtl: Math.round(ttlMs / 1000) } })
    if (!response.ok) {
      // A stale corpus answers better than an error page does.
      if (cache.data) return cache.data
      throw new Error(`corpus fetch failed: ${response.status}`)
    }

    cache = { at: now, data: await response.json() }
    return cache.data
  }
}
