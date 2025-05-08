import React from 'react'
import { useState, useEffect } from 'react'

export default function Contributors () {
    //const [formData, setFormData] = useState(null);
    const [dropdownOptions, setDropdownOptions] = useState([]);
    const formSchema = [
        { name: 'firstName', label: 'First Name', type: 'text' },
        { name: 'lastName', label: 'Last Name', type: 'text' },
        { name: 'options', label: 'Imported from KG', type: 'dropdown' },
    ];
    /*const dropdownOptions = [
        { id: 1, name: 'Person 1' },
        { id: 2, name: 'Option 2' },
        { id: 3, name: 'Option 3' },
    ];*/
    useEffect(() => {
        const fetchDropdownOptions = async () => {
        try {
            const url = 'api/kginfo/contributors'
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`There is a problem fetching info from backend: ${response.status}`);
            }
            setDropdownOptions(response.personKG);
            } catch (error) {
                console.error('Error fetching contributors from backend:', error);
            }
            }
            fetchDropdownOptions()
        }, [])

    const handleSubmit = (event) => {
        event.preventDefault();
        const formElements = event.target.elements;
        const formValues = Array.from(formElements).reduce((acc, element) => {
            if (element.name) {
                acc[element.name] = element.value;
            }
            return acc;
        }, {});
        console.log('Form Values:', formValues);
    };

    return (
        <div>
            <h3>Step 5: Imported Contributors</h3>
            <form onSubmit={handleSubmit}>
                {formSchema.map(field => {
                    if (field.type === 'dropdown') {
                        return (
                            <div key={field.name}>
                                <label>{field.label}</label>
                                <select name={field.name}>
                                    {dropdownOptions.map(option => (
                                        <option key={option.id} value={option.name}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    }
                    return (
                        <div key={field.name}>
                            <label>{field.label}</label>
                            <input type={field.type} name={field.name} />
                        </div>
                    );
                })}
                <button type="submit">Submit</button>
            </form>
        </div>
    );
}