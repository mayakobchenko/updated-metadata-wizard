import React from 'react'
import { Form as AntForm, Input } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

export default function Introduction({ onChange, data }) {
  const userInfo = useAuthContext()
  const initialValues = {
    dataset1: {
      dataTitle: data.dataset1?.dataTitle || userInfo?.nettskjemaInfo?.dataTitle || '',
    }}

    //Ant Design Event Mechanism to keep track of changes
  const handleValuesChange = (changedValues, allValues) => {
    console.log('Changed Values:', changedValues);
    console.log('All Values:', allValues);
   onChange(allValues)
  }

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
          rules={[{ required: true, message: 'Please input your full name!' }]}>
          <Input />
        </AntForm.Item>




      </AntForm>
    </ConfigProvider>
  );
}

