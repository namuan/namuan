#!/usr/bin/env node
// Execute a custom Playwright script through CloakBrowser.
// Script receives { page, browser, context }, uses Playwright API directly.
// Follows the official CloakBrowser pattern: launch() + Playwright API.

import { launch, launchPersistentContext } from 'cloakbrowser';
import { resolve } from 'path';

function help() {
  process.stderr.write(`
Usage: node cloak-script.mjs --script <file.mjs> [launch options]

Required:
  --script <file>       JS module to execute (default export receives { page, browser, context })

Launch options (same as cloak-fetch):
  --proxy <url>         HTTP or SOCKS5 proxy
  --seed <num>          Fixed fingerprint seed
  --platform <name>     windows, macos, linux
  --humanize            Human-like behavior (default: on)
  --no-humanize         Disable humanization
  --preset <name>       default, careful
  --geoip               Auto-detect timezone/locale
  --tz <timezone>       Force timezone
  --locale <locale>     Force locale
  --persistent <dir>    Persistent profile
  --timeout <ms>        Browser launch timeout (default: 30000)

Other:
  --version, --help

Script example:
  export default async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    return { text };
  };
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { help(); process.exit(0); }
  if (args.includes('--version')) { process.stderr.write(JSON.stringify({ tool: 'cloak-script', version: '1.0.0' }) + '\n'); process.exit(0); }

  const idx = f => { const i = args.indexOf(f); return i >= 0 && i + 1 < args.length ? i : -1; };
  const has = f => args.includes(f);

  const si = idx('--script');
  if (si < 0) { process.stderr.write(JSON.stringify({ error: 'Please specify --script <file>' }) + '\n'); help(); process.exit(1); }

  const opts = {
    script: resolve(args[si + 1]),
    humanize: !has('--no-humanize'),
    preset: 'default',
    proxy: null,
    geoip: has('--geoip'),
    seed: null,
    platform: null,
    brand: null,
    timezone: null,
    locale: null,
    persistent: null,
    timeout: 30000,
  };

  const strOpts = {
    '--proxy': 'proxy', '--seed': 'seed', '--platform': 'platform',
    '--brand': 'brand', '--tz': 'timezone', '--locale': 'locale',
    '--preset': 'preset', '--persistent': 'persistent',
  };
  for (const [flag, key] of Object.entries(strOpts)) {
    const i = idx(flag);
    if (i >= 0) opts[key] = args[i + 1];
  }

  const ti = idx('--timeout');
  if (ti >= 0) opts.timeout = parseInt(args[ti + 1], 10) || 30000;

  return opts;
}

async function main() {
  const opts = parseArgs();

  const launchOpts = {
    headless: true,
    ...(opts.humanize && { humanize: true, ...(opts.preset !== 'default' && { humanPreset: opts.preset }) }),
    ...(opts.proxy && { proxy: opts.proxy }),
    ...(opts.geoip && { geoip: true }),
    ...(opts.timezone && { timezone: opts.timezone }),
    ...(opts.locale && { locale: opts.locale }),
  };

  const extraArgs = [];
  if (opts.seed) extraArgs.push(`--fingerprint=${opts.seed}`);
  if (opts.platform) extraArgs.push(`--fingerprint-platform=${opts.platform}`);
  if (opts.brand) extraArgs.push(`--fingerprint-brand=${opts.brand}`);
  if (extraArgs.length > 0) launchOpts.args = extraArgs;

  let browser = null;
  let context = null;
  let page = null;

  try {
    const scriptModule = await import(opts.script);
    const scriptFn = scriptModule.default;
    if (typeof scriptFn !== 'function') throw new Error(`Script ${opts.script} must export a default function`);

    if (opts.persistent) {
      context = await launchPersistentContext({ userDataDir: opts.persistent, ...launchOpts });
      const pages = context.pages();
      page = pages[0] || await context.newPage();
    } else {
      browser = await launch(launchOpts);
      context = await browser.newContext();
      page = await context.newPage();
    }

    const result = await scriptFn({ page, browser, context });

    process.stdout.write(JSON.stringify({ ok: true, data: result ?? null }) + '\n');
  } catch (err) {
    process.stderr.write(JSON.stringify({ error: err.message, stack: err.stack }) + '\n');
    process.exit(1);
  } finally {
    if (page && !opts.persistent) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

main();
