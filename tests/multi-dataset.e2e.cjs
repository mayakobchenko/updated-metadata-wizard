// A ticket that covers several datasets (one Collab each): choosing the dataset, importing drafts of the datasets.
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/multi-dataset.e2e.cjs
const { chromium } = require('playwright')
const fs = require('fs'); const os = require('os'); const path = require('path')
const base = 'http://localhost:4173'
const A = '3e449b04-cb98-4da1-9459-097e1d4292db', B = '1d3b3d4a-6249-42d9-bf99-927470d13774', C = '86d0de75-8cbc-4f32-b212-aa2409471117'
const OTHER = '99999999-9999-4999-8999-999999999999'
const TITLES = { [A]: 'Tyrosine hydroxylase', [B]: 'Choline acetyltransferase', [C]: 'Viral tract tracing' }
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })
const draftFile = (name, id) => { const p = path.join(os.tmpdir(), name); fs.writeFileSync(p, JSON.stringify({ datasetVersionId: id, dataset1: { dataTitle: 'T', briefSummary: 'S', optionsData: [], dataStandart: [] }, dataDescriptor: { dataRecordsSourceId: id } })); return p }

async function open(browser, candidates) {
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })).newPage()
  const bucketCalls = []; const saves = []
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/zammad/zammadinfo') return route.fulfill(json({ submissionId: 1, datasetVersionId: candidates[0].id, datasetCandidates: candidates }))
    if (u.pathname === '/api/drive/draft/save') { saves.push(JSON.parse(route.request().postData() || '{}').datasetVersionId); return route.fulfill(json({ savedAt: new Date().toISOString() })) }
    if (u.pathname === '/api/drive/draft/figures/index') return route.fulfill(json({ index: null }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/kginfo/datatypes') return route.fulfill(json({ dataTypes: [] }))
    if (u.pathname === '/api/bucket/structure') {
      bucketCalls.push(JSON.parse(route.request().postData() || '{}').datasetVersionId)
      return route.fulfill(json({ text: '/t\n', tree: '/t [x]', formats: [], totals: { files: 1, size: '1 KB' }, summarySentence: '', checks: [] }))
    }
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4829121'); await page.waitForTimeout(2500)
  const dl = async () => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: /Download draft/ }).evaluate((el) => el.click())]); return JSON.parse(fs.readFileSync(await d.path(), 'utf8')) }
  const importDraft = async (file) => { await page.locator('input[type=file]').first().setInputFiles(file); await page.waitForTimeout(800); await page.getByRole('button', { name: /Apply to form/ }).evaluate((el) => el.click()); await page.waitForTimeout(1200) }
  return { page, bucketCalls, saves, dl, importDraft }
}

;(async () => {
  const browser = await chromium.launch()
  const three = [A, B, C].map(id => ({ id, title: TITLES[id] }))

  let s = await open(browser, three)
  ok('selector is shown for a ticket with three datasets', await s.page.getByText('This ticket covers 3 datasets').count() === 1)
  ok('the first dataset is selected at the start', (await s.dl()).datasetVersionId === A)

  await s.importDraft(draftFile('b.json', B))
  ok('a draft of the second dataset is accepted (its ID is one of the ticket)', (await s.dl()).datasetVersionId === B)

  await s.importDraft(draftFile('o.json', OTHER))
  ok('a draft of a dataset that is not in the ticket does not change the dataset', (await s.dl()).datasetVersionId === B)

  await s.page.locator('.ant-select').filter({ hasText: /Choline|Tyrosine|Viral/ }).first().click()
  await s.page.locator('.ant-select-item-option').filter({ hasText: 'Viral tract tracing' }).click(); await s.page.waitForTimeout(500)
  ok('choosing a dataset in the selector sets the dataset of the form', (await s.dl()).datasetVersionId === C)
  await s.page.locator('.ant-steps-item').nth(5).click({ force: true }); await s.page.waitForTimeout(2500)
  ok('the file structure is read from the chosen dataset', s.bucketCalls.includes(C), JSON.stringify(s.bucketCalls))

  // submit is blocked until a dataset is chosen
  s = await open(browser, three)
  await s.page.locator('.ant-steps-item').nth(5).click({ force: true }).catch(() => {})
  await s.page.getByRole('button', { name: /Submit metadata/ }).first().evaluate((el) => el.click()); await s.page.waitForTimeout(700)
  ok('submit is blocked until a dataset is chosen', /Choose the dataset you are describing/.test(await s.page.locator('.ant-modal').innerText()))

  // autosave: nothing before a dataset is chosen; after choosing, only the chosen dataset receives a copy
  s = await open(browser, three)
  await s.page.locator('input').first().fill('x').catch(() => {})
  await s.page.getByLabel(/Dataset title|title/i).first().fill('My title').catch(() => {})
  await s.page.waitForTimeout(34000)
  ok('no Collab copy is written before a dataset is chosen', s.saves.length === 0, JSON.stringify(s.saves))
  await s.page.locator('.ant-select').first().click()
  await s.page.locator('.ant-select-item-option').filter({ hasText: 'Choline' }).click()
  await s.page.waitForTimeout(36000)
  ok('after choosing, the copy goes to the chosen dataset only', s.saves.length > 0 && s.saves.every(x => x === B), JSON.stringify(s.saves))
  ok('the dropdown is wide enough for the full title', (await s.page.locator('.ant-select').first().boundingBox()).width > 500)

  s = await open(browser, [{ id: A, title: 'Only one' }])
  ok('no selector for a ticket with one dataset', await s.page.getByText(/This ticket covers/).count() === 0)

  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
