import { useState, useEffect } from 'react'
import { Form, Input, Select, Radio, Button } from 'antd'

const { Option } = Select

export default function Experiments({ form, onChange, data }) {
  
  const [experim_appr, setExperim_appr] = useState([])
  const [prepTypes, setPrepTypes] = useState([])
  const [addExperiment, setAddExperiment] = useState([{ id: Date.now(), selectedExpAppr: [] }])
  const [addPreparation, setAddPreparation] = useState([{ id: Date.now(), selectedPrepType: [] }])
  const [studyTargets, setStudyTargets] = useState([])
  const [selectedStudyTargets, setSelectedStudyTargets] = useState([])

  useEffect(() => {
    setAddExperiment(data.experimental_approach?.addExperiment || [{ id: Date.now(), selectedExpAppr: [] }])
    setAddPreparation(data.experimental_approach?.addPreparation || [{ id: Date.now(), selectedPrepType: [] }])
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
      if (!response.ok) {
        throw new Error(`Error fetching experimental approaches: ${response.status}`)
      }
      const fetchedData = await response.json()
      setExperim_appr(fetchedData.expApproach)
    } catch (error) {
      console.error('Error fetching experimental approaches from KG:', error)
    }
  }

  const fetchPreparationTypes = async () => {
    try {
      const response = await fetch('api/kginfo/preparationtypes')
      if (!response.ok) {
        throw new Error(`Error fetching preparation types: ${response.status}`)
      }
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
 // ── study targets handlers ────────────────────────────────────────────
  const handleStudyTargetChange = (values) => {
      setSelectedStudyTargets(values)
      onChange({ experimental_approach: { ...data.experimental_approach, studyTargets: values } })
  }
  const handleValuesChange = (changedValues) => {
    onChange({ experimental_approach: { ...data.experimental_approach, ...changedValues.experimental_approach } })
  }

  return (
    <div>
      <p className="step-title">Experimental metadata</p>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}>

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

        <Form.Item
            label="Study target"
            extra="Specify all interesting targets you had for producing this dataset. 
            Please select first among the categories, and then choose an instance for that category.">
            <Select
                mode="multiple"
                showSearch
                style={{ width: '100%' }}
                value={selectedStudyTargets}
                onChange={handleStudyTargetChange}
                placeholder="Select study target(s)"
                filterOption={(input, option) => {
                    if (!option) return false
                    return option.children.toLowerCase().includes(input.toLowerCase())
                }}>
                {/* Group options by type for easier navigation */}
                {[...new Set(studyTargets.map(t => t.type))].map(type => (
                    <Select.OptGroup key={type} label={type}>
                        {studyTargets
                            .filter(t => t.type === type)
                            .map(option => (
                                <Option key={option.identifier} value={option.identifier}>
                                    {option.name}
                                </Option>
                            ))
                        }
                    </Select.OptGroup>
                ))}
            </Select>
        </Form.Item>

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