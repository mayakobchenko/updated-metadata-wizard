import React from 'react'
import { Form as AntForm, Input, Checkbox } from 'antd'
import ConfigProvider from './ConfigProvider'

export default function Experiments({ onChange, data }) {
  const handleValuesChange = (changedValues, allValues) => {onChange(allValues)}
  const optionsYesNo = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
  ]
  return (
    <ConfigProvider>
      <div>
        <p className="step-title">Experimental metadata</p>
      </div>
      <AntForm
        layout="vertical"
        onValuesChange={handleValuesChange}>
        <AntForm.Item
          name={['experiments', 'subjectschoice']}
          label="Did you use experimental subjects in any way?
          Tick 'Yes' if you have information about subject groups,
          individual subjects and/or tissue samples."
          rules={[{ required: true, message: 'Please select at least one option!' }]}>
          <Checkbox.Group options={optionsYesNo} style={{ padding: '20px' }}/>
        </AntForm.Item>
        <AntForm.Item
          label="Experimental approach"
          name={['experiments', 'approach']} 
          rules={[{ required: true }]}
          extra="Please indicate which experimental approaches best describe your data.
          Start typing to find relevant categories and select as many as appropriate.">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Preparation type"
          name={['experiments', 'preparation']} 
          rules={[{ required: false }]}
          extra="Please specify whether your data were acquired in vivo, in vitro etc.
          Remember to consider each of your methods and add all preparation types that apply.">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Study target"
          name={['experiments', 'target']} 
          rules={[{ required: false }]}
          extra="Specify all interesting targets you had for producing this dataset.
          Please select first among the categories, and then choose an instance for that category.">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Keywords"
          name={['experiments', 'keywords']} 
          rules={[{ required: false }]}
          extra="If there are additional key words you would like your dataset to be found by,
          please state them here.">
          <Input />
        </AntForm.Item>

      </AntForm>
    </ConfigProvider>
  );
}

