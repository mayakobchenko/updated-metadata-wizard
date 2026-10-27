import { useState, useEffect, useRef } from 'react'
import { Form as AntForm, Input, Select, Button, Typography, Tag, Alert, Popover, Modal, message } from 'antd'
import { FileTextOutlined, InfoCircleOutlined, CopyOutlined, DownloadOutlined, RobotOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { renderDataDescriptor, downloadBlob } from './renderDescriptor'
import { buildAgentPrompt, buildSectionPrompt, detectDomain } from './dataDescriptorAgentPrompt'
import { SKILL_TEXTS, SKILL_ZIP_URL } from './dataDescriptorSkill'
import BucketStructurePanel from './BucketStructurePanel'
import AiDraftAll from './AiDraftAll'
import WordCountArea, { countWords } from './WordCountArea'
import { EXAMPLES } from './ddExamples'
import { buildLookups } from './metadataLookups'
import { describeExperiment, factsText, methodsStarter } from './experimentFacts'
import FiguresTablesPanel from './FiguresTablesPanel'
import DdMarkdownImport from './DdMarkdownImport'
import FormatsTable from './FormatsTable'
import { buildAuthorTable } from './authorModel'
import { getFigures, useFigures } from './figuresStore'

const { TextArea } = Input
const { Text }     = Typography

const EXTRA = { fontSize: 12, color: 'rgba(0,0,0,0.45)' }

const PrefilledBadge = () => (
  <Tag color="green" style={{
    fontSize: 10, padding: '0 5px', lineHeight: '16px',
    marginLeft: 6, verticalAlign: 'middle',
  }}>pre-filled</Tag>
)

const PrefilledHint = () => (
  <div style={{
    background: '#f0faf4', border: '1px solid #b7ebce',
    borderRadius: 6, padding: '5px 10px', marginBottom: 6,
    fontSize: 11, color: '#1a6b35',
    display: 'flex', alignItems: 'center', gap: 6,
  }}>
    <InfoCircleOutlined style={{ flexShrink: 0 }} />
    Pre-filled from your wizard answers.
  </div>
)

const SectionHeading = ({ number, title }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '28px 0 16px',
    borderBottom: '1px solid #e5e5e5', paddingBottom: 8,
  }}>
    <span style={{
      background: 'var(--ebrains-color-medium)', color: '#fff',
      borderRadius: '50%', width: 24, height: 24,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, flexShrink: 0,
    }}>{number}</span>
    <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{title}</span>
  </div>
)

// Field wrapper for the dataDescriptor namespace.
// IMPORTANT: this must stay at module scope, not be redefined inside
// DataDescriptor() on every render. A component defined inside another
// component's body gets a brand-new function identity every render, which
// makes React treat it as a different component type and remount the
// underlying <input>/<textarea> on every keystroke — causing focus loss
// after a single character typed.
// "?" next to a label: an example answer in a popover, so the page stays uncluttered
const HelpTip = ({ example, note }) => (
  <Popover trigger={['hover', 'click']} placement="right" title="Example (illustrative, not real data)"
    content={<div style={{ maxWidth: 520, whiteSpace: 'pre-wrap', fontSize: 12, fontFamily: example.includes('\n  /') ? 'monospace' : 'inherit' }}>
      {note && <div style={{ marginBottom: 6, fontFamily: 'inherit', color: '#555' }}>{note}</div>}{example}
    </div>}>
    <QuestionCircleOutlined style={{ marginLeft: 6, color: 'var(--ebrains-color-medium)', cursor: 'help' }} />
  </Popover>
)

const Q = ({ label, name, hint, required, prefilled, rules, children, example, exampleNote }) => (
  <AntForm.Item
    label={<span>{label}{example && <HelpTip example={example} note={exampleNote} />}{prefilled && <PrefilledBadge />}</span>}
    name={['dataDescriptor', name]}
    rules={[...(required ? [{ required: true, message: `Please fill in "${label}".` }] : []), ...(rules || [])]}
    extra={(hint || prefilled) ? <>{prefilled && <PrefilledHint />}{hint && <span style={EXTRA}>{hint}</span>}</> : undefined}
  >
    {children}
  </AntForm.Item>
)

// ── helpers ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUMMARY_MAX_WORDS = 220
const TITLE_MAX_CHARS = 110
export { countWords }

// Every software tool needs a version ("FSL 6.0.5"); "version unknown" / "other" is accepted.
// Returns the entries that have neither a number nor such a statement.
export function softwareWithoutVersion(text) {
  let items = String(text || '').split(/[\n;]+/).map(t => t.trim()).filter(Boolean)
  if (items.length === 1 && items[0].includes(',')) items = items[0].split(',').map(t => t.trim()).filter(Boolean)
  return items.filter(t => !/\d/.test(t) && !/version|unknown|other|n\/a/i.test(t))
}

// "experimental, raw and derived data" from the Dataset part 1 check boxes (labels only)
function dataTypePhrase(options = []) {
  const map = { 'Experimental data': 'experimental', 'Simulated data': 'simulated', 'Raw data': 'raw', 'Derived data': 'derived' }
  const words = options.map(o => map[o]).filter(Boolean)
  if (!words.length) return ''
  const joined = words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0]
  return `${joined} data`
}

export const deriveCorresponding = (authors = []) =>
  authors.filter(a => a.corresponding).map(a => ({ name: a.name || '', email: (a.email || '').trim() }))
export const deriveContributionLines = (authors = []) =>
  authors.filter(a => a.name && (a.contributions || []).length)
    .map(a => `${a.name}: ${(a.contributions || []).join('; ')}`).join('\n')

// "Forename Surname: email" lines (older saved data) -> [{ name, email }]
export function parseCorrespondingAuthors(text) {
  return String(text || '').split(/\n|;/).map(l => l.trim()).filter(Boolean).map(line => {
    const i = line.indexOf(':')
    if (i > -1) return { name: line.slice(0, i).trim(), email: line.slice(i + 1).trim() }
    return line.includes('@') ? { name: '', email: line } : { name: line, email: '' }
  })
}
export const formatCorrespondingAuthors = (list) =>
  list.filter(a => a.name || a.email).map(a => [a.name, a.email].filter(Boolean).join(': ')).join('\n')

function buildSubjectSummary(subj) {
  if (!subj) return ''
  const parts = []
  const flatN   = (subj.subjects          || []).length
  const groupN  = (subj.subjectGroups     || []).length
  const tissueN = (subj.tissueSamples     || []).length
  const collN   = (subj.tissueCollections || []).length
  if (flatN)  parts.push(`${flatN} subject${flatN > 1 ? 's' : ''}`)
  if (groupN) {
    const total = (subj.subjectGroups || [])
      .reduce((s, g) => s + (g.subjects?.length || 0), 0)
    parts.push(`${groupN} subject group${groupN > 1 ? 's' : ''} (${total} subjects total)`)
  }
  if (tissueN) parts.push(`${tissueN} tissue sample${tissueN > 1 ? 's' : ''}`)
  if (collN)   parts.push(`${collN} tissue collection${collN > 1 ? 's' : ''}`)
  return parts.join(', ')
}

function buildFundingText(fund) {
  const funders = fund?.funders || []
  const items = funders.map(f => {
    const name = f.funderName || f.customFunderName
    if (!name) return ''
    const title = f.awardTitle || f.customAwardTitle
    const num = f.grantId || f.awardNumber
    const extra = [title, num && `grant no. ${num}`].filter(Boolean).join(', ')
    return extra ? `${name} (${extra})` : name
  }).filter(Boolean)
  if (!items.length) return ''
  const joined = items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]
  return `This study was supported by ${joined}.`
}

// ── detect a name that's still a KG reference, not a resolved display name ─
// Matches either a full KG URL (contains "/") or a bare UUID left over from
// resolveAuthorName's last-resort fallback (e.g. a contributor added before
// personMap had loaded their record). Deliberately NOT based on string
// length alone — a bare UUID is 36 characters with no slash, which a naive
// "short, no slash" check would misclassify as an already-resolved name.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUnresolvedReference(name) {
  return !name || name.includes('/') || UUID_RE.test(name)
}

// ── resolve a single author entry to a display name ───────────────────────
// personMap: Map of KG URL → full name (loaded from /api/kginfo/contributorsfile)
function resolveAuthorName(entry, personMap) {
  // custom author — name typed directly
  if (entry.isCustom || (!entry.selectedAuthor && (entry.firstName || entry.lastName))) {
    return `${entry.firstName || ''} ${entry.lastName || ''}`.trim()
  }
  // KG-selected author — look up name from Person.json via personMap
  if (entry.selectedAuthor && personMap.size > 0) {
    const name = personMap.get(entry.selectedAuthor)
    if (name) return name
  }
  // fallback: bare UUID or empty
  return entry.selectedAuthor
    ? entry.selectedAuthor.split('/').pop()
    : `${entry.firstName || ''} ${entry.lastName || ''}`.trim()
}

// ── compute scalar prefill values ─────────────────────────────────────────
function computeFieldValues(data) {
  const d1   = data.dataset1        || {}
  const d2   = data.dataset2        || {}
  const cont = data.contactperson   || {}
  const fund = data.funding         || {}
  const subj = data.subjectMetadata || {}
  const dd   = data.dataDescriptor  || {}

  // saved user value always wins
  const pf = (saved, auto) => (saved !== undefined && saved !== '') ? saved : (auto || '')

  // title always mirrors Dataset1 — never let a stale saved value override
  const title = d1.dataTitle || ''

  return {
    title,   // always from Dataset1, not from dd.title

    // One Summary field, starting from the brief summary in Dataset part 1 (or a one-sentence description).
    summary: pf(dd.summary, (() => {
      if (d1.briefSummary) return d1.briefSummary
      const types = dataTypePhrase(d1.optionsData || [])
      const sj = buildSubjectSummary(subj)
      if (types && sj) return `This dataset contains ${types} from ${sj}.`
      if (types)       return `This dataset contains ${types}.`
      return sj ? `This dataset contains data from ${sj}.` : ''
    })()),
    methods:           dd.methods           || '',
    versionSpec:       dd.versionSpec       || '',

    software: dd.software || '',

    dataDescription: pf(dd.dataDescription, (() => {
      const stds = (d1.dataStandart || []).filter(s => s !== "No, I didn't use a standard")
      return stds.length ? `Data follows the ${stds.join(', ')} standard.` : ''
    })()),

    dataRecordsTree:     dd.dataRecordsTree     || '',
    authorContributions: dd.authorContributions || '',
    aiDomain:            dd.aiDomain            || undefined,
    usageNotes:     dd.usageNotes     || '',
    limitations:    dd.limitations    || '',
    funding:        pf(dd.funding,    buildFundingText(fund)),
    references:     dd.references     || '',
  }
}

function computeAutoPopulated(data) {
  const d1   = data.dataset1        || {}
  const d2   = data.dataset2        || {}
  const cont = data.contactperson   || {}
  const fund = data.funding         || {}
  const subj = data.subjectMetadata || {}
  const dd   = data.dataDescriptor  || {}
  const no   = (k) => !dd[k] || dd[k] === ''
  return {
    summary:             no('summary')             && !!(d1.briefSummary || dataTypePhrase(d1.optionsData || []) || buildSubjectSummary(subj)),
    dataDescription:     no('dataDescription')     && !!(d1.dataStandart?.filter(s => s !== "No, I didn't use a standard").length),
    funding:             no('funding')             && !!buildFundingText(fund),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DataDescriptor({ form, onChange, data, onGoToContributors }) {
  const dd = data.dataDescriptor || {}

  // ── person map: KG URL → full name, loaded once ───────────────────────
  const [personMap, setPersonMap] = useState(new Map())

  useEffect(() => {
    fetch('api/kginfo/contributorsfile')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => {
        const persons = json.person || []
        const map = new Map()
        persons.forEach(p => {
          if (!p.uuid) return
          const name = `${p.givenName || ''} ${p.familyName || ''}`.trim()
          if (!name) return
          // Person.json uuid is stored as a full KG URL
          map.set(p.uuid,                                                 name)
          // also index by bare UUID in case selectedAuthor uses that form
          map.set(p.uuid.split('/').pop(),                                name)
          // also index with KG_PREFIX variant
          map.set(`https://kg.ebrains.eu/api/instances/${p.uuid.split('/').pop()}`, name)
        })
        setPersonMap(map)
      })
      .catch(e => console.error('DataDescriptor: could not load persons', e))
  }, []) // load once on mount

  // names of the contribution types (the Contributors step stores only their identifiers)
  useEffect(() => {
    fetch('api/kginfo/typecontribution')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => {
        const m = new Map()
        ;(json.typecontribution || []).forEach(t => { if (t.identifier && t.name) m.set(t.identifier, t.name) })
        setContribTypes(m)
      })
      .catch(() => { /* names are optional */ })
  }, [])

  // ── local state for author / affiliation rows ─────────────────────────
  const [authors,      setAuthors]      = useState(dd.authors           || [])
  const [affiliations, setAffiliations] = useState(dd.affiliations_list || [])

  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [genError,   setGenError]   = useState('')
  const [genNotice,  setGenNotice]  = useState('')

  const [formatRows, setFormatRows] = useState(Array.isArray(dd.dataRecordsFormats) ? dd.dataRecordsFormats : [])
  const formatsRef = useRef(formatRows)
  const [contribTypes, setContribTypes] = useState(new Map())   // KG identifier -> readable name

  // "Improve with your own AI assistant" panel
  const [promptCopied,  setPromptCopied]  = useState(false)
  const [folderListing, setFolderListing] = useState('')

  // Built on demand from the CURRENT form values, so the prompt always
  // reflects what the user has typed so far.
  const refreshPrompt = () => {
    const vals = form.getFieldsValue().dataDescriptor || {}
    const text = buildAgentPrompt({
      data,
      values: { ...vals, dataRecordsFormats: formatsRef.current, title: data.dataset1?.dataTitle || vals.title, experimentFacts: factsText(facts) },
      authors,
      affiliations,
      folderListing,
      skill: SKILL_TEXTS,
    })
    return text
  }

  const copyPrompt = async () => {
    const text = refreshPrompt()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard API unavailable (e.g. plain http) — fall back to a hidden textarea
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 3000)
  }

  // ── main sync effect — runs on mount and whenever data changes ────────
  // Uses full `data` as dep (same pattern as Dataset2) so it always runs
  // when navigating back to this step or after JSON import.
  // Also re-runs when personMap loads (author names resolve after fetch).
  useEffect(() => {
    // 1. scalar fields — written under the shared form's `dataDescriptor` namespace
    const fieldVals = computeFieldValues(data)
    form.setFieldsValue({ dataDescriptor: fieldVals })

    // 2. authors and affiliations: derived from the first page (custodian) and the Contributors step, which owns them
    const { authors: nextAuthors, affiliations: nextAffiliations } = buildAuthorTable(data, (e) => resolveAuthorName(e, personMap))

    setAuthors(nextAuthors)
    setAffiliations(nextAffiliations)

    const authorsChanged =
      JSON.stringify(nextAuthors) !== JSON.stringify(dd.authors || [])
    const affiliationsChanged =
      JSON.stringify(nextAffiliations) !== JSON.stringify(dd.affiliations_list || [])

    if (authorsChanged || affiliationsChanged) {
      emitAll(nextAuthors, nextAffiliations)
    }
  }, [data, personMap]) // re-run when personMap loads too

  const autoPopulated = computeAutoPopulated(data)

  // software named in the Methods / Software text, offered for the "Software used" column
  const TOOLS = ['RABIES', 'ANTs', 'AFNI', 'FSL', 'SPM', 'FreeSurfer', 'BrkRaw', 'MATLAB', 'Python', 'ImageJ', 'Fiji', 'QuPath',
    'Kilosort', 'Suite2p', 'DeepLabCut', 'Neuroglancer', 'ITK-SNAP', '3D Slicer', 'NWB', 'MRtrix', 'fMRIPrep', 'Nipype', 'R']
  const toolText = `${form.getFieldValue(['dataDescriptor', 'methods']) || ''} ${form.getFieldValue(['dataDescriptor', 'software']) || ''}`
  const toolsFound = TOOLS.filter(t => new RegExp(`(^|[^A-Za-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z0-9])`).test(toolText))
  const fillSoftware = () => {
    const txt = `Generated by ${toolsFound.join(', ')}`
    const next = formatsRef.current.map(r => r.software ? r : { ...r, software: txt })
    formatsRef.current = next; setFormatRows(next); emitAll(authors, affiliations)
  }

  // software named in the file format table, offered as a starting list for the usage section
  const formatSoftware = (() => {
    const t = formatRows.map(r => r.software || '').join(' ')
    return TOOLS.filter(x => new RegExp(`(^|[^A-Za-z0-9])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z0-9])`).test(t))
  })()
  const fillSoftwareFromFormats = () => {
    form.setFieldValue(['dataDescriptor', 'software'], formatSoftware.join('\n'))
    emitAll(authors, affiliations); setGenerated(false)
  }

  // Extensions the researcher deleted (or renamed) from the automatically generated table. They are kept in the
  // draft so that reading the bucket again, e.g. after importing a draft, does not bring those rows back.
  const removedExtsRef = useRef(Array.isArray(dd.removedFormatExts) ? dd.removedFormatExts : [])
  // file types found in the bucket at the last read (kept in the draft): a format only counts as deleted while it was there
  const bucketExtsRef = useRef(new Set(Array.isArray(dd.bucketExts) ? dd.bucketExts : []))
  // which dataset version (bucket) the file tree and the format table were generated from
  const sourceIdRef = useRef(dd.dataRecordsSourceId || '')
  useEffect(() => {
    if (!removedExtsRef.current.length && Array.isArray(dd.removedFormatExts) && dd.removedFormatExts.length) {
      removedExtsRef.current = dd.removedFormatExts
    }
    // a draft is authoritative about which dataset version its file structure came from
    if (dd.dataRecordsSourceId && dd.dataRecordsSourceId !== sourceIdRef.current) sourceIdRef.current = dd.dataRecordsSourceId
    if (!lastAutoSentence.current && dd.filesSentence) lastAutoSentence.current = dd.filesSentence
    if (!lastAutoTree.current && dd.autoTree) lastAutoTree.current = dd.autoTree
    if (!autoVersionSpecRef.current && dd.autoVersionSpec) autoVersionSpecRef.current = dd.autoVersionSpec
    if (!bucketExtsRef.current.size && Array.isArray(dd.bucketExts)) bucketExtsRef.current = new Set(dd.bucketExts)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // file-format rows arriving later (JSON import)
  useEffect(() => {
    if (formatsRef.current.length || !Array.isArray(dd.dataRecordsFormats) || !dd.dataRecordsFormats.length) return
    formatsRef.current = dd.dataRecordsFormats
    setFormatRows(dd.dataRecordsFormats)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── emit all changes upward ───────────────────────────────────────────
  const emitAll = (newAuthors, newAffs, formVals, extra = {}) => {
    const vals = formVals !== undefined
      ? formVals
      : (form.getFieldsValue().dataDescriptor || {})
    // always override title with Dataset1 value so they stay in sync
    vals.title = data.dataset1?.dataTitle || ''
    onChange({
      dataDescriptor: {
        ...vals,
        // carried forward by default — only an explicit `extra` override
        // (from a manual affiliation edit) should change it. Authors have
        // no manual add/remove anymore, so there's nothing to carry forward
        // for them; removedAffiliationIds is still needed since
        // affiliations keep their add/remove UI.
        dataRecordsFormats:   formatsRef.current,
        // derived from the author table (Authors section)
        correspondingAuthors: deriveCorresponding(newAuthors),
        correspondingAuthor:  formatCorrespondingAuthors(deriveCorresponding(newAuthors)),
        authorContributions:  deriveContributionLines(newAuthors) || dd.authorContributions || '',
        affiliationsAutoGenerated: dd.affiliationsAutoGenerated,
        ackContributorsAdded:      dd.ackContributorsAdded,
        removedAffiliationIds:     dd.removedAffiliationIds || [],
        removedFormatExts:         removedExtsRef.current,
        dataRecordsSourceId:       sourceIdRef.current,
        filesSentence:             lastAutoSentence.current || dd.filesSentence || '',
        autoTree:                  lastAutoTree.current || dd.autoTree || '',
        autoVersionSpec:           autoVersionSpecRef.current || dd.autoVersionSpec || '',
        bucketExts:                [...bucketExtsRef.current],
        authors:           newAuthors,
        affiliations_list: newAffs,
        ...extra,
      }
    })
  }

  const handleValuesChange = (_, allValues) => {
    emitAll(authors, affiliations, allValues.dataDescriptor || {})
    setGenerated(false)
    setGenError('')
  }

  // ── corresponding authors come from the author table ────────────────────
  const corrAuthors = deriveCorresponding(authors)
  const corrProblem = (c) => {
    if (!c.name.trim()) return 'Please enter the name.'
    if (!c.email.trim()) return 'Please enter the email address.'
    if (!EMAIL_RE.test(c.email.trim())) return 'This email address does not look valid.'
    return ''
  }
  const corrAuthorsValid = corrAuthors.length > 0 && corrAuthors.every(c => !corrProblem(c))

  // ── file structure / format table ────────────────────────────────────────
  const changeFormats = (next) => {
    const nextExts = new Set(next.map(r => (r.extension || '').trim()))
    const removed = new Set(removedExtsRef.current)
    formatsRef.current.forEach((r) => {
      const e = (r.extension || '').trim()
      if (e && bucketExtsRef.current.has(e) && !nextExts.has(e)) removed.add(e)   // deleted or renamed
    })
    nextExts.forEach(e => removed.delete(e))                                       // typed or added back
    removedExtsRef.current = [...removed]
    formatsRef.current = next; setFormatRows(next); emitAll(authors, affiliations)
  }
  // Called automatically when the bucket has been read. The tree field is filled only while it is
  // empty or still the previous automatic text (so nothing the researcher typed is overwritten);
  // format rows are merged by extension so typed format/software text is kept.
  const lastAutoTree = useRef('')
  const lastAutoSentence = useRef('')
  const autoVersionSpecRef = useRef('')
  const treeAskOpen = useRef(false)
  const applyBucket = async (body, opts = {}) => {
    const id = String(data.datasetVersionId || '').trim()
    const manual = !!opts.manual
    // the draft carries a file structure from a different dataset version than the one open now
    const otherVersion = !!sourceIdRef.current && sourceIdRef.current !== id
    sourceIdRef.current = id
    const { tree, formats = [] } = body
    const newExts = new Set(formats.map(f => f.extension))
    const prevExts = new Set(bucketExtsRef.current)   // file types found at the previous read

    // ── file structure ────────────────────────────────────────────────────
    const curTree = (form.getFieldValue(['dataDescriptor', 'dataRecordsTree']) || '')
    if (tree) {
      const untouched = !curTree.trim() || curTree === lastAutoTree.current
      if (untouched || (otherVersion && !manual)) {
        if (!untouched) message.info('The file structure was refreshed because the draft belongs to a different dataset version.')
        form.setFieldValue(['dataDescriptor', 'dataRecordsTree'], tree)
        lastAutoTree.current = tree
      } else if ((tree !== lastAutoTree.current || manual) && tree !== curTree && !treeAskOpen.current) {
        // you edited the structure and the bucket has changed (or you asked to read it again): you decide
        treeAskOpen.current = true
        const replaceIt = await new Promise((resolve) => Modal.confirm({
          title: 'The files in your bucket have changed',
          width: 920,
          content: (
            <div>
              <div style={{ marginBottom: 8 }}>You have edited the file structure. Do you want to replace it with the current listing of the bucket?</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['Your file structure', curTree], ['Current bucket listing', tree]].map(([h, t]) => (
                  <div key={h} style={{ flex: 1, minWidth: 0 }}>
                    <b>{h}</b>
                    <pre style={{ whiteSpace: 'pre', overflow: 'auto', maxHeight: 320, fontSize: 11, background: '#fafafa', padding: 6, margin: '4px 0 0' }}>{t}</pre>
                  </div>
                ))}
              </div>
            </div>
          ),
          okText: 'Replace with the bucket listing', cancelText: 'Keep my text',
          onOk: () => resolve(true), onCancel: () => resolve(false),
        }))
        treeAskOpen.current = false
        if (replaceIt) form.setFieldValue(['dataDescriptor', 'dataRecordsTree'], tree)
        lastAutoTree.current = tree   // this listing is now known, no further question until the bucket changes again
      }
    }

    // ── one sentence about the files in the Summary ──────────────────────
    const sentence = (body.summarySentence || '').trim()
    if (sentence) {
      const sum = (form.getFieldValue(['dataDescriptor', 'summary']) || '').trim()
      if (!sum.includes(sentence)) {
        const own = /The shared data comprise[\s\S]*?\.(?=\s|$)/     // the automatic sentence, also if it was edited a little
        let next = null
        if (own.test(sum)) next = sum.replace(own, () => sentence)
        else if (!lastAutoSentence.current) next = sum ? `${sum} ${sentence}` : sentence
        // else: it was added before and the researcher deleted it, so it is not added again
        if (next !== null) form.setFieldValue(['dataDescriptor', 'summary'], next)
      }
      lastAutoSentence.current = sentence
    }

    // ── version specification: follows the bucket while it still has the automatic wording ──
    if (body.totals?.files && !body.truncated) {   // a partial listing has no reliable count
      const fm = formats.map(f => f.format || f.extension).filter(Boolean)
      const list = fm.length > 1 ? `${fm.slice(0, -1).join(', ')} and ${fm[fm.length - 1]}` : fm[0]
      const vs = `This version of the dataset includes ${body.totals.files} files${list ? ` (${list})` : ''}.`
      const curVS = (form.getFieldValue(['dataDescriptor', 'versionSpec']) || '').trim()
      // the automatic wording at the start of the text (also from drafts made before it was remembered)
      const lead = /^This version of the dataset includes \d+ files?[\s\S]*?\.(?=\s|$)/
      if (!curVS || curVS === autoVersionSpecRef.current) {
        form.setFieldValue(['dataDescriptor', 'versionSpec'], vs)
        autoVersionSpecRef.current = vs
      } else if (lead.test(curVS) && !curVS.startsWith(vs)) {
        form.setFieldValue(['dataDescriptor', 'versionSpec'], curVS.replace(lead, () => vs))   // your own added text is kept
        autoVersionSpecRef.current = vs
      }
    }

    // ── file format table ─────────────────────────────────────────────────
    // A format counts as deleted only while it stayed in the bucket; if its files vanished and come back, so does the row.
    if (otherVersion) removedExtsRef.current = []
    else if (prevExts.size) removedExtsRef.current = removedExtsRef.current.filter(e => prevExts.has(e))
    const dropped = new Set(removedExtsRef.current)
    const old = new Map(formatsRef.current.map(r => [r.extension, r]))
    const merged = formats.filter(f => !dropped.has(f.extension) || old.has(f.extension)).map(f => {
      const prev = old.get(f.extension)
      return { format: prev?.format || f.format || '', extension: f.extension, software: prev?.software || '', example: f.example }
    })
    // rows whose files are no longer in the bucket stay, marked, so that nothing typed is lost silently
    const extra = formatsRef.current
      .filter(r => !newExts.has(r.extension) && (r.format || r.software || r.extension))
      .map(r => (r.gone || prevExts.has(r.extension) || r.example) ? { ...r, gone: true } : r)
    bucketExtsRef.current = newExts
    formatsRef.current = [...merged, ...extra]
    setFormatRows(formatsRef.current)
    emitAll(authors, affiliations)
  }

  // ── author contributions: one line per author, "Name: contribution(s)" ────
  const personNameFor = (entry) => {
    if (entry.isCustom) return `${entry.firstName || ''} ${entry.lastName || ''}`.trim()
    const id = entry.selectedOtherContr || ''
    return personMap.get(id) || personMap.get(String(id).split('/').pop()) || ''
  }
  // Contributors who are not authors (Contributors step, "other contributors") are thanked once in the
  // Acknowledgements, as the template asks for non-author contributors. The researcher can edit the text.
  const ackDoneRef = useRef(false)
  useEffect(() => {
    if (ackDoneRef.current || dd.ackContributorsAdded || !contribTypes.size || !authors.length) return
    const authorNames = new Set(authors.map(a => (a.name || '').toLowerCase()))
    const others = (data.contribution?.contributor?.othercontr || []).map(c => ({
      name: personNameFor(c),
      roles: (c.contributionTypes || []).map(t => contribTypes.get(t)).filter(Boolean),
    })).filter(c => c.name)
    if (!others.length) return
    ackDoneRef.current = true
    const seen = new Set()
    const nonAuthors = others.filter(c => {
      const k = c.name.toLowerCase()
      if (authorNames.has(k) || seen.has(k)) return false
      seen.add(k); return true
    })
    if (nonAuthors.length) {
      const list = nonAuthors.map(c => c.roles.length ? `${c.name} (${c.roles.join(', ').toLowerCase()})` : c.name)
      const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0]
      const sentence = `We thank ${joined} for their contributions.`
      const cur = (form.getFieldValue(['dataDescriptor', 'funding']) || '').trim()
      if (!cur.includes(sentence)) form.setFieldValue(['dataDescriptor', 'funding'], cur ? `${sentence}\n${cur}` : sentence)
    }
    emitAll(authors, affiliations, undefined, { ackContributorsAdded: true })
  }, [authors, contribTypes, personMap, data.contribution]) // eslint-disable-line react-hooks/exhaustive-deps
  const authorsWithoutContribution = authors.filter(a => a.name && !(a.contributions || []).length)

  // text of the current answers for the per-section AI prompts
  const sectionPrompt = (key) => buildSectionPrompt(key, {
    data,
    values: { ...(form.getFieldsValue().dataDescriptor || {}), dataRecordsFormats: formatsRef.current, title: data.dataset1?.dataTitle, experimentFacts: factsBlock },
    folderListing,
    skill: SKILL_TEXTS,
  })
  const useSectionText = (field, text) => {
    form.setFieldValue(['dataDescriptor', field], text)
    emitAll(authors, affiliations)
  }

  // ── facts from the Experiments / Subjects steps ─────────────────────────
  const [facts, setFacts] = useState(null)
  useEffect(() => {
    let live = true
    buildLookups().then(lk => { if (live) setFacts(describeExperiment(data, lk)) }).catch(() => {})
    return () => { live = false }
  }, [data.experiments, data.subjectMetadata]) // eslint-disable-line react-hooks/exhaustive-deps
  const factsBlock = factsText(facts)
  // Methods starter (subject / preparation / techniques from the Experiments step): only into an empty field
  useEffect(() => {
    if (!facts) return
    const cur = (form.getFieldValue(['dataDescriptor', 'methods']) || '').trim()
    const starter = methodsStarter(facts)
    if (starter && !cur) {
      form.setFieldValue(['dataDescriptor', 'methods'], starter)
      emitAll(authors, affiliations)
    }
  }, [facts]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── completeness checklist ───────────────────────────────────────────────
  const fv = (f) => (form.getFieldValue(['dataDescriptor', f]) || '').toString().trim()
  const figs = useFigures()
  const swNoVersion = softwareWithoutVersion(fv('software'))
  const checklist = [
    { label: 'Dataset title (Dataset part 1): at most 110 characters, without colons or parentheses', ok: !!(data.dataset1?.dataTitle || '').trim() && data.dataset1.dataTitle.length <= TITLE_MAX_CHARS && !/[:()]/.test(data.dataset1.dataTitle) },
    { label: 'At least one corresponding author, with a valid email (Contributors)', ok: corrAuthorsValid },
    { label: 'Affiliation for every author (Contributors)', ok: authors.every(a => (a.affiliationNumbers || '').trim()) },
    { label: 'Email address for every author (Contributors)', ok: authors.every(a => EMAIL_RE.test((a.email || '').trim())) },
    { label: `Summary (at most ${SUMMARY_MAX_WORDS} words)`, field: 'summary', ok: !!fv('summary') && countWords(fv('summary')) <= SUMMARY_MAX_WORDS },
    { label: 'Methods (replace the [bracketed prompts] with your own text)', field: 'methods', ok: !!fv('methods') && !/\[(Ethics approval|Equipment, acquisition|Preprocessing and analysis|species, number)/.test(fv('methods')) },
    { label: 'File structure or file formats (Data description)', field: 'dataRecordsTree', ok: !!fv('dataRecordsTree') || formatRows.length > 0 },
    { label: 'Usage notes', field: 'usageNotes', ok: !!fv('usageNotes') },
    { label: 'File formats whose files are no longer in the bucket are deleted or kept on purpose (File formats)', field: 'dataRecordsFormats', ok: !formatRows.some(r => r.gone) },
    { label: `Contribution for every author (Contributors): ${authorsWithoutContribution.length} missing`, ok: authors.length > 0 && authorsWithoutContribution.length === 0 },
    { label: `Software: a version for every tool, or “version unknown” (missing for: ${swNoVersion.join(', ')})`, field: 'software', ok: swNoVersion.length === 0 },
    { label: 'Captions for all figures and tables', ok: figs.every(f => f.caption.trim()) },
  ]
  const missing = checklist.filter(c => !c.ok)

  const handleGenerate = async () => {
    setGenError('')
    const requiredFields = [
      'summary', 'methods', 'usageNotes',
    ]
    if (swNoVersion.length) {
      setGenError(`Please give a version for each software tool, or write “version unknown”: ${swNoVersion.join(', ')}.`)
      return
    }
    if (data.dataset1?.dataTitle && data.dataset1.dataTitle.length > TITLE_MAX_CHARS) {
      setGenError(`The title has ${data.dataset1.dataTitle.length} characters; the maximum is ${TITLE_MAX_CHARS} including spaces. Please shorten it in Dataset part 1.`)
      return
    }
    if (!corrAuthorsValid) {
      setGenError('Please mark at least one corresponding author (in the Contributors step) and give a valid email address for every author.')
      return
    }
    if (authorsWithoutContribution.length) {
      setGenError('Please give a contribution for every author in the Contributors step.')
      return
    }
    try {
      await form.validateFields(requiredFields.map((f) => ['dataDescriptor', f]))
    } catch {
      setGenError('Please fill in all required fields (marked with *) before generating. The summary can have at most 220 words.')
      return
    }
    if (getFigures().some(f => !f.caption.trim())) {
      setGenError('Every figure and table needs a caption.')
      return
    }
    setGenerating(true)
    try {
      const ddData = form.getFieldsValue().dataDescriptor || {}
      const result = await renderDataDescriptor({ dd: {
        ...ddData,
        title:             data.dataset1?.dataTitle || ddData.title,
        correspondingAuthor: formatCorrespondingAuthors(corrAuthors),
        authorContributions: deriveContributionLines(authors) || ddData.authorContributions || dd.authorContributions || '',
        dataRecordsFormats: formatsRef.current,
        authors,
        affiliations_list: affiliations,
      }, figures: getFigures(), fullData: data })
      downloadBlob(result.blob, result.filename)
      setGenNotice(result.notice || '')
      setGenerated(true)
    } catch (err) {
      console.error('Data descriptor generation failed:', err)
      setGenError('Generation failed — please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const title    = data.dataset1?.dataTitle || ''
  const titleTooLong = title.length > TITLE_MAX_CHARS
  const titleBadChars = /[:()]/.test(title)

  return (
    <div>
      <p className="step-title">Data Descriptor</p>

      {/* intro */}
      <div style={{
        background: '#f0faf4', border: '1px solid #b7ebce',
        borderRadius: 8, padding: '14px 18px', marginBottom: 24,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <InfoCircleOutlined style={{
          fontSize: 18, color: 'var(--ebrains-color-medium)', marginTop: 2, flexShrink: 0,
        }} />
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            What is a Data Descriptor?
          </Text>
          <Text style={{ fontSize: 13, color: '#444' }}>
            A Data Descriptor is a short document that helps other researchers understand,
            find and reuse your dataset. Fields marked{' '}
            <Tag color="green" style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>
              pre-filled
            </Tag>{' '}
            were automatically populated from your other wizard answers. Click <strong>Generate</strong> to download a formatted Word document.
            {' '}You may upload tables and figures (with captions) for improved readability where you see fit.
          </Text>
        </div>
      </div>

      <AntForm
        form={form}
        layout="vertical"
        initialValues={{ dataDescriptor: computeFieldValues(data) }}
        onValuesChange={handleValuesChange}
      >

        {/* ══ 1. Header ══════════════════════════════════════════════════ */}
        <AiDraftAll
          sections={[
            { key: 'summary',     label: 'Summary',         field: 'summary' },
            { key: 'methods',     label: 'Methods',         field: 'methods' },
            { key: 'dataRecords', label: 'Data records',    field: 'dataDescription' },
            { key: 'usage',       label: 'Usage notes',     field: 'usageNotes' },
          ]}
          buildPrompt={sectionPrompt}
          onUse={useSectionText}
        />

        <div style={{ margin: '0 0 12px' }}>
          <DdMarkdownImport
            getCurrent={(f) => f === 'dataRecordsTree' ? (form.getFieldValue(['dataDescriptor', 'dataRecordsTree']) || '') : (form.getFieldValue(['dataDescriptor', f]) || '')}
            getCurrentFormats={() => formatsRef.current}
            onApply={(patch, formats) => {
              Object.entries(patch).forEach(([f, v]) => form.setFieldValue(['dataDescriptor', f], v))
              if (formats) { formatsRef.current = formats; setFormatRows(formats) }
              emitAll(authors, affiliations)
              setGenerated(false)
            }} />
        </div>

        <SectionHeading number="1" title="Header information" />

        {/* title — read-only, always mirrors Dataset1 */}
        <AntForm.Item
          label={
            <span>
              Dataset title
              <Tag color="green" style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px', marginLeft: 6 }}>
                from Dataset part 1
              </Tag>
            </span>
          }
          extra={<span style={EXTRA}>This title is set in Dataset part 1 and cannot be changed here.</span>}
        >
          <div>
          <div style={{ textAlign: 'right', fontSize: 12, lineHeight: '18px', marginBottom: 2,
            color: titleTooLong ? '#cf1322' : 'rgba(0,0,0,0.55)', fontWeight: titleTooLong ? 600 : 400 }}>
            {title.length} / {TITLE_MAX_CHARS} characters
          </div>
          <div style={{
            padding:      '6px 11px',
            background:   '#f5f5f5',
            border:       '1px solid #d9d9d9',
            borderRadius: 6,
            color:        title ? '#1a1a1a' : '#bfbfbf',
            fontSize:     14,
            minHeight:    32,
          }}>
            {title || 'Not yet entered — please fill in Dataset part 1'}
          </div>
          {(titleTooLong || titleBadChars) && (
            <Alert type="error" showIcon style={{ marginTop: 6 }}
              message={titleTooLong
                ? `The title has ${title.length} characters; the maximum is ${TITLE_MAX_CHARS} including spaces. Please shorten it in Dataset part 1.`
                : 'The title must not contain colons or parentheses. Please change it in Dataset part 1.'} />
          )}
          </div>
        </AntForm.Item>

        {/* ── Authors: read-only overview; they are entered in the Contributors step ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Authors and affiliations
            </span>
            {onGoToContributors && <Button size="small" onClick={onGoToContributors}>Edit in Contributors</Button>}
          </div>
          <div style={{
            background: '#f0faf4', border: '1px solid #b7ebce',
            borderRadius: 6, padding: '5px 10px', marginBottom: 6,
            fontSize: 11, color: '#1a6b35',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <InfoCircleOutlined style={{ flexShrink: 0 }} />
            Authors, their affiliations, emails, contributions, corresponding and equal-contribution marks are entered in the
            Contributors step (the data custodian and the contact person on the first page). This is how they will appear in the data descriptor.
          </div>

          {authors.map((author) => {
            const issues = []
            if (!(author.affiliationNumbers || '').trim()) issues.push('affiliation')
            if (!EMAIL_RE.test((author.email || '').trim())) issues.push('email')
            if (!(author.contributions || []).length) issues.push('contribution')
            return (
              <div key={author.id} style={{ border: `1px solid ${issues.length ? '#ffa39e' : '#e1e8ef'}`, borderRadius: 6, padding: '6px 12px', marginTop: 6, background: '#fff', fontSize: 13 }}>
                <b>{author.name}</b>
                {author.affiliationNumbers ? <sup style={{ marginLeft: 2 }}>{author.affiliationNumbers}{author.corresponding ? ',*' : ''}</sup> : null}
                {author.equal ? <span style={{ color: '#888' }}> · contributed equally</span> : null}
                <div style={{ color: '#666', fontSize: 12 }}>
                  {[author.email, (author.contributions || []).join('; ')].filter(Boolean).join(' · ')}
                </div>
                {issues.length > 0 && <div style={{ color: '#cf1322', fontSize: 12 }}>Missing: {issues.join(', ')}. Please add it in the Contributors step.</div>}
              </div>
            )
          })}
          {authors.length === 0 && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              No authors yet — add the data custodian on the first page and the authors in the Contributors step.
            </div>
          )}
          {affiliations.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              {affiliations.map((aff) => (
                <div key={aff.id}><b style={{ color: 'var(--ebrains-color-medium)' }}>{aff.number}.</b> {aff.text}</div>
              ))}
            </div>
          )}
        </div>

        {/* ══ 2. Summary ═════════════════════════════════════════════════ */}
        <SectionHeading number="2" title="Summary" />

        <Q label="Summary" name="summary" prefilled={autoPopulated.summary} required example={EXAMPLES.summary}
          hint={<>
            Maximum 220 words, no references. Shortly summarise the content, provenance and usage potential of the shared data: include information about subjects, methods and materials, relevant study targets and in which context the data could be (re)used. Do not describe the research results, but describe purely the shared data. Write it so it is readily intelligible to any scientist, and explain specialised terms concisely. Suggested structure:
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              <li><b>Origin:</b> one sentence about the origin of the dataset.</li>
              <li><b>What are the data?</b> One or two sentences giving an overview, starting with “This dataset contains…”: content, type of data, modality, number of subjects and sessions, species, original purpose.</li>
              <li><b>Background and context:</b> one or two sentences that put the reader in the context of the subject (also for data that are not part of a research project).</li>
              <li><b>Why</b> were the data created and shared? If there was a specific hypothesis or research question, you may mention it.</li>
              <li><b>Methods and materials:</b> one or two sentences on how the data were acquired.</li>
              <li><b>Reusability:</b> one sentence on how the data can be reused.</li>
            </ul>
          </>}
          rules={[{
            validator: (_, v) => countWords(v) <= SUMMARY_MAX_WORDS
              ? Promise.resolve()
              : Promise.reject(new Error(`The summary has ${countWords(v)} words; the maximum is ${SUMMARY_MAX_WORDS}.`)),
          }]}>
          <WordCountArea max={SUMMARY_MAX_WORDS} autoSize={{ minRows: 5, maxRows: 14 }}
            placeholder="Write one sentence about the origin of the dataset, one or two giving an overview of the data, one or two on methods and materials, and one on reusability." />
        </Q>

        {/* ══ 3. Methods ═════════════════════════════════════════════════ */}
        <SectionHeading number="3" title="Methods" />

        <Q label="Version specifications" name="versionSpec"
          hint='What does this version of the dataset include (and, for later versions, what changed)? e.g. "This version of the dataset includes resting-state fMRI acquisitions along with the motion correction tables."'>
          <WordCountArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="This version of the dataset includes…" />
        </Q>

        <Q label="What methods were used to acquire the data?" name="methods" example={EXAMPLES.methods}
          exampleNote="Methods is the section curators comment on most. Describe subjects, acquisition and processing, and give a version for every software tool."
          hint={<>
            Describe the materials and methods used to generate the data. Include all specimens, acquisition techniques, processing steps (including validations and quality assessments), tools and workflows, and the relevant anatomical entity and location. Use subheadings for readability.
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              <li>You may cite previous methodological descriptions, but your text must be complete enough to be understood without reading them. Say where in the publication the description is (subheading, page).</li>
              <li><b>Anatomical information</b>, where applicable: the entity of the data (e.g. cell type, histological section), the anatomical location (brain region name or coordinates), and how it was defined (atlas and version, cell type ontology, coordinate system or template space, e.g. MNI Colin 27). For anatomical images or coordinates always give the coordinate system or template space, also if the data are in the subject's native space.</li>
              <li>Give a version for every software tool used for processing and analysis.</li>
            </ul>
          </>}
          required>
          <WordCountArea autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder="Rats were implanted with Neuropixels 1.0 probes under isoflurane anaesthesia…" />
        </Q>

        {/* ══ 4. Data description ════════════════════════════════════════ */}
        <SectionHeading number="4" title="Data description" />

        <Q label="Introduction to the data records (optional)" name="dataDescription" example={EXAMPLES.dataRecords}
          hint="Short text before the file tree. Mention the (meta)data standard followed (e.g. BIDS, NWB), explain filename codes if filenames carry information (e.g. sub-01_ses-02), and say what is inside container files, if any. Leave empty if the file tree and the format table say it all."
          prefilled={autoPopulated.dataDescription}>
          <WordCountArea autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder="The dataset contains spike-sorted activity. Files are provided in NWB format…" />
        </Q>

        <BucketStructurePanel
          datasetVersionId={data.datasetVersionId}
          standards={(data.dataset1?.dataStandart || []).filter(x => x !== "No, I didn't use a standard")}
          onListing={setFolderListing}
          onResult={applyBucket}
          treeText={form.getFieldValue(['dataDescriptor', 'dataRecordsTree']) || ''}
          summaryText={form.getFieldValue(['dataDescriptor', 'summary']) || ''}
          onFillTree={(t) => { form.setFieldValue(['dataDescriptor', 'dataRecordsTree'], t); lastAutoTree.current = t; emitAll(authors, affiliations) }}
          onAddSentence={(sent) => {
            const sum = (form.getFieldValue(['dataDescriptor', 'summary']) || '').trim()
            form.setFieldValue(['dataDescriptor', 'summary'], sum ? `${sum} ${sent}` : sent)
            lastAutoSentence.current = sent
            emitAll(authors, affiliations)
          }}
        />

        <Q label="File structure of the data" name="dataRecordsTree" example={EXAMPLES.tree}
          exampleNote="Generated from your bucket when possible. This is how the hierarchy should look: one entry per line, two spaces per level, a short description in square brackets."
          hint={'Reduced generic layout of the repository (see the template): one entry per line starting with "/", two spaces of indentation per folder level, and a one-sentence description of each example file in square brackets. Mention the (meta)data standard followed (e.g. BIDS) in the description above.'}>
          <TextArea autoSize={{ minRows: 6, maxRows: 24 }} wrap="off"
            style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
            placeholder={'/repository-root\n  /sub-XXX\n    /sub-XXX_slice-XXXX.tif [brain slice scan of subject XXX]'} />
        </Q>

        <FormatsTable rows={formatRows} onChange={changeFormats} />
        {toolsFound.length > 0 && formatRows.some(r => !r.software) && (
          <div style={{ margin: '-8px 0 16px', fontSize: 12 }}>
            Software named in your methods: <b>{toolsFound.join(', ')}</b>.{' '}
            <a onClick={fillSoftware}>Use it in the empty “Software used” cells</a> (then correct each row).
          </div>
        )}


        {/* ══ 5. Usage ═══════════════════════════════════════════════════ */}
        <SectionHeading number="5" title="Usage and reuse" />

        <Q label="What can this dataset be used for?" name="usageNotes" example={EXAMPLES.usage}
          hint='Suggest how the shared data can be (re)used, e.g. "the spike sorting and quality assurance make this dataset particularly interesting for precise spike-time analysis". Warnings about how they should NOT be reused go in the limitations field below.'
          required>
          <WordCountArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="The data can be used to examine spatial-coding neural populations…" />
        </Q>

        <Q label="What software or code can be used with the shared data?" name="software"
          hint="Suggest software or code for working with the data (loading routines, analyses, pipelines, visualisation tools) and say where it can be found. Give a version for each tool, one tool per line (e.g. FSL 6.0.5); if you do not know the version, write “version unknown”. Software that produced the files is also listed in the file format table above."
          example={EXAMPLES.software}
          prefilled={autoPopulated.software}>
          <WordCountArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Spike-sorted units can be loaded with PyNWB 2.6 (https://pynwb.readthedocs.io); MATLAB R2021b scripts for the analysis are in /code…" />
        </Q>
        {formatSoftware.length > 0 && !fv('software') && (
          <div style={{ margin: '-8px 0 16px', fontSize: 12 }}>
            Software named in the file format table: <b>{formatSoftware.join(', ')}</b>.{' '}
            <a onClick={fillSoftwareFromFormats}>Use it as a starting list</a> (then add versions).
          </div>
        )}
        {swNoVersion.length > 0 && (
          <Alert type="warning" showIcon style={{ margin: '-8px 0 16px' }}
            message={`No version given for: ${swNoVersion.join(', ')}. Add the version, or write “version unknown”.`} />
        )}

        <Q label="Are there any limitations or important caveats?" name="limitations"
          hint='Warn about inappropriate uses. e.g. "data are from adult subjects, unsuitable for developmental studies"'>
          <WordCountArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Spike sorting was performed automatically. Dataset limited to adult male rats…" />
        </Q>

        {/* ══ 6. Acknowledgements ════════════════════════════════════════ */}
        <SectionHeading number="6" title="Acknowledgements, author contributions and references" />

        <Q label="Funding and acknowledgements" name="funding"
          hint="Brief acknowledgements of non-author contributors and funding sources (grant name and number)."
          prefilled={autoPopulated.funding}>
          <WordCountArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="This project received funding from the European Research Council (ERC) under grant agreement No. …" />
        </Q>

        <Q label="References" name="references"
          hint="All references cited above, using Nature referencing style (Author et al., Journal, Year, doi).">
          <TextArea autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder={'1. Smith, J. et al. Title. Nature 123, 456–789 (2022). https://doi.org/…\n2. Jones, A. & Brown, B. Another paper. J. Neurosci. 40, 1234 (2021).'} />
        </Q>

        {/* ══ Figures and tables ═════════════════════════════════════════ */}
        <FiguresTablesPanel />

        {/* ══ Improve with your own AI assistant ═════════════════════════ */}
        <div style={{
          background: '#f7f9fb', border: '1px solid #d9e2ec', borderRadius: 8,
          padding: '14px 18px', marginTop: 28,
        }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            <RobotOutlined style={{ marginRight: 6 }} />
            Improve your Data Descriptor with your own AI assistant
          </Text>
          <Text style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 10 }}>
            Copy one ready-made prompt for the whole Data Descriptor and paste it into the AI assistant you normally use (Claude, ChatGPT, Copilot, …). It contains the EBRAINS Data Descriptor guide from
            the data curation team plus everything you have written so far, so the assistant only
            asks for what is missing and never invents facts. Nothing is sent anywhere from this
            page unless you add your own AI key; you review every suggestion before using it.
          </Text>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button icon={<CopyOutlined />} onClick={copyPrompt}>
              {promptCopied ? 'Copied!' : 'Copy AI prompt'}
            </Button>
            <Button icon={<DownloadOutlined />} href={SKILL_ZIP_URL} download>
              Download the skill (.zip)
            </Button>
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 12 }}>Kind of data (for domain-specific questions):</Text>
            <AntForm.Item name={['dataDescriptor', 'aiDomain']} style={{ margin: 0 }}>
              <Select size="small" allowClear style={{ width: 240 }}
                placeholder={(() => {
                  const d = detectDomain({}, folderListing)
                  return d ? `Detected from the files: ${({ fmri: 'MRI / fMRI', electrophysiology: 'electrophysiology', histology: 'histology / microscopy' })[d]}` : 'Detected automatically if possible'
                })()}
                options={[
                  { value: 'fmri', label: 'MRI / fMRI' },
                  { value: 'electrophysiology', label: 'Electrophysiology' },
                  { value: 'histology', label: 'Histology / microscopy' },
                  { value: 'other', label: 'Something else' },
                ]} />
            </AntForm.Item>
          </div>
          <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', display: 'block', marginTop: 8 }}>
            The downloadable skill is the same guide as a folder you can load into assistants that
            support skills (e.g. Claude). Do not paste confidential or unpublished data you are not
            allowed to share with an external AI service; check your institution's policy first.
          </Text>
        </div>

        <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: '12px 16px', marginTop: 24, background: missing.length ? '#fffbe6' : '#f6ffed' }}>
          <Text strong>{missing.length ? `Before you generate: ${missing.length} item${missing.length > 1 ? 's' : ''} still to complete` : '✓ All required items are complete'}</Text>
          {missing.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 13 }}>
              {missing.map(m => (
                <li key={m.label}>
                  {m.field ? <a onClick={() => form.scrollToField(['dataDescriptor', m.field])}>{m.label}</a> : m.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ══ Generate ═══════════════════════════════════════════════════ */}
        <div style={{
          borderTop: '1px solid #e5e5e5', marginTop: 28, paddingTop: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <Button className="next-back-button" icon={<FileTextOutlined />}
            size="large" loading={generating} onClick={handleGenerate}>
            Generate Data Descriptor (.docx)
          </Button>
          {generated && !genError && (
            <span style={{ fontSize: 13, color: 'var(--ebrains-color-dark)', fontWeight: 500 }}>
              ✓ Downloaded! Review and edit the Word file before sending to your curator.
            </span>
          )}
          {genError && (
            <span style={{ fontSize: 13, color: '#d32f2f' }}>{genError}</span>
          )}
          {generated && genNotice && (
            <span style={{ fontSize: 12, color: '#8c6d1f' }}>The file was created with the built-in generator instead of the official template renderer. ({genNotice})</span>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 10 }}>
          The generated document follows the EBRAINS Data Descriptor template.
          Fields marked <strong>pre-filled</strong> were populated automatically.
        </p>

      </AntForm>
    </div>
  )
}
