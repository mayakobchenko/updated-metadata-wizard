import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Button, Divider } from 'antd'

const { Option } = Select

export default function Contributors({ form, onChange, data }) {
    const [contributors, setContributors] = useState([])
    const [dynamicFields, setDynamicFields] = useState(data.contributing?.dynamicFields || [])

    const initialValues = {
        contributing: {
            dynamicFields: dynamicFields, 
        },}

    useEffect(() => {
        setDynamicFields(data.contributing?.dynamicFields || [])
    }, [data])

    const fetchContributors = async () => {
        try {
            const response = await fetch('api/kginfo/contributorsfile')
            if (!response.ok) {
                throw new Error(`Error fetching contributors: ${response.status}`)}
            const fetchedData = await response.json()
            setContributors(fetchedData.person)
        } catch (error) {
            console.error('Error fetching contributors:', error)}}

    useEffect(() => {fetchContributors()}, [])

    const addDynamicField = () => {
        const newField = { id: Date.now(), isCustom: false, firstName: '', lastName: '', selectedContributor: '' }
        const updatedFields = [...dynamicFields, newField]
        setDynamicFields(updatedFields)
        onChange({ contributing: { ...data.contributing, dynamicFields: updatedFields } })
    }

    const handleFieldChange = (index, field, value) => {
        const updatedFields = [...dynamicFields]
        updatedFields[index][field] = value
        setDynamicFields(updatedFields)
        onChange({ contributing: { ...data.contributing, dynamicFields: updatedFields } })
    }

    const handleValuesChange = (changedValues) => {
        onChange({ contributing: { ...data.contributing, ...changedValues.contributing } })
    }

    return (
        <div>
            <p className="step-title">Contributors</p>
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues} 
                onValuesChange={handleValuesChange}
            >
                {dynamicFields.map((field, index) => (
                    <div key={field.id}>
                        <Form.Item label={`Contributor ${index + 1}`}>
                            <Checkbox
                                style={{ marginBottom: '10px' }}
                                checked={field.isCustom}
                                onChange={(e) => handleFieldChange(index, 'isCustom', e.target.checked)}
                            >
                                This person is not in the EBRAINS Knowledge Graph.
                            </Checkbox>
                        </Form.Item>

                        {!field.isCustom ? (
                            <Form.Item label={`Select Contributor`} required>
                                <Select
                                    showSearch
                                    style={{ minWidth: 240 }}
                                    value={field.selectedContributor} 
                                    onChange={(value) => handleFieldChange(index, 'selectedContributor', value)} 
                                    placeholder="Select a contributor"
                                >
                                    {contributors.map((option) => (
                                        <Option key={option.identifier} value={option.identifier}>
                                            {option.fullName || `${option.familyName} ${option.givenName}`}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        ) : (
                            <>
                                <Form.Item label={`First Name`} required>
                                    <Input
                                        value={field.firstName}
                                        onChange={(e) => handleFieldChange(index, 'firstName', e.target.value)}
                                        placeholder="Enter first name"
                                    />
                                </Form.Item>
                                <Form.Item label={`Last Name`} required>
                                    <Input
                                        value={field.lastName}
                                        onChange={(e) => handleFieldChange(index, 'lastName', e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                </Form.Item>
                            </>
                        )}
                    </div>
                ))}
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <Button type="dashed" onClick={addDynamicField} style={{ width: '20%' }}>
                        Add Contributor
                    </Button>
                </div>
            </Form>
        </div>
    );
}

//                <Divider orientation="left">Add More Contributors</Divider>