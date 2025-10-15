import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox } from 'antd'

const { Option } = Select

export default function ContributorsAntd({ form, onChange, data }) {
    const [contributors, setContributors] = useState([])
    const [isNewPerson, setIsNewPerson] = useState(data.contributing?.isNewPerson || false)
    //const [form] = Form.useForm()
    //const [formFields, setFormFields] = useState([{ id: Date.now(), newPerson: false }]) // State to manage dynamic fields
    //useEffect(() => {form.setFieldsValue(data)}, [data, form])
    const initialValues = {
        contributing: {
           isNewPerson: data.contributing?.isNewPerson || false,
           contributorsKG: data.contributing?.contributorsKG || '',
           contributorsNewKG: {
                firstNameNewKG: data.contributing?.contributorsNewKG?.firstNameNewKG || '',
                lastNameNewKG: data.contributing?.contributorsNewKG?.lastNameNewKG || '',
           }

        }}
    
    const handleValuesChange = (changedValues, allValues) => {
        if (changedValues['contributing']?.isNewPerson!== undefined) {
            setIsNewPerson(changedValues['contributing'].isNewPerson)}
            onChange(allValues)}
    
    useEffect(() => {
        const fetchContributors = async () => {
            try {
                const response = await fetch('api/kginfo/contributorsfile')
                if (!response.ok) {
                    throw new Error(`Error fetching contributors: ${response.status}`)}
                const data = await response.json()
                setContributors(data.person)
            } catch (error) {console.error('Error fetching contributors:', error)}}
        fetchContributors()
    }, [])

    return (
        <div>
            <div><p className="step-title">Contributors</p></div>
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues}
                onValuesChange={handleValuesChange}>
                <Form.Item
                    name={['contributing', 'isNewPerson']}
                    valuePropName="checked">
                    <Checkbox style={{ padding: '20px' }} checked={isNewPerson} onChange={(e) => setIsNewPerson(e.target.checked)}>
                       This person is not in the EBRAINS Knowledge Graph.
                    </Checkbox>
                </Form.Item>
                {isNewPerson ? (
                    <div><p className="step-title">Add contributors:</p>
                        <Form.Item
                            label="First Name"
                            name={['contributing', 'contributorsNewKG', `firstNameNewKG`]} 
                            rules={[{ required: true, message: 'Please enter first name!' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label="Last Name"
                            name={['contributing', 'contributorsNewKG', `lastNameNewKG`]} 
                            rules={[{ required: true, message: 'Please enter last name!' }]}>
                            <Input />
                        </Form.Item>
                    </div>) : (
                        <Form.Item
                            label={`Select a person from the EBRAINS Knowledge Graph`}
                            name={['contributing', 'contributorsKG']} >
                            <Select
                                style={{ minWidth: 240 }}
                                showSearch
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())}>
                                {contributors.map(option => (
                                    <Option key={option.identifier} value={option.identifier}>
                                        {option.fullName || `${option.familyName} ${option.givenName}`}
                                    </Option>))}
                            </Select>
                        </Form.Item>)}
            </Form>
        </div>
    )
}
