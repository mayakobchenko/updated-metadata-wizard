import { useState, useEffect } from 'react'
import { Form as AntForm, Input, Select, Button, Typography, Tag, Tooltip } from 'antd'
import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { generateDataDescriptorDocx } from './generateDataDescriptorDocx'

const { TextArea } = Input
const { Option }   = Select
const { Text }     = Typography

const EXTRA = { fontSize: 12, color: 'rgba(0,0,0,0.45)' }

// ── pre-fill badge shown next to label when field was auto-populated ───────
const PrefilledBadge = () => (
  <Tag
    color="green"
    style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px',
             marginLeft: 6, verticalAlign: 'middle' }}
  >
    pre-filled
  </Tag>
)

// ── section heading consistent with rest of wizard ─────────────────────────
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

// ── hint for pre-filled fields ─────────────────────────────────────────────
const PrefilledHint = ({ text }) => (
  <div style={{
    background: '#f0faf4', border: '1px solid #b7ebce',
    borderRadius: 6, padding: '6px 10px', marginBottom: 6,
    fontSize: 12, color: '#1a6b35',
    display: 'flex', alignItems: 'flex-start', gap: 6,
  }}>
    <InfoCircleOutlined style={{ marginTop: 2, flexShrink: 0 }} />
    <span>{text} You can edit this text.</span>
  </div>
)

// ── helpers to build pre-fill text from wizard data ────────────────────────
function buildSubjectSummary(subj) {
  if (!subj) return ''
  const parts = []
  const flatN  = (subj.subjects        || []).length
  const groupN = (subj.subjectGroups   || []).length
  const tissueN= (subj.tissueSamples   || []).length
  const collN  = (subj.tissueCollections|| []).length
  if (flatN)   parts.push(`${flatN} subject${flatN > 1 ? 's' : ''}`)
  if (groupN) {
    const total = (subj.subjectGroups || []).reduce((s, g) => s + (g.subjects?.length || 0), 0)
    parts.push(`${groupN} subject group${groupN > 1 ? 's' : ''} (${total} subjects total)`)
  }
  if (tissueN) parts.push(`${tissueN} tissue sample${tissueN > 1 ? 's' : ''}`)
  if (collN)   parts.push(`${collN} tissue collection${collN > 1 ? 's' : ''}`)
  return parts.length ? parts.join(', ') : ''
}

function buildFundingText(fund) {
  const funders = fund?.funders || []
  if (!funders.length) return ''
  return funders.map(f => {
    const parts = [f.funderName || f.customFunderName]
    if (f.awardTitle  || f.customAwardTitle)  parts.push(f.awardTitle  || f.customAwardTitle)
    if (f.grantId     || f.awardNumber)       parts.push(`grant no. ${f.grantId || f.awardNumber}`)
    return parts.filter(Boolean).join(', ')
  }).join('.\n')
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
  const dd   = data.dataDescriptor || {}
  const d1   = data.dataset1        || {}
  const d2   = data.dataset2        || {}
  const cust = data.custodian       || {}
  const cont = data.contactperson   || {}
  const exp  = data.experiments     || {}
  const fund = data.funding         || {}
  const contr= data.contribution    || {}
  const subj = data.subjectMetadata || {}

  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [genError,   setGenError]   = useState('')

  // ── build pre-fill values from other wizard steps ──────────────────────
  useEffect(() => {
    const current = form.getFieldValue('dataDescriptor') || {}

    // only pre-fill fields the user hasn't already filled
    const prefill = {}

    if (!current.title && d1.dataTitle)
      prefill.title = d1.dataTitle

    // Corresponding author block
    if (!current.correspondingAuthor) {
      const name  = `${cont.firstName || ''} ${cont.familyName || ''}`.trim()
      const email = cont.email || ''
      if (name || email)
        prefill.correspondingAuthor = [name, email].filter(Boolean).join(': ')
    }

    // Affiliation from custodian institution
    if (!current.affiliations && cust.institution)
      prefill.affiliations = cust.institution

    // Data type from dataset1.optionsData (may be labels or KG IDs)
    if (!current.dataType && d1.optionsData?.length) {
      const labels = d1.optionsData.map(v =>
        typeof v === 'string' && v.startsWith('http')
          ? v.split('/').pop()   // bare UUID fallback
          : v
      )
      prefill.dataType = labels.join(', ')
    }

    // Methods overview from techniques + preparation types (IDs shown as hints)
    if (!current.methodsOverview) {
      const parts = []
      if (exp.techniques?.length)
        parts.push(`Techniques: ${exp.techniques.length} technique(s) selected in the Experiments step.`)
      if (exp.preparationTypes?.length)
        parts.push(`Preparation type(s) selected in the Experiments step.`)
      if (exp.experimentalApproach?.length)
        parts.push(`Experimental approach(es) selected in the Experiments step.`)
      if (parts.length)
        prefill.methodsOverview = parts.join(' ')
    }

    // Subjects summary
    if (!current.subjects) {
      const summary = buildSubjectSummary(subj)
      if (summary) prefill.subjects = summary
    }

    // Anatomical entities from study targets
    if (!current.anatomicalEntity && exp.studyTargets?.length)
      prefill.anatomicalEntity =
        `${exp.studyTargets.length} study target(s) selected in the Experiments step.`

    // Data standards
    if (!current.dataStandards && d1.dataStandart?.length) {
      const stds = d1.dataStandart.filter(s => s !== "No, I didn't use a standard")
      if (stds.length) prefill.dataStandards = stds.join(', ')
    }

    // Funding / acknowledgements
    if (!current.funding) {
      const txt = buildFundingText(fund)
      if (txt) prefill.funding = txt
    }

    // DOI / repository
    if (!current.dataRepository && (d2.Data2UrlDoiRepo || d2.homePage))
      prefill.dataRepository = d2.Data2UrlDoiRepo || d2.homePage

    if (Object.keys(prefill).length) {
      form.setFieldsValue({ dataDescriptor: { ...current, ...prefill } })
    }
  }, [
    d1.dataTitle, d1.optionsData, d1.dataStandart,
    cont.firstName, cont.familyName, cont.email,
    cust.institution,
    exp.techniques, exp.preparationTypes, exp.experimentalApproach, exp.studyTargets,
    subj,
    fund.funders,
    d2.Data2UrlDoiRepo,
  ])

  // sync on JSON import
  useEffect(() => {
    if (Object.keys(dd).length > 0) {
      form.setFieldsValue({ dataDescriptor: dd })
    }
  }, [data.dataDescriptor])

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

  const Q = ({ label, name, hint, required, prefilled, children }) => (
    <AntForm.Item
      label={<span>{label}{prefilled && <PrefilledBadge />}</span>}
      name={name}
      rules={required ? [{ required: true, message: `Please fill in "${label}".` }] : []}
      extra={hint ? <span style={EXTRA}>{hint}</span> : undefined}
    >
      {prefilled && (
        <PrefilledHint text="This field was pre-filled from your wizard answers." />
      )}
      {children}
    </AntForm.Item>
  )

  // detect which fields were pre-filled
  const hasPrefill = (key) => {
    const val = form.getFieldValue(['dataDescriptor', key])
    return !!val && !dd[key]
  }

  return (
    <div>
      <p className="step-title">Data Descriptor</p>

      {/* ── intro ─────────────────────────────────────────────────────── */}
      <div style={{
        background: '#f0faf4', border: '1px solid #b7ebce',
        borderRadius: 8, padding: '14px 18px', marginBottom: 24,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <InfoCircleOutlined style={{ fontSize: 18, color: 'var(--ebrains-color-medium)', marginTop: 2, flexShrink: 0 }} />
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            What is a Data Descriptor?
          </Text>
          <Text style={{ fontSize: 13, color: '#444' }}>
            A Data Descriptor complements data shared through EBRAINS. A rich descriptor improves
            comprehension and increases the chances of reuse. Fields marked{' '}
            <Tag color="green" style={{ fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>pre-filled</Tag>{' '}
            have been automatically populated from your other wizard answers — please review and
            expand them. All required fields must be completed before generating the document.
          </Text>
        </div>
      </div>

      <AntForm
        form={form}
        layout="vertical"
        initialValues={{ dataDescriptor: dd }}
        onValuesChange={handleValuesChange}
      >

        {/* ── SECTION 1: Header info (pre-filled) ───────────────────── */}
        <SectionHeading number="1" title="Header information" />

        <Q
          label="Dataset title"
          name={['dataDescriptor', 'title']}
          hint="Use the same title as in Dataset part 1. Avoid acronyms and abbreviations."
          required
          prefilled={!dd.title && !!d1.dataTitle}
        >
          <Input />
        </Q>

        <Q
          label="Corresponding author / contact"
          name={['dataDescriptor', 'correspondingAuthor']}
          hint="Name and email of the person to contact regarding this dataset."
          prefilled={!dd.correspondingAuthor && !!(cont.firstName || cont.email)}
        >
          <Input placeholder="e.g. Jane Smith: jane.smith@university.edu" />
        </Q>

        <Q
          label="Affiliations"
          name={['dataDescriptor', 'affiliations']}
          hint="List institutional affiliations of all authors/contributors."
          prefilled={!dd.affiliations && !!cust.institution}
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="1. Department of Neuroscience, University of Oslo, Norway&#10;2. ..." />
        </Q>

        {/* ── SECTION 2: Data description / abstract ─────────────────── */}
        <SectionHeading number="2" title="Data description (Summary / Abstract)" />

        <p style={{ ...EXTRA, marginBottom: 16 }}>
          This section is the abstract of your data descriptor (~200 words total).
          Answer each sub-question concisely.
        </p>

        <Q
          label="What type of data do you share?"
          name={['dataDescriptor', 'dataType']}
          hint="e.g. experimental data, raw recordings, derived/analysed data, software, etc."
          prefilled={!dd.dataType && !!d1.optionsData?.length}
        >
          <Input placeholder="e.g. Experimental electrophysiological recordings (raw and spike-sorted)" />
        </Q>

        <Q
          label="What is the primary objective of your investigation? (≈50 words)"
          name={['dataDescriptor', 'objective']}
          hint="What specific hypothesis or question did the study aim to resolve? What gaps in knowledge does your research address? Why is this data important?"
          required
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="We investigated how theta sweeps in the medial entorhinal cortex are modulated by attention-like signals during spatial navigation…" />
        </Q>

        <Q
          label="How were the data created? What methods and materials were used?"
          name={['dataDescriptor', 'methodsDescription']}
          hint="What experimental procedures, techniques, or instruments were employed? How are the data organised? Number of subjects/sessions? Experimental parameters?"
          required
        >
          <TextArea autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="Ten rats were implanted with high-site-count Neuropixels probes targeting the medial entorhinal cortex. Recordings were obtained during foraging, object-chasing, and sleep…" />
        </Q>

        <Q
          label="What are the key findings / results?"
          name={['dataDescriptor', 'keyResults']}
          hint="Summarise the most significant results. What data points or trends emerged? Have you published them? If so, in which journal?"
          required
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Grid cells showed consistent theta-sweep modulation across all navigational tasks. Results were published in Nature (2024, doi:…)." />
        </Q>

        <Q
          label="What is the key contribution of your data to the field?"
          name={['dataDescriptor', 'dataContribution']}
          hint="What implications does this data have for future research or applications? Which other projects could the data potentially be used in?"
          required
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="This dataset provides the first population-level recording of theta sweep modulation across simultaneously recorded brain areas, enabling…" />
        </Q>

        <Q
          label="What conclusions can be drawn from your data?"
          name={['dataDescriptor', 'conclusions']}
          hint="How do your findings support or contradict your original hypothesis?"
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Our findings support the hypothesis that theta sweeps encode prospective trajectories and are modulated by…" />
        </Q>

        <Q
          label="Were there any limitations in your study?"
          name={['dataDescriptor', 'limitations']}
          hint="Did you identify any limitations or challenges that could impact the interpretation of your results?"
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Spike sorting was performed automatically. The dataset is limited to adult male rats, which may not generalise to…" />
        </Q>

        <Q
          label="What are the future implications and potential reuses?"
          name={['dataDescriptor', 'futureImplications']}
          hint="What research trajectories could emerge? In which other fields could the data be used?"
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="The data can be used to test computational models of grid cell dynamics, or to study sleep replay mechanisms…" />
        </Q>

        {/* ── SECTION 3: Materials & Methods ─────────────────────────── */}
        <SectionHeading number="3" title="Materials and Methods" />

        <Q
          label="What materials / specimens were used to generate the data?"
          name={['dataDescriptor', 'materialsSpecimens']}
          hint="List all specimens, subjects, or biological materials involved in the study."
          required
          prefilled={!dd.materialsSpecimens && !!buildSubjectSummary(subj)}
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="10 adult male Long-Evans rats (300–400 g) were used. Animals were housed under 12h light/dark cycles…" />
        </Q>

        <Q
          label="What acquisition techniques were employed?"
          name={['dataDescriptor', 'acquisitionTechniques']}
          hint="How were specimens obtained? What recording, imaging, or measurement steps were carried out? What preprocessing was applied?"
          required
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="Rats were implanted with Neuropixels 1.0 probes under isoflurane anaesthesia. Neural signals were amplified and digitised at 30 kHz using an Open Ephys acquisition system. Spike sorting was performed using Kilosort 2.5…" />
        </Q>

        <Q
          label="What tools and workflows were utilised?"
          name={['dataDescriptor', 'tools']}
          hint="Describe specific software, toolboxes, scripts, and analysis pipelines used (with versions if known)."
          required
          prefilled={!dd.tools && !!(exp.techniques?.length || exp.preparationTypes?.length)}
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Kilosort 2.5 (spike sorting), MATLAB R2021b (custom analysis scripts), Python 3.9 (visualisation, NumPy, SciPy, Matplotlib)…" />
        </Q>

        <Q
          label="What anatomical entity was examined?"
          name={['dataDescriptor', 'anatomicalEntity']}
          hint="Which anatomical structure/location was the focus? Cell type? Brain region? Coordinate system or brain atlas used?"
          prefilled={!dd.anatomicalEntity && !!exp.studyTargets?.length}
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Medial entorhinal cortex (layers II–III), parasubiculum, and anterodorsal thalamus. Electrode positions confirmed using Paxinos & Watson atlas (7th edition)…" />
        </Q>

        <Q
          label="Previous work and published methods"
          name={['dataDescriptor', 'previousWork']}
          hint="Optional. Cite or summarise previous methodological descriptions relevant to this dataset. Under which subheading in your publication can readers find full details?"
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Full surgical and recording procedures are described in Smith et al. (2022), Nature Methods, under 'Experimental procedures'…" />
        </Q>

        {/* ── SECTION 4: Usage notes ─────────────────────────────────── */}
        <SectionHeading number="4" title="Usage Notes" />

        <Q
          label="How should the data be used? What are the recommended use cases?"
          name={['dataDescriptor', 'usageNotes']}
          hint="Provide suggestions for how the data can be reused. Mention specific analyses, populations, or research questions this data is well suited for."
          required
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="The spike-sorted data are particularly well suited for precise spike-time analyses and theta-phase coding studies. The broadband LFP signal enables investigation of multiple frequency bands…" />
        </Q>

        <Q
          label="How should the data NOT be used? What are the limitations for reuse?"
          name={['dataDescriptor', 'usageLimitations']}
          hint="Warn users about inappropriate uses. e.g. unsuitable age groups, insufficient resolution, artefacts."
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Data are from adult male rats only, making it unsuitable for developmental or sex-difference studies. The image resolution is insufficient for single-cell morphology analysis…" />
        </Q>

        <Q
          label="Complementary code / software"
          name={['dataDescriptor', 'code']}
          hint="Where can users find loading routines, analysis pipelines, or visualisation tools? Provide URLs if available."
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Analysis scripts are available at https://github.com/… under MIT licence. Loading routines for NWB files are included in the repository README…" />
        </Q>

        {/* ── SECTION 5: Data records ────────────────────────────────── */}
        <SectionHeading number="5" title="Data Records" />

        <Q
          label="Data repository / DOI"
          name={['dataDescriptor', 'dataRepository']}
          hint="Where are the data stored? Link to the repository or data DOI."
          prefilled={!dd.dataRepository && !!(d2.Data2UrlDoiRepo || d2.homePage)}
        >
          <Input placeholder="https://doi.org/10.25493/…" />
        </Q>

        <Q
          label="Dataset file structure"
          name={['dataDescriptor', 'dataRecordsLayout']}
          hint="Provide a layout of the file repository. Describe the content of each file in square brackets. Did you follow a metadata standard (e.g. BIDS, NWB)?"
          required
          prefilled={!dd.dataRecordsLayout && !!d1.dataStandart?.length}
        >
          <TextArea autoSize={{ minRows: 5, maxRows: 14 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            placeholder={
`/ repository-root/
  sub_info.tsv [subject metadata]
  / sub-XXX/
    / Hor-0/
      Data.mat [trial-wise neural data and behavioural events]
    / Hor-1/
      Data.mat
  / code/
    analysis.m [spike analysis script]`
            }
          />
        </Q>

        <Q
          label="File formats table"
          name={['dataDescriptor', 'fileFormats']}
          hint="Describe each file format: Format | Extension | Software used / file specification"
        >
          <TextArea autoSize={{ minRows: 4, maxRows: 10 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            placeholder={
`Format | Extension | Software / specification
MATLAB | .mat | Generated by Kilosort 2.5; fields: Fs, labelsChannels, trialInfo
Tab-separated | .tsv | Self-made; columns: id, species, sex
Python script | .py | Python 3.9`
            }
          />
        </Q>

        {/* ── SECTION 6: Acknowledgements & references ──────────────── */}
        <SectionHeading number="6" title="Acknowledgements and References" />

        <Q
          label="Acknowledgements and funding"
          name={['dataDescriptor', 'funding']}
          hint="Brief acknowledgements of non-author contributors and funding sources (grant name and number). Pre-filled from your Funding step."
          prefilled={!dd.funding && !!buildFundingText(fund)}
        >
          <TextArea autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder="This work was supported by the European Research Council (ERC) under grant agreement No. 12345…" />
        </Q>

        <Q
          label="References"
          name={['dataDescriptor', 'references']}
          hint="List all references cited in the descriptor using Nature referencing style (Author et al., Journal, Year, doi)."
        >
          <TextArea autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder={
`1. Smith, J. et al. Title of paper. Nature 123, 456–789 (2022). https://doi.org/10.1038/…
2. Jones, A. & Brown, B. Another paper. J. Neurosci. 40, 1234 (2021).`
            }
          />
        </Q>

        {/* ── Generate button ────────────────────────────────────────── */}
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