import React from 'react'
import { Form as AntForm, Input } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

const { TextArea } = Input

export default function Introduction({ onChange, data }) {
  const userInfo = useAuthContext()
  const initialValues = {
    dataset1: {
      dataTitle: data.dataset1?.dataTitle || userInfo?.nettskjemaInfo?.dataTitle || '',
      briefSummary: data.dataset1?.briefSummary || userInfo?.nettskjemaInfo?.briefSummary || '',
      shortTitle: data.dataset1?.shortTitle || ''}}
  const handleValuesChange = (changedValues, allValues) => {onChange(allValues)}

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
          rules={[{ required: true, message: 'Please enter a brief summary describing your data' }]}>
        <TextArea
            autoSize={{ minRows: 3, maxRows: 10 }} 
            style={{ resize: 'none' }}
            placeholder="Please enter a brief summary..."/>
        </AntForm.Item>




      </AntForm>
    </ConfigProvider>
  );
}

