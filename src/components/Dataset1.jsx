import React from 'react'
import { Form as AntForm, Input, Checkbox } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

const { TextArea } = Input

export default function Dataset1({ onChange, data }) {
  const userInfo = useAuthContext()
  const initialValues = {
    dataset1: {
      dataTitle: data.dataset1?.dataTitle || userInfo?.nettskjemaInfo?.dataTitle || '',
      briefSummary: data.dataset1?.briefSummary || userInfo?.nettskjemaInfo?.briefSummary || '',
      shortTitle: data.dataset1?.shortTitle || '',
      optionsData: data.dataset1?.optionsData || '',
      embargo: data.dataset1?.embargo || false,
      copyright: data.dataset1?.copyright || false,
    }}
  const handleValuesChange = (changedValues, allValues) => {onChange(allValues)}
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
          <Checkbox style={{ padding: '20px' }}>
            Yes, embargo dataset
          </Checkbox>
        </AntForm.Item>
        <AntForm.Item
          name={['dataset1', 'copyright']}
          label="Is this version of the dataset copyrighted?"
          rules={[{ required: true, message: 'Please select at least one option!' }]}>
          <Checkbox.Group options={optionsYesNo} style={{ padding: '20px' }}/>
        </AntForm.Item>


      </AntForm>
    </ConfigProvider>
  );
}

