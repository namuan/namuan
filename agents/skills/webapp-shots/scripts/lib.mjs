// ---------------------------------------------------------------------------
// lib.mjs — shared helpers for the webapp-shots skill scripts.
//
// Same principles as webapp-qa's qa-lib.mjs: playwright-core resolution with
// no global install, chromium auto-discovery across OS cache locations, and a
// spec reader. Adds device-aware page creation and the HTML gallery writer.
//
// Use from your own per-project scripts:
//   import { loadPlaywright, launchBrowser, newPage, writeGallery, ... } from './lib.mjs'
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export { __dirname as scriptDir }

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
    path.join(os.homedir(), '.agents', 'skills', 'webapp-qa', 'scripts', 'node_modules', 'playwright-core'),
    path.join(os.homedir(), '.agents', 'skills', 'browser-search-skill', 'node_modules', 'playwright-core'),
    // master copy at ~/workspace/namuan/agents/skills (same sibling layout)
    path.join(os.homedir(), 'workspace', 'namuan', 'agents', 'skills', 'webapp-qa', 'scripts', 'node_modules', 'playwright-core'),
    path.join(os.homedir(), 'workspace', 'namuan', 'agents', 'skills', 'browser-search-skill', 'node_modules', 'playwright-core'),
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

// Path layouts seen in the wild: modern builds ship "Google Chrome for Testing",
// older ones plain "Chromium.app". Headless-shell builds are lighter and are the
// right tool for headless capture — and some full builds crash at launch on some
// machines, so for headless runs the shell is preferred.
const CHROMIUM_PATHS = {
  full: [
    'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    'chrome-linux/chrome',
    'chrome-win/chrome.exe',
  ],
  shell: [
    'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    'chrome-headless-shell-linux/chrome-headless-shell',
    'chrome-headless-shell-win32/chrome-headless-shell.exe',
  ],
}

function cacheDirs() {
  return [
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
  ]
}

/** List cached chromium builds (full + headless-shell), newest first. */
function scanCache() {
  const builds = []
  for (const dir of cacheDirs()) {
    if (!fs.existsSync(dir)) continue
    for (const ver of fs.readdirSync(dir)) {
      const m = /^chromium(?:_headless_shell)?-(\d+)$/.exec(ver)
      if (!m) continue
      builds.push({ ver, n: +m[1], dir, shell: ver.includes('headless') })
    }
  }
  builds.sort((a, b) => b.n - a.n)
  return builds
}

/**
 * Find a chromium executable in the Playwright browser cache.
 * Headless runs prefer the headless shell; `headless: false` prefers a full
 * browser (for --headed) and only falls back to the shell if nothing else
 * exists.
 */
export function findChromium({ headless = true } = {}) {
  if (process.env.PLAYWRIGHT_CHROMIUM && fs.existsSync(process.env.PLAYWRIGHT_CHROMIUM)) {
    return process.env.PLAYWRIGHT_CHROMIUM
  }
  const builds = scanCache()
  const ordered = headless
    ? [...builds.filter((b) => b.shell), ...builds.filter((b) => !b.shell)]
    : builds
  for (const b of ordered) {
    for (const rel of CHROMIUM_PATHS[b.shell ? 'shell' : 'full']) {
      const p = path.join(b.dir, b.ver, rel)
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
  const executable = exe || findChromium({ headless })
  const opts = { headless }
  if (executable) {
    opts.executablePath = executable
    if (!headless && executable.includes('headless-shell')) {
      console.warn('warn: only a headless-shell build was found — --headed will still run headless')
    }
  }
  return chromium.launch(opts)
}

/**
 * Open a page. `descriptor` is a Playwright device descriptor (from
 * `pw.devices['iPhone 13']`) — it supplies the real viewport, DPR, touch and
 * UA. A plain `viewport` overrides the size while keeping the descriptor's
 * other traits. `deviceScaleFactor` forces a retina capture.
 */
export async function newPage(browser, { descriptor = null, viewport = null, deviceScaleFactor = null, colorScheme = 'light', reducedMotion = true } = {}) {
  const base = descriptor
    ? { ...descriptor }
    : { viewport: { width: 1440, height: 900 } }
  if (viewport) base.viewport = { ...base.viewport, ...viewport }
  if (deviceScaleFactor != null) base.viewport = { ...base.viewport, deviceScaleFactor }
  base.colorScheme = colorScheme
  if (reducedMotion) base.reducedMotion = 'reduce'
  const ctx = await browser.newContext(base)
  return ctx.newPage()
}

// ---------------------------------------------------------------------------
// console noise filter
// ---------------------------------------------------------------------------

/** Filter out noise that isn't a real failure (favicon 404s, etc.). */
export function benignError(msg) {
  return /favicon\.ico|Failed to load resource: the server responded with a status of 404/.test(msg)
}

// ---------------------------------------------------------------------------
// spec / args helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// contact sheet
// ---------------------------------------------------------------------------

/**
 * Write index.html (dark contact sheet with search filter) + manifest.json
 * into outDir. manifest should look like the one capture.mjs produces:
 * { url, generatedAt, colorScheme, shots: [{ name, captures: [{ file,
 * viewport, colorScheme, fullPage, element }] }] }
 */
export function writeGallery(manifest, outDir) {
  const cards = []
  for (const shot of manifest.shots ?? []) {
    for (const c of shot.captures ?? []) {
      const rel = path.relative(outDir, c.file)
      const v = c.viewport ?? {}
      const badges = [
        v.width ? `${v.width}×${v.height ?? 900}` : null,
        c.colorScheme ?? manifest.colorScheme ?? null,
        c.fullPage ? 'full-page' : null,
        c.element ? 'element' : null,
      ].filter(Boolean)
      cards.push({
        rel,
        name: shot.name,
        badges,
        meta: `${rel}${badges.length ? '  ·  ' + badges.join(' · ') : ''}`,
      })
    }
  }
  const cardsHtml = cards.map((c) => `
      <a class="card" href="${esc(c.rel)}" target="_blank" title="Open ${esc(c.rel)}">
        <div class="thumb"><img loading="lazy" src="${esc(c.rel)}" alt="${esc(c.name)}"></div>
        <div class="cap"><div class="name">${esc(c.name)}</div><div class="meta">${esc(c.meta)}</div></div>
      </a>`).join('')

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact sheet — ${esc(manifest.url ?? 'shots')}</title>
<style>
  :root { color-scheme: dark }
  * { box-sizing: border-box }
  body { margin: 0; background: #0b0e14; color: #d7dae0; font: 14px/1.45 -apple-system, "SF Pro Text", "Segoe UI", sans-serif }
  header { position: sticky; top: 0; z-index: 2; padding: 14px 22px; background: rgba(11,14,20,.9); backdrop-filter: blur(10px); border-bottom: 1px solid #1c2230; display: flex; gap: 16px; align-items: baseline; flex-wrap: wrap }
  h1 { font-size: 15px; margin: 0; font-weight: 600; letter-spacing: .2px }
  h1 code { color: #7ee0a3; font-weight: 500 }
  .meta { color: #6b7385; font-size: 12px }
  input { margin-left: auto; background: #141a26; border: 1px solid #232b3d; color: #d7dae0; border-radius: 8px; padding: 6px 12px; font: inherit; width: 220px; outline: none }
  input:focus { border-color: #3b4a6b }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 22px }
  .card { display: block; background: #11161f; border: 1px solid #1c2230; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; transition: border-color .15s, transform .15s }
  .card:hover { border-color: #33405c; transform: translateY(-2px) }
  .thumb { height: 190px; background: #0e121a; border-bottom: 1px solid #1c2230; overflow: hidden }
  .thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block }
  .cap { padding: 10px 12px }
  .name { font-weight: 600; font-size: 13px; word-break: break-all }
  .meta { color: #6b7385; font-size: 11px; margin-top: 3px; word-break: break-all }
  .empty { padding: 60px 22px; text-align: center; color: #6b7385; display: none }
  .hidden { display: none !important }
</style>
</head>
<body>
<header>
  <h1>Contact sheet — <code>${esc(manifest.url ?? '')}</code></h1>
  <span class="meta">${cards.length} captures · ${new Date(manifest.generatedAt ?? Date.now()).toLocaleString()}</span>
  <input id="q" type="search" placeholder="filter by name…" title="press / to focus">
</header>
<div class="grid" id="grid">${cardsHtml}</div>
<div class="empty" id="empty">No captures match.</div>
<script>
  const q = document.getElementById('q')
  const cards = [...document.querySelectorAll('.card')]
  const empty = document.getElementById('empty')
  q.addEventListener('input', () => {
    const t = q.value.trim().toLowerCase()
    let n = 0
    for (const c of cards) { const hit = !t || c.dataset.name.includes(t); c.classList.toggle('hidden', !hit); if (hit) n++ }
    empty.style.display = n ? 'none' : 'block'
  })
  for (const c of cards) c.dataset.name = (c.querySelector('.name').textContent + ' ' + c.querySelector('.meta').textContent).toLowerCase()
  document.addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus() } })
</script>
</body>
</html>`
  fs.writeFileSync(path.join(outDir, 'index.html'), html)
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
