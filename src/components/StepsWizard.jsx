import { useState, useEffect, useRef } from 'react'
import { useAuthContext } from './context/NewContextProvider.jsx'
import ConfigProvider from './ConfigProvider.jsx'
import { Form as AntForm, Button, Modal, Upload, Alert, Typography, Switch, Popover, Select, message } from 'antd'
import { FileTextOutlined, LoadingOutlined, CheckCircleFilled, InfoCircleOutlined, WarningFilled } from '@ant-design/icons'
import ProgressBar from './ProgressBar.jsx'
import Contributors from './Contributors.jsx'
import { authorProblems } from './authorModel'
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
import useLoginKeepalive from './useLoginKeepalive.js'
import useCollabDraft, { INTERVAL_OPTIONS, intervalLabel } from './useCollabDraft.js'
import { normalizeImportedJson } from './importNormalize.js'
import { renderDataDescriptor, downloadBlob } from './renderDescriptor'
import { getFigures, useFigures, setFigures } from './figuresStore'

const { Text } = Typography

// ── feature flag: Data Descriptor step ──────────────────────────────────────
// Controlled via VITE_ENABLE_DATA_DESCRIPTOR in .env (set to the literal
// string "false" to disable). Defaults to enabled when unset, so dev/local
// setups don't need to configure anything — only environments that
// deliberately want it hidden (e.g. production, while the feature is still
// being finished on main) need to set it explicitly. This replaces the
// previous approach of commenting the step in/out by hand before syncing
// main into production — that required editing two files in lockstep every
// time and was easy to get subtly wrong or forget to revert.
const DATA_DESCRIPTOR_ENABLED = import.meta.env.VITE_ENABLE_DATA_DESCRIPTOR !== 'false'

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
  const loginLost = useLoginKeepalive()
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
  const [authorIssues, setAuthorIssues]                  = useState([])    // what is missing in the Contributors step
  const [showAuthorIssues, setShowAuthorIssues]           = useState(false)
  const [importModalVisible, setImportModalVisible]     = useState(false)
  const [importPreview, setImportPreview]               = useState(null)
  const [importError, setImportError]                   = useState('')
  const [applyingImport, setApplyingImport]             = useState(false)
  const [importFileName, setImportFileName]             = useState('')
  // Unsaved-changes tracking: the form lives only in memory, so the user must download a draft to keep it.
  const [lastSavedAt, setLastSavedAt]                   = useState(null)
  const [dirty, setDirty]                               = useState(false)
  const lastUserInputRef                                = useRef(0)   // time of the last real edit by the user
  const figureItems                                     = useFigures()
  const figuresSeen                                     = useRef(false)
  const figuresToApply                                  = useRef(null) // pictures/tables loaded from the Collab drive, applied together with the draft
  const [editTick, setEditTick]                         = useState(0) // counts real edits (triggers the Collab autosave)

  useEffect(() => {
    // Only a real edit by the user marks the form as changed. Values that the wizard fills in by itself
    // (prefills when a step opens, importing a draft, navigation) arrive without a recent edit and are ignored.
    const mark = () => { lastUserInputRef.current = Date.now() }
    const markClick = (e) => {
      const t = e.target
      if (!t?.closest) return
      if (t.closest('.ant-select-item, .ant-checkbox-wrapper, .ant-radio-wrapper, .ant-picker-cell, .ant-switch')) { mark(); return }
      const btn = t.closest('button')
      // add/remove/use-draft buttons inside a step change data; navigation, import and download buttons do not
      if (btn && btn.closest('form') && !btn.closest('.next-back-button')) mark()
    }
    window.addEventListener('keydown', mark, true)
    window.addEventListener('input', mark, true)
    window.addEventListener('click', markClick, true)
    return () => {
      window.removeEventListener('keydown', mark, true)
      window.removeEventListener('input', mark, true)
      window.removeEventListener('click', markClick, true)
    }
  }, [])

  useEffect(() => {
    const warn = (e) => {
      if (!dirty) return
      e.preventDefault(); e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

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
    if (Date.now() - lastUserInputRef.current < 2500) { setDirty(true); setEditTick((n) => n + 1) }
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

  const applyImportedJson = async () => {
    if (!importPreview || applyingImport) return
    setApplyingImport(true)
    try {
    // The exported JSON holds KG URLs for "type of data" and free-form values for
    // the data standards; map them back to what the form widgets understand.
    // Right after a deployment the server may still be loading its reference data; wait for it (bounded)
    // instead of silently importing without the data-type mapping.
    let dataTypes = null
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 60000)
      const res = await fetch('api/kginfo/datatypes', { signal: ctrl.signal })
      clearTimeout(timer)
      if (res.ok) dataTypes = (await res.json()).dataTypes || []
    } catch (e) {
      console.warn('Could not load KG data types for import:', e.message)
    }
    if (dataTypes === null) {
      setImportError('The reference data from the server is not available yet (the wizard may have just been updated). Please wait a moment and click "Apply to form" again.')
      return
    }
    const normalized = normalizeImportedJson(importPreview, dataTypes)
    const merged = deepMerge(formDataRef.current, normalized)
    formDataRef.current = merged
    setFormData(merged)
    form.setFieldsValue(normalizeDatesForForm(merged))
    onFormDataChange?.(merged)
    if (figuresToApply.current) { setFigures(figuresToApply.current); figuresToApply.current = null }
    collab.resolve()
    setImportModalVisible(false)
    setImportPreview(null)
    setImportFileName('')
    setImportError('')
    } finally {
      setApplyingImport(false)
    }
  }

  const handleImportCancel = () => {
    figuresToApply.current = null
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
  //    7    DataDescriptor   always (last step) — only when
  //                          VITE_ENABLE_DATA_DESCRIPTOR !== 'false'

  const steps = [
    { id: 0, component: Intro          },
    { id: 1, component: Dataset1       },
    { id: 2, component: Dataset2       },
    { id: 3, component: Funding        },
    { id: 4, component: Contributors   },
    { id: 5, component: Experiments    },
    { id: 6, component: Subjects       },  // may be skipped
    ...(DATA_DESCRIPTOR_ENABLED
      ? [{ id: 7, component: DataDescriptor }]  // always last, when enabled
      : []),
  ]

  const SUBJECTS_INDEX = 6
  // Last real step index, derived from the actual steps array rather than
  // hardcoded — automatically tracks whichever step is really last:
  // DataDescriptor (7) when the flag is on, Subjects (6) when it's off.
  const lastStepIndex = steps.length - 1

  const subjectStepEnabled = formData?.experiments?.subjectschoice === 'Yes'
  const subjectStepVisible = formData?.experiments?.subjectschoice !== 'No'

  // When DataDescriptor is enabled, it's always the last step regardless of
  // Subjects, so no falling back further. When disabled, the last step is
  // Subjects if enabled, or Experiments (5) otherwise — same behavior as
  // before DataDescriptor existed.
  const lastLogicalStepIndex = DATA_DESCRIPTOR_ENABLED
    ? lastStepIndex
    : (subjectStepEnabled ? SUBJECTS_INDEX : SUBJECTS_INDEX - 1)

  // If subjects get disabled while the user is on (or past) the Subjects
  // step, jump to wherever the real last step now is.
  useEffect(() => {
    if (!subjectStepEnabled && currentStepIndex > lastLogicalStepIndex) {
      setCurrentStepIndex(lastLogicalStepIndex)
    }
  }, [subjectStepEnabled, currentStepIndex, lastLogicalStepIndex])

  // ── navigation ────────────────────────────────────────────────────────────

  const nextStep = () => {
    // All steps, including DataDescriptor, now share the same form instance,
    // so validateFields() here covers whichever step is currently mounted.
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

    form.validateFields()
      .then(() => {
        // Contributors: every author needs an email and an affiliation
        if (steps[currentStepIndex].component === Contributors) {
          const issues = authorProblems(formDataRef.current || formData)
          setAuthorIssues(issues)
          setShowAuthorIssues(issues.length > 0)
          if (issues.length) return
        }
        advance()
      })
      .catch(() => setIsModalVisible(true))
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

  // Builds the Word data descriptor from the current form data (same generator as the
  // download button in the Data Descriptor step) and returns it as { blob, filename }.
  const buildDocx = async () => {
    const fd = formDataRef.current || {}
    const dd = fd.dataDescriptor || {}
    const missing = ['summary', 'methods', 'usageNotes'].filter(f => !(dd[f] || '').toString().trim())
    if (missing.length || !(dd.authors || []).length) {
      throw new Error('The data descriptor is not complete yet. Please fill in the Data Descriptor step (summary, methods, usage notes and authors) first.')
    }
    return renderDataDescriptor({
      dd: { ...dd, title: fd.dataset1?.dataTitle || dd.title },
      figures: getFigures(),
      fullData: fd,
    })
  }

  const saveDocxToZammad = async (ticketId) => {
    const { blob } = await buildDocx()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    return fetch('/api/zammad/save-docx', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        docxBase64: btoa(bin),
        datasetTitle: formDataRef.current?.dataset1?.dataTitle || 'dataset',
      }),
    })
  }

  const downloadDocx = async () => {
    const { blob, filename } = await buildDocx()
    downloadBlob(blob, filename)
  }

  const getTicketId = async () => {
    const ticketNumber = skjemaInfo?.ticketNumber || ''
    if (!ticketNumber) return { json: async () => ({ ticketId: null }) }
    return fetch(`/api/zammad/zammadinfo?TicketNumber=${ticketNumber}`)
  }

  const saveJsonToZammad = async (ticketId) => {
    try {
      const payload  = await mapDataset1OptionsToIds(formDataRef.current)
      const response = await fetch('/api/zammad/save-json', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          formData: payload,
          datasetTitle: formDataRef.current?.dataset1?.dataTitle || 'dataset'
        })
      })
      return response
    } catch (err) {
      console.error('Error saving to Zammad:', err)
      throw err
    }
  }

  // KG upload can take several minutes for large submissions. Rather than
  // holding one HTTP request open the whole time (fragile against any
  // proxy/browser idle timeout along the way — this is what caused
  // "Failed to fetch" even though the upload was completing fine
  // server-side), this starts a background job and polls for its result.
  // Each poll is a fast, independent request, so no single connection stays
  // open long enough to hit anyone's timeout.
  const KG_POLL_INTERVAL_MS = 3000
  const KG_MAX_WAIT_MS      = 15 * 60 * 1000 // 15 min safety cap

  const savePythonKG = async (ticketId) => {
    const payload  = await mapDataset1OptionsToIds(formDataRef.current)
    const startRes = await fetch(`api/python/runpython${ticketId ? `?ticketId=${encodeURIComponent(ticketId)}&ticketNumber=${encodeURIComponent(skjemaInfo?.ticketNumber || '')}` : ''}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload, null, 2),
    })

    // auth/write errors are still reported synchronously, no job started
    if (!startRes.ok) {
      const data = await startRes.json().catch(() => ({}))
      return { ok: false, status: startRes.status, data }
    }

    const { jobId } = await startRes.json()
    const pollStart = Date.now()

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, KG_POLL_INTERVAL_MS))

      let statusRes
      try {
        statusRes = await fetch(`api/python/runpython/status/${jobId}`)
      } catch (err) {
        // a single dropped poll isn't fatal — try again next interval
        console.warn('KG status poll failed, retrying:', err.message)
        continue
      }

      if (!statusRes.ok) {
        const data = await statusRes.json().catch(() => ({}))
        return { ok: false, status: statusRes.status, data }
      }

      const statusData = await statusRes.json()

      if (statusData.status === 'running') {
        if (Date.now() - pollStart > KG_MAX_WAIT_MS) {
          return {
            ok: false, status: 504,
            data: { error: 'Upload is taking unusually long. It may still complete in the background — check with support if unsure.' },
          }
        }
        continue
      }

      if (statusData.status === 'success') {
        return { ok: true, status: 200, data: statusData.result }
      }

      // status === 'error'
      return { ok: false, status: 500, data: statusData }
    }
  }

  const saveJsonToDrive = async () => {
    const payload = await mapDataset1OptionsToIds(formDataRef.current)
    return fetch('api/drive/driveupload', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload, null, 2),
    })
  }

  useEffect(() => {          // adding, changing or removing a figure/table counts as an edit for the Collab autosave
    if (!figuresSeen.current) { figuresSeen.current = true; return }
    setEditTick((n) => n + 1)
  }, [figureItems])

  const collab = useCollabDraft({
    datasetVersionId: formData?.datasetVersionId || skjemaInfo?.datasetVersionId,
    getPayload: () => mapDataset1OptionsToIds(formDataRef.current),
    editTick,
    onSaved: () => setDirty(false),
  })

  const toggleCollab = (on) => { if (on) collab.enable(); else collab.disable() }

  const loadFromCollab = async () => {
    try {
      const parsed = await collab.load()
      figuresToApply.current = await collab.loadFigures().catch(() => null)
      setImportFileName('metadata_wizard_draft.json (Collab drive)')
      setImportError('')
      setImportPreview(parsed)
      setImportModalVisible(true)
    } catch (e) { message.error(e.message) }
  }

  const downloadJson = async () => {
    const payload = await mapDataset1OptionsToIds(formDataRef.current)
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = 'metadata_wizard.json'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    setDirty(false); setLastSavedAt(new Date())
  }

  const isLastLogicalStep = currentStepIndex === lastLogicalStepIndex
  const importSummary     = buildImportSummary(importPreview)

  return (
    <ConfigProvider>
      {loginLost && (
        <Alert type="warning" showIcon style={{ marginBottom: 8 }}
          message="Your EBRAINS login has ended"
          description="Everything you entered is still in this page. To read a bucket again you need to log in once more: open the wizard in a new browser tab and log in there, then come back to this tab. Please do not reload this tab before you have downloaded a draft." />
      )}
      <ProgressBar
        step={currentStepIndex}
        status={statuses}
        onChanged={goToWizardStep}
        subjectStepVisible={subjectStepVisible}
        dataDescriptorEnabled={DATA_DESCRIPTOR_ENABLED}
      />

      {/* ── Draft bar: nothing is stored in the browser ──── */}
      {(() => {
        const on = collab.enabled
        const every = intervalLabel(collab.intervalSec)
        const warn = (on && (collab.status === 'error' || !!collab.remote?.problem)) || collab.pending || (!on && dirty)
        let icon = <InfoCircleOutlined style={{ color: '#1677ff' }} />
        let text
        if (on) {
          if (collab.remote?.problem) { icon = <WarningFilled style={{ color: '#faad14' }} />; text = <>Could not check the Collab drive for an earlier draft yet ({collab.remote.problem}). Trying again; automatic saving waits until this works. You can click Download draft meanwhile.</> }
          else if (collab.status === 'error') { icon = <WarningFilled style={{ color: '#cf1322' }} />; text = <span style={{ color: '#cf1322' }}>Not saved in the Collab drive: {collab.error} Your answers are still in this page; click Download draft to be safe.</span> }
          else if (collab.pending) { icon = <WarningFilled style={{ color: '#faad14' }} />; text = <>Automatic saving is paused: a saved draft already exists in the Collab drive (see below).</> }
          else if (collab.status === 'saving') { icon = <LoadingOutlined />; text = <>Saving in the Collab drive…</> }
          else if (collab.unsaved) { icon = <LoadingOutlined />; text = <>Changes not saved yet. They will be saved automatically within {every}.</> }
          else if (collab.savedAt) { icon = <CheckCircleFilled style={{ color: '#52c41a' }} />; text = <>All changes are saved in the Collab drive (last saved {collab.savedAt.toLocaleTimeString()}, with figures and tables).</> }
          else text = <>Your answers are saved automatically in the Collab drive of this dataset.</>
        } else {
          if (dirty) icon = <WarningFilled style={{ color: '#faad14' }} />
          text = <><strong>Your answers are not stored on any server or in this browser.</strong>{' '}
            {collab.note ? <span style={{ color: '#ad6800' }}>{collab.note}{' '}</span> : null}
            {dirty ? 'You have changes that are not saved. Click Download draft before you close this page.'
              : lastSavedAt ? `Draft downloaded at ${lastSavedAt.toLocaleTimeString()}.` : 'To continue later, click Download draft and keep the file.'}
            {' '}Figures and tables are not part of the draft file.</>
        }
        return (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 16px', background: warn ? '#fffbe6' : '#f0f7ff',
            border: `1px solid ${warn ? '#ffe58f' : '#bae0ff'}`, borderRadius: 6, margin: '8px 16px 4px', gap: 12,
          }}>
            <span style={{ fontSize: 12, color: '#555', flex: 1 }}>
              <span style={{ marginRight: 6 }}>{icon}</span>{text}
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              {collab.available && (
                <>
                  <span style={{ fontSize: 12, color: '#555' }}>
                    <Switch size="small" checked={collab.enabled} loading={collab.status === 'saving' && !collab.savedAt}
                      onChange={toggleCollab} /> Collab copy{' '}
                    {on && (
                      <>
                        <span style={{ color: '#888' }}>save every</span>{' '}
                        <Select size="small" value={collab.intervalSec} onChange={collab.setIntervalSec} style={{ width: 120 }}
                          title="How often changes are saved automatically in the Collab drive"
                          options={INTERVAL_OPTIONS.map(v => ({ value: v, label: intervalLabel(v) }))} />{' '}
                      </>
                    )}
                    <Popover trigger="click" placement="bottomRight" title="Collab copy"
                      content={
                        <div style={{ maxWidth: 340, fontSize: 13 }}>
                          <p style={{ margin: '0 0 8px' }}>Keeps a copy of your answers, figures and tables in the Collab drive of this dataset, so you can continue later, also on another computer.</p>
                          <p style={{ margin: '0 0 8px' }}>While you make changes, the copy is saved automatically at most as often as the interval you choose next to the switch. You can also use <b>Save now</b>.</p>
                          <p style={{ margin: '0 0 8px' }}><b>Each save replaces the previous one</b>, so a change you made and later regret cannot be undone from the saved copy. Use <b>Download draft</b> to keep a version you want to return to.</p>
                          <p style={{ margin: 0 }}>If you switch it off, nothing is saved anywhere and you must use Download draft before closing the page. The interval is forgotten when you close the page.</p>
                        </div>}>
                      <InfoCircleOutlined style={{ cursor: 'pointer', color: '#1677ff' }} title="About the Collab copy" />
                    </Popover>
                  </span>
                  {on && collab.unsaved && (
                    <Button size="small" onClick={collab.saveNow} title="Save the copy in the Collab drive now">Save now</Button>
                  )}
                  {collab.remote?.exists && (
                    <Button size="small" onClick={loadFromCollab}
                      title={collab.remote.mtime ? `Saved ${new Date(collab.remote.mtime).toLocaleString()}` : 'Open the draft saved in the Collab drive'}>
                      Load from Collab
                    </Button>
                  )}
                </>
              )}
              <Button size="small" type={!on && dirty ? 'primary' : 'default'} onClick={downloadJson}
                title="Download everything you have entered, including the data descriptor, as a draft file">
                Download draft
              </Button>
              <Upload accept=".json" showUploadList={false} beforeUpload={handleJsonUpload}>
                <Button size="small" icon={<FileTextOutlined />}
                  title="Import a draft file you downloaded earlier (or received from a colleague)">
                  Import draft
                </Button>
              </Upload>
            </div>
          </div>
        )
      })()}

      {collab.pending && (
        <Alert type="warning" showIcon style={{ margin: '4px 16px' }}
          message="A draft is already saved in the Collab drive of this dataset"
          description={<>
            It was saved {collab.remote?.mtime ? new Date(collab.remote.mtime).toLocaleString() : 'earlier'}. Automatic saving is paused so that it is not overwritten by an empty form.{' '}
            <Button size="small" type="primary" onClick={loadFromCollab}>Load the saved draft</Button>{' '}
            <Button size="small" onClick={() => collab.resolve()} title="Keep working here; the saved draft will be replaced by what you enter">Start fresh and replace it</Button>
          </>} />
      )}

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
            <Button key="apply" type="primary" loading={applyingImport} onClick={applyImportedJson}>
              {applyingImport ? 'Applying…' : 'Apply to form'}
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
      <CurrentStep form={form} onChange={handleInputChange} data={formData}
        showErrors={showAuthorIssues} onGoToContributors={() => setCurrentStepIndex(4)} onGoToStep={(i) => setCurrentStepIndex(i)} />

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
            saveDocxToZammad={saveDocxToZammad}
            downloadDocx={downloadDocx}
            dataDescriptorEnabled={DATA_DESCRIPTOR_ENABLED}
            getTicketId={getTicketId}
            downloadJson={downloadJson}
          />
        )}
      </div>

      {/* ── Validation warning modal ─────────────────────────────────────── */}
      <Modal title="Please complete the authors" open={authorIssues.length > 0 && showAuthorIssues}
        onOk={() => setAuthorIssues([])} onCancel={() => setAuthorIssues([])} okText="OK" cancelButtonProps={{ style: { display: 'none' } }}>
        <p>Every author needs an email address and at least one affiliation:</p>
        <ul style={{ paddingLeft: 18 }}>{authorIssues.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </Modal>

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
