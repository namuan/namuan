#!/usr/bin/env node
// ---------------------------------------------------------------------------
// gallery.mjs — regenerate the HTML contact sheet from an existing capture
// directory, without re-running the browser.
//
// Usage:
//   node scripts/gallery.mjs <outDir>     # default: ./shots
//
// Reads <outDir>/manifest.json (written by capture.mjs) and rewrites
// <outDir>/index.html.
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import { writeGallery } from './lib.mjs'

const dir = path.resolve(process.argv[2] ?? 'shots')
const mf = path.join(dir, 'manifest.json')
if (!fs.existsSync(mf)) {
  console.error(`no manifest.json in ${dir} — run capture.mjs first`)
  process.exit(2)
}
const manifest = JSON.parse(fs.readFileSync(mf, 'utf8'))
writeGallery(manifest, dir)
console.log(path.join(dir, 'index.html'))
