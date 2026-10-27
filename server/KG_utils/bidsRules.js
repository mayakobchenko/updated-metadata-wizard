// BIDS (Brain Imaging Data Structure) knowledge for the file-structure draft of the Data Descriptor.
// Used only when "BIDS" is ticked in Dataset part 1. Works on file and folder NAMES only:
//   describeBidsFile(name)       -> short description from the BIDS file-name suffix (or '' if unknown)
//   bidsDirNote(name, parent)    -> short description of a folder name (sub-01, ses-01, anat, derivatives, ...)
//   bidsChecks(objects, partial) -> [{ level: 'error'|'warn'|'info', text }] about what a BIDS dataset needs
// Reference: https://bids-specification.readthedocs.io

const IMAGE = {
  T1w: 'T1-weighted anatomical image', T2w: 'T2-weighted anatomical image', FLAIR: 'FLAIR anatomical image',
  PDw: 'proton-density-weighted anatomical image', T2starw: 'T2*-weighted anatomical image', T1map: 'quantitative T1 map',
  T2map: 'quantitative T2 map', T2starmap: 'quantitative T2* map', R1map: 'quantitative R1 map', R2map: 'quantitative R2 map',
  PDmap: 'proton-density map', MTRmap: 'magnetization-transfer ratio map', MTsat: 'magnetization-transfer saturation map',
  SWImagandphase: 'susceptibility-weighted image', angio: 'angiography image', defacemask: 'defacing mask', inplaneT1: 'in-plane T1-weighted image',
  inplaneT2: 'in-plane T2-weighted image', UNIT1: 'MP2RAGE uniform T1-weighted image', MP2RAGE: 'MP2RAGE image',
  bold: 'BOLD functional MRI time series', cbv: 'cerebral blood volume functional MRI', sbref: 'single-band reference image',
  dwi: 'diffusion-weighted image', phasediff: 'phase-difference field map', phase1: 'phase image of the first echo', phase2: 'phase image of the second echo',
  magnitude: 'magnitude image for the field map', magnitude1: 'magnitude image of the first echo', magnitude2: 'magnitude image of the second echo',
  fieldmap: 'field map', epi: 'spin-echo field map (EPI)', asl: 'arterial spin labelling perfusion image', m0scan: 'ASL calibration (M0) image',
  pet: 'PET image', mask: 'binary mask', dseg: 'segmentation', probseg: 'probabilistic segmentation',
  // electrophysiology and others
  eeg: 'EEG recording', meg: 'MEG recording', ieeg: 'intracranial EEG recording', emg: 'EMG recording', beh: 'behavioural data', nirs: 'NIRS recording',
  motion: 'motion-capture recording', headshape: 'head-shape digitisation', photo: 'photograph',
  // microscopy
  BF: 'bright-field microscopy image', DF: 'dark-field microscopy image', PC: 'phase-contrast microscopy image', DIC: 'differential interference contrast image',
  FLUO: 'fluorescence microscopy image', CONF: 'confocal microscopy image', PLI: 'polarised light image', CARS: 'CARS microscopy image',
  '2PE': 'two-photon excitation image', MPE: 'multi-photon excitation image', SR: 'super-resolution image', NLO: 'nonlinear optical image',
  OCT: 'optical coherence tomography image', SPIM: 'light-sheet microscopy image', SEM: 'scanning electron microscopy image', TEM: 'transmission electron microscopy image',
  uCT: 'micro-CT image',
}
const TABLE = {
  events: 'task events (onset, duration, trial type)', channels: 'channel descriptions', electrodes: 'electrode positions', optodes: 'optode positions',
  scans: 'list of scans with acquisition times', sessions: 'list of sessions', physio: 'physiological recording (cardiac, respiratory)', stim: 'continuous stimulus recording',
  blood: 'blood measurements', aslcontext: 'ASL volume types', markers: 'markers', samples: 'list of samples', participants: 'participant information',
}
const OTHER = {
  coordsystem: 'coordinate system of the electrode/sensor positions',
}

// 'sub-01_ses-02_task-rest_run-1_bold.nii.gz' -> { entities: { sub:'01', ses:'02', task:'rest', run:'1' }, suffix:'bold', ext:'nii.gz' }
function parse(name) {
  const dot = name.indexOf('.')
  if (dot <= 0) return null
  const base = name.slice(0, dot), ext = name.slice(dot + 1).toLowerCase()
  const parts = base.split('_')
  if (parts.length < 2 || !parts[0].startsWith('sub-')) return null
  const suffix = parts[parts.length - 1]
  if (suffix.includes('-')) return null
  const entities = {}
  for (const p of parts.slice(0, -1)) { const i = p.indexOf('-'); if (i > 0) entities[p.slice(0, i)] = p.slice(i + 1) }
  return { entities, suffix, ext }
}

export function describeBidsFile(name) {
  const p = parse(name)
  if (!p) return ''
  const { entities: e, suffix, ext } = p
  if (ext === 'bval') return 'diffusion b-values'
  if (ext === 'bvec') return 'diffusion gradient directions'
  const what = IMAGE[suffix] || TABLE[suffix] || OTHER[suffix]
  if (!what) return ''
  const task = e.task ? `; task: ${e.task}` : ''
  if (ext === 'json') {
    if (TABLE[suffix] || OTHER[suffix]) return `column and metadata description of the ${what}`
    return `JSON sidecar: acquisition parameters and metadata of the ${what}${task}`
  }
  if (ext === 'tsv' || ext === 'tsv.gz') return TABLE[suffix] ? `${what}${task}` : `table belonging to the ${what}`
  return `${what}${task}`
}

const DATATYPE = {
  anat: 'anatomical MRI', func: 'functional MRI', dwi: 'diffusion MRI', fmap: 'field maps (distortion correction)', perf: 'perfusion MRI (ASL)',
  eeg: 'EEG data', meg: 'MEG data', ieeg: 'intracranial EEG data', emg: 'EMG data', beh: 'behavioural data', pet: 'PET data', micr: 'microscopy data',
  nirs: 'near-infrared spectroscopy data', motion: 'motion-capture data', mrs: 'MR spectroscopy data', phenotype: 'phenotypic and assessment data',
}
const TOP = {
  derivatives: 'processed data derived from the raw data; one subfolder per processing pipeline',
  sourcedata: 'original data before conversion to BIDS',
  code: 'code used to produce or process the data',
  stimuli: 'stimulus files shared across participants',
  phenotype: 'phenotypic and assessment data (tables)',
}

export function bidsDirNote(name, parent = '') {
  if (/^sub-[A-Za-z0-9]+$/.test(name)) return 'data of one participant'
  if (/^ses-[A-Za-z0-9]+$/.test(name)) return 'data of one session'
  if (parent === 'derivatives') return 'output of one processing pipeline'
  if (DATATYPE[name]) return DATATYPE[name]
  if (!parent && TOP[name]) return TOP[name]
  return ''
}

const DATATYPE_FOLDERS = new Set(Object.keys(DATATYPE))
const TOP_FOLDERS = new Set(Object.keys(TOP).concat(['extra_data']))
const TOP_FILES = /^(dataset_description\.json|readme(\.md|\.txt|\.rst)?|changes(\.md|\.txt)?|license(\.md|\.txt|\.pdf)?|citation\.cff|genetic_info\.json|\.bidsignore|participants\.(tsv|json)|samples\.(tsv|json)|.*_(coordsystem|scans|sessions)\.(json|tsv)|[a-z0-9]+\.json|task-.*|\.gitattributes|\.gitignore|\.datalad.*)$/i

const list = (arr, n = 3) => arr.slice(0, n).join(', ') + (arr.length > n ? `, … (${arr.length} in total)` : '')

export function bidsChecks(objects, partial = false) {
  const paths = objects.map(o => String(o.name).split('/').filter(Boolean)).filter(p => p.length)
  const out = []
  const note = partial ? ' (only part of the bucket was read, so it may be there)' : ''
  const level = (l) => (partial && l === 'error' ? 'warn' : l)

  const rootFiles = paths.filter(p => p.length === 1).map(p => p[0])
  const topDirs = [...new Set(paths.filter(p => p.length > 1).map(p => p[0]))]
  const subDirs = topDirs.filter(d => d.startsWith('sub-'))

  if (!rootFiles.includes('dataset_description.json')) {
    const deeper = paths.find(p => p.length > 1 && p[p.length - 1] === 'dataset_description.json' && !['derivatives', 'sourcedata', 'code'].includes(p[0]))
    out.push({ level: level('error'), text: deeper
      ? `dataset_description.json (required) is not at the top level of the bucket but in “${deeper.slice(0, -1).join('/')}”. The BIDS dataset should start at the top of the bucket, or the bucket contains more than the BIDS dataset.`
      : `The required file dataset_description.json was not found at the top level${note}.` })
  }
  if (!rootFiles.some(f => /^readme(\.(md|txt|rst))?$/i.test(f))) out.push({ level: 'warn', text: `No README at the top level (strongly recommended)${note}.` })
  if (subDirs.length && !rootFiles.some(f => /^participants\.tsv$/i.test(f))) out.push({ level: 'warn', text: `No participants.tsv at the top level (recommended: one row per participant)${note}.` })

  if (!subDirs.length) {
    out.push({ level: level('error'), text: `No sub-<label> folders at the top level. In BIDS the data of each participant are in a folder sub-<label>/ (for example sub-01/) directly at the top of the dataset${note}.` })
  } else {
    const badLabel = subDirs.filter(d => !/^sub-[A-Za-z0-9]+$/.test(d))
    if (badLabel.length) out.push({ level: 'warn', text: `Participant folders must be named sub- followed by letters and digits only (no “-”, “_” or spaces): ${list(badLabel)}.` })

    const badFiles = [], badDirs = new Set()
    for (const p of paths) {
      if (p.length < 2 || !p[0].startsWith('sub-')) continue
      const file = p[p.length - 1]
      if (!file.startsWith('.') && !file.startsWith(`${p[0]}_`)) badFiles.push(p.join('/'))
      // folders directly in sub-X or sub-X/ses-Y must be a session or a data type
      const dirs = p.slice(1, -1)
      const first = dirs[0]
      if (first && !/^ses-/.test(first) && !DATATYPE_FOLDERS.has(first)) badDirs.add(first)
      const second = /^ses-/.test(first || '') ? dirs[1] : null
      if (second && !DATATYPE_FOLDERS.has(second)) badDirs.add(second)
    }
    if (badFiles.length) out.push({ level: 'warn', text: `${badFiles.length} file${badFiles.length === 1 ? '' : 's'} inside participant folders do not start with the participant label (for example sub-01_…): ${list(badFiles, 2)}.` })
    if (badDirs.size) out.push({ level: 'warn', text: `Folders that are not BIDS data types (anat, func, dwi, fmap, eeg, meg, ieeg, beh, pet, micr, …) or sessions (ses-<label>) inside participant folders: ${list([...badDirs])}.` })
  }

  const otherDirs = topDirs.filter(d => !d.startsWith('sub-') && !TOP_FOLDERS.has(d))
  if (otherDirs.length) out.push({ level: 'warn', text: `Top-level folders that are not part of BIDS: ${list(otherDirs)}. Raw data belong in sub-<label>/, other material in /sourcedata, /derivatives or /code (or list them in .bidsignore).` })
  // the data descriptor, licence and preview image are added by the EBRAINS curation, so they are not mentioned
  const otherFiles = rootFiles.filter(f => !TOP_FILES.test(f) && !/^(data[-_ ]?descriptor|licen[cs]e|preview[-_ ]?image)/i.test(f))
  if (otherFiles.length) out.push({ level: 'info', text: `Top-level files that BIDS does not define: ${list(otherFiles)}. This is allowed if they are listed in .bidsignore.` })

  out.push({ level: 'info', text: 'This check looks at folder and file names only. For a complete check run the BIDS validator (https://bids-validator.readthedocs.io).' })
  return out
}
