// Browser test of the draft bar states (mocked server). Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/draft-bar.e2e.cjs
const { chromium } = require('playwright')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
const DSV = '724d4af0-fe28-4032-8837-120b0d64a81c'
;(async () => {
  const browser = await chromium.launch(); const page = await (await browser.newContext()).newPage()
  let saves = 0
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/zammad/zammadinfo') return route.fulfill(json({ submissionId: 1, datasetVersionId: DSV }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/drive/draft/figures/index') return route.fulfill(json({ index: null }))
    if (u.pathname === '/api/drive/draft/save') { saves++; return route.fulfill(json({ savedAt: new Date().toISOString() })) }
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(2000)
  const bar = () => page.locator('span', { hasText: /Collab drive|not stored/ }).first().locator('xpath=..').innerText()
  let t = await bar()
  ok('start: calm text with the number 20', /automatically, 20 seconds after your last change/.test(t) && !t.includes('⚠'), t.slice(0, 140))
  await page.getByText('Next', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(800)
  const box = page.locator('input[type=text], textarea').first()
  if (await box.count()) {
    await box.click(); await page.keyboard.type('abc', { delay: 80 }); await page.waitForTimeout(600)
    t = await bar()
    ok('after an edit: "Unsaved changes", number shown, no warning icon', /Unsaved changes/.test(t) && /20 seconds/.test(t) && !t.includes('⚠'), t.slice(0, 160))
    await page.waitForTimeout(23000)
    t = await bar()
    ok('after 20 s: saved once, "All changes are saved"', saves >= 1 && /All changes are saved/.test(t), `saves=${saves} ` + t.slice(0, 120))
  } else ok('found an input to type in', false)
  await browser.close(); console.log(out.join('\n')); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
