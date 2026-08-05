// ---------------------------------------------------------------------------
// qa-lib.mjs — shared helpers for the webapp-qa skill scripts.
//
// Everything these scripts need to launch a real browser and measure a web
// app: playwright-core resolution (no global install required), chromium
// auto-discovery across OS cache locations, a PASS/FAIL reporter, console +
// pageerror capture, and overflow / template-artifact detectors.
//
// Use from your own per-project scripts:
//   import { launchBrowser, newPage, captureErrors, makeReporter, ... } from './qa-lib.mjs'
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// playwright-core resolution
// ---------------------------------------------------------------------------

/**
 * Resolve and load playwright-core from, in order:
 *   1. $PLAYWRIGHT_CORE_PATH
 *   2. <cwd>/node_modules/playwright-core        (the project under test)
 *   3. <skill>/scripts/node_modules/playwright-core  (one-time npm i)
 *   4. sibling skill installs known to exist on this machine
 *   5. bare import (resolves via ancestor node_modules)
 * No global install required.
 */
export async function loadPlaywright() {
  const dirs = [
    process.env.PLAYWRIGHT_CORE_PATH,
    path.join(process.cwd(), 'node_modules', 'playwright-core'),
    path.join(__dirname, 'node_modules', 'playwright-core'),
    path.join(__dirname, '..', 'node_modules', 'playwright-core'),
    path.join(os.homedir(), '.agents', 'skills', 'browser-search-skill', 'node_modules', 'playwright-core'),
  ].filter(Boolean)

  const tried = []
  for (const dir of dirs) {
    const entry = path.join(dir, 'index.mjs')
    if (!fs.existsSync(entry)) { tried.push(`missing ${entry}`); continue }
    try {
      return await import(pathToFileURL(entry).href)
    } catch (err) {
      tried.push(`${entry} (${err.message.split('\n')[0]})`)
    }
  }
  try {
    return await import('playwright-core')
  } catch (err) {
    tried.push(`bare import (${err.message.split('\n')[0]})`)
  }
  throw new Error('Could not resolve playwright-core. Try: cd scripts && npm i playwright-core\nTried:\n  ' + tried.join('\n  '))
}

// ---------------------------------------------------------------------------
// chromium executable discovery
// ---------------------------------------------------------------------------

const CHROMIUM_PATHS = [
  'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  'chrome-linux/chrome',
  'chrome-win/chrome.exe',
  'chrome-headless-shell-mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  'chrome-headless-shell-linux/chrome-headless-shell',
]

function cacheDirs() {
  return [
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
  ]
}

/** Find a chromium executable in the Playwright browser cache, newest first. */
export function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM && fs.existsSync(process.env.PLAYWRIGHT_CHROMIUM)) {
    return process.env.PLAYWRIGHT_CHROMIUM
  }
  const versions = []
  for (const dir of cacheDirs()) {
    if (!fs.existsSync(dir)) continue
    for (const ver of fs.readdirSync(dir)) {
      if (!ver.startsWith('chromium')) continue
      const n = parseInt(ver.split('-')[1] ?? '0', 10)
      versions.push({ ver, n, dir })
    }
  }
  versions.sort((a, b) => b.n - a.n) // newest first
  for (const { ver, dir } of versions) {
    for (const rel of CHROMIUM_PATHS) {
      const p = path.join(dir, ver, rel)
      if (fs.existsSync(p)) return p
    }
  }
  return null
}

/**
 * Launch chromium. Falls back to playwright's default registry if no cached
 * executable is found. Pass `--executable` via env or `exe` option to pin one.
 */
export async function launchBrowser({ headless = true, exe = null } = {}) {
  const { chromium } = await loadPlaywright()
  const executable = exe || findChromium()
  const opts = { headless }
  if (executable) opts.executablePath = executable
  return chromium.launch(opts)
}

/** Open a page with a given viewport and forced color scheme. */
export async function newPage(browser, { width = 1440, height = 900, colorScheme = 'light' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme })
  return ctx.newPage()
}

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

/** Filter out noise that isn't a real failure (favicon 404s, etc.). */
export function benignError(msg) {
  return /favicon\.ico|Failed to load resource: the server responded with a status of 404/.test(msg)
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

/** Read a JSON spec file with a helpful error. */
export function readSpec(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error(`Could not read spec ${file}: ${err.message}`)
  }
}

/** Parse --key value style CLI args into an object. */
export function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) { out[key] = next; i += 1 }
      else out[key] = true
    } else out._.push(a)
  }
  return out
}

export { __dirname as scriptDir }
