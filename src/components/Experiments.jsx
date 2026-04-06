import { useState, useEffect } from 'react'
import { Form, Input, Select, Radio } from 'antd'

const { Option } = Select

export default function Experiments({ form, onChange, data }) {
  const [experim_appr, setExperim_appr] = useState([])
  const [prepTypes, setPrepTypes]       = useState([])
  const [studyTargets, setStudyTargets] = useState([])
  const [techniques, setTechniques]     = useState([])

  useEffect(() => {
    const fetcher = (url, setter, key) => async () => {
      try {
        const res  = await fetch(url)
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        setter(Array.isArray(json[key]) ? json[key] : [])
      } catch (e) { console.error(`Error fetching ${url}:`, e) }
    }
    fetcher('api/kginfo/experimentalapproaches', setExperim_appr,  'expApproach')()
    fetcher('api/kginfo/preparationtypes',       setPrepTypes,      'prepType')()
    fetcher('api/kginfo/studytargets',           setStudyTargets,   'studyTargets')()
    fetcher('api/kginfo/techniques',             setTechniques,     'techniques')()
  }, [])

  const handleValuesChange = (_changedValues, allValues) => {
    onChange(allValues)
  }

  // helper — builds OptGroup select from tagged list
  const groupedSelect = (items) =>
    [...new Set(items.map(t => t.type))].sort().map(type => (
      <Select.OptGroup key={type} label={type}>
        {items
          .filter(t => t.type === type)
          .map(option => (
            <Option key={option.identifier} value={option.identifier} label={option.name}>
              {option.name}
            </Option>
          ))}
      </Select.OptGroup>
    ))

  const groupedFilterOption = (input, option) => {
    if (!option) return false
    if (option.options) return false  // skip OptGroup labels
    return (option.label || '').toString().toLowerCase().includes(input.toLowerCase())
  }

  return (
    <div>
      <p className="step-title">Experimental metadata</p>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={data}
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
        <Form.Item
          label="Select experimental approach"
          name={['experiments', 'experimentalApproach']}
          required
        >
          <Select
            mode="multiple"
            showSearch
            style={{ width: '100%' }}
            placeholder="Type to search..."
            filterOption={(input, option) => {
              if (!option || typeof option.children !== 'string') return false
              return option.children.toLowerCase().includes(input.toLowerCase())
            }}
          >
            {experim_appr.map(option => (
              <Option key={option.identifier} value={option.identifier}>
                {option.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* ── techniques — grouped by type ── */}
        <p className="step-title">
          Please indicate the experimental technique(s) used
        </p>
        <Form.Item
          label="Select experimental techniques"
          name={['experiments', 'techniques']}
          required
          extra="Please add all techniques that apply to the generation of this dataset."
        >
          <Select
            mode="multiple"
            showSearch
            style={{ width: '100%' }}
            placeholder="Type to search or browse by category..."
            optionFilterProp="label"
            filterOption={groupedFilterOption}
          >
            {groupedSelect(techniques)}
          </Select>
        </Form.Item>

        {/* ── preparation types ── */}
        <p className="step-title">
          Please indicate the preparation type(s) for your data
        </p>
        <Form.Item
          label="Select preparation type"
          name={['experiments', 'preparationTypes']}
          extra="Please consider each of your methods and add all preparation types that apply."
        >
          <Select
            mode="multiple"
            showSearch
            style={{ width: '100%' }}
            placeholder="Type to search..."
            filterOption={(input, option) => {
              if (!option || typeof option.children !== 'string') return false
              return option.children.toLowerCase().includes(input.toLowerCase())
            }}
          >
            {prepTypes.map(option => (
              <Option key={option.identifier} value={option.identifier}>
                {option.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* ── study targets — grouped by type ── */}
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
            filterOption={groupedFilterOption}
          >
            {groupedSelect(studyTargets)}
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