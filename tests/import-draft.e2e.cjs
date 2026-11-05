// Loading a saved draft again: which dataset version is used, and what happens to the file structure.
// Mocked server. Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/import-draft.e2e.cjs
const { chromium } = require('playwright')
const fs = require('fs'); const os = require('os'); const path = require('path')
const base = 'http://localhost:4173'
const TICKET_ID = '724d4af0-fe28-4032-8837-120b0d64a81c'
const V1 = '11111111-1111-4111-8111-111111111111'
const V2 = '22222222-2222-4222-8222-222222222222'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })

const draftFile = (name, o) => { const p = path.join(os.tmpdir(), name); fs.writeFileSync(p, JSON.stringify(o)); return p }
const baseDraft = (id, source) => ({
  datasetVersionId: id,
  dataset1: { dataTitle: 'T', briefSummary: 'S', optionsData: [], dataStandart: [] },
  dataDescriptor: { dataRecordsTree: '/old-tree [old]', autoTree: '/old-tree [old]', dataRecordsSourceId: source, dataRecordsFormats: [], bucketExts: [] },
})

async function scenario(browser, { ticket, draft }) {
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })).newPage()
  const bucketCalls = []
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/zammad/zammadinfo') return route.fulfill(json({ submissionId: 1, datasetVersionId: TICKET_ID }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/kginfo/datatypes') return route.fulfill(json({ dataTypes: [] }))
    if (u.pathname === '/api/bucket/structure') {
      bucketCalls.push(JSON.parse(route.request().postData() || '{}').datasetVersionId)
      return route.fulfill(json({ text: '/new-tree\n', tree: '/new-tree [new]', formats: [], totals: { files: 1, size: '1 KB' }, summarySentence: '', checks: [] }))
    }
    return route.fulfill(json({}))
  })
  await page.goto(base + (ticket ? '/?TicketNumber=4826029' : '/')); await page.waitForTimeout(2500)
  await page.locator('input[type=file]').first().setInputFiles(draft); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Apply to form/ }).evaluate((el) => el.click()); await page.waitForTimeout(1200)
  await page.locator('.ant-steps-item').nth(5).click({ force: true }); await page.waitForTimeout(2500)
  const dl = async () => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: /Download draft/ }).evaluate((el) => el.click())]); return JSON.parse(fs.readFileSync(await d.path(), 'utf8')) }
  return { page, bucketCalls, dl }
}

;(async () => {
  const browser = await chromium.launch()

  // A: no ticket, the draft names another dataset version than the one its file structure came from
  let s = await scenario(browser, { ticket: false, draft: draftFile('a.json', baseDraft(V2, V1)) })
  let d = await s.dl()
  ok('A: the bucket of the draft\'s dataset version is read', s.bucketCalls.includes(V2) && !s.bucketCalls.includes(V1), JSON.stringify(s.bucketCalls))
  ok('A: the file structure is refreshed from that bucket', (await s.page.locator('#dataDescriptor_dataRecordsTree').inputValue()).includes('/new-tree'))
  ok('A: dataRecordsSourceId equals datasetVersionId in the saved draft', d.dataDescriptor.dataRecordsSourceId === d.datasetVersionId && d.datasetVersionId === V2, `${d.dataDescriptor.dataRecordsSourceId} / ${d.datasetVersionId}`)

  // B: no ticket, the ID in the file is not valid (one character missing)
  s = await scenario(browser, { ticket: false, draft: draftFile('b.json', baseDraft('2222222-2222-4222-8222-222222222222', '2222222-2222-4222-8222-222222222222')) })
  ok('B: invalid ID is explained, bucket not asked', await s.page.getByText('The file structure cannot be read from the bucket').count() === 1 && s.bucketCalls.length === 0)
  ok('B: the file structure text from the draft is kept', (await s.page.locator('#dataDescriptor_dataRecordsTree').inputValue()).includes('/old-tree'))

  // C: with a ticket, a draft of another dataset does not move the form to that dataset
  s = await scenario(browser, { ticket: true, draft: draftFile('c.json', baseDraft(V2, V2)) })
  d = await s.dl()
  ok('C: the ticket\'s dataset version is kept', d.datasetVersionId === TICKET_ID, d.datasetVersionId)
  ok('C: the bucket of the ticket is read, the file structure refreshed', s.bucketCalls.includes(TICKET_ID) && !s.bucketCalls.includes(V2) && (await s.page.locator('#dataDescriptor_dataRecordsTree').inputValue()).includes('/new-tree'), JSON.stringify(s.bucketCalls))
  ok('C: dataRecordsSourceId equals datasetVersionId', d.dataDescriptor.dataRecordsSourceId === TICKET_ID, d.dataDescriptor.dataRecordsSourceId)

  // D: with a ticket, a draft without any ID keeps the ticket's ID
  const noId = baseDraft(undefined, TICKET_ID); delete noId.datasetVersionId
  s = await scenario(browser, { ticket: true, draft: draftFile('d.json', noId) })
  d = await s.dl()
  ok('D: a draft without an ID keeps the ticket\'s ID', d.datasetVersionId === TICKET_ID, String(d.datasetVersionId))

  // E: same dataset, the researcher had edited the file structure and the bucket has changed since: he is asked
  const ed = baseDraft(TICKET_ID, TICKET_ID); ed.dataDescriptor.dataRecordsTree = '/my-edited-tree [mine]'
  s = await scenario(browser, { ticket: true, draft: draftFile('e.json', ed) })
  ok('E: an edited file structure is not overwritten silently; a question is asked', await s.page.getByText('The files in your bucket have changed').count() === 1 && (await s.page.locator('#dataDescriptor_dataRecordsTree').inputValue()).includes('/my-edited-tree'))
  await s.page.getByRole('button', { name: /Keep my text/ }).evaluate((el) => el.click()); await s.page.waitForTimeout(500)
  ok('E: "Keep my text" keeps it', (await s.page.locator('#dataDescriptor_dataRecordsTree').inputValue()).includes('/my-edited-tree'))

  // F: same dataset, structure never edited: it simply follows the bucket
  s = await scenario(browser, { ticket: true, draft: draftFile('f.json', baseDraft(TICKET_ID, TICKET_ID)) })
  ok('F: an untouched file structure follows the bucket', (await s.page.locator('#dataDescriptor_dataRecordsTree').inputValue()).includes('/new-tree'))

  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
