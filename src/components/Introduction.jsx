import { Form as AntForm, Input } from 'antd'
import ConfigProvider from './ConfigProvider'
//import {  useAuthContext } from './context/AuthProviderContext'

export default function Introduction({ onChange, data }) {
  //const ticketString = localStorage.getItem('ticket')
  //const ticketObject = JSON.parse(ticketString)
  //const ticketNumber = ticketObject.number
  //userInfo?.user?.fullname
  //userInfo?.user?.email

  /*const userInfo = useAuthContext()
  const initialValues = {
    ticketNumber: data.ticketNumber || userInfo?.ticketNumber  || '',
    contactperson: {
      firstName: data.contactperson?.firstName || userInfo?.nettskjemaInfo?.contactFirstName || '',
      familyName: data.contactperson?.familyName || userInfo?.nettskjemaInfo?.contactSurname || '',
      email: data.contactperson?.email || userInfo?.nettskjemaInfo?.contactEmail || ''},
    custodian: {
      firstName: data.custodian?.firstName || userInfo?.nettskjemaInfo?.custodionaFirstName || '',
      familyName: data.custodian?.familyName || userInfo?.nettskjemaInfo?.custodianSurname || '',
      email: data.custodian?.email || userInfo?.nettskjemaInfo?.custodianEmail || '',
      orcid: data.custodian?.orcid || userInfo?.nettskjemaInfo?.custodianORCID || ''},
    } */

  const initialValues = {
    ticketNumber: data.ticketNumber || '',
    contactperson: {
      firstName: data.contactperson?.firstName || '',
      familyName: data.contactperson?.familyName || '',
      email: data.contactperson?.email || ''},
    custodian: {
      firstName: data.custodian?.firstName || '',
      familyName: data.custodian?.familyName || '',
      email: data.custodian?.email || '',
      orcid: data.custodian?.orcid || ''},
    } 

  const handleValuesChange = (changedValues, allValues) => {
    //console.log('Changed Values:', changedValues)
    //console.log('All Values:', allValues)
    /*if (changedValues.isConfirmed !== undefined) {
      allValues.isConfirmed = changedValues.isConfirmed}*/
   onChange(allValues)}

  const checkEmail = (rule, value, callback) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (emailPattern.test(value)) {
      return callback()}
    callback('Price enter a valid email address')}

  return (
    <ConfigProvider>
      <div><p className="step-title">Contact person</p></div>
      <AntForm
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}>
        <AntForm.Item
          label="Ticket Number"
          name="ticketNumber"
          rules={[{ required: true, message: 'Please input your ticket number!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Contact person's first name"
          name={['contactperson', 'firstName']} 
          rules={[{ required: true, message: 'Please input your full name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Contact person's family name"
          name={['contactperson', 'familyName']} 
          rules={[{ required: true, message: 'Please enter your family name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Contact person's email"
          name={['contactperson', 'email']}
          rules={[
            { required: true, message: 'Please enter contact persons E-mail!' },
            { validator: checkEmail }]}>
          <Input />
        </AntForm.Item>
        <div>
          <p className="step-title">Data custodian</p>
        </div>
        <AntForm.Item
          label="Data custodian's first name"
          name={['custodian', 'firstName']} 
          rules={[{ required: true, message: 'Please enter custodians first name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Data custodian's family name"
          name={['custodian', 'familyName']} 
          rules={[{ required: true, message: 'Please enter custodians family name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Data custodian's email"
          name={['custodian', 'email']} 
          rules={[
            { required: true, message: 'Please enter data custodians E-mail!' },
            { validator: checkEmail }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Data custodian's ORCID"
          name={['custodian', 'orcid']} 
          rules={[{ required: false}]}>
          <Input />
        </AntForm.Item>
      </AntForm>
    </ConfigProvider>
  );
}


/*       
        <AntForm.Item name="IntroConfirmed" valuePropName="checked" noStyle>
          <Checkbox>
              I confirm that the information entered is correct.
          </Checkbox>
        </AntForm.Item>

        <AntForm.Item
          label="Nettskjema Id"
          name="nettskjemaId"
          rules={[{ required: false }]}>
          <Input />
        </AntForm.Item> */