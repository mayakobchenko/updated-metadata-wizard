// Merged steps, funding question, submit gate. Mocked server. Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/merged-steps.e2e.cjs
const { chromium } = require('playwright')
const fs = require('fs')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
;process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 300)); process.exit(1) })
;(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true }); const page = await ctx.newPage()
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/zammad/zammadinfo') return route.fulfill(json({ submissionId: 1, datasetVersionId: '724d4af0-fe28-4032-8837-120b0d64a81c' }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/kginfo/license') return route.fulfill(json({ license: [{ name: 'CC BY 4.0', identifier: 'https://kg.ebrains.eu/api/instances/lic1', fullName: 'Creative Commons BY 4.0', webpage: 'https://x' }] }))
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(2500)
  const stepTitles = await page.locator('.ant-steps-item-title').allInnerTexts().catch(() => [])
  const bodyText = await page.locator('.container-form').innerText()
  ok('no Introduction / Dataset part 1 / part 2 step', !/Introduction|Dataset part/.test(bodyText.split('Welcome')[0] + stepTitles.join(' ')), stepTitles.join('|'))
  ok('page 1 shows welcome, Dataset and the additional information', /Welcome to the EBRAINS/.test(bodyText) && /Dataset title/.test(bodyText) && /Home Page/.test(bodyText) && /Related publications/.test(bodyText))
  ok('page 1 has no contact person / custodian (they moved)', !/Contact person's first name/.test(bodyText))

  // one field in each section, then download the draft and look at it
  await page.getByLabel('Dataset title').fill('My test dataset')
  await page.getByLabel('Short title').fill('Test')
  await page.getByLabel('Home Page').fill('https://example.com/x')
  await page.getByLabel('Input data').fill('doi:10.1/abc')
  await page.getByText('Experimental data', { exact: true }).click()
  const dl = async () => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: /Download draft/ }).evaluate((el) => el.click())]); const p = await d.path(); return JSON.parse(fs.readFileSync(p, 'utf8')) }
  let draft = await dl()
  ok('Dataset section values reach the data', draft.dataset1?.dataTitle === 'My test dataset' && draft.dataset1?.shortTitle === 'Test' && (draft.dataset1?.optionsData || []).includes('Experimental data'), JSON.stringify(draft.dataset1).slice(0, 120))
  ok('Additional-information values reach the data', draft.dataset2?.homePage === 'https://example.com/x' && draft.dataset2?.inputdata === 'doi:10.1/abc')

  // Next with missing mandatory fields: blocked
  await page.getByRole('button', { name: /^Next$/ }).click(); await page.waitForTimeout(600)
  ok('Next is blocked while mandatory fields are empty (warning dialog)', await page.getByText('Please fill in the required fields before proceeding.').count() > 0)
  await page.getByRole('button', { name: /^OK$/ }).last().click().catch(() => {}); await page.waitForTimeout(300)

  // Funding step: question first, funder fields only after "Yes"
  await page.locator('.ant-steps-item, .wizard-dot').nth(1).click({ force: true }); await page.waitForTimeout(600)
  let t = await page.locator('.container-form').innerText()
  ok('Funding: the question comes first, no funder fields yet', /Was the work behind this dataset funded/.test(t) && !/Funder name/.test(t))
  await page.locator('label:has(input[value=Yes])').evaluate((el) => el.click()); await page.waitForTimeout(400)
  t = await page.locator('.container-form').innerText()
  ok('Funding: "Yes" shows funder name and grant ID', /Funder name/.test(t) && /Grant ID/.test(t))
  await page.getByRole('button', { name: /^Next$/ }).click(); await page.waitForTimeout(500)
  ok('Funding: Next is blocked with an empty funder', await page.getByText('Please enter the name of the funder.').count() > 0)
  await page.getByRole('button', { name: /^OK$/ }).last().evaluate((el) => el.click()).catch(() => {}); await page.waitForTimeout(400)
  await page.getByPlaceholder('e.g. European Research Council').fill('ERC')
  await page.getByPlaceholder('e.g. ERC-2021-STG-123456').fill('123')
  draft = await dl()
  ok('Funding: answer and funder are stored', draft.funding?.isFunded === 'Yes' && draft.funding?.funders?.[0]?.funderName === 'ERC' && draft.funding?.funders?.[0]?.grantId === '123', JSON.stringify(draft.funding).slice(0, 140))
  await page.locator('label:has(input[value=No])').evaluate((el) => el.click()); await page.waitForTimeout(400)
  draft = await dl()
  ok('Funding: "No" clears the funders', draft.funding?.isFunded === 'No' && (draft.funding?.funders || []).length === 0)

  // Contributors page: contact person, custodian and authors together
  await page.locator('.ant-steps-item, .wizard-dot').nth(2).click({ force: true }); await page.waitForTimeout(700)
  t = await page.locator('.container-form').innerText()
  ok('Contributors: contact person, custodian and authors on one page', /Contact person's first name/.test(t) && /Data custodian's first name/.test(t) && /Dataset authors/.test(t), t.slice(-300).replace(/\n/g, ' | '))
  await page.getByLabel("Contact person's first name").fill('Ada')
  draft = await dl()
  ok('Contributors: contact person reaches the data, authors keep working', draft.contactperson?.firstName === 'Ada')

  await page.getByRole('button', { name: 'Add an Author' }).evaluate((el) => el.click()); await page.waitForTimeout(500)
  draft = await dl()
  ok('Contributors: adding an author works and keeps the contact person', (draft.contribution?.authors || []).length === 1 && draft.contactperson?.firstName === 'Ada', JSON.stringify(draft.contribution?.authors).slice(0, 100))
  await page.locator('.ant-steps-item, .wizard-dot').nth(0).click({ force: true }); await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Add a support channel' }).evaluate((el) => el.click()); await page.waitForTimeout(400)
  await page.getByPlaceholder('Enter support channel').fill('help@example.org')
  draft = await dl()
  ok('Dataset page: support channel keeps working, title still there', draft.dataset2?.supportChannels?.[0]?.newChannel === 'help@example.org' && draft.dataset1?.dataTitle === 'My test dataset' && draft.dataset2?.homePage === 'https://example.com/x', JSON.stringify(draft.dataset2).slice(0, 140))

  // Submit gate on the last step
  const n = await page.locator('.ant-steps-item, .wizard-dot').count()
  await page.locator('.ant-steps-item, .wizard-dot').nth(n - 1).click({ force: true }); await page.waitForTimeout(900)
  await page.getByRole('button', { name: /Submit metadata/ }).click(); await page.waitForTimeout(600)
  t = await page.locator('.ant-modal').last().innerText().catch(() => '')
  ok('Submit metadata: popup lists the missing mandatory fields', /cannot be submitted yet/.test(t) && /License/.test(t) && /Data custodian: first name/.test(t) && /Experimental approach/.test(t), t.replace(/\n/g, ' | ').slice(0, 220))
  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
