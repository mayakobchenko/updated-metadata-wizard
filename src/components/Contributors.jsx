import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Button } from 'antd'

const { Option } = Select

export default function Contributors({ form, onChange, data = {} }) {
  const [contributors, setContributors] = useState([])
  const [typesContribution, setTypesContribution] = useState([])
  const [authors, setAuthors] = useState(data.contribution?.authors || [])
  const [otherContribs, setOtherContribs] = useState(data.contribution?.contributor?.othercontr || [])
  //const [contrtype, setContrtype] = useState(data.contribution?.contributor?.contrtype || [])
    
  const initialValues = {
    contribution: {
      authors,
      contributor: {
        othercontr: otherContribs,
      },
    },
  }

  useEffect(() => {
    setAuthors(data.contribution?.authors || [])
    setOtherContribs(data.contribution?.contributor?.othercontr || [])
    //setContrtype(data.contribution?.contributor?.contrtype || [])
  }, [data])

  const fetchContributors = async () => {
    try {
      const response = await fetch('api/kginfo/contributorsfile')
      if (!response.ok && response.status !== 0) {
        throw new Error(`Error fetching contributors: ${response.status}`)
      }
      const fetchedData = await response.json()
      setContributors(fetchedData.person || [])
    } catch (error) {
      console.error('Error fetching contributors:', error)
    }
  }

  const fetchTypeContribution = async () => {
    try {
      const response = await fetch('api/kginfo/typecontribution')
      if (!response.ok) {
        throw new Error(`Error fetching contribution types: ${response.status}`)
      }
      const fetchedData = await response.json()
      console.log('typecontribution fetchedData:', fetchedData)
      setTypesContribution(fetchedData.typecontribution || [])
    } catch (error) {
      console.error('Error fetching contribution types:', error)
    }
  }

  useEffect(() => {
    fetchContributors()
    fetchTypeContribution()
  }, [])

  const addAuthor = () => {
    const newField = { id: Date.now(), isCustom: false, firstName: '', lastName: '', selectedAuthor: '' }
    const updated = [...authors, newField]
    setAuthors(updated)
    onChange({
      contribution: {
        ...data.contribution,
        authors: updated,
        contributor: { ...(data.contribution?.contributor || {}), othercontr: otherContribs },
      },
    })
  }

  const removeAuthor = (index) => {
    const updated = authors.filter((_, i) => i !== index)
    setAuthors(updated)
    onChange({
      contribution: {
        ...data.contribution,
        authors: updated,
        contributor: { ...(data.contribution?.contributor || {}), othercontr: otherContribs },
      },
    })
  }

  const handleAuthorChange = (index, field, value) => {
    const updated = [...authors]
    updated[index] = { ...updated[index], [field]: value }
    setAuthors(updated)
    onChange({
      contribution: {
        ...data.contribution,
        authors: updated,
        contributor: { ...(data.contribution?.contributor || {}), othercontr: otherContribs },
      },
    })
  }

  const addOtherContr = () => {
    const newField = {
      id: Date.now(),
      isCustom: false,
      firstName: '',
      lastName: '',
      selectedOtherContr: '',
      contributionTypes: []
    }
    const updated = [...otherContribs, newField]
   // const updated_type = [...contrtype, newField]
    setOtherContribs(updated)
   // setContrtype(updated_type)
    onChange({
      contribution: {
        ...data.contribution,
        authors,
        contributor: { ...(data.contribution?.contributor || {}), othercontr: updated },
      },
    })
  }

  const removeOtherContr = (index) => {
    const updated = otherContribs.filter((_, i) => i !== index)
   // const updated_types = contrtype.filter((_, i) => i !== index)
    setOtherContribs(updated)
    //setContrtype(updated_types)
    onChange({
      contribution: {
        ...data.contribution,
        authors,
        contributor: { ...(data.contribution?.contributor || {}), othercontr: updated },
      },
    })
  }

  const handleContrChange = (index, field, value) => {
    const updated = [...otherContribs]
    updated[index] = { ...updated[index], [field]: value }
    //const updated_types = [...contrtype]
    //updated_types[index] = { ...updated_types[index], [field]: value }
    setOtherContribs(updated)
    //setContrtype(updated_types)
    onChange({
      contribution: {
        ...data.contribution,
        authors,
        contributor: { ...(data.contribution?.contributor || {}), othercontr: updated },
      },
    })
  }

  const handleValuesChange = (changedValues) => {
    if (changedValues.contribution) {
      onChange({
        contribution: {
          ...data.contribution,
          ...changedValues.contribution,
          authors: changedValues.contribution.authors ?? authors,
          contributor: {
            ...(data.contribution?.contributor || {}),
            othercontr: changedValues.contribution?.contributor?.othercontr ?? otherContribs,
            //contrtype: changedValues.contribution?.contributor?.contrtype ?? contrtype,
          },
        },
      })
    }
  }

  return (
    <div>
      <p className="step-title">Dataset authors:</p>

      <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={handleValuesChange}>
        <p className="step-description">
          Please list all authors who have contributed to the dataset, in the order you would like them to appear on
          the data publication. Please note that the list of authors may be different for this data publication as compared
          to a journal article based on the data
        </p>

        {authors.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item label={<span className="step-subtitle">Author {index + 1}</span>}>
                <Checkbox
                  style={{ marginBottom: 10 }}
                  checked={field.isCustom}
                  onChange={(e) => handleAuthorChange(index, 'isCustom', e.target.checked)}>
                  This person is not in the EBRAINS Knowledge Graph
                </Checkbox>
              </Form.Item>

              {!field.isCustom ? (
                <Form.Item label="Select a person from the EBRAINS Knowledge Graph" required>
                  <Select
                    showSearch
                    style={{ minWidth: 240 }}
                    value={field.selectedAuthor}
                    onChange={(value) => handleAuthorChange(index, 'selectedAuthor', value)}
                    placeholder="Select a contributor"
                    filterOption={(input, option) => {
                      if (!option) return false
                      return option.children.toLowerCase().includes(input.toLowerCase())
                    }} >
                    {contributors.map((option) => (
                      <Option key={option.uuid} value={option.uuid}>
                        {option.fullName || `${option.familyName} ${option.givenName}${option.orcid ? ` (orcid: ${option.orcid})` : ''}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <>
                  <Form.Item label="First Name" required>
                    <Input value={field.firstName} onChange={(e) => handleAuthorChange(index, 'firstName', e.target.value)} placeholder="Enter first name" />
                  </Form.Item>

                  <Form.Item label="Last Name" required>
                    <Input value={field.lastName} onChange={(e) => handleAuthorChange(index, 'lastName', e.target.value)} placeholder="Enter last name" />
                  </Form.Item>

                  <Form.Item label="ORCID">
                    <Input value={field.orcid} onChange={(e) => handleAuthorChange(index, 'orcid', e.target.value)} placeholder="https://orcid.org/xxxx-xxxx-xxxx-xxxx" />
                  </Form.Item>
                </>
              )}
            </div>

            <Button type="danger" size="small" onClick={() => removeAuthor(index)} style={{ marginLeft: 0, flex: '0 0 auto' }}>
              Remove
            </Button>
          </div>
        ))}

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button type="dashed" onClick={addAuthor} style={{ width: '30%' }} className="add-contributor-button">
            Add an Author
          </Button>
        </div>

        <p className="step-title">Other contributors:</p>
        <p className="step-description">Please list all other contributors to this dataset (technicians, data managers, etc.).</p>

        {otherContribs.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item label={<span className="step-subtitle">Contributor {index + 1}</span>}>
                <Checkbox
                  style={{ marginBottom: 10 }}
                  checked={field.isCustom}
                  onChange={(e) => handleContrChange(index, 'isCustom', e.target.checked)}>
                  This person is not in the EBRAINS Knowledge Graph
                </Checkbox>
              </Form.Item>

              {!field.isCustom ? (
                <>
                  <Form.Item label="Select a person from the EBRAINS Knowledge Graph" required>
                    <Select
                      showSearch
                      style={{ minWidth: 240 }}
                      value={field.selectedOtherContr}
                      onChange={(value) => handleContrChange(index, 'selectedOtherContr', value)}
                      placeholder="Select a contributor"
                      filterOption={(input, option) => {
                        if (!option) return false
                        return option.children.toLowerCase().includes(input.toLowerCase())
                      }}
                    >
                      {contributors.map((option) => (
                        <Option key={option.uuid} value={option.uuid}>
                          {option.fullName || `${option.familyName} ${option.givenName}${option.orcid ? ` (orcid: ${option.orcid})` : ''}`}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Type of contribution">
                    <Select
                      mode="multiple" // or remove mode if you want single select
                      placeholder="Select type(s) of contribution"
                      value={field.contributionTypes}
                      onChange={(vals) => handleContrChange(index, 'contributionTypes', vals)}
                      style={{ minWidth: 240 }}
                    >
                      {typesContribution.map((option) => (
                        <Option key={option.identifier} value={option.identifier}>
                            {option.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item label="First Name" required>
                    <Input value={field.firstName} onChange={(e) => handleContrChange(index, 'firstName', e.target.value)} placeholder="Enter first name" />
                  </Form.Item>

                  <Form.Item label="Last Name" required>
                    <Input value={field.lastName} onChange={(e) => handleContrChange(index, 'lastName', e.target.value)} placeholder="Enter last name" />
                  </Form.Item>

                  <Form.Item label="ORCID">
                    <Input value={field.orcid} onChange={(e) => handleContrChange(index, 'orcid', e.target.value)} placeholder="https://orcid.org/xxxx-xxxx-xxxx-xxxx" />
                  </Form.Item>

                  <Form.Item label="Type of contribution">
                    <Select
                        showSearch
                        style={{ minWidth: 240 }}
                        value={field.selectedTypeContr} 
                        onChange={(value) => handleContrChange(index, 'selectedTypeContr', value)} 
                        placeholder="Select type of contribution"
                        filterOption={(input, option) => {
                        if (!option) return false
                        return option.children.toLowerCase().includes(input.toLowerCase())
                        }}>
                        {typesContribution.map((option) => (
                            <Option key={option.identifier} value={option.identifier}>
                                {option.name}
                            </Option>
                        ))}
                    </Select>
                  </Form.Item>
                </>
              )}
            </div>

            <Button type="danger" size="small" onClick={() => removeOtherContr(index)} style={{ marginLeft: 0, flex: '0 0 auto' }}>
              Remove
            </Button>
          </div>
        ))}

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button type="dashed" onClick={addOtherContr} style={{ width: '30%' }} className="add-contributor-button">
            Add a Contributor
          </Button>
        </div>
      </Form>
    </div>
  )
}
