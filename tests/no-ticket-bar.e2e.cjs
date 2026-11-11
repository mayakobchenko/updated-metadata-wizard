// Opened without a ticket number: the draft bar must not claim that answers are saved in a Collab drive.
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/no-ticket-bar.e2e.cjs
const { chromium } = require('playwright')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x = '') => { out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); console.log(out[out.length - 1]) }
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
process.on('unhandledRejection', (e) => { console.log('ERROR', String(e).slice(0, 400)); process.exit(1) })
;(async () => {
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage()
  const calls = []
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url()); calls.push(u.pathname)
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    return route.fulfill(json({}))
  })
  await page.goto(base + '/'); await page.waitForTimeout(3000)
  const t = await page.locator('body').innerText()
  ok('no claim about automatic saving in a Collab drive', !/saved automatically in the Collab drive/.test(t))
  ok('says that nothing is stored and why', /not stored on any server/.test(t) && /without a support-ticket link/.test(t))
  ok('no Collab toggle is shown', await page.getByText('Collab copy').count() === 0)
  ok('no Collab draft call was made', !calls.some(c => c.startsWith('/api/drive/draft')), calls.filter(c => c.includes('draft')).join(','))
  await browser.close(); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
