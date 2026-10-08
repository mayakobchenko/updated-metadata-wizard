// Builds a ready-to-paste prompt for the researcher's OWN AI assistant (Claude,
// ChatGPT, Copilot, ...). The prompt wraps the EBRAINS "data-descriptor-
// generator" skill (see dataDescriptorSkill.js) and hands the assistant
// everything the researcher already entered in the wizard, so it only asks for
// what is missing. Nothing here calls an AI service; it only assembles text.
//
// Pure function: the skill texts are passed in, so this file has no imports and
// can be tested outside the browser.

const MAX_FOLDER_LISTING_CHARS = 12000

// Wizard "Field of study" / "Type of study" -> skill domain file.
export function detectDomain(values = {}) {
  const field = values.fieldOfStudy || ''
  const type = values.studyType || ''
  if (field === 'Neuroimaging') return 'fmri'
  if (field === 'Electrophysiology') return 'electrophysiology'
  if (field === 'Anatomy / Neuroanatomy' || type === 'Post-mortem / histology') return 'histology'
  return null
}

const DOMAIN_LABEL = {
  fmri: 'fMRI / MRI',
  electrophysiology: 'electrophysiology',
  histology: 'histology / microscopy',
}

function stripFrontmatter(md) {
  return (md || '').replace(/^---[\s\S]*?---\s*/, '').trim()
}

function block(label, value) {
  const v = (value ?? '').toString().trim()
  return `### ${label}\n${v || '(not filled in yet)'}\n`
}

function describeWizardContext(data = {}) {
  const subj = data.subjectMetadata || {}
  const counts = []
  const n = (arr) => (arr || []).length
  if (n(subj.subjects)) counts.push(`${n(subj.subjects)} subject(s)`)
  if (n(subj.subjectGroups)) counts.push(`${n(subj.subjectGroups)} subject group(s)`)
  if (n(subj.tissueSamples)) counts.push(`${n(subj.tissueSamples)} tissue sample(s)`)
  if (n(subj.tissueCollections)) counts.push(`${n(subj.tissueCollections)} tissue sample collection(s)`)
  return counts.length ? `Registered in the wizard: ${counts.join(', ')}.` : ''
}

function authorsBlock(authors = [], affiliations = []) {
  const names = authors
    .filter(a => a.name)
    .map(a => `${a.name}${a.affiliationNumbers ? ` (affiliation ${a.affiliationNumbers})` : ''}`)
  const affs = affiliations.filter(a => a.text).map(a => `${a.number}. ${a.text}`)
  return [
    names.length ? names.join('\n') : '(no authors yet)',
    affs.length ? `\nAffiliations:\n${affs.join('\n')}` : '\nAffiliations: (none yet)',
  ].join('\n')
}

// values: current form values (dataDescriptor namespace)
// skill:  SKILL_TEXTS from dataDescriptorSkill.js
export function buildAgentPrompt({
  data = {}, values = {}, authors = [], affiliations = [], folderListing = '', skill,
} = {}) {
  if (!skill) throw new Error('buildAgentPrompt: skill texts are required')

  const domain = detectDomain(values)
  const listing = (folderListing || '').trim().slice(0, MAX_FOLDER_LISTING_CHARS)
  const context = describeWizardContext(data)

  const answers = [
    block('Title (TITLE)', data.dataset1?.dataTitle || values.title),
    `### Authors (AUTHORS / AFFILIATIONS)\n${authorsBlock(authors, affiliations)}\n`,
    block('Corresponding author (CORRESPONDING AUTHOR(S))', values.correspondingAuthor),
    block('Summary (SUMMARY)', values.summary || data.dataset1?.briefSummary),
    block('What the data are (use in SUMMARY and MATERIALS AND METHODS > Subjects)',
      [values.whatAreTheData, context].filter(Boolean).join('\n')),
    block('Field of study / Type of study', [values.fieldOfStudy, values.studyType].filter(Boolean).join(' / ')),
    block('Methods (MATERIALS AND METHODS > Equipment, Experimental procedure, Processing)', values.methods),
    block('Software and analysis tools (MATERIALS AND METHODS > Processing & analysis)', values.software),
    block('Dataset structure and content (DATA RECORDS)', values.dataDescription),
    block('Type of data shared', values.dataType),
    block('Usage notes (USAGE NOTES)', values.usageNotes),
    block('Limitations and caveats (USAGE NOTES)', values.limitations),
    block('Funding (Acknowledgements)', values.funding),
    block('References (REFERENCES)', [values.references, values.results && `Key results I described: ${values.results}`].filter(Boolean).join('\n')),
    block('Scientific background, motivation and hypothesis (not separate sections in the template; use them in SUMMARY / USAGE NOTES where they fit)',
      [values.scientificContext, values.motivation, values.hypothesis].filter(Boolean).join('\n\n')),
    block('Data repository / DOI', values.dataRepository),
  ].join('\n')

  const domainText = domain
    ? `## domains/${domain}.md (detected domain: ${DOMAIN_LABEL[domain]})\n${stripFrontmatter(skill.domains[domain])}`
    : 'No domain was detected from the wizard. In step 1 of the workflow, ask me which domain applies (fMRI/MRI, histology/microscopy, electrophysiology, or other) and use the generic questions if it is none of them.'

  return `I am a neuroscience researcher preparing a dataset for the EBRAINS Knowledge Graph and I need to write its Data Descriptor. Please act as the "data-descriptor-generator" skill defined below.

## How to run it in this chat (these instructions take priority over the skill where they differ)
1. I use the EBRAINS Metadata Wizard, which has already collected much of what the skill's interview asks. My answers are under "WHAT I HAVE ALREADY WRITTEN". Treat them as answered interview questions: do NOT ask them again. For each template section, show me a short draft built from my answers, improve clarity and structure, and ask me ONLY for what is missing or unclear.
2. You cannot read my files. For DATA RECORDS use the folder listing below if there is one; if not, ask me to paste a folder tree (file and folder names only).
3. NEVER invent facts, numbers, species, equipment, software versions, DOIs or references. If something is not in my answers, ask me.
4. Keep my wording where it is already good. Write in clear, neutral, third-person scientific English and define abbreviations on first use.
5. The wizard does not collect VERSION SPECIFICATIONS or Author contributions, so you will need to ask me for those.
6. When we are done, give me: (a) the complete data-descriptor.md in ONE fenced markdown block; (b) a list of anything still missing, from the skill's validation checklist; (c) improved text for these wizard fields so I can paste them back: Summary, Methods, Software, Dataset structure and content, Usage notes, Limitations.

# WHAT I HAVE ALREADY WRITTEN (from the wizard)
${answers}
# DATASET FOLDER LISTING (names only)
${listing || '(not provided)'}

# THE SKILL
The skill's bundled files are included below, so you do not need to read any file.

## SKILL.md
${stripFrontmatter(skill.skillMd)}

## template.md
${stripFrontmatter(skill.template)}

## reference/data-records-guide.md
${stripFrontmatter(skill.dataRecordsGuide)}

## reference/file-formats.md
${stripFrontmatter(skill.fileFormats)}

${domainText}
`
}
