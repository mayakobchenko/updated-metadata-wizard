import React from 'react'
import { Form as AntForm, Input, Button, Space } from 'antd'
import ConfigProvider from './ConfigProvider'
import { useAuthContext } from './context/AuthProviderContext'
//import { useAuth } from "./context/useAuth";

export default function Introduction() {
  //useAuth();
  const userInfo = useAuthContext();
  const userName = userInfo?.user?.fullname;
  const emailUser = userInfo?.user?.email;

  const initialValues = {
    contactperson: {
      firstName: userName || '',
      lastName: userName || '',
      email: emailUser
    },
    ticketNumber: ''
  };

  const handleSubmit = (values) => {
    console.log('Submit button pushed: ', values);
    // Optionally handle submission logic here
  };

  return (
    <ConfigProvider>
      <AntForm
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit} // Use onFinish for Ant Design forms
      >
        <AntForm.Item
          label="First Name"
          name={['contactperson', 'firstName']} // Nested names for contactperson
          rules={[{ required: true, message: 'Please input your first name!' }]}
        >
          <Input />
        </AntForm.Item>

        <AntForm.Item
          label="Last Name"
          name={['contactperson', 'lastName']}
          rules={[{ required: true, message: 'Please input your last name!' }]}
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
