// Plain-language texts for an upload that was not completed: one for the person who submitted, one for the ticket note
// and the curators. Pure functions (tested without the KG).

// what a failing step is, in words
const bare = (where = '') => String(where).replace(/^\[\d+\]\//, '')

export function describeStep(where = '') {
  const w = bare(where)
  if (/^datasetVersion/.test(w)) return 'the fields of the dataset version (title, licence, techniques, copyright, ...)'
  if (/^dataset(\b|\[)/.test(w)) return 'the dataset (description, authors, data custodian)'
  if (/^attachSpecimen/.test(w)) return 'the link from the dataset version to its subjects and tissue samples'
  if (/^author/.test(w)) return 'an author'
  if (/^custodian/.test(w)) return 'the data custodian'
  if (/^copyright/.test(w)) return 'the copyright holder'
  return `"${w}"`
}

const statusOf = (f) => Number(f?.status) || Number((String(f?.error || '').match(/KG returned (\d{3})/) || [])[1]) || null
const isDenied = (f) => [401, 403].includes(statusOf(f))

export function summarizeFailures(parsed = {}) {
  const failures = parsed.failures || []
  const n = failures.length
  const written = Number.isFinite(parsed.written) ? parsed.written : null
  const who = parsed.uploader && parsed.uploader !== 'unknown' ? parsed.uploader : 'the submitting account'
  const denied = failures.filter(isDenied)
  const allDenied = n > 0 && denied.length === n
  const spaces = [...new Set(denied.map(f => f.space).filter(Boolean))]

  // for the person who submitted
  let user
  if (allDenied) {
    user = `Your metadata was only partly written to the Knowledge Graph. The Knowledge Graph refused to change ${n === 1 ? 'one item' : `${n} items`} ` +
      `(access denied): ${who} is probably not allowed to edit the existing dataset record${spaces.length ? ` (space ${spaces.join(', ')})` : ''}. ` +
      (written != null ? `${written} other items were written. ` : '') +
      'The curators were notified and your metadata is saved in the ticket. You do not need to submit it again.'
  } else if (failures.some(f => statusOf(f) >= 500)) {
    user = `The upload was incomplete: ${n} item(s) could not be written because the Knowledge Graph had a temporary problem. ` +
      'The curators were notified and your metadata is saved in the ticket. Please try again later.'
  } else {
    user = `The upload was incomplete: ${n} item(s) could not be written to the Knowledge Graph. ` +
      'The curators were notified and your metadata is saved in the ticket.'
  }

  // for the ticket note and the e-mail to the curators
  const lines = failures.slice(0, 12).map((f, i) => {
    const st = statusOf(f)
    return `${i + 1}. ${describeStep(f.where)} — not written. ${st ? `KG answered ${st}${st === 403 ? ' (forbidden)' : ''}` : f.error}` +
      `${f.space ? `; space: ${f.space}` : ''}${f.instance ? `; instance: ${f.instance}` : ''}`
  })
  if (n > 12) lines.push(`... and ${n - 12} more`)
  let curator = `The upload to the Knowledge Graph was only partly done.\n` +
    `Uploaded by: ${parsed.uploader || 'unknown'}${parsed.space ? `\nSpace of the dataset version: ${parsed.space}` : ''}\n` +
    `${written != null ? `Items written: ${written}\n` : ''}Items NOT written: ${n}\n${lines.join('\n')}`
  if (allDenied) {
    curator += `\n\nLikely cause: the account may read this dataset but is not allowed to change the existing records ` +
      `(for a dataset that was already curated they live in the space "dataset"; the wizard writes in the collab space).`
  }
  curator += `\n\nThe items that were written (people, ORCIDs, subjects, tissue samples) are in the collab space but are ` +
    `${failures.some(f => /^attachSpecimen|^datasetVersion/.test(bare(f.where))) ? 'NOT linked to the dataset version' : 'not all linked'}; ` +
    `check for duplicates before submitting again.`
  return { user, curator }
}
