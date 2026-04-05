import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Radio } from 'antd'

const { Option } = Select

// ─── helpers ────────────────────────────────────────────────────────────────

const newSubject = () => ({
  id:                Date.now() + Math.random(),
  subjectID:         '',
  age:               '',
  weight:            '',
  ageCategory:       '',
  bioSex:            '',
  disease:           '',
  handedness:        '',
  species:           '',
  strain:            '',
  additionalRemarks: '',
  file_path:         ''
})

const newGroup = (index) => ({
  id:                Date.now() + Math.random(),
  name:              `Group ${index + 1}`,
  additionalRemarks: '',
  subjects:          [newSubject()]
})

// ─── SubjectRow ──────────────────────────────────────────────────────────────

const SubjectRow = ({
  field, index, onRemove, onDuplicate, onChange: onRowChange, label,
  biosex, agecategory, species, strainData, diseaseData, handedness,
}) => {

  // filter strain by selected species identifier
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  // shared Select props — no getPopupContainer, no popupMatchSelectWidth issues
  const sel = {
    showSearch:       true,
    optionFilterProp: 'children',
    style:            { width: '100%' },
    allowClear:       true,
  }

  return (
    <div style={{ marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>

      {/* ── subject ID row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="subject-subtitle" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          {label ?? `Subject ${index + 1}`}, id:
        </span>
        <Input
          value={field.subjectID}
          onChange={(e) => onRowChange(index, 'subjectID', e.target.value)}
          placeholder="Generic id"
          style={{ flex: '1 1 200px', maxWidth: 300 }}
        />
        <Button type="text" onClick={() => onRemove(index)} className="remove-text-btn">
          Remove
        </Button>
        <Button type="text" onClick={() => onDuplicate(index)} className="duplicate-text-btn">
          Duplicate
        </Button>
      </div>

      {/* ── attributes row ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>

        <Form.Item label="Sex" style={{ flex: '0 0 100px', marginBottom: 0 }}>
          <Select
            {...sel}
            value={field.bioSex || undefined}
            onChange={(v) => onRowChange(index, 'bioSex', v ?? '')}
            placeholder="sex"
          >
            {biosex.map(o => (
              <Option key={o.identifier} value={o.identifier}>{o.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Age category" style={{ flex: '0 0 160px', marginBottom: 0 }}>
          <Select
            {...sel}
            value={field.ageCategory || undefined}
            onChange={(v) => onRowChange(index, 'ageCategory', v ?? '')}
            placeholder="age category"
          >
            {agecategory.map(o => (
              <Option key={o.identifier} value={o.identifier}>{o.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Species" style={{ flex: '0 0 160px', marginBottom: 0 }}>
          <Select
            {...sel}
            value={field.species || undefined}
            onChange={(v) => {
              // single atomic update for species + strain reset
              onRowChange(index, { species: v ?? '', strain: '' })
            }}
            placeholder="species"
          >
            {species.map(o => (
              <Option key={o.identifier} value={o.identifier}>{o.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Strain" style={{ flex: '0 0 160px', marginBottom: 0 }}>
          <Select
            {...sel}
            value={field.strain || undefined}
            onChange={(v) => onRowChange(index, 'strain', v ?? '')}
            placeholder={
              !field.species
                ? 'select species first'
                : filteredStrain.length === 0
                  ? 'none available'
                  : 'strain'
            }
            disabled={!field.species || filteredStrain.length === 0}
          >
            {filteredStrain.map(o => (
              <Option key={o.identifier} value={o.identifier}>{o.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Age" style={{ flex: '0 0 70px', marginBottom: 0 }}>
          <Input
            value={field.age}
            onChange={(e) => onRowChange(index, 'age', e.target.value)}
            placeholder="age"
          />
        </Form.Item>

        <Form.Item label="Weight" style={{ flex: '0 0 70px', marginBottom: 0 }}>
          <Input
            value={field.weight}
            onChange={(e) => onRowChange(index, 'weight', e.target.value)}
            placeholder="weight"
          />
        </Form.Item>

        <Form.Item label="Pathology" style={{ flex: '0 0 140px', marginBottom: 0 }}>
          <Select
            {...sel}
            value={field.disease || undefined}
            onChange={(v) => onRowChange(index, 'disease', v ?? '')}
            placeholder="pathology"
          >
            {diseaseData.map(o => (
              <Option key={o.identifier} value={o.identifier}>{o.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Handedness" style={{ flex: '0 0 120px', marginBottom: 0 }}>
          <Select
            {...sel}
            value={field.handedness || undefined}
            onChange={(v) => onRowChange(index, 'handedness', v ?? '')}
            placeholder="handedness"
          >
            {handedness.map(o => (
              <Option key={o.identifier} value={o.identifier}>{o.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Remarks" style={{ flex: '1 1 180px', marginBottom: 0 }}>
          <Input
            value={field.additionalRemarks || ''}
            onChange={(e) => onRowChange(index, 'additionalRemarks', e.target.value)}
            placeholder="additional remarks..."
          />
        </Form.Item>

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

  // sync when parent data changes
  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects     || [])
    setGroups(data.subjectMetadata?.subjectGroups     || [])
    setMode(data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat')
  }, [data])

  // fetch all dropdown options on mount
  useEffect(() => {
    const fetcher = (url, setter, key) => async () => {
      try {
        const res  = await fetch(url)
        if (!res.ok) throw new Error(`Fetch failed ${res.status}`)
        const json = await res.json()
        console.log(`Fetched ${url}:`, json[key]?.length, 'items')
        setter(Array.isArray(json[key]) ? json[key] : [])
      } catch (e) {
        console.error(`Error fetching ${url}:`, e)
      }
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

  const rowProps = {
    biosex, agecategory, species, strainData, diseaseData, handedness,
  }

  // ── mode switch ───────────────────────────────────────────────────────────
  const handleModeChange = (e) => {
    const next = e.target.value
    setMode(next)
    if (next === 'grouped') {
      const migrated = [{
        ...newGroup(0),
        subjects: subjectsData.length ? subjectsData : [newSubject()]
      }]
      setGroups(migrated)
      emit({ subjectGroups: migrated, subjects: undefined })
    } else {
      const flat = groups.flatMap(g => g.subjects)
      setSubjectData(flat)
      emit({ subjects: flat, subjectGroups: undefined })
    }
  }

  // ── flat handlers ─────────────────────────────────────────────────────────
  // accepts (index, field, value)  — single field update
  // or      (index, patchObject)   — atomic multi-field update
  const handleSubjectChange = (i, fieldOrPatch, value) => {
    const updated = subjectsData.map((s, idx) => {
      if (idx !== i) return s
      if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
      return { ...s, [fieldOrPatch]: value }
    })
    setSubjectData(updated)
    emit({ subjects: updated })
  }

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

  // ── group handlers ────────────────────────────────────────────────────────
  const updateGroups = (next) => {
    setGroups(next)
    emit({ subjectGroups: next })
  }

  const addGroup = () =>
    updateGroups([...groups, newGroup(groups.length)])

  const removeGroup = (gi) =>
    updateGroups(groups.filter((_, i) => i !== gi))

  const duplicateGroup = (gi) => {
    const copy = {
      ...groups[gi],
      id:       Date.now() + Math.random(),
      name:     `${groups[gi].name} (copy)`,
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
      const copy     = { ...g.subjects[si], id: Date.now() + Math.random() }
      const subjects = [
        ...g.subjects.slice(0, si + 1),
        copy,
        ...g.subjects.slice(si + 1)
      ]
      return { ...g, subjects }
    }))

  // accepts (gi, si, field, value) or (gi, si, patchObject)
  const handleGroupSubjectChange = (gi, si, fieldOrPatch, value) =>
    updateGroups(groups.map((g, i) => {
      if (i !== gi) return g
      const subjects = g.subjects.map((s, j) => {
        if (j !== si) return s
        if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
        return { ...s, [fieldOrPatch]: value }
      })
      return { ...g, subjects }
    }))

  // ── render ────────────────────────────────────────────────────────────────
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
              <Button
                type="dashed"
                onClick={addNewSubject}
                style={{ width: '30%' }}
                className="add-contributor-button"
              >
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
                  border:       '1px solid #d9d9d9',
                  borderRadius: 8,
                  padding:      '16px 20px',
                  marginBottom: 24,
                  background:   '#fafafa'
                }}
              >
                {/* group header */}
                <div style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           12,
                  marginBottom:  12
                }}>
                  <Input
                    value={group.name}
                    onChange={(e) => renameGroup(gi, e.target.value)}
                    style={{ fontWeight: 600, width: 220 }}
                    placeholder={`Group ${gi + 1} name`}
                  />
                  <Button
                    type="text"
                    onClick={() => duplicateGroup(gi)}
                    className="duplicate-text-btn"
                  >
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
                <Form.Item label="Group additional remarks" style={{ marginBottom: 16 }}>
                  <Input
                    value={group.additionalRemarks || ''}
                    onChange={(e) => updateGroupRemarks(gi, e.target.value)}
                    placeholder="Any additional remarks about this group..."
                  />
                </Form.Item>

                {/* subjects */}
                {group.subjects.map((field, si) => (
                  <SubjectRow
                    key={field.id}
                    field={field}
                    index={si}
                    label={`Subject ${si + 1}`}
                    onRemove={(i)              => removeSubjectFromGroup(gi, i)}
                    onDuplicate={(i)           => duplicateSubjectInGroup(gi, i)}
                    onChange={(i, fOrP, val)   => handleGroupSubjectChange(gi, i, fOrP, val)}
                    {...rowProps}
                  />
                ))}

                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Button
                    type="dashed"
                    onClick={() => addSubjectToGroup(gi)}
                    style={{ width: '40%' }}
                  >
                    + Add subject to {group.name}
                  </Button>
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <Button
                type="dashed"
                onClick={addGroup}
                style={{ width: '30%' }}
                className="add-contributor-button"
              >
                + Add new group
              </Button>
            </div>
          </>
        )}

      </Form>
    </div>
  )
}