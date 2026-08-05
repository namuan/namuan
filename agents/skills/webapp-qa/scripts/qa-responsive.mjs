#!/usr/bin/env node
// ---------------------------------------------------------------------------
// qa-responsive.mjs — verify a page doesn't break at common viewport widths.
//
// Usage:
//   node scripts/qa-responsive.mjs <url> [widths] [--sel <selector>] [--executable <path>]
//
//   <url>     the page to check
//   <widths>  comma list, default "390,768,1024,1440"
//   --sel     optional selector whose computed `position` is reported
//             (e.g. a sticky TOC — verifies it stays sticky at every width)
//
// For each width it reports: horizontal document overflow, the top overflowing
// elements (if any), and (with --sel) the selector's computed position.
// ---------------------------------------------------------------------------

import { launchBrowser, measureOverflow, parseArgs } from './qa-lib.mjs'

const args = parseArgs(process.argv.slice(2))
if (!args._[0]) {
  console.error('usage: node qa-responsive.mjs <url> [widths] [--sel <selector>]')
  process.exit(2)
}
const url = args._[0]
const widths = (args._[1] ?? '390,768,1024,1440').split(',').map((n) => parseInt(n, 10))
const sel = args.sel
const browser = await launchBrowser({ headless: !args.headed, exe: args.executable })

let failed = false
const results = []
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('body', { timeout: 30000 })
  await page.waitForTimeout(500)

  const m = await measureOverflow(page)
  const info = await page.evaluate((selector) => {
    if (!selector) return null
    const el = document.querySelector(selector)
    if (!el) return { position: '(no element)' }
    const cs = getComputedStyle(el)
    return { position: cs.position, top: cs.top }
  }, sel)

  const bad = m.docOverflow || m.overflowing.length > 0
  if (bad) failed = true
  results.push({ width, bad, overflow: m.overflowing.slice(0, 4), sticky: info })
}

const w = Math.max(...results.map((r) => String(r.width).length))
for (const r of results) {
  const line = `${String(r.width).padStart(w)}px  ${r.bad ? 'OVERFLOW' : 'ok       '}`
    + (r.overflow.length ? `  → ${r.overflow.join(', ')}` : '')
    + (r.sticky ? `  sel position: ${r.sticky.position}` : '')
  console.log(line)
}
console.log(failed ? '\nFAILED: overflow detected at some widths' : '\nok: no overflow at any tested width')
if (failed) process.exitCode = 1
await browser.close()
