// Builds a ready-to-paste prompt for the researcher's OWN AI assistant (Claude,
// ChatGPT, Copilot, ...). The prompt wraps the EBRAINS "data-descriptor-
// generator" skill (see dataDescriptorSkill.js) and hands the assistant
// everything the researcher already entered in the wizard, so it only asks for
// what is missing. Nothing here calls an AI service; it only assembles text.
//
// Pure function: the skill texts are passed in, so this file has no imports and
// can be tested outside the browser.

const MAX_FOLDER_LISTING_CHARS = 12000

// Which of the skill's domain files fits this dataset? Priority:
//   1. the researcher's explicit choice in the AI panel (values.aiDomain),
//   2. the file extensions in the generated/pasted folder listing,
//   3. a legacy "Field of study" saved in an older wizard JSON.
const DOMAIN_EXTENSIONS = {
  fmri: ['nii', 'nii.gz', 'bval', 'bvec', 'dcm', 'mgz', 'gii', 'func.gii', 'label.gii'],
  electrophysiology: ['nwb', 'edf', 'bdf', 'abf', 'plx', 'rhd', 'rhs', 'nev', 'ns1', 'ns2', 'ns3', 'ns4', 'ns5', 'ns6',
    'vhdr', 'smr', 'smrx', 'dat', 'continuous', 'spikes', 'kwik', 'kwx', 'nix', 'mda'],
  histology: ['tif', 'tiff', 'ome.tif', 'ome.tiff', 'czi', 'nd2', 'lif', 'svs', 'ndpi', 'vsi', 'ome.zarr', 'zarr', 'jp2', 'png', 'jpg', 'jpeg'],
}

export function detectDomainFromListing(listing = '') {
  const scores = { fmri: 0, electrophysiology: 0, histology: 0 }
  for (const line of String(listing).split('\n')) {
    const m = line.match(/([A-Za-z0-9_.\-]+\.([A-Za-z0-9.]+))(?:\s|\[|$)/)
    if (!m) continue
    const name = m[1].toLowerCase()
    for (const [domain, exts] of Object.entries(DOMAIN_EXTENSIONS)) {
      if (exts.some(e => name.endsWith('.' + e))) { scores[domain]++; break }
    }
  }
  const [best, count] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return count > 0 ? best : null
}

const DOMAIN_CHOICES = { fmri: 'fmri', electrophysiology: 'electrophysiology', histology: 'histology' }

export function detectDomain(values = {}, folderListing = '') {
  if (DOMAIN_CHOICES[values.aiDomain]) return DOMAIN_CHOICES[values.aiDomain]
  if (values.aiDomain === 'other') return null
  const fromFiles = detectDomainFromListing(folderListing)
  if (fromFiles) return fromFiles
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

  const domain = detectDomain(values, folderListing)
  const listing = (folderListing || '').trim().slice(0, MAX_FOLDER_LISTING_CHARS)
  const context = describeWizardContext(data)

  const answers = [
    block('Title (TITLE)', data.dataset1?.dataTitle || values.title),
    `### Authors (AUTHORS / AFFILIATIONS)\n${authorsBlock(authors, affiliations)}\n`,
    block('Corresponding author (CORRESPONDING AUTHOR(S))', values.correspondingAuthor),
    block('Summary (SUMMARY, max 220 words)', values.summary || data.dataset1?.briefSummary),
    block('What the data are (use in SUMMARY and MATERIALS AND METHODS > Subjects)',
      [values.whatAreTheData, context].filter(Boolean).join('\n')),
    block('Methods (MATERIALS AND METHODS > Equipment, Experimental procedure, Processing)', values.methods),
    block('Software and analysis tools (MATERIALS AND METHODS > Processing & analysis)', values.software),
    block('Dataset structure and content (DATA RECORDS)', values.dataDescription),
    block('File structure written so far (DATA RECORDS, part 1)', values.dataRecordsTree),
    block('File format table written so far (DATA RECORDS, part 2)',
      (values.dataRecordsFormats || []).map(r => `${r.format || '?'} | ${r.extension} | ${r.software || ''}`).join('\n')),
    block('Author contributions (Author contributions section)', values.authorContributions),
    block('Type of data shared (from the wizard, Dataset part 1)', (data.dataset1?.optionsData || []).filter(v => typeof v === 'string' && !v.startsWith('http')).join(', ')),
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
5. The wizard does not collect VERSION SPECIFICATIONS, so you will need to ask me for it. Author contributions are pre-filled with the authors only: ask me what each author did if a line has nothing after the colon.
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


// ─────────────────────────────────────────────────────────────────────────────
// One prompt per template section, so the researcher can work on one section at a
// time (copy it into any assistant, or send it with their own API key). Only the
// answers and skill files relevant to that section are included.

export const SECTION_SPECS = {
  summary: {
    label: 'Summary',
    field: 'summary',
    template: `SUMMARY. Maximum 220 words, no references.
Shortly summarise the content, provenance and usage potential of the shared data: include information about subjects, methods and materials, relevant study targets and in which context the data could be (re)used. Do not describe the research results, but describe purely the shared data. The summary should be written so it is readily intelligible to any scientist. Specialised terms should be explained concisely.
Example structure: Write one sentence about the origin of the dataset. Write one or two sentences that give an overview of the data. This could for example include the content of the dataset, the number of subjects and sessions, and the original purpose of the data. Write one or two sentences describing the methods and materials used. Write one sentence about the reusability of the data.`,
    answers: (v, d, ctx) => [
      block('Title', d.dataset1?.dataTitle || v.title),
      block('Brief summary entered earlier in the wizard', d.dataset1?.briefSummary),
      block('What the data are', [v.whatAreTheData, ctx.subjects].filter(Boolean).join('\n')),
      block('Scientific background', v.scientificContext),
      block('Motivation for creating and sharing the data', v.motivation),
      block('Central hypothesis or research question', v.hypothesis),
      block('Methods (for orientation only)', v.methods),
      block('My current Summary text', v.summary),
    ],
    wantsListing: true,
  },
  methods: {
    label: 'Materials and methods',
    field: 'methods',
    template: `MATERIALS AND METHODS. Describe the materials and methods used to generate the data. Include information on all specimens, acquisition techniques, processing steps (incl. validations and quality assessments), tools and workflows as well as information on the relevant anatomical entity and location for this study. Use subheadings for improved readability.
It is accepted to cite previous methodological descriptions, but the descriptions should be complete enough for others to understand the materials and methods without reading the associated publications.
Anatomical information: if applicable, give the entity of the data (e.g. cell type, histological section), the anatomical location (brain region name or coordinates), how the location was defined (atlas version, ontology, coordinate system/template space).`,
    answers: (v, d, ctx) => [
      block('What the data are', [v.whatAreTheData, ctx.subjects].filter(Boolean).join('\n')),
      block('Methods I have written so far', v.methods),
      block('Software and analysis tools', v.software),
    ],
    wantsDomain: true,
  },
  usage: {
    label: 'Usage notes',
    field: 'usageNotes',
    template: `USAGE NOTES. Provide suggestions for how the shared data can be (re)used and warn about how they should not be (re)used (e.g. "the used spike sorting and quality assurance make this dataset particularly interesting for precise spike time analysis", "data are generated from adult subjects, making it unsuitable for developmental studies"). Also provide suggestions for what software/code can be used with the shared data (loading routines, analyses, pipelines, visualisation tools), including where that software/code can be found.`,
    answers: (v) => [
      block('Usage notes I have written so far', v.usageNotes),
      block('Limitations and caveats', v.limitations),
      block('Software and analysis tools', v.software),
      block('Data repository / DOI', v.dataRepository),
      block('Methods (for orientation only)', v.methods),
    ],
    wantsListing: true,
  },
  dataRecords: {
    label: 'Data records',
    field: 'dataDescription',
    template: `DATA RECORDS. Describe how the data are stored, as well as their file types and content.
1. Provide a reduced generic layout of the file repository structure displaying the storage convention: one entry per line starting with "/", indented two spaces per folder level. Add a one sentence summary describing the content of each (example) file in square brackets. If a (meta)data standard was followed (e.g. BIDS), include this information.
2. List all file formats and include which software created the respective files (table: Format / Extension / Software used / file specification). If files were created manually, explain their internal structure.`,
    answers: (v) => [
      block('Data records text I have written so far', v.dataDescription),
      block('File structure so far', v.dataRecordsTree),
      block('File format table so far', (v.dataRecordsFormats || []).map(r => `${r.format || '?'} | ${r.extension} | ${r.software || ''}`).join('\n')),
    ],
    wantsListing: true,
    wantsRecordsGuide: true,
  },
}

export function buildSectionPrompt(sectionKey, { data = {}, values = {}, folderListing = '', skill } = {}) {
  const spec = SECTION_SPECS[sectionKey]
  if (!spec) throw new Error(`Unknown section: ${sectionKey}`)
  if (!skill) throw new Error('buildSectionPrompt: skill texts are required')
  const listing = (folderListing || '').trim().slice(0, MAX_FOLDER_LISTING_CHARS)
  const ctx = { subjects: describeWizardContext(data) }
  const domain = detectDomain(values, folderListing)

  const extras = []
  if (spec.wantsDomain && domain) {
    extras.push(`## Skill guidance for this kind of data (${DOMAIN_LABEL[domain]})\n${stripFrontmatter(skill.domains[domain])}`)
  }
  if (spec.wantsRecordsGuide) {
    extras.push(`## Skill guidance: Data Records\n${stripFrontmatter(skill.dataRecordsGuide)}\n\n## Skill guidance: file formats\n${stripFrontmatter(skill.fileFormats)}`)
  }

  return `I am a neuroscience researcher preparing a dataset for EBRAINS and I am writing its Data Descriptor. Please help me with ONE section only: "${spec.label}".

## Rules
1. Use ONLY the facts in "WHAT I HAVE ALREADY WRITTEN" and the folder listing. NEVER invent facts, numbers, species, equipment, software versions, DOIs or references.
2. If something the section needs is missing, ask me short questions first (maximum 5), then write the text.
3. Write clear, neutral, scientific English; define abbreviations on first use; keep my wording where it is already good.
4. Respect the template requirements below (length limits, what to include and leave out).
5. Give me the final text for this section in ONE plain-text block that I can paste into the wizard, then a short list of anything still missing.

## What the EBRAINS template requires for this section
${spec.template}

# WHAT I HAVE ALREADY WRITTEN
${spec.answers(values, data, ctx).join('\n')}
${spec.wantsListing ? `# DATASET FOLDER LISTING (names only)\n${listing || '(not provided)'}\n` : ''}
${extras.join('\n\n')}
`
}
