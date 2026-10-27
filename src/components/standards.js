// Data organisation standards ticked in Dataset part 1 (dataStandart) and the free text for "other(s)" (otherDataStandart).
const NO = "No, I didn't use a standard"
const OTHER = 'other(s)'
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : [])

// standards from the check boxes, without "No standard" and without "other(s)"
export const namedStandards = (d1 = {}) => arr(d1.dataStandart).filter(s => s !== NO && s !== OTHER)
// the ones the researcher typed ("NIfTI, DICOM")
export const otherStandards = (d1 = {}) => arr(d1.dataStandart).includes(OTHER) || String(d1.otherDataStandart || '').trim()
  ? String(d1.otherDataStandart || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean) : []

const joinAnd = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] || '')

// the sentence offered for "Introduction to the data records"
export function standardsSentence(d1 = {}) {
  const named = namedStandards(d1), other = otherStandards(d1)
  if (!named.length && !other.length) return ''
  const a = named.length ? `the ${joinAnd(named)} standard${named.length > 1 ? 's' : ''}` : ''
  const b = other.length ? `${named.length ? 'the following other ' : 'the '}standard${other.length > 1 ? 's' : ''}: ${joinAnd(other)}` : ''
  return `Data follows ${[a, b].filter(Boolean).join(' and ')}.`
}

// what earlier versions wrote ("Data follows the other(s) standard."): still recognised as automatic text
export function legacyStandardsSentence(d1 = {}) {
  const stds = arr(d1.dataStandart).filter(s => s !== NO)
  return stds.length ? `Data follows the ${stds.join(', ')} standard.` : ''
}

// one line for the metadata summary files
export const standardsLabel = (d1 = {}) => {
  const named = namedStandards(d1), other = otherStandards(d1)
  return [...named, ...(other.length ? [`other: ${other.join(', ')}`] : []), ...(arr(d1.dataStandart).includes(NO) ? [NO] : [])].join('; ')
}
