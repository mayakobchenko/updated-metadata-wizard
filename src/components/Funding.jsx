import { Form, Input, Button, Select, Checkbox, Spin, Tag } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'

const { Option } = Select

// ── helpers ───────────────────────────────────────────────────────────────────

const newFunder = () => ({
  id:            Date.now() + Math.random(),
  mode:          'kg',        // 'kg' | 'custom'
  // KG-selected fields
  selectedFundingId: '',      // uuid of the Funding instance
  selectedFunderId:  '',      // @id of the Organisation/funder
  awardTitle:        '',
  awardNumber:       '',
  // custom fields (when mode === 'custom')
  funderName: '',
  grantId:    '',
})

// extract unique funders from the flat Funding.json list
// returns [{ id, name }]
const buildFunderList = (fundingData, orgData) => {
  const seen = new Set()
  const list = []
  for (const f of fundingData) {
    const funderId = f.funder?.['@id'] || ''
    if (!funderId || seen.has(funderId)) continue
    seen.add(funderId)
    // try to resolve the org name from the Organisation list
    const org  = orgData.find(o => o.uuid === funderId || o.identifier === funderId)
    const name = org?.fullName || org?.name || funderId
    list.push({ id: funderId, name })
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

// ── FunderRow ─────────────────────────────────────────────────────────────────

function FunderRow({ field, index, fundingData, funderList, orgData, onRemove, onChange }) {
  const [isCustom, setIsCustom]           = useState(field.mode === 'custom')
  const [selectedFunder, setSelectedFunder] = useState(field.selectedFunderId || '')
  const [awardsForFunder, setAwardsForFunder] = useState([])
  const [selectedFunding, setSelectedFunding] = useState(field.selectedFundingId || '')
  const [funderSearch, setFunderSearch]   = useState('')
  const [awardSearch, setAwardSearch]     = useState('')

  // when a funder is chosen, compute the matching award list
  useEffect(() => {
    if (!selectedFunder) { setAwardsForFunder([]); return }
    const awards = fundingData.filter(f => f.funder?.['@id'] === selectedFunder)
    setAwardsForFunder(awards)
  }, [selectedFunder, fundingData])

  // if the parent data changes externally (e.g. JSON import), re-sync
  useEffect(() => {
    setIsCustom(field.mode === 'custom')
    setSelectedFunder(field.selectedFunderId || '')
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
      awardTitle:        '',
      awardNumber:       '',
      funderName:        '',
      grantId:           '',
    })
  }

  const handleFunderSelect = (funderId) => {
    setSelectedFunder(funderId)
    setSelectedFunding('')
    onChange(index, {
      selectedFunderId:  funderId,
      selectedFundingId: '',
      awardTitle:        '',
      awardNumber:       '',
    })
  }

  const handleAwardSelect = (fundingUuid) => {
    setSelectedFunding(fundingUuid)
    const award = fundingData.find(f => f.uuid === fundingUuid)
    if (award) {
      onChange(index, {
        selectedFundingId: fundingUuid,
        awardTitle:        award.awardTitle  || '',
        awardNumber:       award.awardNumber || '',
        selectedFunderId:  selectedFunder,
      })
    }
  }

  // filtered lists for search
  const filteredFunders = funderList.filter(f =>
    f.name.toLowerCase().includes(funderSearch.toLowerCase())
  )
  const filteredAwards = awardsForFunder.filter(a =>
    (a.awardTitle  || '').toLowerCase().includes(awardSearch.toLowerCase()) ||
    (a.awardNumber || '').toLowerCase().includes(awardSearch.toLowerCase())
  )

  const labelStyle = { fontSize: 12, color: '#555', marginBottom: 2 }

  return (
    <div style={{
      border: '1px solid #d9d9d9', borderRadius: 8,
      padding: '16px 20px', marginBottom: 16, background: '#fafafa'
    }}>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Funder {index + 1}</span>
        <Button type="text" danger onClick={() => onRemove(index)} size="small">Remove</Button>
      </div>

      {/* custom toggle */}
      <Form.Item style={{ marginBottom: 14 }}>
        <Checkbox checked={isCustom} onChange={handleModeToggle}>
          Funding not found in EBRAINS KG — enter manually
        </Checkbox>
      </Form.Item>

      {/* ── KG mode ── */}
      {!isCustom && (
        <>
          {/* step 1: funder */}
          <Form.Item
            label={<span style={labelStyle}>Step 1 — Search for funder organisation</span>}
            style={{ marginBottom: 12 }}
          >
            <Select
              showSearch
              allowClear
              value={selectedFunder || undefined}
              placeholder="Type to search funder…"
              filterOption={false}
              onSearch={setFunderSearch}
              onChange={handleFunderSelect}
              onClear={() => { setSelectedFunder(''); setSelectedFunding(''); setAwardsForFunder([]) }}
              style={{ width: '100%' }}
              notFoundContent={
                funderSearch
                  ? <span style={{ color: '#888', fontSize: 12 }}>No matching funder — try the manual entry checkbox above</span>
                  : <span style={{ color: '#888', fontSize: 12 }}>Start typing to search</span>
              }
            >
              {filteredFunders.map(f => (
                <Option key={f.id} value={f.id}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* step 2: award — only shown after funder selected */}
          {selectedFunder && (
            <Form.Item
              label={<span style={labelStyle}>Step 2 — Select award / grant</span>}
              style={{ marginBottom: 12 }}
            >
              {awardsForFunder.length === 0 ? (
                <div style={{ color: '#888', fontSize: 12, padding: '4px 0' }}>
                  No awards found for this funder in the KG.
                  <br />
                  Please use the manual entry checkbox above to enter the grant details.
                </div>
              ) : (
                <Select
                  showSearch
                  allowClear
                  value={selectedFunding || undefined}
                  placeholder="Type award title or number…"
                  filterOption={false}
                  onSearch={setAwardSearch}
                  onChange={handleAwardSelect}
                  onClear={() => {
                    setSelectedFunding('')
                    onChange(index, { selectedFundingId: '', awardTitle: '', awardNumber: '' })
                  }}
                  style={{ width: '100%' }}
                >
                  {filteredAwards.map(a => (
                    <Option key={a.uuid} value={a.uuid}>
                      <span style={{ fontWeight: 500 }}>{a.awardTitle || '(no title)'}</span>
                      {a.awardNumber && (
                        <Tag style={{ marginLeft: 8, fontSize: 11 }} color="blue">
                          {a.awardNumber}
                        </Tag>
                      )}
                    </Option>
                  ))}
                </Select>
              )}
            </Form.Item>
          )}

          {/* preview of selected award */}
          {selectedFunding && field.awardTitle && (
            <div style={{
              background: '#e6f4ff', border: '1px solid #91caff',
              borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#1677ff'
            }}>
              <strong>Selected:</strong> {field.awardTitle}
              {field.awardNumber && <span style={{ marginLeft: 8, color: '#555' }}>#{field.awardNumber}</span>}
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
              value={field.funderName}
              onChange={(e) => onChange(index, { funderName: e.target.value })}
              placeholder="e.g. European Research Council"
            />
          </Form.Item>

          <Form.Item
            label="Award title"
            style={{ marginBottom: 12 }}
          >
            <Input
              value={field.awardTitle}
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
              value={field.grantId || field.awardNumber}
              onChange={(e) => onChange(index, { grantId: e.target.value, awardNumber: e.target.value })}
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

  const [funders, setFunders]         = useState(data.funding?.funders || [])
  const [fundingData, setFundingData] = useState([])   // raw Funding.json entries
  const [orgData, setOrgData]         = useState([])   // Organisation.json for name lookup
  const [funderList, setFunderList]   = useState([])   // deduplicated funder list
  const [loading, setLoading]         = useState(true)

  // ── load KG data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [fundingRes, orgRes] = await Promise.all([
          fetch('api/kginfo/funding'),        // returns { funding: [...] }
          fetch('api/kginfo/organisations'),  // returns { organisations: [...] }
        ])

        const fundingJson = fundingRes.ok ? await fundingRes.json() : { funding: [] }
        const orgJson     = orgRes.ok     ? await orgRes.json()     : { organisations: [] }

        const rawFunding = fundingJson.funding      || []
        const rawOrgs    = orgJson.organisations    || orgJson.organization || []

        setFundingData(rawFunding)
        setOrgData(rawOrgs)
        setFunderList(buildFunderList(rawFunding, rawOrgs))
      } catch (e) {
        console.error('Error loading funding data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // sync with parent data (e.g. JSON import)
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
    const updated = funders.map((f, i) => i === index ? { ...f, ...patch } : f)
    emit(updated)
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
            <Spin tip="Loading funding data from KG…" />
          </div>
        ) : (
          funders.map((field, index) => (
            <FunderRow
              key={field.id}
              field={field}
              index={index}
              fundingData={fundingData}
              funderList={funderList}
              orgData={orgData}
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