import { useState, useEffect, useRef } from 'react'
import { Form, Input, Select, Button, Radio, Tabs, Upload, Modal, Alert, Table, Typography } from 'antd'
import { UploadOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { Option } = Select
const { TabPane } = Tabs
const { Text, Link } = Typography

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

const LABEL_STYLE = { fontSize: 11, color: '#888', marginBottom: 2 }

// ─── value+unit field ────────────────────────────────────────────────────────

const ValueUnitField = ({ value, unit, onValueChange, onUnitChange, units, valuePlaceholder = 'value' }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    <Input size="small" value={value} onChange={onValueChange}
      placeholder={valuePlaceholder} style={{ width: '40%', minWidth: 0 }}
    />
    <Select showSearch allowClear optionFilterProp="children" size="small"
      value={unit || undefined} onChange={onUnitChange}
      placeholder="unit" style={{ width: '60%', minWidth: 0 }}
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
  collectionID: '', additionalRemarks: '', samples: [newTissueSample()]
})

const newGroup = (index) => ({
  id: Date.now() + Math.random(),
  name: `Group ${index + 1}`,
  additionalRemarks: '',
  subjects: [newSubject()]
})

const sel = (extraStyle = {}) => ({
  showSearch: true, optionFilterProp: 'children', allowClear: true,
  style: { width: '100%', ...extraStyle },
})

// ─── Excel template download ─────────────────────────────────────────────────
// ─── Excel template download ─────────────────────────────────────────────────

const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new()

  // Subject sheet
  const subjectHeaders = [
    'SubjectID', 'Age', 'Weight', 'AgeCategory', 'BiologicalSex',
    'Disease', 'Handedness', 'Species', 'Strain',
    'SubjectAttribute', 'AdditionalRemarks', 'IsPartOf'
  ]
  const subjectExample = [
    ['Sub-1', '9', '23', 'young adult', 'male', '', 'ambidextrous handedness', 'Mus musculus', 'C57BL/6', '', 'example remark', 'SG-1'],
    ['Sub-2', '13', '26', 'adult', 'female', '', 'right handedness', 'Mus musculus', 'C57BL/6', '', '', 'SG-1'],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet([subjectHeaders, ...subjectExample])
  ws1['!cols'] = subjectHeaders.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws1, 'Subject')

  // SubjectGroup sheet
  const groupHeaders = [
    'SubjectGroupID', 'Quantity', 'Age', 'Weight', 'AgeCategory', 'BiologicalSex',
    'Disease', 'Handedness', 'Species', 'Strain', 'SubjectAttribute', 'AdditionalRemarks'
  ]
  const groupExample = [
    ['SG-1', '5', '12', '25', 'young adult', 'male', '', 'ambidextrous handedness', 'Mus musculus', 'C57BL/6', '', 'group A'],
    ['SG-2', '8', '13', '27', 'young adult', 'female', '', '', 'Rattus norvegicus', '', '', 'group B'],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet([groupHeaders, ...groupExample])
  ws2['!cols'] = groupHeaders.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws2, 'SubjectGroup')

  // TissueSample sheet
  const tissueHeaders = [
    'TissueSampleID', 'Origin', 'AnatomicalLocation', 'Age', 'Weight',
    'BiologicalSex', 'Disease', 'Laterality', 'Species', 'Strain',
    'TissueSampleAttribute', 'TissueSampleType', 'AdditionalRemarks',
    'IsPartOf', 'DescendedFromSubjectID'
  ]
  const tissueExample = [
    ['TS-1', 'Brain', 'hippocampus', '3', '2', 'male', '', 'right', 'Mus musculus', 'C57BL/6', '', '', '', 'TSC-1', 'Sub-1'],
  ]
  const ws3 = XLSX.utils.aoa_to_sheet([tissueHeaders, ...tissueExample])
  ws3['!cols'] = tissueHeaders.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws3, 'TissueSample')

  // TissueSampleCollection sheet
  const collectionHeaders = [
    'TissueSampleCollectionID', 'Quantity', 'Origin', 'AnatomicalLocation',
    'Age', 'Weight', 'BiologicalSex', 'Disease', 'Laterality',
    'Species', 'Strain', 'TissueSampleAttribute', 'TissueSampleType',
    'AdditionalRemarks', 'DescendedFromSubjectID'
  ]
  const collectionExample = [
    ['TSC-1', '5', 'Brain', 'hippocampus', '5', '3', 'male', '', 'right', 'Mus musculus', 'C57BL/6', '', '', 'collection remark', 'Sub-1'],
  ]
  const ws4 = XLSX.utils.aoa_to_sheet([collectionHeaders, ...collectionExample])
  ws4['!cols'] = collectionHeaders.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws4, 'TissueSampleCollection')

  // Instructions sheet
  const instructions = [
    ['EBRAINS Metadata Wizard — Subject/Tissue Import Template'],
    [''],
    ['SHEETS:'],
    ['  Subject              — one row per individual subject'],
    ['  SubjectGroup         — one row per subject group'],
    ['  TissueSample         — one row per tissue sample'],
    ['  TissueSampleCollection — one row per tissue sample collection'],
    [''],
    ['LINKING:'],
    ['  Subject.IsPartOf           → SubjectGroupID from SubjectGroup sheet'],
    ['  TissueSample.IsPartOf      → TissueSampleCollectionID from TissueSampleCollection sheet'],
    ['  TissueSample.DescendedFromSubjectID → SubjectID from Subject sheet'],
    ['  TissueSampleCollection.DescendedFromSubjectID → SubjectID from Subject sheet'],
    [''],
    ['VALUE MATCHING:'],
    ['  Species, Strain, AgeCategory, BiologicalSex, Handedness, Laterality etc.'],
    ['  must match the display names from the EBRAINS KG (e.g. "Mus musculus", "adult", "gram").'],
    ['  Unmatched values will be left blank with a warning shown in the import preview.'],
    [''],
    ['MULTIPLE VALUES:'],
    ['  Disease, SubjectAttribute, TissueSampleAttribute — separate with semicolons'],
    ['  e.g. "Epilepsy;Diabetes"'],
  ]
  const ws5 = XLSX.utils.aoa_to_sheet(instructions)
  ws5['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, ws5, 'Instructions')

  XLSX.writeFile(wb, 'metadata_wizard_subjects_template.xlsx')
}

// ─── Excel parser — matches your 6-sheet format ───────────────────────────────

const parseExcelFile = (file, lookupMaps) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })

        const getSheet = (name) => {
          const ws = wb.Sheets[name]
          if (!ws) return []
          return XLSX.utils.sheet_to_json(ws, { defval: '' })
        }

        const subjectRows    = getSheet('Subject')
        const groupRows      = getSheet('SubjectGroup')
        const tissueRows     = getSheet('TissueSample')
        const collectionRows = getSheet('TissueSampleCollection')

        if (subjectRows.length === 0 && groupRows.length === 0 &&
            tissueRows.length === 0 && collectionRows.length === 0) {
          reject(new Error(
            'No data found. Expected sheets named: Subject, SubjectGroup, TissueSample, TissueSampleCollection'
          ))
          return
        }

        const warnings = []

        // ── lookup helpers ────────────────────────────────────────────────
        const resolveOne = (mapName, textValue, label) => {
          const v = String(textValue || '').trim()
          if (!v) return ''
          const map = lookupMaps[mapName]
          if (!map) return ''
          const found = map.get(v.toLowerCase())
          if (!found) {
            warnings.push(`${label}: "${v}" not found in KG — left blank`)
          }
          return found || ''
        }

        const resolveMulti = (mapName, textValue, label) => {
          const v = String(textValue || '').trim()
          if (!v) return []
          return v.split(';').map(part => resolveOne(mapName, part.trim(), label)).filter(Boolean)
        }

        // ── parse SubjectGroups ───────────────────────────────────────────
        // Build a map of groupID → group object first (subjects added below)
        const groupMap = new Map()  // groupID string → group object

        for (const row of groupRows) {
          const groupID = String(row.SubjectGroupID || '').trim()
          if (!groupID) continue

          const group = {
            id:                Date.now() + Math.random(),
            _excelID:          groupID,   // temporary, for subject linking
            name:              groupID,
            additionalRemarks: String(row.AdditionalRemarks || '').trim(),
            subjects:          [],
          }
          groupMap.set(groupID, group)
        }

        // ── parse Subjects ────────────────────────────────────────────────
        const flatSubjects   = []
        const subjectIdIndex = new Map()  // SubjectID string → frontend id

        for (const row of subjectRows) {
          const subjectID = String(row.SubjectID || '').trim()
          if (!subjectID) { warnings.push('Subject row skipped: missing SubjectID'); continue }

          const subj = {
            id:                Date.now() + Math.random(),
            subjectID,
            age:               String(row.Age    || '').trim(),
            ageUnit:           '',   // Excel format has no ageUnit column — left for manual selection
            weight:            String(row.Weight || '').trim(),
            weightUnit:        '',
            ageCategory:       resolveOne('agecategory',     row.AgeCategory,     `Subject "${subjectID}" AgeCategory`),
            bioSex:            resolveOne('biosex',           row.BiologicalSex,   `Subject "${subjectID}" BiologicalSex`),
            species:           resolveOne('species',          row.Species,         `Subject "${subjectID}" Species`),
            strain:            resolveOne('strain',           row.Strain,          `Subject "${subjectID}" Strain`),
            handedness:        resolveOne('handedness',       row.Handedness,      `Subject "${subjectID}" Handedness`),
            disease:           resolveMulti('disease',        row.Disease,         `Subject "${subjectID}" Disease`),
            diseaseModel:      resolveMulti('diseaseModel',   row.Disease,         `Subject "${subjectID}" Disease`),
            subjectAttribute:  resolveMulti('subjectAttribute', row.SubjectAttribute, `Subject "${subjectID}" SubjectAttribute`),
            additionalRemarks: String(row.AdditionalRemarks || '').trim(),
            file_path:         '',
            linkedSampleIds:   [],
          }

          subjectIdIndex.set(subjectID, subj.id)

          const groupID = String(row.IsPartOf || '').trim()
          if (groupID && groupMap.has(groupID)) {
            groupMap.get(groupID).subjects.push(subj)
          } else {
            if (groupID) warnings.push(`Subject "${subjectID}": group "${groupID}" not found in SubjectGroup sheet — placed in flat list`)
            flatSubjects.push(subj)
          }
        }

        // convert groupMap to array, drop groups with no subjects
        const groups = [...groupMap.values()].filter(g => g.subjects.length > 0)

        // ── parse TissueSampleCollections ─────────────────────────────────
        const collectionMap = new Map()  // collectionID → collection object

        for (const row of collectionRows) {
          const collID = String(row.TissueSampleCollectionID || '').trim()
          if (!collID) continue

          // resolve DescendedFromSubjectID for linking
          const linkedSubjStr = String(row.DescendedFromSubjectID || '').trim()
          const linkedSubjectId = subjectIdIndex.get(linkedSubjStr) || null

          const collection = {
            id:                Date.now() + Math.random(),
            _excelID:          collID,
            collectionID:      collID,
            additionalRemarks: String(row.AdditionalRemarks || '').trim(),
            linkedSubjectId,   // stored at collection level for reference
            samples:           [],
          }
          collectionMap.set(collID, collection)
        }

        // ── parse TissueSamples ───────────────────────────────────────────
        const flatSamples = []

        for (const row of tissueRows) {
          const sampleID = String(row.TissueSampleID || '').trim()
          if (!sampleID) { warnings.push('TissueSample row skipped: missing TissueSampleID'); continue }

          const linkedSubjStr   = String(row.DescendedFromSubjectID || '').trim()
          const linkedSubjectId = subjectIdIndex.get(linkedSubjStr) || null

          if (linkedSubjStr && !linkedSubjectId) {
            warnings.push(`Sample "${sampleID}": subject "${linkedSubjStr}" not found in Subject sheet`)
          }

          const sample = {
            id:                   Date.now() + Math.random(),
            sampleID,
            type:                 resolveOne('tissueSampleType',       row.TissueSampleType,     `Sample "${sampleID}" TissueSampleType`),
            species:              resolveOne('species',                 row.Species,              `Sample "${sampleID}" Species`),
            strain:               resolveOne('strain',                  row.Strain,               `Sample "${sampleID}" Strain`),
            biologicalSex:        resolveOne('biosex',                  row.BiologicalSex,        `Sample "${sampleID}" BiologicalSex`),
            laterality:           resolveOne('laterality',              row.Laterality,           `Sample "${sampleID}" Laterality`),
            origin:               resolveOne('origin',                  row.Origin,               `Sample "${sampleID}" Origin`),
            age:                  String(row.Age    || '').trim(),
            ageUnit:              '',
            weight:               String(row.Weight || '').trim(),
            weightUnit:           '',
            pathology:            resolveMulti('disease', row.Disease, `Sample "${sampleID}" Disease`),
            tissueSampleAttribute: resolveMulti('tissueSampleAttribute', row.TissueSampleAttribute, `Sample "${sampleID}" TissueSampleAttribute`),
            additionalRemarks:    String(row.AdditionalRemarks || '').trim(),
            linkedSubjectId,
          }

          const collID = String(row.IsPartOf || '').trim()
          if (collID && collectionMap.has(collID)) {
            collectionMap.get(collID).samples.push(sample)
          } else {
            if (collID) warnings.push(`Sample "${sampleID}": collection "${collID}" not found in TissueSampleCollection sheet — placed in flat list`)
            flatSamples.push(sample)
          }
        }

        // drop empty collections
        const collections = [...collectionMap.values()].filter(c => c.samples.length > 0)

        resolve({ groups, flatSubjects, collections, flatSamples, warnings })

      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}


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
    ...allTissueSamples.map(s => ({ id: s.id, label: s.sampleID || `Sample ${s.id}` })),
    ...allTissueCollections.flatMap(c =>
      c.samples.map(s => ({ id: s.id, label: `[${c.collectionID || 'Collection'}] ${s.sampleID || `Sample ${s.id}`}` }))
    )
  ]

  return (
    <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13, fontWeight: 500 }}>
          {label ?? `Subject ${index + 1}`}, id:
        </span>
        <Input value={field.subjectID}
          onChange={(e) => onRowChange(index, 'subjectID', e.target.value)}
          placeholder="Generic id" style={{ flex: '1 1 180px', maxWidth: 260 }} size="small"
        />
        <Button size="small" type="text" danger onClick={() => onRemove(index)}>Remove</Button>
        <Button size="small" type="text" onClick={() => onDuplicate(index)}>Duplicate</Button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>

        <Form.Item label={<span style={LABEL_STYLE}>Sex</span>} style={itemStyle('130px')}>
          <Select {...sel()} size="small" value={field.bioSex || undefined}
            onChange={(v) => onRowChange(index, 'bioSex', v ?? '')} placeholder="sex">
            {biosex.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Age category</span>} style={itemStyle('150px')}>
          <Select {...sel()} size="small" value={field.ageCategory || undefined}
            onChange={(v) => onRowChange(index, 'ageCategory', v ?? '')} placeholder="age category">
            {agecategory.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Species</span>} style={itemStyle('200px')}>
          <Select {...sel()} size="small" value={field.species || undefined}
            onChange={(v) => onRowChange(index, { species: v ?? '', strain: '' })} placeholder="species">
            {species.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Strain</span>} style={itemStyle('150px')}>
          <Select {...sel()} size="small" value={field.strain || undefined}
            onChange={(v) => onRowChange(index, 'strain', v ?? '')}
            placeholder={!field.species ? 'select species first' : filteredStrain.length === 0 ? 'none' : 'strain'}
            disabled={!field.species || filteredStrain.length === 0}>
            {filteredStrain.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Age</span>} style={itemStyle('195px')}>
          <ValueUnitField value={field.age} unit={field.ageUnit}
            onValueChange={(e) => onRowChange(index, 'age', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'ageUnit', v ?? '')} units={ageUnits} />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Weight</span>} style={itemStyle('195px')}>
          <ValueUnitField value={field.weight} unit={field.weightUnit}
            onValueChange={(e) => onRowChange(index, 'weight', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'weightUnit', v ?? '')} units={weightUnits} />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Pathology</span>} style={itemStyle('220px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={[...(field.disease || []), ...(field.diseaseModel || [])]}
            onChange={(v) => {
              const diseaseIds    = v.filter(id => diseaseData.find(d => d.identifier === id))
              const diseaseModIds = v.filter(id => diseaseModelData.find(d => d.identifier === id))
              onRowChange(index, { disease: diseaseIds, diseaseModel: diseaseModIds })
            }}
            placeholder="disease / model" optionFilterProp="label"
            filterOption={(input, option) => {
              if (!option || option.options) return false
              return (option.label || '').toString().toLowerCase().includes(input.toLowerCase())
            }}>
            <Select.OptGroup label="Disease">
              {diseaseData.map(o => <Option key={o.identifier} value={o.identifier} label={o.name}>{o.name}</Option>)}
            </Select.OptGroup>
            <Select.OptGroup label="Disease Model">
              {diseaseModelData.map(o => <Option key={o.identifier} value={o.identifier} label={o.name}>{o.name}</Option>)}
            </Select.OptGroup>
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Handedness</span>} style={itemStyle('130px')}>
          <Select {...sel()} size="small" value={field.handedness || undefined}
            onChange={(v) => onRowChange(index, 'handedness', v ?? '')} placeholder="handedness">
            {handedness.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Attribute</span>} style={itemStyle('160px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.subjectAttribute || []}
            onChange={(v) => onRowChange(index, 'subjectAttribute', v)} placeholder="attribute">
            {subjectAttributeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        {allSamplesForLinking.length > 0 && (
          <Form.Item label={<span style={LABEL_STYLE}>Extracted tissue samples</span>} style={itemStyle('220px')}>
            <Select {...sel()} size="small" mode="multiple"
              value={field.linkedSampleIds || []}
              onChange={(v) => onRowChange(index, 'linkedSampleIds', v)} placeholder="link tissue samples...">
              {allSamplesForLinking.map(s => <Option key={s.id} value={s.id}>{s.label}</Option>)}
            </Select>
          </Form.Item>
        )}

        <Form.Item label={<span style={LABEL_STYLE}>Remarks</span>} style={{ flex: '1 1 150px', marginBottom: 0, minWidth: 0 }}>
          <Input size="small" value={field.additionalRemarks || ''}
            onChange={(e) => onRowChange(index, 'additionalRemarks', e.target.value)}
            placeholder="remarks..." />
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
        <Input size="small" value={field.sampleID}
          onChange={(e) => onRowChange(index, 'sampleID', e.target.value)}
          placeholder="Sample id" style={{ flex: '1 1 180px', maxWidth: 260 }} />
        <Button size="small" type="text" danger onClick={() => onRemove(index)}>Remove</Button>
        <Button size="small" type="text" onClick={() => onDuplicate(index)}>Duplicate</Button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>

        <Form.Item label={<span style={LABEL_STYLE}>Type</span>} style={itemStyle('160px')}>
          <Select {...sel()} size="small" value={field.type || undefined}
            onChange={(v) => onRowChange(index, 'type', v ?? '')} placeholder="sample type">
            {tissueSampleTypeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Species</span>} style={itemStyle('200px')}>
          <Select {...sel()} size="small" value={field.species || undefined}
            onChange={(v) => onRowChange(index, { species: v ?? '', strain: '' })} placeholder="species">
            {species.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Strain</span>} style={itemStyle('150px')}>
          <Select {...sel()} size="small" value={field.strain || undefined}
            onChange={(v) => onRowChange(index, 'strain', v ?? '')}
            placeholder={!field.species ? 'select species first' : filteredStrain.length === 0 ? 'none' : 'strain'}
            disabled={!field.species || filteredStrain.length === 0}>
            {filteredStrain.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Sex</span>} style={itemStyle('120px')}>
          <Select {...sel()} size="small" value={field.biologicalSex || undefined}
            onChange={(v) => onRowChange(index, 'biologicalSex', v ?? '')} placeholder="sex">
            {biosex.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Laterality</span>} style={itemStyle('130px')}>
          <Select {...sel()} size="small" value={field.laterality || undefined}
            onChange={(v) => onRowChange(index, 'laterality', v ?? '')} placeholder="laterality">
            {lateralityData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Origin</span>} style={itemStyle('200px')}>
          <Select {...sel()} size="small" value={field.origin || undefined}
            onChange={(v) => onRowChange(index, 'origin', v ?? '')} placeholder="origin"
            optionFilterProp="label"
            filterOption={(input, option) => {
              if (!option || option.options) return false
              return (option.label || '').toString().toLowerCase().includes(input.toLowerCase())
            }}>
            {[...new Set(originData.map(o => o.originType))].sort().map(type => (
              <Select.OptGroup key={type} label={type}>
                {originData.filter(o => o.originType === type).map(o => (
                  <Option key={o.identifier} value={o.identifier} label={o.name}>{o.name}</Option>
                ))}
              </Select.OptGroup>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Age</span>} style={itemStyle('195px')}>
          <ValueUnitField value={field.age} unit={field.ageUnit}
            onValueChange={(e) => onRowChange(index, 'age', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'ageUnit', v ?? '')} units={ageUnits} />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Weight</span>} style={itemStyle('195px')}>
          <ValueUnitField value={field.weight} unit={field.weightUnit}
            onValueChange={(e) => onRowChange(index, 'weight', e.target.value)}
            onUnitChange={(v) => onRowChange(index, 'weightUnit', v ?? '')} units={weightUnits} />
        </Form.Item>

        <Form.Item label={<span style={LABEL_STYLE}>Pathology</span>} style={itemStyle('220px')}>
          <Select {...sel()} size="small" mode="multiple"
            value={field.pathology || []}
            onChange={(v) => onRowChange(index, 'pathology', v)}
            placeholder="disease / model" optionFilterProp="label"
            filterOption={(input, option) => {
              if (!option || option.options) return false
              return (option.label || '').toString().toLowerCase().includes(input.toLowerCase())
            }}>
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
            onChange={(v) => onRowChange(index, 'tissueSampleAttribute', v)} placeholder="attribute">
            {tissueSampleAttributeData.map(o => <Option key={o.identifier} value={o.identifier}>{o.name}</Option>)}
          </Select>
        </Form.Item>

        {allSubjectsForLinking.length > 0 && (
          <Form.Item label={<span style={LABEL_STYLE}>Extracted from subject</span>} style={itemStyle('220px')}>
            <Select {...sel()} size="small" value={field.linkedSubjectId || undefined}
              onChange={(v) => onRowChange(index, 'linkedSubjectId', v ?? null)} placeholder="link to subject...">
              {allSubjectsForLinking.map(s => <Option key={s.id} value={s.id}>{s.label}</Option>)}
            </Select>
          </Form.Item>
        )}

        <Form.Item label={<span style={LABEL_STYLE}>Remarks</span>} style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <Input size="small" value={field.additionalRemarks || ''}
            onChange={(e) => onRowChange(index, 'additionalRemarks', e.target.value)}
            placeholder="remarks..." />
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

  const [mode, setMode]             = useState(data.subjectMetadata?.subjectGroups ? 'grouped' : 'flat')
  const [subjectsData, setSubjectData] = useState(data.subjectMetadata?.subjects || [])
  const [groups, setGroups]         = useState(data.subjectMetadata?.subjectGroups || [])
  const [tissueCollections, setTissueCollections] = useState(data.subjectMetadata?.tissueCollections || [])
  const [tissueSamples, setTissueSamples]         = useState(data.subjectMetadata?.tissueSamples || [])
  const [tissueMode, setTissueMode] = useState(data.subjectMetadata?.tissueCollections?.length ? 'collections' : 'flat')

  // ── excel upload state ────────────────────────────────────────────────────
  const [excelModalVisible, setExcelModalVisible] = useState(false)
  const [excelWarnings, setExcelWarnings]         = useState([])
  const [excelPreview, setExcelPreview]           = useState(null)
  const [excelParsing, setExcelParsing]           = useState(false)
  const [excelFileName, setExcelFileName]         = useState('')

  const ageUnits    = allUnits.filter(u => AGE_UNIT_NAMES.has(u.name))
  const weightUnits = allUnits.filter(u => WEIGHT_UNIT_NAMES.has(u.name))

  useEffect(() => {
    setSubjectData(data.subjectMetadata?.subjects           || [])
    setGroups(data.subjectMetadata?.subjectGroups           || [])
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

  // ── build lookup maps for Excel parsing ───────────────────────────────────
  // Maps lowercase name → identifier for each controlled term list
  const buildLookupMaps = () => {
    const makeMap = (arr) => new Map(arr.map(o => [o.name.toLowerCase(), o.identifier]))
    return {
      biosex:               makeMap(biosex),
      agecategory:          makeMap(agecategory),
      species:              makeMap(species),
      strain:               makeMap(strainData),
      handedness:           makeMap(handedness),
      disease:              makeMap([...diseaseData, ...diseaseModelData]),
      diseaseModel:         makeMap(diseaseModelData),
      subjectAttribute:     makeMap(subjectAttributeData),
      tissueSampleType:     makeMap(tissueSampleTypeData),
      laterality:           makeMap(lateralityData),
      origin:               makeMap(originData),
      tissueSampleAttribute: makeMap(tissueSampleAttributeData),
      units:                makeMap(allUnits),
    }
  }

  // ── Excel upload handler ──────────────────────────────────────────────────
  const handleExcelUpload = async (file) => {
    setExcelParsing(true)
    setExcelWarnings([])
    setExcelPreview(null)
    setExcelFileName(file.name)

    try {
      const lookupMaps = buildLookupMaps()
      const result     = await parseExcelFile(file, lookupMaps)
      setExcelPreview(result)
      setExcelWarnings(result.warnings || [])
      setExcelModalVisible(true)
    } catch (err) {
      setExcelWarnings([`Error parsing file: ${err.message}`])
      setExcelModalVisible(true)
    } finally {
      setExcelParsing(false)
    }
    return false  // prevent default upload behaviour
  }

  // ── apply parsed Excel data to the form ───────────────────────────────────
  const applyExcelData = () => {
    if (!excelPreview) return

    const { groups: parsedGroups, flatSubjects, collections, flatSamples } = excelPreview

    const hasGroups      = parsedGroups.length > 0
    const hasCollections = collections.length > 0

    if (hasGroups) {
      setGroups(parsedGroups)
      setMode('grouped')
      setSubjectData([])
      emit({ subjectGroups: parsedGroups, subjects: undefined })
    } else if (flatSubjects.length > 0) {
      setSubjectData(flatSubjects)
      setMode('flat')
      setGroups([])
      emit({ subjects: flatSubjects, subjectGroups: undefined })
    }

    if (hasCollections) {
      setTissueCollections(collections)
      setTissueMode('collections')
      setTissueSamples([])
      emit({ tissueCollections: collections, tissueSamples: undefined })
    } else if (flatSamples.length > 0) {
      setTissueSamples(flatSamples)
      setTissueMode('flat')
      setTissueCollections([])
      emit({ tissueSamples: flatSamples, tissueCollections: undefined })
    }

    setExcelModalVisible(false)
    setExcelPreview(null)
  }

  // ── bidirectional link helpers (unchanged) ────────────────────────────────

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

  const buildTissuePatchFromSubject = (subject) => ({
    linkedSubjectId: subject.id,
    species:         subject.species  || '',
    strain:          subject.strain   || '',
    biologicalSex:   subject.bioSex   || '',
    age:             subject.age      || '',
    ageUnit:         subject.ageUnit  || '',
    pathology: [...(subject.disease || []), ...(subject.diseaseModel || [])]
  })

  const patchFlatSamples      = (samples, targetId, patch) => samples.map(s => s.id === targetId ? { ...s, ...patch } : s)
  const patchCollectionSamples = (collections, targetId, patch) => collections.map(c => ({ ...c, samples: c.samples.map(s => s.id === targetId ? { ...s, ...patch } : s) }))
  const patchFlatSubjects     = (subjects, targetId, patch) => subjects.map(s => s.id === targetId ? { ...s, ...patch } : s)
  const patchGroupSubjects    = (grps, targetId, patch) => grps.map(g => ({ ...g, subjects: g.subjects.map(s => s.id === targetId ? { ...s, ...patch } : s) }))

  const syncSubjectLinkedSamples = (subjectId, newSampleIds, prevSampleIds = [], flatSubjects = subjectsData, grps = groups) => {
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
      nextFlatSamples = patchFlatSamples(nextFlatSamples, sampleId, { linkedSubjectId: null })
      nextCollections = patchCollectionSamples(nextCollections, sampleId, { linkedSubjectId: null })
    }
    setTissueSamples(nextFlatSamples)
    setTissueCollections(nextCollections)
    return { tissueSamples: nextFlatSamples, tissueCollections: nextCollections }
  }

  const syncTissueLinkedSubject = (sampleId, newSubjectId, prevSubjectId) => {
    const subject = findSubjectById(newSubjectId)
    const patch   = subject ? buildTissuePatchFromSubject(subject) : { linkedSubjectId: newSubjectId }
    let nextFlatSamples  = patchFlatSamples(tissueSamples, sampleId, patch)
    let nextCollections  = patchCollectionSamples(tissueCollections, sampleId, patch)
    let nextFlatSubjects = subjectsData
    let nextGroups       = groups
    if (newSubjectId && subject) {
      const subjPatch = { linkedSampleIds: [...new Set([...(subject.linkedSampleIds || []), sampleId])] }
      nextFlatSubjects = patchFlatSubjects(subjectsData, newSubjectId, subjPatch)
      nextGroups       = patchGroupSubjects(groups, newSubjectId, subjPatch)
    }
    if (prevSubjectId && prevSubjectId !== newSubjectId) {
      const prevSubject = findSubjectById(prevSubjectId, nextFlatSubjects, nextGroups)
      if (prevSubject) {
        const removePatch = { linkedSampleIds: (prevSubject.linkedSampleIds || []).filter(id => String(id) !== String(sampleId)) }
        nextFlatSubjects = patchFlatSubjects(nextFlatSubjects, prevSubjectId, removePatch)
        nextGroups       = patchGroupSubjects(nextGroups, prevSubjectId, removePatch)
      }
    }
    setTissueSamples(nextFlatSamples)
    setTissueCollections(nextCollections)
    setSubjectData(nextFlatSubjects)
    setGroups(nextGroups)
    return { tissueSamples: nextFlatSamples, tissueCollections: nextCollections, subjects: nextFlatSubjects, subjectGroups: nextGroups }
  }

  // ── subject/group/tissue handlers (unchanged) ─────────────────────────────

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

  const handleSubjectChange = (i, fieldOrPatch, value) => {
    if (fieldOrPatch === 'linkedSampleIds') {
      const subject = subjectsData[i]
      const prev    = subject?.linkedSampleIds || []
      const tissueUpdates = syncSubjectLinkedSamples(subject.id, value, prev)
      const updated = subjectsData.map((s, idx) => idx === i ? { ...s, linkedSampleIds: value } : s)
      setSubjectData(updated); emit({ subjects: updated, ...(tissueUpdates || {}) }); return
    }
    const updated = subjectsData.map((s, idx) => {
      if (idx !== i) return s
      if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
      return { ...s, [fieldOrPatch]: value }
    })
    setSubjectData(updated); emit({ subjects: updated })
  }

  const addNewSubject    = () => { const u = [...subjectsData, newSubject()]; setSubjectData(u); emit({ subjects: u }) }
  const removeSubject    = (i) => { const u = subjectsData.filter((_, idx) => idx !== i); setSubjectData(u); emit({ subjects: u }) }
  const duplicateSubject = (i) => {
    const u = [...subjectsData.slice(0, i + 1), { ...subjectsData[i], id: Date.now() + Math.random() }, ...subjectsData.slice(i + 1)]
    setSubjectData(u); emit({ subjects: u })
  }

  const updateGroups       = (next) => { setGroups(next); emit({ subjectGroups: next }) }
  const addGroup           = ()     => updateGroups([...groups, newGroup(groups.length)])
  const removeGroup        = (gi)   => updateGroups(groups.filter((_, i) => i !== gi))
  const renameGroup        = (gi, name) => updateGroups(groups.map((g, i) => i === gi ? { ...g, name } : g))
  const updateGroupRemarks = (gi, r)    => updateGroups(groups.map((g, i) => i === gi ? { ...g, additionalRemarks: r } : g))
  const addSubjectToGroup  = (gi)       => updateGroups(groups.map((g, i) => i === gi ? { ...g, subjects: [...g.subjects, newSubject()] } : g))

  const duplicateGroup = (gi) => {
    const copy = { ...groups[gi], id: Date.now() + Math.random(), name: `${groups[gi].name} (copy)`, subjects: groups[gi].subjects.map(s => ({ ...s, id: Date.now() + Math.random() })) }
    updateGroups([...groups.slice(0, gi + 1), copy, ...groups.slice(gi + 1)])
  }
  const removeSubjectFromGroup  = (gi, si) => updateGroups(groups.map((g, i) => i === gi ? { ...g, subjects: g.subjects.filter((_, j) => j !== si) } : g))
  const duplicateSubjectInGroup = (gi, si) => updateGroups(groups.map((g, i) => {
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
        return { ...g, subjects: g.subjects.map((s, j) => j === si ? { ...s, linkedSampleIds: value } : s) }
      })
      setGroups(nextGroups)
      const tissueUpdates = syncSubjectLinkedSamples(subject.id, value, prev, subjectsData, nextGroups)
      emit({ subjectGroups: nextGroups, ...(tissueUpdates || {}) }); return
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

  const handleTissueSampleChange = (i, fieldOrPatch, value) => {
    if (fieldOrPatch === 'linkedSubjectId') {
      const sample = tissueSamples[i]
      emit(syncTissueLinkedSubject(sample.id, value, sample?.linkedSubjectId)); return
    }
    const updated = tissueSamples.map((s, idx) => {
      if (idx !== i) return s
      if (typeof fieldOrPatch === 'object') return { ...s, ...fieldOrPatch }
      return { ...s, [fieldOrPatch]: value }
    })
    setTissueSamples(updated); emit({ tissueSamples: updated })
  }

  const addTissueSample       = () => { const u = [...tissueSamples, newTissueSample()]; setTissueSamples(u); emit({ tissueSamples: u }) }
  const removeTissueSample    = (i) => { const u = tissueSamples.filter((_, idx) => idx !== i); setTissueSamples(u); emit({ tissueSamples: u }) }
  const duplicateTissueSample = (i) => {
    const u = [...tissueSamples.slice(0, i + 1), { ...tissueSamples[i], id: Date.now() + Math.random() }, ...tissueSamples.slice(i + 1)]
    setTissueSamples(u); emit({ tissueSamples: u })
  }

  const updateCollections   = (next) => { setTissueCollections(next); emit({ tissueCollections: next }) }
  const addCollection       = ()     => updateCollections([...tissueCollections, newTissueSampleCollection()])
  const removeCollection    = (ci)   => updateCollections(tissueCollections.filter((_, i) => i !== ci))
  const renameCollection    = (ci, id) => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, collectionID: id } : c))
  const updateCollRemarks   = (ci, r)  => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, additionalRemarks: r } : c))

  const duplicateCollection = (ci) => {
    const copy = { ...tissueCollections[ci], id: Date.now() + Math.random(), collectionID: `${tissueCollections[ci].collectionID} (copy)`, additionalRemarks: tissueCollections[ci].additionalRemarks || '', samples: tissueCollections[ci].samples.map(s => ({ ...s, id: Date.now() + Math.random() })) }
    updateCollections([...tissueCollections.slice(0, ci + 1), copy, ...tissueCollections.slice(ci + 1)])
  }

  const addSampleToCollection      = (ci)     => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, samples: [...c.samples, newTissueSample()] } : c))
  const removeSampleFromCollection = (ci, si) => updateCollections(tissueCollections.map((c, i) => i === ci ? { ...c, samples: c.samples.filter((_, j) => j !== si) } : c))
  const duplicateSampleInCollection = (ci, si) => updateCollections(tissueCollections.map((c, i) => {
    if (i !== ci) return c
    const copy = { ...c.samples[si], id: Date.now() + Math.random() }
    return { ...c, samples: [...c.samples.slice(0, si + 1), copy, ...c.samples.slice(si + 1)] }
  }))

  const handleCollectionSampleChange = (ci, si, fieldOrPatch, value) => {
    if (fieldOrPatch === 'linkedSubjectId') {
      const sample = tissueCollections[ci]?.samples?.[si]
      emit(syncTissueLinkedSubject(sample.id, value, sample?.linkedSubjectId)); return
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

  const subjectRowProps = {
    biosex, agecategory, species, strainData,
    diseaseData, diseaseModelData, subjectAttributeData,
    handedness, ageUnits, weightUnits,
    allTissueSamples: tissueSamples, allTissueCollections: tissueCollections,
  }

  const tissueRowProps = {
    species, strainData, biosex, lateralityData, originData, tissueSampleTypeData,
    diseaseData, diseaseModelData, tissueSampleAttributeData, ageUnits, weightUnits,
    allSubjects: subjectsData, allGroups: groups,
  }

  // ── preview table columns ─────────────────────────────────────────────────
  const previewSubjectCols = [
    { title: 'Subject ID', dataIndex: 'subjectID', key: 'subjectID', width: 120 },
    { title: 'Group',      dataIndex: 'groupName', key: 'groupName', width: 100,
      render: (_, r) => {
        if (!excelPreview) return '—'
        for (const g of excelPreview.groups)
          if (g.subjects.some(s => s.id === r.id)) return g.name
        return '(flat)'
      }
    },
    { title: 'Species', key: 'species', width: 140,
      render: (_, r) => species.find(s => s.identifier === r.species)?.name || r.species || '—' },
    { title: 'Strain',  key: 'strain',  width: 120,
      render: (_, r) => strainData.find(s => s.identifier === r.strain)?.name || r.strain || '—' },
    { title: 'Age',     key: 'age',     width: 80,
      render: (_, r) => r.age ? `${r.age} ${allUnits.find(u => u.identifier === r.ageUnit)?.name || ''}` : '—' },
  ]

  const previewTissueCols = [
    { title: 'Sample ID',   dataIndex: 'sampleID',   key: 'sampleID',   width: 120 },
    { title: 'Collection',  key: 'collection', width: 120,
      render: (_, r) => {
        if (!excelPreview) return '—'
        for (const c of excelPreview.collections)
          if (c.samples.some(s => s.id === r.id)) return c.collectionID
        return '(flat)'
      }
    },
    { title: 'Species', key: 'species', width: 140,
      render: (_, r) => species.find(s => s.identifier === r.species)?.name || r.species || '—' },
    { title: 'Type',    key: 'type',    width: 120,
      render: (_, r) => tissueSampleTypeData.find(t => t.identifier === r.type)?.name || r.type || '—' },
  ]

  const allPreviewSubjects = excelPreview
    ? [...excelPreview.flatSubjects, ...excelPreview.groups.flatMap(g => g.subjects)]
    : []
  const allPreviewSamples = excelPreview
    ? [...excelPreview.flatSamples, ...excelPreview.collections.flatMap(c => c.samples)]
    : []

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p className="step-title" style={{ margin: 0 }}>Subjects & Tissue Samples</p>

        {/* ── Excel upload controls ── */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={downloadExcelTemplate}
            title="Download Excel template"
          >
            Download template
          </Button>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={handleExcelUpload}
          >
            <Button
              size="small"
              icon={<FileExcelOutlined style={{ color: '#217346' }} />}
              loading={excelParsing}
              title="Upload Excel file to autofill subjects and tissue samples"
            >
              Import from Excel
            </Button>
          </Upload>
        </div>
      </div>

      {/* ── Excel preview modal ── */}
      <Modal
        open={excelModalVisible}
        title={
          <span>
            <FileExcelOutlined style={{ color: '#217346', marginRight: 8 }} />
            Import from Excel{excelFileName ? ` — ${excelFileName}` : ''}
          </span>
        }
        width={800}
        onCancel={() => { setExcelModalVisible(false); setExcelPreview(null) }}
        footer={[
          <Button key="cancel" onClick={() => { setExcelModalVisible(false); setExcelPreview(null) }}>
            Cancel
          </Button>,
          excelPreview && (allPreviewSubjects.length > 0 || allPreviewSamples.length > 0) && (
            <Button key="apply" type="primary" onClick={applyExcelData}>
              Apply ({allPreviewSubjects.length} subject{allPreviewSubjects.length !== 1 ? 's' : ''}
              {allPreviewSamples.length > 0 ? `, ${allPreviewSamples.length} sample${allPreviewSamples.length !== 1 ? 's' : ''}` : ''})
            </Button>
          )
        ].filter(Boolean)}
      >
        {/* warnings */}
        {excelWarnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${excelWarnings.length} warning${excelWarnings.length > 1 ? 's' : ''}`}
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {excelWarnings.map((w, i) => <li key={i}><Text style={{ fontSize: 12 }}>{w}</Text></li>)}
              </ul>
            }
          />
        )}

        {!excelPreview && excelWarnings.length > 0 && (
          <Alert type="error" showIcon message="Could not parse the file. Please check the warnings above and use the correct template." />
        )}

        {excelPreview && allPreviewSubjects.length === 0 && allPreviewSamples.length === 0 && (
          <Alert type="warning" showIcon message="No subjects or tissue samples found in the file. Is the sheet named correctly?" />
        )}

        {/* subject preview */}
        {excelPreview && allPreviewSubjects.length > 0 && (
          <>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Subjects ({allPreviewSubjects.length})
              {excelPreview.groups.length > 0 && ` — ${excelPreview.groups.length} group${excelPreview.groups.length > 1 ? 's' : ''}`}
            </Text>
            <Table
              dataSource={allPreviewSubjects}
              columns={previewSubjectCols}
              rowKey="id"
              size="small"
              pagination={allPreviewSubjects.length > 8 ? { pageSize: 8 } : false}
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        {/* tissue preview */}
        {excelPreview && allPreviewSamples.length > 0 && (
          <>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Tissue samples ({allPreviewSamples.length})
              {excelPreview.collections.length > 0 && ` — ${excelPreview.collections.length} collection${excelPreview.collections.length > 1 ? 's' : ''}`}
            </Text>
            <Table
              dataSource={allPreviewSamples}
              columns={previewTissueCols}
              rowKey="id"
              size="small"
              pagination={allPreviewSamples.length > 8 ? { pageSize: 8 } : false}
            />
          </>
        )}
      </Modal>

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
                    onChange={handleSubjectChange} {...subjectRowProps} />
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addNewSubject} style={{ width: '30%' }}>Add new subject</Button>
                </div>
              </>
            )}

            {mode === 'grouped' && (
              <>
                {groups.map((group, gi) => (
                  <div key={group.id} style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: '14px 18px', marginBottom: 20, background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Input value={group.name} size="small" style={{ fontWeight: 600, width: 200 }}
                        onChange={(e) => renameGroup(gi, e.target.value)} placeholder={`Group ${gi + 1} name`} />
                      <Button size="small" type="text" onClick={() => duplicateGroup(gi)}>Duplicate group</Button>
                      <Button size="small" type="text" danger onClick={() => removeGroup(gi)} disabled={groups.length === 1}>Remove group</Button>
                    </div>
                    <Form.Item label={<span style={LABEL_STYLE}>Group remarks</span>} style={{ marginBottom: 12 }}>
                      <Input size="small" value={group.additionalRemarks || ''}
                        onChange={(e) => updateGroupRemarks(gi, e.target.value)} placeholder="Remarks..." />
                    </Form.Item>
                    {group.subjects.map((field, si) => (
                      <SubjectRow key={field.id} field={field} index={si} label={`Subject ${si + 1}`}
                        onRemove={(i) => removeSubjectFromGroup(gi, i)}
                        onDuplicate={(i) => duplicateSubjectInGroup(gi, i)}
                        onChange={(i, fOrP, val) => handleGroupSubjectChange(gi, i, fOrP, val)}
                        {...subjectRowProps} />
                    ))}
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Button type="dashed" size="small" onClick={() => addSubjectToGroup(gi)} style={{ width: '40%' }}>
                        + Add subject to {group.name}
                      </Button>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addGroup} style={{ width: '30%' }}>+ Add new group</Button>
                </div>
              </>
            )}
          </Form>
        </TabPane>

        {/* ══ TISSUE SAMPLES ════════════════════════════════════════════════ */}
        <TabPane tab="Tissue Samples" key="tissue">
          <Form.Item label={<span style={LABEL_STYLE}>Are tissue samples organised into collections?</span>} style={{ marginBottom: 12 }}>
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
                    onRemove={removeTissueSample} onDuplicate={duplicateTissueSample}
                    onChange={handleTissueSampleChange} {...tissueRowProps} />
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addTissueSample} style={{ width: '30%' }}>Add tissue sample</Button>
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
                        style={{ fontWeight: 600, width: 220 }} placeholder={`Collection ${ci + 1} id`} />
                      <Button size="small" type="text" onClick={() => duplicateCollection(ci)}>Duplicate collection</Button>
                      <Button size="small" type="text" danger onClick={() => removeCollection(ci)} disabled={tissueCollections.length === 1}>
                        Remove collection
                      </Button>
                    </div>
                    <Form.Item label={<span style={LABEL_STYLE}>Collection remarks</span>} style={{ marginBottom: 12 }}>
                      <Input size="small" value={collection.additionalRemarks || ''}
                        onChange={(e) => updateCollRemarks(ci, e.target.value)}
                        placeholder="Additional remarks about this collection..." />
                    </Form.Item>
                    {collection.samples.map((field, si) => (
                      <TissueSampleRow key={field.id} field={field} index={si}
                        onRemove={(i) => removeSampleFromCollection(ci, i)}
                        onDuplicate={(i) => duplicateSampleInCollection(ci, i)}
                        onChange={(i, fOrP, val) => handleCollectionSampleChange(ci, i, fOrP, val)}
                        {...tissueRowProps} />
                    ))}
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Button type="dashed" size="small" onClick={() => addSampleToCollection(ci)} style={{ width: '40%' }}>
                        + Add sample to collection {ci + 1}
                      </Button>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Button type="dashed" onClick={addCollection} style={{ width: '30%' }}>+ Add new collection</Button>
                </div>
              </>
            )}
          </Form>
        </TabPane>
      </Tabs>
    </div>
  )
}