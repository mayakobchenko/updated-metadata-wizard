import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Button } from 'antd'

const { Option } = Select

export default function Experiments({ form, onChange, data }) {
  
  const [experim_appr, setExperim_appr] = useState([])
  const [addExperiment, setAddExperiment] = useState([{ id: Date.now(), selectedExpAppr: '' }])

  useEffect(() => {
      setAddExperiment(data.experimental_approach?.addExperiment || [{ id: Date.now(), selectedExpAppr: '' }])
  }, [data])
  
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
  
  useEffect(() => {
    fetchExperimentalApproaches()
  }, [])
  
  const addDynamicField = () => {
    const newField = { id: Date.now(), selectedExpAppr: '' }
    setAddExperiment([...addExperiment, newField])
    onChange({ experimental_approach: { ...data.experimental_approach, addExperiment: [...addExperiment, newField] } })
  }

  const removeDynamicField = (index) => {
      if (addExperiment.length > 1) {
          const updatedFields = addExperiment.filter((_, i) => i !== index)
          setAddExperiment(updatedFields)
          onChange({ experimental_approach: { ...data.experimental_approach, addExperiment: updatedFields } })
      }
  }

  const handleFieldChange = (index, value) => {
    const updatedFields = addExperiment.map((field, i) => 
      i === index ? { ...field, selectedExpAppr: value } : field
    )
    setAddExperiment(updatedFields)
    onChange({ experimental_approach: { ...data.experimental_approach, addExperiment: updatedFields } })
  }

  const handleValuesChange = (changedValues) => {
      onChange({ experimental_approach: { ...data.experimental_approach, ...changedValues.experimental_approach } })
  }

  const optionsYesNo = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
  ]

  return (
    <div>
      <p className="step-title">Experimental metadata</p>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}>
        <Form.Item
          name={['experiments', 'subjectschoice']}
          label="Did you use experimental subjects in any way?
          Tick 'Yes' if you have information about subject groups,
          individual subjects and/or tissue samples."
          rules={[{ required: true, message: 'Please select at least one option!' }]}>
          <Checkbox.Group options={optionsYesNo} style={{ padding: '20px' }}/>
        </Form.Item>
        <p className="step-title">Please indicate which experimental approaches best describe your data</p>
        {addExperiment.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item label={`Select experimental approach`} required style={{ flex: 1 }}>
              <Select
                  showSearch
                  style={{ minWidth: 240 }}
                  value={field.selectedExpAppr} 
                  onChange={(value) => handleFieldChange(index, value)} 
                  filterOption={(input, option) => {
                    if (!option) return false
                    return option.children.toLowerCase().includes(input.toLowerCase())
                  }}>
                  {experim_appr.map((option) => (
                      <Option key={option.identifier} value={option.identifier}>
                          {option.name || `${option.name}`}
                      </Option>
                  ))}
              </Select>
            </Form.Item>
            <Button type="danger" onClick={() => removeDynamicField(index)}>Remove</Button>
          </div>))}
        <div style={{ textAlign: 'center' }}>
          <Button type="dashed"
              onClick={addDynamicField}
              style={{ width: '30%', margin: '0 0 50px 0'}}
              className="add-contributor-button">
              Add Experimental Approach
          </Button>
        </div>
        
        <Form.Item
          label="Preparation type"
          name={['experiments', 'preparation']} 
          rules={[{ required: false }]}
          extra="Please specify whether your data were acquired in vivo, in vitro etc.
          Remember to consider each of your methods and add all preparation types that apply.">
          <Input />
        </Form.Item>
        <Form.Item
          label="Study target"
          name={['experiments', 'target']} 
          rules={[{ required: false }]}
          extra="Specify all interesting targets you had for producing this dataset.
          Please select first among the categories, and then choose an instance for that category.">
          <Input />
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
