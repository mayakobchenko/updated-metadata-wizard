// Opened without a ticket number: the draft bar must not claim that answers are saved in a Collab drive.
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/no-ticket-bar.e2e.cjs
const { chromium } = require('playwright')
const fs = require('fs'); const os = require('os'); const path = require('path')
const ID = '1bd8c07c-18dc-46c2-a501-2dc1aef72205'
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })
;(async () => {
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage()
  const calls = []; const saves = []; let remoteExists = !!process.env.REMOTE_DRAFT   // REMOTE_DRAFT=1: the dataset of the draft already has a draft in its Collab
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url()); calls.push(u.pathname)
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/drive/draft/save') { saves.push(JSON.parse(route.request().postData() || '{}').datasetVersionId); return route.fulfill(json({ savedAt: new Date().toISOString() })) }
    if (u.pathname === '/api/drive/draft/figures/index') return route.fulfill(json({ index: null }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: remoteExists, library: true, modified: '2026-11-10T10:00:00Z' }))
    if (u.pathname === '/api/bucket/structure') return route.fulfill(json({ text: '/t\n', tree: '', formats: [], totals: { files: 1, size: '1 KB' }, summarySentence: '', checks: [] }))
    return route.fulfill(json({}))
  })
  await page.goto(base + '/'); await page.waitForTimeout(3000)
  const t = await page.locator('body').innerText()
  ok('no claim about automatic saving in a Collab drive', !/saved automatically in the Collab drive/.test(t))
  ok('says that nothing is stored and what to do', /not stored on any server/.test(t) && /opened without a ticket number/.test(t) && /link provided in your data sharing Collab/.test(t))
  ok('no Collab toggle is shown', await page.getByText('Collab copy').count() === 0)
  ok('no Collab draft call was made', !calls.some(c => c.startsWith('/api/drive/draft')), calls.filter(c => c.includes('draft')).join(','))
  // A draft that contains a dataset ID: the ID decides the Collab drive of the automatic saving.
  const file = path.join(os.tmpdir(), 'draft-id.json')
  fs.writeFileSync(file, JSON.stringify({ datasetVersionId: ID, dataset1: { dataTitle: 'T', briefSummary: 'S', optionsData: [], dataStandart: [] } }))
  await page.locator('input[type=file]').first().setInputFiles(file); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Apply to form/ }).evaluate((el) => el.click()); await page.waitForTimeout(1500)
  const t2 = await page.locator('body').innerText()
  ok('the warning about the missing ticket is gone after importing a draft with a dataset ID', !/opened without a ticket number/.test(t2))
  ok('the message names the dataset of the draft', t2.includes(ID) || await page.locator('.ant-message').innerText().then(x => x.includes(ID)).catch(() => false))
  ok('the Collab toggle is shown', await page.getByText('Collab copy').count() > 0)
  await page.locator('input[type=text]:visible').first().click(); await page.keyboard.type(' x'); await page.waitForTimeout(36000)   // the saving starts with the first edit
  if (process.env.REMOTE_DRAFT) {
    ok('an existing Collab draft of that dataset is not overwritten without asking', saves.length === 0 && /saved draft already exists/i.test(await page.locator('body').innerText()), JSON.stringify(saves))
  } else {
    ok('the automatic save goes to the Collab of the dataset in the draft', saves.length > 0 && saves.every(x => x === ID), JSON.stringify(saves))
  }
  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
