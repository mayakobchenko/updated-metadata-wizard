import { Form as AntForm, Input, Space, Row, Col, Button } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons' //CloseOutlined
import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'

export default function Dataset2({ form, onChange, data }) {

  const initialValues = {
    dataset2: {
      Data2UrlDoiRepo: data.dataset2?.Data2UrlDoiRepo || '',
      Data2DoiJournal: data.dataset2?.Data2DoiJournal || '',
      homePage: data.dataset2?.homePage || '',
      inputdata: data.dataset2.inputdata || '',
      supportChannels: data.dataset2?.supportChannels || [],
    }}  

  const [channelFields, setChannelFields] = useState([
    data.dataset2?.supportChannels?.map((channel) => ({
    idChannel: channel.idChannel,
    value: channel.value || '',
  })) || []
  ])

  const handleValuesChange = (changedValues, allValues) => {
    console.log('Changed Values:', changedValues)
    console.log('All Values:', allValues)
    /*if (changedValues.isConfirmed !== undefined) {
      allValues.isConfirmed = changedValues.isConfirmed}*/
   onChange(allValues)}

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
            label="Has your data already been published anywhere else?"
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
        <AntForm.Item
          label="Input data"
          name={['dataset2', 'inputdata']} 
          extra="Add the data that was used as input for this dataset version. This is typically
          a DOI or reference to the original dataset from which the current dataset is derived (if applicable).">
          <Input />
        </AntForm.Item>
      </AntForm>

      <br />
 {/*https://ant.design/components/form  style={{ width: '60%' }}*/}

      <AntForm 
        form={form}
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
        layout="horizontal">

        <AntForm.List name="supportChannels">
                  {(fields, { add, remove }, { errors }) => (
                    <>{fields.map((field, index) => (
                        <AntForm.Item
                          label={index === 0 ? 'Support Channels' : ''}
                          required={false}
                          key={field.key}>
                          <AntForm.Item
                            {...field}
                            validateTrigger={['onChange', 'onBlur']}
                            rules={[
                              {required: true,
                                whitespace: true,
                                message: "Please input support channel or delete this field."}]}
                            noStyle>
                            <Input placeholder="link to support channel" style={{ width: '80%' }} />
                          </AntForm.Item>
                          {fields.length > 1 ? (
                            <MinusCircleOutlined
                              className="dynamic-delete-button"
                              onClick={() => remove(field.name)}/>
                          ) : null}
                        </AntForm.Item>
                      ))}
                      <AntForm.Item>
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          style={{ width: '20%' }}
                          icon={<PlusOutlined />}>
                          Add channel
                        </Button>
                        <Button
                          type="dashed"
                          onClick={() => {
                            add('The head item', 0);
                          }}
                          style={{ width: '60%', marginTop: '20px' }}
                          icon={<PlusOutlined />}
                        >
                          Add field at head
                        </Button>
                        <AntForm.ErrorList errors={errors} />
                      </AntForm.Item>
                    </>
                  )}
        </AntForm.List>
      </AntForm>

      <br />

      <AntForm
      form={form}
      initialValues={initialValues}
      onValuesChange={handleValuesChange}>

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
            <a href="https://www.doi.org/the-identifier/resources/handbook/" 
            target="_blank" rel="noopener noreferrer"> https://doi.org/10.1000/182</a>
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