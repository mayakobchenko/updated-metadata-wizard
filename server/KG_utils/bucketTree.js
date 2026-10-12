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

// 'sub-001' and 'sub-002' share the signature 'sub-X'
const dirSignature = (name) => name.replace(/\d+/g, 'X')

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

// opts: maxFiles = files listed individually per folder before grouping,
//       examples = example names kept per group, placeholders = add "[ ]" slots
function renderNode(node, prefix, lines, opts) {
  const { maxFiles, examples, placeholders } = opts
  const entries = []

  // sibling folders with the same name pattern (sub-001, sub-002, ...) -> show one
  const groups = new Map()
  for (const [name, child] of node.dirs) {
    const sig = dirSignature(name)
    if (!groups.has(sig)) groups.set(sig, [])
    groups.get(sig).push([name, child])
  }
  for (const members of groups.values()) {
    members.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    if (members.length >= 3 && members[0][0] !== dirSignature(members[0][0])) {
      const [first] = members
      const total = members.reduce((s, m) => s + m[1].count, 0)
      entries.push({
        kind: 'dir', name: first[0], node: first[1],
        note: `${members.length} similar folders: ${first[0]} … ${members[members.length - 1][0]}; ${total} files in total`,
      })
    } else {
      for (const [name, child] of members) entries.push({ kind: 'dir', name, node: child })
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  // files: list them all when few, otherwise group by extension
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  const fileEntries = []
  if (files.length <= maxFiles) {
    for (const f of files) fileEntries.push({ kind: 'file', name: f.name })
  } else {
    const byExt = new Map()
    for (const f of files) {
      const e = extensionOf(f.name)
      if (!byExt.has(e)) byExt.set(e, [])
      byExt.get(e).push(f)
    }
    for (const [ext, list] of byExt) {
      if (list.length <= examples + 1) list.forEach(f => fileEntries.push({ kind: 'file', name: f.name }))
      else {
        list.slice(0, examples).forEach(f => fileEntries.push({ kind: 'file', name: f.name }))
        const bytes = list.reduce((s, f) => s + f.bytes, 0)
        fileEntries.push({ kind: 'more', name: `… ${list.length - examples} more .${ext} files (${list.length} in total, ${humanSize(bytes)})` })
      }
    }
  }

  const all = [...entries, ...fileEntries]
  all.forEach((e, i) => {
    const last = i === all.length - 1
    const branch = last ? '└── ' : '├── '
    const childPrefix = prefix + (last ? '    ' : '│   ')
    if (e.kind === 'dir') {
      const meta = e.note ? ` (${e.note})` : ` (${e.node.count} file${e.node.count === 1 ? '' : 's'})`
      lines.push(`${prefix}${branch}${e.name}/${meta}${placeholders ? '' : ''}`)
      renderNode(e.node, childPrefix, lines, opts)
    } else if (e.kind === 'more') {
      lines.push(`${prefix}${branch}${e.name}${placeholders ? ' [describe files]' : ''}`)
    } else {
      const known = KNOWN_FILES[e.name.toLowerCase()]
      lines.push(`${prefix}${branch}${e.name}${known ? ` [${known}]` : (placeholders ? ' [describe file]' : '')}`)
    }
  })
}

export function buildTree(objects, rootLabel, options = {}) {
  const opts = { maxFiles: 8, examples: 2, placeholders: true, ...options }
  const root = buildTrie(objects)
  const lines = [`${rootLabel}/ (${root.count} files, ${humanSize(root.bytes)})`]
  renderNode(root, '', lines, opts)
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
    format: FORMAT_NAMES[r.ext] || '[format name]', extension: r.ext, files: r.files,
    size: humanSize(r.bytes), example: r.example,
  }))
}

export function formatTableText(rows) {
  const head = ['Format', 'Extension', 'Files', 'Size', 'Software used / file specification']
  const body = rows.map(r => [r.format, r.extension, String(r.files), r.size, '[software / specification; e.g. ' + r.example + ']'])
  const w = head.map((h, i) => Math.max(h.length, ...body.map(b => b[i].length)))
  const line = (cols) => cols.map((c, i) => c.padEnd(w[i])).join('  ').trimEnd()
  return [line(head), line(w.map(n => '-'.repeat(n))), ...body.map(line)].join('\n')
}

// One factual sentence for the SUMMARY (counts, formats, top-level folders only;
// what the data MEAN has to come from the researcher).
export function buildSummarySentence(objects, formats, totalSize) {
  const names = formats.slice(0, 5).map(f =>
    f.format.startsWith('[') ? `.${f.extension} files` : `${f.format} (.${f.extension})`)
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

export function describeBucket(objects, bucketName, options = {}) {
  const tree = buildTree(objects, bucketName, options)
  const formats = buildFormatTable(objects)
  const totalBytes = objects.reduce((s, o) => s + o.bytes, 0)
  const text =
    'The data are stored in the following structure (incl. info on file content):\n\n' + tree +
    '\n\nFile formats:\n\n' + formatTableText(formats)
  const size = humanSize(totalBytes)
  return {
    tree, formats, text,
    summarySentence: buildSummarySentence(objects, formats, size),
    totals: { files: objects.length, bytes: totalBytes, size },
  }
}
