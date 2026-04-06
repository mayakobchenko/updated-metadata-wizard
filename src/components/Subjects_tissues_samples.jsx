import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Radio, Tabs } from 'antd'

const { Option } = Select
const { TabPane } = Tabs

// ─── unit filter lists ───────────────────────────────────────────────────────

const AGE_UNIT_NAMES = new Set([
  'year', 'month', 'week', 'day',
  'postnatal day', 'embryonic day',
  'hour', 'minute', 'second', 'millisecond'
])

const WEIGHT_UNIT_NAMES = new Set([
  'gram', 'kilogram',
  //'milligram per kilogram body weight'
])

// ─── label style — small gray ────────────────────────────────────────────────

const LABEL_STYLE = { fontSize: 11, color: '#888', marginBottom: 2 }

// ─── helpers ─────────────────────────────────────────────────────────────────

const newSubject = () => ({
  id: Date.now() + Math.random(),
  subjectID: '', age: '', ageUnit: '', weight: '', weightUnit: '',
  ageCategory: '', bioSex: '', disease: [], diseaseModel: [],
  handedness: '', species: '', strain: '',
  subjectAttribute: [], additionalRemarks: '', file_path: ''
})

const newTissueSample = () => ({
  id: Date.now() + Math.random(),
  sampleID: '', type: '', species: '', strain: '',
  biologicalSex: '', laterality: '', origin: '',
  age: '', ageUnit: '', weight: '', weightUnit: '',
  pathology: [], tissueSampleAttribute: [], additionalRemarks: ''
})

const newTissueSampleCollection = () => ({
  id: Date.now() + Math.random(),
  collectionID: '', samples: [newTissueSample()]
})

const newGroup = (index) => ({
  id: Date.now() + Math.random(),
  name: `Group ${index + 1}`,
  additionalRemarks: '',
  subjects: [newSubject()]
})

// ─── shared compact select props ────────────────────────────────────────────

const sel = (extraStyle = {}) => ({
  showSearch: true,
  optionFilterProp: 'children',
  allowClear: true,
  style: { width: '100%', ...extraStyle },
})

// ─── SubjectRow ──────────────────────────────────────────────────────────────

const SubjectRow = ({
  field, index, onRemove, onDuplicate, onChange: onRowChange, label,
  biosex, agecategory, species, strainData,
  diseaseData, diseaseModelData, subjectAttributeData,
  handedness, ageUnits, weightUnits,
}) => {
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  const itemStyle = (w) => ({ flex: `0 0 ${w}`, marginBottom: 0, minWidth: 0 })

  return (
    <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>

      {/* ── ID row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13, fontWeight: 500 }}>
          {label ?? `Subject ${index + 1}`}, id:
        </span>
        <Input
          value={field.subjectID}
          onChange={(e) => onRowChange(index, 'subjectID', e.target.value)}
          placeholder="Generic id"
          style={{ flex: '1 1 180px', maxWidth: 260 }}
          size="small"
        />
        <Button size="small" type="text" danger onClick={() => onRemove(index)} className="remove-text-btn">
          Remove
        </Button>
        <Button size="small" type="text" onClick={() => onDuplicate(index)} className="duplicate-text-btn">
          Duplicate
        </Button>
      </div>

      {/* ── attributes ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>

        <Form.Item label={<span style={LABEL_STYLE}>Sex</span>} style={itemStyle('130px')}>
          <Select {...sel()} size="small"
            value={field.bioSex || undefined}
            onChange={(v) => onRowChange(index, 'bioSex', v ?? '')}
            placeholder="sex"
          >
            {biosex.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Age category</span>} style={itemStyle('150px')}>
          <Select {...sel()} size="small"
            value={field.ageCategory || undefined}
            onChange={(v) => onRowChange(index, 'ageCategory', v ?? '')}
            placeholder="age category"
          >
            {agecategory.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Species</span>} style={itemStyle('170px')}>
          <Select {...sel()} size="small"
            value={field.species || undefined}
            onChange={(v) => onRowChange(index, { species: v ?? '', strain: '' })}
            placeholder="species"
          >
            {species.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Strain</span>} style={itemStyle('150px')}>
          <Select {...sel()} size="small"
            value={field.strain || undefined}
            onChange={(v) => onRowChange(index, 'strain', v ?? '')}
            placeholder={!field.species ? 'select species first' : filteredStrain.length === 0 ? 'none' : 'strain'}
            disabled={!field.species || filteredStrain.length === 0}
          >
            {filteredStrain.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        {/* age value + unit */}
        <Form.Item label={<span style={LABEL_STYLE}>Age</span>} style={itemStyle('190px')}>
          <Input.Group compact>
            <Input
              size="small"
              value={field.age}
              onChange={(e) => onRowChange(index, 'age', e.target.value)}
              placeholder="value"
              style={{ width: '40%' }}
            />
            <Select {...sel()} size="small"
              value={field.ageUnit || undefined}
              onChange={(v) => onRowChange(index, 'ageUnit', v ?? '')}
              placeholder="unit"
              style={{ width: '60%' }}
            >
              {ageUnits.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Input.Group>
        </Form.Item>

        {/* weight value + unit */}
        <Form.Item label={<span style={LABEL_STYLE}>Weight</span>} style={itemStyle('190px')}>
          <Input.Group compact>
            <Input
              size="small"
              value={field.weight}
              onChange={(e) => onRowChange(index, 'weight', e.target.value)}
              placeholder="value"
              style={{ width: '40%' }}
            />
            <Select {...sel()} size="small"
              value={field.weightUnit || undefined}
              onChange={(v) => onRowChange(index, 'weightUnit', v ?? '')}
              placeholder="unit"
              style={{ width: '60%' }}
            >
              {weightUnits.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Input.Group>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Pathology</span>} style={itemStyle('200px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.disease || []}
            onChange={(v) => onRowChange(index, 'disease', v)}
            placeholder="disease"
          >
            {diseaseData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Disease model</span>} style={itemStyle('200px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.diseaseModel || []}
            onChange={(v) => onRowChange(index, 'diseaseModel', v)}
            placeholder="disease model"
          >
            {diseaseModelData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Handedness</span>} style={itemStyle('130px')}>
          <Select {...sel()} size="small"
            value={field.handedness || undefined}
            onChange={(v) => onRowChange(index, 'handedness', v ?? '')}
            placeholder="handedness"
          >
            {handedness.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Attribute</span>} style={itemStyle('160px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.subjectAttribute || []}
            onChange={(v) => onRowChange(index, 'subjectAttribute', v)}
            placeholder="attribute"
          >
            {subjectAttributeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Remarks</span>} style={{ flex: '1 1 150px', marginBottom: 0, minWidth: 0 }}>
          <Input
            size="small"
            value={field.additionalRemarks || ''}
            onChange={(e) => onRowChange(index, 'additionalRemarks', e.target.value)}
            placeholder="remarks..."
          />
        </Form.Item>

      </div>
    </div>
  )
}

// ─── TissueSampleRow ─────────────────────────────────────────────────────────

const TissueSampleRow = ({
  field, index, onRemove, onDuplicate, onChange: onRowChange,
  species, strainData, biosex, lateralityData, originData,
  tissueSampleTypeData, diseaseData, diseaseModelData,
  tissueSampleAttributeData, ageUnits, weightUnits,
}) => {
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  const itemStyle = (w) => ({ flex: `0 0 ${w}`, marginBottom: 0, minWidth: 0 })

  return (
    <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13, fontWeight: 500 }}>
          Sample {index + 1}, id:
        </span>
        <Input
          size="small"
          value={field.sampleID}
          onChange={(e) => onRowChange(index, 'sampleID', e.target.value)}
          placeholder="Sample id"
          style={{ flex: '1 1 180px', maxWidth: 260 }}
        />
        <Button size="small" type="text" danger onClick={() => onRemove(index)}>Remove</Button>
        <Button size="small" type="text" onClick={() => onDuplicate(index)}>Duplicate</Button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>

        <Form.Item label={<span style={LABEL_STYLE}>Type</span>} style={itemStyle('160px')}>
          <Select {...sel()} size="small"
            value={field.type || undefined}
            onChange={(v) => onRowChange(index, 'type', v ?? '')}
            placeholder="sample type"
          >
            {tissueSampleTypeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Species</span>} style={itemStyle('160px')}>
          <Select {...sel()} size="small"
            value={field.species || undefined}
            onChange={(v) => onRowChange(index, { species: v ?? '', strain: '' })}
            placeholder="species"
          >
            {species.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Strain</span>} style={itemStyle('150px')}>
          <Select {...sel()} size="small"
            value={field.strain || undefined}
            onChange={(v) => onRowChange(index, 'strain', v ?? '')}
            placeholder={!field.species ? 'select species first' : filteredStrain.length === 0 ? 'none' : 'strain'}
            disabled={!field.species || filteredStrain.length === 0}
          >
            {filteredStrain.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Sex</span>} style={itemStyle('120px')}>
          <Select {...sel()} size="small"
            value={field.biologicalSex || undefined}
            onChange={(v) => onRowChange(index, 'biologicalSex', v ?? '')}
            placeholder="sex"
          >
            {biosex.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Laterality</span>} style={itemStyle('130px')}>
          <Select {...sel()} size="small"
            value={field.laterality || undefined}
            onChange={(v) => onRowChange(index, 'laterality', v ?? '')}
            placeholder="laterality"
          >
            {lateralityData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Origin</span>} style={itemStyle('160px')}>
          <Select {...sel()} size="small"
            value={field.origin || undefined}
            onChange={(v) => onRowChange(index, 'origin', v ?? '')}
            placeholder="origin"
          >
            {originData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Age</span>} style={itemStyle('185px')}>
          <Input.Group compact>
            <Input size="small" value={field.age}
              onChange={(e) => onRowChange(index, 'age', e.target.value)}
              placeholder="value" style={{ width: '40%' }}
            />
            <Select {...sel()} size="small"
              value={field.ageUnit || undefined}
              onChange={(v) => onRowChange(index, 'ageUnit', v ?? '')}
              placeholder="unit" style={{ width: '60%' }}
            >
              {ageUnits.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Input.Group>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Weight</span>} style={itemStyle('185px')}>
          <Input.Group compact>
            <Input size="small" value={field.weight}
              onChange={(e) => onRowChange(index, 'weight', e.target.value)}
              placeholder="value" style={{ width: '40%' }}
            />
            <Select {...sel()} size="small"
              value={field.weightUnit || undefined}
              onChange={(v) => onRowChange(index, 'weightUnit', v ?? '')}
              placeholder="unit" style={{ width: '60%' }}
            >
              {weightUnits.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select>
          </Input.Group>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Pathology</span>} style={itemStyle('190px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.pathology || []}
            onChange={(v) => onRowChange(index, 'pathology', v)}
            placeholder="disease / model"
          >
            <Select.OptGroup label="Disease">
              {diseaseData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select.OptGroup>
            <Select.OptGroup label="Disease Model">
              {diseaseModelData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
            </Select.OptGroup>
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Attribute</span>} style={itemStyle('160px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.tissueSampleAttribute || []}
            onChange={(v) => onRowChange(index, 'tissueSampleAttribute', v)}
            placeholder="attribute"
          >
            {tissueSampleAttributeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Remarks</span>} style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <Input size="small"
            value={field.additionalRemarks || ''}
            onChange={(e) => onRowChange(index, 'additionalRemarks', e.target.value)}
            placeholder="remarks..."
          />
        </Form.Item>

      </div>
    </div>
  )
}

// ─── Subjects component ──────────────────────────────────────────────────────

export default function Subjects({ form, onChange, data = {} }) {

  // ── dropdown data ─────────────────────────────────────────────────────────
  const [agecategory, setAgeCat]                       = useState([])
  const [biosex, setBiosex]                             = useState([])
  const [handedness, setHandedness]                     = useState([])
  const [species, setSpecies]                           = useState([])
  const [strainData, setStrainData]                     = useState([])
  const [diseaseData, setDiseaseData]                   = useState([])
  const [diseaseModelData, setDiseaseModelData]         = useState([])
  const [subjectAttributeData, setSubjectAttributeData] = useState([])
  const [tissueSampleTypeData, setTissueSampleTypeData] = useState([])
  const [lateralityData, setLateralityData]             = useState([])
  const [originData, setOriginData]                     = useState([])
  const [tissueSampleAttributeData, setTissueSampleAttributeData] = useState([])
  const [allUnits, setAllUnits]                         = useState([])

  // ── subject state ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState(
    data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat'
  )
  const [subjectsData, setSubjectData] = useState(
    data.subjectMetadata?.subjects || []
  )
  const [groups, setGroups] = useState(
    data.subjectMetadata?.subjectGroups || []
  )

  // ── tissue sample state ───────────────────────────────────────────────────
  const [tissueCollections, setTissueCollections] = useState(
    data.subjectMetadata?.tissueCollections || []
  )
  const [tissueSamples, setTissueSamples] = useState(
    data.subjectMetadata?.tissueSamples || []
  )
  const [tissueMode, setTissueMode] = useState(
    data.subjectMetadata?.tissueCollections ? 'collections' : 'flat'
  )

  // ── derived unit lists ────────────────────────────────────────────────────
  const ageUnits    = allUnits.filter(u => AGE_UNIT_NAMES.has(u.name))
  const weightUnits = allUnits.filter(u => WEIGHT_UNIT_NAMES.has(u.name))

  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects       || [])
    setGroups(data.subjectMetadata?.subjectGroups       || [])
    setMode(data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat')
    setTissueCollections(data.subjectMetadata?.tissueCollections || [])
    setTissueSamples(data.subjectMetadata?.tissueSamples         || [])
  }, [data])

  useEffect(() => {
    const fetcher = (url, setter, key) => async () => {
      try {
        const res  = await fetch(url)
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        setter(Array.isArray(json[key]) ? json[key] : [])
      } catch (e) { console.error(`Error fetching ${url}:`, e) }
    }
    fetcher('api/subjects/disease',          setDiseaseData,           'disease')()
    fetcher('api/subjects/diseasemodel',      setDiseaseModelData,      'diseaseModel')()
    fetcher('api/subjects/strain',            setStrainData,            'strain')()
    fetcher('api/subjects/sex',               setBiosex,                'biosex')()
    fetcher('api/subjects/agecategory',       setAgeCat,                'age_cat')()
    fetcher('api/subjects/handedness',        setHandedness,            'handedness')()
    fetcher('api/subjects/species',           setSpecies,               'species')()
    fetcher('api/subjects/units',             setAllUnits,              'units')()
    fetcher('api/subjects/subjectattribute',  setSubjectAttributeData,  'subjectAttribute')()
    fetcher('api/subjects/tissuesampletype',  setTissueSampleTypeData,  'tissueSampleType')()
    fetcher('api/subjects/laterality',        setLateralityData,        'laterality')()
    fetcher('api/subjects/origin',            setOriginData,            'origin')()
    fetcher('api/subjects/tissuesampleattribute', setTissueSampleAttributeData, 'tissueSampleAttribute')()
  }, [])

  const emit = (patch) =>
    onChange({ subjectMetadata: { ...data.subjectMetadata, ...patch } })

  const subjectRowProps = {
    biosex, agecategory, species, strainData,
    diseaseData, diseaseModelData, subjectAttributeData,
    handedness, ageUnits, weightUnits,
  }

  const tissueRowProps = {
    species, strainData, biosex, lateralityData,
    originData, tissueSampleTypeData,
    diseaseData, diseaseModelData, tissueSampleAttributeData,
    ageUnits, weightUnits,
  }

  // ── subject mode switch ───────────────────────────────────────────────────
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

  // ── flat subject handlers ─────────────────────────────────────────────────
  const handleSubjectChange = (i, fieldOrPatch, value) => {
    const updated = subjectsData.map((s, idx) => {
      if (idx !== i) return s
      if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
      return { ...s, [fieldOrPatch]: value }
    })
    setSubjectData(updated)
    emit({ subjects: updated })
  }

  const addNewSubject    = () => { const u = [...subjectsData, newSubject()]; setSubjectData(u); emit({ subjects: u }) }
  const removeSubject    = (i) => { const u = subjectsData.filter((_, idx) => idx !== i); setSubjectData(u); emit({ subjects: u }) }
  const duplicateSubject = (i) => {
    const u = [...subjectsData.slice(0, i + 1), { ...subjectsData[i], id: Date.now() + Math.random() }, ...subjectsData.slice(i + 1)]
    setSubjectData(u); emit({ subjects: u })
  }

  // ── group handlers ────────────────────────────────────────────────────────
  const updateGroups = (next) => { setGroups(next); emit({ subjectGroups: next }) }

  const addGroup    = () => updateGroups([...groups, newGroup(groups.length)])
  const removeGroup = (gi) => updateGroups(groups.filter((_, i) => i !== gi))

  const duplicateGroup = (gi) => {
    const copy = { ...groups[gi], id: Date.now() + Math.random(), name: `${groups[gi].name} (copy)`, subjects: groups[gi].subjects.map(s => ({ ...s, id: Date.now() + Math.random() })) }
    updateGroups([...groups.slice(0, gi + 1), copy, ...groups.slice(gi + 1)])
  }

  const renameGroup        = (gi, name)              => updateGroups(groups.map((g, i) => i === gi ? { ...g, name } : g))
  const updateGroupRemarks = (gi, additionalRemarks) => updateGroups(groups.map((g, i) => i === gi ? { ...g, additionalRemarks } : g))
  const addSubjectToGroup  = (gi)                    => updateGroups(groups.map((g, i) => i === gi ? { ...g, subjects: [...g.subjects, newSubject()] } : g))

  const removeSubjectFromGroup    = (gi, si) => updateGroups(groups.map((g, i) => i === gi ? { ...g, subjects: g.subjects.filter((_, j) => j !== si) } : g))
  const duplicateSubjectInGroup   = (gi, si) => updateGroups(groups.map((g, i) => {
    if (i !== gi) return g
    const copy = { ...g.subjects[si], id: Date.now() + Math.random() }
    return { ...g, subjects: [...g.subjects.slice(0, si + 1), copy, ...g.subjects.slice(si + 1)] }
  }))

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

  // ── flat tissue sample handlers ───────────────────────────────────────────
  const handleTissueSampleChange = (i, fieldOrPatch, value) => {
    const updated = tissueSamples.map((s, idx) => {
      if (idx !== i) return s
      if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
      return { ...s, [fieldOrPatch]: value }
    })
    setTissueSamples(updated)
    emit({ tissueSamples: updated })
  }

  const addTissueSample    = () => { const u = [...tissueSamples, newTissueSample()]; setTissueSamples(u); emit({ tissueSamples: u }) }
  const removeTissueSample = (i) => { const u = tissueSamples.filter((_, idx) => idx !== i); setTissueSamples(u); emit({ tissueSamples: u }) }
  const duplicateTissueSample = (i) => {
    const u = [...tissueSamples.slice(0, i + 1), { ...tissueSamples[i], id: Date.now() + Math.random() }, ...tissueSamples.slice(i + 1)]
    setTissueSamples(u); emit({ tissueSamples: u })
  }

  // ── tissue collection handlers ────────────────────────────────────────────
  const updateCollections = (next) => { setTissueCollections(next); emit({ tissueCollections: next }) }

  const addCollection    = () => updateCollections([...tissueCollections, newTissueSampleCollection()])
  const removeCollection = (ci) => updateCollections(tissueCollections.filter((_, i) => i !== ci))

  const renameCollection = (ci, collectionID) =>
    updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, collectionID } : c))

  const addSampleToCollection    = (ci) => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, samples: [...c.samples, newTissueSample()] } : c))
  const removeSampleFromCollection = (ci, si) => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, samples: c.samples.filter((_, j) => j !== si) } : c))
  const duplicateSampleInCollection = (ci, si) => updateCollections(tissueCollections.map((c, i) => {
    if (i !== ci) return c
    const copy = { ...c.samples[si], id: Date.now() + Math.random() }
    return { ...c, samples: [...c.samples.slice(0, si + 1), copy, ...c.samples.slice(si + 1)] }
  }))
  const handleCollectionSampleChange = (ci, si, fieldOrPatch, value) =>
    updateCollections(tissueCollections.map((c, i) => {
      if (i !== ci) return c
      const samples = c.samples.map((s, j) => {
        if (j !== si) return s
        if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
        return { ...s, [fieldOrPatch]: value }
      })
      return { ...c, samples }
    }))

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <p className="step-title">Subjects & Tissue Samples</p>

      <Tabs defaultActiveKey="subjects">

        {/* ══ SUBJECTS TAB ══════════════════════════════════════════════════ */}
        <TabPane tab="Subjects" key="subjects">

          <Form.Item label={<span style={LABEL_STYLE}>Are subjects organised into groups?</span>}>
            <Radio.Group value={mode} onChange={handleModeChange}>
              <Radio.Button value="flat">No — single list</Radio.Button>
              <Radio.Button value="grouped">Yes — groups</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form form={form} layout="vertical" onValuesChange={() => {}}>

            {/* ── FLAT ── */}
            {mode === 'flat' && (
              <>
                {subjectsData.map((field, index) => (
                  <SubjectRow
                    key={field.id} field={field} index={index}
                    onRemove={removeSubject} onDuplicate={duplicateSubject}
                    onChange={handleSubjectChange}
                    {...subjectRowProps}
                  />
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }} className="add-contributor-button">
                    Add new subject
                  </Button>
                </div>
              </>
            )}

            {/* ── GROUPED ── */}
            {mode === 'grouped' && (
              <>
                {groups.map((group, gi) => (
                  <div key={group.id} style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: '14px 18px', marginBottom: 20, background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Input value={group.name} onChange={(e) => renameGroup(gi, e.target.value)}
                        style={{ fontWeight: 600, width: 200 }} placeholder={`Group ${gi + 1} name`} size="small"
                      />
                      <Button size="small" type="text" onClick={() => duplicateGroup(gi)}>Duplicate group</Button>
                      <Button size="small" type="text" danger onClick={() => removeGroup(gi)} disabled={groups.length === 1}>Remove group</Button>
                    </div>
                    <Form.Item label={<span style={LABEL_STYLE}>Group remarks</span>} style={{ marginBottom: 12 }}>
                      <Input size="small" value={group.additionalRemarks || ''}
                        onChange={(e) => updateGroupRemarks(gi, e.target.value)}
                        placeholder="Additional remarks about this group..."
                      />
                    </Form.Item>
                    {group.subjects.map((field, si) => (
                      <SubjectRow
                        key={field.id} field={field} index={si} label={`Subject ${si + 1}`}
                        onRemove={(i) => removeSubjectFromGroup(gi, i)}
                        onDuplicate={(i) => duplicateSubjectInGroup(gi, i)}
                        onChange={(i, fOrP, val) => handleGroupSubjectChange(gi, i, fOrP, val)}
                        {...subjectRowProps}
                      />
                    ))}
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Button type="dashed" size="small" onClick={() => addSubjectToGroup(gi)} style={{ width: '40%' }}>
                        + Add subject to {group.name}
                      </Button>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addGroup} style={{ width: '30%' }} className="add-contributor-button">
                    + Add new group
                  </Button>
                </div>
              </>
            )}
          </Form>
        </TabPane>

        {/* ══ TISSUE SAMPLES TAB ════════════════════════════════════════════ */}
        <TabPane tab="Tissue Samples" key="tissue">

          <Form.Item label={<span style={LABEL_STYLE}>Are tissue samples organised into collections?</span>} style={{ marginBottom: 12 }}>
            <Radio.Group value={tissueMode} onChange={(e) => setTissueMode(e.target.value)}>
              <Radio.Button value="flat">No — single list</Radio.Button>
              <Radio.Button value="collections">Yes — collections</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form form={form} layout="vertical" onValuesChange={() => {}}>

            {/* ── FLAT TISSUE ── */}
            {tissueMode === 'flat' && (
              <>
                {tissueSamples.map((field, index) => (
                  <TissueSampleRow
                    key={field.id} field={field} index={index}
                    onRemove={removeTissueSample}
                    onDuplicate={duplicateTissueSample}
                    onChange={handleTissueSampleChange}
                    {...tissueRowProps}
                  />
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addTissueSample} style={{ width: '30%' }}>
                    Add tissue sample
                  </Button>
                </div>
              </>
            )}

            {/* ── COLLECTIONS ── */}
            {tissueMode === 'collections' && (
              <>
                {tissueCollections.map((collection, ci) => (
                  <div key={collection.id} style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: '14px 18px', marginBottom: 20, background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Input
                        size="small"
                        value={collection.collectionID}
                        onChange={(e) => renameCollection(ci, e.target.value)}
                        style={{ fontWeight: 600, width: 220 }}
                        placeholder={`Collection ${ci + 1} id`}
                      />
                      <Button size="small" type="text" danger onClick={() => removeCollection(ci)}
                        disabled={tissueCollections.length === 1}>
                        Remove collection
                      </Button>
                    </div>
                    {collection.samples.map((field, si) => (
                      <TissueSampleRow
                        key={field.id} field={field} index={si}
                        onRemove={(i) => removeSampleFromCollection(ci, i)}
                        onDuplicate={(i) => duplicateSampleInCollection(ci, i)}
                        onChange={(i, fOrP, val) => handleCollectionSampleChange(ci, i, fOrP, val)}
                        {...tissueRowProps}
                      />
                    ))}
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Button type="dashed" size="small" onClick={() => addSampleToCollection(ci)} style={{ width: '40%' }}>
                        + Add sample to collection {ci + 1}
                      </Button>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addCollection} style={{ width: '30%' }}>
                    + Add new collection
                  </Button>
                </div>
              </>
            )}
          </Form>
        </TabPane>
      </Tabs>
    </div>
  )
}