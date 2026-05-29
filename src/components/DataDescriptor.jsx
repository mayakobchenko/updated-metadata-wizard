import { useState, useEffect, useMemo } from 'react'
import { Form as AntForm, Input, Select, Button, Typography, Tag } from 'antd'
import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
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
  }).join('.\n')
}

// ── compute pre-fills from wizard data — pure function, no side effects ────
function computePrefills(data) {
  const d1   = data.dataset1        || {}
  const d2   = data.dataset2        || {}
  const cont = data.contactperson   || {}
  const cust = data.custodian       || {}
  const exp  = data.experiments     || {}
  const fund = data.funding         || {}
  const subj = data.subjectMetadata || {}
  const dd   = data.dataDescriptor  || {}

  // helper: only prefill if user hasn't already saved a value
  const pf = (key, value) => ({ key, value, isPrefilled: !dd[key] && !!value })

  const title = d1.dataTitle || ''

  const correspondingAuthor = (() => {
    const name  = `${cont.firstName || ''} ${cont.familyName || ''}`.trim()
    const email = cont.email || ''
    return [name, email].filter(Boolean).join(': ')
  })()

  const affiliations = cust.institution || ''

  const dataType = (() => {
    const vals = d1.optionsData || []
    if (!vals.length) return ''
    return vals.map(v =>
      typeof v === 'string' && v.startsWith('http') ? v.split('/').pop() : v
    ).join(', ')
  })()

  const methodsOverview = (() => {
    const parts = []
    if (exp.techniques?.length)
      parts.push(`${exp.techniques.length} technique(s) selected in the Experiments step.`)
    if (exp.preparationTypes?.length)
      parts.push(`Preparation type(s) selected in the Experiments step.`)
    if (exp.experimentalApproach?.length)
      parts.push(`Experimental approach(es) selected in the Experiments step.`)
    return parts.join(' ')
  })()

  const subjects = buildSubjectSummary(subj)

  const anatomicalEntity = exp.studyTargets?.length
    ? `${exp.studyTargets.length} study target(s) selected in the Experiments step.`
    : ''

  const dataStandards = (() => {
    const stds = (d1.dataStandart || [])
      .filter(s => s !== "No, I didn't use a standard")
    return stds.join(', ')
  })()

  const funding = buildFundingText(fund)

  const dataRepository = d2.Data2UrlDoiRepo || d2.homePage || ''

  return {
    title:                dd.title               || title,
    correspondingAuthor:  dd.correspondingAuthor  || correspondingAuthor,
    affiliations:         dd.affiliations         || affiliations,
    dataType:             dd.dataType             || dataType,
    methodsOverview:      dd.methodsOverview      || methodsOverview,
    materialsSpecimens:   dd.materialsSpecimens   || subjects,
    anatomicalEntity:     dd.anatomicalEntity     || anatomicalEntity,
    dataStandards:        dd.dataStandards        || dataStandards,
    funding:              dd.funding              || funding,
    dataRepository:       dd.dataRepository       || dataRepository,
    // pass through any user-saved values untouched
    objective:            dd.objective            || '',
    methodsDescription:   dd.methodsDescription   || '',
    keyResults:           dd.keyResults           || '',
    dataContribution:     dd.dataContribution     || '',
    conclusions:          dd.conclusions          || '',
    limitations:          dd.limitations          || '',
    futureImplications:   dd.futureImplications   || '',
    acquisitionTechniques:dd.acquisitionTechniques|| '',
    tools:                dd.tools                || '',
    previousWork:         dd.previousWork         || '',
    usageNotes:           dd.usageNotes           || '',
    usageLimitations:     dd.usageLimitations     || '',
    code:                 dd.code                 || '',
    dataRecordsLayout:    dd.dataRecordsLayout    || '',
    fileFormats:          dd.fileFormats          || '',
    references:           dd.references           || '',
    fieldOfStudy:         dd.fieldOfStudy         || '',
    studyType:            dd.studyType            || '',
  }
}

const FIELDS_OF_STUDY = [
  'Neuroimaging', 'Electrophysiology', 'Anatomy / Neuroanatomy',
  'Behavioural neuroscience', 'Computational neuroscience',
  'Cellular / molecular neuroscience', 'Systems neuroscience',
  'Clinical neuroscience', 'Cognitive neuroscience', 'Other',
]

const STUDY_TYPES = [
  'Animal study (in vivo)', 'Human study (in vivo)', 'In vitro',
  'In silico / computational', 'Post‑mortem / histology',
  'Clinical / patient study', 'Multimodal', 'Other',
]

export default function DataDescriptor({ form, onChange, data }) {
  const dd   = data.dataDescriptor  || {}
  const d1   = data.dataset1        || {}
  const d2   = data.dataset2        || {}
  const cust = data.custodian       || {}
  const cont = data.contactperson   || {}
  const exp  = data.experiments     || {}
  const fund = data.funding         || {}
  const subj = data.subjectMetadata || {}

  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [genError,   setGenError]   = useState('')

  // ── compute prefills synchronously — used both for initialValues
  //    and to detect which fields were auto-populated ─────────────────────
  const prefills = useMemo(() => computePrefills(data), [
    d1.dataTitle, d1.optionsData, d1.dataStandart,
    cont.firstName, cont.familyName, cont.email,
    cust.institution,
    exp.techniques, exp.preparationTypes, exp.experimentalApproach, exp.studyTargets,
    subj,
    fund.funders,
    d2.Data2UrlDoiRepo, d2.homePage,
  ])

  // ── track which fields were auto-populated (had no user value in dd) ────
  const autoPopulated = useMemo(() => {
    const d = data.dataDescriptor || {}
    return {
      title:               !d.title               && !!d1.dataTitle,
      correspondingAuthor: !d.correspondingAuthor  && !!(cont.firstName || cont.email),
      affiliations:        !d.affiliations         && !!cust.institution,
      dataType:            !d.dataType             && !!(d1.optionsData?.length),
      methodsOverview:     !d.methodsOverview      && !!(exp.techniques?.length || exp.preparationTypes?.length),
      materialsSpecimens:  !d.materialsSpecimens   && !!buildSubjectSummary(subj),
      anatomicalEntity:    !d.anatomicalEntity     && !!(exp.studyTargets?.length),
      dataStandards:       !d.dataStandards        && !!(d1.dataStandart?.filter(s => s !== "No, I didn't use a standard").length),
      funding:             !d.funding              && !!buildFundingText(fund),
      dataRepository:      !d.dataRepository       && !!(d2.Data2UrlDoiRepo || d2.homePage),
    }
  }, [data])

  // ── sync form when data prop changes (JSON import or navigation) ──────
  useEffect(() => {
    form.setFieldsValue({ dataDescriptor: prefills })
  }, [prefills])

  const handleValuesChange = (_, allValues) => {
    onChange(allValues)
    setGenerated(false)
    setGenError('')
  }

  const handleGenerate = async () => {
    setGenError('')
    const required = [
      ['dataDescriptor', 'title'],
      ['dataDescriptor', 'fieldOfStudy'],
      ['dataDescriptor', 'objective'],
      ['dataDescriptor', 'methodsDescription'],
      ['dataDescriptor', 'keyResults'],
      ['dataDescriptor', 'dataContribution'],
      ['dataDescriptor', 'materialsSpecimens'],
      ['dataDescriptor', 'acquisitionTechniques'],
      ['dataDescriptor', 'tools'],
      ['dataDescriptor', 'usageNotes'],
      ['dataDescriptor', 'dataRecordsLayout'],
    ]
    try {
      await form.validateFields(required)
    } catch {
      setGenError('Please fill in all required fields (marked with *) before generating.')
      return
    }
    setGenerating(true)
    try {
      const ddData = form.getFieldValue('dataDescriptor') || {}
      await generateDataDescriptorDocx({ ...ddData, fullData: data })
      setGenerated(true)
    } catch (err) {
      console.error('Data descriptor generation failed:', err)
      setGenError('Generation failed — please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Q component — field wrapper ──────────────────────────────────────
  const Q = ({ label, name, hint, required, prefilled, children }) => (
    <AntForm.Item
      label={<span>{label}{prefilled && <PrefilledBadge />}</span>}
      name={name}
      rules={required ? [{ required: true, message: `Please fill in "${label}".` }] : []}
      extra={hint ? <span style={EXTRA}>{hint}</span> : undefined}
    >
      {prefilled && (
        <div style={{
          background: '#f0faf4', border: '1px solid #b7ebce',
          borderRadius: 6, padding: '5px 10px', marginBottom: 6,
          fontSize: 11, color: '#1a6b35',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <InfoCircleOutlined style={{ flexShrink: 0 }} />
          Pre-filled from your wizard answers — please review and expand.
        </div>
      )}
      {children}
    </AntForm.Item>
  )

  return (
    <div>
      <p className="step-title">Data Descriptor</p>

      <div style={{
        background: '#f0faf4', border: '1px solid #b7ebce',
        borderRadius: 8, padding: '14px 18px', marginBottom: 24,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <InfoCircleOutlined style={{
          fontSize: 18, color: 'var(--ebrains-color-medium)',
          marginTop: 2, flexShrink: 0,
        }} />
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            What is a Data Descriptor?
          </Text>
          <Text style={{ fontSize: 13, color: '#444' }}>
            A Data Descriptor complements data shared through EBRAINS. A rich descriptor improves
            comprehension and increases the chances of reuse. Fields marked{' '}
            <Tag color="green" style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>
              pre-filled
            </Tag>{' '}
            have been automatically populated from your other wizard answers — please review and
            expand them. All required fields must be completed before generating the document.
          </Text>
        </div>
      </div>

      <AntForm
        form={form}
        layout="vertical"
        initialValues={{ dataDescriptor: prefills }}
        onValuesChange={handleValuesChange}
      >
        {/* ── 1. Header ─────────────────────────────────────────────── */}
        <SectionHeading number="1" title="Header information" />

        <Q label="Dataset title" name={['dataDescriptor', 'title']}
          hint="Use the same title as in Dataset part 1." required
          prefilled={autoPopulated.title}>
          <Input />
        </Q>

        <Q label="Corresponding author / contact"
          name={['dataDescriptor', 'correspondingAuthor']}
          hint="Name and email of the person to contact regarding this dataset."
          prefilled={autoPopulated.correspondingAuthor}>
          <Input placeholder="e.g. Jane Smith: jane.smith@university.edu" />
        </Q>

        <Q label="Affiliations" name={['dataDescriptor', 'affiliations']}
          hint="List institutional affiliations of all authors/contributors."
          prefilled={autoPopulated.affiliations}>
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="1. Department of Neuroscience, University of Oslo, Norway" />
        </Q>

        {/* ── 2. Data description ───────────────────────────────────── */}
        <SectionHeading number="2" title="Data description (Summary / Abstract)" />

        <p style={{ ...EXTRA, marginBottom: 16 }}>
          This section forms the abstract of your data descriptor (~200 words total).
        </p>

        <Q label="What type of data do you share?"
          name={['dataDescriptor', 'dataType']}
          hint="e.g. experimental data, raw recordings, derived/analysed data, software."
          prefilled={autoPopulated.dataType}>
          <Input />
        </Q>

        <Q label="What is the primary objective of your investigation? (≈50 words)"
          name={['dataDescriptor', 'objective']}
          hint="What hypothesis did the study aim to resolve? What gaps in knowledge does it address?" required>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="We investigated how theta sweeps are modulated by attention-like signals during spatial navigation…" />
        </Q>

        <Q label="How were the data created? What methods and materials were used?"
          name={['dataDescriptor', 'methodsDescription']}
          hint="Experimental procedures, techniques, instruments, number of subjects/sessions, experimental parameters." required>
          <TextArea autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="Ten rats were implanted with Neuropixels probes targeting the medial entorhinal cortex…" />
        </Q>

        <Q label="What are the key findings / results?"
          name={['dataDescriptor', 'keyResults']}
          hint="Summarise the most significant results. Have you published them? If so, in which journal?" required>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Grid cells showed consistent theta-sweep modulation across all navigational tasks…" />
        </Q>

        <Q label="What is the key contribution of your data to the field?"
          name={['dataDescriptor', 'dataContribution']}
          hint="What implications does this data have? Which other projects could use it?" required>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="This dataset provides the first population-level recording of theta sweep modulation…" />
        </Q>

        <Q label="What conclusions can be drawn from your data?"
          name={['dataDescriptor', 'conclusions']}
          hint="How do your findings support or contradict your original hypothesis?">
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Our findings support the hypothesis that theta sweeps encode prospective trajectories…" />
        </Q>

        <Q label="Were there any limitations in your study?"
          name={['dataDescriptor', 'limitations']}
          hint="Limitations or challenges that could impact interpretation of your results.">
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Spike sorting was performed automatically. The dataset is limited to adult male rats…" />
        </Q>

        <Q label="What are the future implications and potential reuses?"
          name={['dataDescriptor', 'futureImplications']}
          hint="What research trajectories could emerge? In which other fields could the data be used?">
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="The data can be used to test computational models of grid cell dynamics…" />
        </Q>

        {/* ── 3. Materials & Methods ────────────────────────────────── */}
        <SectionHeading number="3" title="Materials and Methods" />

        <Q label="What materials / specimens were used to generate the data?"
          name={['dataDescriptor', 'materialsSpecimens']}
          hint="List all specimens, subjects, or biological materials involved." required
          prefilled={autoPopulated.materialsSpecimens}>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="10 adult male Long-Evans rats (300–400 g) were used…" />
        </Q>

        <Q label="What acquisition techniques were employed?"
          name={['dataDescriptor', 'acquisitionTechniques']}
          hint="Recording, imaging, or measurement steps. Preprocessing applied." required>
          <TextArea autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="Rats were implanted with Neuropixels 1.0 probes under isoflurane anaesthesia…" />
        </Q>

        <Q label="What tools and workflows were utilised?"
          name={['dataDescriptor', 'tools']}
          hint="Software, toolboxes, scripts and analysis pipelines used (with versions if known)." required
          prefilled={autoPopulated.methodsOverview}>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Kilosort 2.5, MATLAB R2021b, Python 3.9…" />
        </Q>

        <Q label="What anatomical entity was examined?"
          name={['dataDescriptor', 'anatomicalEntity']}
          hint="Anatomical structure, cell type, brain region, coordinate system or brain atlas used."
          prefilled={autoPopulated.anatomicalEntity}>
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Medial entorhinal cortex (layers II–III), parasubiculum, anterodorsal thalamus…" />
        </Q>

        <Q label="Previous work and published methods"
          name={['dataDescriptor', 'previousWork']}
          hint="Optional. Cite or summarise previous methodological descriptions relevant to this dataset.">
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Full surgical and recording procedures are described in Smith et al. (2022)…" />
        </Q>

        {/* ── 4. Usage notes ────────────────────────────────────────── */}
        <SectionHeading number="4" title="Usage Notes" />

        <Q label="How should the data be used? Recommended use cases."
          name={['dataDescriptor', 'usageNotes']}
          hint='e.g. "the spike sorting makes this dataset particularly interesting for precise spike time analysis"' required>
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="The spike-sorted data are particularly well suited for precise spike-time analyses…" />
        </Q>

        <Q label="How should the data NOT be used? Limitations for reuse."
          name={['dataDescriptor', 'usageLimitations']}
          hint='e.g. "data are from adult subjects, making it unsuitable for developmental studies"'>
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Data are from adult male rats only, making it unsuitable for developmental studies…" />
        </Q>

        <Q label="Complementary code / software"
          name={['dataDescriptor', 'code']}
          hint="Where can users find loading routines, analysis pipelines, or visualisation tools? URLs if available.">
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Analysis scripts are available at https://github.com/… under MIT licence…" />
        </Q>

        {/* ── 5. Data records ───────────────────────────────────────── */}
        <SectionHeading number="5" title="Data Records" />

        <Q label="Data repository / DOI"
          name={['dataDescriptor', 'dataRepository']}
          hint="Where are the data stored? Link to the repository or data DOI."
          prefilled={autoPopulated.dataRepository}>
          <Input placeholder="https://doi.org/10.25493/…" />
        </Q>

        <Q label="Dataset file structure"
          name={['dataDescriptor', 'dataRecordsLayout']}
          hint="Layout of the file repository. Content of each file in square brackets. Metadata standard used (e.g. BIDS, NWB)?" required
          prefilled={autoPopulated.dataStandards}>
          <TextArea autoSize={{ minRows: 5, maxRows: 14 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            placeholder={`/ repository-root/\n  sub_info.tsv [subject metadata]\n  / sub-XXX/\n    Data.mat [trial-wise neural data]`} />
        </Q>

        <Q label="File formats table"
          name={['dataDescriptor', 'fileFormats']}
          hint="Format | Extension | Software used / file specification">
          <TextArea autoSize={{ minRows: 4, maxRows: 10 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            placeholder={`Format | Extension | Software / specification\nMATLAB | .mat | Generated by Kilosort 2.5\nTSV    | .tsv | Self-made`} />
        </Q>

        {/* ── 6. Acknowledgements & references ─────────────────────── */}
        <SectionHeading number="6" title="Acknowledgements and References" />

        <Q label="Acknowledgements and funding"
          name={['dataDescriptor', 'funding']}
          hint="Brief acknowledgements of non-author contributors and funding sources (grant name and number)."
          prefilled={autoPopulated.funding}>
          <TextArea autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder="This work was supported by the European Research Council (ERC) grant No. 12345…" />
        </Q>

        <Q label="References"
          name={['dataDescriptor', 'references']}
          hint="All references cited above, using Nature referencing style.">
          <TextArea autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder={`1. Smith, J. et al. Title. Nature 123, 456–789 (2022). https://doi.org/…`} />
        </Q>

        {/* ── Generate ──────────────────────────────────────────────── */}
        <div style={{
          borderTop: '1px solid #e5e5e5', marginTop: 28, paddingTop: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <Button
            className="next-back-button"
            icon={<FileTextOutlined />}
            size="large"
            loading={generating}
            onClick={handleGenerate}
          >
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