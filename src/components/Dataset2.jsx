import { Form as AntForm, Input, Space, Row, Col, Button } from 'antd'
import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'

export default function Dataset2({ form, onChange, data }) {

  const initialValues = {
    dataset2: {
      Data2UrlDoiRepo: data.dataset2?.Data2UrlDoiRepo || '',
      Data2DoiJournal: data.dataset2?.Data2DoiJournal || '',
      homePage: data.dataset2?.homePage || '',
      supportChannels: data.dataset2?.supportChannels || [],
    }}  

  const [channelFields, setChannelFields] = useState([
    data.dataset2?.supportChannels?.map((channel) => ({
    idChannel: channel.idChannel,
    value: channel.value || '',
  })) || []
  ])

 /* useEffect(() => {
    if (data.dataset2.supportChannels) {
      setChannelFields(data.dataset2.supportChannels.map((channel) => ({
        idChannel: channel.idChannel,
        value: channel.value || '',
      })))}
  }, [data.dataset2.supportChannels])*/

  /*const handleAddChannel = () => {
    setChannelFields([...channelFields, { idChannel: Date.now(), value: '' }])}*/

/*const handleAddChannel = () => {
    const newChannel = { idChannel: Date.now(), value: '' }
    const updatedChannels = [...channelFields, newChannel]
    setChannelFields(updatedChannels)
    onChange({ dataset2: { ...data.dataset2, supportChannels: updatedChannels } })
}*/

  const handleAddChannel = () => {
    const newChannel = { idChannel: uuid(), value: '' };  // Generate unique id using UUID
    const updatedChannels = [...channelFields, newChannel];
    setChannelFields(updatedChannels);
    onChange({ dataset2: { ...data.dataset2, supportChannels: updatedChannels } });
  }
  /*const handleRemoveChannel = ({idChannel}) => {
    setChannelFields(channelFields.filter(field => field.idChannel !== idChannel))}*/

  const handleRemoveChannel = ({idChannel}) => {
    const newChannels = channelFields.filter(field => field.idChannel !== idChannel)
    setChannelFields(newChannels)
    onChange({ dataset2: { ...data.dataset2, supportChannels: newChannels } });
};
 

  const handleChannelChange = (index, value) => {
    const newChannels = [...channelFields];
    newChannels[index].value = value;
    setChannelFields(newChannels);
    onChange({ dataset2: { ...data.dataset2, supportChannels: newChannels } })
  }

  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues['dataset2']?.supportChannels) {
    setChannelFields(changedValues['dataset2'].supportChannels)}
    onChange(allValues)
  }
//onChange({ dataset2: { ...data.dataset2, ...changedValues.dataset2 } }
  return (
    <div>
      <div><p className="step-title">Dataset part 2</p></div>
      <AntForm
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}>

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
          extra="Add the URL to the homepage describing this dataset (if applicable)">
          <Input />
        </AntForm.Item>

        <Space direction="vertical" style={{ width: '100%' }} >
          {channelFields.map(({ idChannel, value }, index) => (
            <div key={idChannel}>{<Row gutter={16} align="middle" style={{ width: '100%' }}>
              <Col flex="1 1 0">
                  <AntForm.Item
                      label="Support channel"
                      name={['dataset2', `supportChannel_${idChannel}`]}
                      extra="Enter all channels through which a user can receive support for handling
                      this research product (if applicable). This could for example be a link to a website
                      or a contact email address.">
                      <Input value={value}
                        onChange={(e) => handleChannelChange(index, e.target.value)}/>
                  </AntForm.Item>
              </Col>
              <Col>
                  <Button type="primary" //danger
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
          extra="Add the data that was used as input for this dataset version. This is typically
          a DOI or reference to the original dataset from which the current dataset is derived (if applicable).">
          <Input />
        </AntForm.Item>

        { data.dataset2?.Data2DoiJournal ? (
          <AntForm.Item
            label="Has your data already been described in a journal article?"
            name={['dataset2', 'Data2DoiJournal']} 
            extra="Please state the DOI(s) of the journal article(s)">
            <Input />
          </AntForm.Item>
        ) : null}

        <AntForm.Item
          label="Related Publications"
          name={['dataset2', 'publications']} 
          extra={<>Please list DOIs of all related publications that report on the dataset itself or on analysis
            based on the data. The DOI should be in the following format: 
            <p><a href="https://www.doi.org/the-identifier/resources/handbook/" 
            target="_blank" rel="noopener noreferrer"> https://doi.org/10.1000/182</a></p>
          </>}>
          <Input />
        </AntForm.Item>

      </AntForm>
    </div>
  )
}

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