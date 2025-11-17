import { Form, Input, Button } from 'antd'
import { useState, useEffect } from 'react'


export default function Dataset2({ form, onChange, data = {}}) {

  const [supportChannels, setSupportChannels] = useState(data.dataset2?.supportChannels || [])
  const [relatedPublications, setRelatedPublications] = useState(data.dataset2?.relatedPublications || [])

  const initialValues = {
    dataset2: {
      Data2UrlDoiRepo: data.dataset2?.Data2UrlDoiRepo || '',
      Data2DoiJournal: data.dataset2?.Data2DoiJournal || '',
      homePage: data.dataset2?.homePage || '',
      inputdata: data.dataset2.inputdata || '',
      supportChannels: supportChannels,
      relatedPublications: relatedPublications
    }}  

  useEffect(() => {
    setSupportChannels(data.dataset2?.supportChannels || [])
    setRelatedPublications(data.dataset2?.relatedPublications || [])
  }, [data])  

  const addSupportChannel = () => {
    const newField = { id: Date.now(), supportChannel: '' }
    const updated = [...supportChannels, newField]
    setSupportChannels(updated)
    onChange({
      dataset2: {
        ...data.dataset2,
        supportChannels: updated
      },
    })
  }
  const removeSupportChannel = (index) => {
    const updated = supportChannels.filter((_, i) => i !== index)
    setSupportChannels(updated)
    onChange({
      dataset2: {
        ...data.dataset2,
        supportChannels: updated
      },
    })
  }
  const handleSupportChannelChange = (index, field, value) => {
    const updated = [...supportChannels]
    updated[index] = { ...updated[index], [field]: value }
    setSupportChannels(updated)
    onChange({
      dataset2: {
        ...data.dataset2,
        supportChannels: updated
      },
    })
  }
  const handleValuesChange = (changedValues) => {
    if (changedValues.dataset2) {
      onChange({
        dataset2: {
          ...data.dataset2,
          ...changedValues.dataset2,
          supportChannels: changedValues.dataset2.supportChannels ?? supportChannels,
        },
      })
    }
  }
  return (
    <div>
      <p className="step-title">About your dataset Part 2</p>
      <p className="step-description">Please provide some general information about your dataset below.</p>

      <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={handleValuesChange}>
        <p className="step-title">Support channel</p>
        <p className="step-description">
          Enter all channels through which a user can receive support for handling this research product (if applicable).
          This could for example be a link to a website or a contact email address.
        </p>

        {supportChannels.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item label={<span className="step-subtitle">Support channel {index + 1}</span>}>
                
                <Input value={field.supportChannel} onChange={(e) => handleSupportChannelChange(index, 'supportChannel', e.target.value)} placeholder="Enter first name" />
              </Form.Item>
            </div>
            <Button type="danger" size="small" onClick={() => removeSupportChannel(index)} style={{ marginLeft: 0, flex: '0 0 auto' }}>
              Remove
            </Button>
          </div>
        ))}
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button type="dashed" onClick={addSupportChannel} style={{ width: '30%' }} className="add-contributor-button">
            Add a support channel
          </Button>
        </div>
      </Form>
    </div>
)}


/*         <AntForm.Item
          label="Support channel"
          name={['dataset2', 'supportChannel']} 
          rules={[{ required: false }]}
          extra="Enter all channels through which a user can receive support for handling
          this research product (if applicable). This could for example be a link to a website
          or a contact email address.">
          <Input />
        </AntForm.Item> */

        //name={`['dataset2', 'supportChannel_${idChannel}']`}