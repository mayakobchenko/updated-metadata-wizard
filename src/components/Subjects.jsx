import { useState, useEffect } from 'react'
import { Form, Input, Select, Button } from 'antd'

const { Option } = Select

export default function Subjects ({ form, onChange, data = {} }) {
  const [agecategory, setAgeCat] = useState([])
  const [biosex, setBiosex] = useState([])
  const [handedness, setHandedness] = useState([])
  const [species, setSpecies] = useState([])
  const [strainData, setStrainData] = useState([])
  const [diseaseData, setDiseaseData] = useState([])
  const [subjectsData, setSubjectData] = useState(data.subjectMetadata?.subjects || [])
  const initialValues = { subjectMetadata: { subjects: subjectsData } }

  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects || [])
  }, [data])

  useEffect(() => {
    const fetchDisease = async () => {
      try {
        const url = 'api/subjects/disease'
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Fetch failed ${response.status}`)
        const json = await response.json()
        setDiseaseData(json.disease)
      } catch (error) { console.error('Error fetching strain:', error) }
    }  
    const fetchStrain = async () => {
      try {
        const url = 'api/subjects/strain'
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Fetch failed ${response.status}`)
        const json = await response.json()
        setStrainData(json.strain)
      } catch (error) { console.error('Error fetching strain:', error) }
    }
    const fetchBioSex = async () => {
      try {
        const url = 'api/subjects/sex'
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Fetch failed ${response.status}`)
        const json = await response.json()
        setBiosex(json.biosex)
      } catch (error) { console.error('Error fetching biosex:', error) }
    }
    const fetchAgeCat = async () => {
      try {
        const url = 'api/subjects/agecategory'
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Fetch failed ${response.status}`)
        const json = await response.json()
        setAgeCat(json.age_cat)
      } catch (error) { console.error('Error fetching age categories:', error) }
    }
    const fetchHandedness = async () => {
      try {
        const url = 'api/subjects/handedness'
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Fetch failed ${response.status}`)
        const json = await response.json()
        setHandedness(json.handedness)
      } catch (error) { console.error('Error fetching handedness:', error) }
    }
    const fetchSpecies = async () => {
      try {
        const url = 'api/subjects/species'
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Fetch failed ${response.status}`)
        const json = await response.json()
        setSpecies(json.species)
      } catch (error) { console.error('Error fetching species:', error) }
    }
    fetchBioSex()
    fetchAgeCat()
    fetchHandedness()
    fetchSpecies()
    fetchStrain()
    fetchDisease()
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
      strain: '',
      file_path: ''
    }
    const updated = [...subjectsData, newField]
    setSubjectData(updated)
    onChange({
      subjectMetadata: {
        ...data.subjectMetadata,
        subjects: updated
      }
    })
  }

  const removeNewSubject = (index) => {
    const updated = subjectsData.filter((_, i) => i !== index)
    setSubjectData(updated)
    onChange({
      subjectMetadata: {
        ...data.subjectMetadata,
        subjects: updated
      }
    })
  }

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

  const handleSubmit = (event) => {
    event.preventDefault()
    const formElements = event.target.elements
    const formValues = Array.from(formElements).reduce((acc, element) => {
      if (element.name) { acc[element.name] = element.value }
      return acc
    }, {})
    console.log('Form Values:', formValues)
  }

  const subjectIdWidth = '36%'    
  const selectPercent = '14%'
  const percentAge = '10%'
  const smallInputPercent = '6%'
  const dropdownStyle = { minWidth: 'max-content', whiteSpace: 'nowrap' }
  // const dropdownStyle = { minWidth: 360, whiteSpace: 'nowrap' }  //more consistent across browsers

  const selectBaseProps = {
    showSearch: true,
    popupMatchSelectWidth: false,
    dropdownStyle,
    getPopupContainer: (triggerNode) => triggerNode?.parentElement || document.body
  }

  return (
    <div>
      <p className="step-title">Subjects</p>
      <Form form={form} layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
        onSubmit={handleSubmit}>

        {subjectsData.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: `0 0 ${subjectIdWidth}`, minWidth: 0 }}>
              <span className="subject-subtitle" style={{ whiteSpace: 'nowrap', marginRight: 8 }}>
                Subject {index + 1}, id:
              </span>

              <div style={{ flex: '1 0 auto', minWidth: 0 }}>
                <Form.Item noStyle>
                  <Input
                    value={field.subjectID}
                    onChange={(e) => handleSubjectChange(index, 'subjectID', e.target.value)}
                    placeholder="Generic id"
                  />
                </Form.Item>
              </div>

              <div style={{ flex: '0 0 auto', marginLeft: 8 }}>
                <Button type="text" onClick={() => removeNewSubject(index)} className="remove-text-btn">
                    Remove
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flex: `1 1 auto`, minWidth: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Form.Item label="Sex" required style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
                <Select
                  {...selectBaseProps}
                  value={field.bioSex}
                  onChange={(value) => handleSubjectChange(index, 'bioSex', value)}
                  placeholder="bio sex"
                  style={{ width: '100%' }}
                >
                  {biosex.map((option) => (
                    <Option key={option.identifier} value={option.identifier}>
                      {option.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Age" required style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
                <Select
                  {...selectBaseProps}
                  value={field.ageCategory}
                  onChange={(value) => handleSubjectChange(index, 'ageCategory', value)}
                  placeholder="age category"
                  filterOption={(input, option) => {
                    if (!option) return false
                    return option.children.toLowerCase().includes(input.toLowerCase())
                  }}
                  style={{ width: '100%' }}
                >
                  {agecategory.map((option) => (
                    <Option key={option.identifier} value={option.identifier}>
                      {option.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Species" required style={{ flex: `0 0 ${selectPercent}`, minWidth: 0, marginBottom: 0 }}>
                <Select
                  {...selectBaseProps}
                  value={field.species}
                  onChange={(value) => handleSubjectChange(index, 'species', value)}
                  placeholder="species"
                  style={{ width: '100%' }}
                >
                  {species.map((option) => (
                    <Option key={option.identifier} value={option.identifier}>
                      {option.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Age" style={{ flex: `0 0 ${smallInputPercent}`, minWidth: 0, marginBottom: 0 }}>
                <Input value={field.age} onChange={(e) => handleSubjectChange(index, 'age', e.target.value)} placeholder="age" />
              </Form.Item>
              <Form.Item label="Weight" style={{ flex: `0 0 ${smallInputPercent}`, minWidth: 0, marginBottom: 0 }}>
                <Input value={field.weight} onChange={(e) => handleSubjectChange(index, 'weight', e.target.value)} placeholder="weight" />
              </Form.Item>
                    
              <Form.Item label="Strain" style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
                <Select
                  {...selectBaseProps}
                  value={field.strain}
                  onChange={(value) => handleSubjectChange(index, 'strain', value)}
                  style={{ width: '100%' }}
                >
                  {strainData.map((option) => (
                    <Option key={option.identifier} value={option.identifier}>
                      {option.name}
                    </Option>
                  ))}
                </Select>
                </Form.Item>
                    
                <Form.Item label="Pathology" style={{ flex: `0 0 ${selectPercent}`, minWidth: 0, marginBottom: 0 }}>
                    <Select
                    {...selectBaseProps}
                    value={field.disease}
                    onChange={(value) => handleSubjectChange(index, 'disease', value)}
                    style={{ width: '100%' }}
                    >
                    {diseaseData.map((option) => (
                        <Option key={option.identifier} value={option.identifier}>
                        {option.name}
                        </Option>
                    ))}
                    </Select>
                </Form.Item>    
                <Form.Item label="Handedness" style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
                    <Select
                    {...selectBaseProps}
                    value={field.handedness}
                    onChange={(value) => handleSubjectChange(index, 'handedness', value)}
                    placeholder="handedness"
                    style={{ width: '100%' }}
                    >
                    {handedness.map((option) => (
                        <Option key={option.identifier} value={option.identifier}>
                        {option.name}
                        </Option>
                    ))}
                    </Select>
                </Form.Item> 
            </div>

          </div>
        ))}

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }} className="add-contributor-button">
            Add new subject
          </Button>
        </div>
      </Form>
    </div>
  )
}
