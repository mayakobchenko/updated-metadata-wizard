import React from 'react'
import { Form as AntForm, Input } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

export default function Introduction({ onChange, data }) {
  const ticketString = localStorage.getItem('ticket')
  const ticketObject = JSON.parse(ticketString)
  const ticketNumber = ticketObject.number
  
  const userInfo = useAuthContext()
  const initialValues = {
    contactperson: {
      firstName: data.contactperson?.firstName || userInfo?.user?.fullname || '',
      familyName: data.contactperson?.familyName || userInfo?.user?.fullname || '',
      email: data.contactperson?.email || userInfo?.user?.email || ''},
    ticketNumber: data.ticketNumber || ticketNumber  || ''}

    //Ant Design Event Mechanism to keep track of changes
  const handleValuesChange = (changedValues, allValues) => {
    //console.log('Changed Values:', changedValues);
   // console.log('All Values:', allValues);
    onChange(allValues)
  }

  return (
    <ConfigProvider>
      <div>
        <p className="step-title">Contact person</p>
      </div>
      <AntForm
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
      >
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
          rules={[{ required: true, message: 'Please input your email!' }]}>
          <Input />
        </AntForm.Item>

        <AntForm.Item
          label="Ticket Number"
          name="ticketNumber"
          rules={[{ required: true, message: 'Please input your ticket number!' }]}>
          <Input />
        </AntForm.Item>
        
        {/* Add additional form fields as necessary */}

      </AntForm>
    </ConfigProvider>
  );
}
