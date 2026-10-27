// NWB (Neurodata Without Borders) knowledge for the file-structure draft of the Data Descriptor.
// Used only when "NWB" is ticked in Dataset part 1. Works on file and folder NAMES only:
//   describeNwbFile(name)       -> short description of an .nwb file (from the DANDI naming convention if it is used)
//   nwbDirNote(name)            -> short description of a folder name (sub-<label> in the DANDI layout)
//   nwbChecks(objects, partial) -> [{ level: 'error'|'warn'|'info', text }]
// Reference: https://nwb-overview.readthedocs.io  (file layout and naming as used by the DANDI archive:
// sub-<label>/sub-<label>_ses-<label>[_<entity>-<label>]_<modality>.nwb, modality e.g. ecephys, icephys, ophys, behavior)

const MODALITY = {
  ecephys: 'extracellular electrophysiology recording', icephys: 'intracellular electrophysiology recording',
  ophys: 'optical physiology recording (e.g. calcium imaging)', behavior: 'behavioural data', ogen: 'optogenetic stimulation data',
  image: 'imaging data', slice: 'slice recording',
}
const NWB_FILE = /\.nwb$/i

export function describeNwbFile(name) {
  const lower = name.toLowerCase()
  if (lower === 'dandiset.yaml') return 'DANDI dataset metadata'
  if (!NWB_FILE.test(name)) return ''
  const base = name.replace(NWB_FILE, '')
  const last = base.split('_').pop().toLowerCase()
  const kinds = last.split('+').filter(k => MODALITY[k])
  const what = kinds.length && kinds.length === last.split('+').length
    ? `NWB file: ${kinds.map(k => MODALITY[k]).join(' and ')}`
    : 'NWB file: neurophysiology data and metadata in one HDF5 file'
  return what
}

export function nwbDirNote(name) {
  return /^sub-[A-Za-z0-9]+$/.test(name) ? 'NWB files of one subject' : ''
}

const list = (arr, n = 3) => arr.slice(0, n).join(', ') + (arr.length > n ? `, … (${arr.length} in total)` : '')

export function nwbChecks(objects, partial = false) {
  const out = []
  const note = partial ? ' (only part of the bucket was read, so it may be there)' : ''
  const paths = objects.map(o => String(o.name).split('/').filter(Boolean)).filter(p => p.length)
  const nwb = paths.filter(p => NWB_FILE.test(p[p.length - 1]))
  const other = paths.filter(p => !NWB_FILE.test(p[p.length - 1]))
  const NOT_DATA = /\.(md|txt|rst|pdf|json|yaml|yml|csv|tsv|png|jpg|jpeg|svg)$|^(readme|licen[cs]e|dandiset)/i

  if (!nwb.length) {
    out.push({ level: partial ? 'warn' : 'error', text: `No .nwb files were found in the bucket${note}. NWB data are stored in files with the extension .nwb.` })
    return out
  }
  const dataOther = other.filter(p => !NOT_DATA.test(p[p.length - 1]))
  if (dataOther.length) {
    const exts = [...new Set(dataOther.map(p => (p[p.length - 1].match(/\.([^.]+)$/) || [, '(none)'])[1].toLowerCase()))]
    out.push({ level: 'warn', text: `${dataOther.length} data file${dataOther.length === 1 ? ' is' : 's are'} not in NWB format (${list(exts.map(e => '.' + e), 4)}). If they are part of the dataset, describe them in the file structure, or convert them to NWB.` })
  }
  const loose = nwb.filter(p => !/^sub-[A-Za-z0-9]+$/.test(p[0]) || p.length < 2)
  if (loose.length) {
    out.push({ level: 'info', text: `${loose.length} .nwb file${loose.length === 1 ? ' is' : 's are'} not inside a sub-<label> folder (for example ${list(loose.map(p => p.join('/')), 2)}). This is allowed; the DANDI archive expects sub-<label>/sub-<label>_….nwb.` })
  }
  const unnamed = nwb.filter(p => !/^sub-[A-Za-z0-9]+_/.test(p[p.length - 1]))
  if (unnamed.length && unnamed.length !== loose.length) {
    out.push({ level: 'info', text: `${unnamed.length} .nwb file name${unnamed.length === 1 ? '' : 's'} do not start with sub-<label>_ (for example ${list(unnamed.map(p => p[p.length - 1]), 2)}).` })
  }
  out.push({ level: 'info', text: `${nwb.length} .nwb file${nwb.length === 1 ? '' : 's'} found. This check looks at file names only. For a complete check run NWB Inspector (https://nwbinspector.readthedocs.io).` })
  return out
}
