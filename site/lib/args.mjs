// Command line flags, in one place.
//
// Three entry points take them and all three want the same shape: `--name
// value`, with a fallback when the flag is absent or has nothing after it.

export const readFlags =
  (argv = process.argv.slice(2)) =>
  (name, fallback) => {
    const i = argv.indexOf(`--${name}`)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
  }
