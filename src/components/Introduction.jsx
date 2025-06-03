import React from 'react'
import { Form as AntForm, Input, Checkbox } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

export default function Introduction({ onChange, data }) {
  const ticketString = localStorage.getItem('ticket')
  const ticketObject = JSON.parse(ticketString)
  const ticketNumber = ticketObject.number
  //userInfo?.user?.fullname
  //userInfo?.user?.email
  const userInfo = useAuthContext()
  const initialValues = {
    ticketNumber: data.ticketNumber || userInfo?.ticketNumber  || '',
    nettskjemaId: data.nettskjemaId || userInfo?.nettskjemaId  || '',
    contactperson: {
      firstName: data.contactperson?.firstName || userInfo?.nettskjemaInfo?.contactFirstName || '',
      familyName: data.contactperson?.familyName || userInfo?.nettskjemaInfo?.contactSurname || '',
      email: data.contactperson?.email || userInfo?.nettskjemaInfo?.contactEmail || ''},
    custodian: {
      firstName: data.custodian?.firstName || userInfo?.nettskjemaInfo?.custodionaFirstName || '',
      familyName: data.custodian?.familyName || userInfo?.nettskjemaInfo?.custodianSurname || '',
      email: data.custodian?.email || userInfo?.nettskjemaInfo?.custodianEmail || '',
      orcid: data.custodian?.orcid || userInfo?.nettskjemaInfo?.custodianORCID || ''},
    IntroConfirmed: data.IntroConfirmed || false} 
  const handleValuesChange = (changedValues, allValues) => {
    //console.log('Changed Values:', changedValues)
    //console.log('All Values:', allValues)
    if (changedValues.isConfirmed !== undefined) {
      allValues.isConfirmed = changedValues.isConfirmed}
   onChange(allValues)}
  const checkEmail = (rule, value, callback) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (emailPattern.test(value)) {
      return callback()}
    callback('Price enter a valid email address')}

  return (
    <ConfigProvider>
      <div>
        <p className="step-title">Contact person</p>
      </div>
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
          label="First name"
          name={['contactperson', 'firstName']} 
          rules={[{ required: true, message: 'Please input your full name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Family name"
          name={['contactperson', 'familyName']} 
          rules={[{ required: true, message: 'Please enter your family name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Email"
          name={['contactperson', 'email']}
          rules={[
            { required: true, message: 'Please enter your E-mail!' },
            { validator: checkEmail }]}>
          <Input />
        </AntForm.Item>
        <div>
          <p className="step-title">Data custodian</p>
        </div>
        <AntForm.Item
          label="Custodians first name"
          name={['custodian', 'firstName']} 
          rules={[{ required: true, message: 'Please enter custodians first name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Custodians family name"
          name={['custodian', 'familyName']} 
          rules={[{ required: true, message: 'Please enter custodians family name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Custodians email"
          name={['custodian', 'email']} 
          rules={[{ required: true, message: 'Please enter custodians email!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Custodians ORCID"
          name={['custodian', 'orcid']} 
          rules={[{ required: false}]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Nettskjema Id"
          name="nettskjemaId"
          rules={[{ required: false }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item name="IntroConfirmed" valuePropName="checked" noStyle>
          <Checkbox>
              I confirm that the information entered is correct.
          </Checkbox>
        </AntForm.Item>
      </AntForm>
    </ConfigProvider>
  );
}


/*       <AntForm.Item
          label="Nettskjema Id"
          name="nettskjemaId"
          rules={[{ required: true, message: 'Please input your nettskjema Id!' }]}>
          <Input />
        </AntForm.Item> */