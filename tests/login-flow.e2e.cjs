// Browser test of the login flow with a mocked server and EBRAINS login (needs Playwright and `npx vite preview --port 4173` running).
// Run: NODE_PATH=$(npm root -g) node tests/login-flow.e2e.cjs
const { chromium } = require('playwright')
const base = 'http://localhost:4173'
const results = []
const ok = (n, c, extra='') => { results.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${extra}`) }
async function run(name, setup, check) {
  const browser = await chromium.launch(); const ctx = await browser.newContext(); const page = await ctx.newPage()
  const calls = []
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url()); calls.push(u.pathname + u.search)
    const r = await setup(u, route)
    if (r) return route.fulfill(r)
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/fakeiam/**', async (route) => { const u = new URL(route.request().url()); calls.push('IAM ' + u.search); const h = await route.request().allHeaders()
    return route.fulfill(await setup(u, route, 'iam')) })
  await page.goto(base + '/?TicketNumber=4826029', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await check(page, calls)
  await browser.close()
}
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
;(async () => {
  // 1. already logged in at the wizard: no IAM, no dialog
  await run('session', async (u) => {
    if (u.pathname === '/api/auth/me') return json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } })
    if (u.pathname === '/api/zammad/zammadinfo') return json({ submissionId: 1, datasetVersionId: null })
  }, async (page, calls) => {
    ok('1 session: no IAM redirect', !calls.some(c => c.startsWith('IAM') || c.includes('loginurl')), JSON.stringify(calls.filter(c=>c.includes('auth'))))
    ok('1 session: no login dialog', await page.getByText('Please login with your EBRAINS account').count() === 0)
    ok('1 session: greeting shown', await page.getByText(/Hello, Maya K/).count() > 0)
  })
  // 2. no session, not logged in to EBRAINS: silent check -> login_required -> dialog, ticket restored
  await run('noiam', async (u, route, kind) => {
    if (u.pathname === '/api/auth/me') return json({ active: false, user: null })
    if (u.pathname === '/api/auth/loginurl') return { status: 200, contentType: 'text/plain', body: `${base}/fakeiam/auth?prompt=${u.searchParams.get('silent') === '1' ? 'none' : 'login'}` }
    if (kind === 'iam') return { status: 302, headers: { location: `${base}/?error=login_required&state=abc&iss=x&TicketNumberX=1` }, body: '' }
  }, async (page, calls) => {
    ok('2 not logged in: silent check asked (silent=1)', calls.some(c => c.includes('loginurl') && c.includes('silent=1')), JSON.stringify(calls))
    ok('2 not logged in: dialog shown', await page.getByText('Please login with your EBRAINS account').count() > 0)
    const url = new URL(page.url())
    ok('2 not logged in: ticket restored in URL, error params gone', url.searchParams.get('TicketNumber') === '4826029' && !url.searchParams.has('error') && !url.searchParams.has('state'), page.url())
    // click Login -> interactive (no silent)
    calls.length = 0
    await page.getByRole('button', { name: 'Login' }).first().click(); await page.waitForTimeout(800)
    ok('2 login click is NOT silent', calls.some(c => c.includes('loginurl')) && !calls.some(c => c.includes('silent=1')), JSON.stringify(calls))
  })
  // 3. no session but logged in to EBRAINS: silent answer with code -> token -> user
  await run('iam', async (u, route, kind) => {
    if (u.pathname === '/api/auth/me') return json({ active: false, user: null })
    if (u.pathname === '/api/auth/loginurl') return { status: 200, contentType: 'text/plain', body: `${base}/fakeiam/auth?prompt=none` }
    if (kind === 'iam') return { status: 302, headers: { location: `${base}/?state=s1&session_state=ss&iss=x&code=c1` }, body: '' }
    if (u.pathname === '/api/auth/token') return { status: 200, contentType: 'text/plain', body: JSON.stringify({ success: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' }, ticket: '4826029' }) }
    if (u.pathname === '/api/zammad/zammadinfo') return json({ submissionId: 1, datasetVersionId: null })
  }, async (page, calls) => {
    ok('3 logged in at EBRAINS: no dialog', await page.getByText('Please login with your EBRAINS account').count() === 0)
    ok('3 logged in at EBRAINS: greeting shown', await page.getByText(/Hello, Maya K/).count() > 0, JSON.stringify(calls.filter(c => c.includes('auth'))))
  })
  // 4. no loop: a second load within a minute after a failed silent check shows the dialog without another redirect
  {
    const browser = await chromium.launch(); const ctx = await browser.newContext(); const page = await ctx.newPage(); let loginurlCalls = 0
    await page.route('**/api/**', async (route) => { const u = new URL(route.request().url())
      if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: false }))
      if (u.pathname === '/api/auth/loginurl') { loginurlCalls++; return route.fulfill({ status: 200, contentType: 'text/plain', body: `${base}/fakeiam/auth` }) }
      return route.fulfill(json({})) })
    await page.route('**/fakeiam/**', (route) => route.fulfill({ status: 302, headers: { location: `${base}/?error=login_required&state=abc` }, body: '' }))
    await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(1500)
    await page.goto(base + '/?TicketNumber=4826029'); await page.waitForTimeout(1500)
    ok('4 no redirect loop (one silent attempt only)', loginurlCalls === 1, 'loginurl calls=' + loginurlCalls)
    ok('4 dialog still shown', await page.getByText('Please login with your EBRAINS account').count() > 0)
    await browser.close()
  }
  console.log(results.join('\n')); process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
