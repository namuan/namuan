#!/usr/bin/env node
// ---------------------------------------------------------------------------
// capture.mjs — spec-driven screenshots of any web app.
//
// Usage:
//   node scripts/capture.mjs <shots.json> [--out <dir>] [--headed] [--executable <path>]
//
// Spec shape:
//   {
//     "url": "http://localhost:5173",
//     "out": "shots",                        // default: ./shots, override with --out
//     "viewport": { "width": 1440, "height": 900 },
//     "viewports": [390, 768, 1440],         // optional: capture every shot at these widths
//     "device": "iPhone 13",                 // optional: Playwright device descriptor
//     "deviceScaleFactor": 2,                // optional: retina (default 1)
//     "colorScheme": "light",                // 'light' | 'dark' | 'no-preference'
//     "settle": 400,                         // ms to wait after the page settles
//     "fullPage": false,                     // default for all shots
//     "timeout": 30000,
//     "shots": [
//       { "name": "01-home", "wait": ".app", "fullPage": true },
//       { "name": "02-detail", "steps": [{ "click": ".row" }, { "wait": ".detail" }] },
//       { "name": "03-mobile", "viewports": [390, 768] },
//       { "name": "04-logo", "element": ".logo", "padding": 16, "background": "#fff" }
//     ]
//   }
//
// Output: one PNG per capture (multi-viewport shots get a --WxH suffix), plus
// manifest.json and an HTML contact sheet (index.html) for visual review.
// See references/shots-spec.md for the full DSL.
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import { loadPlaywright, launchBrowser, newPage, readSpec, parseArgs, benignError, writeGallery } from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
if (!args._[0]) {
  console.error('usage: node capture.mjs <shots.json> [--out <dir>] [--headed] [--executable <path>]')
  process.exit(2)
}
const spec = readSpec(args._[0])
if (!spec.url) { console.error(`spec ${args._[0]} is missing "url"`); process.exit(2) }
const shots = spec.shots ?? []
if (!shots.length) { console.error(`spec ${args._[0]} has no "shots"`); process.exit(2) }

const outDir = path.resolve(args.out ?? spec.out ?? 'shots')
fs.mkdirSync(outDir, { recursive: true })

const pw = await loadPlaywright()
const browser = await launchBrowser({ headless: !args.headed, exe: args.executable })
const timeout = spec.timeout ?? 30000
const defaultFullPage = spec.fullPage ?? false
const defaultBackground = spec.background ?? null
const consoleErrors = []

// ---------------------------------------------------------------------------
// viewport resolution
// ---------------------------------------------------------------------------

function parseSize(v) {
  const m = /^(\d+)x(\d+)$/.exec(String(v))
  if (m) return { width: +m[1], height: +m[2] }
  throw new Error(`bad viewport "${v}" — use a number (width, height 900), {width,height}, or "WxH"`)
}

/** Resolve the capture set for a shot: [{ key, viewport, descriptor }]. */
function resolveViewports(shot, spec) {
  const deviceName = shot.device ?? spec.device
  if (deviceName) {
    if (shot.viewports) throw new Error(`shot "${shot.name}": "device" and "viewports" are mutually exclusive`)
    const d = (pw.devices ?? {})[deviceName]
    if (!d) throw new Error(`unknown device "${deviceName}"`)
    const override = shot.viewport ?? spec.viewport
    const viewport = override ? { ...d.viewport, ...override } : d.viewport
    return [{ key: 'device', viewport, descriptor: d }]
  }
  const raw = shot.viewports ?? (shot.viewport ? [shot.viewport] : spec.viewports ?? (spec.viewport ? [spec.viewport] : [{ width: 1440, height: 900 }]))
  const list = raw.map((v) => typeof v === 'number' ? { width: v, height: 900 } : typeof v === 'string' ? parseSize(v) : v)
  return list.map((v) => ({ key: `${v.width}x${v.height}`, viewport: v, descriptor: null }))
}

// ---------------------------------------------------------------------------
// steps DSL (same action set as webapp-qa's qa-shots)
// ---------------------------------------------------------------------------

const KNOWN_STEP_KEYS = ['goto', 'wait', 'waitText', 'click', 'fill', 'press', 'sleep']

async function runAction(page, a, spec, timeout) {
  const keys = Object.keys(a)
  if (!keys.length || !keys.some((k) => KNOWN_STEP_KEYS.includes(k))) {
    throw new Error(`unknown step ${JSON.stringify(a)} — expected one of ${KNOWN_STEP_KEYS.join(', ')}`)
  }
  if (a.goto) await page.goto(new URL(a.goto, spec.url).href, { waitUntil: 'domcontentloaded' })
  if (a.wait) await page.waitForSelector(a.wait, { timeout })
  if (a.waitText) await page.waitForSelector(`text=${a.waitText}`, { timeout })
  if (a.click) await page.click(a.click, { timeout })
  if (a.fill) await page.fill(a.fill.sel, a.fill.value)
  if (a.press) await page.press(a.press.sel, a.press.key)
  if (a.sleep) await page.waitForTimeout(a.sleep)
}

/** Flat per-shot keys run in a fixed order: interactions, then waits, then sleep. */
function flatSteps(shot) {
  return [
    { goto: shot.goto }, { click: shot.click }, { fill: shot.fill }, { press: shot.press },
    { wait: shot.wait }, { waitText: shot.waitText }, { sleep: shot.delay ?? shot.sleep },
  ].filter((s) => Object.values(s)[0] !== undefined)
}

async function elementClip(page, sel, padding) {
  const el = await page.waitForSelector(sel, { timeout })
  const box = await el.boundingBox()
  if (!box) throw new Error(`element "${sel}" has no box (hidden?)`)
  return {
    x: Math.max(0, box.x - padding),
    y: Math.max(0, box.y - padding),
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  }
}

async function screenshot(page, file, { fullPage, clip, mask, transparent }) {
  const base = { path: file, mask, omitBackground: transparent }
  if (clip) base.clip = clip
  else base.fullPage = fullPage
  try {
    await page.screenshot({ ...base, animations: 'disabled', caret: 'hide' })
  } catch {
    await page.screenshot(base) // older playwright-core lacks animations/caret
  }
}

// ---------------------------------------------------------------------------
// main loop
// ---------------------------------------------------------------------------

const manifest = { url: spec.url, out: outDir, generatedAt: new Date().toISOString(), colorScheme: spec.colorScheme ?? 'light' }
const manifestShots = []
let failed = 0

for (const shot of shots) {
  if (!shot.name) { console.error('a shot is missing "name"'); process.exit(2) }
  const viewports = resolveViewports(shot, spec)
  const multi = viewports.length > 1
  const baseName = shot.name.replace(/[^a-zA-Z0-9-_/]+/g, '_')
  const captures = []

  for (const { key, viewport, descriptor } of viewports) {
    const file = path.join(outDir, multi ? `${baseName}--${key}.png` : `${baseName}.png`)
    const pageErrors = []
    const colorScheme = shot.colorScheme ?? spec.colorScheme ?? 'light'
    const fullPage = shot.fullPage ?? defaultFullPage
    const label = multi ? `${shot.name} [${key}]` : shot.name

    try {
      const page = await newPage(browser, {
        descriptor,
        viewport,
        colorScheme,
        deviceScaleFactor: shot.deviceScaleFactor ?? spec.deviceScaleFactor ?? null,
        reducedMotion: spec.reducedMotion ?? true,
      })
      page.on('pageerror', (e) => pageErrors.push('PAGEERROR: ' + e.message))
      page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()) })
      if (spec.dialogs === 'accept') page.on('dialog', (d) => d.accept())

      await page.goto(spec.url, { waitUntil: 'domcontentloaded' })
      const steps = Array.isArray(shot.steps) ? shot.steps : flatSteps(shot)
      for (const a of steps) await runAction(page, a, spec, timeout)
      await page.evaluate(() => document.fonts.ready) // no FOUT in captures
      const settleMs = shot.delay ?? shot.sleep ?? spec.settle
      if (settleMs) await page.waitForTimeout(settleMs)

      const background = shot.background ?? defaultBackground
      if (background) {
        await page.evaluate((c) => {
          document.documentElement.style.background = c
          document.body.style.background = c
        }, background)
      }

      const clip = shot.element ? await elementClip(page, shot.element, shot.padding ?? 0) : null
      if (clip && fullPage) console.warn(`warn: ${label} — "element" and "fullPage" are mutually exclusive; clipping the element`)
      await screenshot(page, file, { fullPage, clip, mask: shot.mask, transparent: shot.transparent })
      console.log(`${multi ? `[${key}] ` : ''}${file}`)

      for (const e of pageErrors) if (!benignError(e)) consoleErrors.push(`${label}: ${e}`)
      captures.push({ file, viewport: { width: viewport.width, height: viewport.height }, colorScheme, fullPage: !!fullPage, element: shot.element ?? null })
      await page.close()
    } catch (err) {
      failed += 1
      console.error(`FAIL  ${label}\n      ${err.message.split('\n')[0]}`)
    }
  }
  manifestShots.push({ name: shot.name, captures })
}

manifest.shots = manifestShots
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
writeGallery(manifest, outDir)

if (consoleErrors.length) {
  console.error(`\n${consoleErrors.length} console error(s) observed (not failures, but worth a look):`)
  for (const e of [...new Set(consoleErrors)].slice(0, 10)) console.error(`  · ${e}`)
}

await browser.close()
console.log(`\n${manifestShots.reduce((n, s) => n + s.captures.length, 0)} capture(s) → ${outDir}  (contact sheet: ${path.join(outDir, 'index.html')})`)
if (failed > 0) process.exitCode = 1
