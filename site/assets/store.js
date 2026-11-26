// Reading and writing the few things the site remembers about a reader.
//
// Every one of these can throw rather than return nothing: private mode blocks
// the whole API, and a full quota throws on write. Nothing here is worth an
// error on the page, so a blocked store means the site simply does not
// remember, and each caller is spared the same try/catch.

export function writeText(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* nothing to do, the choice just will not stick */
  }
}

// A set of names: which folders the reader collapsed, which categories they
// switched off. Anything that is not a list of strings is treated as nothing
// stored, so a key another script wrote to cannot break the page.
export function readSet(key, fallback = []) {
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return new Set(fallback)
    const raw = JSON.parse(stored)
    return new Set(Array.isArray(raw) ? raw : fallback)
  } catch {
    return new Set(fallback)
  }
}

export const writeSet = (key, values) => writeText(key, JSON.stringify([...values]))

// Things that belong to this tab and this visit only, like where a list was
// scrolled to. Another tab has its own place in the list, so these do not go
// in localStorage with the choices above.
export function readSession(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* nothing to do, the next page just starts from the top */
  }
}
