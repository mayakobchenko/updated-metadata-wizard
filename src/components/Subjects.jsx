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
  'milligram per kilogram body weight'
])

// ─── label style ─────────────────────────────────────────────────────────────

const LABEL_STYLE = { fontSize: 11, color: '#888', marginBottom: 2 }

// ─── value+unit field (replaces deprecated Input.Group) ──────────────────────

const ValueUnitField = ({ value, unit, onValueChange, onUnitChange, units, valuePlaceholder = 'value' }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    <Input
      size="small"
      value={value}
      onChange={onValueChange}
      placeholder={valuePlaceholder}
      style={{ width: '40%', minWidth: 0 }}
    />
    <Select
      showSearch
      allowClear
      optionFilterProp="children"
      size="small"
      value={unit || undefined}
      onChange={onUnitChange}
      placeholder="unit"
      style={{ width: '60%', minWidth: 0 }}
    >
      {units.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
    </Select>
  </div>
)

// ─── helpers ─────────────────────────────────────────────────────────────────

const newSubject = () => ({
  id: Date.now() + Math.random(),
  subjectID: '', age: '', ageUnit: '', weight: '', weightUnit: '',
  ageCategory: '', bioSex: '', disease: [], diseaseModel: [],
  handedness: '', species: '', strain: '',
  subjectAttribute: [], additionalRemarks: '', file_path: '',
  linkedSampleIds: []
})

const newTissueSample = () => ({
  id: Date.now() + Math.random(),
  sampleID: '', type: '', species: '', strain: '',
  biologicalSex: '', laterality: '', origin: '',
  age: '', ageUnit: '', weight: '', weightUnit: '',
  pathology: [], tissueSampleAttribute: [], additionalRemarks: '',
  linkedSubjectId: null
})

const newTissueSampleCollection = () => ({
  id: Date.now() + Math.random(),
  collectionID: '',
  additionalRemarks: '',
  samples: [newTissueSample()]
})

const newGroup = (index) => ({
  id: Date.now() + Math.random(),
  name: `Group ${index + 1}`,
  additionalRemarks: '',
  subjects: [newSubject()]
})

// ─── shared select props ─────────────────────────────────────────────────────

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
  allTissueSamples, allTissueCollections,
}) => {
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  const itemStyle = (w) => ({ flex: `0 0 ${w}`, marginBottom: 0, minWidth: 0 })

  const allSamplesForLinking = [
    ...allTissueSamples.map(s => ({
      id: s.id,
      label: s.sampleID || `Sample ${s.id}`,
    })),
    ...allTissueCollections.flatMap(c =>
      c.samples.map(s => ({
        id: s.id,
        label: `[${c.collectionID || 'Collection'}] ${s.sampleID || `Sample ${s.id}`}`,
      }))
    )
  ]

  return (
    <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>

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
        <Button size="small" type="text" danger onClick={() => onRemove(index)}>Remove</Button>
        <Button size="small" type="text" onClick={() => onDuplicate(index)}>Duplicate</Button>
      </div>

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

        <Form.Item label={<span style={LABEL_STYLE}>Species</span>} style={itemStyle('200px')}>
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
            placeholder={
              !field.species ? 'select species first'
              : filteredStrain.length === 0 ? 'none'
              : 'strain'
            }
            disabled={!field.species || filteredStrain.length === 0}
          >
            {filteredStrain.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Age</span>} style={itemStyle('195px')}>
          <ValueUnitField
            value={field.age}
            unit={field.ageUnit}
            onValueChange={(e) => onRowChange(index, 'age', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'ageUnit', v ?? '')}
            units={ageUnits}
          />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Weight</span>} style={itemStyle('195px')}>
          <ValueUnitField
            value={field.weight}
            unit={field.weightUnit}
            onValueChange={(e) => onRowChange(index, 'weight', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'weightUnit', v ?? '')}
            units={weightUnits}
          />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Pathology</span>} style={itemStyle('220px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={[...(field.disease || []), ...(field.diseaseModel || [])]}
            onChange={(v) => {
              const diseaseIds    = v.filter(id => diseaseData.find(d => d.identifier === id))
              const diseaseModIds = v.filter(id => diseaseModelData.find(d => d.identifier === id))
              onRowChange(index, { disease: diseaseIds, diseaseModel: diseaseModIds })
            }}
            placeholder="disease / model"
            optionFilterProp="label"
            filterOption={(input, option) => {
              if (!option || option.options) return false
              return (option.label || '').toString().toLowerCase().includes(input.toLowerCase())
            }}
          >
            <Select.OptGroup label="Disease">
              {diseaseData.map(o => <Option key={o.identifier} value={o.identifier} label={o.name}>{o.name}</Option>)}
            </Select.OptGroup>
            <Select.OptGroup label="Disease Model">
              {diseaseModelData.map(o => <Option key={o.identifier} value={o.identifier} label={o.name}>{o.name}</Option>)}
            </Select.OptGroup>
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

        {allSamplesForLinking.length > 0 && (
          <Form.Item label={<span style={LABEL_STYLE}>Extracted tissue samples</span>} style={itemStyle('220px')}>
            <Select {...sel()} size="small" mode="multiple"
              value={field.linkedSampleIds || []}
              onChange={(v) => onRowChange(index, 'linkedSampleIds', v)}
              placeholder="link tissue samples..."
            >
              {allSamplesForLinking.map(s => (
                <Option key={s.id} value={s.id}>{s.label}</Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item label={<span style={LABEL_STYLE}>Remarks</span>} style={{ flex: '1 1 150px', marginBottom: 0, minWidth: 0 }}>
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

// ─── TissueSampleRow ─────────────────────────────────────────────────────────

const TissueSampleRow = ({
  field, index, onRemove, onDuplicate, onChange: onRowChange,
  species, strainData, biosex, lateralityData, originData,
  tissueSampleTypeData, diseaseData, diseaseModelData,
  tissueSampleAttributeData, ageUnits, weightUnits,
  allSubjects, allGroups,
}) => {
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  const itemStyle = (w) => ({ flex: `0 0 ${w}`, marginBottom: 0, minWidth: 0 })

  const allSubjectsForLinking = [
    ...allSubjects.map(s => ({ id: s.id, label: s.subjectID || `Subject ${s.id}` })),
    ...allGroups.flatMap(g =>
      g.subjects.map(s => ({ id: s.id, label: `[${g.name}] ${s.subjectID || `Subject ${s.id}`}` }))
    )
  ]

  return (
    <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13, fontWeight: 500 }}>
          Sample {index + 1}, id:
        </span>
        <Input size="small"
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

        <Form.Item label={<span style={LABEL_STYLE}>Species</span>} style={itemStyle('200px')}>
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
            placeholder={
              !field.species ? 'select species first'
              : filteredStrain.length === 0 ? 'none'
              : 'strain'
            }
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

        <Form.Item label={<span style={LABEL_STYLE}>Origin</span>} style={itemStyle('200px')}>
          <Select {...sel()} size="small"
            value={field.origin || undefined}
            onChange={(v) => onRowChange(index, 'origin', v ?? '')}
            placeholder="origin"
            optionFilterProp="label"
            filterOption={(input, option) => {
              if (!option || option.options) return false
              return (option.label || '').toString().toLowerCase().includes(input.toLowerCase())
            }}
          >
            {[...new Set(originData.map(o => o.originType))].sort().map(type => (
              <Select.OptGroup key={type} label={type}>
                {originData
                  .filter(o => o.originType === type)
                  .map(o => (
                    <Option key={o.identifier} value={o.identifier} label={o.name}>
                      {o.name}
                    </Option>
                  ))}
              </Select.OptGroup>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Age</span>} style={itemStyle('195px')}>
          <ValueUnitField
            value={field.age}
            unit={field.ageUnit}
            onValueChange={(e) => onRowChange(index, 'age', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'ageUnit', v ?? '')}
            units={ageUnits}
          />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Weight</span>} style={itemStyle('195px')}>
          <ValueUnitField
            value={field.weight}
            unit={field.weightUnit}
            onValueChange={(e) => onRowChange(index, 'weight', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'weightUnit', v ?? '')}
            units={weightUnits}
          />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Pathology</span>} style={itemStyle('220px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.pathology || []}
            onChange={(v) => onRowChange(index, 'pathology', v)}
            placeholder="disease / model"
            optionFilterProp="label"
            filterOption={(input, option) => {
              if (!option || option.options) return false
              return (option.label || '').toString().toLowerCase().includes(input.toLowerCase())
            }}
          >
            <Select.OptGroup label="Disease">
              {diseaseData.map(o => <Option key={o.identifier} value={o.identifier} label={o.name}>{o.name}</Option>)}
            </Select.OptGroup>
            <Select.OptGroup label="Disease Model">
              {diseaseModelData.map(o => <Option key={o.identifier} value={o.identifier} label={o.name}>{o.name}</Option>)}
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

        {allSubjectsForLinking.length > 0 && (
          <Form.Item label={<span style={LABEL_STYLE}>Extracted from subject</span>} style={itemStyle('220px')}>
            <Select {...sel()} size="small"
              value={field.linkedSubjectId || undefined}
              onChange={(v) => onRowChange(index, 'linkedSubjectId', v ?? null)}
              placeholder="link to subject..."
            >
              {allSubjectsForLinking.map(s => (
                <Option key={s.id} value={s.id}>{s.label}</Option>
              ))}
            </Select>
          </Form.Item>
        )}

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

  const [agecategory, setAgeCat]                                 = useState([])
  const [biosex, setBiosex]                                       = useState([])
  const [handedness, setHandedness]                               = useState([])
  const [species, setSpecies]                                     = useState([])
  const [strainData, setStrainData]                               = useState([])
  const [diseaseData, setDiseaseData]                             = useState([])
  const [diseaseModelData, setDiseaseModelData]                   = useState([])
  const [subjectAttributeData, setSubjectAttributeData]           = useState([])
  const [tissueSampleTypeData, setTissueSampleTypeData]           = useState([])
  const [lateralityData, setLateralityData]                       = useState([])
  const [originData, setOriginData]                               = useState([])
  const [tissueSampleAttributeData, setTissueSampleAttributeData] = useState([])
  const [allUnits, setAllUnits]                                   = useState([])

  const [mode, setMode]                   = useState(data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat')
  const [subjectsData, setSubjectData]    = useState(data.subjectMetadata?.subjects || [])
  const [groups, setGroups]               = useState(data.subjectMetadata?.subjectGroups || [])
  const [tissueCollections, setTissueCollections] = useState(data.subjectMetadata?.tissueCollections || [])
  const [tissueSamples, setTissueSamples]         = useState(data.subjectMetadata?.tissueSamples || [])
  const [tissueMode, setTissueMode]       = useState(data.subjectMetadata?.tissueCollections?.length ? 'collections' : 'flat')

  const ageUnits    = allUnits.filter(u => AGE_UNIT_NAMES.has(u.name))
  const weightUnits = allUnits.filter(u => WEIGHT_UNIT_NAMES.has(u.name))

  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects            || [])
    setGroups(data.subjectMetadata?.subjectGroups            || [])
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
    fetcher('api/subjects/disease',              setDiseaseData,              'disease')()
    fetcher('api/subjects/diseasemodel',          setDiseaseModelData,         'diseaseModel')()
    fetcher('api/subjects/strain',                setStrainData,               'strain')()
    fetcher('api/subjects/sex',                   setBiosex,                   'biosex')()
    fetcher('api/subjects/agecategory',           setAgeCat,                   'age_cat')()
    fetcher('api/subjects/handedness',            setHandedness,               'handedness')()
    fetcher('api/subjects/species',               setSpecies,                  'species')()
    fetcher('api/subjects/units',                 setAllUnits,                 'units')()
    fetcher('api/subjects/subjectattribute',      setSubjectAttributeData,     'subjectAttribute')()
    fetcher('api/subjects/tissuesampletype',      setTissueSampleTypeData,     'tissueSampleType')()
    fetcher('api/subjects/laterality',            setLateralityData,           'laterality')()
    fetcher('api/subjects/origin',                setOriginData,               'origin')()
    fetcher('api/subjects/tissuesampleattribute', setTissueSampleAttributeData,'tissueSampleAttribute')()
  }, [])

  const emit = (patch) =>
    onChange({ subjectMetadata: { ...data.subjectMetadata, ...patch } })

  // ─── bidirectional link helpers ───────────────────────────────────────────

  const findSubjectById = (id, flatSubjects = subjectsData, grps = groups) => {
    if (!id) return null
    const flat = flatSubjects.find(s => s.id === id)
    if (flat) return flat
    for (const g of grps) {
      const found = g.subjects.find(s => s.id === id)
      if (found) return found
    }
    return null
  }

  // builds the prefill patch that goes INTO a tissue sample from a subject
  // age + ageUnit are now included so tissue inherits subject age on link
  const buildTissuePatchFromSubject = (subject) => ({
    linkedSubjectId: subject.id,
    species:         subject.species     || '',
    strain:          subject.strain      || '',
    biologicalSex:   subject.bioSex      || '',
    age:             subject.age         || '',
    ageUnit:         subject.ageUnit     || '',
    pathology: [
      ...(subject.disease      || []),
      ...(subject.diseaseModel || []),
    ]
    // weight intentionally NOT copied — tissue weight is independent
  })

  const patchFlatSamples = (samples, targetId, patch) =>
    samples.map(s => s.id === targetId ? { ...s, ...patch } : s)

  const patchCollectionSamples = (collections, targetId, patch) =>
    collections.map(c => ({
      ...c,
      samples: c.samples.map(s => s.id === targetId ? { ...s, ...patch } : s)
    }))

  const patchFlatSubjects = (subjects, targetId, patch) =>
    subjects.map(s => s.id === targetId ? { ...s, ...patch } : s)

  const patchGroupSubjects = (grps, targetId, patch) =>
    grps.map(g => ({
      ...g,
      subjects: g.subjects.map(s => s.id === targetId ? { ...s, ...patch } : s)
    }))

  // ── subject links samples → prefill tissues + set their linkedSubjectId ───
  const syncSubjectLinkedSamples = (
    subjectId, newSampleIds, prevSampleIds = [],
    flatSubjects = subjectsData, grps = groups
  ) => {
    const subject = findSubjectById(subjectId, flatSubjects, grps)
    if (!subject) return null

    const prevSet     = new Set(prevSampleIds.map(String))
    const newlyLinked = newSampleIds.filter(id => !prevSet.has(String(id)))
    const unlinked    = prevSampleIds.filter(id => !newSampleIds.map(String).includes(String(id)))

    let nextFlatSamples = [...tissueSamples]
    let nextCollections = [...tissueCollections]

    for (const sampleId of newlyLinked) {
      const patch = buildTissuePatchFromSubject(subject)
      nextFlatSamples = patchFlatSamples(nextFlatSamples, sampleId, patch)
      nextCollections = patchCollectionSamples(nextCollections, sampleId, patch)
    }

    for (const sampleId of unlinked) {
      const clearPatch = { linkedSubjectId: null }
      nextFlatSamples = patchFlatSamples(nextFlatSamples, sampleId, clearPatch)
      nextCollections = patchCollectionSamples(nextCollections, sampleId, clearPatch)
    }

    setTissueSamples(nextFlatSamples)
    setTissueCollections(nextCollections)
    return { tissueSamples: nextFlatSamples, tissueCollections: nextCollections }
  }

  // ── tissue links subject → prefill tissue + add sample to subject's list ──
  const syncTissueLinkedSubject = (sampleId, newSubjectId, prevSubjectId) => {
    const subject = findSubjectById(newSubjectId)
    const patch   = subject
      ? buildTissuePatchFromSubject(subject)
      : { linkedSubjectId: newSubjectId }

    // 1. prefill the tissue sample
    let nextFlatSamples = patchFlatSamples(tissueSamples, sampleId, patch)
    let nextCollections = patchCollectionSamples(tissueCollections, sampleId, patch)

    // 2. add sampleId to new subject's linkedSampleIds
    let nextFlatSubjects = subjectsData
    let nextGroups       = groups

    if (newSubjectId && subject) {
      const subjPatch = {
        linkedSampleIds: [...new Set([...(subject.linkedSampleIds || []), sampleId])]
      }
      nextFlatSubjects = patchFlatSubjects(subjectsData, newSubjectId, subjPatch)
      nextGroups       = patchGroupSubjects(groups, newSubjectId, subjPatch)
    }

    // 3. remove sampleId from previous subject's linkedSampleIds
    if (prevSubjectId && prevSubjectId !== newSubjectId) {
      const prevSubject = findSubjectById(prevSubjectId, nextFlatSubjects, nextGroups)
      if (prevSubject) {
        const removePatch = {
          linkedSampleIds: (prevSubject.linkedSampleIds || [])
            .filter(id => String(id) !== String(sampleId))
        }
        nextFlatSubjects = patchFlatSubjects(nextFlatSubjects, prevSubjectId, removePatch)
        nextGroups       = patchGroupSubjects(nextGroups, prevSubjectId, removePatch)
      }
    }

    setTissueSamples(nextFlatSamples)
    setTissueCollections(nextCollections)
    setSubjectData(nextFlatSubjects)
    setGroups(nextGroups)

    return {
      tissueSamples:    nextFlatSamples,
      tissueCollections: nextCollections,
      subjects:         nextFlatSubjects,
      subjectGroups:    nextGroups,
    }
  }

  // ── subject mode switch ───────────────────────────────────────────────────
  const handleModeChange = (e) => {
    const next = e.target.value
    setMode(next)
    if (next === 'grouped') {
      const migrated = [{ ...newGroup(0), subjects: subjectsData.length ? subjectsData : [newSubject()] }]
      setGroups(migrated); emit({ subjectGroups: migrated, subjects: undefined })
    } else {
      const flat = groups.flatMap(g => g.subjects)
      setSubjectData(flat); emit({ subjects: flat, subjectGroups: undefined })
    }
  }

  // ── flat subject handlers ─────────────────────────────────────────────────
  const handleSubjectChange = (i, fieldOrPatch, value) => {
    if (fieldOrPatch === 'linkedSampleIds') {
      const subject       = subjectsData[i]
      const prev          = subject?.linkedSampleIds || []
      const tissueUpdates = syncSubjectLinkedSamples(subject.id, value, prev)
      const updated       = subjectsData.map((s, idx) =>
        idx === i ? { ...s, linkedSampleIds: value } : s
      )
      setSubjectData(updated)
      emit({ subjects: updated, ...(tissueUpdates || {}) })
      return
    }
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
    const u = [
      ...subjectsData.slice(0, i + 1),
      { ...subjectsData[i], id: Date.now() + Math.random() },
      ...subjectsData.slice(i + 1)
    ]
    setSubjectData(u); emit({ subjects: u })
  }

  // ── group handlers ────────────────────────────────────────────────────────
  const updateGroups = (next) => { setGroups(next); emit({ subjectGroups: next }) }

  const addGroup           = ()         => updateGroups([...groups, newGroup(groups.length)])
  const removeGroup        = (gi)       => updateGroups(groups.filter((_, i) => i !== gi))
  const renameGroup        = (gi, name) => updateGroups(groups.map((g, i) => i === gi ? { ...g, name } : g))
  const updateGroupRemarks = (gi, r)    => updateGroups(groups.map((g, i) => i === gi ? { ...g, additionalRemarks: r } : g))
  const addSubjectToGroup  = (gi)       => updateGroups(groups.map((g, i) => i === gi ? { ...g, subjects: [...g.subjects, newSubject()] } : g))

  const duplicateGroup = (gi) => {
    const copy = {
      ...groups[gi],
      id:       Date.now() + Math.random(),
      name:     `${groups[gi].name} (copy)`,
      subjects: groups[gi].subjects.map(s => ({ ...s, id: Date.now() + Math.random() }))
    }
    updateGroups([...groups.slice(0, gi + 1), copy, ...groups.slice(gi + 1)])
  }

  const removeSubjectFromGroup  = (gi, si) =>
    updateGroups(groups.map((g, i) =>
      i === gi ? { ...g, subjects: g.subjects.filter((_, j) => j !== si) } : g
    ))

  const duplicateSubjectInGroup = (gi, si) =>
    updateGroups(groups.map((g, i) => {
      if (i !== gi) return g
      const copy = { ...g.subjects[si], id: Date.now() + Math.random() }
      return { ...g, subjects: [...g.subjects.slice(0, si + 1), copy, ...g.subjects.slice(si + 1)] }
    }))

  const handleGroupSubjectChange = (gi, si, fieldOrPatch, value) => {
    if (fieldOrPatch === 'linkedSampleIds') {
      const subject = groups[gi]?.subjects?.[si]
      const prev    = subject?.linkedSampleIds || []

      const nextGroups = groups.map((g, i) => {
        if (i !== gi) return g
        const subjects = g.subjects.map((s, j) =>
          j === si ? { ...s, linkedSampleIds: value } : s
        )
        return { ...g, subjects }
      })
      setGroups(nextGroups)

      const tissueUpdates = syncSubjectLinkedSamples(
        subject.id, value, prev, subjectsData, nextGroups
      )
      emit({ subjectGroups: nextGroups, ...(tissueUpdates || {}) })
      return
    }

    const nextGroups = groups.map((g, i) => {
      if (i !== gi) return g
      const subjects = g.subjects.map((s, j) => {
        if (j !== si) return s
        if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
        return { ...s, [fieldOrPatch]: value }
      })
      return { ...g, subjects }
    })
    updateGroups(nextGroups)
  }

  // ── flat tissue handlers ──────────────────────────────────────────────────
  const handleTissueSampleChange = (i, fieldOrPatch, value) => {
    if (fieldOrPatch === 'linkedSubjectId') {
      const sample        = tissueSamples[i]
      const prevSubjectId = sample?.linkedSubjectId
      const allUpdates    = syncTissueLinkedSubject(sample.id, value, prevSubjectId)
      emit(allUpdates)
      return
    }
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
    const u = [
      ...tissueSamples.slice(0, i + 1),
      { ...tissueSamples[i], id: Date.now() + Math.random() },
      ...tissueSamples.slice(i + 1)
    ]
    setTissueSamples(u); emit({ tissueSamples: u })
  }

  // ── collection handlers ───────────────────────────────────────────────────
  const updateCollections = (next) => { setTissueCollections(next); emit({ tissueCollections: next }) }

  const addCollection       = ()          => updateCollections([...tissueCollections, newTissueSampleCollection()])
  const removeCollection    = (ci)        => updateCollections(tissueCollections.filter((_, i) => i !== ci))
  const renameCollection    = (ci, id)    => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, collectionID: id } : c))
  const updateCollRemarks   = (ci, r)     => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, additionalRemarks: r } : c))

  const duplicateCollection = (ci) => {
    const copy = {
      ...tissueCollections[ci],
      id:                Date.now() + Math.random(),
      collectionID:      `${tissueCollections[ci].collectionID} (copy)`,
      additionalRemarks: tissueCollections[ci].additionalRemarks || '',
      samples:           tissueCollections[ci].samples.map(s => ({ ...s, id: Date.now() + Math.random() }))
    }
    updateCollections([...tissueCollections.slice(0, ci + 1), copy, ...tissueCollections.slice(ci + 1)])
  }

  const addSampleToCollection       = (ci)     => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, samples: [...c.samples, newTissueSample()] } : c))
  const removeSampleFromCollection  = (ci, si) => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, samples: c.samples.filter((_, j) => j !== si) } : c))
  const duplicateSampleInCollection = (ci, si) =>
    updateCollections(tissueCollections.map((c, i) => {
      if (i !== ci) return c
      const copy = { ...c.samples[si], id: Date.now() + Math.random() }
      return { ...c, samples: [...c.samples.slice(0, si + 1), copy, ...c.samples.slice(si + 1)] }
    }))

  const handleCollectionSampleChange = (ci, si, fieldOrPatch, value) => {
    if (fieldOrPatch === 'linkedSubjectId') {
      const sample        = tissueCollections[ci]?.samples?.[si]
      const prevSubjectId = sample?.linkedSubjectId
      const allUpdates    = syncTissueLinkedSubject(sample.id, value, prevSubjectId)
      emit(allUpdates)
      return
    }
    const nextCollections = tissueCollections.map((c, i) => {
      if (i !== ci) return c
      const samples = c.samples.map((s, j) => {
        if (j !== si) return s
        if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
        return { ...s, [fieldOrPatch]: value }
      })
      return { ...c, samples }
    })
    updateCollections(nextCollections)
  }

  // ── row props bundles ─────────────────────────────────────────────────────
  const subjectRowProps = {
    biosex, agecategory, species, strainData,
    diseaseData, diseaseModelData, subjectAttributeData,
    handedness, ageUnits, weightUnits,
    allTissueSamples:    tissueSamples,
    allTissueCollections: tissueCollections,
  }

  const tissueRowProps = {
    species, strainData, biosex, lateralityData,
    originData, tissueSampleTypeData,
    diseaseData, diseaseModelData, tissueSampleAttributeData,
    ageUnits, weightUnits,
    allSubjects: subjectsData,
    allGroups:   groups,
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <p className="step-title">Subjects & Tissue Samples</p>

      <Tabs defaultActiveKey="subjects">

        {/* ══ SUBJECTS ══════════════════════════════════════════════════════ */}
        <TabPane tab="Subjects" key="subjects">
          <Form.Item label={<span style={LABEL_STYLE}>Are subjects organised into groups?</span>}>
            <Radio.Group value={mode} onChange={handleModeChange}>
              <Radio.Button value="flat">No — single list</Radio.Button>
              <Radio.Button value="grouped">Yes — groups</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form form={form} layout="vertical" onValuesChange={() => {}}>

            {mode === 'flat' && (
              <>
                {subjectsData.map((field, index) => (
                  <SubjectRow key={field.id} field={field} index={index}
                    onRemove={removeSubject} onDuplicate={duplicateSubject}
                    onChange={handleSubjectChange}
                    {...subjectRowProps}
                  />
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }}>
                    Add new subject
                  </Button>
                </div>
              </>
            )}

            {mode === 'grouped' && (
              <>
                {groups.map((group, gi) => (
                  <div key={group.id} style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: '14px 18px', marginBottom: 20, background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Input value={group.name} size="small"
                        style={{ fontWeight: 600, width: 200 }}
                        onChange={(e) => renameGroup(gi, e.target.value)}
                        placeholder={`Group ${gi + 1} name`}
                      />
                      <Button size="small" type="text" onClick={() => duplicateGroup(gi)}>Duplicate group</Button>
                      <Button size="small" type="text" danger
                        onClick={() => removeGroup(gi)} disabled={groups.length === 1}
                      >
                        Remove group
                      </Button>
                    </div>
                    <Form.Item label={<span style={LABEL_STYLE}>Group remarks</span>} style={{ marginBottom: 12 }}>
                      <Input size="small" value={group.additionalRemarks || ''}
                        onChange={(e) => updateGroupRemarks(gi, e.target.value)}
                        placeholder="Remarks..."
                      />
                    </Form.Item>
                    {group.subjects.map((field, si) => (
                      <SubjectRow key={field.id} field={field} index={si}
                        label={`Subject ${si + 1}`}
                        onRemove={(i)            => removeSubjectFromGroup(gi, i)}
                        onDuplicate={(i)         => duplicateSubjectInGroup(gi, i)}
                        onChange={(i, fOrP, val) => handleGroupSubjectChange(gi, i, fOrP, val)}
                        {...subjectRowProps}
                      />
                    ))}
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Button type="dashed" size="small"
                        onClick={() => addSubjectToGroup(gi)} style={{ width: '40%' }}
                      >
                        + Add subject to {group.name}
                      </Button>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addGroup} style={{ width: '30%' }}>
                    + Add new group
                  </Button>
                </div>
              </>
            )}
          </Form>
        </TabPane>

        {/* ══ TISSUE SAMPLES ════════════════════════════════════════════════ */}
        <TabPane tab="Tissue Samples" key="tissue">
          <Form.Item
            label={<span style={LABEL_STYLE}>Are tissue samples organised into collections?</span>}
            style={{ marginBottom: 12 }}
          >
            <Radio.Group value={tissueMode} onChange={(e) => setTissueMode(e.target.value)}>
              <Radio.Button value="flat">No — single list</Radio.Button>
              <Radio.Button value="collections">Yes — collections</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form form={form} layout="vertical" onValuesChange={() => {}}>

            {tissueMode === 'flat' && (
              <>
                {tissueSamples.map((field, index) => (
                  <TissueSampleRow key={field.id} field={field} index={index}
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

            {tissueMode === 'collections' && (
              <>
                {tissueCollections.map((collection, ci) => (
                  <div key={collection.id} style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: '14px 18px', marginBottom: 20, background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Input size="small" value={collection.collectionID}
                        onChange={(e) => renameCollection(ci, e.target.value)}
                        style={{ fontWeight: 600, width: 220 }}
                        placeholder={`Collection ${ci + 1} id`}
                      />
                      <Button size="small" type="text" onClick={() => duplicateCollection(ci)}>
                        Duplicate collection
                      </Button>
                      <Button size="small" type="text" danger
                        onClick={() => removeCollection(ci)}
                        disabled={tissueCollections.length === 1}
                      >
                        Remove collection
                      </Button>
                    </div>

                    {/* ── collection remarks ── */}
                    <Form.Item label={<span style={LABEL_STYLE}>Collection remarks</span>} style={{ marginBottom: 12 }}>
                      <Input size="small"
                        value={collection.additionalRemarks || ''}
                        onChange={(e) => updateCollRemarks(ci, e.target.value)}
                        placeholder="Additional remarks about this collection..."
                      />
                    </Form.Item>

                    {collection.samples.map((field, si) => (
                      <TissueSampleRow key={field.id} field={field} index={si}
                        onRemove={(i)            => removeSampleFromCollection(ci, i)}
                        onDuplicate={(i)         => duplicateSampleInCollection(ci, i)}
                        onChange={(i, fOrP, val) => handleCollectionSampleChange(ci, i, fOrP, val)}
                        {...tissueRowProps}
                      />
                    ))}
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Button type="dashed" size="small"
                        onClick={() => addSampleToCollection(ci)} style={{ width: '40%' }}
                      >
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