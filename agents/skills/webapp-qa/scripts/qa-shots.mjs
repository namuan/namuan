#!/usr/bin/env node
// ---------------------------------------------------------------------------
// qa-shots.mjs — capture screenshots of key views for visual inspection.
//
// Usage:
//   node scripts/qa-shots.mjs <shots.json> [--out <dir>] [--executable <path>]
//
// Spec shape:
//   {
//     "url": "http://localhost:5173",
//     "out": "shots",                     // default: ./shots, override with --out
//     "viewport": { "width": 1440, "height": 900 },
//     "colorScheme": "light",             // optional
//     "shots": [
//       { "name": "01-library", "wait": ".track__row", "fullPage": false },
//       { "name": "02-detail",  "click": ".track__row", "wait": ".detail" },
//       { "name": "03-empty",   "goto": "/some/other/path", "sleep": 500 }
//     ]
//   }
//
// Per-shot actions run in order: goto (relative to spec.url), wait, waitText,
// click, fill, press, sleep. If `name` is a relative path with a subdirectory,
// it is created automatically.
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import { launchBrowser, readSpec, parseArgs } from './qa-lib.mjs'

const args = parseArgs(process.argv.slice(2))
if (!args._[0]) {
  console.error('usage: node qa-shots.mjs <shots.json> [--out <dir>] [--executable <path>]')
  process.exit(2)
}
const spec = readSpec(args._[0])
const outDir = path.resolve(args.out ?? spec.out ?? 'shots')
fs.mkdirSync(outDir, { recursive: true })

const browser = await launchBrowser({ headless: !args.headed, exe: args.executable })
const page = await browser.newPage({
  viewport: spec.viewport ?? { width: 1440, height: 900 },
  colorScheme: spec.colorScheme ?? 'light',
})
if (spec.dialogs === 'accept') page.on('dialog', (d) => d.accept())

const timeout = spec.timeout ?? 30000
await page.goto(spec.url, { waitUntil: 'domcontentloaded' })
if (spec.settle) await page.waitForTimeout(spec.settle)

async function runAction(a, timeout) {
  if (a.goto) await page.goto(new URL(a.goto, spec.url).href, { waitUntil: 'domcontentloaded' })
  if (a.wait) await page.waitForSelector(a.wait, { timeout })
  if (a.waitText) await page.waitForSelector(`text=${a.waitText}`, { timeout })
  if (a.click) await page.click(a.click, { timeout })
  if (a.fill) await page.fill(a.fill.sel, a.fill.value)
  if (a.press) await page.press(a.press.sel, a.press.key)
  if (a.sleep) await page.waitForTimeout(a.sleep)
}

for (const shot of spec.shots ?? []) {
  // Prefer an ordered steps array (same shape as the smoke spec). Flat keys
  // run in a fixed order: interactions first, then wait-for-result, then sleep.
  const actions = Array.isArray(shot.steps) ? shot.steps
    : [{ click: shot.click }, { fill: shot.fill }, { press: shot.press },
       { wait: shot.wait }, { waitText: shot.waitText }, { sleep: shot.sleep }]
  for (const a of actions) await runAction(a, timeout)

  const safe = shot.name.replace(/[^a-zA-Z0-9-_/]+/g, '_')
  const file = path.join(outDir, safe.endsWith('.png') ? safe : `${safe}.png`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  await page.screenshot({ path: file, fullPage: shot.fullPage ?? false })
  console.log(file)
}

await browser.close()
