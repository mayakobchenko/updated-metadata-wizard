// Organisation dropdown: copyright holder, funders, affiliations. The list is the common space of the KG (mocked).
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/organization-select.e2e.cjs
const { chromium } = require('playwright')
const fs = require('fs'); const os = require('os'); const path = require('path')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })
const ORGS = [
  { uuid: 'https://kg.ebrains.eu/api/instances/k1', fullName: 'Kavli Institute for Systems Neuroscience', shortName: 'KavliNTNU', homepage: 'https://www.ntnu.edu/kavli', identifier: 'https://ror.org/05xg72x27' },
  { uuid: 'https://kg.ebrains.eu/api/instances/a1', fullName: 'Aalborg University', shortName: 'AAU', homepage: 'https://www.en.aau.dk/', identifier: 'https://ror.org/04m5j1k67' },
  { uuid: 'https://kg.ebrains.eu/api/instances/e1', fullName: 'European Research Council', shortName: 'ERC', homepage: '', identifier: '' },
]
;(async () => {
  const draft = {
    datasetVersionId: '785268e2-9c29-4e21-ad40-79859127e14a',
    contactperson: { firstName: 'Simon', familyName: 'Ball', email: 's@x.no', affiliation: 'Aalborg University' },
    custodian: { firstName: 'Edvard', familyName: 'Moser', email: 'e@x.no', institution: 'My Lab, Somewhere, Norway' },
    dataset1: { dataTitle: 'T', copyright: 'Yes', copyrightHolder: 'Organization', copyrightOrganization: 'Kavli Institute for Systems Neuroscience', copyrightYear: '2026-06-01T00:00:00.000Z' },
    funding: { isFunded: 'Yes', funders: [{ id: 1, funderName: 'European Research Council', grantId: '1' }] },
    contribution: { affiliations: [{ id: 5, text: 'Aalborg University' }, { id: 6, text: 'Department of Nowhere' }], authors: [] },
  }
  const file = path.join(os.tmpdir(), 'draft-org.json'); fs.writeFileSync(file, JSON.stringify(draft))
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage()
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/kginfo/organisations') return route.fulfill(json({ organisations: ORGS }))
    if (u.pathname === '/api/kginfo/datatypes') return route.fulfill(json({ dataTypes: [] }))
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(2500)
  await page.locator('input[type=file]').first().setInputFiles(file); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Apply to form/ }).evaluate((el) => el.click()); await page.waitForTimeout(1800)
  // ── copyright holder
  let t = await page.locator('body').innerText()
  ok('copyright holder: the list entry is selected', await page.locator('.ant-select-selection-item', { hasText: 'Kavli Institute for Systems Neuroscience' }).count() >= 1)
  ok('copyright holder: homepage and identifier are shown', /Homepage: https:\/\/www\.ntnu\.edu\/kavli/.test(t) && /Identifier: https:\/\/ror\.org\/05xg72x27/.test(t))
  // pick another one from the list
  const sel = page.locator('.ant-select').filter({ has: page.locator('.ant-select-selection-item', { hasText: 'Kavli Institute' }) }).first()
  await sel.click(); await page.keyboard.type('aalb'); await page.waitForTimeout(300)
  await page.locator('.ant-select-item-option').filter({ hasText: 'Aalborg University' }).first().click(); await page.waitForTimeout(400)
  t = await page.locator('body').innerText()
  ok('search by short name finds Aalborg University and shows its identifier', /Identifier: https:\/\/ror\.org\/04m5j1k67/.test(t))
  // ── contributors step: contact person (in list), custodian (typed by hand), institutions
  await page.locator('.ant-steps-item').nth(2).click({ force: true }); await page.waitForTimeout(1200)
  const hand = await page.locator('input[placeholder="Name of the organisation"]').evaluateAll(els => els.map(e => e.value))
  ok('names that are not in the list stay as text (custodian, "Department of Nowhere")', hand.includes('My Lab, Somewhere, Norway') && hand.includes('Department of Nowhere'), JSON.stringify(hand))
  const ticked = await page.getByLabel('This organisation is not in the list').evaluateAll(els => els.map(e => e.checked))
  ok('their "not in the list" box is ticked, the others are not', ticked.filter(Boolean).length === 2 && ticked.filter(x => !x).length >= 1, JSON.stringify(ticked))
  t = await page.locator('body').innerText()
  ok('contact person affiliation from the list shows homepage', /Homepage: https:\/\/www\.en\.aau\.dk\//.test(t))
  // ── funding step
  await page.locator('.ant-steps-item').nth(1).click({ force: true }); await page.waitForTimeout(1000)
  ok('funder from the list is selected', await page.locator('.ant-select-selection-item', { hasText: 'European Research Council' }).count() >= 1)
  await page.screenshot({ path: '/tmp/org.png', fullPage: false })
  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
