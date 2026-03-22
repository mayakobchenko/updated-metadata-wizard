import { useState, useEffect } from 'react'
import { Form, Input, Select, Radio, Button } from 'antd'

const { Option } = Select

// ── helper to create a new empty study target entry ──────────────────────────
const newStudyTargetEntry = () => ({ id: Date.now() + Math.random(), type: null, instances: [] })

export default function Experiments({ form, onChange, data }) {

  const [experim_appr, setExperim_appr]   = useState([])
  const [prepTypes, setPrepTypes]           = useState([])
  const [addExperiment, setAddExperiment]   = useState([{ id: Date.now(), selectedExpAppr: [] }])
  const [addPreparation, setAddPreparation] = useState([{ id: Date.now(), selectedPrepType: [] }])
  const [studyTargets, setStudyTargets]     = useState([])

  // ── each entry has { id, type, instances[] } ────────────────────────────
  const [studyTargetEntries, setStudyTargetEntries] = useState(
    [newStudyTargetEntry()]
  )

  useEffect(() => {
    setAddExperiment(data.experimental_approach?.addExperiment || [{ id: Date.now(), selectedExpAppr: [] }])
    setAddPreparation(data.experimental_approach?.addPreparation || [{ id: Date.now(), selectedPrepType: [] }])
    if (data.experimental_approach?.studyTargetEntries) {
      setStudyTargetEntries(data.experimental_approach.studyTargetEntries)
    }
  }, [data])

  const fetchStudyTargets = async () => {
    try {
      const response = await fetch('api/kginfo/studytargets')
      if (!response.ok) throw new Error(`Error fetching study targets: ${response.status}`)
      const fetchedData = await response.json()
      setStudyTargets(fetchedData.studyTargets)
    } catch (error) {
      console.error('Error fetching study targets:', error)
    }
  }

  const fetchExperimentalApproaches = async () => {
    try {
      const response = await fetch('api/kginfo/experimentalapproaches')
      if (!response.ok) throw new Error(`Error fetching experimental approaches: ${response.status}`)
      const fetchedData = await response.json()
      setExperim_appr(fetchedData.expApproach)
    } catch (error) {
      console.error('Error fetching experimental approaches from KG:', error)
    }
  }

  const fetchPreparationTypes = async () => {
    try {
      const response = await fetch('api/kginfo/preparationtypes')
      if (!response.ok) throw new Error(`Error fetching preparation types: ${response.status}`)
      const fetchedData = await response.json()
      setPrepTypes(fetchedData.prepType)
    } catch (error) {
      console.error('Error fetching preparation types:', error)
    }
  }

  useEffect(() => {
    fetchExperimentalApproaches()
    fetchPreparationTypes()
    fetchStudyTargets()
  }, [])

  // ── experimental approach handlers ──────────────────────────────────────
  const handleFieldChange = (index, value) => {
    const updated = addExperiment.map((field, i) =>
      i === index ? { ...field, selectedExpAppr: value } : field
    )
    setAddExperiment(updated)
    onChange({ experimental_approach: { ...data.experimental_approach, addExperiment: updated } })
  }

  // ── preparation type handlers ────────────────────────────────────────────
  const handlePreparationChange = (index, value) => {
    const updated = addPreparation.map((field, i) =>
      i === index ? { ...field, selectedPrepType: value } : field
    )
    setAddPreparation(updated)
    onChange({ experimental_approach: { ...data.experimental_approach, addPreparation: updated } })
  }

  // ── study target handlers ────────────────────────────────────────────────
  const emitStudyTargets = (updated) => {
    setStudyTargetEntries(updated)
    onChange({ experimental_approach: { ...data.experimental_approach, studyTargetEntries: updated } })
  }

  const addStudyTargetEntry = () => {
    emitStudyTargets([...studyTargetEntries, newStudyTargetEntry()])
  }

  const removeStudyTargetEntry = (id) => {
    emitStudyTargets(studyTargetEntries.filter(e => e.id !== id))
  }

  const handleTargetTypeChange = (id, type) => {
    // clear instances when type changes
    emitStudyTargets(studyTargetEntries.map(e =>
      e.id === id ? { ...e, type, instances: [] } : e
    ))
  }

  const handleTargetInstanceChange = (id, instances) => {
    emitStudyTargets(studyTargetEntries.map(e =>
      e.id === id ? { ...e, instances } : e
    ))
  }

  const handleValuesChange = (changedValues) => {
    onChange({ experimental_approach: { ...data.experimental_approach, ...changedValues.experimental_approach } })
  }

  // ── derive sorted list of available type categories ──────────────────────
  const availableTypes = [...new Set(studyTargets.map(t => t.type))].sort()

  return (
    <div>
      <p className="step-title">Experimental metadata</p>
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>

        {/* ── yes/no subject choice ── */}
        <Form.Item
          name={['experiments', 'subjectschoice']}
          label="Did you use experimental subjects in any way?
          Tick 'Yes' if you have information about subject groups,
          individual subjects and/or tissue samples."
          rules={[{ required: true, message: 'Please select at least one option!' }]}>
          <Radio.Group style={{ padding: '20px' }}>
            <Radio value="Yes">Yes</Radio>
            <Radio value="No">No</Radio>
          </Radio.Group>
        </Form.Item>

        {/* ── experimental approaches ── */}
        <p className="step-title">Please indicate which experimental approaches best describe your data</p>
        {addExperiment.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item label="Select experimental approach" required style={{ flex: 1 }}>
              <Select
                mode="multiple"
                showSearch
                style={{ minWidth: 240 }}
                value={field.selectedExpAppr}
                onChange={(value) => handleFieldChange(index, value)}
                placeholder="Select experimental approach(es)"
                filterOption={(input, option) => {
                  if (!option) return false
                  return option.children.toLowerCase().includes(input.toLowerCase())
                }}>
                {experim_appr.map((option) => (
                  <Option key={option.identifier} value={option.identifier}>
                    {option.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        ))}

        {/* ── preparation types ── */}
        <p className="step-title">Please indicate the preparation type(s) for your data</p>
        {addPreparation.map((field, index) => (
          <div key={field.id}>
            <Form.Item
              label="Select preparation type"
              required
              style={{ flex: 1 }}
              extra="Please specify whether your data were acquired in vivo, in vitro etc.
              Remember to consider each of your methods and add all preparation types that apply.">
              <Select
                mode="multiple"
                showSearch
                style={{ minWidth: 240 }}
                value={field.selectedPrepType}
                onChange={(value) => handlePreparationChange(index, value)}
                placeholder="Select preparation type(s)"
                filterOption={(input, option) => {
                  if (!option) return false
                  return option.children.toLowerCase().includes(input.toLowerCase())
                }}>
                {prepTypes.map((option) => (
                  <Option key={option.identifier} value={option.identifier}>
                    {option.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        ))}

        {/* ── study targets ── */}
        <p className="step-title">Study target</p>
        <p className="step-description">
          Specify all interesting targets you had for producing this dataset.
          For each entry, first select a category then choose one or more instances.
        </p>

        {studyTargetEntries.map((entry, index) => (
          <div
            key={entry.id}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 16,
              background: '#fafafa'
            }}
          >
            {/* entry header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="step-subtitle">Study target {index + 1}</span>
              <Button
                type="text"
                danger
                disabled={studyTargetEntries.length === 1}
                onClick={() => removeStudyTargetEntry(entry.id)}
                className="remove-text-btn">
                Remove
              </Button>
            </div>

            {/* Step 1 — category */}
            <Form.Item label="Step 1 — select a target category" style={{ marginBottom: 12 }}>
              <Select
                showSearch
                style={{ width: '100%' }}
                value={entry.type}
                onChange={(type) => handleTargetTypeChange(entry.id, type)}
                placeholder="Select a category (e.g. CellType, Organ, Species...)"
                allowClear
                filterOption={(input, option) => {
                  if (!option) return false
                  return option.children.toLowerCase().includes(input.toLowerCase())
                }}>
                {availableTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>

            {/* Step 2 — instances */}
            <Form.Item
              label={`Step 2 — select instance(s)${entry.type ? ` from ${entry.type}` : ''}`}
              extra={!entry.type ? 'Please select a category first.' : undefined}
              style={{ marginBottom: 0 }}>
              <Select
                mode="multiple"
                showSearch
                style={{ width: '100%' }}
                value={entry.instances}
                onChange={(instances) => handleTargetInstanceChange(entry.id, instances)}
                placeholder={entry.type ? `Select ${entry.type} instance(s)` : 'Select a category first'}
                disabled={!entry.type}
                filterOption={(input, option) => {
                  if (!option) return false
                  return option.children.toLowerCase().includes(input.toLowerCase())
                }}>
                {studyTargets
                  .filter(t => t.type === entry.type)
                  .map(option => (
                    <Option key={option.identifier} value={option.identifier}>
                      {option.name}
                    </Option>
                  ))
                }
              </Select>
            </Form.Item>
          </div>
        ))}

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button
            type="dashed"
            onClick={addStudyTargetEntry}
            style={{ width: '30%' }}
            className="add-contributor-button">
            Add study target
          </Button>
        </div>

        {/* ── keywords ── */}
        <Form.Item
          label="Keywords"
          name={['experiments', 'keywords']}
          rules={[{ required: false }]}
          extra="If there are additional key words you would like your dataset to be found by,
          please state them here.">
          <Input />
        </Form.Item>

      </Form>
    </div>
  )
}