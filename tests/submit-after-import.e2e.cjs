// A complete draft imported without opening the Subjects step: Submit must not ask to open it.
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/submit-after-import.e2e.cjs <draft.json>
const { chromium } = require('playwright')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
;(async () => {
  const file = process.argv[2]
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage()
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/kginfo/datatypes') return route.fulfill(json({ dataTypes: [] }))
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(2500)
  await page.locator('input[type=file]').first().setInputFiles(file); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Apply to form/ }).evaluate((el) => el.click()); await page.waitForTimeout(1500)
  await page.locator('.ant-steps-item').nth(5).click({ force: true }); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /Submit metadata/ }).first().evaluate((el) => el.click()); await page.waitForTimeout(800)
  const modal = (await page.locator('.ant-modal:visible').allInnerTexts().catch(() => [])).join(' || ')
  ok('no "open the Subjects step" request', !/Please open this step/.test(modal), modal.replace(/\n+/g, ' | ').slice(0, 400))
  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
