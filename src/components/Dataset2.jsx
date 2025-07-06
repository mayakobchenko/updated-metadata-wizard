import { Form as AntForm, Input, Space, Row, Col, Button } from 'antd'
import { useState, useEffect } from 'react'

export default function Dataset2({ form, onChange, data }) {

  const initialValues = {
    dataset2: {
      Data2UrlDoiRepo: data.dataset2?.Data2UrlDoiRepo || '',
      Data2DoiJournal: data.dataset2?.Data2DoiJournal || '',
    }}  //fetched from nettskjema answers are not shown if empty

  //const handleValuesChange = (changedValues, allValues) => {onChange(allValues)}

  const [acticleFields, setArticleFields] = useState([{ idArticle: Date.now() }])
  //const [channelFields, setChannelFields] = useState([{ idChannel: Date.now() }])
  const [channelFields, setChannelFields] = useState([{ idChannel: Date.now(), value: '' }])

  useEffect(() => {
    if (data.supportChannels) {
      setChannelFields(data.supportChannels.map((channel, index) => ({
        idChannel: channel.idChannel || Date.now() + index,
        value: channel.value || '',
      })))}
  }, [data.supportChannels])

  /*const handleAddChannel = () => {
    setChannelFields([...channelFields, { idChannel: Date.now() }])}
  const handleRemoveChannel = ({idChannel}) => {
    const newFields = channelFields.filter(field => field.idChannel !== idChannel)
    setChannelFields(newFields)} */

  const handleAddChannel = () => {
    setChannelFields([...channelFields, { idChannel: Date.now(), value: '' }])}

  const handleRemoveChannel = ({idChannel}) => {
    setChannelFields(channelFields.filter(field => field.idChannel !== idChannel))}

  const handleChannelChange = (index, value) => {
    const newChannels = [...channelFields]
    newChannels[index].value = value
    setChannelFields(newChannels)
    onChange({ supportChannels: newChannels })}

  return (
    <div>
      <div><p className="step-title">Dataset part 2</p></div>
      <AntForm
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={(changedValues) => onChange(changedValues)}>
        { data.dataset2?.Data2UrlDoiRepo ?
          (<AntForm.Item
            label="Has your data already been published elsewhere else?"
            name={['dataset2', 'Data2UrlDoiRepo']} 
            extra="Please state the DOI(s) or URL(s) to the data repository">
            <Input />
           </AntForm.Item> ) : null}  
        <AntForm.Item
          label="Home Page"
          name={['dataset2', 'homePage']} 
          rules={[{ required: false }]}
          extra="Add the URL to the homepage describing this dataset (if applicable)">
          <Input />
        </AntForm.Item>
        <Space direction="vertical" style={{ width: '100%' }} >
          {channelFields.map(({ idChannel, value }, index) => (
            <div key={idChannel}>{<Row gutter={16} align="middle" style={{ width: '100%' }}>
              <Col flex="1 1 0">
                  <AntForm.Item
                      label="Support channel"
                      name={`['dataset2', 'supportChannel_${idChannel}']`}
                      extra="Enter all channels through which a user can receive support for handling
                      this research product (if applicable). This could for example be a link to a website
                      or a contact email address."
                      >
                      <Input value={value}
                        onChange={(e) => handleChannelChange(index, e.target.value)}/>
                  </AntForm.Item>
              </Col>
              <Col>
                  <Button type="primary" 
                          size="small" 
                          onClick={() => handleRemoveChannel({idChannel})}>
                  Remove Channel</Button>
              </Col></Row>}
            </div>))}
            <AntForm.Item>
                <Button type="primary" size="small" onClick={handleAddChannel}>Add Channel</Button>
            </AntForm.Item>
        </Space>
        <AntForm.Item
          label="Input data"
          name={['dataset2', 'inputdata']} 
          rules={[{ required: false }]}
          extra="Add the data that was used as input for this dataset version. This is typically
          a DOI or reference to the original dataset from which the current dataset is derived (if applicable).">
          <Input />
        </AntForm.Item>
        { data.dataset2?.Data2DoiJournal ? (
          <AntForm.Item
            label="Has your data already been described in a journal article?"
            name={['dataset2', 'Data2DoiJournal']} 
            rules={[{ required: false }]}
            extra="Please state the DOI(s) of the journal article(s)">
            <Input />
          </AntForm.Item>
        ) : null}
        <AntForm.Item
          label="Related Publications"
          name={['dataset2', 'publications']} 
          rules={[{ required: false }]}
          extra={<>Please list DOIs of all related publications that report on the dataset itself or on analysis
            based on the data. The DOI should be in the following format: 
            <p><a href="https://www.doi.org/the-identifier/resources/handbook/" target="_blank" rel="noopener noreferrer"> https://doi.org/10.1000/182</a></p>
          </>}>
          <Input />
        </AntForm.Item>

      </AntForm>
    </div>
  );
}

//https://www.doi.org/the-identifier/resources/handbook/

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