// A sliding window counter, one window per address.
//
// In memory, so it resets when the isolate does and does not span Cloudflare
// locations. That makes it a speed bump rather than a guarantee, which is the
// right trade at zero cost: the hard ceiling on spend is that the model account
// has no billing enabled, not this counter.
//
// Note the mismatch it cannot fix. This counter is per address and the model
// quota is per project, so three readers asking two questions each will exhaust
// nothing here and can still hit the provider's daily limit. That is what the
// quota message is for.

// Beyond this many addresses in one isolate, the expired windows are swept. It
// only bounds memory; nothing about the limit itself depends on the number.
const SWEEP_AT = 5000

export function createRateLimiter({ limit, windowMs, sweepAt = SWEEP_AT }) {
  const hits = new Map()

  return function rateLimited(key) {
    const now = Date.now()
    const seen = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    seen.push(now)
    hits.set(key, seen)

    // Keep the map from growing without bound on a long-lived isolate.
    if (hits.size > sweepAt) {
      for (const [other, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(other)
      }
    }
    return seen.length > limit
  }
}
