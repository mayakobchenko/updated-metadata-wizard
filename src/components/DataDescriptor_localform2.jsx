import { useState, useEffect } from 'react'
import { Form as AntForm, Input, Select, Button, Typography, Tag } from 'antd'
import { FileTextOutlined, InfoCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { generateDataDescriptorDocx } from './generateDataDescriptorDocx'

const { TextArea } = Input
const { Option }   = Select
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
    Pre-filled from your wizard answers — please review and expand. Testing new rancher cluster.
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
const Q = ({ label, name, hint, required, prefilled, children }) => (
  <AntForm.Item
    label={<span>{label}{prefilled && <PrefilledBadge />}</span>}
    name={['dataDescriptor', name]}
    rules={required ? [{ required: true, message: `Please fill in "${label}".` }] : []}
    extra={hint ? <span style={EXTRA}>{hint}</span> : undefined}
  >
    {prefilled && <PrefilledHint />}
    {children}
  </AntForm.Item>
)

const FIELDS_OF_STUDY = [
  'Neuroimaging', 'Electrophysiology', 'Anatomy / Neuroanatomy',
  'Behavioural neuroscience', 'Computational neuroscience',
  'Cellular / molecular neuroscience', 'Systems neuroscience',
  'Clinical neuroscience', 'Cognitive neuroscience', 'Other',
]

const STUDY_TYPES = [
  'Animal study (in vivo)', 'Human study (in vivo)', 'In vitro',
  'In silico / computational', 'Post-mortem / histology',
  'Clinical / patient study', 'Multimodal', 'Other',
]

// ── helpers ────────────────────────────────────────────────────────────────

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
  if (!funders.length) return ''
  return funders.map(f => {
    const parts = [f.funderName || f.customFunderName]
    if (f.awardTitle  || f.customAwardTitle)  parts.push(f.awardTitle || f.customAwardTitle)
    if (f.grantId     || f.awardNumber)       parts.push(`grant no. ${f.grantId || f.awardNumber}`)
    return parts.filter(Boolean).join(', ')
  }).filter(Boolean).join('.\n')
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
  const exp  = data.experiments     || {}
  const fund = data.funding         || {}
  const subj = data.subjectMetadata || {}
  const dd   = data.dataDescriptor  || {}

  // saved user value always wins
  const pf = (saved, auto) => (saved !== undefined && saved !== '') ? saved : (auto || '')

  // title always mirrors Dataset1 — never let a stale saved value override
  const title = d1.dataTitle || ''

  return {
    title,   // always from Dataset1, not from dd.title

    correspondingAuthor: pf(dd.correspondingAuthor, (() => {
      const name  = `${cont.firstName || ''} ${cont.familyName || ''}`.trim()
      const email = cont.email || ''
      return [name, email].filter(Boolean).join(': ')
    })()),

    dataType: pf(dd.dataType, (() => {
      const vals = d1.optionsData || []
      return vals.map(v =>
        typeof v === 'string' && v.startsWith('http') ? v.split('/').pop() : v
      ).join(', ')
    })()),

    fieldOfStudy:      dd.fieldOfStudy      || '',
    studyType:         dd.studyType         || '',

    whatAreTheData: pf(dd.whatAreTheData, (() => {
      const s = buildSubjectSummary(subj)
      return s ? `This dataset contains data from ${s}.` : ''
    })()),

    scientificContext: dd.scientificContext  || '',
    motivation:        dd.motivation        || '',
    hypothesis:        dd.hypothesis        || '',
    methods:           dd.methods           || '',

    software: pf(dd.software, (() => {
      const parts = []
      if (exp.techniques?.length)
        parts.push(`${exp.techniques.length} technique(s) selected in the Experiments step — please replace with specific tool names and versions.`)
      if (exp.preparationTypes?.length)
        parts.push(`Preparation type(s) selected in the Experiments step.`)
      return parts.join(' ')
    })()),

    dataDescription: pf(dd.dataDescription, (() => {
      const stds = (d1.dataStandart || []).filter(s => s !== "No, I didn't use a standard")
      return stds.length ? `Data follows the ${stds.join(', ')} standard.` : ''
    })()),

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
  const exp  = data.experiments     || {}
  const fund = data.funding         || {}
  const subj = data.subjectMetadata || {}
  const dd   = data.dataDescriptor  || {}
  const no   = (k) => !dd[k] || dd[k] === ''
  return {
    correspondingAuthor: no('correspondingAuthor') && !!(cont.firstName || cont.email),
    dataType:            no('dataType')            && !!(d1.optionsData?.length),
    whatAreTheData:      no('whatAreTheData')      && !!buildSubjectSummary(subj),
    software:            no('software')            && !!(exp.techniques?.length || exp.preparationTypes?.length),
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

  // ── local state for author / affiliation rows ─────────────────────────
  const [authors,      setAuthors]      = useState(dd.authors           || [])
  const [affiliations, setAffiliations] = useState(dd.affiliations_list || [])

  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [genError,   setGenError]   = useState('')

  // ── main sync effect — runs on mount and whenever data changes ────────
  // Uses full `data` as dep (same pattern as Dataset2) so it always runs
  // when navigating back to this step or after JSON import.
  // Also re-runs when personMap loads (author names resolve after fetch).
  useEffect(() => {
    // 1. scalar fields — written under the shared form's `dataDescriptor` namespace
    const fieldVals = computeFieldValues(data)
    form.setFieldsValue({ dataDescriptor: fieldVals })

    // 2. author rows
    if (!dd.authors || dd.authors.length === 0) {
      const auto = buildAutoAuthors(data, personMap)
      if (auto.length > 0) setAuthors(auto)
    } else {
      // re-resolve names in case personMap just loaded
      const resolved = dd.authors.map(a => ({
        ...a,
        // only re-resolve if name looks like a UUID (bare or URL)
        name: a.name && !a.name.includes('/') && a.name.length < 40
          ? a.name
          : (personMap.get(a.name) || a.name),
      }))
      setAuthors(resolved)
    }

    // 3. affiliation rows
    if (!dd.affiliations_list || dd.affiliations_list.length === 0) {
      const auto = buildAutoAffiliations(data)
      if (auto.length > 0) setAffiliations(auto)
    } else {
      setAffiliations(dd.affiliations_list)
    }
  }, [data, personMap]) // re-run when personMap loads too

  const autoPopulated = computeAutoPopulated(data)

  // ── emit all changes upward ───────────────────────────────────────────
  const emitAll = (newAuthors, newAffs, formVals) => {
    const vals = formVals !== undefined
      ? formVals
      : (form.getFieldsValue().dataDescriptor || {})
    // always override title with Dataset1 value so they stay in sync
    vals.title = data.dataset1?.dataTitle || ''
    onChange({
      dataDescriptor: {
        ...vals,
        authors:           newAuthors,
        affiliations_list: newAffs,
      }
    })
  }

  const handleValuesChange = (_, allValues) => {
    emitAll(authors, affiliations, allValues.dataDescriptor || {})
    setGenerated(false)
    setGenError('')
  }

  // ── author handlers ───────────────────────────────────────────────────
  const addAuthor = () => {
    const next = [...authors, { id: Date.now(), name: '', affiliationNumbers: '' }]
    setAuthors(next); emitAll(next, affiliations)
  }
  const removeAuthor = (i) => {
    const next = authors.filter((_, idx) => idx !== i)
    setAuthors(next); emitAll(next, affiliations)
  }
  const updateAuthor = (i, field, value) => {
    const next = authors.map((a, idx) => idx === i ? { ...a, [field]: value } : a)
    setAuthors(next); emitAll(next, affiliations)
  }

  // ── affiliation handlers ──────────────────────────────────────────────
  const addAffiliation = () => {
    const next = [...affiliations, {
      id:     Date.now(),
      number: String(affiliations.length + 1),
      text:   '',
    }]
    setAffiliations(next); emitAll(authors, next)
  }
  const removeAffiliation = (i) => {
    const next = affiliations
      .filter((_, idx) => idx !== i)
      .map((a, idx) => ({ ...a, number: String(idx + 1) }))
    setAffiliations(next); emitAll(authors, next)
  }
  const updateAffiliation = (i, value) => {
    const next = affiliations.map((a, idx) => idx === i ? { ...a, text: value } : a)
    setAffiliations(next); emitAll(authors, next)
  }

  const handleGenerate = async () => {
    setGenError('')
    const requiredFields = [
      'fieldOfStudy', 'whatAreTheData', 'scientificContext',
      'motivation', 'hypothesis', 'methods', 'dataDescription', 'usageNotes',
    ]
    try {
      await form.validateFields(requiredFields.map((f) => ['dataDescriptor', f]))
    } catch {
      setGenError('Please fill in all required fields (marked with *) before generating.')
      return
    }
    setGenerating(true)
    try {
      const ddData = form.getFieldsValue().dataDescriptor || {}
      await generateDataDescriptorDocx({
        ...ddData,
        title:             data.dataset1?.dataTitle || ddData.title,
        authors,
        affiliations_list: affiliations,
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

  const rowLabel = { fontSize: 11, color: '#888', marginBottom: 2 }
  const title    = data.dataset1?.dataTitle || ''
  const hasAutoAuthors = !dd.authors?.length &&
    !!(data.custodian?.firstName || data.contribution?.authors?.length)

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
            were automatically populated from your other wizard answers — please review and
            expand them. Click <strong>Generate</strong> to download a formatted Word document.
          </Text>
        </div>
      </div>

      <AntForm form={form} layout="vertical" onValuesChange={handleValuesChange}>

        {/* ══ 1. Header ══════════════════════════════════════════════════ */}
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

        <Q label="Corresponding author / contact" name="correspondingAuthor"
          hint="Name and email of the person to contact regarding this dataset."
          prefilled={autoPopulated.correspondingAuthor}>
          <Input placeholder="e.g. Jane Smith: jane.smith@university.edu" />
        </Q>

        {/* ── Authors ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              Authors
              {hasAutoAuthors && <PrefilledBadge />}
            </span>
          </div>
          {hasAutoAuthors && <PrefilledHint />}
          <span style={EXTRA}>
            List all authors. Use the affiliation number(s) to link each author
            to their institution(s) in the list below.
          </span>

          {authors.map((author, i) => (
            <div key={author.id} style={{
              display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap',
              marginTop: 8, border: '1px solid #e8e8e8', borderRadius: 6,
              padding: '10px 12px', background: '#fafafa',
            }}>
              <div style={{ flex: '2 1 200px' }}>
                <div style={rowLabel}>Full name</div>
                <Input size="small" value={author.name}
                  onChange={e => updateAuthor(i, 'name', e.target.value)}
                  placeholder="e.g. Jane Smith" />
              </div>
              <div style={{ flex: '0 0 110px' }}>
                <div style={rowLabel}>Affiliation no(s)</div>
                <Input size="small" value={author.affiliationNumbers}
                  onChange={e => updateAuthor(i, 'affiliationNumbers', e.target.value)}
                  placeholder="e.g. 1,2" />
              </div>
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                onClick={() => removeAuthor(i)} style={{ flexShrink: 0 }} />
            </div>
          ))}

          <Button type="dashed" size="small" icon={<PlusOutlined />}
            onClick={addAuthor} style={{ marginTop: 8, width: '30%' }}>
            Add author
          </Button>
        </div>

        {/* ── Affiliations ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              Affiliations
              {data.custodian?.institution && !dd.affiliations_list?.length && <PrefilledBadge />}
            </span>
          </div>
          {data.custodian?.institution && !dd.affiliations_list?.length && <PrefilledHint />}
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

        {/* ══ 2. Dataset identity ════════════════════════════════════════ */}
        <SectionHeading number="2" title="Dataset identity" />

        <Q label="What type of data do you share?" name="dataType"
          hint="e.g. experimental data, raw recordings, derived/analysed data, software."
          prefilled={autoPopulated.dataType}>
          <Input placeholder="e.g. Experimental electrophysiological recordings (raw and spike-sorted)" />
        </Q>

        <Q label="Field of study" name="fieldOfStudy"
          hint="Select the primary scientific domain of this dataset." required>
          <Select placeholder="Select field of study" style={{ width: '100%' }}>
            {FIELDS_OF_STUDY.map(f => <Option key={f} value={f}>{f}</Option>)}
          </Select>
        </Q>

        <Q label="Type of study" name="studyType"
          hint="What kind of experimental or computational approach was used?">
          <Select placeholder="Select study type" style={{ width: '100%' }}>
            {STUDY_TYPES.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Q>

        <Q label="What are the data?" name="whatAreTheData"
          hint='Start with "This dataset contains…". Describe modality, number of subjects/samples, species. (1–3 sentences)'
          required prefilled={autoPopulated.whatAreTheData}>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="This dataset contains electrophysiological recordings from 10 freely behaving rats…" />
        </Q>

        {/* ══ 3. Scientific context ══════════════════════════════════════ */}
        <SectionHeading number="3" title="Scientific context" />

        <Q label="What is the scientific background and context?" name="scientificContext"
          hint="What is the broader field of research? What was already known? Why is this area important? (2–4 sentences)"
          required>
          <TextArea autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="Grid cells in the medial entorhinal cortex are thought to provide a metric for spatial navigation…" />
        </Q>

        <Q label="What was the motivation for creating and sharing this dataset?" name="motivation"
          hint="Why was this study conducted? What gap does it fill? Why is sharing the data valuable?"
          required>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="We created this dataset to enable researchers to investigate theta-sweep dynamics…" />
        </Q>

        <Q label="What was the central hypothesis or research question?" name="hypothesis"
          hint="What did you set out to test or discover? One or two sentences." required>
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="We hypothesised that attention-like modulation of theta sweeps would be observable…" />
        </Q>

        {/* ══ 4. Methods ═════════════════════════════════════════════════ */}
        <SectionHeading number="4" title="Methods" />

        <Q label="What methods were used to acquire the data?" name="methods"
          hint="Describe the experimental setup, equipment, recording parameters, and preprocessing."
          required>
          <TextArea autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder="Rats were implanted with Neuropixels 1.0 probes under isoflurane anaesthesia…" />
        </Q>

        <Q label="What software and analysis tools were used?" name="software"
          hint="List key software packages, toolboxes, or custom scripts (with versions if known)."
          prefilled={autoPopulated.software}>
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Kilosort 2.5 (spike sorting), MATLAB R2021b (analysis), Python 3.9 (visualisation)…" />
        </Q>

        {/* ══ 5. Data description ════════════════════════════════════════ */}
        <SectionHeading number="5" title="Data description" />

        <Q label="Describe the dataset structure and content" name="dataDescription"
          hint="What files are included? What format? Did you follow a metadata standard (e.g. BIDS, NWB)?"
          required prefilled={autoPopulated.dataDescription}>
          <TextArea autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder="The dataset contains spike-sorted activity. Files are provided in NWB format…" />
        </Q>

        <Q label="What are the key results or findings?" name="results"
          hint="Briefly summarise the main scientific findings. Published? In which journal? (2–4 sentences)">
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Grid cells showed consistent theta-sweep modulation. Results published in Nature (2024, doi:…)." />
        </Q>

        <Q label="Data repository / DOI" name="dataRepository"
          hint="Where are the data stored? Link to the EBRAINS repository or data DOI."
          prefilled={autoPopulated.dataRepository}>
          <Input placeholder="https://doi.org/10.25493/…" />
        </Q>

        {/* ══ 6. Usage ═══════════════════════════════════════════════════ */}
        <SectionHeading number="6" title="Usage and reuse" />

        <Q label="What can this dataset be used for?" name="usageNotes"
          hint='Suggestions for use. e.g. "particularly suitable for precise spike-time analyses"'
          required>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="The data can be used to examine spatial-coding neural populations…" />
        </Q>

        <Q label="Are there any limitations or important caveats?" name="limitations"
          hint='Warn about inappropriate uses. e.g. "data are from adult subjects, unsuitable for developmental studies"'>
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Spike sorting was performed automatically. Dataset limited to adult male rats…" />
        </Q>

        {/* ══ 7. Acknowledgements ════════════════════════════════════════ */}
        <SectionHeading number="7" title="Acknowledgements and References" />

        <Q label="Funding and acknowledgements" name="funding"
          hint="Brief acknowledgements of non-author contributors and funding sources (grant name and number)."
          prefilled={autoPopulated.funding}>
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="This project received funding from the European Research Council (ERC) under grant agreement No. …" />
        </Q>

        <Q label="References" name="references"
          hint="All references cited above, using Nature referencing style (Author et al., Journal, Year, doi).">
          <TextArea autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder={'1. Smith, J. et al. Title. Nature 123, 456–789 (2022). https://doi.org/…\n2. Jones, A. & Brown, B. Another paper. J. Neurosci. 40, 1234 (2021).'} />
        </Q>

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
          Fields marked <strong>pre-filled</strong> were populated automatically —
          please review and expand them before submitting to your curator.
        </p>

      </AntForm>
    </div>
  )
}
