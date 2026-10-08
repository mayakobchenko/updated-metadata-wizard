// READ-ONLY access to an EBRAINS data-proxy bucket (where dataset files live),
// used to give a researcher's AI assistant a NAMES-ONLY picture of the dataset
// structure. File contents are never downloaded.
//
// Mirrors the EBRAINS curators' own scripts (get_data_proxy_objlist.py,
// EBRAINS-data-upload.py): the user's EBRAINS access token is sent directly as
// `Authorization: Bearer`, the bucket is named `d-<datasetVersionUUID>`, and
// listing pages through results with `marker` = the last object name returned.
//
// Deliberately NO upload / delete helpers here: the destructive scripts
// (e.g. EBRAINS_bucket_del_all_files.py) must never be reachable from the wizard.
//
// OPEN QUESTION: the token must be accepted by data-proxy for the user's
// bucket. The wizard's login currently requests only scope 'openid'; whether
// that suffices has to be tested with bucket_probe.py before wiring a route.

const API = 'https://data-proxy.ebrains.eu/api/v1/buckets/'

function headers(token) {
  return { accept: 'application/json', Authorization: `Bearer ${token}` }
}

export function bucketNameFor(datasetVersionId) {
  const id = String(datasetVersionId || '').trim()
  return id.startsWith('d-') ? id : `d-${id}`
}

// { objects_count, bytes, ... } — also serves as a "does this token work?" check.
export async function statBucket(token, bucket) {
  const res = await fetch(`${API}${encodeURIComponent(bucket)}/stat`, { headers: headers(token) })
  if (!res.ok) throw new Error(`data-proxy stat failed: ${res.status} ${res.statusText}`)
  return res.json()
}

// Pages through the bucket (iteratively, unlike the recursive Python version,
// so a huge bucket cannot overflow the stack). Stops at maxObjects.
export async function listObjects(token, bucket, { prefix = '', maxObjects = 20000 } = {}) {
  const objects = []
  let marker = ''
  let truncated = false
  for (;;) {
    const qs = new URLSearchParams({ limit: '0' })
    if (prefix) qs.set('prefix', prefix)
    if (marker) qs.set('marker', marker)
    const res = await fetch(`${API}${encodeURIComponent(bucket)}?${qs}`, { headers: headers(token) })
    if (!res.ok) throw new Error(`data-proxy list failed: ${res.status} ${res.statusText}`)
    const page = (await res.json()).objects || []
    if (page.length === 0) break
    for (const o of page) objects.push({ name: o.name, bytes: Number(o.bytes) || 0 })
    marker = page[page.length - 1].name
    if (objects.length >= maxObjects) { truncated = true; break }
  }
  return { objects, truncated }
}

function humanSize(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`
}

// Compact text for an AI prompt: folder tree (to `depth`) with file counts and
// sizes, a few example file names per folder (so naming patterns are visible),
// and counts per file extension.
export function summarizeObjects({ objects, truncated }, { depth = 3, examples = 3 } = {}) {
  if (!objects.length) return 'The bucket is empty or the folder does not exist.'
  const exts = {}
  const folders = new Map() // folder path -> { files, bytes, names[] }
  let totalBytes = 0

  for (const o of objects) {
    totalBytes += o.bytes
    const parts = o.name.split('/')
    const file = parts.pop()
    const m = file.match(/\.([^.]+)$/)
    const ext = m ? m[1].toLowerCase() : '(none)'
    exts[ext] = (exts[ext] || 0) + 1

    const folder = parts.slice(0, depth).join('/') || '(top level)'
    const f = folders.get(folder) || { files: 0, bytes: 0, names: [] }
    f.files++; f.bytes += o.bytes
    if (f.names.length < examples) f.names.push(file)
    folders.set(folder, f)
  }

  const lines = [
    `${objects.length}${truncated ? '+' : ''} files, ${humanSize(totalBytes)} in total.`,
    'Folders (files, size, example names):',
    ...[...folders.entries()].sort().slice(0, 150).map(
      ([p, f]) => `- ${p}/  (${f.files} files, ${humanSize(f.bytes)}; e.g. ${f.names.join(', ')})`),
    'Files by extension: ' + Object.entries(exts).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `.${k}: ${v}`).join(', '),
  ]
  if (truncated) lines.push('(listing truncated: the bucket is larger than shown)')
  return lines.join('\n')
}
