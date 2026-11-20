// Pure helpers for the Organization list (kept apart so they can be tested without the KG connection).

// A KG link is {"@id": ...} or a list of them; the identifier instance (ROR) holds the text.
export const firstString = (v) => {
  const x = Array.isArray(v) ? v[0] : v
  return typeof x === 'string' ? x : (x && typeof x === 'object' ? (x['@id'] || '') : '')
}
export function resolveOrganizationIdentifier(digitalIdentifier, rorList = []) {
  const links = (Array.isArray(digitalIdentifier) ? digitalIdentifier : [digitalIdentifier]).map(firstString).filter(Boolean)
  for (const id of links) {
    const hit = rorList.find(r => r.uuid === id)
    if (hit?.identifier) return Array.isArray(hit.identifier) ? hit.identifier[0] : hit.identifier
  }
  return ''
}
