// Read-only access to a Collaboratory drive (Seafile) library, to help describe
// the files in a dataset. Consolidated from the two experiment scripts:
//   - the token exchange, library lookup and "Bearer" auth are taken from the
//     script that was confirmed to work for uploading a JSON file;
//   - directory listing uses the standard Seafile endpoint
//       GET /api2/repos/{repo_id}/dir/?p=/path
//     which has NOT been tested against drive.ebrains.eu yet (see README note).
//
// REQUIREMENT: the EBRAINS access token passed in must have the
// `collab.drive` scope. The wizard's login currently requests only
// scope: 'openid' (server/routes/auth.js), so the OIDC client must be allowed
// to request `collab.drive` and the login scope extended before this works for
// real users.

const SERVER_URL = 'https://drive.ebrains.eu'

async function request(url, token, accept = 'application/json') {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: accept } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive request failed: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
  }
  return res
}

// Exchange the user's EBRAINS access token for a short-lived drive token.
export async function getDriveToken(ebrainsAccessToken) {
  const res = await request(`${SERVER_URL}/api2/account/token/`, ebrainsAccessToken, 'text/plain')
  return (await res.text()).trim().replace(/^"(.*)"$/, '$1')
}

export async function findLibraryByName(driveToken, name) {
  const res = await request(`${SERVER_URL}/api2/repos/`, driveToken)
  const libs = await res.json()
  return libs.find(l => l.name === name) || null
}

// One directory level: [{ name, type: 'file'|'dir', size, mtime }]
export async function listDirectory(driveToken, repoId, dirPath = '/') {
  const url = `${SERVER_URL}/api2/repos/${repoId}/dir/?p=${encodeURIComponent(dirPath)}`
  const res = await request(url, driveToken)
  return res.json()
}

// Walks the library up to maxDepth / maxEntries (guards against huge datasets)
// and returns flat entries with full paths. File CONTENTS are never read.
export async function walkLibrary(driveToken, repoId, { maxDepth = 4, maxEntries = 2000 } = {}) {
  const out = []
  async function visit(dirPath, depth) {
    if (depth > maxDepth || out.length >= maxEntries) return
    const entries = await listDirectory(driveToken, repoId, dirPath)
    for (const e of entries) {
      if (out.length >= maxEntries) return
      const full = (dirPath === '/' ? '' : dirPath) + '/' + e.name
      out.push({ path: full, type: e.type, size: e.size ?? null })
      if (e.type === 'dir') await visit(full, depth + 1)
    }
  }
  await visit('/', 0)
  return { entries: out, truncated: out.length >= maxEntries }
}

// Compact, names-only text summary suitable for pasting into an AI prompt:
// folder tree plus file counts per extension. Deliberately omits contents.
export function summarizeTree({ entries, truncated }) {
  const exts = {}
  for (const e of entries.filter(x => x.type === 'file')) {
    const m = e.path.match(/\.([^./]+)$/)
    const ext = m ? m[1].toLowerCase() : '(none)'
    exts[ext] = (exts[ext] || 0) + 1
  }
  const dirs = entries.filter(e => e.type === 'dir').map(e => e.path)
  const extLine = Object.entries(exts).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `.${k}: ${v}`).join(', ')
  return [
    `Folders (${dirs.length}):`, ...dirs.slice(0, 200),
    `File counts by extension: ${extLine || 'none'}`,
    truncated ? '(listing truncated — dataset is larger than shown)' : '',
  ].filter(Boolean).join('\n')
}
