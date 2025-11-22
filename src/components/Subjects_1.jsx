import React from 'react'
import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Button} from 'antd'

export default function Subjects ({ onChange, data }) {
    const [agecategory, setAgeCat] = useState([])
    const [biosex, setBiosex] = useState([])
    const [handedness, setHandedness] = useState([])
    const [species, setSpecies] = useState([])

    const [subjects, setSubjects] = useState(data.subjects?.subjects || [])
    const initialValues = {
        subjects: {
          subjects,
        },
    }
    useEffect(() => {
      setSubjects(data.subjects?.subjects || [])
    }, [data])

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
        const updated = [...subjects, newField]
        setSubjects(updated)
        onChange({
        subjects: {
            ...data.subjects,
                subjects: updated,
            },
        })
    }
const removeNewSubject= (index) => {
    const updated = subjects.filter((_, i) => i !== index)
    setSubjects(updated)
    onChange({
      subjects: {
        ...data.subjects, subjects: updated,
      },
    })
  }
    const formSchema = [
        { name: 'subjectName', label: 'Subject/Tissue/Sample Group ID', type: 'text' },
        { name: 'biologicalSex', label: 'Biological sex: ', type: 'dropdown' },
        { name: 'ageCategory', label: 'Age category: ', type: 'dropdown' }
    ]
    const additionalFields = [
        { name: 'Subject ID', label: 'Subject ID', type: 'text' },
        { name: 'extraField2', label: 'Extra Field 2', type: 'text' }
    ]

    useEffect(() => {
        const fetchBioSex = async () => {
            try {
                const url = 'api/subjects/sex'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about bio sex from backend: ${response.status}`)}
                const data = await response.json()
                setBiosex(data.biosex)
                } catch (error) {console.error('Error fetching info from backend:', error)}}
        const fetchAgeCat = async () => {
            try {
                const url = 'api/subjects/agecategory'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about age categories from backend: ${response.status}`)}
                const data = await response.json()
                setAgeCat(data.age_cat)
            } catch (error) { console.error('Error fetching age categories from backend:', error) }}
        const fetchHandedness = async () => {
            try {
                const url = 'api/subjects/handedness'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about handedness from backend: ${response.status}`)}
                const data = await response.json()
                setHandedness(data.handedness)
            } catch (error) { console.error('Error fetching handedness from backend:', error) }
        }
        const fetchSpecies = async () => {
            try {
                const url = 'api/subjects/species'
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

    const handleSubmit = (event) => {
        event.preventDefault()
        const formElements = event.target.elements
        const formValues = Array.from(formElements).reduce((acc, element) => {
            if (element.name) {
                acc[element.name] = element.value
            }
            return acc
        }, {})
        console.log('Form Values:', formValues)
    }

    return (
        <div>
            <p className="step-title">Subjects</p>
            <Form onSubmit={handleSubmit}>
                <div>
                    <h3>New subject</h3>
                    {additionalFields.map(field => (
                        <div key={field.name}>
                            <label>{field.label}</label>
                            <input type={field.type} name={field.name} />
                        </div>
                    ))}
                </div>

                {subjects.map((field, index) => (
                  <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                    <Form.Item label="Select" required>
                        <Select
                        showSearch
                        style={{ minWidth: 40 }}
                        value={field.ageCategory}
                        //onChange={(value) => handleContrChange(index, 'ageCategory', value)}
                        filterOption={(input, option) => {
                            if (!option) return false
                            return option.children.toLowerCase().includes(input.toLowerCase())}}>
                        {agecategory.map((option) => (
                            <Option key={option.identifier} value={option.identifier}>
                            {option.name}
                            </Option>))}
                        </Select>
                        </Form.Item>
                    </div>
                        <Button type="danger" size="small" onClick={() => removeNewSubject(index)} style={{ marginLeft: 0, flex: '0 0 auto' }}>
                        Remove
                        </Button>
                    </div>
        ))}
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }} className="add-contributor-button">
            Add a new subject
          </Button>
        </div>

                {formSchema.map(field => {
                    if (field.type === 'dropdown') {
                        if (field.name === 'biologicalSex') {
                            return (
                                <div key={field.name}>
                                    <label>{field.label}</label>
                                    <select name={field.name}>
                                        {biosex.map(entry => (
                                            <option key={entry.identifier} value={[entry.name, entry.identifier]}>
                                                {entry.name}
                                            </option>))}
                                    </select>
                                </div>)
                        } else if (field.name === 'ageCategory') {
                            return (
                                <div key={field.name}>
                                    <label>{field.label}</label>
                                    <select name={field.name}>
                                        {agecategory.map(opt => (
                                            <option key={opt.identifier} value={[opt.name, opt.identifier]}>
                                                {opt.name}
                                            </option>))}
                                    </select>
                                </div>)
                        }
                    }
                        return (
                            <div key={field.name}>
                                <label>{field.label}</label>
                                <input type={field.type} name={field.name} />
                            </div>)
                    })}
            </Form>
        </div>
    )
}