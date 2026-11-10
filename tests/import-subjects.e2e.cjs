// A draft with subjects (flat) and an empty "subjectGroups": [] must show the subjects after import.
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/import-subjects.e2e.cjs <draft.json>
const { chromium } = require('playwright')
const fs = require('fs'); const os = require('os'); const path = require('path')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })
const N = (names) => names.map((n, i) => ({ id: `https://kg.ebrains.eu/api/instances/${n}`, name: n }))
;(async () => {
  const draft = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : {
    datasetVersionId: '1bd8c07c-18dc-46c2-a501-2dc1aef72205',
    experiments: { subjectschoice: 'Yes' },
    subjectMetadata: { subjects: ['Blossom', 'Bubbles'].map((s, i) => ({ id: 1000 + i, subjectID: s, bioSex: '', species: '', states: [{ id: 1, ageCategory: '', subjectAttribute: [], disease: [], diseaseModel: [] }] })), subjectGroups: [], tissueSamples: [], tissueCollections: [] } }
  const file = path.join(os.tmpdir(), 'draft-subj.json'); fs.writeFileSync(file, JSON.stringify(draft))
  const want = (draft.subjectMetadata?.subjects || []).map(s => s.subjectID)
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage()
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/bucket/structure') return route.fulfill(json({ text: '/t\n', tree: '', formats: [], totals: { files: 1, size: '1 KB' }, summarySentence: '', checks: [] }))
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(2500)
  await page.locator('.ant-steps-item').nth(4).click({ force: true }); await page.waitForTimeout(1200)   // the Subjects step is already open when the draft is imported
  await page.locator('input[type=file]').first().setInputFiles(file); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Apply to form/ }).evaluate((el) => el.click()); await page.waitForTimeout(1500)
  await page.waitForTimeout(1000)
  const html = await page.locator('body').innerText()
  const values = await page.locator('input').evaluateAll(els => els.map(e => e.value))
  ok('the subject step shows the imported subject IDs', want.every(w => values.includes(w)), `want ${want.length}, found ${want.filter(w => values.includes(w)).join(',')}`)
  ok('the individual-subjects view is selected (no group list)', !/Add new group/.test(html))
  await page.screenshot({ path: '/tmp/subj.png', fullPage: false })
  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
