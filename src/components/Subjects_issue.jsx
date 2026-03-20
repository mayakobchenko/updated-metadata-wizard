import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Radio } from 'antd'

const { Option } = Select

// ─── helpers ────────────────────────────────────────────────────────────────

const newSubject = () => ({
  id: Date.now() + Math.random(),
  subjectID: '', age: '', weight: '',
  ageCategory: '', bioSex: '', disease: '',
  handedness: '', species: '', strain: '', file_path: ''
})

const newGroup = (index) => ({
  id: Date.now() + Math.random(),
  name: `Group ${index + 1}`,
  subjects: [newSubject()]
})

// ─── component ──────────────────────────────────────────────────────────────

export default function Subjects({ form, onChange, data = {} }) {
  // ── dropdown option state (unchanged) ──────────────────────────────────
  const [agecategory, setAgeCat]     = useState([])
  const [biosex, setBiosex]           = useState([])
  const [handedness, setHandedness]   = useState([])
  const [species, setSpecies]         = useState([])
  const [strainData, setStrainData]   = useState([])
  const [diseaseData, setDiseaseData] = useState([])

  // ── fork state ─────────────────────────────────────────────────────────
  // 'flat' | 'grouped'
  const [mode, setMode] = useState(
    data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat'
  )

  // ── flat subjects (original behaviour) ────────────────────────────────
  const [subjectsData, setSubjectData] = useState(
    data.subjectMetadata?.subjects || []
  )

  // ── grouped subjects (new behaviour) ──────────────────────────────────
  const [groups, setGroups] = useState(
    data.subjectMetadata?.subjectGroups || []
  )

  // keep in sync when parent data changes
  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects || [])
    setGroups(data.subjectMetadata?.subjectGroups || [])
    setMode(data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat')
  }, [data])

  // ── fetch dropdown options (unchanged) ────────────────────────────────
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

  // ── notify parent ──────────────────────────────────────────────────────
  const emit = (patch) =>
    onChange({ subjectMetadata: { ...data.subjectMetadata, ...patch } })

  // ── mode switch ────────────────────────────────────────────────────────
  const handleModeChange = (e) => {
    const next = e.target.value
    setMode(next)
    if (next === 'grouped') {
      // migrate existing flat subjects into one default group
      const migrated = [{ ...newGroup(0), subjects: subjectsData.length ? subjectsData : [newSubject()] }]
      setGroups(migrated)
      emit({ subjectGroups: migrated, subjects: undefined })
    } else {
      // flatten first group back into subjects array
      const flat = groups.flatMap(g => g.subjects)
      setSubjectData(flat)
      emit({ subjects: flat, subjectGroups: undefined })
    }
  }

  // ── flat subject handlers (unchanged logic) ───────────────────────────
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

  // ── group handlers (new) ───────────────────────────────────────────────
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
    const next = [...groups.slice(0, gi + 1), copy, ...groups.slice(gi + 1)]
    updateGroups(next)
  }

  const renameGroup = (gi, name) =>
    updateGroups(groups.map((g, i) => i === gi ? { ...g, name } : g))

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
      const subjects = g.subjects.map((s, j) => j === si ? { ...s, [field]: value } : s)
      return { ...g, subjects }
    }))

  // ── shared style constants (unchanged) ────────────────────────────────
  const subjectIdWidth  = '36%'
  const selectPercent   = '14%'
  const percentAge      = '10%'
  const smallInputPercent = '6%'
  const dropdownStyle   = { minWidth: 'max-content', whiteSpace: 'nowrap' }
  const selectBaseProps = {
    showSearch: true,
    popupMatchSelectWidth: false,
    dropdownStyle,
    getPopupContainer: (t) => t?.parentElement || document.body
  }

  // ── subject row renderer (extracted, used in both modes) ──────────────
  const SubjectRow = ({ field, index, onRemove, onDuplicate, onChange: onRowChange, label }) => (
    <div key={field.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: `0 0 ${subjectIdWidth}`, minWidth: 0 }}>
        <span className="subject-subtitle" style={{ whiteSpace: 'nowrap', marginRight: 8 }}>
          {label ?? `Subject ${index + 1}`}, id:
        </span>
        <div style={{ flex: '1 0 auto', minWidth: 0 }}>
          <Form.Item noStyle>
            <Input value={field.subjectID} onChange={(e) => onRowChange(index, 'subjectID', e.target.value)} placeholder="Generic id" />
          </Form.Item>
        </div>
        <div style={{ flex: '0 0 auto', marginLeft: 8, display: 'flex', gap: 6 }}>
          <Button type="text" onClick={() => onRemove(index)} className="remove-text-btn">Remove</Button>
          <Button type="text" onClick={() => onDuplicate(index)} className="duplicate-text-btn">Duplicate</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flex: '1 1 auto', minWidth: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Form.Item label="Sex" required style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
          <Select {...selectBaseProps} value={field.bioSex} onChange={(v) => onRowChange(index, 'bioSex', v)} placeholder="bio sex" style={{ width: '100%' }}>
            {biosex.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="Age cat." required style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
          <Select {...selectBaseProps} value={field.ageCategory} onChange={(v) => onRowChange(index, 'ageCategory', v)} placeholder="age category" style={{ width: '100%' }}>
            {agecategory.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="Species" required style={{ flex: `0 0 ${selectPercent}`, minWidth: 0, marginBottom: 0 }}>
          <Select {...selectBaseProps} value={field.species} onChange={(v) => onRowChange(index, 'species', v)} placeholder="species" style={{ width: '100%' }}>
            {species.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="Age" style={{ flex: `0 0 ${smallInputPercent}`, minWidth: 0, marginBottom: 0 }}>
          <Input value={field.age} onChange={(e) => onRowChange(index, 'age', e.target.value)} placeholder="age" />
        </Form.Item>
        <Form.Item label="Weight" style={{ flex: `0 0 ${smallInputPercent}`, minWidth: 0, marginBottom: 0 }}>
          <Input value={field.weight} onChange={(e) => onRowChange(index, 'weight', e.target.value)} placeholder="weight" />
        </Form.Item>
        <Form.Item label="Strain" style={{ flex: `0 0 ${percentAge}`, minWidth: 0, marginBottom: 0 }}>
          <Select {...selectBaseProps} value={field.strain} onChange={(v) => onRowChange(index, 'strain', v)} style={{ width: '100%' }}>
            {strainData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
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
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <p className="step-title">Subjects</p>

      {/* ── FORK QUESTION ── */}
      <Form.Item label="Are subjects organised into groups?">
        <Radio.Group value={mode} onChange={handleModeChange}>
          <Radio.Button value="flat">No — single list</Radio.Button>
          <Radio.Button value="grouped">Yes — multiple groups</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form form={form} layout="vertical" onValuesChange={() => {}}>

        {/* ── FLAT MODE (original behaviour) ── */}
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
              />
            ))}
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }} className="add-contributor-button">
                Add new subject
              </Button>
            </div>
          </>
        )}

        {/* ── GROUPED MODE (new behaviour) ── */}
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
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
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
                    disabled={groups.length === 1}   // keep at least one group
                  >
                    Remove group
                  </Button>
                </div>

                {/* Subjects inside this group */}
                {group.subjects.map((field, si) => (
                  <SubjectRow
                    key={field.id}
                    field={field}
                    index={si}
                    label={`Subject ${si + 1}`}
                    onRemove={(i)        => removeSubjectFromGroup(gi, i)}
                    onDuplicate={(i)     => duplicateSubjectInGroup(gi, i)}
                    onChange={(i, f, v)  => handleGroupSubjectChange(gi, i, f, v)}
                  />
                ))}

                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Button type="dashed" onClick={() => addSubjectToGroup(gi)} style={{ width: '40%' }}>
                    + Add subject to {group.name}
                  </Button>
                </div>
              </div>
            ))}

            {/* Add group button */}
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