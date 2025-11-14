import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Button } from 'antd'

const { Option } = Select

export default function Contributors({ form, onChange, data }) {
    const [contributors, setContributors] = useState([])
    const [typescontribution, setTypeContribution]= useState([])
    const [dynamicFields, setDynamicFields] = useState(data.authors?.dynamicFields || [])

    const initialValues = {
        authors: {
            dynamicFields: dynamicFields, 
        },
    }

    useEffect(() => {
        setDynamicFields(data.authors?.dynamicFields || [])
    }, [data])

    const fetchContributors = async () => {
        try {
            const response = await fetch('api/kginfo/contributorsfile')
            if (!response) {
                throw new Error(`Error fetching contributors: ${response.status}`)
            }
            const fetchedData = await response.json()
            setContributors(fetchedData.person)
        } catch (error) {
            console.error('Error fetching contributors:', error)
        }
    }

    const fetchTypeContribution = async () => {
        try {
            const response = await fetch('api/kginfo/typecontribution')
            if (!response) {
                throw new Error(`Error fetching contribution types: ${response.status}`)
            }
            const fetchedData = await response.json()
            setTypeContribution(fetchedData.types)
        } catch (error) {
            console.error('Error fetching contribution types:', error)
        }
    }

    useEffect(() => {
        fetchContributors()
        fetchTypeContribution()
    }, [])

    const addDynamicField = () => {
        const newField = { id: Date.now(), isCustom: false, firstName: '', lastName: '', selectedContributor: '' }
        const updatedFields = [...dynamicFields, newField]
        setDynamicFields(updatedFields)
        onChange({ authors: { ...data.authors, dynamicFields: updatedFields } })
    }

    const removeDynamicField = (index) => {
        const updatedFields = dynamicFields.filter((_, i) => i !== index)
        setDynamicFields(updatedFields)
        onChange({ authors: { ...data.authors, dynamicFields: updatedFields } })
    }

    const handleFieldChange = (index, field, value) => {
        const updatedFields = [...dynamicFields]
        updatedFields[index][field] = value
        setDynamicFields(updatedFields)
        onChange({ authors: { ...data.authors, dynamicFields: updatedFields } })
    }

    const handleValuesChange = (changedValues) => {
        onChange({ authors: { ...data.authors, ...changedValues.authors } })
    }

//not used here because ORCID is not mandatory, implement check in the final upload 
    const checkOrcid = (rule, value, callback) => {
        const orcidUrlRegex = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{4}$/
        if (orcidUrlRegex.test(value)) { return callback() }
        callback('Please provide the orchid number in this format: https://orcid.org/xxxx-xxxx-xxxx-xxxx')
    }

    return (
        <div>
            <p className="step-title">Dataset authors:</p>
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues} 
                onValuesChange={handleValuesChange}>
                <p className="step-description">Please list all authors who have contributed to the dataset, in the order you would like them to appear on the data publication.
                Please note that the list of authors may be different for this data publication as compared to a journal article based on the data</p>
                
                {dynamicFields.map((field, index) => (
                    <div key={field.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <Form.Item label={<span className="step-subtitle">Author {index + 1}</span>}>
                            <Checkbox
                                style={{ marginBottom: '10px', marginRight: '15px' }}
                                checked={field.isCustom}
                                onChange={(e) => handleFieldChange(index, 'isCustom', e.target.checked)}
                            >
                                This person is not in the EBRAINS Knowledge Graph
                            </Checkbox>
                        </Form.Item>

                        {!field.isCustom ? (
                            <Form.Item label={`Select a person from the EBRAINS Knowledge Graph`} required style={{ flex: 1 }}>
                                <Select
                                    showSearch
                                    style={{ minWidth: 240 }}
                                    value={field.selectedContributor} 
                                    onChange={(value) => handleFieldChange(index, 'selectedContributor', value)} 
                                    placeholder="Select a contributor"
                                    filterOption={(input, option) => {
                                    if (!option) return false
                                    return option.children.toLowerCase().includes(input.toLowerCase())
                                    }}>
                                    {contributors.map((option) => (
                                        <Option key={option.uuid} value={option.uuid}>
                                            {option.fullName || `${option.familyName} ${option.givenName} ${option.orcid ? `(orcid: ${option.orcid})` : ''}`}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        ) : (
                            <>
                                <Form.Item label={`First Name`} required style={{ flex: 1 }}>
                                    <Input
                                        value={field.firstName}
                                        onChange={(e) => handleFieldChange(index, 'firstName', e.target.value)}
                                        placeholder="Enter first name"
                                    />
                                </Form.Item>
                                <Form.Item label={`Last Name`} required style={{ flex: 1 }}>
                                    <Input
                                        value={field.lastName}
                                        onChange={(e) => handleFieldChange(index, 'lastName', e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                    </Form.Item>
                                <Form.Item label={`ORCID`} style={{ flex: 1 }}>
                                    <Input
                                        value={field.orcid}
                                        onChange={(e) => handleFieldChange(index, 'orcid', e.target.value)}
                                        placeholder="https://orcid.org/xxxx-xxxx-xxxx-xxxx"
                                    />
                                </Form.Item>
                            </>
                        )}
                        <Button 
                            type="danger" 
                            size="small"
                            onClick={() => removeDynamicField(index)} 
                            style={{ marginLeft: 0, flex: '0 0 auto' }}
                        >
                            Remove
                        </Button>
                    </div>
                ))}
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <Button type="dashed"
                        onClick={addDynamicField}
                        style={{ width: '30%' }}
                        className="add-contributor-button">
                        Add an Author
                    </Button>
                </div>
                <p className="step-title">Other contributors:</p>
            </Form>
        </div>
    )
}

//<Divider orientation="left">Add More Contributors</Divider>
//{option.orcid ? ` ${option.orcid}` : ''}