import { useState, useEffect } from 'react'
import { Form, Input, Select, Checkbox, Button, Typography } from 'antd'
import { CUSTODIAN_AFF, institutionList, custodianName, contactName, isEmail } from './authorModel'

const { Option } = Select
const { Text } = Typography

export default function Contributors({ form, onChange, data = {}, showErrors = false }) {
  const [contributors, setContributors] = useState([])
  const [typesContribution, setTypesContribution] = useState([])
  const [authors, setAuthors] = useState(data.contribution?.authors || [])
  const [otherContribs, setOtherContribs] = useState(data.contribution?.contributor?.othercontr || [])
  const [affiliations, setAffiliations] = useState(data.contribution?.affiliations || [])
  const [custAuthor, setCustAuthor] = useState(data.contribution?.custodianAuthor || {})

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
    setAffiliations(data.contribution?.affiliations || [])
    setCustAuthor(data.contribution?.custodianAuthor || {})
  }, [data])

  // everything the step stores, sent upward in one place
  const emit = (patch = {}) => {
    const next = { authors, othercontr: otherContribs, affiliations, custodianAuthor: custAuthor, ...patch }
    onChange({
      contribution: {
        ...data.contribution,
        authors: next.authors,
        affiliations: next.affiliations,
        custodianAuthor: next.custodianAuthor,
        contributor: { ...(data.contribution?.contributor || {}), othercontr: next.othercontr },
      },
    })
  }

  const kgName = (uuid) => {
    const p = contributors.find(c => c.uuid === uuid)
    return p ? (p.fullName || `${p.givenName || ''} ${p.familyName || ''}`).trim() : ''
  }
  const authorName = (a) => (a.isCustom ? `${a.firstName || ''} ${a.lastName || ''}`.trim() : kgName(a.selectedAuthor))
  const custName = custodianName(data)
  const instOptions = institutionList({ ...data, contribution: { ...data.contribution, affiliations } })
    .map(i => ({ value: i.id, label: i.text }))
  const roleOptions = typesContribution.map(t => ({ value: t.name, label: t.name }))

const fetchContributors = async () => {
    try {
    const response = await fetch('api/kginfo/contributorsfile')
    if (!response.ok && response.status !== 0) {
        throw new Error(`Error fetching contributors: ${response.status}`)
    }
    const fetchedData = await response.json()
    const sorted = (fetchedData.person || []).sort((a, b) => {
        const nameA = a.fullName || `${a.familyName} ${a.givenName}` || ''
        const nameB = b.fullName || `${b.familyName} ${b.givenName}` || ''
        return nameA.localeCompare(nameB)
    })
    setContributors(sorted)
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
        const sorted = (fetchedData.typecontribution || []).sort((a, b) =>
            a.name.localeCompare(b.name)
        )
        setTypesContribution(sorted)
        } catch (error) {
        console.error('Error fetching contribution types:', error)
        }
    }

  useEffect(() => {
    fetchContributors()
    fetchTypeContribution()
  }, [])

  const addAuthor = () => {
    const newField = { id: Date.now(), isCustom: false, firstName: '', lastName: '', selectedAuthor: '', email: '', affiliationIds: [], contributions: [] }
    const updated = [...authors, newField]
    setAuthors(updated)
    emit({ authors: updated })
  }

  const removeAuthor = (index) => {
    const updated = authors.filter((_, i) => i !== index)
    setAuthors(updated)
    emit({ authors: updated })
  }

  const handleAuthorChange = (index, field, value) => {
    const updated = [...authors]
    updated[index] = { ...updated[index], [field]: value }
    setAuthors(updated)
    emit({ authors: updated })
  }

  // ── institutions (affiliations) ─────────────────────────────────────────
  const addAffiliation = () => {
    const next = [...affiliations, { id: Date.now(), text: '' }]
    setAffiliations(next); emit({ affiliations: next })
  }
  const changeAffiliation = (i, text) => {
    const next = affiliations.map((a, idx) => idx === i ? { ...a, text } : a)
    setAffiliations(next); emit({ affiliations: next })
  }
  const removeAffiliation = (i) => {
    const id = affiliations[i]?.id
    const next = affiliations.filter((_, idx) => idx !== i)
    const nextAuthors = authors.map(a => ({ ...a, affiliationIds: (a.affiliationIds || []).filter(x => x !== id) }))
    const nextCust = { ...custAuthor, affiliationIds: (custAuthor.affiliationIds || []).filter(x => x !== id) }
    setAffiliations(next); setAuthors(nextAuthors); setCustAuthor(nextCust)
    emit({ affiliations: next, authors: nextAuthors, custodianAuthor: nextCust })
  }
  const changeCust = (patch) => {
    const next = { ...custAuthor, ...patch }
    setCustAuthor(next); emit({ custodianAuthor: next })
  }

  // The contact person (first page) who is also an author: email and affiliation are suggested once.
  useEffect(() => {
    const cp = contactName(data).toLowerCase()
    if (!cp) return
    let nextAff = affiliations, changed = false
    const next = authors.map(a => {
      if (a.contactPrefilled || (authorName(a) || '').toLowerCase() !== cp) return a
      changed = true
      let ids = a.affiliationIds || []
      const text = (data.contactperson?.affiliation || '').trim()
      if (!ids.length && text) {
        const known = institutionList({ ...data, contribution: { ...data.contribution, affiliations: nextAff } }).find(i => i.text.toLowerCase() === text.toLowerCase())
        if (known) ids = [known.id]
        else { const id = Date.now() + Math.floor(Math.random() * 1000); nextAff = [...nextAff, { id, text }]; ids = [id] }
      }
      return { ...a, contactPrefilled: true, email: a.email || (data.contactperson?.email || '').trim(), affiliationIds: ids }
    })
    if (changed) { setAuthors(next); setAffiliations(nextAff); emit({ authors: next, affiliations: nextAff }) }
  }, [authors, contributors, data.contactperson]) // eslint-disable-line react-hooks/exhaustive-deps

  // Roles given to a person who is also listed as an "other contributor" are suggested once.
  useEffect(() => {
    if (!typesContribution.length || !authors.some(a => a.contributions === undefined)) return
    const nameOf = (id) => typesContribution.find(t => t.identifier === id)?.name
    const next = authors.map(a => {
      if (a.contributions !== undefined) return a
      const match = otherContribs.find(c => (a.selectedAuthor && c.selectedOtherContr === a.selectedAuthor) ||
        (a.isCustom && c.isCustom && authorName(a) && authorName(a).toLowerCase() === `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase()))
      const ids = match ? [...(match.contributionTypes || []), ...(match.selectedTypeContr || [])] : []
      return { ...a, contributions: [...new Set(ids.map(nameOf).filter(Boolean))] }
    })
    setAuthors(next); emit({ authors: next })
  }, [typesContribution, authors]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setOtherContribs(updated)
    emit({ othercontr: updated })
  }

  const removeOtherContr = (index) => {
    const updated = otherContribs.filter((_, i) => i !== index)
    setOtherContribs(updated)
    emit({ othercontr: updated })
  }

  const handleContrChange = (index, field, value) => {
    const updated = [...otherContribs]
    updated[index] = { ...updated[index], [field]: value }
    //const updated_types = [...contrtype]
    //updated_types[index] = { ...updated_types[index], [field]: value }
    setOtherContribs(updated)
    //setContrtype(updated_types)
    emit({ othercontr: updated })
  }

  const handleValuesChange = (changedValues) => {
    if (changedValues.contribution) emit()
  }

  return (
    <div>
      <p className="step-title">Dataset authors:</p>

      <Form form={form} layout="vertical" initialValues={initialValues} onValuesChange={handleValuesChange}>
        <p className="step-description">
          Please list all authors who have contributed to the dataset, in the order you would like them to appear on
          the data publication. Please note that the list of authors may be different for this data publication as compared
          to a journal article based on the data.
        </p>

        {/* institutions: every author chooses from this list; the numbers in the data descriptor are made from it */}
        <div style={{ background: '#f7f9fb', border: '1px solid #d9e2ec', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
          <span className="step-subtitle">Institutions (affiliations)</span>
          <p className="step-description" style={{ margin: '4px 0 8px' }}>
            List the institutions of all authors once. Each author below picks one or more of them. The numbers in the data
            descriptor are created automatically.
          </p>
          {data.custodian?.institution
            ? <div style={{ marginBottom: 6 }}><Text>{data.custodian.institution}</Text> <Text type="secondary" style={{ fontSize: 12 }}>(the data custodian’s affiliation, from the first page)</Text></div>
            : <div style={{ marginBottom: 6 }}><Text type="warning" style={{ fontSize: 12 }}>The data custodian’s affiliation is missing on the first page.</Text></div>}
          {affiliations.map((aff, i) => (
            <div key={aff.id} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <Input value={aff.text} onChange={(e) => changeAffiliation(i, e.target.value)} placeholder="Department, Institution, City, Country" />
              <Button size="small" className="remove-text-btn" onClick={() => removeAffiliation(i)}>Remove</Button>
            </div>
          ))}
          <Button type="dashed" size="small" onClick={addAffiliation}>Add an institution</Button>
        </div>

        {/* the data custodian (first page) is author 1 */}
        {custName && (
          <div style={{ border: '1px solid #e1e8ef', borderRadius: 6, padding: '10px 14px', marginBottom: 16, background: '#fff' }}>
            <span className="step-subtitle">Author 1: {custName} (data custodian)</span>
            <div style={{ fontSize: 12, color: '#777', margin: '2px 0 8px' }}>
              Name, email and affiliation come from the first page. The data custodian is always the first author.
            </div>
            <Form.Item label="Additional affiliation(s) (optional)" style={{ marginBottom: 8 }}>
              <Select mode="multiple" style={{ width: '100%' }} placeholder="Another institution of the custodian, if any"
                value={custAuthor.affiliationIds || []} options={instOptions.filter(o => o.value !== CUSTODIAN_AFF)}
                onChange={(vals) => changeCust({ affiliationIds: vals })} />
            </Form.Item>
            <Form.Item label="Contribution(s)" style={{ marginBottom: 8 }}>
              <Select mode="tags" style={{ width: '100%' }} tokenSeparators={[';']} options={roleOptions}
                placeholder="Select the type(s) of contribution (you can also type your own)"
                value={custAuthor.contributions || []} onChange={(vals) => changeCust({ contributions: vals })} />
            </Form.Item>
            <Checkbox checked={custAuthor.corresponding ?? true} onChange={(e) => changeCust({ corresponding: e.target.checked })}>Corresponding author</Checkbox>
            <Checkbox checked={!!custAuthor.equal} onChange={(e) => changeCust({ equal: e.target.checked })}>Contributed equally (first authors)</Checkbox>
          </div>
        )}

        {authors.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
                <span className="step-subtitle">Author {index + (custName ? 2 : 1)}</span>
                <Button type="link" size="small" className="remove-text-btn" style={{ color: "#d32f2f" }} onClick={() => removeAuthor(index)}>Remove</Button>
              </span>}>
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

              {custName && authorName(field).toLowerCase() === custName.toLowerCase() && (
                <div style={{ color: '#d46b08', fontSize: 12, marginBottom: 8 }}>
                  This person is the data custodian and is already author 1 (first page). You can remove this entry.
                </div>
              )}
              {!(custName && authorName(field).toLowerCase() === custName.toLowerCase()) && (
                <>
                  <Form.Item label="Email" required validateStatus={showErrors && !isEmail(field.email) ? 'error' : ''}
                    help={showErrors && !isEmail(field.email) ? (field.email ? 'This email address does not look valid.' : 'Please enter the email address.') : ''}>
                    <Input value={field.email || ''} onChange={(e) => handleAuthorChange(index, 'email', e.target.value)} placeholder="name@institution.org" />
                  </Form.Item>
                  <Form.Item label="Affiliation(s)" required
                    validateStatus={showErrors && !(field.affiliationIds || []).some(id => instOptions.some(o => o.value === id)) ? 'error' : ''}
                    help={showErrors && !(field.affiliationIds || []).some(id => instOptions.some(o => o.value === id)) ? 'Please choose at least one institution (add it in the list above if it is missing).' : ''}>
                    <Select mode="multiple" style={{ width: '100%' }} placeholder="Choose from the institutions above"
                      value={field.affiliationIds || []} options={instOptions}
                      onChange={(vals) => handleAuthorChange(index, 'affiliationIds', vals)} />
                  </Form.Item>
                  <Form.Item label="Contribution(s)">
                    <Select mode="tags" style={{ width: '100%' }} tokenSeparators={[';']} options={roleOptions}
                      placeholder="Select the type(s) of contribution (you can also type your own)"
                      value={field.contributions || []} onChange={(vals) => handleAuthorChange(index, 'contributions', vals)} />
                  </Form.Item>
                  <Checkbox checked={!!field.corresponding} onChange={(e) => handleAuthorChange(index, 'corresponding', e.target.checked)}>Corresponding author</Checkbox>
                  <Checkbox checked={!!field.equal} onChange={(e) => handleAuthorChange(index, 'equal', e.target.checked)}>Contributed equally (first authors)</Checkbox>
                </>
              )}
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button type="dashed" onClick={addAuthor} style={{ width: '30%' }} className="add-contributor-button">
            Add an Author
          </Button>
        </div>

        <p className="step-title">Other contributors:</p>
        <p className="step-description">Please list all other contributors to this dataset (technicians, data managers, etc.)</p>

        {otherContribs.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Form.Item label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
                <span className="step-subtitle">Contributor {index + 1}</span>
                <Button type="link" size="small" className="remove-text-btn" style={{ color: "#d32f2f" }} onClick={() => removeOtherContr(index)}>Remove</Button>
              </span>}>
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
                        mode="multiple"
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
