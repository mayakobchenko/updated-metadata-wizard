// Authors and their institutions.
// The authors are entered in the Contributors step; the data custodian and the contact person come from the first page.
//   data.custodian                       name, email, ORCID and affiliation ("institution") of the data custodian
//   data.contribution.affiliations       [{ id, text }]  institutions typed in the Contributors step
//   data.contribution.custodianAuthor    { contributions, corresponding, equal, affiliationIds }  author details of the custodian
//   data.contribution.authors[]          { id, isCustom, selectedAuthor | firstName/lastName/orcid,
//                                          email, affiliationIds, contributions, corresponding, equal }
// The data descriptor (Word file, Markdown, prompts) gets a derived table: authors with numbered affiliations,
// numbered in the order of first appearance, the custodian first.

export const CUSTODIAN_AFF = 'custodian-aff'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isEmail = (s) => EMAIL_RE.test(String(s || '').trim())

const clean = (s) => String(s || '').trim()
const sameName = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

export const custodianName = (data) => `${clean(data?.custodian?.firstName)} ${clean(data?.custodian?.familyName)}`.trim()
export const contactName = (data) => `${clean(data?.contactperson?.firstName)} ${clean(data?.contactperson?.familyName)}`.trim()

// every institution an author can choose from: the custodian's affiliation first, then the ones typed in Contributors
export function institutionList(data) {
  const out = []
  const cust = clean(data?.custodian?.institution)
  if (cust) out.push({ id: CUSTODIAN_AFF, text: cust, fixed: true })
  for (const a of data?.contribution?.affiliations || []) {
    if (a && a.id !== undefined && clean(a.text)) out.push({ id: a.id, text: clean(a.text), fixed: false })
  }
  return out
}

const customName = (a) => `${clean(a.firstName)} ${clean(a.lastName)}`.trim()

// resolveName(author entry) -> display name; the default only knows people who were typed in by hand
export function buildAuthorTable(data, resolveName = (a) => (a.isCustom ? customName(a) : '')) {
  const insts = new Map(institutionList(data).map(i => [i.id, i]))
  const numberOf = new Map()
  const affiliations = []
  const numbersFor = (ids) => [...new Set((ids || []).filter(id => insts.has(id)))]
    .map(id => {
      if (!numberOf.has(id)) {
        const n = numberOf.size + 1
        numberOf.set(id, n)
        affiliations.push({ id, number: String(n), text: insts.get(id).text })
      }
      return numberOf.get(id)
    }).sort((x, y) => x - y).join(',')

  const authors = []
  const cust = data?.custodian || {}
  const custName = custodianName(data)
  const ca = data?.contribution?.custodianAuthor || {}
  if (custName) {
    authors.push({
      id: 'cust-0', name: custName, email: clean(cust.email),
      affiliationNumbers: numbersFor([CUSTODIAN_AFF, ...(ca.affiliationIds || [])]),
      contributions: ca.contributions || [],
      corresponding: ca.corresponding ?? true,   // the data custodian is the corresponding author by default
      equal: !!ca.equal,
    })
  }
  ;(data?.contribution?.authors || []).forEach((a, i) => {
    const name = resolveName(a)
    if (!name || sameName(name, custName)) return
    authors.push({
      id: a.id || `contrib-${i}`, name, email: clean(a.email),
      affiliationNumbers: numbersFor(a.affiliationIds),
      contributions: a.contributions || [],
      corresponding: !!a.corresponding, equal: !!a.equal,
    })
  })
  return { authors, affiliations }
}

// What is missing before the authors can be accepted (Next in the Contributors step). One line per author.
export function authorProblems(data, resolveName = (a) => (a.isCustom ? customName(a) : '')) {
  const insts = new Set(institutionList(data).map(i => i.id))
  const custName = custodianName(data)
  const out = []
  ;(data?.contribution?.authors || []).forEach((a, i) => {
    const name = resolveName(a)
    if (name && sameName(name, custName)) return          // the custodian is author 1 already
    const label = name || `Author ${i + 2}`
    const p = []
    if (a.isCustom ? !(clean(a.firstName) && clean(a.lastName)) : !clean(a.selectedAuthor)) p.push(a.isCustom ? 'first and last name' : 'the person')
    if (!isEmail(a.email)) p.push(clean(a.email) ? 'a valid email address' : 'an email address')
    if (!(a.affiliationIds || []).some(id => insts.has(id))) p.push('an affiliation')
    if (p.length) out.push(`${label}: please give ${p.join(', ')}.`)
  })
  return out
}
