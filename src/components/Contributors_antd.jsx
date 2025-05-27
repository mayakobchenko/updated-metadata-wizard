import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Checkbox, Space } from 'antd'; // Import Space from Ant Design
import ConfigProvider from './ConfigProvider'

const { Option } = Select

export default function ContributorsAntd() {
    const [consortium, setConsortium] = useState([]);
    const [contributors, setContributors] = useState([]);
    const [isNewChecked, setNewIsChecked] = useState(false);

    const formSchema = [
        { name: 'Consortium', label: 'Consortium: ', type: 'dropdown' },
        { name: 'Contributors', label: 'Select a person from the EBRAINS Knowledge Graph: ', type: 'dropdown' }
    ];

    const additionalFields = [
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' }
    ];

    useEffect(() => {
        const fetchDropdownOptions = async () => {
            try {
                const response = await fetch('api/kginfo/consortium');
                if (!response.ok) {
                    throw new Error(`Error fetching consortium: ${response.status}`);
                }
                const data = await response.json();
                setConsortium(data.consortium);
            } catch (error) {
                console.error('Error fetching consortiums:', error);
            }
        };

        const fetchContributors = async () => {
            try {
                const response = await fetch('api/kginfo/contributorsfile');
                if (!response.ok) {
                    throw new Error(`Error fetching contributors: ${response.status}`);
                }
                const data = await response.json();
                setContributors(data.person);
            } catch (error) {
                console.error('Error fetching contributors:', error);
            }
        };

        fetchDropdownOptions();
        fetchContributors();
    }, []);

    const handleSubmit = (values) => {
        console.log('Form Values:', values);
    };

    const handleNewPersonCheck = () => {
        setNewIsChecked(prevState => !prevState);
    };

    return (
        <div>
            <h3>Step 5: Imported Contributors</h3>
            <ConfigProvider>
                <Form
                    name="ContributorsForm"
                    onFinish={handleSubmit}
                    layout="vertical"
                >
                    <Space direction="vertical">
                        <Checkbox checked={isNewChecked} onChange={handleNewPersonCheck}>
                            This person is not on EBRAINS knowledge graph
                        </Checkbox>

                        {isNewChecked && (
                            <div>
                                <h3>Additional Form</h3>
                                {additionalFields.map(field => (
                                    <Form.Item
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        rules={[{ required: true, message: `Please input ${field.label.toLowerCase()}!` }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                ))}
                            </div>
                        )}

                        {formSchema.map(field => {
                            if (field.type === 'dropdown') {
                                const options = field.name === 'Contributors' ? contributors : consortium;

                                return (
                                    <Form.Item
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        rules={[{ required: true, message: `Please select a ${field.label.toLowerCase()}!` }]}
                                    >
                                        <Select style={{ minWidth: 240 }}
                                        showSearch 
                                        filterOption={(input, option) => 
                                            option.children.toLowerCase().includes(input.toLowerCase())}>
                                            {options.map(option => (
                                                <Option key={option.identifier} value={option.identifier}>
                                                    {option.fullName || `${option.familyName} ${option.givenName}`}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                );
                            }

                            // Handle text fields
                            return (
                                <Form.Item
                                    key={field.name}
                                    label={field.label}
                                    name={field.name}
                                    rules={[{ required: true, message: `Please input your ${field.label.toLowerCase()}!` }]}
                                >
                                    <Input />
                                </Form.Item>
                            );
                        })}

                    </Space>
                </Form>
            </ConfigProvider>
        </div>
    );
}
