// Browser test of the autosave bar and timing (mocked server, fake clock).
// Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/collab-autosave-ui.e2e.cjs
const { chromium } = require('playwright')
const base = 'http://localhost:4173'
const DSV = '724d4af0-fe28-4032-8837-120b0d64a81c'
const out = []; const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`)
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
;(async () => {
  const browser = await chromium.launch(); const page = await (await browser.newContext()).newPage()
  let saves = 0
  await page.clock.install()
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/auth/me') return route.fulfill(json({ active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } }))
    if (u.pathname === '/api/zammad/zammadinfo') return route.fulfill(json({ submissionId: 1, datasetVersionId: DSV }))
    if (u.pathname === '/api/drive/draft/info') return route.fulfill(json({ exists: false, library: true }))
    if (u.pathname === '/api/drive/draft/figures/index') return route.fulfill(json({ index: null }))
    if (u.pathname === '/api/drive/draft/save') { saves++; return route.fulfill(json({ savedAt: new Date().toISOString() })) }
    return route.fulfill(json({}))
  })
  await page.goto(base + '/?TicketNumber=4826029'); await page.clock.runFor(1500)
  const bar = () => page.locator('div', { hasText: /Collab copy/ }).last().innerText().catch(() => '')
  let t = await page.locator('body').innerText()
  ok('start: states the interval, no warning wording', /at most every 30 seconds/.test(t) && !/few seconds/.test(t))
  ok('start: says each save replaces the previous one', /Each save replaces the previous saved draft/.test(t))
  // type into the first text field of the Introduction step
  const field = page.locator('input.ant-input[type="text"]').first()
  await field.click(); await field.type('hello', { delay: 20 }); await page.clock.runFor(300)
  t = await page.locator('body').innerText()
  ok('after a change: "not saved yet ... within 30 seconds"', /Changes not saved yet\. They will be saved automatically within 30 seconds/.test(t), t.match(/Changes not saved[^.]*\./)?.[0] || '')
  ok('Save now button shown', await page.getByRole('button', { name: 'Save now' }).count() === 1)
  await page.clock.runFor(20000); ok('nothing saved after 20 s', saves === 0, 'saves=' + saves)
  await page.clock.runFor(12000); await page.waitForTimeout(300); await page.clock.runFor(100)
  t = await page.locator('body').innerText()
  ok('saved after about 30 s', saves === 1, 'saves=' + saves)
  ok('after save: "All changes are saved in the Collab drive"', /All changes are saved in the Collab drive/.test(t))
  // continuous typing does not postpone the save beyond the interval
  await field.type('a', { delay: 10 }); await page.clock.runFor(15000); await field.type('b', { delay: 10 }); await page.clock.runFor(16000); await page.waitForTimeout(300); await page.clock.runFor(100)
  ok('keeps saving while the person keeps typing (not postponed)', saves === 2, 'saves=' + saves)
  // Save now
  await field.type('c', { delay: 10 }); await page.clock.runFor(200)
  await page.getByRole('button', { name: 'Save now' }).click(); await page.waitForTimeout(400); await page.clock.runFor(100)
  ok('Save now saves immediately', saves === 3, 'saves=' + saves)
  // change interval to 5 minutes
  await page.locator('.anticon-info-circle[title="About the Collab copy"]').click()
  ok('popover explains that a save cannot be undone', await page.getByText(/cannot be undone from the saved copy/).count() > 0)
  await page.locator('.ant-popover .ant-select').click(); await page.getByText('5 minutes', { exact: true }).last().click()
  await field.click(); await field.type('d', { delay: 10 }); await page.clock.runFor(120000); await page.waitForTimeout(300)
  ok('with 5 minutes nothing is saved after 2 minutes', saves === 3, 'saves=' + saves)
  await page.clock.runFor(190000); await page.waitForTimeout(400); await page.clock.runFor(100)
  ok('with 5 minutes it saves after 5 minutes', saves === 4, 'saves=' + saves)
  await browser.close(); console.log(out.join('\n')); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
