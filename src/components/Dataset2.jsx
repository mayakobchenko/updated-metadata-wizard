import React from 'react'
import { Form as AntForm, Input, Checkbox } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

export default function Dataset2({ onChange, data }) {
  const userInfo = useAuthContext()
   /*  const initialValues = {
 
    dataset2: {
      homePage: data.dataset2?.homePage || userInfo?.dataset2?.homePage || '',
      supportChannel: data.dataset2.supportChannel || '',
    }}*/
  const handleValuesChange = (changedValues, allValues) => {onChange(allValues)}

  return (
    <ConfigProvider>
      <div>
        <p className="step-title">Dataset part 2</p>
      </div>
      <AntForm
        layout="vertical"
        onValuesChange={handleValuesChange}>
        <AntForm.Item
          label="Home Page"
          name={['dataset2', 'homePage']} 
          rules={[{ required: false }]}
          extra="Add the URL to the homepage of this dataset (if applicable).">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Support channel"
          name={['dataset2', 'supportChannel']} 
          rules={[{ required: false }]}
          extra="Enter all channels through which a user can receive support for handling
          this research product (if applicable). This could for example be a link to a website
          or a contact email address.">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Input data"
          name={['dataset2', 'inputdata']} 
          rules={[{ required: false }]}
          extra="Add the data that was used as input for this dataset version. This is typically
          a DOI or reference to the original dataset from which the current dataset is derived (if applicable).">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Related Publications"
          name={['dataset2', 'publications']} 
          rules={[{ required: false }]}
          extra="Please list DOIs of all related publications that report on the dataset itself or on analysis
          based on the data. The DOI should be in the following format: https://doi.org/[DOI],
          for example https://doi.org/10.1000/182">
          <Input />
        </AntForm.Item>

      </AntForm>
    </ConfigProvider>
  );
}

