---
name: "browser-search"
description: "Browsing/scraping for sites with anti-bot protection (Cloudflare, Akamai, etc.) using CloakBrowser. Use whenever you need to access protected sites."
---

# Browser Search

### CloakBrowser — Protected sites

For sites with Cloudflare, Akamai, Kasada, DataDome, or similar anti-bot protection.
Uses `launch()` from the npm package `cloakbrowser`.

Script: `<skill_dir>/scripts/fetch.mjs`

```bash
# Simple (markdown output)
exec node <skill_dir>/scripts/fetch.mjs "https://example.com"

# Text only (no markdown header)
exec node <skill_dir>/scripts/fetch.mjs "https://example.com" --format text

# Raw HTML
exec node <skill_dir>/scripts/fetch.mjs "https://example.com" --format html

# With scroll for lazy loading (eBay, Amazon, reviews)
exec node <skill_dir>/scripts/fetch.mjs "https://ebay.com/..." --scroll

# Automatic challenge detection (Cloudflare, Akamai, DataDome...)
exec node <skill_dir>/scripts/fetch.mjs "https://protected-site.com"

# Proxy + geoip for sites that block datacenter IPs
exec node <skill_dir>/scripts/fetch.mjs "https://..." --proxy "socks5://user:pass@proxy:1080" --geoip

# Deterministic fingerprint
exec node <skill_dir>/scripts/fetch.mjs "https://..." --seed 12345 --platform windows

# Screenshot (⚠️ writes PNG file — breaks read-only rule)
exec node <skill_dir>/scripts/script.mjs --script "<skill_dir>/scripts/screenshot.mjs"
```

#### script.mjs — For complex interactions

When click, login, multi-step, or custom data extraction is needed:

```bash
exec node <skill_dir>/scripts/script.mjs \
  --script "<skill_dir>/scripts/<your-script>.mjs" \
  --proxy "socks5://..." --seed 12345
```

Full guide: `<skill_dir>/scripts/guide.md`