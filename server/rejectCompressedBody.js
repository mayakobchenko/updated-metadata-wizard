// CVE-2026-111497: the Brotli decoder of Node.js 22.x before 22.23.4 can be crashed or abused with a crafted stream.
// express.json() would decompress a request body sent with "Content-Encoding: br" by itself, before any login check.
// The wizard's own pages never send compressed requests, so they are refused. Remove this once the image runs a patched Node.js
// (it does no harm to keep it).
export function rejectBrotliBody(req, res, next) {
  const enc = String(req.headers['content-encoding'] || '').toLowerCase()
  if (enc.split(',').some(e => e.trim() === 'br')) {
    return res.status(415).json({ error: 'Content-Encoding "br" is not accepted.' })
  }
  next()
}
