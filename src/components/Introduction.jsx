import React from 'react'
import { Form as AntForm, Input } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

export default function Introduction({ onChange, data }) {
  //const ticketString = localStorage.getItem('ticket')
  //const ticketObject = JSON.parse(ticketString)
  //const ticketNumber = ticketObject.number
  //userInfo?.user?.fullname
  //userInfo?.user?.email

  const userInfo = useAuthContext()
  const initialValues = {
    contactperson: {
      firstName: data.contactperson?.firstName || userInfo?.nettskjemaInfo?.contactFirstName || '',
      familyName: data.contactperson?.familyName || userInfo?.nettskjemaInfo?.contactSurname || '',
      email: data.contactperson?.email || userInfo?.nettskjemaInfo?.contactEmail || ''},
    ticketNumber: data.ticketNumber || userInfo?.ticketNumber  || '',
    nettskjemaId: data.nettskjemaId || userInfo?.nettskjemaId  || ''}

    //Ant Design Event Mechanism to keep track of changes
  const handleValuesChange = (changedValues, allValues) => {
    console.log('Changed Values:', changedValues);
    console.log('All Values:', allValues);
   onChange(allValues)
  }

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
          label="First Name"
          name={['contactperson', 'firstName']} 
          rules={[{ required: true, message: 'Please input your full name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Family Name"
          name={['contactperson', 'familyName']} 
          rules={[{ required: true, message: 'Please input your full name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Email"
          name={['contactperson', 'email']}
          rules={[
            { required: true, message: 'Please input your E-mail!' },
            { validator: checkEmail }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Nettskjema Id"
          name="nettskjemaId"
          rules={[{ required: true, message: 'Please input your nettskjema Id!' }]}>
          <Input />
        </AntForm.Item>
      </AntForm>
    </ConfigProvider>
  );
}
