// Normalises a Metadata Wizard JSON file BEFORE it is loaded into the form.
//
// Why: the exported JSON is not identical to what the form widgets use.
//  - "What type of data would you like to share?" (dataset1.optionsData): the
//    export replaces the checkbox labels ("Raw data") with KG URLs
//    (https://kg.ebrains.eu/api/instances/<uuid>) via mapDataset1OptionsToIds.
//    The checkboxes only know labels, so after an import none was ticked.
//    We map the KG URLs back to the labels.
//  - "Data organization standard(s)" (dataset1.dataStandart): values must match
//    the option labels exactly. We match case-insensitively, and anything that
//    is not a known standard (e.g. "NIfTI") is moved into "other(s)" and its
//    free-text field (dataset1.otherDataStandart), which also gets "other(s)"
//    ticked whenever the free text is filled in.

export const DATA_TYPE_LABELS = ['Experimental data', 'Simulated data', 'Raw data', 'Derived data']

export const DATA_STANDARD_LABELS = [
  "No, I didn't use a standard", 'NIX', 'NWB', 'SONATA', 'BIDS',
  'neuroML', 'odML', 'openMINDS', 'other(s)',
]

const OTHER = 'other(s)'
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : [])
const lc = (s) => String(s).trim().toLowerCase()

// dataTypes: [{ name, identifier }] as returned by api/kginfo/datatypes
export function normalizeImportedJson(parsed, dataTypes = []) {
  const d1 = parsed?.dataset1
  if (!d1 || typeof d1 !== 'object') return parsed

  // ── data types: KG URL / any case  ->  checkbox label ──────────────────────
  const idToName = new Map(dataTypes.map(t => [String(t.identifier), String(t.name)]))
  const labelByLc = new Map(DATA_TYPE_LABELS.map(l => [lc(l), l]))
  const optionsData = asArray(d1.optionsData).map(v => {
    if (typeof v !== 'string') return v
    const name = idToName.get(v) ?? v
    return labelByLc.get(lc(name)) ?? v
  })

  // ── data standards ─────────────────────────────────────────────────────────
  const stdByLc = new Map(DATA_STANDARD_LABELS.map(l => [lc(l), l]))
  let otherText = typeof d1.otherDataStandart === 'string' ? d1.otherDataStandart.trim() : ''
  const unknown = []
  const standards = []
  for (const v of asArray(d1.dataStandart)) {
    if (typeof v !== 'string') continue
    const known = stdByLc.get(lc(v)) ?? (['other', 'others', 'other(s)'].includes(lc(v)) ? OTHER : null)
    if (known) { if (!standards.includes(known)) standards.push(known) }
    else if (v.trim()) unknown.push(v.trim())
  }
  if (unknown.length) {
    if (!standards.includes(OTHER)) standards.push(OTHER)
    otherText = [otherText, ...unknown].filter(Boolean).join(', ')
  }
  if (otherText && !standards.includes(OTHER)) standards.push(OTHER)

  return {
    ...parsed,
    dataset1: {
      ...d1,
      optionsData,
      dataStandart: standards,
      otherDataStandart: otherText,
    },
  }
}
