import { useState, useEffect, useRef } from 'react'
import { useAuthContext } from './context/NewContextProvider.jsx'
import ConfigProvider from './ConfigProvider.jsx'
import { Form as AntForm, Button, Modal } from 'antd'
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

const StepsWizard = ({ externalFormData, onFormDataChange }) => {
  const skjemaInfo = useAuthContext()

//to do: test if multiple options comes as an array from nettskjema
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
      email: skjemaInfo?.nettskjemaInfo?.contactEmail || '',
    },
    custodian: {
      firstName: skjemaInfo?.nettskjemaInfo?.custodionaFirstName || '',
      familyName: skjemaInfo?.nettskjemaInfo?.custodianSurname || '',
      email: skjemaInfo?.nettskjemaInfo?.custodianEmail || '',
      orcid: skjemaInfo?.nettskjemaInfo?.custodianORCID || '',
      institution: skjemaInfo?.nettskjemaInfo?.custodianInstitution || '',
    },
    groupLeader: {
      name: skjemaInfo?.nettskjemaInfo?.GroupLeaderName || '',
      orcid: skjemaInfo?.nettskjemaInfo?.GroupLeaderOrcid || '',
    },
    dataset1: {
      dataTitle: skjemaInfo?.nettskjemaInfo?.dataTitle || '',
      briefSummary: skjemaInfo?.nettskjemaInfo?.briefSummary || '',
      embargo: skjemaInfo?.nettskjemaInfo?.embargo || false,
      //optionsData: skjemaInfo?.nettskjemaInfo?.optionsData || '',
      optionsData: normalizeOptionsData(skjemaInfo?.nettskjemaInfo?.optionsData),
      embargoReview: skjemaInfo?.nettskjemaInfo?.embargoReview || false,
      submitJournalName: skjemaInfo?.nettskjemaInfo?.submitJournalName || '',
    },
    dataset2: {
      Data2UrlDoiRepo: skjemaInfo?.nettskjemaInfo?.Data2UrlDoiRepo || '',
      Data2DoiJournal: skjemaInfo?.nettskjemaInfo?.Data2DoiJournal || '',
    },
  }

  const formDataRef = useRef({})
  const [formData, setFormData] = useState({})
  const [form] = AntForm.useForm()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isModalVisible, setIsModalVisible] = useState(false)

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

  // ── subject step logic ────────────────────────────────────────────────
  // Enabled: user explicitly selected "Yes"
  const subjectStepEnabled = formData?.experiments?.subjectschoice === 'Yes'
  // Visible in UI: at mount (undefined) or "Yes"; hidden only for explicit "No"
  const subjectStepVisible = formData?.experiments?.subjectschoice !== 'No'

  // All steps are defined; Subjects is always index 6
  const steps = [
    { id: 0, component: Intro },
    { id: 1, component: Dataset1 },
    { id: 2, component: Dataset2 },
    { id: 3, component: Funding },
    { id: 4, component: Contributors },
    { id: 5, component: Experiments },
    { id: 6, component: Subjects },
  ]

  // Last logical step depends on whether Subjects is enabled
  const lastLogicalStepIndex = subjectStepEnabled ? 6 : 5

  // If Subjects becomes disabled while we are on it, jump back to Experiments
  useEffect(() => {
    if (!subjectStepEnabled && currentStepIndex > lastLogicalStepIndex) {
      setCurrentStepIndex(lastLogicalStepIndex)
    }
  }, [subjectStepEnabled, currentStepIndex, lastLogicalStepIndex])

  const nextStep = () => {
    form
      .validateFields()
      .then(() => {
        completeCurrentStep()
        setCurrentStepIndex((prev) =>
          prev < lastLogicalStepIndex ? prev + 1 : prev
        )
      })
      .catch(() => {
        setIsModalVisible(true)
      })
  }

  const handleCancel = () => setIsModalVisible(false)
  const handleOk = () => setIsModalVisible(false)

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const CurrentStep = steps[currentStepIndex].component

  // ── statuses for progress display ─────────────────────────────────────
  const initializeValidSteps = () => Array(steps.length).fill(false)
  const [statuses, setStatuses] = useState(initializeValidSteps)

  const completeCurrentStep = () => {
    setStatuses((prev) => {
      const newStatuses = [...prev]
      newStatuses[currentStepIndex] = true
      return newStatuses
    })
  }

  const goToWizardStep = (nextWizardStep) => {
    // nextWizardStep is the index in the visible Steps items, which is
    // the same as our step indices 0–5; index 6 only exists when visible+enabled
    setCurrentStepIndex(nextWizardStep)
  }

  const mapDataset1OptionsToIds = async (formData) => {
  try {
    const res = await fetch('api/kginfo/datatypes')
    if (!res.ok) throw new Error(`Error fetching data types: ${res.status}`)
    const json = await res.json()
    const types = json.dataTypes || []
   // console.log('transformed data types options:', types)
    const labelToId = new Map(types.map((t) => [t.name.toLowerCase(), t.identifier]))
    const labels = formData.dataset1?.optionsData || []
    console.log(labels)
    const mapped = labels.map((val) => {
        if (typeof val !== 'string') return val
        const id = labelToId.get(val.toLowerCase())
        return id || val // fall back to original label if no match
      })
    //const mapped = labels.map((val) => labelToId.get(val.toLowerCase()) || val)
    return {
      ...formData, dataset1: {...(formData.dataset1 || {}), optionsData: mapped },
    }
  } catch (e) {
    console.error('Error mapping dataset1.optionsData to KG ids:', e)
    return formData
  }
}
const getTicketId = async () => {
  const ticketNumber = skjemaInfo?.ticketNumber || ''
  if (!ticketNumber) {
    return { json: async () => ({ ticketId: null }) }
  }
  return fetch(`/api/zammad/zammadinfo?TicketNumber=${ticketNumber}`)
}

const saveJsonToZammad = async (ticketId) => {
  try {
    const response = await fetch('/api/zammad/save-json', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId:     ticketId,
        jsonFilePath: jsonFilePath,   // the same path used by the KG upload
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
  const pythonurl = 'api/python/runpython'
  const payload = await mapDataset1OptionsToIds(formDataRef.current)
  const response = await fetch(pythonurl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload, null, 2),
  })
  return response
}

const saveJsonToDrive = async () => {
  const pythonurl = 'api/drive/driveupload'
  const payload = await mapDataset1OptionsToIds(formDataRef.current)
  const response = await fetch(pythonurl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload, null, 2),
  })
  return response
}

const downloadJson = async () => {
  const payload = await mapDataset1OptionsToIds(formDataRef.current)
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'metadata_wizard.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/*
  const savePythonKG = async () => {
    const pythonurl = 'api/python/runpython'
    const response = await fetch(pythonurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formDataRef.current, null, 2),
    })
    return response
  }

  const saveJsonToDrive = async () => {
    const pythonurl = 'api/drive/driveupload'
    const response = await fetch(pythonurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formDataRef.current, null, 2),
    })
    return response
  }

  const downloadJson = () => {
    const json = JSON.stringify(formDataRef.current, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metadata_wizard.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
*/
  const isLastLogicalStep = currentStepIndex === lastLogicalStepIndex

  return (
    <ConfigProvider>
      <ProgressBar
        step={currentStepIndex}
        status={statuses}
        onChanged={goToWizardStep}
        subjectStepVisible={subjectStepVisible}
      />

      <CurrentStep form={form} onChange={handleInputChange} data={formData} />

      <div className="buttons-save-next-back">
        {currentStepIndex > 0 && (
          <Button onClick={prevStep} className="next-back-button">
            Back
          </Button>
        )}
        <div className="spacer"></div>

        {/* Next only visible before the last logical step */}
        {currentStepIndex < lastLogicalStepIndex && (
          <Button onClick={nextStep} className="next-back-button">
            Next
          </Button>
        )}

        {/* Save only on the last logical step
            - If Subjects enabled: on Subjects
            - If Subjects disabled or "No": on Experiments */}
        {isLastLogicalStep && (
          <PopoverSave
            //downloadJson={downloadJson}
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
  if (!userInfo.reloadWizard) {
    return <LoadingSpinner />
  }
  return null
}

export default StepsWizard
