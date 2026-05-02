import { Form, Input, Button, Select, Checkbox, Spin, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'

const { Option } = Select

// ── helpers ───────────────────────────────────────────────────────────────────

const newFunder = () => ({
  id:                Date.now() + Math.random(),
  mode:              'kg',
  selectedFundingId: '',
  selectedFunderId:  '',
  funderName:        '',
  awardTitle:        '',
  awardNumber:       '',
  revision:          '',
  // custom mode only
  customFunderName:  '',
  grantId:           '',
})

// build deduplicated funder list from enriched funding entries
// returns [{ id, name }] sorted alphabetically by name
const buildFunderList = (fundingData) => {
  const seen = new Map()
  for (const f of fundingData) {
    const id   = f.funder?.['@id'] || ''
    const name = f.funderName || id
    if (id && !seen.has(id)) seen.set(id, name)
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── FunderRow ─────────────────────────────────────────────────────────────────

function FunderRow({ field, index, fundingData, funderList, onRemove, onChange }) {

  const [isCustom,        setIsCustom]        = useState(field.mode === 'custom')
  const [selectedFunder,  setSelectedFunder]  = useState(field.selectedFunderId  || '')
  const [selectedFunding, setSelectedFunding] = useState(field.selectedFundingId || '')
  const [awardsForFunder, setAwardsForFunder] = useState([])
  const [awardSearch,     setAwardSearch]     = useState('')

  // recompute award list whenever selected funder changes
  useEffect(() => {
    if (!selectedFunder) { setAwardsForFunder([]); return }
    setAwardsForFunder(
      fundingData.filter(f =>
        f.funder?.['@id'] === selectedFunder && f.uuid
      )
    )
  }, [selectedFunder, fundingData])

  // sync if parent data changes (e.g. JSON import)
  useEffect(() => {
    setIsCustom(field.mode === 'custom')
    setSelectedFunder(field.selectedFunderId   || '')
    setSelectedFunding(field.selectedFundingId || '')
  }, [field.mode, field.selectedFunderId, field.selectedFundingId])

  const handleModeToggle = (e) => {
    const custom = e.target.checked
    setIsCustom(custom)
    setSelectedFunder('')
    setSelectedFunding('')
    setAwardsForFunder([])
    onChange(index, {
      mode:              custom ? 'custom' : 'kg',
      selectedFundingId: '',
      selectedFunderId:  '',
      funderName:        '',
      awardTitle:        '',
      awardNumber:       '',
      revision:          '',
      customFunderName:  '',
      grantId:           '',
    })
  }

  const handleFunderSelect = (funderId) => {
    const funder = funderList.find(f => f.id === funderId)
    setSelectedFunder(funderId)
    setSelectedFunding('')
    setAwardSearch('')
    onChange(index, {
      selectedFunderId:  funderId,
      selectedFundingId: '',
      funderName:        funder?.name || '',
      awardTitle:        '',
      awardNumber:       '',
      revision:          '',
    })
  }

  const handleAwardSelect = (uuid) => {
    setSelectedFunding(uuid)
    const award = fundingData.find(f => f.uuid === uuid)
    if (award) {
      onChange(index, {
        selectedFundingId: uuid,
        awardTitle:        award.awardTitle  || '',
        awardNumber:       award.awardNumber || '',
        revision:          award.revision    || '',
      })
    }
  }

  // filter awards by search across title, number and revision
  const filteredAwards = awardsForFunder.filter(a =>
    !awardSearch ||
    (a.awardTitle  || '').toLowerCase().includes(awardSearch.toLowerCase()) ||
    (a.awardNumber || '').toLowerCase().includes(awardSearch.toLowerCase()) ||
    (a.revision    || '').toLowerCase().includes(awardSearch.toLowerCase())
  )

  const labelStyle = { fontSize: 12, color: '#555' }

  return (
    <div style={{
      border: '1px solid #d9d9d9', borderRadius: 8,
      padding: '16px 20px', marginBottom: 16, background: '#fafafa'
    }}>

      {/* header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14
      }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Funder {index + 1}</span>
        <Button type="text" danger size="small" onClick={() => onRemove(index)}>
          Remove
        </Button>
      </div>

      {/* manual toggle */}
      <Form.Item style={{ marginBottom: 14 }}>
        <Checkbox checked={isCustom} onChange={handleModeToggle}>
          Funding not found in EBRAINS KG — enter manually
        </Checkbox>
      </Form.Item>

      {/* ── KG mode ── */}
      {!isCustom && (
        <>
          {/* step 1 — funder name */}
          <Form.Item
            label={<span style={labelStyle}>Step 1 — Select funder organisation</span>}
            style={{ marginBottom: 12 }}
          >
            <Select
              showSearch
              allowClear
              value={selectedFunder || undefined}
              placeholder="Type to search funder by name…"
              optionFilterProp="label"
              onChange={handleFunderSelect}
              onClear={() => {
                setSelectedFunder('')
                setSelectedFunding('')
                setAwardsForFunder([])
                onChange(index, {
                  selectedFunderId:  '',
                  selectedFundingId: '',
                  funderName:        '',
                  awardTitle:        '',
                  awardNumber:       '',
                  revision:          '',
                })
              }}
              style={{ width: '100%' }}
              notFoundContent={
                <span style={{ color: '#888', fontSize: 12 }}>
                  No matching funder — try the manual entry checkbox above
                </span>
              }
            >
              {funderList.map(f => (
                <Option key={f.id} value={f.id} label={f.name}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* step 2 — award (only shown after funder selected) */}
          {selectedFunder && (
            <Form.Item
              label={<span style={labelStyle}>Step 2 — Select award / grant</span>}
              style={{ marginBottom: 12 }}
            >
              {awardsForFunder.length === 0 ? (
                <div style={{ color: '#888', fontSize: 12, padding: '4px 0' }}>
                  No awards found for this funder in the KG.
                  Please use the manual entry checkbox above.
                </div>
              ) : (
                <Select
                  showSearch
                  allowClear
                  value={selectedFunding || undefined}
                  placeholder="Type award title, number or revision…"
                  filterOption={false}
                  onSearch={setAwardSearch}
                  onChange={handleAwardSelect}
                  onClear={() => {
                    setSelectedFunding('')
                    setAwardSearch('')
                    onChange(index, {
                      selectedFundingId: '',
                      awardTitle:        '',
                      awardNumber:       '',
                      revision:          '',
                    })
                  }}
                  style={{ width: '100%' }}
                  optionLabelProp="label"
                >
                  {filteredAwards.map(a => (
                    <Option
                      key={a.uuid}
                      value={a.uuid}
                      label={a.awardTitle || a.awardNumber || a.uuid}
                    >
                      <div style={{ lineHeight: 1.4 }}>
                        {/* award title — main line */}
                        <div style={{ fontWeight: 500 }}>
                          {a.awardTitle
                            ? a.awardTitle
                            : <em style={{ color: '#aaa' }}>No title</em>
                          }
                        </div>
                        {/* award number + revision — secondary line */}
                        <div style={{ marginTop: 2 }}>
                          {a.awardNumber && (
                            <Tag color="blue" style={{ fontSize: 11 }}>
                              #{a.awardNumber}
                            </Tag>
                          )}
                          {a.revision && (
                            <Tag color="default" style={{ fontSize: 11 }}>
                              rev: {a.revision}
                            </Tag>
                          )}
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              )}
            </Form.Item>
          )}

          {/* selected award preview */}
          {selectedFunding && (field.awardTitle || field.awardNumber) && (
            <div style={{
              background: '#e6f4ff', border: '1px solid #91caff',
              borderRadius: 6, padding: '8px 12px', fontSize: 12
            }}>
              <div style={{ color: '#1677ff', fontWeight: 500, marginBottom: 4 }}>
                Selected award:
              </div>
              {field.awardTitle && (
                <div style={{ marginBottom: 2 }}>{field.awardTitle}</div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {field.awardNumber && (
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    #{field.awardNumber}
                  </Tag>
                )}
                {field.revision && (
                  <Tag color="default" style={{ fontSize: 11 }}>
                    rev: {field.revision}
                  </Tag>
                )}
                {field.funderName && (
                  <Tag color="green" style={{ fontSize: 11 }}>
                    {field.funderName}
                  </Tag>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── custom / manual mode ── */}
      {isCustom && (
        <>
          <Form.Item
            label="Funder name"
            required
            extra="Full name of the funder — no abbreviations."
            style={{ marginBottom: 12 }}
          >
            <Input
              value={field.customFunderName || field.funderName || ''}
              onChange={(e) => onChange(index, {
                customFunderName: e.target.value,
                funderName:       e.target.value,
              })}
              placeholder="e.g. European Research Council"
            />
          </Form.Item>

          <Form.Item
            label="Award title"
            style={{ marginBottom: 12 }}
          >
            <Input
              value={field.awardTitle || ''}
              onChange={(e) => onChange(index, { awardTitle: e.target.value })}
              placeholder="e.g. BrainScaleS"
            />
          </Form.Item>

          <Form.Item
            label="Grant ID / Award number"
            extra="The grant ID or award number for this funding."
            style={{ marginBottom: 0 }}
          >
            <Input
              value={field.grantId || field.awardNumber || ''}
              onChange={(e) => onChange(index, {
                grantId:     e.target.value,
                awardNumber: e.target.value,
              })}
              placeholder="e.g. ERC-2021-STG-123456"
            />
          </Form.Item>
        </>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Funding({ form, onChange, data = {} }) {

  const [funders,     setFunders]     = useState(data.funding?.funders || [])
  const [fundingData, setFundingData] = useState([])
  const [funderList,  setFunderList]  = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch('api/kginfo/funding')
        const json = res.ok ? await res.json() : { funding: [] }
        const raw  = json.funding || []
        setFundingData(raw)
        setFunderList(buildFunderList(raw))
      } catch (e) {
        console.error('Error loading funding data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    setFunders(data.funding?.funders || [])
  }, [data])

  const emit = (updated) => {
    setFunders(updated)
    onChange({ funding: { ...data.funding, funders: updated } })
  }

  const addFunder    = () => emit([...funders, newFunder()])
  const removeFunder = (i) => emit(funders.filter((_, idx) => idx !== i))

  const handleFunderChange = (index, patch) => {
    emit(funders.map((f, i) => i === index ? { ...f, ...patch } : f))
  }

  return (
    <div>
      <p className="step-title">Funding Information</p>
      <p className="step-description">
        Please provide information about the funding sources for this dataset.
        Search for existing funders and awards in the EBRAINS Knowledge Graph,
        or use the manual entry option if your funding is not listed.
      </p>

      <Form form={form} layout="vertical">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin tip="Loading funding data…" />
          </div>
        ) : (
          funders.map((field, index) => (
            <FunderRow
              key={field.id}
              field={field}
              index={index}
              fundingData={fundingData}
              funderList={funderList}
              onRemove={removeFunder}
              onChange={handleFunderChange}
            />
          ))
        )}

        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button
            type="dashed"
            onClick={addFunder}
            icon={<PlusOutlined />}
            style={{ width: '30%' }}
            disabled={loading}
          >
            Add funder
          </Button>
        </div>
      </Form>
    </div>
  )
}