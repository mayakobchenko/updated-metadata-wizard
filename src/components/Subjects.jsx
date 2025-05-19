import React from 'react'
import { useState, useEffect } from 'react'

export default function Subjects () {
    const [agecategory, setAgeCat] = useState([])
    const [biosex, setBiosex] = useState([])
    const [isNewChecked, setNewIsChecked] = useState(false)

    const formSchema = [
        { name: 'subjectName', label: 'Subject/Tissue/Sample Group ID', type: 'text' },
        { name: 'biologicalSex', label: 'Biological sex: ', type: 'dropdown' },
        { name: 'ageCategory', label: 'Age category: ', type: 'dropdown' }
    ]
    const additionalFields = [
        { name: 'extraField1', label: 'Extra Field 1', type: 'text' },
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
            } catch (error) {
                console.error('Error fetching info from backend:', error)}
            }
        const fetchAgeCat = async () => {
            try {
                const url = 'api/subjects/agecategory'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about age categories from backend: ${response.status}`)}
                const data = await response.json()
                setAgeCat(data.age_cat)
                } catch (error) {
                    console.error('Error fetching age categories from backend:', error)}
                }
            fetchBioSex()
            fetchAgeCat()
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
    const handleNewPersonCheck = () => {
        setNewIsChecked(prevState => !prevState);
    }

    return (
        <div>
            <h3>Step 7: Subjects</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={isNewChecked}
                            onChange={handleNewPersonCheck}/>
                        Add new subject 
                    </label>
                </div>
                {isNewChecked && (
                <div>
                    <h3>New subject</h3>
                    {additionalFields.map(field => (
                        <div key={field.name}>
                            <label>{field.label}</label>
                            <input type={field.type} name={field.name} />
                        </div>
                    ))}
                </div>)}
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
                <button type="submit">Submit</button>
            </form>
        </div>
    );
}