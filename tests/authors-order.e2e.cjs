// Browser test: first author choice, bold titles, import popup. Import the real Spatial-navigation draft.
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/authors-order.e2e.cjs <draft.json>
const { chromium } = require('playwright')
const fs = require('fs'); const os = require('os'); const path = require('path')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })
;(async () => {
  const draft = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : {
    datasetVersionId: '785268e2-9c29-4e21-ad40-79859127e14a',
    contactperson: { firstName: 'Simon', familyName: 'Ball', email: 's@x.no' },
    custodian: { firstName: 'Edvard', familyName: 'Moser', email: 'e@x.no', institution: 'Kavli Institute' },
    dataset1: { dataTitle: 'T', copyright: 'Yes', copyrightHolder: 'Organization', copyrightOrganization: 'Kavli Institute', copyrightYear: '2026-11-17T23:00:00.000Z' },
    contribution: { authors: [
      { id: 1, isCustom: true, firstName: 'Matteo', lastName: 'Guardamagna', email: 'm@x.no', affiliationIds: ['custodian-aff'], contributions: [] },
      { id: 2, isCustom: true, firstName: 'Simon', lastName: 'Ball', email: 's@x.no', affiliationIds: ['custodian-aff'], contributions: [] }] },
  }
  const file = path.join(os.tmpdir(), 'draft-auth.json'); fs.writeFileSync(file, JSON.stringify(draft))
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage()
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(2500)
  await page.locator('input[type=file]').first().setInputFiles(file); await page.waitForTimeout(800)
  const pop = await page.locator('.ant-modal').innerText()
  ok('popup: authors line includes the custodian', /Authors: 2 \+ the data custodian/.test(pop), pop.match(/Authors:[^\n]*/)?.[0])
  ok('popup: copyright holder and year shown', /Copyright: Kavli[^\n]*, 2026/.test(pop))
  ok('popup: custodian line', /Data custodian: Edvard Moser/.test(pop))
  await page.getByRole('button', { name: /Apply to form/ }).evaluate((el) => el.click()); await page.waitForTimeout(1500)
  await page.locator('.ant-steps-item').nth(2).click({ force: true }); await page.waitForTimeout(1200)
  const titles = () => page.locator('.step-subtitle').evaluateAll(els => els.map(e => e.textContent.trim()).filter(t => /^Author \d/.test(t)))
  let t = await titles()
  ok('start: custodian is Author 1', /^Author 1: Edvard Moser \(data custodian\)/.test(t[0]) && t.length === 3, JSON.stringify(t))
  const weights = await page.locator('.step-subtitle').evaluateAll(els => els.filter(e => /^Author \d|^Institutions/.test(e.textContent.trim())).map(e => getComputedStyle(e).fontWeight))
  ok('"Author #" and "Institutions (affiliations)" titles are bold', weights.length >= 4 && weights.every(w => +w >= 600), weights.join(','))
  ok('"Affiliation(s)" label is bold', await page.locator('label b', { hasText: 'Affiliation(s)' }).count() >= 2)
  ok('the old sentence is gone', (await page.locator('body').innerText()).indexOf('always the first author') < 0)
  // choose Matteo as first author
  await page.locator('.ant-select').filter({ hasText: 'Edvard Moser (data custodian)' }).first().click()
  await page.locator('.ant-select-item-option').filter({ hasText: 'Matteo' }).first().click(); await page.waitForTimeout(600)
  t = await titles()
  ok('Matteo is now first, custodian second', /^Author 1/.test(t[0]) && /^Author 2: Edvard Moser/.test(t[1]), JSON.stringify(t))
  // move the custodian down
  await page.getByTitle('Move this author down').nth(1).click(); await page.waitForTimeout(500)
  t = await titles()
  ok('arrow moves the custodian to place 3', /^Author 3: Edvard Moser/.test(t[2]), JSON.stringify(t))
  await page.screenshot({ path: '/tmp/authors.png', fullPage: true })
  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
