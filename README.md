# JSON Escape Unescape

Escape and unescape JSON string literals with unicode handling, validation, and copy support.

**Live:** [json-escape-unescape.itsjust.tools](https://json-escape-unescape.itsjust.tools)

## Features

- Escape plain text into a valid JSON string literal (`"..."`) — quotes, backslashes and control characters handled correctly
- Unescape JSON string literals back to raw text, with clear error reporting for malformed escapes
- ASCII-only mode converts non-ASCII characters to `\uXXXX` escapes
- Short (`\uXXXX`) vs. long (`\u{...}`-style avoided, astral planes always use surrogate pairs) unicode escaping with full emoji/surrogate pair support
- Live bidirectional conversion as you type, with a swap-direction button
- Character and byte counts for input and output
- Example presets with common edge cases plus copy-to-clipboard buttons
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-json-escape-unescape .
docker run -p 3000:3000 itsjust-json-escape-unescape
```

## License

MIT
