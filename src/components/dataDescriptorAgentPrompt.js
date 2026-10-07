// Builds a ready-to-paste prompt (and a downloadable skill file) that a
// researcher can give to their OWN AI agent (Claude, ChatGPT, Copilot, ...)
// to improve their Data Descriptor. Nothing here calls any AI service: the
// wizard only assembles text from what the user has already entered.
//
// The per-section guidance below mirrors the hints shown on the Data
// Descriptor page. When the curators' official data-descriptor skill is
// finalised, replace/extend QUALITY_GUIDE with its rules so the page and the
// skill never drift apart.

export const QUALITY_GUIDE = [
  {
    key: 'whatAreTheData', label: 'What are the data?',
    guide: 'Start with "This dataset contains…". State modality, number of subjects/samples, species and age/sex where relevant. 1–3 sentences, concrete numbers, no jargon left undefined.',
  },
  {
    key: 'scientificContext', label: 'Scientific background and context',
    guide: '2–4 sentences: the broader field, what was already known, why the area matters. Cite sources for factual claims.',
  },
  {
    key: 'motivation', label: 'Motivation for creating and sharing the dataset',
    guide: 'Why the study was done, what gap it fills, why sharing the data is valuable to others.',
  },
  {
    key: 'hypothesis', label: 'Central hypothesis or research question',
    guide: 'One or two sentences stating what was tested or discovered.',
  },
  {
    key: 'summary', label: 'Summary',
    guide: 'One flowing paragraph (3–6 sentences) combining the data, context, motivation and hypothesis. Third person.',
  },
  {
    key: 'methods', label: 'Methods used to acquire the data',
    guide: 'Experimental setup, equipment, recording parameters, preprocessing. Enough detail that an expert could judge whether the data suit their purpose.',
  },
  {
    key: 'software', label: 'Software and analysis tools',
    guide: 'Named packages/toolboxes/scripts WITH versions where known; no vague placeholders.',
  },
  {
    key: 'dataDescription', label: 'Dataset structure and content',
    guide: 'What files are included, in which formats, how folders are organised and named, which metadata standard (BIDS, NWB, …) was followed. A reader should be able to predict where to find a given file.',
  },
  {
    key: 'results', label: 'Key results or findings',
    guide: '2–4 sentences. Say whether results are published and cite the paper (journal, year, DOI).',
  },
  {
    key: 'dataRepository', label: 'Data repository / DOI',
    guide: 'Link to the EBRAINS repository or the data DOI.',
  },
  {
    key: 'usageNotes', label: 'What the dataset can be used for',
    guide: 'Concrete suggested uses, e.g. "particularly suitable for precise spike-time analyses".',
  },
  {
    key: 'limitations', label: 'Limitations and caveats',
    guide: 'Warn about inappropriate uses, e.g. "adult subjects only, unsuitable for developmental studies".',
  },
  {
    key: 'funding', label: 'Funding and acknowledgements',
    guide: 'Funders with grant names and numbers; non-author contributors.',
  },
  {
    key: 'references', label: 'References',
    guide: 'Every reference cited above, in Nature style (Author et al., Journal, Year, doi).',
  },
]

const RULES = `Rules you must follow:
1. NEVER invent facts, numbers, species, software versions, DOIs or references. Only use what is in my answers or in files I give you.
2. If something important is missing or vague, do not guess: list it under "Questions for me" and ask.
3. Keep my wording where it is already good. Change only what improves clarity, completeness or structure.
4. Write in clear, neutral, third-person scientific English. Define abbreviations on first use.
5. Do not add information about subjects, samples or files that I did not give you.`

const OUTPUT_FORMAT = `Return your answer in three parts:
A. "Review": for each field, one line saying what is good and what is missing.
B. "Improved text": the rewritten text for each field, under the SAME field labels I used, so I can paste each one straight back into the wizard. Leave a field unchanged if it is already good.
C. "Questions for me": everything you need from me to complete the weak fields.`

function line(label, value) {
  const v = (value ?? '').toString().trim()
  return `### ${label}\n${v || '(not filled in yet)'}\n`
}

function describeWizardContext(data = {}) {
  const d1 = data.dataset1 || {}
  const subj = data.subjectMetadata || {}
  const exp = data.experiments || {}
  const parts = []
  if (d1.dataTitle) parts.push(`Dataset title: ${d1.dataTitle}`)
  if (d1.briefSummary) parts.push(`Brief summary from the intake form: ${d1.briefSummary}`)
  const nSubj = (subj.subjects || []).length
  const nGroups = (subj.subjectGroups || []).length
  const nTissue = (subj.tissueSamples || []).length
  const nColl = (subj.tissueCollections || []).length
  const counts = []
  if (nSubj) counts.push(`${nSubj} subject(s)`)
  if (nGroups) counts.push(`${nGroups} subject group(s)`)
  if (nTissue) counts.push(`${nTissue} tissue sample(s)`)
  if (nColl) counts.push(`${nColl} tissue sample collection(s)`)
  if (counts.length) parts.push(`Registered in the wizard: ${counts.join(', ')}`)
  if (exp.techniques?.length) parts.push(`Techniques selected: ${exp.techniques.length} (names not included here)`)
  return parts.join('\n')
}

// values: current form values for the dataDescriptor namespace
export function buildAgentPrompt({ data = {}, values = {} } = {}) {
  const context = describeWizardContext(data)
  const fields = QUALITY_GUIDE.map(f => line(f.label, values[f.key])).join('\n')
  const guide = QUALITY_GUIDE.map(f => `- ${f.label}: ${f.guide}`).join('\n')

  return `You are helping me, a neuroscience researcher, improve the Data Descriptor for a dataset I am submitting to the EBRAINS Knowledge Graph. A curator will review it, so it must be accurate, complete and easy for another researcher to reuse the data from.

${RULES}

## What a good field looks like
${guide}

## Context from my submission
${context || '(none)'}

## My current Data Descriptor text
${fields}
## Files
If you can see my data files or a file listing, use them to check and improve "Dataset structure and content". If you cannot, ask me to paste a folder listing (names only) and tell you what each folder/file naming pattern means.

## What I want from you
${OUTPUT_FORMAT}`
}

// A reusable skill file the researcher can load into an agent that supports
// skills (e.g. Claude). Contains the same rules, but no personal content.
export function buildAgentSkillMd() {
  const guide = QUALITY_GUIDE.map(f => `- **${f.label}** — ${f.guide}`).join('\n')
  return `---
name: improve-ebrains-data-descriptor
description: Review and improve an EBRAINS Data Descriptor (neuroscience dataset documentation) section by section without inventing facts. Use when the user shares a draft data descriptor or asks to improve dataset documentation for EBRAINS.
---

# Improve an EBRAINS Data Descriptor

${RULES}

## What a good field looks like
${guide}

## Procedure
1. Ask the user to paste their current Data Descriptor text (or the field values from the wizard) and, if available, a folder listing of the dataset.
2. Review every field against the guidance above.
3. ${OUTPUT_FORMAT.replace(/\n/g, '\n   ')}
`
}
