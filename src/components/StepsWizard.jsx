import { useState, useEffect, useRef } from 'react'
import { useAuthContext } from './context/NewContextProvider.jsx'
import ConfigProvider from './ConfigProvider.jsx'
import { Form as AntForm, Button, Modal, Upload, Alert, Typography } from 'antd'
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons'
import ProgressBar from './ProgressBar.jsx'
import Contributors from './Contributors.jsx'
import Subjects from './Subjects.jsx'
import Introduction from './Introduction.jsx'
import Dataset1 from './Dataset1.jsx'
import Dataset2 from './Dataset2.jsx'
import Funding from './Funding.jsx'
import Experiments from './Experiments.jsx'
import PopoverSave from './FinalChoice.jsx'
import LoadingSpinner from './LoadingSpinner.jsx'

const { Text } = Typography

// ── JSON import helper ────────────────────────────────────────────────────────
// Reads a JSON file uploaded by the user and returns a promise resolving to
// the parsed object, or rejects with a descriptive error.
const readJsonFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result))
      } catch {
        reject(new Error('File is not valid JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsText(file)
  })

// ── deep merge helper ─────────────────────────────────────────────────────────
// Merges imported JSON into existing form data so fields not present in the
// imported file keep their current values (e.g. pre-filled from Nettskjema).
const deepMerge = (base, incoming) => {
  if (!incoming || typeof incoming !== 'object') return base
  const result = { ...base }
  for (const key of Object.keys(incoming)) {
    const inVal = incoming[key]
    const baseVal = base?.[key]
    if (
      inVal !== null &&
      typeof inVal === 'object' &&
      !Array.isArray(inVal) &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal, inVal)
    } else if (inVal !== undefined && inVal !== null && inVal !== '') {
      result[key] = inVal
    }
  }
  return result
}

const StepsWizard = ({ externalFormData, onFormDataChange }) => {
  const skjemaInfo = useAuthContext()

  const normalizeOptionsData = (val) => {
    if (Array.isArray(val)) return val
    if (!val) return []
    return [val]
  }

  const initialValues = {
    datasetVersionId: skjemaInfo?.datasetVersionId || '',
    contactperson: {
      firstName: skjemaInfo?.nettskjemaInfo?.contactFirstName || '',
      familyName: skjemaInfo?.nettskjemaInfo?.contactSurname || '',
      email:      skjemaInfo?.nettskjemaInfo?.contactEmail || '',
    },
    custodian: {
      firstName:   skjemaInfo?.nettskjemaInfo?.custodionaFirstName || '',
      familyName:  skjemaInfo?.nettskjemaInfo?.custodianSurname || '',
      email:       skjemaInfo?.nettskjemaInfo?.custodianEmail || '',
      orcid:       skjemaInfo?.nettskjemaInfo?.custodianORCID || '',
      institution: skjemaInfo?.nettskjemaInfo?.custodianInstitution || '',
    },
    groupLeader: {
      name:  skjemaInfo?.nettskjemaInfo?.GroupLeaderName || '',
      orcid: skjemaInfo?.nettskjemaInfo?.GroupLeaderOrcid || '',
    },
    dataset1: {
      dataTitle:         skjemaInfo?.nettskjemaInfo?.dataTitle || '',
      briefSummary:      skjemaInfo?.nettskjemaInfo?.briefSummary || '',
      embargo:           skjemaInfo?.nettskjemaInfo?.embargo || false,
      optionsData:       normalizeOptionsData(skjemaInfo?.nettskjemaInfo?.optionsData),
      dataStandart:      normalizeOptionsData(skjemaInfo?.nettskjemaInfo?.dataStandart),
      otherDataStandart: skjemaInfo?.nettskjemaInfo?.otherDataStandart || '',
      embargoReview:     skjemaInfo?.nettskjemaInfo?.embargoReview || false,
      submitJournalName: skjemaInfo?.nettskjemaInfo?.submitJournalName || '',
    },
    dataset2: {
      Data2UrlDoiRepo: skjemaInfo?.nettskjemaInfo?.Data2UrlDoiRepo || '',
      Data2DoiJournal: skjemaInfo?.nettskjemaInfo?.Data2DoiJournal || '',
    },
  }

  const formDataRef = useRef({})
  const [formData, setFormData]               = useState({})
  const [form]                                = AntForm.useForm()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isModalVisible, setIsModalVisible]   = useState(false)

  // ── JSON import state ─────────────────────────────────────────────────────
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importPreview, setImportPreview]           = useState(null)
  const [importError, setImportError]               = useState('')
  const [importFileName, setImportFileName]         = useState('')

  useEffect(() => {
    if (externalFormData && Object.keys(externalFormData).length > 0) {
      formDataRef.current = externalFormData
      setFormData(externalFormData)
      form.setFieldsValue(externalFormData)
    }
  }, [externalFormData])

  useEffect(() => {
    formDataRef.current = initialValues
    setFormData(initialValues)
    onFormDataChange?.(initialValues)
  }, [skjemaInfo])

  const handleInputChange = (data) => {
    setFormData((prev) => {
      const next = { ...prev, ...data }
      formDataRef.current = next
      onFormDataChange?.(next)
      return next
    })
  }

  // ── JSON import handlers ──────────────────────────────────────────────────

  const handleJsonUpload = async (file) => {
    setImportError('')
    setImportPreview(null)
    setImportFileName(file.name)

    try {
      const parsed = await readJsonFile(file)

      // basic sanity check — must be an object with at least one known key
      const knownKeys = ['datasetVersionId', 'contactperson', 'custodian',
                         'dataset1', 'dataset2', 'funding', 'contribution',
                         'experiments', 'subjectMetadata']
      const hasKnownKey = knownKeys.some(k => k in parsed)
      if (!hasKnownKey) {
        setImportError('This does not look like a Metadata Wizard JSON file. No recognised fields were found.')
        setImportModalVisible(true)
        return false
      }

      setImportPreview(parsed)
      setImportModalVisible(true)
    } catch (err) {
      setImportError(err.message)
      setImportModalVisible(true)
    }

    return false  // prevent antd Upload from making an HTTP request
  }

  const applyImportedJson = () => {
    if (!importPreview) return

    // merge imported data on top of current form data so Nettskjema
    // pre-fills are not wiped if the imported file lacks those fields
    const merged = deepMerge(formDataRef.current, importPreview)

    formDataRef.current = merged
    setFormData(merged)
    form.setFieldsValue(merged)
    onFormDataChange?.(merged)

    setImportModalVisible(false)
    setImportPreview(null)
    setImportFileName('')
  }

  const handleImportCancel = () => {
    setImportModalVisible(false)
    setImportPreview(null)
    setImportError('')
    setImportFileName('')
  }

  // ── summary of what will be imported ─────────────────────────────────────
  const buildImportSummary = (parsed) => {
    if (!parsed) return []
    const lines = []

    if (parsed.datasetVersionId)
      lines.push(`Dataset version ID: ${parsed.datasetVersionId}`)
    if (parsed.contactperson?.firstName)
      lines.push(`Contact person: ${parsed.contactperson.firstName} ${parsed.contactperson.familyName}`)
    if (parsed.custodian?.firstName)
      lines.push(`Custodian: ${parsed.custodian.firstName} ${parsed.custodian.familyName}`)
    if (parsed.dataset1?.dataTitle)
      lines.push(`Dataset title: ${parsed.dataset1.dataTitle}`)
    if (parsed.dataset1?.briefSummary)
      lines.push(`Summary: ${parsed.dataset1.briefSummary.slice(0, 80)}${parsed.dataset1.briefSummary.length > 80 ? '…' : ''}`)
    if (parsed.funding?.funders?.length)
      lines.push(`Funders: ${parsed.funding.funders.length}`)
    if (parsed.contribution?.authors?.length)
      lines.push(`Authors: ${parsed.contribution.authors.length}`)
    if (parsed.contribution?.contributor?.othercontr?.length)
      lines.push(`Contributors: ${parsed.contribution.contributor.othercontr.length}`)
    if (parsed.experiments?.experimentalApproach?.length)
      lines.push(`Experimental approaches: ${parsed.experiments.experimentalApproach.length}`)

    const subjects     = parsed.subjectMetadata?.subjects?.length || 0
    const groups       = parsed.subjectMetadata?.subjectGroups?.length || 0
    const tissues      = parsed.subjectMetadata?.tissueSamples?.length || 0
    const collections  = parsed.subjectMetadata?.tissueCollections?.length || 0

    if (subjects)    lines.push(`Subjects: ${subjects}`)
    if (groups)      lines.push(`Subject groups: ${groups}`)
    if (tissues)     lines.push(`Tissue samples: ${tissues}`)
    if (collections) lines.push(`Tissue collections: ${collections}`)

    return lines
  }

  // ── subject step logic ────────────────────────────────────────────────────
  const subjectStepEnabled = formData?.experiments?.subjectschoice === 'Yes'
  const subjectStepVisible = formData?.experiments?.subjectschoice !== 'No'

  const steps = [
    { id: 0, component: Intro },
    { id: 1, component: Dataset1 },
    { id: 2, component: Dataset2 },
    { id: 3, component: Funding },
    { id: 4, component: Contributors },
    { id: 5, component: Experiments },
    { id: 6, component: Subjects },
  ]

  const lastLogicalStepIndex = subjectStepEnabled ? 6 : 5

  useEffect(() => {
    if (!subjectStepEnabled && currentStepIndex > lastLogicalStepIndex) {
      setCurrentStepIndex(lastLogicalStepIndex)
    }
  }, [subjectStepEnabled, currentStepIndex, lastLogicalStepIndex])

  const nextStep = () => {
    form.validateFields()
      .then(() => {
        completeCurrentStep()
        setCurrentStepIndex((prev) =>
          prev < lastLogicalStepIndex ? prev + 1 : prev
        )
      })
      .catch(() => setIsModalVisible(true))
  }

  const handleCancel = () => setIsModalVisible(false)
  const handleOk     = () => setIsModalVisible(false)

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((prev) => prev - 1)
  }

  const CurrentStep = steps[currentStepIndex].component

  const initializeValidSteps = () => Array(steps.length).fill(false)
  const [statuses, setStatuses] = useState(initializeValidSteps)

  const completeCurrentStep = () => {
    setStatuses((prev) => {
      const newStatuses = [...prev]
      newStatuses[currentStepIndex] = true
      return newStatuses
    })
  }

  const goToWizardStep = (nextWizardStep) => setCurrentStepIndex(nextWizardStep)

  const mapDataset1OptionsToIds = async (formData) => {
    try {
      const res = await fetch('api/kginfo/datatypes')
      if (!res.ok) throw new Error(`Error fetching data types: ${res.status}`)
      const json  = await res.json()
      const types = json.dataTypes || []
      const labelToId = new Map(types.map((t) => [t.name.toLowerCase(), t.identifier]))
      const labels = formData.dataset1?.optionsData || []
      const mapped = labels.map((val) => {
        if (typeof val !== 'string') return val
        return labelToId.get(val.toLowerCase()) || val
      })
      return { ...formData, dataset1: { ...(formData.dataset1 || {}), optionsData: mapped } }
    } catch (e) {
      console.error('Error mapping dataset1.optionsData to KG ids:', e)
      return formData
    }
  }

  const getTicketId = async () => {
    const ticketNumber = skjemaInfo?.ticketNumber || ''
    if (!ticketNumber) return { json: async () => ({ ticketId: null }) }
    return fetch(`/api/zammad/zammadinfo?TicketNumber=${ticketNumber}`)
  }

  const PYTHON_JSON_PATH = '/usr/src/app/server/routes/data.json'

  const saveJsonToZammad = async (ticketId) => {
    try {
      const response = await fetch('/api/zammad/save-json', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          jsonFilePath: PYTHON_JSON_PATH,
          datasetTitle: formDataRef.current?.dataset1?.dataTitle || 'dataset'
        })
      })
      return response
    } catch (err) {
      console.error('Error saving to Zammad:', err)
      throw err
    }
  }

  const savePythonKG = async () => {
    const payload  = await mapDataset1OptionsToIds(formDataRef.current)
    const response = await fetch('api/python/runpython', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload, null, 2),
    })
    return response
  }

  const saveJsonToDrive = async () => {
    const payload  = await mapDataset1OptionsToIds(formDataRef.current)
    const response = await fetch('api/drive/driveupload', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload, null, 2),
    })
    return response
  }

  const downloadJson = async () => {
    const payload = await mapDataset1OptionsToIds(formDataRef.current)
    const json    = JSON.stringify(payload, null, 2)
    const blob    = new Blob([json], { type: 'application/json' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = 'metadata_wizard.json'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const isLastLogicalStep = currentStepIndex === lastLogicalStepIndex
  const importSummary     = buildImportSummary(importPreview)

  return (
    <ConfigProvider>
      <ProgressBar
        step={currentStepIndex}
        status={statuses}
        onChanged={goToWizardStep}
        subjectStepVisible={subjectStepVisible}
      />

      {/* ── JSON import button — visible on every step ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 16px 0' }}>
        <Upload
          accept=".json"
          showUploadList={false}
          beforeUpload={handleJsonUpload}
        >
          <Button
            size="small"
            icon={<FileTextOutlined />}
            title="Import a previously downloaded Metadata Wizard JSON file to pre-fill the form"
          >
            Import JSON
          </Button>
        </Upload>
      </div>

      {/* ── JSON import preview modal ── */}
      <Modal
        open={importModalVisible}
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Import Metadata JSON{importFileName ? ` — ${importFileName}` : ''}
          </span>
        }
        width={580}
        onCancel={handleImportCancel}
        footer={[
          <Button key="cancel" onClick={handleImportCancel}>Cancel</Button>,
          importPreview && (
            <Button key="apply" type="primary" onClick={applyImportedJson}>
              Apply to form
            </Button>
          )
        ].filter(Boolean)}
      >
        {importError && (
          <Alert type="error" showIcon message={importError} style={{ marginBottom: 12 }} />
        )}

        {importPreview && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="The following data was found in the file"
              description={
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {importSummary.map((line, i) => (
                    <li key={i}><Text style={{ fontSize: 13 }}>{line}</Text></li>
                  ))}
                </ul>
              }
            />
            <Alert
              type="warning"
              showIcon
              message="Existing form values will be overwritten by any matching fields from the imported file."
              style={{ marginBottom: 4 }}
            />
          </>
        )}
      </Modal>

      <CurrentStep form={form} onChange={handleInputChange} data={formData} />

      <div className="buttons-save-next-back">
        {currentStepIndex > 0 && (
          <Button onClick={prevStep} className="next-back-button">Back</Button>
        )}
        <div className="spacer"></div>

        {currentStepIndex < lastLogicalStepIndex && (
          <Button onClick={nextStep} className="next-back-button">Next</Button>
        )}

        {isLastLogicalStep && (
          <PopoverSave
            uploadpythonKG={savePythonKG}
            saveJsonToDrive={saveJsonToDrive}
            saveJsonToZammad={saveJsonToZammad}
            getTicketId={getTicketId}
          />
        )}
      </div>

      <Modal
        title="Warning"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="OK"
        cancelText="Cancel"
      >
        <p>Please fill in the required fields before proceeding.</p>
      </Modal>
    </ConfigProvider>
  )
}

function Intro({ form, onChange, data }) {
  const userInfo = useAuthContext()
  if (userInfo?.user) {
    return (
      <div>
        <p className="step-title">Welcome to the EBRAINS Metadata Wizard!</p>
        <p>
          Thank you for choosing EBRAINS to share your research data. In this
          form, you can describe key aspects of your dataset so that other
          researchers will be able to find, reuse and cite your work. While
          filling out this form, please remember to consider all data related to
          the dataset that you wish to publish on EBRAINS. Some fields might be
          pre-filled from the curation request form that you had submitted
          earlier. You can edit the fields or leave them unchanged and once you
          complete the form, metadata describing your dataset will be curated
          according to the{' '}
          <a
            href="https://openminds-documentation.readthedocs.io/en/latest/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ margin: '0 5px' }}
          >
            openMINDS standard.
          </a>
        </p>
        <Introduction form={form} onChange={onChange} data={data} />
      </div>
    )
  }
  if (!userInfo.reloadWizard) return <LoadingSpinner />
  return null
}

export default StepsWizard