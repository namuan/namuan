#!/usr/bin/env node
// ---------------------------------------------------------------------------
// qa-audit.mjs — verify a design system is actually applied, not just written.
//
// Usage:
//   node scripts/qa-audit.mjs <audit.json> [--executable <path>] [--headed]
//
// Runs in both light and dark color schemes by default and checks:
//   - computed styles on specified selectors (colors, fonts, sizes)
//   - no horizontal overflow anywhere
//   - no template-literal artifacts ("source--{t.source}" style leaked braces)
//   - no console/page errors
//
// Spec shape:
//   {
//     "url": "http://localhost:5173",
//     "colorSchemes": ["light", "dark"],
//     "checks": [
//       { "label": "body bg is warm paper", "css": "body", "prop": "backgroundColor", "eq": "rgb(246, 241, 231)" },
//       { "label": "heading uses serif", "css": ".page__title", "prop": "fontFamily", "contains": "Fraunces" },
//       { "label": "no pure white body", "css": "body", "prop": "backgroundColor", "ne": "rgb(255, 255, 255)" }
//     ],
//     "noOverflow": true,
//     "noArtifacts": true,
//     "noErrors": true
//   }
//
// Matchers per check: eq | ne | contains | match (regex, matched against value).
// ---------------------------------------------------------------------------

import { launchBrowser, captureErrors, makeReporter, measureOverflow, templateArtifacts, readSpec, parseArgs } from './qa-lib.mjs'

const args = parseArgs(process.argv.slice(2))
if (!args._[0]) {
  console.error('usage: node qa-audit.mjs <audit.json> [--executable <path>] [--headed]')
  process.exit(2)
}
const spec = readSpec(args._[0])
const browser = await launchBrowser({ headless: !args.headed, exe: args.executable })
const reporter = makeReporter()

async function runChecks(colorScheme) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme })
  const errors = captureErrors(page)
  await page.goto(spec.url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(spec.waitFor ?? 'body', { timeout: spec.timeout ?? 30000 })
  if (spec.settle) await page.waitForTimeout(spec.settle)

  const prefix = colorScheme === 'light' ? '[light]' : '[dark] '
  const values = {}
  for (const check of spec.checks ?? []) {
    const value = await page.evaluate(([css, prop]) => {
      const el = document.querySelector(css)
      if (!el) return { missing: true }
      const cs = getComputedStyle(el)
      // CSSOM exposes camelCase accessors; getPropertyValue needs kebab-case.
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const v = cs[camel] ?? cs.getPropertyValue(prop) ?? ''
      return { value: v }
    }, [check.css, check.prop])

    let cond
    if (value.missing) {
      cond = false
    } else if (value.value === '') {
      cond = false // getComputedStyle never returns '' for a supported property
    } else if (check.eq !== undefined) cond = value.value === check.eq
    else if (check.ne !== undefined) cond = value.value !== check.ne
    else if (check.contains !== undefined) cond = value.value.includes(check.contains)
    else if (check.match !== undefined) cond = new RegExp(check.match).test(value.value)
    else cond = false

    const detail = value.missing
      ? '(no element matches css)'
      : value.value === ''
        ? `property "${check.prop}" not found on ${check.css}`
        : `got ${JSON.stringify(value.value)}`
    reporter.ok(cond, `${prefix}${check.label}`, detail)
  }

  if (spec.noOverflow !== false) {
    const m = await measureOverflow(page)
    reporter.ok(!m.docOverflow && m.overflowing.length === 0, `${prefix}no horizontal overflow`, JSON.stringify(m))
  }
  if (spec.noArtifacts !== false) {
    const arts = await templateArtifacts(page)
    reporter.ok(arts.length === 0, `${prefix}no template-literal artifacts`, arts.join(' | '))
  }
  if (spec.noErrors !== false) {
    const real = errors.filter((e) => !/favicon\.ico/.test(e))
    reporter.ok(real.length === 0, `${prefix}no console/page errors`, real.slice(0, 3).join(' | '))
  }
  await page.close()
}

for (const scheme of spec.colorSchemes ?? ['light', 'dark']) {
  await runChecks(scheme)
}

if (spec.printValues) {
  // Values are accumulated per-scheme; print them
}
reporter.summary()
await browser.close()
