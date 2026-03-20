import { Form, Input, Button } from 'antd'
import { useState, useEffect } from 'react'

export default function Funding({ form, onChange, data = {} }) {

  const [funders, setFunders] = useState(data.funding?.funders || [])

  useEffect(() => {
    setFunders(data.funding?.funders || [])
  }, [data])

  const addFunder = () => {
    const newFunder = { id: Date.now(), funderName: '', grantId: '' }
    const updated = [...funders, newFunder]
    setFunders(updated)
    onChange({ funding: { ...data.funding, funders: updated } })
  }

  const removeFunder = (index) => {
    const updated = funders.filter((_, i) => i !== index)
    setFunders(updated)
    onChange({ funding: { ...data.funding, funders: updated } })
  }

  const handleFunderChange = (index, field, value) => {
    const updated = [...funders]
    updated[index] = { ...updated[index], [field]: value }
    setFunders(updated)
    onChange({ funding: { ...data.funding, funders: updated } })
  }

  return (
    <div>
      <p className="step-title">Funding Information</p>
      <p className="step-description">
        Please provide information about the funding sources for this dataset.
      </p>

      <Form form={form} layout="vertical">

        {funders.map((field, index) => (
          <div
            key={field.id}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 16,
              background: '#fafafa'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="step-subtitle">Funder {index + 1}</span>
              <Button
                type="text"
                danger
                onClick={() => removeFunder(index)}
                className="remove-text-btn"
              >
                Remove
              </Button>
            </div>

            <Form.Item
              label="Funder name"
              required
              extra="Please state the full name of the funder (no abbreviations)."
              style={{ marginBottom: 12 }}
            >
              <Input
                value={field.funderName}
                onChange={(e) => handleFunderChange(index, 'funderName', e.target.value)}
                placeholder="e.g. European Research Council"
              />
            </Form.Item>

            <Form.Item
              label="Grant ID / Award number"
              extra="Please state the grant ID for the funding you have received."
              style={{ marginBottom: 0 }}
            >
              <Input
                value={field.grantId}
                onChange={(e) => handleFunderChange(index, 'grantId', e.target.value)}
                placeholder="e.g. ERC-2021-STG-123456"
              />
            </Form.Item>
          </div>
        ))}

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button
            type="dashed"
            onClick={addFunder}
            style={{ width: '30%' }}
            className="add-contributor-button"
          >
            Add funder
          </Button>
        </div>

      </Form>
    </div>
  )
}