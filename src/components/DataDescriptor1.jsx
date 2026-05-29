import { useState, useEffect } from 'react'
import { Form as AntForm, Input, Select, Button, Alert, Typography } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { generateDataDescriptorDocx } from './generateDataDescriptorDocx'

const { TextArea } = Input
const { Option }   = Select
const { Text }     = Typography

// ── matches the hint style used across Dataset1, Experiments etc ──────────
const EXTRA = { fontSize: 12, color: 'rgba(0,0,0,0.45)' }

// ── section heading — matches .step-subtitle style ────────────────────────
const SectionHeading = ({ number, title }) => (
  <div style={{
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    margin:       '28px 0 16px',
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: 8,
  }}>
    <span style={{
      background:   'var(--ebrains-color-medium)',
      color:        '#fff',
      borderRadius: '50%',
      width:        24,
      height:       24,
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      fontSize:     12,
      fontWeight:   700,
      flexShrink:   0,
    }}>
      {number}
    </span>
    <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{title}</span>
  </div>
)

// ── options ───────────────────────────────────────────────────────────────
const FIELDS_OF_STUDY = [
  'Neuroimaging',
  'Electrophysiology',
  'Anatomy / Neuroanatomy',
  'Behavioural neuroscience',
  'Computational neuroscience',
  'Cellular / molecular neuroscience',
  'Systems neuroscience',
  'Clinical neuroscience',
  'Cognitive neuroscience',
  'Other',
]

const STUDY_TYPES = [
  'Animal study (in vivo)',
  'Human study (in vivo)',
  'In vitro',
  'In silico / computational',
  'Post‑mortem / histology',
  'Clinical / patient study',
  'Multimodal',
  'Other',
]

export default function DataDescriptor({ form, onChange, data }) {
  const dd = data.dataDescriptor || {}
  const d1 = data.dataset1       || {}

  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [genError,   setGenError]   = useState('')

  // ── pre‑fill title from Dataset1 if not yet set ───────────────────────
  useEffect(() => {
    const existing = form.getFieldValue(['dataDescriptor', 'title'])
    if (!existing && d1.dataTitle) {
      form.setFieldValue(['dataDescriptor', 'title'], d1.dataTitle)
    }
  }, [d1.dataTitle])

  // ── sync when data changes (JSON import) ──────────────────────────────
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
    try {
      await form.validateFields([
        ['dataDescriptor', 'title'],
        ['dataDescriptor', 'fieldOfStudy'],
        ['dataDescriptor', 'whatAreTheData'],
        ['dataDescriptor', 'scientificContext'],
        ['dataDescriptor', 'motivation'],
        ['dataDescriptor', 'hypothesis'],
        ['dataDescriptor', 'methods'],
        ['dataDescriptor', 'dataDescription'],
        ['dataDescriptor', 'usageNotes'],
      ])
    } catch {
      setGenError('Please fill in all required fields before generating.')
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

  // ── shared field wrapper — matches Dataset1 AntForm.Item style ────────
  const Q = ({ label, name, hint, required, children }) => (
    <AntForm.Item
      label={label}
      name={name}
      rules={required ? [{ required: true, message: `Please fill in "${label}".` }] : []}
      extra={hint ? <span style={EXTRA}>{hint}</span> : undefined}
    >
      {children}
    </AntForm.Item>
  )

  return (
    <div>
      <p className="step-title">Data Descriptor</p>

      {/* ── intro box — uses form-background-color tint, matching style ── */}
      <div style={{
        background:   '#f0faf4',
        border:       '1px solid #b7ebce',
        borderRadius: 8,
        padding:      '14px 18px',
        marginBottom: 24,
        display:      'flex',
        gap:          12,
        alignItems:   'flex-start',
      }}>
        <span style={{
          fontSize:     18,
          color:        'var(--ebrains-color-medium)',
          marginTop:    2,
          flexShrink:   0,
        }}>ℹ</span>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            What is a Data Descriptor?
          </Text>
          <Text style={{ fontSize: 13, color: '#444' }}>
            A Data Descriptor is a short document that helps other researchers understand,
            find and reuse your dataset. It describes{' '}
            <strong>what the data are</strong>,{' '}
            <strong>why they were collected</strong>, and{' '}
            <strong>how they can be used</strong>. Answer the questions below and
            click <strong>Generate</strong> to download a formatted Word document.
          </Text>
        </div>
      </div>

      <AntForm
        form={form}
        layout="vertical"
        initialValues={{ dataDescriptor: dd }}
        onValuesChange={handleValuesChange}
      >

        {/* ── 1. Dataset identity ────────────────────────────────────── */}
        <SectionHeading number="1" title="Dataset identity" />

        <Q
          label="Dataset title"
          name={['dataDescriptor', 'title']}
          hint="Use the same title as in Dataset part 1. Avoid acronyms and abbreviations."
          required
        >
          <Input placeholder="e.g. Human intracranial recordings of decision‑making in the frontoparietal cortex" />
        </Q>

        <Q
          label="Field of study"
          name={['dataDescriptor', 'fieldOfStudy']}
          hint="Select the primary scientific domain of this dataset."
          required
        >
          <Select placeholder="Select field of study" style={{ width: '100%' }}>
            {FIELDS_OF_STUDY.map(f => <Option key={f} value={f}>{f}</Option>)}
          </Select>
        </Q>

        <Q
          label="Type of study"
          name={['dataDescriptor', 'studyType']}
          hint="What kind of experimental or computational approach was used?"
        >
          <Select placeholder="Select study type" style={{ width: '100%' }}>
            {STUDY_TYPES.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Q>

        <Q
          label="What are the data?"
          name={['dataDescriptor', 'whatAreTheData']}
          hint='Start with "This dataset contains…". Describe the data in 1–3 sentences: modality, number of subjects/samples, species.'
          required
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="This dataset contains electrophysiological recordings from 10 freely behaving rats…"
          />
        </Q>

        {/* ── 2. Scientific context ──────────────────────────────────── */}
        <SectionHeading number="2" title="Scientific context" />

        <Q
          label="What is the scientific background and context?"
          name={['dataDescriptor', 'scientificContext']}
          hint="What is the broader field of research? What was already known? Why is this area important? (2–4 sentences)"
          required
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="Grid cells in the medial entorhinal cortex are thought to provide a metric for spatial navigation…"
          />
        </Q>

        <Q
          label="What was the motivation for creating and sharing this dataset?"
          name={['dataDescriptor', 'motivation']}
          hint="Why was this study conducted? What gap does it fill? Why is sharing the data valuable to the community?"
          required
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="We created this dataset to enable researchers to investigate theta‑sweep dynamics across brain areas…"
          />
        </Q>

        <Q
          label="What was the central hypothesis or research question?"
          name={['dataDescriptor', 'hypothesis']}
          hint="What did you set out to test or discover? One or two sentences."
          required
        >
          <TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="We hypothesised that attention‑like modulation of theta sweeps would be observable…"
          />
        </Q>

        {/* ── 3. Methods ─────────────────────────────────────────────── */}
        <SectionHeading number="3" title="Methods" />

        <Q
          label="What methods were used to acquire the data?"
          name={['dataDescriptor', 'methods']}
          hint="Describe the key experimental setup, equipment, recording parameters, and preprocessing. Be specific — this is important for reproducibility."
          required
        >
          <TextArea
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder="Rats were implanted with Neuropixels probes targeting the medial entorhinal cortex. Neural activity was spike‑sorted using Kilosort 2.5…"
          />
        </Q>

        <Q
          label="What software and analysis tools were used?"
          name={['dataDescriptor', 'software']}
          hint="List key software packages, toolboxes, or custom scripts (with versions if known)."
        >
          <TextArea
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Kilosort 2.5, MATLAB R2021b, Python 3.9…"
          />
        </Q>

        {/* ── 4. Data description ────────────────────────────────────── */}
        <SectionHeading number="4" title="Data description" />

        <Q
          label="Describe the dataset structure and content"
          name={['dataDescriptor', 'dataDescription']}
          hint="What files are included? What do they contain? What format? Describe the folder structure if relevant."
          required
        >
          <TextArea
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder="The dataset contains spike‑sorted activity (spike times) for all cells used in the accompanying paper. Files are provided in NWB format…"
          />
        </Q>

        <Q
          label="What are the key results or findings?"
          name={['dataDescriptor', 'results']}
          hint="Briefly summarise the main scientific findings or observations. (2–4 sentences)"
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Grid cells showed consistent theta‑sweep modulation across navigational tasks…"
          />
        </Q>

        {/* ── 5. Usage ───────────────────────────────────────────────── */}
        <SectionHeading number="5" title="Usage and reuse" />

        <Q
          label="What can this dataset be used for?"
          name={['dataDescriptor', 'usageNotes']}
          hint="What analyses or research questions can be addressed? Who is the intended audience?"
          required
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="The data can be used to examine spatial‑coding neural populations across a range of behaviours and sleep states…"
          />
        </Q>

        <Q
          label="Are there any limitations or important caveats?"
          name={['dataDescriptor', 'limitations']}
          hint="Optional. Note any known limitations, biases, or things users should be aware of."
        >
          <TextArea
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Spike sorting was performed automatically and may contain occasional errors…"
          />
        </Q>

        <Q
          label="Funding and acknowledgements"
          name={['dataDescriptor', 'funding']}
          hint="Optional. Pre-filled from the Funding step if available. Edit as needed."
        >
          <TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="This project received funding from the European Research Council (ERC)…"
          />
        </Q>

        {/* ── Generate button — uses next-back-button class ──────────── */}
        <div style={{
          borderTop:  '1px solid #e5e5e5',
          marginTop:  28,
          paddingTop: 20,
          display:    'flex',
          alignItems: 'center',
          gap:        16,
          flexWrap:   'wrap',
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
            <span style={{
              fontSize:   13,
              color:      'var(--ebrains-color-dark)',
              fontWeight: 500,
            }}>
              ✓ Downloaded! Review and edit the Word file before sending to your curator.
            </span>
          )}

          {genError && (
            <span style={{ fontSize: 13, color: '#d32f2f' }}>
              {genError}
            </span>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 10 }}>
          The generated document follows the EBRAINS Data Descriptor template.
          You can freely edit the Word file before submitting it to your curator.
        </p>

      </AntForm>
    </div>
  )
}