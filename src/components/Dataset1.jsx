import { useState, useEffect } from 'react'
import { Form as AntForm, Input, Checkbox, Select, DatePicker, Radio } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

export default function Dataset1({ form, onChange, data }) {
  const [license, setLicense] = useState([])
  const [embargo, setEmbargo] = useState(data.dataset1?.embargo || false)
  const [copyright, setCopyright] = useState(data.dataset1?.copyright || '')
  const [copyrightHolder, setCopyrightHolder] = useState(data.dataset1?.copyrightHolder || 'Person')
  const currentYear = dayjs().year()

  const initialValues = {
    dataset1: {
      dataTitle: data.dataset1?.dataTitle || '',
      briefSummary: data.dataset1?.briefSummary || '',
      shortTitle: data.dataset1?.shortTitle || '',
      optionsData: data.dataset1?.optionsData || '',
      //otherDataType: data.dataset1?.otherDataType || '',
      dataStandart: data.dataset1?.dataStandart || '',
      otherDataStandart: data.dataset1?.otherDataStandart || '',
      embargo: data.dataset1?.embargo ?? false,
      //embargoDate: data.dataset1?.embargoDate || null,
      embargoReview: data.dataset1?.embargoReview || false,
      submitJournalName: data.dataset1?.submitJournalName || '',
      copyright: data.dataset1?.copyright || '',
      copyrightHolder: data.dataset1?.copyrightHolder || 'Person',
      copyrightFirstName: data.dataset1?.copyrightFirstName || '',
      copyrightLastName: data.dataset1?.copyrightLastName || '',
      copyrightOrganization: data.dataset1?.copyrightOrganization || '',
      copyrightYear: data.dataset1?.copyrightYear || '',
      license: data.dataset1?.license || '',
      dataStandart: data.dataset1?.dataStandart || '',
    }}

    const [showOtherStandart, setShowOtherStandart] = useState(
      (data.dataset1?.dataStandart || []).includes('other(s)'))
  
    const handleValuesChange = (changedValues, allValues) => {
      if (changedValues['dataset1']?.embargo !== undefined) {
        setEmbargo(changedValues['dataset1'].embargo)
      }
      if (changedValues['dataset1']?.copyright) {
          setCopyright(changedValues['dataset1'].copyright)
      }
      if (changedValues['dataset1']?.copyrightHolder) {
          setCopyrightHolder(changedValues['dataset1'].copyrightHolder)
      }
      if (changedValues['dataset1']?.dataStandart !== undefined) {
        setShowOtherStandart(changedValues['dataset1'].dataStandart.includes('other(s)'))
      }
      onChange(allValues)
    }
/*
  const fetchSemanticDataType = async () => {
    try {
        const response = await fetch('api/kginfo/datatypes')
        if (!response.ok) throw new Error(`Error fetching study targets: ${response.status}`)
        const fetchedData = await response.json()
        setDatatype(fetchedData.dataTypes)
    } catch (error) {console.error('Error fetching study targets:', error)}} 
  */
  const fetchLicenses = async () => {
    try {
      const url = 'api/kginfo/license'
      const response = await fetch(url)
      if (!response.ok) {
          throw new Error(`There is a problem fetching licenses from backend: ${response.status}`)}
      const data = await response.json()
      setLicense(data.license)
    } catch (error) {console.error('Error fetching licence from backend:', error)}}
  
  //semantic data types:
  const optionsData = [
    { label: 'Experimental data', value: 'Experimental data' },
    { label: 'Simulated data', value: 'Simulated data' },
    { label: 'Raw data', value: 'Raw data' },
    { label: 'Derived data', value: 'Derived data' },
  ]
  const optionsDataStandart = [
    { label: 'No, I didn\'t use a standard', value: 'No, I didn\'t use a standard' },
    { label: 'NIX',        value: 'NIX' },
    { label: 'NWB',        value: 'NWB' },
    { label: 'SONATA',     value: 'SONATA' },
    { label: 'BIDS',       value: 'BIDS' },
    { label: 'neuroML',    value: 'neuroML' },
    { label: 'odML',       value: 'odML' },
    { label: 'openMINDS',  value: 'openMINDS' },
    { label: 'other(s)',   value: 'other(s)' },
  ]
  const optionsYesNo = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
  ]
    const optionsCopyright = [
    { label: 'Person', value: 'Person' },
    { label: 'Organization', value: 'Organization' },
  ]

  useEffect(() => {
    //fetchSemanticDataType()
    fetchLicenses()
  }, [])
  
  return (
    <div>
      <div><p className="step-title">Dataset part 1</p></div>
      <AntForm
        form={form}
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
          extra="Enter a short name (alias) that could be used as a shortened title
          for visualization in cases where there is limited space for display (max 30 characters)."
          rules={[{ required: true, message: 'Please enter short title of your dataset' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Brief Summary"
          name={['dataset1', 'briefSummary']} 
          rules={[{ required: false, message: 'Please enter a brief summary describing your data' }]}
          extra="This is the data description that you provided earlier.">
        <TextArea
            autoSize={{ minRows: 3, maxRows: 10 }} 
            style={{ resize: 'none' }}
            placeholder="Please enter a brief summary..."
            readOnly/>
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
        extra="In case you wish to publish a scientific article before sharing
        the associated data through EBRAINS, you have the possibility to embargo
        your data for a certain period of time. Under the embargo period,
        only some of the metadata (e.g. information about subjects, aims etc.)
        will be published through EBRAINS, but the original data itself will not be shared.
        Note that you can request the embargo period for maximum 6 month."
        >
        <Radio.Group
            onChange={e => {
            const val = e.target.value
            setEmbargo(val)
            form.setFieldsValue({ dataset1: { ...form.getFieldValue('dataset1'), embargo: val } })
            }}
        >
            <Radio style={{ padding: '20px' }} value={true}>
            Yes, embargo dataset
            </Radio>
            <Radio style={{ padding: '20px' }} value={false}>
            No, data can be freely available
            </Radio>
        </Radio.Group>
        </AntForm.Item>
 {/*           
        {embargo && (
          <AntForm.Item
            label="Intended release date"
            name={['dataset1', 'embargoDate']}
            rules={[{ required: embargo, message: 'Please select release date!' }]}
            extra = "When do you plan on lifting the embargo? Please try to give your best estimation.">
            <DatePicker style={{ width: '100%' }} />     
          </AntForm.Item>)}
        {initialValues.dataset1.embargoReview && (
          <AntForm.Item
            label="You are planning to submit your manuscript to this peer-reviewed journal:"
            name={['dataset1', 'submitJournalName']}
            rules={[{ required: initialValues.dataset1.embargoReview, message: 'Please confirm the journal name!' }]}>
            <Input />
        </AntForm.Item>)}
 */}               
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
        </AntForm.Item>
        {copyright === "Yes" && (
          <>
              <AntForm.Item
                label={`Copyright Holder`}
                name={['dataset1', 'copyrightHolder']}  
                rules={[{ required: true, message: `Please select legal entity!` }]}
                extra = 'Select the type of legal entity in possession of the copyright.'>
                <Select
                  style={{ minWidth: 240 }}
                  onChange={(value) => setCopyrightHolder(value)}>
                  {optionsCopyright.map(option => (
                      <Option key={option.value} value={option.value}>
                          {option.label}
                      </Option>
                  ))}
                </Select>
              </AntForm.Item>
              {copyrightHolder === "Person" && (<>
                <AntForm.Item
                  label="First Name"
                  name={['dataset1', 'copyrightFirstName']}  // Store first name
                  rules={[{ required: true, message: 'Please enter the first name!' }]}>
                  <Input placeholder="First Name..." />
                </AntForm.Item>
                <AntForm.Item
                  label="Last Name"
                  name={['dataset1', 'copyrightLastName']}  // Store last name
                  rules={[{ required: true, message: 'Please enter the last name!' }]}>
                  <Input placeholder="Last Name..." />
                </AntForm.Item></>)}
              {copyrightHolder === "Organization" && (
              <AntForm.Item
                label="Organization Name"
                name={['dataset1', 'copyrightOrganization']}  // Store organization name
                rules={[{ required: true, message: 'Please enter the organization name!' }]}>
                <Input placeholder="Organization Name..." />
              </AntForm.Item>)}
              <AntForm.Item
                label="Copyright Year"
                name={['dataset1', 'copyrightYear']}
                rules={[{ required: true, message: 'Please select a copyright date!' }]}>
                <DatePicker           
                  picker="year" 
                  style={{ width: '10%' }} 
                  placeholder="Select copyright year"
                  disabledDate={(date) => {
                    if (!date) return false
                    return date.year() > currentYear
                  }}
                />
              </AntForm.Item>
          </>)}
        <AntForm.Item
          label={`License`}
          name={['dataset1', 'license']}  
          rules={[{ required: true, message: `Please select license!` }]}>
          <Select
            style={{ minWidth: 240 }}
            showSearch
            filterOption={(input, option) =>
                option?.props?.children?.toLowerCase().includes(input.toLowerCase())}>
            {license.filter(option =>
              option.shortName?.includes('CC-BY') ||
              option.shortName?.includes('CC0')
            ).map(option => {
              const firstWebpage = Array.isArray(option.webpage) ? option.webpage[0] : option.webpage
              return (<Option key={option.identifier} value={option.identifier}>
                <span>{option.shortName}{' '}</span>
                <span>{option.fullName}</span>
                {firstWebpage && (
                  <>
                    {' '}
                    <a
                      href={firstWebpage}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}>
                      <ExportOutlined style={{ fontSize: 12 }} /> more info
                    </a>
                  </>
                )}
              </Option>)
            })}
          </Select>
        </AntForm.Item>

        <AntForm.Item
          label="Data organization"
          name={['dataset1', 'dataStandart']} 
          rules={[{ required: false, message: 'Please indicate if your data follows any standart' }]}
          extra="Do your data organization follows any community standards such as BIDS or NWB?">
          <Input />
        </AntForm.Item>

        <AntForm.Item
          name={['dataset1', 'dataStandart']}
          label="Data organization standard(s)"
          rules={[{ required: false }]}
          extra="Did your data organization follow any community standards such as BIDS or NWB?">
          <Checkbox.Group
            options={optionsDataStandart}
            style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            onChange={(values) => setDataStandartValues(values)}
          />
        </AntForm.Item>

        {showOtherStandart && (
          <AntForm.Item
            label="Please specify other standard(s)"
            name={['dataset1', 'otherDataStandart']}
            rules={[{ required: true, message: 'Please specify the standard(s) you used!' }]}>
            <Input placeholder="e.g. NIfTI, DICOM..." />
          </AntForm.Item>
        )}

      </AntForm>
    </div>
  );
}

