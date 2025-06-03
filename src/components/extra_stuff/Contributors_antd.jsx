import React, { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Space, Button } from 'antd'
import ConfigProvider from './ConfigProvider'

const { Option } = Select

export default function ContributorsAntd({ onChange, data }) {
    const [consortium, setConsortium] = useState([])
    const [contributors, setContributors] = useState([])
    const [isNewChecked, setNewIsChecked] = useState(false)
    const [form] = Form.useForm()
    const formSchema = [
        { name: 'Consortium', label: 'Consortium: ', type: 'dropdown' },
        { name: 'Contributors', label: 'Select a person from the EBRAINS Knowledge Graph: ', type: 'dropdown' }]
    const additionalFields = [
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' }]

  const [formFields, setFormFields] = useState([{ name: 'Contributors', label: 'Select a person from the EBRAINS Knowledge Graph: ', type: 'dropdown' }]);
  const handleAddField = () => {
    setFormFields([...formFields, { name: 'Contributors', label: 'Select a person from the EBRAINS Knowledge Graph: ', type: 'dropdown' }])}
  const handleRemoveField = (index) => {
    const newFields = formFields.filter((_, i) => i !== index);
    setFormFields(newFields)}


    useEffect(() => {
        form.setFieldsValue(data)}, [data, form])

    useEffect(() => {
        const fetchDropdownOptions = async () => {
            try {const response = await fetch('api/kginfo/consortium')
                if (!response.ok) {
                    throw new Error(`Error fetching consortium: ${response.status}`)}
                const data = await response.json()
                setConsortium(data.consortium)
            } catch (error) {console.error('Error fetching consortiums:', error)}}
        const fetchContributors = async () => {
            try {const response = await fetch('api/kginfo/contributorsfile')
                if (!response.ok) {
                    throw new Error(`Error fetching contributors: ${response.status}`)}
                const data = await response.json()
                setContributors(data.person)
            } catch (error) {console.error('Error fetching contributors:', error)}}
        fetchDropdownOptions()
        fetchContributors()
    }, [])

    const handleNewPersonCheck = () => {
        setNewIsChecked(prevState => !prevState)}

    const onFinish = (values) => {
        onChange(values)}    
    const handleValuesChange = (changedValues, allValues) => {
        //console.log('Changed Values:', changedValues)
        //console.log('All Values:', allValues)
        onChange(allValues)}

    return (
        <div>
            <p className="step-title">Contributors</p>
            <ConfigProvider>
                <Form
                    form={form}
                    name="ContributorsForm"
                    onValuesChange={handleValuesChange}
                    onFinish={onFinish}
                    layout="vertical">
                    <Space direction="vertical">
                    <Form.Item>
                        <Checkbox checked={isNewChecked} onChange={handleNewPersonCheck}>
                            This person is not on EBRAINS knowledge graph
                        </Checkbox>
                    </Form.Item>
                    <Form.Item>
                        <button type="button" onClick={handleAddField}>
                            Add Field
                        </button>
                    </Form.Item>
                    {isNewChecked && (
                        <div>
                            <p className="step-title">Add contributors:</p>
                            {additionalFields.map(field => (
                                <Form.Item
                                    key={field.name}
                                    label={field.label}
                                    name={field.name}
                                    rules={[{ required: true, message: `Please enter ${field.label.toLowerCase()}!` }]}>
                                    <Input />
                                </Form.Item>))}
                        </div>)}
                    {formFields.map(field => {
                        if (field.type === 'dropdown') {
                            const options = field.name === 'Contributors' ? contributors : consortium;
                            return (
                                <Form.Item
                                    key={field.name}
                                    label={field.label}
                                    name={field.name}
                                    rules={[{ required: true, message: `Please select a ${field.label.toLowerCase()}!` }]}>
                                    <Select style={{ minWidth: 240 }}
                                    showSearch 
                                    filterOption={(input, option) => 
                                        option.children.toLowerCase().includes(input.toLowerCase())}>
                                        {options.map(option => (
                                            <Option key={option.identifier} value={option.identifier}>
                                                {option.fullName || `${option.familyName} ${option.givenName}`}
                                            </Option>))}
                                    </Select>
                                </Form.Item>)}
                        return (
                            <Form.Item
                                key={field.name}
                                label={field.label}
                                name={field.name}
                                rules={[{ required: true, message: `Please input your ${field.label.toLowerCase()}!` }]} >
                                <Input />
                            </Form.Item>)})}
                    </Space>
                </Form>
            </ConfigProvider>
        </div>
    );
}