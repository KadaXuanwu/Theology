// Escaping, for the two places the client builds its own markup: the search
// results and the tag filter. Both put note titles and body text into html, so
// both have to escape it first.

export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  )

// For a search term that is about to become a regular expression.
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
