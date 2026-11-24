// Links with a ticket, a dataset version, or both: what is loaded, and what the address bar keeps.
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/kg-prefill.e2e.cjs
const { chromium } = require('playwright')
const base = 'http://localhost:4173'
const A = '3e860b3e-967c-425d-aa68-120451c5fe4b', B = '86d0de75-8cbc-4f32-b212-aa2409471117'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })

const KG = { data: {
  datasetVersionId: A,
  dataset1: { dataTitle: 'KG title', briefSummary: 'KG summary', optionsData: [] },
  contribution: { authors: [{ id: 1, isCustom: true, firstName: 'Ann', lastName: 'Lee', orcid: '', email: '', affiliationIds: [], contributions: [], selectedAuthor: '' }] },
  experiments: { subjectschoice: 'Yes' },
  subjectMetadata: { subjects: [{ id: 1, subjectID: 'sub-1', states: [{ id: 11 }] }, { id: 2, subjectID: 'sub-2', states: [{ id: 21 }] }] },
}, summary: ['Title: KG title', 'Subjects: 2 (2 states)'], notes: ['3 tissue samples found in the collab space; they are not read back into the form'], counts: { subjects: 2 } }
const DRAFT = { datasetVersionId: A, dataset1: { dataTitle: 'Draft title', briefSummary: '', optionsData: [], dataStandart: [] }, subjectMetadata: { subjects: [{ id: 5, subjectID: 'sub-1', states: [{ id: 51, age: '3' }] }] }, experiments: { subjectschoice: 'Yes' } }

async function open(browser, url, { draft = false, ticketDataset = A, candidates = null, kg = KG } = {}) {
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })).newPage()
  const calls = []; const saves = []
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url()); calls.push(u.pathname)
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/auth/token') return route.fulfill({ status: 200, contentType: 'text/plain', body: JSON.stringify({ success: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' }, ticket: '4829200', datasetVersionUUID: A }) })
    if (u.pathname === '/api/zammad/zammadinfo') return route.fulfill(json({ submissionId: 7, datasetVersionId: ticketDataset, datasetCandidates: candidates || [{ id: ticketDataset, title: 'T' }] }))
    if (u.pathname === '/api/zammad/nettskjema') return route.fulfill(json({ ContactInfo: ['N', 'C', 'n@x.no'], CustodianInfo: ['Cu', 'St', 'c@x.no', '', 'Inst'], GroupLeader: ['G', ''], DataInfo: ['Nettskjema title', 'Nett summary', false, [], '', [], '', false, ''], Data2Info: ['', ''] }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json(draft ? { exists: true, mtime: Date.now(), library: true } : { exists: false, library: true }))
    if (u.pathname === '/api/drive/draft/load') return route.fulfill(json({ payload: DRAFT }))
    if (u.pathname === '/api/drive/draft/save') { saves.push(JSON.parse(route.request().postData() || '{}').datasetVersionId); return route.fulfill(json({ savedAt: new Date().toISOString() })) }
    if (u.pathname === '/api/drive/draft/figures/index') return route.fulfill(json({ index: null }))
    if (u.pathname === '/api/kgcollab/content') return kg ? route.fulfill(json(kg)) : route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'NO_READ_ACCESS', error: 'Your account is not allowed to read the collab space.' }) })
    if (u.pathname === '/api/kginfo/datatypes') return route.fulfill(json({ dataTypes: [] }))
    return route.fulfill(json({}))
  })
  await page.goto(base + url); await page.waitForTimeout(3000)
  const dl = async () => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: /Download draft/ }).evaluate((el) => el.click())]); return JSON.parse(require('fs').readFileSync(await d.path(), 'utf8')) }
  const chooser = page.locator('.ant-modal').filter({ hasText: 'Load existing information' })
  return { page, calls, saves, dl, chooser, search: () => new URL(page.url()).search }
}

;(async () => {
  const browser = await chromium.launch()

  // 1. ticket only: the old way. Nettskjema fills the form, no question is asked, the Knowledge Graph is offered by a button.
  let s = await open(browser, '/?TicketNumber=4829200', { draft: true })
  ok('1: no source question for a link with only a ticket', await s.chooser.count() === 0 || !(await s.chooser.isVisible()))
  ok('1: Nettskjema fills the form', (await s.dl()).dataset1.dataTitle === 'Nettskjema title')
  ok('1: the Knowledge Graph was not read by itself', !s.calls.includes('/api/kgcollab/content'))
  ok('1: the saved draft is still offered as before', await s.page.getByText('A draft is already saved in the Collab drive').count() === 1)
  ok('1: the address keeps the ticket only', s.search() === '?TicketNumber=4829200', s.search())
  await s.page.getByRole('button', { name: /Load from Knowledge Graph/ }).evaluate((el) => el.click()); await s.page.waitForTimeout(1500)
  ok('1: the button opens the source dialog with the Knowledge Graph content', await s.chooser.isVisible() && /Subjects: 2/.test(await s.chooser.innerText()))

  // 2. dataset version only: no ticket, no Nettskjema; the content of the Knowledge Graph is offered and loaded
  s = await open(browser, `/?DatasetVersionUUID=${A}`)
  ok('2: the source dialog opens by itself', await s.chooser.isVisible())
  ok('2: no ticket or Nettskjema call', !s.calls.includes('/api/zammad/zammadinfo') && !s.calls.includes('/api/zammad/nettskjema'))
  ok('2: the Knowledge Graph is preselected', await s.chooser.getByRole('radio', { name: /Knowledge Graph only/ }).isChecked())
  ok('2: what is not read back is told', /3 tissue samples/.test(await s.chooser.innerText()))
  await s.chooser.getByRole('button', { name: 'Load', exact: true }).evaluate((el) => el.click()); await s.page.waitForTimeout(1500)
  let d = await s.dl()
  ok('2: title and both subjects are in the form', d.dataset1.dataTitle === 'KG title' && d.subjectMetadata.subjects.length === 2 && d.datasetVersionId === A)
  ok('2: a draft in the Collab drive is suggested', await s.page.getByText('Keep what was loaded as a draft in the Collab drive?').count() === 1)
  await s.page.getByRole('button', { name: 'Save a draft now' }).evaluate((el) => el.click()); await s.page.waitForTimeout(1500)
  ok('2: the draft goes to the collab of this dataset version', s.saves.length > 0 && s.saves.every(x => x === A), JSON.stringify(s.saves))
  ok('2: the address keeps the dataset version', s.search() === `?DatasetVersionUUID=${A}`, s.search())

  // 3. both: Nettskjema, then the draft, then what is only in the Knowledge Graph
  s = await open(browser, `/?TicketNumber=4829200&DatasetVersionUUID=${A}`, { draft: true })
  ok('3: the source dialog opens by itself, after Nettskjema', await s.chooser.isVisible() && s.calls.includes('/api/zammad/nettskjema'))
  ok('3: draft + Knowledge Graph is preselected', await s.chooser.getByRole('radio', { name: /The draft, plus what is only in the Knowledge Graph/ }).isChecked())
  await s.chooser.getByRole('button', { name: 'Load', exact: true }).evaluate((el) => el.click()); await s.page.waitForTimeout(2000)
  d = await s.dl()
  ok('3: the draft wins where it has a value', d.dataset1.dataTitle === 'Draft title')
  ok('3: an empty field of the draft is filled from the Knowledge Graph', d.dataset1.briefSummary === 'KG summary')
  ok('3: subjects: the draft one is kept, the other is added', d.subjectMetadata.subjects.length === 2 && d.subjectMetadata.subjects.find(x => x.subjectID === 'sub-1').states[0].age === '3')
  ok('3: authors of the Knowledge Graph are added', (d.contribution?.authors || []).some(a => a.lastName === 'Lee'))
  ok('3: the address keeps both', s.search() === `?TicketNumber=4829200&DatasetVersionUUID=${A}`, s.search())

  // 3b. the draft only, as before (with the preview)
  s = await open(browser, `/?TicketNumber=4829200&DatasetVersionUUID=${A}`, { draft: true })
  await s.chooser.getByRole('radio', { name: /The draft of the Collab drive only/ }).evaluate((el) => el.click())
  await s.chooser.getByRole('button', { name: 'Load', exact: true }).evaluate((el) => el.click()); await s.page.waitForTimeout(1500)
  ok('3b: draft only opens the usual preview', await s.page.getByText('The following data was found in the file').count() === 1)

  // 4. a dataset version that the ticket does not cover: the ticket's dataset is used and the person is told
  s = await open(browser, `/?TicketNumber=4829200&DatasetVersionUUID=${B}`, { ticketDataset: A })
  ok('4: warning that the dataset is not part of the ticket', await s.page.getByText('The dataset version in the link is not part of your ticket').count() === 1)
  ok('4: the ticket dataset is used', (await s.dl()).datasetVersionId === A)

  // 5. no access to the Knowledge Graph content: said plainly, the rest still works
  s = await open(browser, `/?DatasetVersionUUID=${A}`, { kg: null })
  ok('5: the error is shown in the dialog', /not allowed to read the collab space/.test(await s.chooser.innerText()))
  ok('5: nothing to load is said, and Load is disabled', await s.chooser.getByRole('button', { name: 'Load', exact: true }).isDisabled())

  // 6. after the login redirect the ticket and the dataset version are back in the address
  s = await open(browser, '/?code=abc&state=xyz&iss=x&session_state=y')
  ok('6: ticket and dataset version are put back after the login redirect', s.search() === `?TicketNumber=4829200&DatasetVersionUUID=${A}`, s.search())

  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
