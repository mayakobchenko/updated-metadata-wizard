import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Space, Button, Row, Col } from 'antd'

const { Option } = Select;

export default function ContributorsAntd({ onChange, data }) {
    const [contributors, setContributors] = useState([]);
    const [form] = Form.useForm();
    const [formFields, setFormFields] = useState([{ id: Date.now(), newPerson: false }]); // State to manage dynamic fields

    useEffect(() => {
        form.setFieldsValue(data);
    }, [data, form]);

    useEffect(() => {
        const fetchContributors = async () => {
            try {
                const response = await fetch('api/kginfo/contributorsfile')
                if (!response.ok) {
                    throw new Error(`Error fetching contributors: ${response.status}`)
                }
                const data = await response.json()
                setContributors(data.person)
            } catch (error) {
                console.error('Error fetching contributors:', error)
            }
        };
        fetchContributors()
    }, [])

    const handleAddField = () => {
        setFormFields([...formFields, { id: Date.now(), newPerson: false }])}

    const handleRemoveField = (id) => {
        const newFields = formFields.filter(field => field.id !== id)
        setFormFields(newFields)}

    const handleCheckboxChange = (id) => {
        setFormFields(formFields.map(field => 
            field.id === id ? { ...field, newPerson: !field.newPerson } : field))}

    const handleValuesChange = (changedValues, allValues) => {
        onChange(allValues)}

    return (
        <div>
            <p className="step-title">Contributors</p>
                <Form
                    form={form}
                    name="ContributorsForm"
                    onValuesChange={handleValuesChange}
                    layout="vertical">
                    <Space direction="vertical">
                        {formFields.map(({ id, newPerson }) => (
                            <div key={id}>
                                <Form.Item>
                                    <Checkbox 
                                        checked={newPerson} 
                                        onChange={() => handleCheckboxChange(id)}>
                                        This person is not on EBRAINS knowledge graph
                                    </Checkbox>
                                </Form.Item>
                                {newPerson ? (
                                    <div>
                                        <p className="step-title">Add contributors:</p>
                                        <Form.Item
                                            label="First Name"
                                            name={`firstName_${id}`} // Unique name for each field
                                            rules={[{ required: true, message: 'Please enter first name!' }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item
                                            label="Last Name"
                                            name={`lastName_${id}`} // Unique name for each field
                                            rules={[{ required: true, message: 'Please enter last name!' }]}>
                                            <Input />
                                        </Form.Item>
                                    </div>
                                ) : (
                                    <Row gutter={16} align="middle">
                                        <Col flex="auto">
                                            <Form.Item
                                                label={`Select a person from the EBRAINS Knowledge Graph`}
                                                name={`Contributors_${id}`} // Unique name for each dropdown
                                                rules={[{ required: true, message: `Please select a contributor!` }]}>
                                                <Select
                                                    style={{ minWidth: 240 }}
                                                    showSearch
                                                    filterOption={(input, option) =>
                                                        option.children.toLowerCase().includes(input.toLowerCase())}>
                                                    {contributors.map(option => (
                                                        <Option key={option.identifier} value={option.identifier}>
                                                            {option.fullName || `${option.familyName} ${option.givenName}`}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col>
                                            <Button type="primary" size="small" onClick={() => handleRemoveField(id)}>
                                                Remove
                                            </Button>
                                        </Col>
                                    </Row>
                                )}
                            </div>
                        ))}
                        <Form.Item>
                            <Button type="primary" size="small" onClick={handleAddField}>
                                Add
                            </Button>
                        </Form.Item>
                    </Space>
                </Form>
        </div>
    );
}
