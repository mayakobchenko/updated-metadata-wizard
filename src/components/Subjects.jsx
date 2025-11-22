import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Button } from 'antd'

const { Option } = Select

export default function Subjects ({ form, onChange, data = {} }) {
    const [agecategory, setAgeCat] = useState([])
    const [biosex, setBiosex] = useState([])
    const [handedness, setHandedness] = useState([])
    const [species, setSpecies] = useState([])
    const [subjectsData, setSubjectData] = useState(data.subjectMetadata?.subjects || [])
    const initialValues = { subjectMetadata: { subjects: subjectsData } }

    useEffect(() => {
      setSubjectData(data.subjectMetadata?.subjects || [])
    }, [data])

    useEffect(() => {
        const fetchBioSex = async () => {
            try {const url = 'api/subjects/sex'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about bio sex from backend: ${response.status}`)}
                const data = await response.json()
                setBiosex(data.biosex)
                } catch (error) {console.error('Error fetching info from backend:', error)}}
        const fetchAgeCat = async () => {
            try {const url = 'api/subjects/agecategory'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about age categories from backend: ${response.status}`)}
                const data = await response.json()
                setAgeCat(data.age_cat)
            } catch (error) { console.error('Error fetching age categories from backend:', error) }}
        const fetchHandedness = async () => {
            try {const url = 'api/subjects/handedness'
                const response = await fetch(url)
                //console.log(response)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about handedness from backend: ${response.status}`)}
                const data = await response.json()
                //console.log(data)
                setHandedness(data.handedness)
            } catch (error) { console.error('Error fetching handedness from backend:', error) }}
        const fetchSpecies = async () => {
            try {const url = 'api/subjects/species'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about species from backend: ${response.status}`)}
                const data = await response.json()
                setSpecies(data.species)
                } catch (error) {console.error('Error fetching species from backend:', error)}}
        fetchBioSex()
        fetchAgeCat()
        fetchHandedness()
        fetchSpecies()
    }, [])

    const addNewSubject = () => {
        const newField = {
            id: Date.now(),
            subjectID: '',
            age: '',
            weight: '',
            ageCategory: '',
            bioSex: '',
            disease: '',
            handedness: '',
            species: '',
            strain: ''}
        const updated = [...subjectsData, newField]
        setSubjectData(updated)
          onChange({
        subjectMetadata: {
        ...data.subjectMetadata,
        subjects: updated
        }
  })}

    const removeNewSubject = (index) => {
        const updated = subjectsData.filter((_, i) => i !== index)
        setSubjectData(updated)
        onChange({
            subjectMetadata: {
            ...data.subjectMetadata,
            subjects: updated
            }})}

    const handleSubjectChange = (index, field, value) => {
        const updated = [...subjectsData]
        updated[index] = { ...updated[index], [field]: value }
        setSubjectData(updated)
        onChange({
            subjectMetadata: {
            ...data.subjectMetadata,
            subjects: updated
            }
        })
    }
    
    const handleValuesChange = (changedValues) => {
        if (changedValues.subjectMetadata) {
        onChange({
        subjectMetadata: {
            ...data.subjectMetadata,
            ...changedValues.subjectMetadata,
            subjects: changedValues.subjectMetadata?.subjects ?? subjectsData
        }
        })
            }
    }
    
    //Consider switching to Form's onFinish for submission and validation
    const handleSubmit = (event) => {
        event.preventDefault()
        const formElements = event.target.elements
        const formValues = Array.from(formElements).reduce((acc, element) => {
            if (element.name) {acc[element.name] = element.value}
            return acc}, {})
        console.log('Form Values:', formValues)}

    
    return (
        <div>
            <p className="step-title">Subjects</p>
            <Form form={form} layout="vertical"
                initialValues={initialValues}
                onValuesChange={handleValuesChange}
                onSubmit={handleSubmit}>
                
            {subjectsData.map((field, index) => (
            <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
               
                    <Form.Item label={<span className="step-subtitle">Subject {index + 1}, id:</span>} required>
                        <Input value={field.subjectID} onChange={(e) => handleSubjectChange(index, 'subjectID', e.target.value)} placeholder="Enter subject id" />
                    </Form.Item>
                        
                    <Form.Item label="Biological sex" required>
                        <Select
                            showSearch
                            style={{ minWidth: 240 }}
                            value={field.bioSex}
                            onChange={(value) => handleSubjectChange(index, 'bioSex', value)}
                            placeholder="Select sex">
                            {biosex.map((option) => (
                                <Option key={option.identifier} value={option.identifier}>
                                    {option.name}
                                </Option>))}
                        </Select>
                    </Form.Item>    
                    <Form.Item label="Select age category" required>
                        <Select
                            showSearch
                            style={{ minWidth: 240 }}
                            value={field.ageCategory}
                            onChange={(value) => handleSubjectChange(index, 'ageCategory', value)}
                            placeholder="Select age category"
                            filterOption={(input, option) => {
                                if (!option) return false
                                return option.children.toLowerCase().includes(input.toLowerCase())}}>
                            {agecategory.map((option) => (
                                <Option key={option.identifier} value={option.identifier}>
                                    {option.name}
                                </Option>))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Species" required>
                        <Select
                            showSearch
                            style={{ minWidth: 240 }}
                            value={field.species}
                            onChange={(value) => handleSubjectChange(index, 'species', value)}
                            placeholder="Select species">
                            {species.map((option) => (
                                <Option key={option.identifier} value={option.identifier}>
                                    {option.name}
                                </Option>))}
                        </Select>
                    </Form.Item>  
                             
                    <Button type="danger" size="small" onClick={() => removeNewSubject(index)} style={{ marginLeft: 0, flex: '0 0 auto' }}>
                        Remove
                    </Button>
                </div> ))}
                
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }} className="add-contributor-button">
                    Add new subject
                </Button>
            </div>              
            </Form>
        </div>
    )
}