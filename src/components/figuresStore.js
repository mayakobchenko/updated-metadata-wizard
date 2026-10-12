// Figures and tables the researcher attaches to the Data Descriptor. They live only in memory
// of this browser tab (they are embedded in the downloaded Word file) and are deliberately NOT
// part of the wizard JSON, so images never bloat the JSON that goes to the KG upload / ticket.
import { useSyncExternalStore } from 'react'

let items = []
const listeners = new Set()
const emit = () => listeners.forEach(l => l())

export const PLACEMENTS = [
  { value: 'summary',  label: 'After SUMMARY' },
  { value: 'methods',  label: 'After MATERIALS AND METHODS' },
  { value: 'usage',    label: 'After USAGE NOTES' },
  { value: 'records',  label: 'After DATA RECORDS' },
]

export const MAX_ITEMS = 20
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024
export const MAX_TABLE_ROWS = 200
export const MAX_TABLE_COLS = 15

export const getFigures = () => items
export function addFigure(item) { items = [...items, item]; emit() }
export function updateFigure(id, patch) { items = items.map(i => i.id === id ? { ...i, ...patch } : i); emit() }
export function removeFigure(id) { items = items.filter(i => i.id !== id); emit() }
export function clearFigures() { items = []; emit() }
export function useFigures() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, getFigures)
}

// "Figure 1", "Table 2": numbered separately per kind, in list order
export function labelFor(list, item) {
  const same = list.filter(i => i.kind === item.kind)
  return `${item.kind === 'table' ? 'Table' : 'Figure'} ${same.indexOf(item) + 1}`
}

// Minimal CSV/TSV parser (quoted fields, escaped quotes, newlines inside quotes).
export function parseDelimited(text) {
  const clean = String(text).replace(/^﻿/, '')
  const first = clean.split(/\r?\n/, 1)[0] || ''
  const delim = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',')
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(v => v !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some(v => v !== '')) rows.push(row)
  return rows
}
