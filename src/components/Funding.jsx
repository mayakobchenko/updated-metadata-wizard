import { Form, Input, Button, Radio } from 'antd'
import { useEffect } from 'react'

// Funding is mandatory information: first the question "Are you funded?"; with "Yes" at least one funder with its
// name has to be given (the grant ID is optional), with "No" the step is complete. The answer is stored as funding.isFunded
// ('Yes' | 'No'), the funders as funding.funders (empty when the answer is "No").
const newFunder = () => ({ id: Date.now() + Math.random(), funderName: '', grantId: '' })
export const fundedAnswer = (funding) => funding?.isFunded || ((funding?.funders || []).length ? 'Yes' : undefined)

export default function Funding({ form, onChange, data = {} }) {
  const funding = data.funding || {}

  // show what the data holds (a loaded draft, a revisit of the step); drafts from before the question count as "Yes"
  useEffect(() => {
    const answer = fundedAnswer(funding)
    const funders = funding.funders || []
    form.setFieldsValue({ funding: { isFunded: answer, funders: answer === 'Yes' && !funders.length ? [newFunder()] : funders } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.funding])

  const send = () => {
    const f = form.getFieldValue(['funding']) || {}
    onChange({ funding: { ...funding, isFunded: f.isFunded, funders: f.isFunded === 'Yes' ? (f.funders || []) : [] } })
  }

  const handleValuesChange = (changed) => {
    const answer = changed?.funding?.isFunded
    if (answer === 'No') form.setFieldValue(['funding', 'funders'], [])
    if (answer === 'Yes' && !(form.getFieldValue(['funding', 'funders']) || []).length) form.setFieldValue(['funding', 'funders'], [newFunder()])
    send()
  }

  return (
    <div>
      <p className="step-title">Funding information</p>
      <p className="step-description">
        Funding information is mandatory. Please tell us whether this dataset was funded and, if so, by whom.
      </p>

      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        <Form.Item
          name={['funding', 'isFunded']}
          label="Was the work behind this dataset funded?"
          rules={[{ required: true, message: 'Please answer yes or no.' }]}
        >
          <Radio.Group>
            <Radio value="Yes">Yes</Radio>
            <Radio value="No">No</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(a, b) => a?.funding?.isFunded !== b?.funding?.isFunded}>
          {({ getFieldValue }) => getFieldValue(['funding', 'isFunded']) === 'Yes' && (
            <Form.List name={['funding', 'funders']}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: '16px 20px', marginBottom: 16, background: '#fafafa' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span className="step-subtitle">Funder {index + 1}</span>
                        {fields.length > 1 && (
                          <Button type="text" danger onClick={() => { remove(field.name); setTimeout(send, 0) }} className="remove-text-btn">
                            Remove
                          </Button>
                        )}
                      </div>

                      <Form.Item
                        label="Funder name"
                        name={[field.name, 'funderName']}
                        rules={[{ required: true, whitespace: true, message: 'Please enter the name of the funder.' }]}
                        extra="Please state the full name of the funder (no abbreviations)."
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder="e.g. European Research Council" />
                      </Form.Item>

                      <Form.Item
                        label="Grant ID / Award number (optional)"
                        name={[field.name, 'grantId']}
                        extra="Optional. If the funding has a grant ID or award number, please state it."
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="e.g. ERC-2021-STG-123456" />
                      </Form.Item>
                    </div>
                  ))}

                  <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <Button
                      type="dashed"
                      onClick={() => { add(newFunder()); setTimeout(send, 0) }}
                      style={{ width: '30%' }}
                      className="add-contributor-button"
                    >
                      Add another funder
                    </Button>
                  </div>
                </>
              )}
            </Form.List>
          )}
        </Form.Item>
      </Form>
    </div>
  )
}
