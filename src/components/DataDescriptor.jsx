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
    Pre-filled from your wizard answers — please review and expand.
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

// ── build author list from contribution.authors ───────────────────────────
// Each author entry is { selectedAuthor: KG_URL, isCustom, firstName, lastName }
// We store { name, affiliation, affiliationNumbers } per author in dataDescriptor
function buildAutoAuthors(data) {
  const contribAuthors = data.contribution?.authors || []
  const cust           = data.custodian || {}
  const custName       = `${cust.firstName || ''} ${cust.familyName || ''}`.trim()

  if (!contribAuthors.length) {
    // fallback: just custodian
    if (custName) return [{ id: 'cust', name: custName, affiliation: cust.institution || '', affiliationNumbers: '1' }]
    return []
  }

  return contribAuthors.map((a, i) => {
    let name = ''
    if (a.isCustom) {
      name = `${a.firstName || ''} ${a.lastName || ''}`.trim()
    } else if (a.selectedAuthor) {
      // KG URL — use as placeholder; real name resolved at display time
      // but we may have it stored in Person.json via the contributors step
      name = `${a.firstName || ''} ${a.lastName || ''}`.trim()
        || a.selectedAuthor.split('/').pop()
    }
    return {
      id:                  a.id || `author-${i}`,
      name:                name,
      affiliation:         i === 0 ? (cust.institution || '') : '',
      affiliationNumbers:  String(i + 1),
    }
  })
}

// ── build affiliations list from authors (deduplicated) ───────────────────
function buildAutoAffiliations(data) {
  const cust = data.custodian || {}
  if (cust.institution) {
    return [{ id: 'aff-1', number: '1', text: cust.institution }]
  }
  return []
}

// ── compute simple scalar field values ────────────────────────────────────
function computeScalarFields(data) {
  const d1   = data.dataset1        || {}
  const d2   = data.dataset2        || {}
  const cont = data.contactperson   || {}
  const exp  = data.experiments     || {}
  const fund = data.funding         || {}
  const subj = data.subjectMetadata || {}
  const dd   = data.dataDescriptor  || {}

  const pf = (saved, auto) => (saved !== undefined && saved !== '') ? saved : (auto || '')

  const autoCorrespondingAuthor = (() => {
    const name  = `${cont.firstName || ''} ${cont.familyName || ''}`.trim()
    const email = cont.email || ''
    return [name, email].filter(Boolean).join(': ')
  })()

  const autoDataType = (() => {
    const vals = d1.optionsData || []
    if (!vals.length) return ''
    return vals
      .map(v => typeof v === 'string' && v.startsWith('http') ? v.split('/').pop() : v)
      .join(', ')
  })()

  const autoWhatAreTheData = (() => {
    const summary = buildSubjectSummary(subj)
    return summary ? `This dataset contains data from ${summary}.` : ''
  })()

  const autoSoftware = (() => {
    const parts = []
    if (exp.techniques?.length)
      parts.push(`${exp.techniques.length} technique(s) selected in the Experiments step — please replace with specific tool names and versions.`)
    if (exp.preparationTypes?.length)
      parts.push(`Preparation type(s) selected in the Experiments step.`)
    return parts.join(' ')
  })()

  const autoDataDescription = (() => {
    const stds = (d1.dataStandart || []).filter(s => s !== "No, I didn't use a standard")
    return stds.length ? `Data follows the ${stds.join(', ')} standard.` : ''
  })()

  return {
    title:               pf(dd.title,               d1.dataTitle || ''),
    correspondingAuthor: pf(dd.correspondingAuthor, autoCorrespondingAuthor),
    dataType:            pf(dd.dataType,            autoDataType),
    fieldOfStudy:        dd.fieldOfStudy            || '',
    studyType:           dd.studyType               || '',
    whatAreTheData:      pf(dd.whatAreTheData,      autoWhatAreTheData),
    scientificContext:   dd.scientificContext        || '',
    motivation:          dd.motivation              || '',
    hypothesis:          dd.hypothesis              || '',
    methods:             dd.methods                 || '',
    software:            pf(dd.software,            autoSoftware),
    dataDescription:     pf(dd.dataDescription,     autoDataDescription),
    results:             dd.results                 || '',
    dataRepository:      pf(dd.dataRepository,      d2.Data2UrlDoiRepo || d2.homePage || ''),
    usageNotes:          dd.usageNotes              || '',
    limitations:         dd.limitations             || '',
    funding:             pf(dd.funding,             buildFundingText(fund)),
    references:          dd.references              || '',
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
  const noUserVal = (key) => !dd[key] || dd[key] === ''
  return {
    title:               noUserVal('title')               && !!d1.dataTitle,
    correspondingAuthor: noUserVal('correspondingAuthor') && !!(cont.firstName || cont.email),
    dataType:            noUserVal('dataType')            && !!(d1.optionsData?.length),
    whatAreTheData:      noUserVal('whatAreTheData')      && !!buildSubjectSummary(subj),
    software:            noUserVal('software')            && !!(exp.techniques?.length || exp.preparationTypes?.length),
    dataDescription:     noUserVal('dataDescription')     && !!(d1.dataStandart?.filter(s => s !== "No, I didn't use a standard").length),
    dataRepository:      noUserVal('dataRepository')      && !!(d2.Data2UrlDoiRepo || d2.homePage),
    funding:             noUserVal('funding')             && !!buildFundingText(fund),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DataDescriptor({ form: _sharedForm, onChange, data }) {
  const [localForm] = AntForm.useForm()
  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [genError,   setGenError]   = useState('')

  // ── authors: local state, pre-filled from contribution.authors ────────
  const dd = data.dataDescriptor || {}
  const [authors, setAuthors]           = useState(dd.authors           || buildAutoAuthors(data))
  const [affiliations, setAffiliations] = useState(dd.affiliations_list || buildAutoAffiliations(data))

  // ── sync scalar fields whenever source data changes ───────────────────
  // This is the same pattern as Dataset1 — useEffect with specific deps.
  useEffect(() => {
    localForm.setFieldsValue(computeScalarFields(data))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.dataset1?.dataTitle,
    data.dataset1?.optionsData,
    data.dataset1?.dataStandart,
    data.contactperson?.firstName,
    data.contactperson?.familyName,
    data.contactperson?.email,
    data.experiments?.techniques,
    data.experiments?.preparationTypes,
    data.subjectMetadata,
    data.funding?.funders,
    data.dataset2?.Data2UrlDoiRepo,
    data.dataset2?.homePage,
    data.dataDescriptor,
  ])

  // ── sync authors/affiliations when contributors or custodian change ───
  useEffect(() => {
    const savedAuthors = data.dataDescriptor?.authors
    if (!savedAuthors || savedAuthors.length === 0) {
      // only auto-fill if user hasn't manually edited yet
      const auto = buildAutoAuthors(data)
      if (auto.length > 0) setAuthors(auto)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.contribution?.authors,
    data.custodian?.firstName,
    data.custodian?.familyName,
    data.custodian?.institution,
  ])

  useEffect(() => {
    const savedAffs = data.dataDescriptor?.affiliations_list
    if (!savedAffs || savedAffs.length === 0) {
      const auto = buildAutoAffiliations(data)
      if (auto.length > 0) setAffiliations(auto)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.custodian?.institution])

  // ── emit changes upward (merges into formData → appears in JSON) ──────
  const emitAll = (newAuthors, newAffs, formVals) => {
    const vals = formVals || localForm.getFieldsValue()
    onChange({
      dataDescriptor: {
        ...vals,
        authors:           newAuthors,
        affiliations_list: newAffs,
      }
    })
  }

  const handleValuesChange = (_, allValues) => {
    emitAll(authors, affiliations, allValues)
    setGenerated(false)
    setGenError('')
  }

  // ── author handlers ───────────────────────────────────────────────────
  const addAuthor = () => {
    const next = [...authors, { id: Date.now(), name: '', affiliation: '', affiliationNumbers: '' }]
    setAuthors(next)
    emitAll(next, affiliations, null)
  }

  const removeAuthor = (idx) => {
    const next = authors.filter((_, i) => i !== idx)
    setAuthors(next)
    emitAll(next, affiliations, null)
  }

  const updateAuthor = (idx, field, value) => {
    const next = authors.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAuthors(next)
    emitAll(next, affiliations, null)
  }

  // ── affiliation handlers ──────────────────────────────────────────────
  const addAffiliation = () => {
    const num  = String(affiliations.length + 1)
    const next = [...affiliations, { id: Date.now(), number: num, text: '' }]
    setAffiliations(next)
    emitAll(authors, next, null)
  }

  const removeAffiliation = (idx) => {
    const next = affiliations.filter((_, i) => i !== idx)
    // renumber
    const renumbered = next.map((a, i) => ({ ...a, number: String(i + 1) }))
    setAffiliations(renumbered)
    emitAll(authors, renumbered, null)
  }

  const updateAffiliation = (idx, field, value) => {
    const next = affiliations.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAffiliations(next)
    emitAll(authors, next, null)
  }

  const autoPopulated = computeAutoPopulated(data)

  const handleGenerate = async () => {
    setGenError('')
    try {
      await localForm.validateFields([
        'title', 'fieldOfStudy', 'whatAreTheData',
        'scientificContext', 'motivation', 'hypothesis',
        'methods', 'dataDescription', 'usageNotes',
      ])
    } catch {
      setGenError('Please fill in all required fields (marked with *) before generating.')
      return
    }
    setGenerating(true)
    try {
      const ddData = localForm.getFieldsValue()
      await generateDataDescriptorDocx({
        ...ddData,
        authors,
        affiliations_list: affiliations,
        fullData: data,
      })
      setGenerated(true)
    } catch (err) {
      console.error('Data descriptor generation failed:', err)
      setGenError('Generation failed — please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const Q = ({ label, name, hint, required, prefilled, children }) => (
    <AntForm.Item
      label={<span>{label}{prefilled && <PrefilledBadge />}</span>}
      name={name}
      rules={required ? [{ required: true, message: `Please fill in "${label}".` }] : []}
      extra={hint ? <span style={EXTRA}>{hint}</span> : undefined}
    >
      {prefilled && <PrefilledHint />}
      {children}
    </AntForm.Item>
  )

  // ── label style for author/affiliation rows ───────────────────────────
  const rowLabel = { fontSize: 11, color: '#888', marginBottom: 2 }

  return (
    <div>
      <p className="step-title">Data Descriptor</p>

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

      <AntForm form={localForm} layout="vertical" onValuesChange={handleValuesChange}>

        {/* ══ 1. Header ══════════════════════════════════════════════════ */}
        <SectionHeading number="1" title="Header information" />

        <Q label="Dataset title" name="title"
          hint="Use the same title as in Dataset part 1. Avoid acronyms and abbreviations."
          required prefilled={autoPopulated.title}>
          <Input />
        </Q>

        <Q label="Corresponding author / contact" name="correspondingAuthor"
          hint="Name and email of the person to contact regarding this dataset."
          prefilled={autoPopulated.correspondingAuthor}>
          <Input placeholder="e.g. Jane Smith: jane.smith@university.edu" />
        </Q>

        {/* ── Authors ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              Authors
              {data.contribution?.authors?.length > 0 && <PrefilledBadge />}
            </span>
          </div>
          {data.contribution?.authors?.length > 0 && !data.dataDescriptor?.authors?.length && (
            <PrefilledHint />
          )}
          <span style={EXTRA}>
            List all authors. Use the affiliation number(s) to link each author to their institution(s).
          </span>

          {authors.map((author, idx) => (
            <div key={author.id} style={{
              border: '1px solid #e8e8e8', borderRadius: 6,
              padding: '10px 14px', marginTop: 8, background: '#fafafa',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>

                {/* name */}
                <div style={{ flex: '2 1 200px' }}>
                  <div style={rowLabel}>Full name</div>
                  <Input
                    size="small"
                    value={author.name}
                    onChange={e => updateAuthor(idx, 'name', e.target.value)}
                    placeholder="e.g. Jane Smith"
                  />
                </div>

                {/* affiliation numbers */}
                <div style={{ flex: '0 0 90px' }}>
                  <div style={rowLabel}>Affil. no(s)</div>
                  <Input
                    size="small"
                    value={author.affiliationNumbers}
                    onChange={e => updateAuthor(idx, 'affiliationNumbers', e.target.value)}
                    placeholder="1,2"
                  />
                </div>

                {/* remove button */}
                <Button
                  size="small" type="text" danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeAuthor(idx)}
                  style={{ flexShrink: 0 }}
                />
              </div>
            </div>
          ))}

          <Button
            type="dashed" size="small" icon={<PlusOutlined />}
            onClick={addAuthor}
            style={{ marginTop: 8, width: '30%' }}
          >
            Add author
          </Button>
        </div>

        {/* ── Affiliations list ────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              Affiliations
              {data.custodian?.institution && !data.dataDescriptor?.affiliations_list?.length && (
                <PrefilledBadge />
              )}
            </span>
          </div>
          {data.custodian?.institution && !data.dataDescriptor?.affiliations_list?.length && (
            <PrefilledHint />
          )}
          <span style={EXTRA}>
            Number each affiliation. Authors reference these numbers in the field above.
          </span>

          {affiliations.map((aff, idx) => (
            <div key={aff.id} style={{
              display: 'flex', gap: 8, alignItems: 'center', marginTop: 8,
            }}>
              <div style={{ flex: '0 0 32px', textAlign: 'center',
                fontWeight: 700, color: 'var(--ebrains-color-medium)', fontSize: 13 }}>
                {aff.number}.
              </div>
              <Input
                size="small"
                value={aff.text}
                onChange={e => updateAffiliation(idx, 'text', e.target.value)}
                placeholder="Department, Institution, City, Country"
                style={{ flex: 1 }}
              />
              <Button
                size="small" type="text" danger
                icon={<DeleteOutlined />}
                onClick={() => removeAffiliation(idx)}
              />
            </div>
          ))}

          <Button
            type="dashed" size="small" icon={<PlusOutlined />}
            onClick={addAffiliation}
            style={{ marginTop: 8, width: '30%' }}
          >
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
          hint="Describe the experimental setup, equipment, recording parameters, and preprocessing. Be specific — important for reproducibility."
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
          hint="What files are included? What format? Did you follow a metadata standard (e.g. BIDS, NWB)? Folder structure?"
          required prefilled={autoPopulated.dataDescription}>
          <TextArea autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder="The dataset contains spike-sorted activity (spike times) for all cells. Files are provided in NWB format…" />
        </Q>

        <Q label="What are the key results or findings?" name="results"
          hint="Briefly summarise the main scientific findings. Published? If so, in which journal? (2–4 sentences)">
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
            placeholder="The data can be used to examine spatial-coding neural populations across behaviours and sleep states…" />
        </Q>

        <Q label="Are there any limitations or important caveats?" name="limitations"
          hint='Warn about inappropriate uses. e.g. "data are from adult subjects, unsuitable for developmental studies"'>
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Spike sorting was performed automatically. The dataset is limited to adult male rats…" />
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
