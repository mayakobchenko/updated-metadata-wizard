import { useState, useEffect } from 'react'
import { Form, Input, Select, Radio } from 'antd'

const { Option } = Select

export default function Experiments({ form, onChange, data }) {
  const [experim_appr, setExperim_appr] = useState([])
  const [prepTypes, setPrepTypes] = useState([])
  const [studyTargets, setStudyTargets] = useState([])
  const [techniques, setTechniques] = useState([])

  const fetchStudyTargets = async () => {
    try {
      const response = await fetch('api/kginfo/studytargets')
      if (!response.ok) {
        throw new Error(`Error fetching study targets: ${response.status}`)
      }
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
        throw new Error(
          `Error fetching experimental approaches: ${response.status}`,
        )
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

  const fetchTechniques = async () => {
    try {
      const response = await fetch('api/kginfo/techniques')
      if (!response.ok) {
        throw new Error(`Error fetching techniques: ${response.status}`)
      }
      const fetchedData = await response.json()
      setTechniques(fetchedData.techniques)
    } catch (error) {
      console.error('Error fetching techniques:', error)
    }
  }

  useEffect(() => {
    fetchExperimentalApproaches()
    fetchPreparationTypes()
    fetchStudyTargets()
    fetchTechniques()
  }, [])

  // Whenever any field in this Form changes, push the entire form state upward.
  const handleValuesChange = (_changedValues, allValues) => {
    // allValues already has shape { experiments: { ... } } because of names
    onChange(allValues)
  }

  return (
    <div>
      <p className="step-title">Experimental metadata</p>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={data} // ensure values from StepsWizard are shown
      >
        {/* ── yes/no subject choice ── */}
        <Form.Item
          name={['experiments', 'subjectschoice']}
          label={
            <>
              Did you use experimental subjects in any way? Tick &quot;Yes&quot; if you have
              information about subject groups, individual subjects and/or tissue samples.
            </>
          }
          rules={[{ required: true, message: 'Please select at least one option!' }]}
        >
          <Radio.Group style={{ padding: '20px' }}>
            <Radio value="Yes">Yes</Radio>
            <Radio value="No">No</Radio>
          </Radio.Group>
        </Form.Item>

        {/* ── experimental approaches ── */}
        <p className="step-title">
          Please indicate which experimental approaches best describe your data
        </p>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Form.Item
            label="Select experimental approach"
            name={['experiments', 'experimentalApproach']}
            required
            style={{ flex: 1 }}
          >
            <Select
              mode="multiple"
              showSearch
              style={{ minWidth: 240 }}
              placeholder="Type to search ..."
              filterOption={(input, option) => {
                if (!option || typeof option.children !== 'string') return false
                return option.children.toLowerCase().includes(input.toLowerCase())
              }}
            >
              {experim_appr.map((option) => (
                <Option key={option.identifier} value={option.identifier}>
                  {option.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* ── techniques ── */}
        <div>
          <Form.Item
            label="Select experimental techniques"
            name={['experiments', 'techniques']}
            required={true}
            style={{ flex: 1 }}
            extra="Please add all techniques that apply to the generation of this dataset."
          >
            <Select
              mode="multiple"
              showSearch
              style={{ width: '100%' }}
              placeholder="Type to search ..."
              filterOption={(input, option) => {
                if (!option || typeof option.children !== 'string') return false
                return option.children.toLowerCase().includes(input.toLowerCase())
              }}
            >
              {techniques.map((option) => (
                <Option key={option.identifier} value={option.identifier}>
                  {option.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* ── preparation types ── */}
        <p className="step-title">
          Please indicate the preparation type(s) for your data
        </p>
        <div>
          <Form.Item
            label="Select preparation type"
            name={['experiments', 'preparationTypes']}
            style={{ flex: 1 }}
            extra="Please consider each of your methods and add all preparation types that apply."
          >
            <Select
              mode="multiple"
              showSearch
              style={{ width: '100%' }}
              placeholder="Type to search ..."
              filterOption={(input, option) => {
                if (!option || typeof option.children !== 'string') return false
                return option.children.toLowerCase().includes(input.toLowerCase())
              }}
            >
              {prepTypes.map((option) => (
                <Option key={option.identifier} value={option.identifier}>
                  {option.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* ── study targets ── */}
        <Form.Item
          label="Study targets"
          name={['experiments', 'studyTargets']}
          extra="Specify all interesting targets you had for producing this dataset.
          Please select first among the categories, and then choose an instance for that category."
        >
          <Select
            mode="multiple"
            showSearch
            style={{ width: '100%' }}
            placeholder="Type to search or browse by category..."
            optionFilterProp="label"
            filterOption={(input, option) => {
              if (!option) return false
              // skip OptGroup labels — only filter actual options
              if (option.options) return false
              const label = (option.label || '').toString().toLowerCase()
              return label.includes(input.toLowerCase())
            }}
          >
            {[...new Set(studyTargets.map((t) => t.type))]
              .sort()
              .map((type) => (
                <Select.OptGroup key={type} label={type}>
                  {studyTargets
                    .filter((t) => t.type === type)
                    .map((option) => (
                      <Option
                        key={option.identifier}
                        value={option.identifier}
                        label={option.name} // used by filterOption
                      >
                        {option.name}
                      </Option>
                    ))}
                </Select.OptGroup>
              ))}
          </Select>
        </Form.Item>

        {/* ── keywords ── */}
        <Form.Item
          label="Keywords"
          name={['experiments', 'keywords']}
          rules={[{ required: false }]}
          extra="If there are additional key words you would like your dataset to be found by,
          please state them here."
        >
          <Input />
        </Form.Item>
      </Form>
    </div>
  )
}
