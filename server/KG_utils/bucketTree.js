// Turns a flat list of bucket objects ({ name: 'a/b/c.txt', bytes }) into the two
// things the EBRAINS Data Descriptor template asks for in "DATA RECORDS":
//   1. a reduced, annotated layout of the file repository (tree),
//   2. a table of file formats (extension, number of files, size, ...).
// Pure functions, no network access: easy to test, and NAMES ONLY are used.

const COMPOUND_EXT = ['nii.gz', 'func.gii', 'label.gii', 'surf.gii', 'shape.gii', 'ome.tif',
  'ome.tiff', 'tar.gz', 'dscalar.nii', 'dlabel.nii', 'ome.zarr']

// Conservative, well-known names only. Anything else is left for the user.
const KNOWN_FILES = {
  'readme': 'general description of the dataset',
  'readme.md': 'general description of the dataset',
  'readme.txt': 'general description of the dataset',
  'changes': 'version history of the dataset',
  'license': 'licence terms',
  'license.pdf': 'licence terms',
  'license.txt': 'licence terms',
  '.bidsignore': 'files that are excluded from BIDS validation',
  'dataset_description.json': 'dataset-level metadata (name, BIDS version, authors)',
  'participants.tsv': 'one row per subject with demographic information',
  'participants.json': 'column descriptions for participants.tsv',
  'samples.tsv': 'one row per sample with sample information',
  'samples.json': 'column descriptions for samples.tsv',
}

const FORMAT_NAMES = {
  json: 'JavaScript Object Notation', tsv: 'Tab-Separated Values', csv: 'Comma-Separated Values',
  txt: 'Plain text', md: 'Markdown text', pdf: 'Portable Document Format',
  'nii.gz': 'NIfTI image (gzip-compressed)', nii: 'NIfTI image', 'func.gii': 'GIFTI functional surface data',
  'label.gii': 'GIFTI label data', gii: 'GIFTI surface data', tif: 'Tagged Image File Format',
  tiff: 'Tagged Image File Format', 'ome.tif': 'OME-TIFF image', png: 'PNG image', jpg: 'JPEG image',
  jpeg: 'JPEG image', h5: 'HDF5', hdf5: 'HDF5', nwb: 'Neurodata Without Borders', mat: 'MATLAB data file',
  edf: 'European Data Format', bdf: 'BioSemi Data Format', vhdr: 'BrainVision header', py: 'Python script',
  m: 'MATLAB script', r: 'R script', ipynb: 'Jupyter notebook', xml: 'Extensible Markup Language',
  zip: 'ZIP archive', 'tar.gz': 'gzip-compressed tar archive', bval: 'diffusion b-values', bvec: 'diffusion gradient directions',
  svg: 'Scalable Vector Graphics', obj: 'Wavefront OBJ mesh', swc: 'SWC neuron morphology', zarr: 'Zarr array store',
}

export function humanSize(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`
}

export function extensionOf(fileName) {
  const lower = fileName.toLowerCase()
  for (const c of COMPOUND_EXT) if (lower.endsWith('.' + c) && lower.length > c.length + 1) return c
  const m = lower.match(/\.([^.]+)$/)
  return m && m.index > 0 ? m[1] : (lower.startsWith('.') ? lower.slice(1) : '(none)')
}

function buildTrie(objects) {
  const root = { dirs: new Map(), files: [], count: 0, bytes: 0 }
  for (const o of objects) {
    const parts = String(o.name).split('/').filter(Boolean)
    if (!parts.length) continue
    const file = parts.pop()
    let node = root
    node.count++; node.bytes += o.bytes
    for (const p of parts) {
      if (!node.dirs.has(p)) node.dirs.set(p, { dirs: new Map(), files: [], count: 0, bytes: 0 })
      node = node.dirs.get(p)
      node.count++; node.bytes += o.bytes
    }
    node.files.push({ name: file, bytes: o.bytes })
  }
  return root
}

// Layout used by the EBRAINS Data Descriptor template: one entry per line, each starting with "/",
// two spaces of indentation per folder level, a short description in square brackets.
//   /repository-root
//     /sub-XXX
//       /sub-XXX_slice-XXXX.tif [brain slice scan of subject XXX]
//
// Big buckets (thousands of files) must stay readable, so the listing is generalised:
//   - files whose names differ only by numbers become ONE line: the common pattern and how many there are,
//   - other files of a crowded folder are grouped by extension (and common name start),
//   - folders with many different names are cut after a few,
//   - deep levels are summarised, and if the whole tree is still too long, stricter levels are tried.
// opts: maxFiles = files listed one by one per folder before grouping, examples = names kept per extension group,
//       maxDirs = folders shown per folder, maxDepth = deepest level that is written out, placeholders = "[ ]" slots
const MAX_LINES = 150
const LEVELS = [
  { maxFiles: 8, examples: 2, maxDirs: 20, maxDepth: 99 },
  { maxFiles: 5, examples: 1, maxDirs: 12, maxDepth: 6 },
  { maxFiles: 3, examples: 1, maxDirs: 8, maxDepth: 4 },
  { maxFiles: 3, examples: 1, maxDirs: 6, maxDepth: 3 },
  { maxFiles: 2, examples: 1, maxDirs: 5, maxDepth: 2 },
]

const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true })

// 'img_0001.tif' and 'img_0002.tif' share the signature 'img_#.tif'
const nameSignature = (name) => name.replace(/\d+/g, '#')

// 'img_0001.tif' … 'img_1234.tif' -> 'img_XXXX.tif' (numbers of varying length: as many X as the longest)
function patternOf(names) {
  const parts = names.map(n => n.split(/(\d+)/))
  return parts[0].map((p, i) => {
    if (i % 2 === 0) return p
    return 'X'.repeat(Math.max(...parts.map(x => x[i].length)))
  }).join('')
}

function commonStart(names) {
  let p = names[0]
  for (const n of names) { while (p && !n.startsWith(p)) p = p.slice(0, -1) }
  return p
}

function fileEntriesOf(files, opts) {
  const sorted = [...files].sort((a, b) => natural(a.name, b.name))
  const one = (f) => ({ kind: 'file', name: f.name })
  if (sorted.length <= opts.maxFiles) return sorted.map(one)

  const out = []
  const bySig = new Map()
  for (const f of sorted) {
    const sig = nameSignature(f.name)
    if (!bySig.has(sig)) bySig.set(sig, [])
    bySig.get(sig).push(f)
  }
  const loose = []
  for (const list of bySig.values()) {
    if (list.length >= 3) {
      const bytes = list.reduce((s, f) => s + f.bytes, 0)
      out.push({
        kind: 'series', name: patternOf(list.map(f => f.name)),
        note: `${list.length} files named like ${list[0].name} … ${list[list.length - 1].name}, ${humanSize(bytes)}`,
      })
    } else loose.push(...list)
  }
  out.sort((a, b) => natural(a.name, b.name))

  if (out.length + loose.length <= opts.maxFiles) return [...out, ...loose.map(one)]

  // the rest: group by extension, keep a few examples, say what the names have in common
  const byExt = new Map()
  for (const f of loose) {
    const e = extensionOf(f.name)
    if (!byExt.has(e)) byExt.set(e, [])
    byExt.get(e).push(f)
  }
  for (const [ext, list] of byExt) {
    if (list.length <= opts.examples + 1) { list.forEach(f => out.push(one(f))); continue }
    list.slice(0, opts.examples).forEach(f => out.push(one(f)))
    const bytes = list.reduce((s, f) => s + f.bytes, 0)
    const start = commonStart(list.map(f => f.name))
    out.push({
      kind: 'more', name: `… ${list.length - opts.examples} more .${ext} files`,
      note: `${list.length} .${ext} files in total, ${humanSize(bytes)}${start.length >= 3 ? `; names start with "${start}"` : ''}`,
    })
  }
  return out
}

function renderNode(node, depth, lines, opts) {
  const pad = '  '.repeat(depth)
  const entries = []

  // sibling folders with the same name pattern (sub-001, sub-002, ...) -> show one
  const groups = new Map()
  for (const [name, child] of node.dirs) {
    const sig = nameSignature(name)
    if (!groups.has(sig)) groups.set(sig, [])
    groups.get(sig).push([name, child])
  }
  for (const members of groups.values()) {
    members.sort((a, b) => natural(a[0], b[0]))
    if (members.length >= 3 && /\d/.test(members[0][0])) {
      const [first] = members
      entries.push({
        kind: 'dir', name: first[0], node: first[1],
        note: `${members.length} similar folders: ${first[0]} … ${members[members.length - 1][0]}`,
      })
    } else {
      for (const [name, child] of members) entries.push({ kind: 'dir', name, node: child })
    }
  }
  entries.sort((a, b) => natural(a.name, b.name))

  // very many differently named folders: keep the first ones, summarise the rest
  let cut = null
  if (entries.length > opts.maxDirs) {
    const keep = Math.max(3, Math.floor(opts.maxDirs / 2))
    const rest = entries.splice(keep)
    const files = rest.reduce((s, e) => s + e.node.count, 0)
    const bytes = rest.reduce((s, e) => s + e.node.bytes, 0)
    cut = { kind: 'dirs-more', name: `… ${rest.length} more folders`,
      note: `${rest[0].name} … ${rest[rest.length - 1].name}; ${files} files in total, ${humanSize(bytes)}` }
  }

  const fileEntries = fileEntriesOf(node.files, opts)

  for (const e of [...entries, ...(cut ? [cut] : []), ...fileEntries]) {
    if (e.kind === 'dir') {
      const deep = depth + 1 > opts.maxDepth && (e.node.dirs.size || e.node.files.length)
      const note = [e.note, deep ? `${e.node.count} files, ${humanSize(e.node.bytes)}; contents not listed in detail` : ''].filter(Boolean).join('; ')
      lines.push(`${pad}/${e.name}${note ? ` [${note}]` : ''}`)
      if (!deep) renderNode(e.node, depth + 1, lines, opts)
    } else if (e.kind === 'dirs-more') {
      lines.push(`${pad}/${e.name} [${e.note}${opts.placeholders ? '; describe the folders' : ''}]`)
    } else if (e.kind === 'series' || e.kind === 'more') {
      lines.push(`${pad}/${e.name} [${e.note}${opts.placeholders ? '; describe the files' : ''}]`)
    } else {
      const known = KNOWN_FILES[e.name.toLowerCase()]
      lines.push(`${pad}/${e.name}${known ? ` [${known}]` : (opts.placeholders ? ' [describe file]' : '')}`)
    }
  }
}

export function buildTree(objects, rootLabel = 'repository-root', options = {}) {
  const root = buildTrie(objects)
  const levels = Object.keys(options).length ? [{ ...LEVELS[0], ...options }] : LEVELS
  let lines = []
  for (const level of levels) {
    lines = [`/${rootLabel}`]
    renderNode(root, 1, lines, { placeholders: true, ...level })
    if (lines.length <= MAX_LINES) break
  }
  if (lines.length > MAX_LINES) {
    const total = lines.length
    lines = [...lines.slice(0, MAX_LINES), `/… [${total - MAX_LINES} more lines left out; the bucket is very large]`]
  }
  return lines.join('\n')
}

export function buildFormatTable(objects) {
  const byExt = new Map()
  for (const o of objects) {
    const file = String(o.name).split('/').pop()
    const ext = extensionOf(file)
    const row = byExt.get(ext) || { ext, files: 0, bytes: 0, example: file }
    row.files++; row.bytes += o.bytes
    byExt.set(ext, row)
  }
  return [...byExt.values()].sort((a, b) => b.files - a.files).map(r => ({
    format: FORMAT_NAMES[r.ext] || '', extension: r.ext, files: r.files,
    size: humanSize(r.bytes), example: r.example,
  }))
}

export function formatTableText(rows) {
  const head = ['Format', 'Extension', 'Files', 'Size', 'Software used / file specification']
  const body = rows.map(r => [r.format || '[format name]', r.extension, String(r.files), r.size, '[software / specification; e.g. ' + r.example + ']'])
  const w = head.map((h, i) => Math.max(h.length, ...body.map(b => b[i].length)))
  const line = (cols) => cols.map((c, i) => c.padEnd(w[i])).join('  ').trimEnd()
  return [line(head), line(w.map(n => '-'.repeat(n))), ...body.map(line)].join('\n')
}

// One factual sentence for the SUMMARY (counts, formats, top-level folders only;
// what the data MEAN has to come from the researcher).
export function buildSummarySentence(objects, formats, totalSize) {
  const names = formats.slice(0, 5).map(f =>
    !f.format ? `.${f.extension} files` : `${f.format} (.${f.extension})`)
  const more = formats.length > 5 ? ` and ${formats.length - 5} other format${formats.length - 5 === 1 ? '' : 's'}` : ''
  const top = new Set()
  for (const o of objects) {
    const parts = String(o.name).split('/').filter(Boolean)
    if (parts.length > 1) top.add(parts[0])
  }
  const folders = [...top].sort()
  const folderText = folders.length
    ? `, organised in ${folders.length} top-level folder${folders.length === 1 ? '' : 's'} (${folders.slice(0, 6).join(', ')}${folders.length > 6 ? ', …' : ''})`
    : ''
  return `The shared data comprise ${objects.length} file${objects.length === 1 ? '' : 's'} (${totalSize}) in ${formats.length} file format${formats.length === 1 ? '' : 's'}: ${names.join(', ')}${more}${folderText}.`
}

// options.partial: the listing stopped early (very large bucket). The counts are then only lower bounds, so no
// ready-made sentence about the number of files is offered; the researcher writes it.
export function describeBucket(objects, bucketName, options = {}) {
  const { partial = false, ...treeOptions } = options
  const tree = buildTree(objects, 'repository-root', treeOptions)
  const formats = buildFormatTable(objects)
  const totalBytes = objects.reduce((s, o) => s + o.bytes, 0)
  const text =
    'The data are stored in the following structure (incl. info on file content):\n\n' + tree +
    '\n\nFile formats:\n\n' + formatTableText(formats)
  const size = humanSize(totalBytes)
  return {
    tree, formats, text,
    summarySentence: partial ? '' : buildSummarySentence(objects, formats, size),
    totals: { files: objects.length, bytes: totalBytes, size },
  }
}
