import { useEffect, useMemo, useState } from 'react'
import { Select, Input, Checkbox, Typography } from 'antd'

const { Text } = Typography

// The organisations of the EBRAINS Knowledge Graph (common space), loaded once for the whole page.
let cache = null, pending = null
function loadOrganisations() {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = fetch('api/kginfo/organisations')
      .then(r => (r.ok ? r.json() : { organisations: [] }))
      .then(j => (cache = j.organisations || []))
      .catch(() => (cache = []))
      .finally(() => { pending = null })
  }
  return pending
}
export function useOrganisations() {
  const [orgs, setOrgs] = useState(cache || [])
  const [loaded, setLoaded] = useState(!!cache)
  useEffect(() => {
    let alive = true
    if (!cache) loadOrganisations().then(list => { if (alive) { setOrgs(list); setLoaded(true) } })
    return () => { alive = false }
  }, [])
  return { orgs, loaded }
}

export const orgLabel = (o) => (o.shortName && o.shortName.toLowerCase() !== o.fullName.toLowerCase() ? `${o.fullName} (${o.shortName})` : o.fullName)

// A name is taken from the list (value = the full name, as text) or typed by hand when the organisation is not in
// the list. The form keeps only the text: the same text selects the same organisation again, also in older drafts.
// For an organisation from the list its homepage and identifier are shown below (read only).
export default function OrganizationSelect({ value, onChange, placeholder = 'Search the list of organisations', style, disabled, id }) {
  const { orgs, loaded } = useOrganisations()
  const byName = useMemo(() => new Map(orgs.map(o => [o.fullName.toLowerCase(), o])), [orgs])
  const text = (value || '').trim()
  const matched = text ? byName.get(text.toLowerCase()) : undefined
  const [typed, setTyped] = useState(null)                 // null: decided by the value; true: type by hand
  // a name that is not in the list (an older draft, an organisation typed earlier) stays as text
  useEffect(() => { if (typed === null && loaded && text && !matched) setTyped(true) }, [typed, loaded, text, matched])
  const byHand = typed === true

  const options = useMemo(() => orgs.map(o => ({ value: o.fullName, label: orgLabel(o), search: `${o.fullName} ${o.shortName || ''}`.toLowerCase() })), [orgs])

  return (
    <div style={style} id={id}>
      {byHand ? (
        <Input value={value || ''} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} placeholder="Name of the organisation" />
      ) : (
        <Select
          showSearch allowClear style={{ width: '100%' }} disabled={disabled}
          loading={!loaded} placeholder={placeholder}
          value={matched ? matched.fullName : undefined}
          options={options}
          filterOption={(input, option) => (option?.search || '').includes(input.trim().toLowerCase())}
          notFoundContent={<Text type="secondary">Not found. Tick “not in the list” below to type the name.</Text>}
          onChange={(v) => onChange?.(v || '')}
        />
      )}
      <Checkbox style={{ marginTop: 4, fontSize: 12 }} checked={byHand} disabled={disabled}
        onChange={(e) => { setTyped(e.target.checked); if (!e.target.checked && !matched) onChange?.('') }}>
        This organisation is not in the list
      </Checkbox>
      {!byHand && matched && (matched.homepage || matched.identifier) && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
          {matched.homepage && <span>Homepage: <a href={matched.homepage} target="_blank" rel="noopener noreferrer">{matched.homepage}</a></span>}
          {matched.homepage && matched.identifier && <span> · </span>}
          {matched.identifier && <span>Identifier: <a href={matched.identifier} target="_blank" rel="noopener noreferrer">{matched.identifier}</a></span>}
        </div>
      )}
    </div>
  )
}
