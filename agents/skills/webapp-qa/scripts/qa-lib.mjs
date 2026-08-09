// ---------------------------------------------------------------------------
// qa-lib.mjs — helpers for the webapp-qa skill scripts.
//
// Browser plumbing (playwright-core resolution, chromium discovery, launching,
// spec/arg parsing, console-noise filter) is NOT duplicated here — it is
// re-exported from the sibling webapp-shots skill's lib.mjs, which is the
// single source of truth for browser resolution. This file only keeps the
// QA-specific helpers: error capture, the PASS/FAIL reporter, and the
// overflow / template-artifact detectors.
//
// Use from your own per-project scripts:
//   import { launchBrowser, captureErrors, makeReporter, measureOverflow, ... } from './qa-lib.mjs'
// ---------------------------------------------------------------------------

// Browser plumbing comes from webapp-shots (single copy of the resolution
// chain + chromium discovery). Re-export so webapp-qa scripts keep one import.
export {
  loadPlaywright,
  findChromium,
  launchBrowser,
  newPage,
  readSpec,
  parseArgs,
  benignError,
  scriptDir,
} from '../../webapp-shots/scripts/lib.mjs'

// ---------------------------------------------------------------------------
// error capture
// ---------------------------------------------------------------------------

/** Collect console errors + uncaught page errors. Returns the array. */
export function captureErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

// ---------------------------------------------------------------------------
// reporter
// ---------------------------------------------------------------------------

/** Tiny PASS/FAIL reporter that mirrors the session's check style. */
export function makeReporter() {
  let passed = 0
  let failed = 0
  return {
    ok(cond, label, extra = '') {
      if (cond) { passed += 1; console.log(`PASS  ${label}`) }
      else {
        failed += 1
        console.log(`FAIL  ${label}${extra ? `\n      ${extra}` : ''}`)
      }
    },
    summary() {
      console.log(`\n${passed} passed · ${failed} failed`)
      if (failed > 0) process.exitCode = 1
    },
  }
}

// ---------------------------------------------------------------------------
// measurement helpers
// ---------------------------------------------------------------------------

/** Detect horizontal overflow — doc-level and per-element. */
export async function measureOverflow(page) {
  return page.evaluate(() => {
    // True only if the element escapes into viewport space it can't be scrolled to.
    const isContained = (el) => {
      let p = el.parentElement
      while (p && p !== document.body && p !== document.documentElement) {
        const ox = getComputedStyle(p).overflowX
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true
        p = p.parentElement
      }
      return false
    }
    const over = []
    document.querySelectorAll('body *').forEach((el) => {
      if (isContained(el)) return // inside a scrollable container — user can reach it
      const r = el.getBoundingClientRect()
      if (r.right > window.innerWidth + 2 || r.left < -2) {
        over.push(String(el.className || el.tagName).slice(0, 64))
      }
    })
    return {
      docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      overflowing: [...new Set(over)].slice(0, 10),
    }
  })
}

/**
 * Detect template-literal artifacts — text like `source--{t.source}` where a
 * `${...}` interpolation was forgotten and the braces leaked into the UI.
 */
export async function templateArtifacts(page) {
  return page.evaluate(() => {
    const out = []
    for (const line of document.body.innerText.split('\n')) {
      if (/[A-Za-z0-9_'"-]+\{[^{}\n]*\}/.test(line)) out.push(line.trim())
      if (out.length >= 5) break
    }
    return out
  })
}
