import { useState, useEffect, useRef } from 'react'
import { useAuthContext } from './context/NewContextProvider.jsx'
import ConfigProvider from './ConfigProvider.jsx'
import { Form as AntForm, Button, Modal, Upload, Alert, Typography } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
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
import DataDescriptor from './DataDescriptor.jsx'
import dayjs from 'dayjs'

const { Text } = Typography

const readJsonFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try { resolve(JSON.parse(e.target.result)) }
      catch { reject(new Error('File is not valid JSON.')) }
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsText(file)
  })

const deepMerge = (base, incoming) => incoming

const StepsWizard = ({ externalFormData, onFormDataChange }) => {
  const skjemaInfo = useAuthContext()

  const normalizeOptionsData = (val) => {
    if (Array.isArray(val)) return val
    if (!val) return []
    return [val]
  }

  const normalizeDatesForForm = (data) => {
    if (!data) return data
    const d1 = data.dataset1
    if (!d1) return data
    return {
      ...data,
      dataset1: {
        ...d1,
        copyrightYear: d1.copyrightYear
          ? (() => { const d = dayjs(d1.copyrightYear); return d.isValid() ? d : null })()
          : null,
        embargoDate: d1.embargoDate
          ? (() => { const d = dayjs(d1.embargoDate); return d.isValid() ? d : null })()
          : null,
      }
    }
  }

  const initialValues = {
    datasetVersionId: skjemaInfo?.datasetVersionId || '',
    contactperson: {
      firstName: skjemaInfo?.nettskjemaInfo?.contactFirstName || '',
      familyName: skjemaInfo?.nettskjemaInfo?.contactSurname  || '',
      email:      skjemaInfo?.nettskjemaInfo?.contactEmail    || '',
    },
    custodian: {
      firstName:   skjemaInfo?.nettskjemaInfo?.custodionaFirstName  || '',
      familyName:  skjemaInfo?.nettskjemaInfo?.custodianSurname     || '',
      email:       skjemaInfo?.nettskjemaInfo?.custodianEmail       || '',
      orcid:       skjemaInfo?.nettskjemaInfo?.custodianORCID       || '',
      institution: skjemaInfo?.nettskjemaInfo?.custodianInstitution || '',
    },
    groupLeader: {
      name:  skjemaInfo?.nettskjemaInfo?.GroupLeaderName  || '',
      orcid: skjemaInfo?.nettskjemaInfo?.GroupLeaderOrcid || '',
    },
    dataset1: {
      dataTitle:         skjemaInfo?.nettskjemaInfo?.dataTitle         || '',
      briefSummary:      skjemaInfo?.nettskjemaInfo?.briefSummary      || '',
      embargo:           skjemaInfo?.nettskjemaInfo?.embargo           || false,
      optionsData:       normalizeOptionsData(skjemaInfo?.nettskjemaInfo?.optionsData),
      dataStandart:      normalizeOptionsData(skjemaInfo?.nettskjemaInfo?.dataStandart),
      otherDataStandart: skjemaInfo?.nettskjemaInfo?.otherDataStandart || '',
      embargoReview:     skjemaInfo?.nettskjemaInfo?.embargoReview     || false,
      submitJournalName: skjemaInfo?.nettskjemaInfo?.submitJournalName || '',
    },
    dataset2: {
      Data2UrlDoiRepo: skjemaInfo?.nettskjemaInfo?.Data2UrlDoiRepo || '',
      Data2DoiJournal: skjemaInfo?.nettskjemaInfo?.Data2DoiJournal || '',
    },
  }

  const formDataRef                                     = useRef({})
  const [formData, setFormData]                         = useState({})
  const [form]                                          = AntForm.useForm()
  const [currentStepIndex, setCurrentStepIndex]         = useState(0)
  const [isModalVisible, setIsModalVisible]             = useState(false)
  const [importModalVisible, setImportModalVisible]     = useState(false)
  const [importPreview, setImportPreview]               = useState(null)
  const [importError, setImportError]                   = useState('')
  const [importFileName, setImportFileName]             = useState('')

  useEffect(() => {
    if (externalFormData && Object.keys(externalFormData).length > 0) {
      formDataRef.current = externalFormData
      setFormData(externalFormData)
      form.setFieldsValue(normalizeDatesForForm(externalFormData))
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

  // ── JSON import ───────────────────────────────────────────────────────────

  const handleJsonUpload = async (file) => {
    setImportError('')
    setImportPreview(null)
    setImportFileName(file.name)
    try {
      const parsed = await readJsonFile(file)
      const knownKeys = ['datasetVersionId', 'contactperson', 'custodian',
                         'dataset1', 'dataset2', 'funding', 'contribution',
                         'experiments', 'subjectMetadata']
      if (!knownKeys.some(k => k in parsed)) {
        setImportError('This does not look like a Metadata Wizard JSON file.')
        setImportModalVisible(true)
        return false
      }
      setImportPreview(parsed)
      setImportModalVisible(true)
    } catch (err) {
      setImportError(err.message)
      setImportModalVisible(true)
    }
    return false
  }

  const applyImportedJson = () => {
    if (!importPreview) return
    const merged = deepMerge(formDataRef.current, importPreview)
    formDataRef.current = merged
    setFormData(merged)
    form.setFieldsValue(normalizeDatesForForm(merged))
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

  const buildImportSummary = (parsed) => {
    if (!parsed) return []
    const lines = []
    if (parsed.datasetVersionId)                      lines.push(`Dataset version ID: ${parsed.datasetVersionId}`)
    if (parsed.contactperson?.firstName)              lines.push(`Contact person: ${parsed.contactperson.firstName} ${parsed.contactperson.familyName}`)
    if (parsed.custodian?.firstName)                  lines.push(`Custodian: ${parsed.custodian.firstName} ${parsed.custodian.familyName}`)
    if (parsed.dataset1?.dataTitle)                   lines.push(`Dataset title: ${parsed.dataset1.dataTitle}`)
    if (parsed.dataset1?.briefSummary)                lines.push(`Summary: ${parsed.dataset1.briefSummary.slice(0, 80)}${parsed.dataset1.briefSummary.length > 80 ? '…' : ''}`)
    if (parsed.funding?.funders?.length)              lines.push(`Funders: ${parsed.funding.funders.length}`)
    if (parsed.contribution?.authors?.length)         lines.push(`Authors: ${parsed.contribution.authors.length}`)
    if (parsed.experiments?.experimentalApproach?.length) lines.push(`Experimental approaches: ${parsed.experiments.experimentalApproach.length}`)
    const subjects    = parsed.subjectMetadata?.subjects?.length    || 0
    const groups      = parsed.subjectMetadata?.subjectGroups?.length|| 0
    const tissues     = parsed.subjectMetadata?.tissueSamples?.length|| 0
    const collections = parsed.subjectMetadata?.tissueCollections?.length || 0
    if (subjects)    lines.push(`Subjects: ${subjects}`)
    if (groups)      lines.push(`Subject groups: ${groups}`)
    if (tissues)     lines.push(`Tissue samples: ${tissues}`)
    if (collections) lines.push(`Tissue collections: ${collections}`)
    return lines
  }

  // ── step definitions ──────────────────────────────────────────────────────
  //
  //  Index  Component        Visible when
  //  ─────  ───────────────  ──────────────────────────────
  //    0    Intro            always
  //    1    Dataset1         always
  //    2    Dataset2         always
  //    3    Funding          always
  //    4    Contributors     always
  //    5    Experiments      always
  //    6    Subjects         only when subjectschoice === 'Yes'
  //    7    DataDescriptor   always (last step)

  const steps = [
    { id: 0, component: Intro          },
    { id: 1, component: Dataset1       },
    { id: 2, component: Dataset2       },
    { id: 3, component: Funding        },
    { id: 4, component: Contributors   },
    { id: 5, component: Experiments    },
    { id: 6, component: Subjects       },  // may be skipped
    { id: 7, component: DataDescriptor },  // always last
  ]

  const SUBJECTS_INDEX      = 6
  const DATA_DESCRIPTOR_INDEX = 7

  const subjectStepEnabled = formData?.experiments?.subjectschoice === 'Yes'
  const subjectStepVisible = formData?.experiments?.subjectschoice !== 'No'

  // Last logical step is always DataDescriptor (index 7).
  // When subjects are disabled we jump from 5 → 7 skipping 6.
  const lastLogicalStepIndex = DATA_DESCRIPTOR_INDEX

  // If subjects get disabled while the user is on the Subjects step,
  // jump forward to DataDescriptor.
  useEffect(() => {
    if (!subjectStepEnabled && currentStepIndex === SUBJECTS_INDEX) {
      setCurrentStepIndex(DATA_DESCRIPTOR_INDEX)
    }
  }, [subjectStepEnabled])

  // ── navigation ────────────────────────────────────────────────────────────

  const nextStep = () => {
    // DataDescriptor uses its own local form so we skip shared form validation
    // on that step; all other steps validate the shared form.
    const skipValidation = currentStepIndex === DATA_DESCRIPTOR_INDEX

    const advance = () => {
      completeCurrentStep()
      setCurrentStepIndex((prev) => {
        if (prev >= lastLogicalStepIndex) return prev
        // skip Subjects if not enabled
        const next = prev + 1
        if (next === SUBJECTS_INDEX && !subjectStepEnabled) return next + 1
        return next
      })
    }

    if (skipValidation) {
      advance()
    } else {
      form.validateFields()
        .then(advance)
        .catch(() => setIsModalVisible(true))
    }
  }

  const prevStep = () => {
    if (currentStepIndex <= 0) return
    setCurrentStepIndex((prev) => {
      const next = prev - 1
      // skip Subjects when going back if not enabled
      if (next === SUBJECTS_INDEX && !subjectStepEnabled) return next - 1
      return next
    })
  }

  // ── ProgressBar click navigation — also skip Subjects if disabled ─────────
  const goToWizardStep = (clickedVisualIndex) => {
    // The ProgressBar hides Subjects when not visible, so visual indices
    // may not match logical indices. Rebuild the mapping here.
    let logicalIndex = clickedVisualIndex
    if (!subjectStepVisible && clickedVisualIndex >= SUBJECTS_INDEX) {
      // every visual step at or after where Subjects would be is shifted by 1
      logicalIndex = clickedVisualIndex + 1
    }
    setCurrentStepIndex(logicalIndex)
  }

  const handleCancel = () => setIsModalVisible(false)
  const handleOk     = () => setIsModalVisible(false)

  const CurrentStep = steps[currentStepIndex].component

  const [statuses, setStatuses] = useState(() => Array(steps.length).fill(false))

  const completeCurrentStep = () => {
    setStatuses((prev) => {
      const next = [...prev]
      next[currentStepIndex] = true
      return next
    })
  }

  // ── KG / drive helpers (unchanged) ───────────────────────────────────────

  const mapDataset1OptionsToIds = async (formData) => {
    try {
      const res   = await fetch('api/kginfo/datatypes')
      if (!res.ok) throw new Error(`${res.status}`)
      const json  = await res.json()
      const types = json.dataTypes || []
      const labelToId = new Map(types.map((t) => [t.name.toLowerCase(), t.identifier]))
      const labels    = formData.dataset1?.optionsData || []
      const mapped    = labels.map((val) =>
        typeof val !== 'string' ? val : labelToId.get(val.toLowerCase()) || val
      )
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
      return await fetch('/api/zammad/save-json', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          jsonFilePath: PYTHON_JSON_PATH,
          datasetTitle: formDataRef.current?.dataset1?.dataTitle || 'dataset'
        })
      })
    } catch (err) {
      console.error('Error saving to Zammad:', err)
      throw err
    }
  }

  const savePythonKG = async () => {
    const payload = await mapDataset1OptionsToIds(formDataRef.current)
    return fetch('api/python/runpython', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload, null, 2),
    })
  }

  const saveJsonToDrive = async () => {
    const payload = await mapDataset1OptionsToIds(formDataRef.current)
    return fetch('api/drive/driveupload', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload, null, 2),
    })
  }

  const downloadJson = async () => {
    const payload = await mapDataset1OptionsToIds(formDataRef.current)
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
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

      {/* ── JSON toolbar ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 16px 4px', background: '#f0f7ff',
        border: '1px solid #bae0ff', borderRadius: 6, margin: '8px 16px 4px', gap: 12,
      }}>
        <span style={{ fontSize: 12, color: '#555', flex: 1 }}>
          💾 Want to save your progress and continue later?{' '}
          <strong>Download JSON</strong> to save your current form data,
          then use <strong>Import JSON</strong> next time to restore it instantly.
        </span>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button size="small" onClick={downloadJson}
            title="Download your current form data as a JSON file to continue later">
            Download JSON
          </Button>
          <Upload accept=".json" showUploadList={false} beforeUpload={handleJsonUpload}>
            <Button size="small" icon={<FileTextOutlined />}
              title="Import a previously downloaded Metadata Wizard JSON file to pre-fill the form">
              Import JSON
            </Button>
          </Upload>
        </div>
      </div>

      {/* ── Import preview modal ─────────────────────────────────────────── */}
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
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              message="The following data was found in the file"
              description={
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {importSummary.map((line, i) => (
                    <li key={i}><Text style={{ fontSize: 13 }}>{line}</Text></li>
                  ))}
                </ul>
              }
            />
            <Alert type="warning" showIcon style={{ marginBottom: 4 }}
              message="Existing form values will be overwritten by any matching fields from the imported file." />
          </>
        )}
      </Modal>

      {/* ── Current step ─────────────────────────────────────────────────── */}
      <CurrentStep form={form} onChange={handleInputChange} data={formData} />

      {/* ── Navigation buttons ───────────────────────────────────────────── */}
      <div className="buttons-save-next-back">
        {currentStepIndex > 0 && (
          <Button onClick={prevStep} className="next-back-button">Back</Button>
        )}
        <div className="spacer" />

        {!isLastLogicalStep && (
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

      {/* ── Validation warning modal ─────────────────────────────────────── */}
      <Modal title="Warning" open={isModalVisible}
        onOk={handleOk} onCancel={handleCancel} okText="OK" cancelText="Cancel">
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
          Thank you for choosing EBRAINS to share your research data. In this form, you can
          describe key aspects of your dataset so that other researchers will be able to find,
          reuse and cite your work. While filling out this form, please remember to consider
          all data related to the dataset that you wish to publish on EBRAINS. Some fields
          might be pre-filled from the curation request form that you had submitted earlier.
          You can edit the fields or leave them unchanged and once you complete the form,
          metadata describing your dataset will be curated according to the{' '}
          <a href="https://openminds-documentation.readthedocs.io/en/latest/"
            target="_blank" rel="noopener noreferrer" style={{ margin: '0 5px' }}>
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
