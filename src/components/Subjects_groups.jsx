import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Radio } from 'antd'

const { Option } = Select
const { TextArea } = Input

// ─── helpers ────────────────────────────────────────────────────────────────

const newSubject = () => ({
  id: Date.now() + Math.random(),
  subjectID: '', age: '', weight: '',
  ageCategory: '', bioSex: '', disease: '',
  handedness: '', species: '', strain: '',
  additionalRemarks: '', file_path: ''
})

const newGroup = (index) => ({
  id: Date.now() + Math.random(),
  name: `Group ${index + 1}`,
  additionalRemarks: '',
  subjects: [newSubject()]
})

// ─── SubjectRow ──────────────────────────────────────────────────────────────

const SubjectRow = ({
  field, index, onRemove, onDuplicate, onChange: onRowChange, label,
  biosex, agecategory, species, strainData, diseaseData, handedness,
  selectBaseProps, subjectIdWidth, selectPercent, percentAge, smallInputPercent
}) => {
  // filter strain by selected species
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: `0 0 ${subjectIdWidth}`, minWidth: 0 }}>
          <span className="subject-subtitle" style={{ whiteSpace: 'nowrap', marginRight: 8 }}>
            {label ?? `Subject ${index + 1}`}, id:
          </span>
          <div style={{ flex: '1 0 auto', minWidth: 0 }}>
            <Form.Item noStyle>
              <Input
                value={field.subjectID}
                onChange={(e) => onRowChange(index, 'subjectID', e.target.value)}
                placeholder="Generic id"
              />
            </Form.Item>
          </div>
          <div style={{ flex: '0 0 auto', marginLeft: 8, display: 'flex', gap: 6 }}>
            <Button type="text" onClick={() => onRemove(index)} className="remove-text-btn">
              Remove
            </Button>
            <Button type="text" onClick={() => onDuplicate(index)} className="duplicate-text-btn">
              Duplicate
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flex: '1 1 auto', minWidth: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Form.Item label="Sex" required style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
            <Select {...selectBaseProps} value={field.bioSex} onChange={(v) => onRowChange(index, 'bioSex', v)} placeholder="bio sex" style={{ width: '100%' }}>
              {biosex.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Age category" required style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
            <Select {...selectBaseProps} value={field.ageCategory} onChange={(v) => onRowChange(index, 'ageCategory', v)} placeholder="age category" style={{ width: '100%' }}>
              {agecategory.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Species" required style={{ flex: `0 0 ${selectPercent}`, minWidth: 0, marginBottom: 0 }}>
            <Select
              {...selectBaseProps}
              value={field.species}
              onChange={(v) => {
                // clear strain when species changes
                onRowChange(index, 'species', v)
                onRowChange(index, 'strain', '')
              }}
              placeholder="species"
              style={{ width: '100%' }}
            >
              {species.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Strain" style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
            <Select
              {...selectBaseProps}
              value={field.strain || undefined}
              onChange={(v) => onRowChange(index, 'strain', v)}
              placeholder={field.species ? 'select strain' : 'select species first'}
              disabled={!field.species || filteredStrain.length === 0}
              style={{ width: '100%' }}
            >
              {filteredStrain.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Age" style={{ flex: `0 0 ${smallInputPercent}`, minWidth: 0, marginBottom: 0 }}>
            <Input value={field.age} onChange={(e) => onRowChange(index, 'age', e.target.value)} placeholder="age" />
          </Form.Item>

          <Form.Item label="Weight" style={{ flex: `0 0 ${smallInputPercent}`, minWidth: 0, marginBottom: 0 }}>
            <Input value={field.weight} onChange={(e) => onRowChange(index, 'weight', e.target.value)} placeholder="weight" />
          </Form.Item>

          <Form.Item label="Pathology" style={{ flex: `0 0 ${selectPercent}`, minWidth: 0, marginBottom: 0 }}>
            <Select {...selectBaseProps} value={field.disease} onChange={(v) => onRowChange(index, 'disease', v)} style={{ width: '100%' }}>
              {diseaseData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Handedness" style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
            <Select {...selectBaseProps} value={field.handedness} onChange={(v) => onRowChange(index, 'handedness', v)} placeholder="handedness" style={{ width: '100%' }}>
              {handedness.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item label="Additional remarks" style={{ flex: '1 0 100%', minWidth: 0, marginBottom: 0 }}>
            <TextArea
              value={field.additionalRemarks || ''}
              onChange={(e) => onRowChange(index, 'additionalRemarks', e.target.value)}
              placeholder="Any additional remarks about this subject..."
              autoSize={{ minRows: 1, maxRows: 3 }}
            />
          </Form.Item>
        </div>
      </div>
    </div>
  )
}

// ─── Subjects component ──────────────────────────────────────────────────────

export default function Subjects({ form, onChange, data = {} }) {

  const [agecategory, setAgeCat]     = useState([])
  const [biosex, setBiosex]           = useState([])
  const [handedness, setHandedness]   = useState([])
  const [species, setSpecies]         = useState([])
  const [strainData, setStrainData]   = useState([])
  const [diseaseData, setDiseaseData] = useState([])

  const [mode, setMode] = useState(
    data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat'
  )
  const [subjectsData, setSubjectData] = useState(
    data.subjectMetadata?.subjects || []
  )
  const [groups, setGroups] = useState(
    data.subjectMetadata?.subjectGroups || []
  )

  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects || [])
    setGroups(data.subjectMetadata?.subjectGroups || [])
    setMode(data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat')
  }, [data])

  useEffect(() => {
    const fetcher = (url, setter, key) => async () => {
      try {
        const res  = await fetch(url)
        if (!res.ok) throw new Error(`Fetch failed ${res.status}`)
        const json = await res.json()
        setter(json[key])
      } catch (e) { console.error(e) }
    }
    fetcher('api/subjects/disease',     setDiseaseData, 'disease')()
    fetcher('api/subjects/strain',      setStrainData,  'strain')()
    fetcher('api/subjects/sex',         setBiosex,      'biosex')()
    fetcher('api/subjects/agecategory', setAgeCat,      'age_cat')()
    fetcher('api/subjects/handedness',  setHandedness,  'handedness')()
    fetcher('api/subjects/species',     setSpecies,     'species')()
  }, [])

  const emit = (patch) =>
    onChange({ subjectMetadata: { ...data.subjectMetadata, ...patch } })

  const subjectIdWidth    = '36%'
  const selectPercent     = '14%'
  const percentAge        = '10%'
  const smallInputPercent = '6%'
  const dropdownStyle     = { minWidth: 'max-content', whiteSpace: 'nowrap' }
  const selectBaseProps   = {
    showSearch: true,
    popupMatchSelectWidth: false,
    dropdownStyle,
    getPopupContainer: (t) => t?.parentElement || document.body
  }

  const rowProps = {
    biosex, agecategory, species, strainData, diseaseData, handedness,
    selectBaseProps, subjectIdWidth, selectPercent, percentAge, smallInputPercent
  }

  const handleModeChange = (e) => {
    const next = e.target.value
    setMode(next)
    if (next === 'grouped') {
      const migrated = [{ ...newGroup(0), subjects: subjectsData.length ? subjectsData : [newSubject()] }]
      setGroups(migrated)
      emit({ subjectGroups: migrated, subjects: undefined })
    } else {
      const flat = groups.flatMap(g => g.subjects)
      setSubjectData(flat)
      emit({ subjects: flat, subjectGroups: undefined })
    }
  }

  // ── flat handlers ─────────────────────────────────────────────────────────
  const addNewSubject = () => {
    const updated = [...subjectsData, newSubject()]
    setSubjectData(updated)
    emit({ subjects: updated })
  }

  const removeSubject = (i) => {
    const updated = subjectsData.filter((_, idx) => idx !== i)
    setSubjectData(updated)
    emit({ subjects: updated })
  }

  const duplicateSubject = (i) => {
    const updated = [
      ...subjectsData.slice(0, i + 1),
      { ...subjectsData[i], id: Date.now() + Math.random() },
      ...subjectsData.slice(i + 1)
    ]
    setSubjectData(updated)
    emit({ subjects: updated })
  }

  const handleSubjectChange = (i, field, value) => {
    const updated = subjectsData.map((s, idx) => idx === i ? { ...s, [field]: value } : s)
    setSubjectData(updated)
    emit({ subjects: updated })
  }

  // ── group handlers ────────────────────────────────────────────────────────
  const updateGroups = (next) => { setGroups(next); emit({ subjectGroups: next }) }

  const addGroup = () => updateGroups([...groups, newGroup(groups.length)])

  const removeGroup = (gi) => updateGroups(groups.filter((_, i) => i !== gi))

  const duplicateGroup = (gi) => {
    const copy = {
      ...groups[gi],
      id: Date.now() + Math.random(),
      name: `${groups[gi].name} (copy)`,
      subjects: groups[gi].subjects.map(s => ({ ...s, id: Date.now() + Math.random() }))
    }
    updateGroups([...groups.slice(0, gi + 1), copy, ...groups.slice(gi + 1)])
  }

  const renameGroup = (gi, name) =>
    updateGroups(groups.map((g, i) => i === gi ? { ...g, name } : g))

  const updateGroupRemarks = (gi, additionalRemarks) =>
    updateGroups(groups.map((g, i) => i === gi ? { ...g, additionalRemarks } : g))

  const addSubjectToGroup = (gi) =>
    updateGroups(groups.map((g, i) =>
      i === gi ? { ...g, subjects: [...g.subjects, newSubject()] } : g
    ))

  const removeSubjectFromGroup = (gi, si) =>
    updateGroups(groups.map((g, i) =>
      i === gi ? { ...g, subjects: g.subjects.filter((_, j) => j !== si) } : g
    ))

  const duplicateSubjectInGroup = (gi, si) =>
    updateGroups(groups.map((g, i) => {
      if (i !== gi) return g
      const copy = { ...g.subjects[si], id: Date.now() + Math.random() }
      const subjects = [...g.subjects.slice(0, si + 1), copy, ...g.subjects.slice(si + 1)]
      return { ...g, subjects }
    }))

  const handleGroupSubjectChange = (gi, si, field, value) =>
    updateGroups(groups.map((g, i) => {
      if (i !== gi) return g
      const subjects = g.subjects.map((s, j) => {
        if (j !== si) return s
        // clear strain when species changes within a group subject
        if (field === 'species') return { ...s, species: value, strain: '' }
        return { ...s, [field]: value }
      })
      return { ...g, subjects }
    }))

  return (
    <div>
      <p className="step-title">Subjects</p>

      <Form.Item label="Are subjects organised into groups?">
        <Radio.Group value={mode} onChange={handleModeChange}>
          <Radio.Button value="flat">No — single list</Radio.Button>
          <Radio.Button value="grouped">Yes — multiple groups</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form form={form} layout="vertical" onValuesChange={() => {}}>

        {/* ── FLAT MODE ── */}
        {mode === 'flat' && (
          <>
            {subjectsData.map((field, index) => (
              <SubjectRow
                key={field.id}
                field={field}
                index={index}
                onRemove={removeSubject}
                onDuplicate={duplicateSubject}
                onChange={handleSubjectChange}
                {...rowProps}
              />
            ))}
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }} className="add-contributor-button">
                Add new subject
              </Button>
            </div>
          </>
        )}

        {/* ── GROUPED MODE ── */}
        {mode === 'grouped' && (
          <>
            {groups.map((group, gi) => (
              <div
                key={group.id}
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  padding: '16px 20px',
                  marginBottom: 24,
                  background: '#fafafa'
                }}
              >
                {/* group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Input
                    value={group.name}
                    onChange={(e) => renameGroup(gi, e.target.value)}
                    style={{ fontWeight: 600, width: 220 }}
                    placeholder={`Group ${gi + 1} name`}
                  />
                  <Button type="text" onClick={() => duplicateGroup(gi)} className="duplicate-text-btn">
                    Duplicate group
                  </Button>
                  <Button
                    type="text"
                    danger
                    onClick={() => removeGroup(gi)}
                    className="remove-text-btn"
                    disabled={groups.length === 1}
                  >
                    Remove group
                  </Button>
                </div>

                {/* group additional remarks */}
                <Form.Item
                  label="Group additional remarks"
                  style={{ marginBottom: 16 }}
                >
                  <TextArea
                    value={group.additionalRemarks || ''}
                    onChange={(e) => updateGroupRemarks(gi, e.target.value)}
                    placeholder="Any additional remarks about this group..."
                    autoSize={{ minRows: 1, maxRows: 3 }}
                  />
                </Form.Item>

                {/* subjects in group */}
                {group.subjects.map((field, si) => (
                  <SubjectRow
                    key={field.id}
                    field={field}
                    index={si}
                    label={`Subject ${si + 1}`}
                    onRemove={(i)       => removeSubjectFromGroup(gi, i)}
                    onDuplicate={(i)    => duplicateSubjectInGroup(gi, i)}
                    onChange={(i, f, v) => handleGroupSubjectChange(gi, i, f, v)}
                    {...rowProps}
                  />
                ))}

                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Button type="dashed" onClick={() => addSubjectToGroup(gi)} style={{ width: '40%' }}>
                    + Add subject to {group.name}
                  </Button>
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <Button type="dashed" onClick={addGroup} style={{ width: '30%' }} className="add-contributor-button">
                + Add new group
              </Button>
            </div>
          </>
        )}

      </Form>
    </div>
  )
}