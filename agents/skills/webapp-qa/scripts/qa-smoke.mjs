#!/usr/bin/env node
// ---------------------------------------------------------------------------
// qa-smoke.mjs — spec-driven end-to-end smoke test.
//
// Usage:
//   node scripts/qa-smoke.mjs <spec.json> [--executable <path>] [--headed]
//
// The spec walks the critical user journey of any web app. Steps are a small
// DSL (wait / click / fill / press / expect / screenshot / sleep). Every step
// logs PASS/FAIL; console errors and uncaught page errors are captured from
// page load and asserted at the end.
//
// Spec shape:
//   {
//     "url": "http://localhost:5173",
//     "timeout": 30000,              // default waitForSelector timeout
//     "dialogs": "accept",           // optional: auto-handle browser dialogs
//     "steps": [
//       { "wait": ".track__row" },
//       { "expect": { "label": "seed shows 8 tracks", "count": { "sel": ".track__row", "eq": 8 } } },
//       { "fill": { "sel": ".search", "value": "Noori" } },
//       { "expect": { "count": { "sel": ".track__row", "eq": 1 } } },
//       { "click": "text=Import from Spotify" },
//       { "wait": ".preview", "timeout": 10000 },
//       { "click": ".preview__foot .btn--primary" },
//       { "expect": { "count": { "sel": ".track__row", "gt": 8 } } },
//       { "expect": { "noErrors": true } }
//     ]
//   }
//
// Expect forms:
//   { "count": { "sel", "eq"|"gt"|"gte"|"lt"|"lte" } }
//   { "visible": "sel" }  { "hidden": "sel" }
//   { "text": { "sel", "contains"|"eq" } }
//   { "noErrors": true }
//   { "noOverflow": true }
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import {
  loadPlaywright, launchBrowser, captureErrors, makeReporter, measureOverflow,
  readSpec, parseArgs,
} from './qa-lib.mjs'

const args = parseArgs(process.argv.slice(2))
if (!args._[0]) {
  console.error('usage: node qa-smoke.mjs <spec.json> [--executable <path>] [--headed]')
  process.exit(2)
}
const spec = readSpec(args._[0])
const browser = await launchBrowser({ headless: !args.headed, exe: args.executable })
const page = await browser.newPage({ viewport: { width: spec.viewport?.width ?? 1440, height: spec.viewport?.height ?? 900 } })

const errors = captureErrors(page)
const reporter = makeReporter()
const timeout = spec.timeout ?? 30000

if (spec.dialogs === 'accept') page.on('dialog', (d) => d.accept())
else if (spec.dialogs === 'dismiss') page.on('dialog', (d) => d.dismiss())

async function expectStep(ex) {
  const label = ex.label ?? JSON.stringify(ex).slice(0, 70)
  if (ex.count) {
    const { sel, eq, gt, gte, lt, lte } = ex.count
    const n = await page.locator(sel).count()
    const cond = eq !== undefined ? n === eq
      : gt !== undefined ? n > gt
      : gte !== undefined ? n >= gte
      : lt !== undefined ? n < lt
      : lte !== undefined ? n <= lte
      : false
    reporter.ok(cond, label, `count(${sel}) = ${n}`)
  } else if (ex.visible) {
    reporter.ok(await page.locator(ex.visible).first().isVisible().catch(() => false), label)
  } else if (ex.hidden) {
    reporter.ok(!(await page.locator(ex.hidden).first().isVisible().catch(() => true)), label)
  } else if (ex.text) {
    const { sel, contains, eq } = ex.text
    const t = (await page.locator(sel).first().textContent().catch(() => '')).trim()
    reporter.ok(contains !== undefined ? t.includes(contains) : eq !== undefined ? t === eq : false, label, `text(${sel}) = "${t.slice(0, 60)}"`)
  } else if (ex.noErrors) {
    const real = errors.filter((e) => !/favicon\.ico/.test(e))
    reporter.ok(real.length === 0, label, real.slice(0, 3).join(' | '))
  } else if (ex.noOverflow) {
    const m = await measureOverflow(page)
    reporter.ok(!m.docOverflow && m.overflowing.length === 0, label, JSON.stringify(m))
  } else {
    reporter.ok(false, `unknown expect: ${label}`)
  }
}

try {
  if (spec.url) {
    await page.goto(spec.url, { waitUntil: 'domcontentloaded' })
    reporter.ok(true, `goto ${spec.url}`)
  }

  for (const step of spec.steps ?? []) {
    const t = step.timeout ?? timeout
    if (step.wait) {
      await page.waitForSelector(step.wait, { timeout: t })
      reporter.ok(true, `wait ${step.wait}`)
    } else if (step.waitText) {
      await page.waitForSelector(`text=${step.waitText}`, { timeout: t })
      reporter.ok(true, `wait text "${step.waitText}"`)
    } else if (step.click) {
      await page.click(step.click, { timeout: t })
      reporter.ok(true, `click ${step.click}`)
    } else if (step.fill) {
      await page.fill(step.fill.sel, step.fill.value)
      reporter.ok(true, `fill ${step.fill.sel} = "${step.fill.value}"`)
    } else if (step.press) {
      await page.press(step.press.sel, step.press.key)
      reporter.ok(true, `press ${step.press.key} on ${step.press.sel}`)
    } else if (step.expect) {
      await expectStep(step.expect)
    } else if (step.sleep) {
      await page.waitForTimeout(step.sleep)
    } else if (step.screenshot) {
      fs.mkdirSync(path.dirname(step.screenshot), { recursive: true })
      await page.screenshot({ path: step.screenshot, fullPage: step.fullPage ?? false })
      reporter.ok(true, `screenshot ${step.screenshot}`)
    } else {
      reporter.ok(false, `unknown step: ${JSON.stringify(step).slice(0, 60)}`)
    }
  }

  if (spec.expectNoErrors !== false) {
    const real = errors.filter((e) => !/favicon\.ico/.test(e))
    reporter.ok(real.length === 0, 'no console/page errors by end of run', real.slice(0, 5).join(' | '))
  }
} catch (err) {
  reporter.ok(false, `run threw: ${err.message.slice(0, 200)}`)
}

if (errors.length) {
  console.log('\n--- captured errors ---')
  for (const e of errors) console.log(e)
}
reporter.summary()
await browser.close()
