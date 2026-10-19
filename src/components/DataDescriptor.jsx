import { useState, useEffect, useRef } from 'react'
import { Form as AntForm, Input, Select, Button, Typography, Tag, Alert } from 'antd'
import { FileTextOutlined, InfoCircleOutlined, PlusOutlined, DeleteOutlined, CopyOutlined, DownloadOutlined, RobotOutlined } from '@ant-design/icons'
import { generateDataDescriptorDocx } from './generateDataDescriptorDocx'
import { buildAgentPrompt, buildSectionPrompt, detectDomain } from './dataDescriptorAgentPrompt'
import { SKILL_TEXTS, SKILL_ZIP_URL } from './dataDescriptorSkill'
import BucketStructurePanel from './BucketStructurePanel'
import AiDraftAll from './AiDraftAll'
import WordCountArea, { countWords } from './WordCountArea'
import { saveDraft, loadDraft, clearDraft } from './draftStore'
import { buildLookups } from './metadataLookups'
import { describeExperiment, factsText, methodsStarter } from './experimentFacts'
import FiguresTablesPanel from './FiguresTablesPanel'
import FormatsTable from './FormatsTable'
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
const Q = ({ label, name, hint, required, prefilled, rules, children }) => (
  <AntForm.Item
    label={<span>{label}{prefilled && <PrefilledBadge />}</span>}
    name={['dataDescriptor', name]}
    rules={[...(required ? [{ required: true, message: `Please fill in "${label}".` }] : []), ...(rules || [])]}
    extra={hint ? <span style={EXTRA}>{hint}</span> : undefined}
  >
    {prefilled && <PrefilledHint />}
    {children}
  </AntForm.Item>
)

// ── helpers ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUMMARY_MAX_WORDS = 220
export { countWords }

// "experimental, raw and derived data" from the Dataset part 1 check boxes (labels only)
function dataTypePhrase(options = []) {
  const map = { 'Experimental data': 'experimental', 'Simulated data': 'simulated', 'Raw data': 'raw', 'Derived data': 'derived' }
  const words = options.map(o => map[o]).filter(Boolean)
  if (!words.length) return ''
  const joined = words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0]
  return `${joined} data`
}

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

// The data custodian is the corresponding author (template); the contact person is added if different.
function prefillCorrespondingAuthors(data) {
  const out = []
  for (const p of [data.custodian, data.contactperson]) {
    if (!p) continue
    const name = `${p.firstName || ''} ${p.familyName || ''}`.trim()
    const email = (p.email || '').trim()
    if (!name && !email) continue
    if (email && out.some(o => o.email.toLowerCase() === email.toLowerCase())) continue
    out.push({ name, email })
  }
  return out
}

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

// ── build author rows including custodian ─────────────────────────────────
function buildAutoAuthors(data, personMap) {
  const cust         = data.custodian || {}
  const custName     = `${cust.firstName || ''} ${cust.familyName || ''}`.trim()
  const contribList  = data.contribution?.authors || []

  const rows = []

  // always add custodian first (affiliation 1)
  if (custName) {
    rows.push({
      id:                 'cust-0',
      name:               custName,
      affiliationNumbers: '1',
    })
  }

  // add contributors, skip if same as custodian
  contribList.forEach((a, i) => {
    const name = resolveAuthorName(a, personMap)
    if (!name) return
    // skip duplicate of custodian
    if (custName && name.toLowerCase() === custName.toLowerCase()) return
    rows.push({
      id:                 a.id || `contrib-${i}`,
      name,
      affiliationNumbers: '',
    })
  })

  return rows
}

// ── build affiliation rows from custodian institution ─────────────────────
function buildAutoAffiliations(data) {
  const inst = data.custodian?.institution || ''
  if (!inst) return []
  return [{ id: 'aff-0', number: '1', text: inst }]
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

    whatAreTheData: pf(dd.whatAreTheData, (() => {
      const types = dataTypePhrase(d1.optionsData || [])
      const s = buildSubjectSummary(subj)
      if (types && s) return `This dataset contains ${types} from ${s}.`
      if (types)      return `This dataset contains ${types}.`
      return s ? `This dataset contains data from ${s}.` : ''
    })()),

    scientificContext: dd.scientificContext  || '',
    motivation:        dd.motivation        || '',
    hypothesis:        dd.hypothesis        || '',
    // the brief summary from Dataset part 1 is the starting point
    summary:           pf(dd.summary, d1.briefSummary),
    methods:           dd.methods           || '',

    software: dd.software || '',

    dataDescription: pf(dd.dataDescription, (() => {
      const stds = (d1.dataStandart || []).filter(s => s !== "No, I didn't use a standard")
      return stds.length ? `Data follows the ${stds.join(', ')} standard.` : ''
    })()),

    dataRecordsTree:     dd.dataRecordsTree     || '',
    authorContributions: dd.authorContributions || '',
    aiDomain:            dd.aiDomain            || undefined,
    results:        dd.results        || '',
    dataRepository: pf(dd.dataRepository, d2.Data2UrlDoiRepo || d2.homePage || ''),
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
    whatAreTheData:      no('whatAreTheData')      && !!(dataTypePhrase(d1.optionsData || []) || buildSubjectSummary(subj)),
    summary:             no('summary')             && !!d1.briefSummary,
    dataDescription:     no('dataDescription')     && !!(d1.dataStandart?.filter(s => s !== "No, I didn't use a standard").length),
    dataRepository:      no('dataRepository')      && !!(d2.Data2UrlDoiRepo || d2.homePage),
    funding:             no('funding')             && !!buildFundingText(fund),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DataDescriptor({ form, onChange, data }) {
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

  // corresponding authors: the template wants name AND email for each. Older saved data only
  // has the text form "Name: email", which is parsed here.
  const [corrAuthors, setCorrAuthors] = useState(() => {
    if (Array.isArray(dd.correspondingAuthors) && dd.correspondingAuthors.length) return dd.correspondingAuthors
    const parsed = parseCorrespondingAuthors(dd.correspondingAuthor)
    return parsed.length ? parsed : prefillCorrespondingAuthors(data)
  })
  const corrRef = useRef(corrAuthors)
  const [showCorrErrors, setShowCorrErrors] = useState(false)
  const [formatRows, setFormatRows] = useState(Array.isArray(dd.dataRecordsFormats) ? dd.dataRecordsFormats : [])
  const formatsRef = useRef(formatRows)
  const [contribTypes, setContribTypes] = useState(new Map())   // KG identifier -> readable name
  const lastAutoContrib = useRef('')

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

    // 2. authors — a STRICT mirror of Contributors + Custodian. There is no
    // manual add/remove for authors anymore, so the membership of this list
    // is fully owned by the Contributors step: anyone added there appears
    // here automatically, anyone removed there disappears here automatically.
    // Per-author customizations that DO stay in this step (currently just
    // affiliationNumbers) are preserved for whoever remains, matched by id.
    const autoAuthors = buildAutoAuthors(data, personMap)
    const autoAuthorIds = new Set(autoAuthors.map(a => a.id))

    const existingAuthors = (dd.authors || [])
      .filter(a => autoAuthorIds.has(a.id)) // drop anyone no longer in Contributors/Custodian
      .map(a => ({
        ...a,
        // re-resolve if the stored name still looks like a KG reference
        // rather than a real name — either the full URL, or (as with a
        // newly-added contributor whose person record hadn't loaded into
        // personMap yet) a bare UUID left over from resolveAuthorName's
        // last-resort fallback. A bare UUID has no "/" and is exactly 36
        // characters, so a simple "no slash, short string" check wrongly
        // treats it as an already-resolved name and never retries — hence
        // the explicit UUID pattern check below.
        name: isUnresolvedReference(a.name) ? (personMap.get(a.name) || a.name) : a.name,
      }))
    const existingAuthorIds = new Set(existingAuthors.map(a => a.id))
    const newAuthors = autoAuthors.filter(a => !existingAuthorIds.has(a.id))
    const nextAuthors = [...existingAuthors, ...newAuthors]

    // 3. affiliations — unlike authors, these aren't sourced from a single
    // authoritative list elsewhere in the wizard (only the custodian's
    // institution is auto-derived; any co-author institutions are added by
    // hand in this step), so they keep the add/remove UI and the merge +
    // removedAffiliationIds tracking from before.
    const autoAffiliations = buildAutoAffiliations(data)
    const removedAffiliationIds = new Set(dd.removedAffiliationIds || [])
    const existingAffiliations  = dd.affiliations_list || []
    const existingAffiliationIds = new Set(existingAffiliations.map(a => a.id))
    const newAffiliations = autoAffiliations.filter(
      a => !existingAffiliationIds.has(a.id) && !removedAffiliationIds.has(a.id)
    )
    const nextAffiliations = [...existingAffiliations, ...newAffiliations]

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

  // file-format rows arriving later (JSON import)
  useEffect(() => {
    if (formatsRef.current.length || !Array.isArray(dd.dataRecordsFormats) || !dd.dataRecordsFormats.length) return
    formatsRef.current = dd.dataRecordsFormats
    setFormatRows(dd.dataRecordsFormats)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // corresponding authors arriving later (JSON import, custodian filled in earlier steps)
  useEffect(() => {
    if (!corrRef.current.every(c => !c.name && !c.email)) return
    const incoming = Array.isArray(dd.correspondingAuthors) && dd.correspondingAuthors.length
      ? dd.correspondingAuthors
      : (parseCorrespondingAuthors(dd.correspondingAuthor).length
        ? parseCorrespondingAuthors(dd.correspondingAuthor) : prefillCorrespondingAuthors(data))
    if (!incoming.length) return
    corrRef.current = incoming
    setCorrAuthors(incoming)
    emitAll(authors, affiliations)
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
        correspondingAuthors: corrRef.current,
        correspondingAuthor:  formatCorrespondingAuthors(corrRef.current),
        affiliationsAutoGenerated: dd.affiliationsAutoGenerated,
        removedAffiliationIds:     dd.removedAffiliationIds || [],
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

  // Authors have no add/remove UI — membership is a strict mirror of
  // Contributors + Custodian, reconciled in the sync effect above. The only
  // thing still editable per-author here is the affiliation number linking
  // them to an entry in the Affiliations list below.
  const updateAuthorAffiliationNumbers = (i, value) => {
    const next = authors.map((a, idx) => idx === i ? { ...a, affiliationNumbers: value } : a)
    setAuthors(next); emitAll(next, affiliations)
  }

  // ── affiliation handlers ────────────────────────────────────────────────
  // Same rule as authors: a manual edit stops the auto-sync from Custodian.
  const addAffiliation = () => {
    const next = [...affiliations, {
      id:     Date.now(),
      number: String(affiliations.length + 1),
      text:   '',
    }]
    setAffiliations(next); emitAll(authors, next, undefined, { affiliationsAutoGenerated: false })
  }
  const removeAffiliation = (i) => {
    const removedId = affiliations[i]?.id
    const next = affiliations
      .filter((_, idx) => idx !== i)
      .map((a, idx) => ({ ...a, number: String(idx + 1) }))
    setAffiliations(next)
    emitAll(authors, next, undefined, {
      affiliationsAutoGenerated: false,
      removedAffiliationIds: [...(dd.removedAffiliationIds || []), removedId],
    })
  }
  const updateAffiliation = (i, value) => {
    const next = affiliations.map((a, idx) => idx === i ? { ...a, text: value } : a)
    setAffiliations(next); emitAll(authors, next, undefined, { affiliationsAutoGenerated: false })
  }

  // ── corresponding author handlers ───────────────────────────────────────
  const changeCorrAuthors = (next) => {
    corrRef.current = next
    setCorrAuthors(next)
    emitAll(authors, affiliations)
  }
  const updateCorrAuthor = (i, patch) => changeCorrAuthors(corrAuthors.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  const addCorrAuthor    = () => changeCorrAuthors([...corrAuthors, { name: '', email: '' }])
  const removeCorrAuthor = (i) => changeCorrAuthors(corrAuthors.filter((_, idx) => idx !== i))
  const corrProblem = (c) => {
    if (!c.name.trim()) return 'Please enter the name.'
    if (!c.email.trim()) return 'Please enter the email address.'
    if (!EMAIL_RE.test(c.email.trim())) return 'This email address does not look valid.'
    return ''
  }
  const corrAuthorsValid = corrAuthors.length > 0 && corrAuthors.every(c => !corrProblem(c))

  // ── file structure / format table ────────────────────────────────────────
  const changeFormats = (next) => { formatsRef.current = next; setFormatRows(next); emitAll(authors, affiliations) }
  // Called automatically when the bucket has been read. The tree field is filled only while it is
  // empty or still the previous automatic text (so nothing the researcher typed is overwritten);
  // format rows are merged by extension so typed format/software text is kept.
  const lastAutoTree = useRef('')
  const lastAutoSentence = useRef('')
  const applyBucket = (body) => {
    // one sentence about the files goes into the Summary by itself (once per distinct sentence)
    const sentence = (body.summarySentence || '').trim()
    if (sentence && sentence !== lastAutoSentence.current) {
      const sum = (form.getFieldValue(['dataDescriptor', 'summary']) || '').trim()
      if (!sum.includes(sentence)) {
        form.setFieldValue(['dataDescriptor', 'summary'], sum ? `${sum} ${sentence}` : sentence)
      }
      lastAutoSentence.current = sentence
    }
    const { tree, formats } = body
    const cur = form.getFieldValue(['dataDescriptor', 'dataRecordsTree']) || ''
    if (tree && (!cur.trim() || cur === lastAutoTree.current)) {
      form.setFieldValue(['dataDescriptor', 'dataRecordsTree'], tree)
      lastAutoTree.current = tree
    }
    const old = new Map(formatsRef.current.map(r => [r.extension, r]))
    const merged = (formats || []).map(f => {
      const prev = old.get(f.extension)
      return { format: prev?.format || f.format || '', extension: f.extension, software: prev?.software || '', example: f.example }
    })
    const extra = formatsRef.current.filter(r => !(formats || []).some(f => f.extension === r.extension) && (r.format || r.software))
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
  const buildContributionLines = () => {
    const typesByName = new Map()
    ;(data.contribution?.contributor?.othercontr || []).forEach(c => {
      const n = personNameFor(c).toLowerCase()
      const names = (c.contributionTypes || []).map(t => contribTypes.get(t)).filter(Boolean)
      if (n && names.length) typesByName.set(n, names.map(x => x.toLowerCase()))
    })
    return authors.filter(a => a.name).map(a => `${a.name}: ${(typesByName.get(a.name.toLowerCase()) || []).join(', ')}`.trimEnd()).join('\n')
  }
  // Keep the field in step with the authors. Lines the researcher has written are kept; authors
  // missing from the text are appended, and an empty "Name:" is completed when the contributor
  // roles are known. If the text is still the previous automatic text it is simply replaced.
  const mergeContributions = (cur, auto) => {
    if (!cur.trim() || cur === lastAutoContrib.current) return auto
    const keyOf = (l) => l.split(':')[0].trim().toLowerCase()
    const lines = cur.split('\n')
    const have = new Map(lines.map((l, i) => [keyOf(l), i]))
    auto.split('\n').forEach(al => {
      const k = keyOf(al)
      if (!have.has(k)) { lines.push(al); return }
      const i = have.get(k)
      const written = lines[i].includes(':') ? lines[i].slice(lines[i].indexOf(':') + 1).trim() : ''
      const proposed = al.includes(':') ? al.slice(al.indexOf(':') + 1).trim() : ''
      if (!written && proposed) lines[i] = al
    })
    return lines.join('\n')
  }
  useEffect(() => {
    const auto = buildContributionLines()
    if (!auto) return
    const cur = form.getFieldValue(['dataDescriptor', 'authorContributions']) || ''
    const next = mergeContributions(cur, auto)
    if (next !== cur) {
      const replacedAll = !cur.trim() || cur === lastAutoContrib.current
      form.setFieldValue(['dataDescriptor', 'authorContributions'], next)
      if (replacedAll) lastAutoContrib.current = next
      emitAll(authors, affiliations)
    }
  }, [authors, contribTypes, personMap, data.contribution]) // eslint-disable-line react-hooks/exhaustive-deps
  const contribMissing = (form.getFieldValue(['dataDescriptor', 'authorContributions']) || '')
    .split('\n').map(l => l.trim()).filter(Boolean).filter(l => /:\s*$/.test(l) || !l.includes(':')).length

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

  // ── saved draft (this browser only) ──────────────────────────────────────
  const draftId = data.datasetVersionId
  const [restoredAt, setRestoredAt] = useState(null)
  useEffect(() => {
    const d = loadDraft(draftId)
    if (!d) return
    let changed = false
    Object.entries(d.values || {}).forEach(([f, v]) => {
      if (!(form.getFieldValue(['dataDescriptor', f]) || '').toString().trim()) {
        form.setFieldValue(['dataDescriptor', f], v); changed = true
        if (f === 'authorContributions') lastAutoContrib.current = v
      }
    })
    if (!formatsRef.current.length && d.formats?.length) {
      formatsRef.current = d.formats; setFormatRows(d.formats); changed = true
    }
    if (changed) { setRestoredAt(d.savedAt); emitAll(authors, affiliations) }
  }, [draftId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => saveDraft(draftId, data.dataDescriptor, formatsRef.current), 800)
    return () => clearTimeout(t)
  }, [data.dataDescriptor, formatRows, draftId])

  // ── completeness checklist ───────────────────────────────────────────────
  const fv = (f) => (form.getFieldValue(['dataDescriptor', f]) || '').toString().trim()
  const figs = useFigures()
  const checklist = [
    { label: 'Dataset title (Dataset part 1)', ok: !!(data.dataset1?.dataTitle || '').trim() },
    { label: 'Corresponding author(s): name and valid email', ok: corrAuthorsValid },
    { label: 'What are the data?', field: 'whatAreTheData', ok: !!fv('whatAreTheData') },
    { label: 'Scientific background and context', field: 'scientificContext', ok: !!fv('scientificContext') },
    { label: 'Motivation', field: 'motivation', ok: !!fv('motivation') },
    { label: 'Hypothesis or research question', field: 'hypothesis', ok: !!fv('hypothesis') },
    { label: `Summary (at most ${SUMMARY_MAX_WORDS} words)`, field: 'summary', ok: !!fv('summary') && countWords(fv('summary')) <= SUMMARY_MAX_WORDS },
    { label: 'Methods (replace the [bracketed prompts] with your own text)', field: 'methods', ok: !!fv('methods') && !/\[(Ethics approval|Equipment, acquisition|Preprocessing and analysis|species, number)/.test(fv('methods')) },
    { label: 'Dataset structure and content', field: 'dataDescription', ok: !!fv('dataDescription') },
    { label: 'Usage notes', field: 'usageNotes', ok: !!fv('usageNotes') },
    { label: 'Author contributions (every author has a contribution)', field: 'authorContributions', ok: !!fv('authorContributions') && contribMissing === 0 },
    { label: 'Captions for all figures and tables', ok: figs.every(f => f.caption.trim()) },
  ]
  const missing = checklist.filter(c => !c.ok)

  const handleGenerate = async () => {
    setGenError('')
    const requiredFields = [
      'whatAreTheData', 'scientificContext', 'summary',
      'motivation', 'hypothesis', 'methods', 'dataDescription', 'usageNotes', 'authorContributions',
    ]
    setShowCorrErrors(true)
    if (!corrAuthorsValid) {
      setGenError('Please give the name and a valid email address of every corresponding author.')
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
      await generateDataDescriptorDocx({
        ...ddData,
        title:             data.dataset1?.dataTitle || ddData.title,
        correspondingAuthor: formatCorrespondingAuthors(corrRef.current),
        dataRecordsFormats: formatsRef.current,
        authors,
        affiliations_list: affiliations,
        figures:           getFigures(),
        fullData:          data,
      })
      setGenerated(true)
    } catch (err) {
      console.error('Data descriptor generation failed:', err)
      setGenError('Generation failed — please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const title    = data.dataset1?.dataTitle || ''
  const hasAutoAffiliations = dd.affiliationsAutoGenerated !== false &&
    !!data.custodian?.institution

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
        {restoredAt && (
          <Alert type="info" showIcon closable style={{ marginBottom: 12 }} onClose={() => setRestoredAt(null)}
            message={`Your saved draft from ${new Date(restoredAt).toLocaleString()} was restored in this browser.`}
            description={<>Drafts are kept only in this browser. <a onClick={() => { clearDraft(draftId); setRestoredAt(null) }}>Delete the saved draft</a></>} />
        )}

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
        </AntForm.Item>

        {/* ── Corresponding authors: name AND email required for each ───── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 2 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Corresponding author(s)
            </span>
          </div>
          <span style={EXTRA}>
            The corresponding author is the person with the most detailed knowledge about the data and
            the contact for questions about it. The data custodian should always be listed; you may add
            more people. Name and email are required for each.
          </span>
          {corrAuthors.map((c, i) => {
            const problem = showCorrErrors ? corrProblem(c) : ''
            return (
              <div key={i} style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input value={c.name} onChange={e => updateCorrAuthor(i, { name: e.target.value })}
                    placeholder="Forename Surname" style={{ flex: '1 1 40%' }}
                    status={showCorrErrors && !c.name.trim() ? 'error' : ''} />
                  <Input value={c.email} onChange={e => updateCorrAuthor(i, { email: e.target.value })}
                    onBlur={() => setShowCorrErrors(true)}
                    placeholder="email@address" style={{ flex: '1 1 50%' }}
                    status={showCorrErrors && (!c.email.trim() || !EMAIL_RE.test(c.email.trim())) ? 'error' : ''} />
                  <Button size="small" type="text" danger icon={<DeleteOutlined />}
                    disabled={corrAuthors.length <= 1} onClick={() => removeCorrAuthor(i)} />
                </div>
                {problem && <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 2 }}>{problem}</div>}
              </div>
            )
          })}
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addCorrAuthor}
            style={{ marginTop: 8, width: '30%' }}>
            Add corresponding author
          </Button>
        </div>

        {/* ── Authors ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>Authors</span>
          </div>
          <div style={{
            background: '#f0faf4', border: '1px solid #b7ebce',
            borderRadius: 6, padding: '5px 10px', marginBottom: 6,
            fontSize: 11, color: '#1a6b35',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <InfoCircleOutlined style={{ flexShrink: 0 }} />
            This list always matches the Contributors step exactly — add, remove, or edit
            authors there. You only set affiliation number(s) here, to link each author to
            an institution in the list below.
          </div>

          {authors.map((author, i) => (
            <div key={author.id} style={{
              display: 'flex', gap: 8, alignItems: 'center', marginTop: 8,
            }}>
              <span style={{ flex: '1 1 200px', fontSize: 13 }}>{author.name}</span>
              <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>Affiliation no(s)</span>
              <Input size="small" value={author.affiliationNumbers}
                onChange={e => updateAuthorAffiliationNumbers(i, e.target.value)}
                placeholder="e.g. 1,2"
                style={{ width: 90, flexShrink: 0 }} />
            </div>
          ))}
          {authors.length === 0 && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              No authors yet — add contributors or a custodian earlier in the wizard.
            </div>
          )}
        </div>

        {/* ── Affiliations ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              Affiliations
              {hasAutoAffiliations && <PrefilledBadge />}
            </span>
          </div>
          {hasAutoAffiliations && <PrefilledHint />}
          <span style={EXTRA}>
            Numbered list of institutions. Authors reference these numbers in the field above.
          </span>

          {affiliations.map((aff, i) => (
            <div key={aff.id} style={{
              display: 'flex', gap: 8, alignItems: 'center', marginTop: 8,
            }}>
              <span style={{
                fontWeight: 700, color: 'var(--ebrains-color-medium)',
                fontSize: 13, width: 20, flexShrink: 0, textAlign: 'center',
              }}>{aff.number}.</span>
              <Input size="small" value={aff.text}
                onChange={e => updateAffiliation(i, e.target.value)}
                placeholder="Department, Institution, City, Country"
                style={{ flex: 1 }} />
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                onClick={() => removeAffiliation(i)} />
            </div>
          ))}

          <Button type="dashed" size="small" icon={<PlusOutlined />}
            onClick={addAffiliation} style={{ marginTop: 8, width: '30%' }}>
            Add affiliation
          </Button>
        </div>

        {/* ══ 2. Summary (was "Dataset identity" + "Scientific context") ══ */}
        <SectionHeading number="2" title="Summary" />

        <Q label="What are the data?" name="whatAreTheData"
          hint='Start with "This dataset contains…". Describe the type of data, modality, number of subjects/samples, species. (1–3 sentences)'
          required prefilled={autoPopulated.whatAreTheData}>
          <WordCountArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="This dataset contains experimental and raw electrophysiological recordings from 10 freely behaving rats…" />
        </Q>

        <Q label="What is the scientific background and context?" name="scientificContext"
          hint="What is the broader field of research? What was already known? Why is this area important? (2–4 sentences)"
          required>
          <WordCountArea autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="Grid cells in the medial entorhinal cortex are thought to provide a metric for spatial navigation…" />
        </Q>

        <Q label="What was the motivation for creating and sharing this dataset?" name="motivation"
          hint="Why was this study conducted? What gap does it fill? Why is sharing the data valuable?"
          required>
          <WordCountArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="We created this dataset to enable researchers to investigate theta-sweep dynamics…" />
        </Q>

        <Q label="What was the central hypothesis or research question?" name="hypothesis"
          hint="What did you set out to test or discover? One or two sentences." required>
          <WordCountArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="We hypothesised that attention-like modulation of theta sweeps would be observable…" />
        </Q>

        <Q label="Summary" name="summary" prefilled={autoPopulated.summary} required
          hint="Maximum 220 words, no references. Summarise the content, provenance and usage potential of the shared data (subjects, methods and materials, study targets, how the data could be reused). Describe the shared data, not the research results, in a way that any scientist can understand."
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

        <Q label="What methods were used to acquire the data?" name="methods"
          hint="Describe the experimental setup, equipment, recording parameters, and preprocessing."
          required>
          <WordCountArea autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder="Rats were implanted with Neuropixels 1.0 probes under isoflurane anaesthesia…" />
        </Q>

        <Q label="What software and analysis tools were used?" name="software"
          hint="List key software packages, toolboxes, or custom scripts (with versions if known)."
          prefilled={autoPopulated.software}>
          <WordCountArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Kilosort 2.5 (spike sorting), MATLAB R2021b (analysis), Python 3.9 (visualisation)…" />
        </Q>

        {/* ══ 4. Data description ════════════════════════════════════════ */}
        <SectionHeading number="4" title="Data description" />

        <Q label="Describe the dataset structure and content" name="dataDescription"
          hint="What files are included? What format? Did you follow a metadata standard (e.g. BIDS, NWB)?"
          required prefilled={autoPopulated.dataDescription}>
          <WordCountArea autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder="The dataset contains spike-sorted activity. Files are provided in NWB format…" />
        </Q>

        <BucketStructurePanel
          datasetVersionId={data.datasetVersionId}
          onListing={setFolderListing}
          onResult={applyBucket}
        />

        <Q label="File structure of the data" name="dataRecordsTree"
          hint={'Reduced generic layout of the repository (see the template): one entry per line starting with "/", two spaces of indentation per folder level, and a one-sentence description of each example file in square brackets. Mention the (meta)data standard followed (e.g. BIDS) in the description above.'}>
          <TextArea autoSize={{ minRows: 6, maxRows: 24 }} wrap="off"
            style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
            placeholder={'/repository-root\n  /sub-XXX\n    /sub-XXX_slice-XXXX.tif [brain slice scan of subject XXX]'} />
        </Q>

        <FormatsTable rows={formatRows} onChange={changeFormats} />


        <Q label="What are the key results or findings?" name="results"
          hint="Briefly summarise the main scientific findings. Published? In which journal? (2–4 sentences)">
          <WordCountArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Grid cells showed consistent theta-sweep modulation. Results published in Nature (2024, doi:…)." />
        </Q>

        <Q label="Data repository / DOI" name="dataRepository"
          hint="Where are the data stored? Link to the EBRAINS repository or data DOI."
          prefilled={autoPopulated.dataRepository}>
          <Input placeholder="https://doi.org/10.25493/…" />
        </Q>

        {/* ══ 5. Usage ═══════════════════════════════════════════════════ */}
        <SectionHeading number="5" title="Usage and reuse" />

        <Q label="What can this dataset be used for?" name="usageNotes"
          hint='Suggestions for use. e.g. "particularly suitable for precise spike-time analyses"'
          required>
          <WordCountArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="The data can be used to examine spatial-coding neural populations…" />
        </Q>

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

        <Q label="Author contributions" name="authorContributions" required
          hint="Briefly state each author's contribution to producing or maintaining the data and to publishing them, one author per line (e.g. “Jane Smith: data acquisition, data analysis”). Pre-filled with the authors from the Contributors step."
          prefilled={!!authors.length}>
          <TextArea autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder={'Jane Smith: image acquisition, data analysis\nJohn Doe: supervision'} />
        </Q>
        <div style={{ margin: '-8px 0 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {contribMissing > 0 && (
            <Text style={{ fontSize: 12, color: '#d48806' }}>
              {contribMissing} author{contribMissing > 1 ? 's still have' : ' still has'} no contribution written after the colon.
            </Text>
          )}
        </div>

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
        </div>

        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 10 }}>
          The generated document follows the EBRAINS Data Descriptor template.
          Fields marked <strong>pre-filled</strong> were populated automatically.
        </p>

      </AntForm>
    </div>
  )
}
