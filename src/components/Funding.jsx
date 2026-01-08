import { Form as AntForm, Input, Checkbox } from 'antd'
import ConfigProvider from './ConfigProvider'

export default function Funding({ onChange, data }) {
  const handleValuesChange = (changedValues, allValues) => {onChange(allValues)}

  return (
    <ConfigProvider>
      <div>
        <p className="step-title">Funding Information</p>
      </div>
      <AntForm
        layout="vertical"
        onValuesChange={handleValuesChange}>
        <AntForm.Item
          label="Funder name"
          name={['funding', 'fundeName']} 
          rules={[{ required: true }]}
          extra="Please state the full name of the funder you received funding from (no abbreviations).">
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Grant ID / Award number"
          name={['funding', 'grantId']} 
          rules={[{ required: false }]}
          extra="Please state the grant ID for the funding you have received.">
          <Input />
        </AntForm.Item>

      </AntForm>
    </ConfigProvider>
  );
}

