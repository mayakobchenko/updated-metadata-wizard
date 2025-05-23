import React from 'react'
import { Form as AntForm, Input, Button, Space } from 'antd'
import ConfigProvider from './ConfigProvider'
import {  useAuthContext } from './context/AuthProviderContext'

export default function Introduction() {
  const userInfo = useAuthContext();
  const firstName = userInfo?.user?.fullname;  //fullname from getuserKG   given_name from getUser
  const familyName = userInfo?.user?.fullname;  //family_name
  const emailUser = userInfo?.user?.email;
  const ticketnum = userInfo?.ticket;

  const initialValues = {
    contactperson: {
      firstName: firstName || '',
      familyName: familyName || '',
      email: emailUser
    },
    ticketNumber: ticketnum || ''
  };

  const handleSubmit = (values) => {
    console.log('Submit button pushed: ', values);
  };

  return (
    <ConfigProvider>
      <div>
        <p>Contact person</p>
      </div>
      <AntForm
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit} // Use onFinish for Ant Design forms
      >
        <AntForm.Item
          label="First Name"
          name={['contactperson', 'firstName']} // Nested names for contactperson
          rules={[{ required: true, message: 'Please input your full name!' }]}
        >
          <Input />
        </AntForm.Item>

        <AntForm.Item
          label="Family Name"
          name={['contactperson', 'familyName']} // Nested names for contactperson
          rules={[{ required: true, message: 'Please input your full name!' }]}
        >
          <Input />
        </AntForm.Item>

        <AntForm.Item
          label="Email"
          name={['contactperson', 'email']}
          rules={[{ required: true, message: 'Please input your email!' }]}
        >
          <Input />
        </AntForm.Item>

        <AntForm.Item
          label="Ticket Number"
          name="ticketNumber"
          rules={[{ required: true, message: 'Please input your ticket number!' }]}
        >
          <Input />
        </AntForm.Item>
        
        {/* Add additional form fields as necessary */}

        <Space>
          <Button type="primary" htmlType="submit">
            Submit Customized
          </Button>
          <Button type="button" onClick={() => console.log('Cancel')}>
            Cancel
          </Button>
        </Space>
      </AntForm>
    </ConfigProvider>
  );
}
