// Layout check at phone / tablet / laptop widths (mocked server). Run: npx vite preview --port 4173 &  NODE_PATH=$(npm root -g) node tests/mobile-layout.e2e.cjs
const { chromium } = require('playwright')
const json = (o) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })
;(async () => {
  const browser = await chromium.launch(); const out = []
  for (const W of [360, 390, 768, 1000, 1280]) {
    const page = await (await browser.newContext({ viewport: { width: W, height: 800 }, isMobile: W < 700 })).newPage()
    await page.route('**/api/**', r => { const u = new URL(r.request().url()); return r.fulfill(json(u.pathname === '/api/auth/me' ? { active: true, user: { fullname: 'Maya K', email: 'm@x.no', username: 'maya' } } : {})) })
    await page.goto('http://localhost:4173/?TicketNumber=4826029'); await page.waitForTimeout(2000)
    for (const i of [0, 3, 4]) {
      if (i) { await page.locator('.ant-steps-item').nth(i).click({ timeout: 3000, force: true }).catch(() => {}); await page.waitForTimeout(500); const ok = page.getByRole('button', { name: /^OK$/ }); if (await ok.count()) await ok.first().click({ force: true, timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300) }
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
      out.push(`${m.sw <= m.cw ? 'PASS' : 'FAIL'}  width ${W}, step ${i}: page ${m.sw}px in ${m.cw}px`)
    }
    await page.close()
  }
  await browser.close(); console.log(out.join('\n')); process.exit(out.some(r => r.startsWith('FAIL')) ? 1 : 0)
})()
