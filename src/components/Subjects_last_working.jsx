import { useState, useEffect } from 'react'
import { Form, Input, Select, Button, Radio, Tabs, Alert } from 'antd'

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

// ─── label style ─────────────────────────────────────────────────────────────

const LABEL_STYLE = { fontSize: 11, color: '#888', marginBottom: 2 }

// ─── value+unit field (replaces deprecated Input.Group) ──────────────────────

const ValueUnitField = ({ value, unit, onValueChange, onUnitChange, units, valuePlaceholder = 'value', disabled = false }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    <Input
      size="small"
      value={value}
      onChange={onValueChange}
      placeholder={valuePlaceholder}
      style={{ width: '40%', minWidth: 0 }}
      disabled={disabled}
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
      disabled={disabled}
    >
      {units.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
    </Select>
  </div>
)

// ─── helpers ─────────────────────────────────────────────────────────────────

const newSubjectState = () => ({
  id: Date.now() + Math.random(),
  ageCategory: '', age: '', ageUnit: '', weight: '', weightUnit: '',
  handedness: '', disease: [], diseaseModel: [], subjectAttribute: [],
  additionalRemarks: '',
  // only meaningful for states after the first — time elapsed since the
  // previous state, used to build relativeTimeIndication
  relativeTimeValue: '', relativeTimeUnit: '',
})

const newGroupState = () => ({
  ageCategory: [], attribute: [],
  ageMin: '', ageMinUnit: '', ageMax: '', ageMaxUnit: '',
})

const newSubject = () => ({
  id: Date.now() + Math.random(),
  subjectID: '', bioSex: '', species: '', strain: '',
  file_path: '',
  linkedSampleIds: [],
  // a subject can have several states (time points) — always at least one
  states: [newSubjectState()],
})

const newTissueSample = () => ({
  id: Date.now() + Math.random(),
  sampleID: '', type: '', species: '', strain: '',
  biologicalSex: '', laterality: '', origin: '',
  age: '', ageUnit: '', weight: '', weightUnit: '',
  pathology: [], tissueSampleAttribute: [], additionalRemarks: '',
  linkedSubjectId: null,
  // which of the linked subject's states (time points) this was extracted
  // at — only relevant/shown when that subject has more than one state.
  // Not used at all for samples that belong to a collection — those
  // inherit the collection's own link + state instead (see below).
  linkedSubjectStateId: null,
})

const newTissueSampleCollection = () => ({
  id: Date.now() + Math.random(),
  collectionID: '',
  additionalRemarks: '',
  linkedSubjectId: null,
  linkedSubjectStateId: null,
  samples: [newTissueSample()]
})

const newGroup = (index) => ({
  id: Date.now() + Math.random(),
  name: `Group ${index + 1}`,
  additionalRemarks: '',
  // group-level state (SubjectGroupState) — describes the group as a
  // whole; the individual subjects' own per-time-point states are
  // separate. See updateGroupState / recomputeGroupStateFromSubjects for
  // how the two stay in sync.
  groupState: newGroupState(),
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
  onStateChange, onAddState, onRemoveState,
  biosex, agecategory, species, strainData,
  diseaseData, diseaseModelData, subjectAttributeData,
  handedness, ageUnits, weightUnits, timeUnits,
  allTissueSamples, allTissueCollections,
}) => {
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  const itemStyle = (w) => ({ flex: `0 0 ${w}`, marginBottom: 0, minWidth: 0 })
  const states = field.states && field.states.length ? field.states : [newSubjectState()]

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

      {/* ── subject-level fields (state-independent) ──────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        <Form.Item label={<span style={LABEL_STYLE}>Sex</span>} style={itemStyle('130px')}>
          <Select {...sel()} size="small"
            value={field.bioSex || undefined}
            onChange={(v) => onRowChange(index, 'bioSex', v ?? '')}
            placeholder="sex"
          >
            {biosex.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
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
      </div>

      {/* ── states (time points) — visually separated in their own boxes ──── */}
      <div style={{ marginTop: 12 }}>
        {states.map((st, si) => (
          <div key={st.id ?? si} style={{
            border: '1px solid #d9d9d9', borderRadius: 6, padding: '10px 12px',
            marginBottom: 8, background: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                Time point {si + 1}
              </span>
              {si > 0 && (
                <Button size="small" type="text" danger
                  onClick={() => onRemoveState(index, si)}
                  style={{ marginLeft: 'auto', fontSize: 11 }}
                >
                  Remove time point
                </Button>
              )}
            </div>

            {si > 0 && (
              <Form.Item label={<span style={LABEL_STYLE}>Time since previous state</span>} style={{ ...itemStyle('220px'), marginBottom: 8 }}>
                <ValueUnitField
                  value={st.relativeTimeValue}
                  unit={st.relativeTimeUnit}
                  onValueChange={(e) => onStateChange(index, si, 'relativeTimeValue', e.target.value)}
                  onUnitChange={(v) => onStateChange(index, si, 'relativeTimeUnit', v ?? '')}
                  units={timeUnits}
                />
              </Form.Item>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>

              <Form.Item label={<span style={LABEL_STYLE}>Age category</span>} style={itemStyle('150px')}>
                <Select {...sel()} size="small"
                  value={st.ageCategory || undefined}
                  onChange={(v) => onStateChange(index, si, 'ageCategory', v ?? '')}
                  placeholder="age category"
                >
                  {agecategory.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
                </Select>
              </Form.Item>

              <Form.Item label={<span style={LABEL_STYLE}>Age</span>} style={itemStyle('195px')}>
                <ValueUnitField
                  value={st.age}
                  unit={st.ageUnit}
                  onValueChange={(e) => onStateChange(index, si, 'age', e.target.value)}
                  onUnitChange={(v) => onStateChange(index, si, 'ageUnit', v ?? '')}
                  units={ageUnits}
                />
              </Form.Item>

              <Form.Item label={<span style={LABEL_STYLE}>Weight</span>} style={itemStyle('195px')}>
                <ValueUnitField
                  value={st.weight}
                  unit={st.weightUnit}
                  onValueChange={(e) => onStateChange(index, si, 'weight', e.target.value)}
                  onUnitChange={(v) => onStateChange(index, si, 'weightUnit', v ?? '')}
                  units={weightUnits}
                />
              </Form.Item>

              <Form.Item label={<span style={LABEL_STYLE}>Disease/Disease model</span>} style={itemStyle('220px')}>
                <Select {...sel()} size="small" mode="multiple"
                  value={[...(st.disease || []), ...(st.diseaseModel || [])]}
                  onChange={(v) => {
                    const diseaseIds    = v.filter(id => diseaseData.find(d => d.identifier === id))
                    const diseaseModIds = v.filter(id => diseaseModelData.find(d => d.identifier === id))
                    onStateChange(index, si, { disease: diseaseIds, diseaseModel: diseaseModIds })
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
                  value={st.handedness || undefined}
                  onChange={(v) => onStateChange(index, si, 'handedness', v ?? '')}
                  placeholder="handedness"
                >
                  {handedness.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
                </Select>
              </Form.Item>

              <Form.Item label={<span style={LABEL_STYLE}>Attribute</span>} style={itemStyle('160px')}>
                <Select {...sel()} size="small" mode="multiple"
                  value={st.subjectAttribute || []}
                  onChange={(v) => onStateChange(index, si, 'subjectAttribute', v)}
                  placeholder="attribute"
                >
                  {subjectAttributeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
                </Select>
              </Form.Item>

              <Form.Item label={<span style={LABEL_STYLE}>Remarks</span>} style={{ flex: '1 1 150px', marginBottom: 0, minWidth: 0 }}>
                <Input size="small"
                  value={st.additionalRemarks || ''}
                  onChange={(e) => onStateChange(index, si, 'additionalRemarks', e.target.value)}
                  placeholder="remarks..."
                />
              </Form.Item>

            </div>
          </div>
        ))}

        <Button type="dashed" size="small" onClick={() => onAddState(index)} style={{ width: '100%' }}>
          + add new time point
        </Button>
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
  // true for samples that live inside a collection — the collection now
  // owns "extracted from subject/state" exclusively (every sample in it
  // must match the collection's own subject+state), so this sample's own
  // link fields are neither shown nor used.
  hideSubjectLink = false,
}) => {
  const filteredStrain = field.species
    ? strainData.filter(s => s.species === field.species)
    : []

  // once a subject is linked (directly, or inherited from a parent
  // collection), the fields we prefill from that subject/state become
  // read-only — editing them here would silently drift out of sync with
  // the subject data they're meant to mirror.
  const isPrefilled = !!field.linkedSubjectId

  const itemStyle = (w) => ({ flex: `0 0 ${w}`, marginBottom: 0, minWidth: 0 })

  const allSubjectsForLinking = [
    ...allSubjects.map(s => ({ id: s.id, label: s.subjectID || `Subject ${s.id}` })),
    ...allGroups.flatMap(g =>
      g.subjects.map(s => ({ id: s.id, label: `[${g.name}] ${s.subjectID || `Subject ${s.id}`}` }))
    )
  ]

  const findLinkedSubject = (subjectId) => {
    if (!subjectId) return null
    return allSubjects.find(s => s.id === subjectId) ||
      allGroups.flatMap(g => g.subjects).find(s => s.id === subjectId) ||
      null
  }
  const linkedSubject = !hideSubjectLink ? findLinkedSubject(field.linkedSubjectId) : null
  const linkedSubjectStates = linkedSubject?.states || []

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

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>

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
            disabled={isPrefilled}
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
            disabled={isPrefilled || !field.species || filteredStrain.length === 0}
          >
            {filteredStrain.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Sex</span>} style={itemStyle('120px')}>
          <Select {...sel()} size="small"
            value={field.biologicalSex || undefined}
            onChange={(v) => onRowChange(index, 'biologicalSex', v ?? '')}
            placeholder="sex"
            disabled={isPrefilled}
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
            disabled={isPrefilled}
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
            disabled={isPrefilled}
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

        {!hideSubjectLink && allSubjectsForLinking.length > 0 && (
          <>
            <Form.Item
              label={<span style={LABEL_STYLE}>Extracted from subject <span style={{ color: '#ff4d4f' }}>*</span></span>}
              style={itemStyle('220px')}
              validateStatus={field.linkedSubjectId ? '' : 'error'}
              help={field.linkedSubjectId ? '' : 'Required'}
            >
              <Select {...sel()} size="small"
                status={field.linkedSubjectId ? '' : 'error'}
                value={field.linkedSubjectId || undefined}
                onChange={(v) => onRowChange(index, { linkedSubjectId: v ?? null, linkedSubjectStateId: null })}
                placeholder="link to subject..."
              >
                {allSubjectsForLinking.map(s => (
                  <Option key={s.id} value={s.id}>{s.label}</Option>
                ))}
              </Select>
            </Form.Item>

            {linkedSubjectStates.length > 1 && (
              <Form.Item
                label={<span style={LABEL_STYLE}>Time point <span style={{ color: '#ff4d4f' }}>*</span></span>}
                style={itemStyle('170px')}
                validateStatus={field.linkedSubjectStateId ? '' : 'error'}
                help={field.linkedSubjectStateId ? '' : 'Required'}
              >
                <Select {...sel()} size="small"
                  status={field.linkedSubjectStateId ? '' : 'error'}
                  value={field.linkedSubjectStateId || undefined}
                  onChange={(v) => onRowChange(index, 'linkedSubjectStateId', v ?? null)}
                  placeholder="which time point?"
                >
                  {linkedSubjectStates.map((st, i) => (
                    <Option key={st.id} value={st.id}>{`Time point ${i + 1}`}</Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </>
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

  // Drives the "missing linked subject" warning banner — stays false (and
  // the banner hidden) until the user actually tries to move on from this
  // step; see the hidden Form.Item validator further down, which flips
  // this the moment form.validateFields() actually runs.
  const [showLinkWarning, setShowLinkWarning] = useState(false)

  const ageUnits    = allUnits.filter(u => AGE_UNIT_NAMES.has(u.name))
  const weightUnits = allUnits.filter(u => WEIGHT_UNIT_NAMES.has(u.name))

  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects            || [])
    setGroups(data.subjectMetadata?.subjectGroups            || [])
    // NOTE: mode is intentionally NOT re-derived here. This effect re-runs
    // on every data-prop change — which includes every keystroke, since
    // emit() updates the parent's state and the new data comes right back
    // down as a prop. Setting mode from subjectGroups' presence here used
    // to force it back to 'grouped' on every single change as soon as any
    // group had content, even after the user had deliberately switched to
    // viewing flat subjects — making it impossible to type in a flat
    // subject's id once any group existed. mode now only changes via the
    // user's own toggle click (handleModeChange), same as tissueMode.
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

  // resolves which of a subject's states to use for prefilling — the
  // requested one if given and found, otherwise the first/baseline state
  const resolveSubjectState = (subject, stateId) => {
    if (!subject) return null
    const states = subject.states && subject.states.length ? subject.states : [newSubjectState()]
    if (stateId) {
      const found = states.find(st => st.id === stateId)
      if (found) return found
    }
    return states[0]
  }

  // builds the prefill patch that goes INTO a tissue sample from a subject.
  // species/strain/sex come from the subject itself (state-independent);
  // age and disease/disease model come from the RESOLVED STATE (a subject
  // can have several time points, each with its own age/pathology) — not
  // from the subject directly, which no longer holds those fields at all
  // since states became a list.
  const buildTissuePatchFromSubject = (subject, stateId) => {
    const state = resolveSubjectState(subject, stateId)
    return {
      linkedSubjectId:      subject.id,
      linkedSubjectStateId: state?.id ?? null,
      species:              subject.species || '',
      strain:               subject.strain  || '',
      biologicalSex:        subject.bioSex  || '',
      age:                  state?.age      || '',
      ageUnit:              state?.ageUnit  || '',
      pathology: [
        ...(state?.disease      || []),
        ...(state?.diseaseModel || []),
      ]
      // weight intentionally NOT copied — tissue weight is independent
    }
  }

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

  // ── dangling-reference cleanup ──────────────────────────────────────────
  const stripSampleIdsFromSubjects = (flatSubjects, grps, deletedSampleIds) => {
    if (!deletedSampleIds.length) return { flatSubjects, grps }
    const idSet = new Set(deletedSampleIds.map(String))
    const strip = (s) => {
      if (!s.linkedSampleIds?.length) return s
      const next = s.linkedSampleIds.filter(id => !idSet.has(String(id)))
      return next.length === s.linkedSampleIds.length ? s : { ...s, linkedSampleIds: next }
    }
    return {
      flatSubjects: flatSubjects.map(strip),
      grps: grps.map(g => ({ ...g, subjects: g.subjects.map(strip) })),
    }
  }

  const clearSubjectIdFromSamples = (flatSamples, collections, deletedSubjectIds) => {
    if (!deletedSubjectIds.length) return { flatSamples, collections }
    const idSet = new Set(deletedSubjectIds.map(String))
    const clear = (s) =>
      s.linkedSubjectId && idSet.has(String(s.linkedSubjectId))
        ? { ...s, linkedSubjectId: null }
        : s
    return {
      flatSamples: flatSamples.map(clear),
      collections: collections.map(c => ({
        ...c,
        linkedSubjectId: c.linkedSubjectId && idSet.has(String(c.linkedSubjectId)) ? null : c.linkedSubjectId,
        samples: c.samples.map(clear),
      })),
    }
  }

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
  const syncTissueLinkedSubject = (sampleId, newSubjectId, prevSubjectId, stateId = null) => {
    const subject = findSubjectById(newSubjectId)
    const patch   = subject
      ? buildTissuePatchFromSubject(subject, stateId)
      : { linkedSubjectId: newSubjectId, linkedSubjectStateId: null }

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
  // Purely a display filter — which section is shown — NOT a migration.
  // Previously this converted subjectsData <-> groups and explicitly wiped
  // whichever one wasn't active (emit({..., subjects: undefined}) or
  // {subjectGroups: undefined}), which silently deleted real data the
  // moment someone switched the toggle. Both are now tracked independently
  // at all times, same as tissueSamples/tissueCollections already were —
  // switching this toggle only changes which section is visible.
  const handleModeChange = (e) => setMode(e.target.value)

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

  // ── shared state (time-point) helpers, used by both flat and grouped subjects ──
  const patchStateInSubject = (subject, stateIndex, fieldOrPatch, value) => {
    const states = subject.states && subject.states.length ? subject.states : [newSubjectState()]
    const nextStates = states.map((st, idx) => {
      if (idx !== stateIndex) return st
      if (typeof fieldOrPatch === 'object') return { ...st, ...fieldOrPatch }
      return { ...st, [fieldOrPatch]: value }
    })
    return { ...subject, states: nextStates }
  }
  const addStateToSubject    = (subject) => ({ ...subject, states: [...(subject.states || []), newSubjectState()] })
  const removeStateFromSubject = (subject, stateIndex) => ({
    ...subject, states: (subject.states || []).filter((_, idx) => idx !== stateIndex)
  })

  const handleSubjectStateChange = (i, si, fieldOrPatch, value) => {
    const updated = subjectsData.map((s, idx) => idx === i ? patchStateInSubject(s, si, fieldOrPatch, value) : s)
    setSubjectData(updated)
    emit({ subjects: updated })
  }
  const addSubjectState    = (i)     => {
    const updated = subjectsData.map((s, idx) => idx === i ? addStateToSubject(s) : s)
    setSubjectData(updated)
    emit({ subjects: updated })
  }
  const removeSubjectState = (i, si) => {
    const updated = subjectsData.map((s, idx) => idx === i ? removeStateFromSubject(s, si) : s)
    setSubjectData(updated)
    emit({ subjects: updated })
  }

  const addNewSubject    = () => { const u = [...subjectsData, newSubject()]; setSubjectData(u); emit({ subjects: u }) }
  const removeSubject    = (i) => {
    const deletedId = subjectsData[i]?.id
    const u = subjectsData.filter((_, idx) => idx !== i)
    const { flatSamples, collections } = clearSubjectIdFromSamples(
      tissueSamples, tissueCollections, deletedId ? [deletedId] : [])
    setSubjectData(u)
    setTissueSamples(flatSamples)
    setTissueCollections(collections)
    emit({ subjects: u, tissueSamples: flatSamples, tissueCollections: collections })
  }
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
  const removeGroup        = (gi)       => {
    const deletedIds = (groups[gi]?.subjects || []).map(s => s.id)
    const nextGroups = groups.filter((_, i) => i !== gi)
    const { flatSamples, collections } = clearSubjectIdFromSamples(
      tissueSamples, tissueCollections, deletedIds)
    setGroups(nextGroups)
    setTissueSamples(flatSamples)
    setTissueCollections(collections)
    emit({ subjectGroups: nextGroups, tissueSamples: flatSamples, tissueCollections: collections })
  }
  const renameGroup        = (gi, name) => updateGroups(groups.map((g, i) => i === gi ? { ...g, name } : g))
  const updateGroupRemarks = (gi, r)    => updateGroups(groups.map((g, i) => i === gi ? { ...g, additionalRemarks: r } : g))
  const addSubjectToGroup  = (gi)       => updateGroups(groups.map((g, i) => {
    if (i !== gi) return g
    const inherited = newSubject()
    if (g.groupState?.attribute?.length) {
      inherited.states = [{ ...inherited.states[0], subjectAttribute: g.groupState.attribute }]
    }
    return { ...g, subjects: [...g.subjects, inherited] }
  }))

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

  // ── group-level state (SubjectGroupState) ───────────────────────────────
  // Aggregates the group's own state from ALL of its members' states (every
  // time point, not just the first) each time anything about a member's
  // states changes: ageCategory/attribute as the union of unique values,
  // age as the {min, max} range — each end carrying its OWN unit, taken
  // from whichever specific subject-state actually holds that min/max
  // value (not a single shared unit blindly applied to both). Only
  // recomputed FROM — never cascaded back INTO — age/ageCategory, since a
  // group can legitimately span several categories or a wide age range and
  // there's no single sensible value to push down to one subject for
  // those. attribute is the one field cascaded both ways (see
  // updateGroupState below), and only applies to each subject's first
  // state, since that's the one the group-level UI is prefilling.
  const recomputeGroupStateFromSubjects = (group) => {
    const allStates = group.subjects.flatMap(s => (s.states && s.states.length) ? s.states : [{}])
    const ageCategories = [...new Set(allStates.map(st => st.ageCategory).filter(Boolean))]
    const attributes    = [...new Set(allStates.flatMap(st => st.subjectAttribute || []))]

    const agesWithUnits = allStates
      .map(st => ({ value: parseFloat(st.age), unit: st.ageUnit }))
      .filter(a => !isNaN(a.value))

    let ageMin = '', ageMinUnit = '', ageMax = '', ageMaxUnit = ''
    if (agesWithUnits.length) {
      const minEntry = agesWithUnits.reduce((a, b) => (a.value <= b.value ? a : b))
      const maxEntry = agesWithUnits.reduce((a, b) => (a.value >= b.value ? a : b))
      ageMin = String(minEntry.value); ageMinUnit = minEntry.unit || ''
      ageMax = String(maxEntry.value); ageMaxUnit = maxEntry.unit || ''
    }

    return {
      ...group,
      groupState: {
        ...(group.groupState || newGroupState()),
        ageCategory: ageCategories, attribute: attributes,
        ageMin, ageMinUnit, ageMax, ageMaxUnit,
      },
    }
  }

  const handleGroupSubjectStateChange = (gi, si, stateIdx, fieldOrPatch, value) => {
    let nextGroups = groups.map((g, i) => {
      if (i !== gi) return g
      const subjects = g.subjects.map((s, j) => j === si ? patchStateInSubject(s, stateIdx, fieldOrPatch, value) : s)
      return { ...g, subjects }
    })
    nextGroups = nextGroups.map((g, i) => i === gi ? recomputeGroupStateFromSubjects(g) : g)
    setGroups(nextGroups)
    emit({ subjectGroups: nextGroups })
  }

  const addSubjectStateInGroup = (gi, si) => {
    let nextGroups = groups.map((g, i) => {
      if (i !== gi) return g
      return { ...g, subjects: g.subjects.map((s, j) => j === si ? addStateToSubject(s) : s) }
    })
    nextGroups = nextGroups.map((g, i) => i === gi ? recomputeGroupStateFromSubjects(g) : g)
    setGroups(nextGroups)
    emit({ subjectGroups: nextGroups })
  }

  const removeSubjectStateInGroup = (gi, si, stateIdx) => {
    let nextGroups = groups.map((g, i) => {
      if (i !== gi) return g
      return { ...g, subjects: g.subjects.map((s, j) => j === si ? removeStateFromSubject(s, stateIdx) : s) }
    })
    nextGroups = nextGroups.map((g, i) => i === gi ? recomputeGroupStateFromSubjects(g) : g)
    setGroups(nextGroups)
    emit({ subjectGroups: nextGroups })
  }

  // Editing the group's own state: ageCategory/age just update the group
  // (they don't cascade down — see note above). attribute DOES cascade,
  // overwriting every member subject's first state's attribute list, since
  // that mapping is unambiguous.
  const updateGroupState = (gi, patch) => {
    const nextGroups = groups.map((g, i) => {
      if (i !== gi) return g
      const nextGroupState = { ...(g.groupState || newGroupState()), ...patch }
      const subjects = 'attribute' in patch
        ? g.subjects.map(s => patchStateInSubject(s, 0, 'subjectAttribute', nextGroupState.attribute || []))
        : g.subjects
      return { ...g, groupState: nextGroupState, subjects }
    })
    setGroups(nextGroups)
    emit({ subjectGroups: nextGroups })
  }

  // ── flat tissue handlers ──────────────────────────────────────────────────
  const handleTissueSampleChange = (i, fieldOrPatch, value) => {
    const sample = tissueSamples[i]

    // subject picked/changed — TissueSampleRow sends this as an object
    // patch (not the bare string 'linkedSubjectId'), so it doesn't match
    // the generic field setter below and needs its own branch, same as
    // before but updated for the new patch shape.
    if (fieldOrPatch && typeof fieldOrPatch === 'object' && 'linkedSubjectId' in fieldOrPatch) {
      const prevSubjectId = sample?.linkedSubjectId
      const newSubjectId  = fieldOrPatch.linkedSubjectId
      const allUpdates    = syncTissueLinkedSubject(sample.id, newSubjectId, prevSubjectId, null)
      emit(allUpdates)
      return
    }

    // a specific time point picked for an already-linked subject —
    // re-prefill age/pathology from that state
    if (fieldOrPatch === 'linkedSubjectStateId') {
      const subject = findSubjectById(sample?.linkedSubjectId)
      if (subject) {
        const patch   = buildTissuePatchFromSubject(subject, value)
        const updated = patchFlatSamples(tissueSamples, sample.id, patch)
        setTissueSamples(updated)
        emit({ tissueSamples: updated })
        return
      }
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
  const removeTissueSample = (i) => {
    const deletedId = tissueSamples[i]?.id
    const u = tissueSamples.filter((_, idx) => idx !== i)
    const { flatSubjects, grps } = stripSampleIdsFromSubjects(
      subjectsData, groups, deletedId ? [deletedId] : [])
    setTissueSamples(u)
    setSubjectData(flatSubjects)
    setGroups(grps)
    emit({ tissueSamples: u, subjects: flatSubjects, subjectGroups: grps })
  }
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
  const removeCollection    = (ci)        => {
    const deletedIds = (tissueCollections[ci]?.samples || []).map(s => s.id)
    const nextCollections = tissueCollections.filter((_, i) => i !== ci)
    const { flatSubjects, grps } = stripSampleIdsFromSubjects(
      subjectsData, groups, deletedIds)
    setTissueCollections(nextCollections)
    setSubjectData(flatSubjects)
    setGroups(grps)
    emit({ tissueCollections: nextCollections, subjects: flatSubjects, subjectGroups: grps })
  }
  const renameCollection    = (ci, id)    => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, collectionID: id } : c))
  const updateCollRemarks   = (ci, r)     => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, additionalRemarks: r } : c))
  // ── whole collection links subject → cascade prefill to every sample in it ──
  const updateCollLinkedSubject = (ci, subjectId) => {
    const collection = tissueCollections[ci]
    if (!collection) return

    const prevSubjectId = collection.linkedSubjectId || null
    const newSubjectId  = subjectId ?? null
    const sampleIds     = collection.samples.map(s => s.id)
    const subject       = findSubjectById(newSubjectId)
    const patch         = subject
      ? buildTissuePatchFromSubject(subject)
      : { linkedSubjectId: newSubjectId }

    // 1. set the collection's own link + prefill every sample inside it
    const nextCollections = tissueCollections.map((c, i) => {
      if (i !== ci) return c
      return {
        ...c,
        linkedSubjectId: newSubjectId,
        linkedSubjectStateId: null, // a state picked for the old subject wouldn't be valid for a new one
        samples: c.samples.map(s => ({ ...s, ...patch })),
      }
    })

    // 2. add all of this collection's sampleIds to the new subject's linkedSampleIds
    let nextFlatSubjects = subjectsData
    let nextGroups       = groups

    if (newSubjectId && subject) {
      const subjPatch = {
        linkedSampleIds: [...new Set([...(subject.linkedSampleIds || []), ...sampleIds])]
      }
      nextFlatSubjects = patchFlatSubjects(subjectsData, newSubjectId, subjPatch)
      nextGroups       = patchGroupSubjects(groups, newSubjectId, subjPatch)
    }

    // 3. remove them from the previous subject's linkedSampleIds, if changed
    if (prevSubjectId && prevSubjectId !== newSubjectId) {
      const prevSubject = findSubjectById(prevSubjectId, nextFlatSubjects, nextGroups)
      if (prevSubject) {
        const idSet = new Set(sampleIds.map(String))
        const removePatch = {
          linkedSampleIds: (prevSubject.linkedSampleIds || [])
            .filter(id => !idSet.has(String(id)))
        }
        nextFlatSubjects = patchFlatSubjects(nextFlatSubjects, prevSubjectId, removePatch)
        nextGroups       = patchGroupSubjects(nextGroups, prevSubjectId, removePatch)
      }
    }

    setTissueCollections(nextCollections)
    setSubjectData(nextFlatSubjects)
    setGroups(nextGroups)

    emit({
      tissueCollections: nextCollections,
      subjects:          nextFlatSubjects,
      subjectGroups:     nextGroups,
    })
  }

  const updateCollLinkedSubjectState = (ci, stateId) => {
    const collection = tissueCollections[ci]
    if (!collection) return
    const subject = findSubjectById(collection.linkedSubjectId)
    const patch   = subject
      ? buildTissuePatchFromSubject(subject, stateId)
      : { linkedSubjectStateId: stateId ?? null }

    const nextCollections = tissueCollections.map((c, i) => {
      if (i !== ci) return c
      return {
        ...c,
        linkedSubjectStateId: stateId ?? null,
        samples: c.samples.map(s => ({ ...s, ...patch })),
      }
    })
    setTissueCollections(nextCollections)
    emit({ tissueCollections: nextCollections })
  }

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

  const addSampleToCollection = (ci) => updateCollections(tissueCollections.map((c, i) => {
    if (i !== ci) return c
    const subject  = findSubjectById(c.linkedSubjectId)
    const newSample = subject
      ? { ...newTissueSample(), ...buildTissuePatchFromSubject(subject) }
      : newTissueSample()
    return { ...c, samples: [...c.samples, newSample] }
  }))
  const removeSampleFromCollection  = (ci, si) => {
    const deletedId = tissueCollections[ci]?.samples?.[si]?.id
    const nextCollections = tissueCollections.map((c, i) =>
      i === ci ? { ...c, samples: c.samples.filter((_, j) => j !== si) } : c)
    const { flatSubjects, grps } = stripSampleIdsFromSubjects(
      subjectsData, groups, deletedId ? [deletedId] : [])
    setTissueCollections(nextCollections)
    setSubjectData(flatSubjects)
    setGroups(grps)
    emit({ tissueCollections: nextCollections, subjects: flatSubjects, subjectGroups: grps })
  }
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
    timeUnits: ageUnits,
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

  const allSubjectsForCollectionLinking = [
    ...subjectsData.map(s => ({ id: s.id, label: s.subjectID || `Subject ${s.id}` })),
    ...groups.flatMap(g =>
      g.subjects.map(s => ({ id: s.id, label: `[${g.name}] ${s.subjectID || `Subject ${s.id}`}` }))
    )
  ]

  // "incomplete" now covers two things: no subject linked at all, OR a
  // subject linked that has multiple time points but none chosen (that
  // choice is required too, same as the link itself).
  const isLinkIncomplete = (item) => {
    if (!item.linkedSubjectId) return true
    const subject = findSubjectById(item.linkedSubjectId)
    if (subject && subject.states && subject.states.length > 1 && !item.linkedSubjectStateId) return true
    return false
  }

  const missingSubjectLinkCount = allSubjectsForCollectionLinking.length > 0
    ? tissueSamples.filter(isLinkIncomplete).length +
      tissueCollections.filter(isLinkIncomplete).length
    : 0

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <p className="step-title">Subjects & Tissue Samples</p>

      <Tabs defaultActiveKey="subjects">

        {/* ══ SUBJECTS ══════════════════════════════════════════════════════ */}
        <TabPane tab="Subjects" key="subjects">
          <Form.Item label={<span style={LABEL_STYLE}>Are subjects organised into groups?</span>}>
            <Radio.Group value={mode} onChange={handleModeChange}>
              <Radio.Button value="flat">No — individual subjects</Radio.Button>
              <Radio.Button value="grouped">Yes — subject groups</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form form={form} layout="vertical" onValuesChange={() => {}}>

            {mode === 'flat' && (
              <>
                {subjectsData.map((field, index) => (
                  <SubjectRow key={field.id} field={field} index={index}
                    onRemove={removeSubject} onDuplicate={duplicateSubject}
                    onChange={handleSubjectChange}
                    onStateChange={handleSubjectStateChange}
                    onAddState={addSubjectState}
                    onRemoveState={removeSubjectState}
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

                    {/* ── group-level state (SubjectGroupState) ──────────────── */}
                    <div style={{
                      border: '1px solid #d9d9d9', borderRadius: 6, padding: '10px 12px',
                      marginBottom: 14, background: '#fff',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                        Group state
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <Form.Item label={<span style={LABEL_STYLE}>Age category</span>} style={{ flex: '0 0 220px', marginBottom: 0 }}>
                          <Select {...sel()} size="small" mode="multiple"
                            value={group.groupState?.ageCategory || []}
                            onChange={(v) => updateGroupState(gi, { ageCategory: v })}
                            placeholder="age category (this group spans)..."
                          >
                            {agecategory.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
                          </Select>
                        </Form.Item>
                        <Form.Item label={<span style={LABEL_STYLE}>Attribute</span>} style={{ flex: '0 0 220px', marginBottom: 0 }}>
                          <Select {...sel()} size="small" mode="multiple"
                            value={group.groupState?.attribute || []}
                            onChange={(v) => updateGroupState(gi, { attribute: v })}
                            placeholder="attribute..."
                          >
                            {subjectAttributeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
                          </Select>
                        </Form.Item>
                        <Form.Item label={<span style={LABEL_STYLE}>Age range (min)</span>} style={{ flex: '0 0 195px', marginBottom: 0 }}>
                          <ValueUnitField
                            value={group.groupState?.ageMin || ''}
                            unit={group.groupState?.ageMinUnit || ''}
                            onValueChange={(e) => updateGroupState(gi, { ageMin: e.target.value })}
                            onUnitChange={(v) => updateGroupState(gi, { ageMinUnit: v ?? '' })}
                            units={ageUnits}
                            valuePlaceholder="min age"
                          />
                        </Form.Item>
                        <Form.Item label={<span style={LABEL_STYLE}>Age range (max)</span>} style={{ flex: '0 0 195px', marginBottom: 0 }}>
                          <ValueUnitField
                            value={group.groupState?.ageMax || ''}
                            unit={group.groupState?.ageMaxUnit || ''}
                            onValueChange={(e) => updateGroupState(gi, { ageMax: e.target.value })}
                            onUnitChange={(v) => updateGroupState(gi, { ageMaxUnit: v ?? '' })}
                            units={ageUnits}
                            valuePlaceholder="max age"
                          />
                        </Form.Item>
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                        Age category and age range fill in automatically from every time point of
                        every subject below (not just their first). Attribute can be set here and
                        applies to every subject's first state — or set per-subject below.
                      </div>
                    </div>

                    {group.subjects.map((field, si) => (
                      <SubjectRow key={field.id} field={field} index={si}
                        label={`Subject ${si + 1}`}
                        onRemove={(i)            => removeSubjectFromGroup(gi, i)}
                        onDuplicate={(i)         => duplicateSubjectInGroup(gi, i)}
                        onChange={(i, fOrP, val) => handleGroupSubjectChange(gi, i, fOrP, val)}
                        onStateChange={(i, si2, fOrP, val) => handleGroupSubjectStateChange(gi, i, si2, fOrP, val)}
                        onAddState={(i)          => addSubjectStateInGroup(gi, i)}
                        onRemoveState={(i, si2)  => removeSubjectStateInGroup(gi, i, si2)}
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
            label={<span style={LABEL_STYLE}>How many tissue samples do you have per subject?</span>}
            style={{ marginBottom: 12 }}
          >
            <Radio.Group value={tissueMode} onChange={(e) => setTissueMode(e.target.value)}>
              <Radio.Button value="flat">One tissue sample per subject</Radio.Button>
              <Radio.Button value="collections">More than one tissue sample per subject</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {showLinkWarning && missingSubjectLinkCount > 0 && (
            <Alert
              type="warning" showIcon style={{ marginBottom: 16 }}
              message={`${missingSubjectLinkCount} tissue sample${missingSubjectLinkCount === 1 ? '' : 's'} or collection${missingSubjectLinkCount === 1 ? '' : 's'} missing a linked subject`}
              description='Every tissue sample must be linked to the subject it was extracted from (and, if that subject has multiple time points, which one) — look for the fields outlined in red below.'
            />
          )}

          <Form form={form} layout="vertical" onValuesChange={() => {}}>

            {/* Hidden — not a real field the user fills in. Its only job is
                to hook the "missing linked subject" check into the wizard's
                existing form.validateFields() call (used by the shared
                Next/submit button), since none of the other fields in this
                component are name-bound to that form. Whenever validation
                actually runs, this flips the banner on if something's
                still missing, and off again once it's fixed. */}
            <Form.Item
              name={['subjectMetadata', '_tissueLinkCheck']}
              style={{ display: 'none' }}
              rules={[{
                validator: () => {
                  if (missingSubjectLinkCount > 0) {
                    setShowLinkWarning(true)
                    return Promise.reject(new Error(
                      `${missingSubjectLinkCount} tissue sample(s)/collection(s) are missing a linked subject or time point.`
                    ))
                  }
                  setShowLinkWarning(false)
                  return Promise.resolve()
                },
              }]}
            >
              <Input type="hidden" />
            </Form.Item>

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

                    {/* ── extracted from subject (whole collection) — required ── */}
                    {allSubjectsForCollectionLinking.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
                        <Form.Item
                          label={<span style={LABEL_STYLE}>Extracted from subject <span style={{ color: '#ff4d4f' }}>*</span></span>}
                          style={{ flex: '0 0 320px', marginBottom: 0 }}
                          validateStatus={collection.linkedSubjectId ? '' : 'error'}
                          help={collection.linkedSubjectId ? '' : 'Required'}
                        >
                          <Select {...sel()} size="small"
                            status={collection.linkedSubjectId ? '' : 'error'}
                            value={collection.linkedSubjectId || undefined}
                            onChange={(v) => updateCollLinkedSubject(ci, v ?? null)}
                            placeholder="link this whole collection to a subject..."
                          >
                            {allSubjectsForCollectionLinking.map(s => (
                              <Option key={s.id} value={s.id}>{s.label}</Option>
                            ))}
                          </Select>
                        </Form.Item>

                        {(() => {
                          const linkedSubj = [...subjectsData, ...groups.flatMap(g => g.subjects)]
                            .find(s => s.id === collection.linkedSubjectId)
                          const states = linkedSubj?.states || []
                          if (states.length <= 1) return null
                          return (
                            <Form.Item
                              label={<span style={LABEL_STYLE}>Time point <span style={{ color: '#ff4d4f' }}>*</span></span>}
                              style={{ flex: '0 0 170px', marginBottom: 0 }}
                              validateStatus={collection.linkedSubjectStateId ? '' : 'error'}
                              help={collection.linkedSubjectStateId ? '' : 'Required'}
                            >
                              <Select {...sel()} size="small"
                                status={collection.linkedSubjectStateId ? '' : 'error'}
                                value={collection.linkedSubjectStateId || undefined}
                                onChange={(v) => updateCollLinkedSubjectState(ci, v ?? null)}
                                placeholder="which time point?"
                              >
                                {states.map((st, i) => (
                                  <Option key={st.id} value={st.id}>{`Time point ${i + 1}`}</Option>
                                ))}
                              </Select>
                            </Form.Item>
                          )
                        })()}
                      </div>
                    )}

                    {collection.samples.map((field, si) => (
                      <TissueSampleRow key={field.id} field={field} index={si}
                        onRemove={(i)            => removeSampleFromCollection(ci, i)}
                        onDuplicate={(i)         => duplicateSampleInCollection(ci, i)}
                        onChange={(i, fOrP, val) => handleCollectionSampleChange(ci, i, fOrP, val)}
                        hideSubjectLink
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
