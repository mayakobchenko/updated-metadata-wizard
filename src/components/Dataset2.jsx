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
    const newField = { id: Date.now(), newChannel: '' }
    const updated = [...supportChannels, newField]
    setSupportChannels(updated)
    onChange({
      dataset2: {...data.dataset2, supportChannels: updated} })
  }
  const addRelatedPublication = () => {
    const newPubl = { publ_id: Date.now(), newPublication: '' }
    const updated_publ = [...relatedPublications, newPubl]
    setRelatedPublications(updated_publ)
    onChange({
      dataset2: {...data.dataset2, relatedPublications: updated_publ}})
  }
  const removeSupportChannel = (index) => {
    const updated = supportChannels.filter((_, i) => i !== index)
    setSupportChannels(updated)
    onChange({
      dataset2: {...data.dataset2, supportChannels: updated}})
  }
  const removeRelatedPublication = (index) => {
    const updated = relatedPublications.filter((_, i) => i !== index)
    setRelatedPublications(updated)
    onChange({
      dataset2: {...data.dataset2, relatedPublications: updated}})
  }
  const handleSupportChannelChange = (index, field, value) => {
    const updated = [...supportChannels]
    updated[index] = { ...updated[index], [field]: value }
    setSupportChannels(updated)
    onChange({
      dataset2: {...data.dataset2, supportChannels: updated}})
  }
  const handleRelatedPublicationChange = (index, field, value) => {
    const updated = [...relatedPublications]
    updated[index] = { ...updated[index], [field]: value }
    setRelatedPublications(updated)
    onChange({
      dataset2: {...data.dataset2, relatedPublications: updated}})
  }
  const handleValuesChange = (changedValues) => {
    if (changedValues.dataset2) {
      onChange({
        dataset2: {
          ...data.dataset2,
          ...changedValues.dataset2,
          supportChannels: changedValues.dataset2.supportChannels ?? supportChannels,
          relatedPublications: changedValues.dataset2.relatedPublications ?? relatedPublications
        }
      })
    }
  }

  return (
    <div>
      <p className="step-title">About your dataset Part 2</p>
      <p className="step-description">Please provide some general information about your dataset below.</p>

      <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={handleValuesChange}>
        <Form.Item
          label="Home Page"
          name={['dataset2', 'homePage']} 
          extra="Add the URL to the homepage describing this dataset (if applicable)">
          <Input />
        </Form.Item>
        { data.dataset2?.Data2UrlDoiRepo ?
          (<Form.Item
            label="Has your data already been published anywhere else?"
            name={['dataset2', 'Data2UrlDoiRepo']} 
            extra="Please state the DOI(s) or URL(s) to the data repository">
            <Input />
           </Form.Item> ) : null} 
        <p className="step-title">Support channel</p>
        <p className="step-description">
          Enter all channels through which a user can receive support for handling this research product (if applicable).
          This could for example be a link to a website or a contact email address.
        </p>
        {supportChannels.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item label={<span className="step-subtitle">Support channel {index + 1}</span>}>
                <Input value={field.newChannel} onChange={(e) => handleSupportChannelChange(index, 'newChannel', e.target.value)} placeholder="Enter support channle" />
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
        <Form.Item
          label="Input data"
          name={['dataset2', 'inputdata']} 
          extra="Add the data that was used as input for this dataset version. This is typically
          a DOI or reference to the original dataset from which the current dataset is derived (if applicable).">
          <Input />
        </Form.Item>
        { data.dataset2?.Data2DoiJournal ? (
          <Form.Item
            label="Has your data already been described in a journal article?"
            name={['dataset2', 'Data2DoiJournal']} 
            extra="Please state the DOI(s) of the journal article(s)">
            <Input />
          </Form.Item>
        ) : null}
        <p className="step-title">Related publications</p>
        <p className="step-description">
          Please list DOIs of all related publications that report on the dataset itself or on analysis based on the data.
          The DOI should be in the following format: https://doi.org/[DOI], for example https://doi.org/10.1000/182
        </p>

        {relatedPublications.map((field, index) => (
          <div key={field.publ_id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item label={<span className="step-subtitle">Related publication {index + 1}</span>}>        
                <Input value={field.newPublication} onChange={(e) => handleRelatedPublicationChange(index, 'newPublication', e.target.value)} placeholder="Enter related publications" />
              </Form.Item>
            </div>
            <Button type="danger" size="small" onClick={() => removeRelatedPublication(index)} style={{ marginLeft: 0, flex: '0 0 auto' }}>
              Remove
            </Button>
          </div>
        ))}
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button type="dashed" onClick={addRelatedPublication} style={{ width: '30%' }} className="add-contributor-button">
            Add related publications
          </Button>
        </div>

      </Form>
    </div>
)}