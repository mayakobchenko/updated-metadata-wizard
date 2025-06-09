import { useState, useEffect } from 'react'
import { Form as AntForm, Input, Checkbox, Select, DatePicker, Radio  } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

const { TextArea } = Input
const { Option } = Select

export default function Dataset1({ onChange, data }) {
  const [license, setLicense] = useState([])
  const [embargo, setEmbargo] = useState(data.dataset1?.embargo || false)
  const [copyright, setCopyright] = useState(data.dataset1?.copyright || '')
  const userInfo = useAuthContext()

  const initialValues = {
    dataset1: {
      dataTitle: data.dataset1?.dataTitle || userInfo?.nettskjemaInfo?.dataTitle || '',
      briefSummary: data.dataset1?.briefSummary || userInfo?.nettskjemaInfo?.briefSummary || '',
      shortTitle: data.dataset1?.shortTitle || '',
      optionsData: data.dataset1?.optionsData || '',
      embargo: data.dataset1?.embargo || false,
      copyright: data.dataset1?.copyright || false,
      license: data.dataset1?.license || '',
      embargoDate: data.dataset1?.embargoDate || null,
    }}

  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues['dataset1']?.embargo !== undefined) {
    setEmbargo(changedValues['dataset1'].embargo)}
    if (changedValues['dataset1']?.copyright) {
    setCopyright(changedValues['dataset1'].copyright)}
    onChange(allValues)}

  const optionsData = [
    { label: 'Experimental data', value: 'Experimental data' },
    { label: 'Simulated data', value: 'Simulated data' },
    { label: 'Raw data', value: 'Raw data' },
    { label: 'Derived data', value: 'Derived data' },
  ]
  const optionsYesNo = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
  ]
    const optionsCopyright = [
    { label: 'Person', value: 'Person' },
    { label: 'Organization', value: 'Organization' },
  ]
  //const [form] = AntForm.useForm()

 /* useEffect(() => {
    form.setFieldsValue(data)}, [data, form])*/
  useEffect(() => {
    const fetchLicenses = async () => {
    try {
        const url = 'api/kginfo/license'
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`There is a problem fetching licenses from backend: ${response.status}`)}
        const data = await response.json()
        setLicense(data.license)
        } catch (error) {console.error('Error fetching licence from backend:', error)}}
        fetchLicenses()
    }, [])
  return (
    <ConfigProvider>
      <div>
        <p className="step-title">Dataset part 1</p>
      </div>
      <AntForm
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}>
        <AntForm.Item
          label="Dataset title"
          name={['dataset1', 'dataTitle']} 
          rules={[{ required: true, message: 'Please enter title of your dataset' }]}
          extra="Please provide a title for your dataset (max. 110 characters including spaces).
          Please choose a descriptive title, and avoid acronyms and abbreviations where possible.">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Short title"
          name={['dataset1', 'shortTitle']} 
          rules={[{ required: true, message: 'Please enter short title of your dataset' }]}
          extra="Enter a short name (alias) that could be used as a shortened title
          for visualization in cases where there is limited space for display (max 30 characters).">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Brief Sumary"
          name={['dataset1', 'briefSummary']} 
          rules={[{ required: true, message: 'Please enter a brief summary describing your data' }]}
          extra="Provide a brief description of the data you wish to share.">
        <TextArea
            autoSize={{ minRows: 3, maxRows: 10 }} 
            style={{ resize: 'none' }}
            placeholder="Please enter a brief summary..."/>
        </AntForm.Item >
        <AntForm.Item
          name={['dataset1', 'optionsData']}
          label="What type of data would you like to share (You can select multiple values)?"
          rules={[{ required: true, message: 'Please select at least one option!' }]}
          extra="Note: Raw data refers to data which has not been processed or analysed.
          Derived data refers to data which has been processed or analysed.">
          <Checkbox.Group options={optionsData} style={{ padding: '20px' }}/>
        </AntForm.Item>
        <AntForm.Item
          name={['dataset1', 'embargo']}
          label="Embargo status:"
          valuePropName="checked"
          extra="In case you wish to publish a scientific article before sharing
          the associated data through EBRAINS, you have the possibility to embargo
          your data for a certain period of time. Under the embargo period,
          only some of the metadata (e.g. information about subjects, aims etc.)
          will be published through EBRAINS, but the original data itself will not be shared..">
          <Checkbox style={{ padding: '20px' }} onChange={(e) => setEmbargo(e.target.checked)}>
            Yes, embargo dataset
          </Checkbox>
        </AntForm.Item>
        {embargo && (
          <AntForm.Item
              label="Intended release date"
              name={['dataset1', 'embargoDate']}
              rules={[{ required: embargo, message: 'Please select release date!' }]}
              extra = "When do you plan on lifting the embargo? Please try to give your best estimation.">
              <DatePicker style={{ width: '100%' }} />
          </AntForm.Item>)}
        <AntForm.Item
          name={['dataset1', 'copyright']}
          label="Is this version of the dataset copyrighted?"
          rules={[{ required: true, message: 'Please select yes or no!' }]}>
          <Radio.Group 
            onChange={(e) => setCopyright(e.target.value)}>
            {optionsYesNo.map(option => (
              <Radio key={option.value} value={option.value}>
                  {option.label}
              </Radio>))}
          </Radio.Group>
          {/*<Checkbox.Group options={optionsYesNo} style={{ padding: '20px' }}/>*/}
        </AntForm.Item>
        {copyright === "Yes" && (
          <AntForm.Item
              label="Please provide details:"
              name={['dataset1', 'copyrightDetails']}
              rules={[{ required: copyright === 'Yes', message: 'Please provide copyright details!' }]}>
              <Input placeholder="Provide details about copyright..." />
          </AntForm.Item>)}
        <AntForm.Item
          label={`License`}
          name={['dataset1', 'license']}  
          rules={[{ required: true, message: `Please select license!` }]}>
          <Select
            style={{ minWidth: 240 }}
            showSearch
            filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())}>
            {license.map(option => (
                <Option key={option.identifier} value={option.identifier}>
                    {option.fullName}
                </Option>
            ))}
          </Select>
        </AntForm.Item>

      </AntForm>
    </ConfigProvider>
  );
}

