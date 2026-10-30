// Browser test: wizard-only logout, and the visible retry when the Collab drive check fails (mocked server).
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/logout-collab.e2e.cjs
const { chromium } = require('playwright')
const base = 'http://localhost:4173'
const out = []; const ok = (n, c, x='') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
const DSV = '724d4af0-fe28-4032-8837-120b0d64a81c'
;(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext(); const page = await ctx.newPage()
  let sessionActive = true, calls = [], infoAttempts = 0
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url()); calls.push(route.request().method() + ' ' + u.pathname + u.search)
    if (u.pathname === '/api/auth/me') return route.fulfill(json(sessionActive ? { active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } } : { active: false, user: null }))
    if (u.pathname === '/api/auth/logout') { sessionActive = false; return route.fulfill(json({ ok: true })) }
    if (u.pathname === '/api/auth/loginurl') return route.fulfill({ status: 200, contentType: 'text/plain', body: `${base}/fakeiam/x` })
    if (u.pathname === '/api/zammad/zammadinfo') return route.fulfill(json({ submissionId: 1, datasetVersionId: DSV }))
    if (u.pathname === '/api/drive/draft/info') { infoAttempts++; return infoAttempts < 2 ? route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ code: 'DRIVE_ERROR', error: 'The Collab drive answered 502.' }) }) : route.fulfill(json({ exists: true, library: true, mtime: '2026-10-30T08:31:48Z' })) }
    if (u.pathname === '/api/drive/draft/figures/index') return route.fulfill(json({ index: null }))
    return route.fulfill(json({}))
  })
  await page.route('**/fakeiam/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'iam' }))
  await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(1800)
  ok('session restored, greeting', await page.getByText(/Hello, Maya K/).count() > 0)
  ok('check failed first: message visible', await page.getByText(/Could not check the Collab drive for an earlier draft/).count() > 0)
  await page.waitForTimeout(4500)
  ok('retry worked: saved-draft notice appears', await page.getByText('A draft is already saved in the Collab drive of this dataset').count() > 0, 'info attempts=' + infoAttempts)
  // logout
  calls = []
  await page.getByRole('button', { name: /Log-out/ }).click(); await page.waitForTimeout(1500)
  ok('logout called POST /api/auth/logout, no IAM redirect', calls.includes('POST /api/auth/logout') && !calls.some(c => c.includes('loginurl')), JSON.stringify(calls.filter(c => c.includes('auth'))))
  ok('logged-out dialog shown', await page.getByText('You have logged out of the wizard').count() > 0)
  ok('ticket kept in URL', page.url().includes('TicketNumber=4826029'), page.url())
  ok('no automatic login after logout (no loginurl call)', !calls.some(c => c.includes('loginurl')))
  ok('EBRAINS full logout offered', await page.getByText('Log out of EBRAINS as well').count() > 0)
  calls = []
  await page.getByRole('button', { name: 'Login' }).first().click(); await page.waitForTimeout(800)
  ok('Login click goes to the login (not silent)', calls.some(c => c.includes('loginurl')) && !calls.some(c => c.includes('silent=1')), JSON.stringify(calls))
  await browser.close()
  console.log(out.join('\n')); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
