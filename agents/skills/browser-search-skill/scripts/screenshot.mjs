// Save a screenshot of a URL.
// Usage: node cloak-script.mjs --script scripts/screenshot.mjs [launch options]
// Pass URL as second positional arg or via --url flag.

export default async ({ page }) => {
  const url = process.argv.find(a => a.startsWith('http')) || 'https://example.com';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const filename = `cloak-shot-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: process.argv.includes('--fullpage') });

  const title = await page.title();
  return { title, url: page.url(), screenshot: filename };
};
