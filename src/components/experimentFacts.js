// Turns the Experiments and Subjects steps (KG identifiers) into readable facts, so the Data
// Descriptor can pre-fill from them and the AI prompts can use them.
import { resolve } from './metadataLookups'

const uniq = (a) => [...new Set(a.filter(Boolean))]
const list = (a) => a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : (a[0] || '')

export function describeExperiment(data = {}, lk) {
  if (!lk) return null
  const exp = data.experiments || {}
  const names = (ids, map) => uniq((ids || []).map(id => resolve(id, map)))
  const approach   = names(exp.experimentalApproach, lk.approachMap)
  const techniques = names(exp.techniques, lk.techniqueMap)
  const prep       = names(exp.preparationTypes, lk.prepTypeMap)
  const targets    = names(exp.studyTargets, lk.studyTargetMap)

  const subj = data.subjectMetadata || {}
  const groups = (subj.subjectGroups || []).map(g => ({
    name: g.name || '',
    n: (g.subjects || []).length,
    age: names(g.groupState?.ageCategory, lk.ageCatMap),
    attributes: names(g.groupState?.attribute, lk.subjectAttrMap),
  }))
  const all = [...(subj.subjects || []), ...(subj.subjectGroups || []).flatMap(g => g.subjects || [])]
  const species = uniq(all.map(s => resolve(s.species, lk.speciesMap)))
  const strains = uniq(all.map(s => resolve(s.strain, lk.strainMap)))
  const sexes   = uniq(all.map(s => resolve(s.bioSex, lk.bioSexMap)))
  return { approach, techniques, prep, targets, groups, species, strains, sexes, keywords: (exp.keywords || '').toString().trim() }
}

// Plain-text block for the AI prompts
export function factsText(f) {
  if (!f) return ''
  const L = []
  if (f.approach.length)   L.push(`Experimental approach: ${f.approach.join(', ')}`)
  if (f.prep.length)       L.push(`Preparation type: ${f.prep.join(', ')}`)
  if (f.techniques.length) L.push(`Techniques: ${f.techniques.join(', ')}`)
  if (f.targets.length)    L.push(`Study targets: ${f.targets.join(', ')}`)
  if (f.species.length)    L.push(`Species: ${f.species.join(', ')}`)
  if (f.strains.length)    L.push(`Strain: ${f.strains.join(', ')}`)
  if (f.sexes.length)      L.push(`Biological sex: ${f.sexes.join(', ')}`)
  f.groups.forEach(g => L.push(`Subject group "${g.name}"${g.n ? ` (${g.n} subjects)` : ''}${g.age.length ? `, age category: ${g.age.join(', ')}` : ''}${g.attributes.length ? `, attributes: ${g.attributes.join(', ')}` : ''}`))
  if (f.keywords) L.push(`Keywords: ${f.keywords}`)
  return L.join('\n')
}

// Starting point for MATERIALS AND METHODS. Bracketed parts are prompts for the researcher;
// the completeness checklist reminds them to replace them.
export function methodsStarter(f) {
  if (!f) return ''
  const hasAny = f.techniques.length || f.prep.length || f.approach.length || f.groups.length
  if (!hasAny) return ''
  const subj = []
  if (f.groups.length) {
    subj.push(`${f.groups.length} subject group${f.groups.length > 1 ? 's' : ''} (${f.groups.map(g => g.name).filter(Boolean).join(', ')})`)
  }
  const ageAll = uniq(f.groups.flatMap(g => g.age))
  const who = [ageAll.join(', '), f.species.join(', '), f.strains.join(', ')].filter(Boolean).join(' ')
  const parts = []
  parts.push(`Subjects and preparation: ${[who, subj.join('; ')].filter(Boolean).join(', ') || '[species, number, age, sex]'}.${f.prep.length ? ` Preparation: ${list(f.prep)}.` : ''}${f.approach.filter(x => !f.prep.includes(x)).length ? ` Experimental approach: ${list(f.approach.filter(x => !f.prep.includes(x)))}.` : ''} [Ethics approval and animal housing, if applicable.]`)
  parts.push(`Data acquisition: ${f.techniques.length ? `The data were acquired using ${list(f.techniques)}.` : ''}${f.targets.length ? ` Study targets: ${list(f.targets)}.` : ''} [Equipment, acquisition parameters and protocol.]`)
  parts.push('Data processing: [Preprocessing and analysis steps, with the software and versions used.]')
  return parts.join('\n\n')
}
