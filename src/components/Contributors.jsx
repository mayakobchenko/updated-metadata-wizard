import React from 'react'
import { useState, useEffect } from 'react'
//basic react form
export default function Contributors () {
    //const [formData, setFormData] = useState(null);
    const [dropdownOptions, setDropdownOptions] = useState([])
    const [contributors, setContributors] = useState([])
    const [isNewChecked, setNewIsChecked] = useState(false)

    const formSchema = [
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' },
        { name: 'Consortium', label: 'Consortium: ', type: 'dropdown' },
        { name: 'Contributors', label: 'Select a person from the EBRAINS Knowledge Graph: ', type: 'dropdown' }
    ]
    const additionalFields = [
        { name: 'extraField1', label: 'Extra Field 1', type: 'text' },
        { name: 'extraField2', label: 'Extra Field 2', type: 'text' }
    ]
    /*const dropdownOptions = [
        { id: 1, name: 'Oscar', surname: 'Vitweis'},
        { id: 2, name: 'Harry', surname: 'Harraldson'},
        { id: 3, name: 'Tomas', surname: 'Blueberry'},
    ];*/
    useEffect(() => {
        const fetchDropdownOptions = async () => {
        try {
            const url = 'api/kginfo/consortium'
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`There is a problem fetching info about consortiums from backend: ${response.status}`)}
            const data = await response.json()
            setDropdownOptions(data.consortium)
            } catch (error) {
                console.error('Error fetching consortiums from backend:', error)}
            }
        const fetchContributors = async () => {
            try {
                const url = 'api/kginfo/contributorsfile'
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`There is a problem fetching info about consortiums from backend: ${response.status}`)}
                const data = await response.json()
                setContributors(data.person)
                } catch (error) {
                    console.error('Error fetching consortiums from backend:', error)}
                }
            fetchDropdownOptions()
            fetchContributors()
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
            <h3>Step 5: Imported Contributors</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={isNewChecked}
                            onChange={handleNewPersonCheck}/>
                        This person is not on Ebrains knowledge graph
                    </label>
                </div>
                {isNewChecked && (
                <div>
                    <h3>Additional Form</h3>
                    {additionalFields.map(field => (
                        <div key={field.name}>
                            <label>{field.label}</label>
                            <input type={field.type} name={field.name} />
                        </div>
                    ))}
                </div>)}
                {formSchema.map(field => {
                    if (field.type === 'dropdown') {
                        if (field.name === 'Contributors') {
                            return (
                                <div key={field.name}>
                                    <label>{field.label}</label>
                                    <select name={field.name}>
                                        {contributors.map(entry => (
                                            <option key={entry.identifier} value={[entry.familyName, entry.givenName, entry.identifier]}>
                                                {entry.familyName} {entry.givenName}
                                            </option>))}
                                    </select>
                                </div>)
                        } else if (field.name === 'Consortium') {
                            return (
                                <div key={field.name}>
                                    <label>{field.label}</label>
                                    <select name={field.name}>
                                        {dropdownOptions.map(option => (
                                            <option key={option.identifier} value={[option.fullName, option.identifier]}>
                                                {option.fullName}
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