import { useState, useEffect } from 'react'
import { Form as AntForm, Input, Select, Button, Alert, Divider, Typography } from 'antd'
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons'
import { generateDataDescriptorDocx } from './generateDataDescriptorDocx'

const { TextArea } = Input
const { Option }   = Select
const { Title, Text } = Typography

const LABEL = { fontSize: 12, color: '#444', fontWeight: 500 }
const HINT  = { fontSize: 11, color: '#888', marginTop: 2 }

// ── field‑of‑study options ─────────────────────────────────────────────────
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

// ── study‑type options ─────────────────────────────────────────────────────
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

const Q = ({ label, name, hint, required, children }) => (
  <AntForm.Item
    label={<span style={LABEL}>{label}</span>}
    name={name}
    rules={required ? [{ required: true, message: 'This field is required.' }] : []}
    extra={hint ? <span style={HINT}>{hint}</span> : undefined}
    style={{ marginBottom: 20 }}
  >
    {children}
  </AntForm.Item>
)

export default function DataDescriptor({ form, onChange, data }) {
  const dd = data.dataDescriptor || {}
  const d1 = data.dataset1      || {}

  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)

  // pre‑fill title from dataset1 if available and not yet set
  useEffect(() => {
    const existing = form.getFieldValue(['dataDescriptor', 'title'])
    if (!existing && d1.dataTitle) {
      form.setFieldValue(['dataDescriptor', 'title'], d1.dataTitle)
    }
  }, [d1.dataTitle])

  const handleValuesChange = (_, allValues) => {
    onChange(allValues)
    setGenerated(false)
  }

  const handleGenerate = async () => {
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
      return  // validation errors shown by form
    }

    setGenerating(true)
    try {
      const ddData = form.getFieldValue('dataDescriptor') || {}
      await generateDataDescriptorDocx({ ...ddData, fullData: data })
      setGenerated(true)
    } catch (err) {
      console.error('Data descriptor generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <p className="step-title">Data Descriptor</p>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        message="What is a Data Descriptor?"
        description={
          <span>
            A Data Descriptor is a short document that helps other researchers understand,
            find and reuse your dataset. It describes <strong>what the data are</strong>,
            <strong> why they were collected</strong>, and{' '}
            <strong>how they can be used</strong>. Answer the questions below and we will
            generate a formatted Word document you can download and review.
          </span>
        }
      />

      <AntForm
        form={form}
        layout="vertical"
        initialValues={{ dataDescriptor: dd }}
        onValuesChange={handleValuesChange}
      >

        {/* ── SECTION 1: Dataset identity ─────────────────────────────── */}
        <Divider orientation="left">
          <Text strong style={{ color: '#00C959' }}>1. Dataset identity</Text>
        </Divider>

        <Q
          label="Dataset title"
          name={['dataDescriptor', 'title']}
          hint="Use the same title as in step 1. Avoid acronyms and abbreviations."
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
          <Select placeholder="Select field of study">
            {FIELDS_OF_STUDY.map(f => <Option key={f} value={f}>{f}</Option>)}
          </Select>
        </Q>

        <Q
          label="Type of study"
          name={['dataDescriptor', 'studyType']}
          hint="What kind of experimental or computational approach was used?"
        >
          <Select placeholder="Select study type">
            {STUDY_TYPES.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Q>

        <Q
          label="What are the data?"
          name={['dataDescriptor', 'whatAreTheData']}
          hint="Start with: 'This dataset contains…'. Describe the data in 1-3 sentences. What modality, how many subjects/samples, what species?"
          required
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="This dataset contains electrophysiological recordings from 10 freely behaving rats…"
          />
        </Q>

        {/* ── SECTION 2: Scientific context ───────────────────────────── */}
        <Divider orientation="left">
          <Text strong style={{ color: '#00C959' }}>2. Scientific context</Text>
        </Divider>

        <Q
          label="What is the scientific background and context?"
          name={['dataDescriptor', 'scientificContext']}
          hint="What is the broader field of research? What was already known before this study? Why is this area important? (2‑4 sentences)"
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
            placeholder="We hypothesised that attention‑like modulation of theta sweeps would be observable across the navigation circuit…"
          />
        </Q>

        {/* ── SECTION 3: Methods ──────────────────────────────────────── */}
        <Divider orientation="left">
          <Text strong style={{ color: '#00C959' }}>3. Methods</Text>
        </Divider>

        <Q
          label="What methods were used to acquire the data?"
          name={['dataDescriptor', 'methods']}
          hint="Describe the key experimental setup, equipment, recording parameters, and any preprocessing steps. Be specific — this section is important for reproducibility."
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
            placeholder="Kilosort 2.5 (spike sorting), MATLAB R2021b (analysis), Python 3.9 (visualisation)…"
          />
        </Q>

        {/* ── SECTION 4: Data description ─────────────────────────────── */}
        <Divider orientation="left">
          <Text strong style={{ color: '#00C959' }}>4. Data description</Text>
        </Divider>

        <Q
          label="Describe the dataset structure and content"
          name={['dataDescriptor', 'dataDescription']}
          hint="What files are included? What do they contain? What format are they in? Describe the folder structure if relevant."
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
          hint="Briefly summarise the main scientific findings or observations from this dataset. (2‑4 sentences)"
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="Grid cells showed consistent theta‑sweep modulation across navigational tasks. The sweep amplitude correlated with…"
          />
        </Q>

        {/* ── SECTION 5: Usage ────────────────────────────────────────── */}
        <Divider orientation="left">
          <Text strong style={{ color: '#00C959' }}>5. Usage and reuse</Text>
        </Divider>

        <Q
          label="What can this dataset be used for?"
          name={['dataDescriptor', 'usageNotes']}
          hint="What analyses or research questions can be addressed with this data? Who is the intended audience?"
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
            placeholder="Note that spike sorting was performed automatically and may contain occasional errors…"
          />
        </Q>

        <Q
          label="Funding and acknowledgements"
          name={['dataDescriptor', 'funding']}
          hint="Optional. List funding sources and acknowledgements (these will be pre‑filled from the Funding step if available)."
        >
          <TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="This project received funding from the European Research Council (ERC) under…"
          />
        </Q>

        {/* ── Generate button ──────────────────────────────────────────── */}
        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            size="large"
            loading={generating}
            onClick={handleGenerate}
            style={{ background: '#00C959', borderColor: '#00C959' }}
          >
            Generate Data Descriptor (.docx)
          </Button>

          {generated && (
            <Alert
              type="success"
              showIcon
              message="Document downloaded! Review it, edit as needed, and share it with your data curator."
              style={{ flex: 1 }}
            />
          )}
        </div>

        <p style={{ fontSize: 11, color: '#999', marginTop: 12 }}>
          The generated document follows the EBRAINS Data Descriptor template.
          You can edit the Word file freely before submitting it to your curator.
        </p>

      </AntForm>
    </div>
  )
}