---
name: playwright-browser
description: Web browser automation, content extraction, and testing using playwright-cli. Use when Agent needs to interact with websites, including (1) taking screenshots of webpages, (2) extracting content, links, or data from websites, (3) automating browser interactions like clicking, filling forms, or navigation, (4) testing web applications, (5) monitoring or scraping web content, or (6) any task involving "navigate to", "extract from website", "use browser", or similar web-related operations.
---

# Playwright-CLI Browser Automation

Session-based browser automation using `playwright-cli`, a command-line tool for controlling web browsers, extracting content, testing workflows, and debugging web applications.

## Installation

```bash
# Install playwright-cli (via npm)
npm install -g @playwright/cli@latest

# Initialize workspace and install browsers
playwright-cli install
playwright-cli install-browser
```

Verify installation:
```bash
playwright-cli --version
```

## Core Concepts

### Session-Based Workflow

`playwright-cli` maintains persistent browser sessions. You can:
- Open/close browser sessions
- Run commands in specific sessions with `-s=session-name`
- Manage multiple sessions simultaneously (e.g., different users)

### Element References via Snapshots

Key workflow pattern:
1. **Snapshot** the page to get element references (`ref-1`, `ref-2`, etc.)
2. **Interact** with elements using their refs
3. **Capture** results with screenshot or eval

```bash
# Get snapshot showing all interactive elements
playwright-cli snapshot --filename page.md

# Use refs from snapshot to interact
playwright-cli fill ref-3 "username"
playwright-cli click ref-5
```

## Quick Start

### Basic Navigation and Screenshot

```bash
# Open browser and navigate
playwright-cli open https://example.com

# Take screenshot
playwright-cli screenshot --filename page.png

# Full-page screenshot (scrollable content)
playwright-cli screenshot --full-page --filename full.png

# Close browser
playwright-cli close
```

### Form Filling

```bash
playwright-cli goto https://example.com/contact

# Get element references
playwright-cli snapshot --filename form.md

# Fill form (using refs from snapshot)
playwright-cli fill ref-name "John Doe"
playwright-cli fill ref-email "john@example.com"
playwright-cli check ref-newsletter
playwright-cli click ref-submit

# Capture result
playwright-cli screenshot --filename submitted.png
```

### Data Extraction

```bash
playwright-cli goto https://news.ycombinator.com

# Extract data with JavaScript
playwright-cli eval "Array.from(document.querySelectorAll('.titleline > a')).map(a => a.textContent).slice(0, 10)"

# Or get snapshot for manual review
playwright-cli snapshot --filename hn.md
```

## Common Commands

### Navigation
```bash
playwright-cli goto <url>              # Navigate to URL
playwright-cli go-back                 # Previous page
playwright-cli go-forward              # Next page
playwright-cli reload                  # Refresh page
```

### Interaction
```bash
playwright-cli snapshot                # Get element refs
playwright-cli click <ref>             # Click element
playwright-cli fill <ref> "text"       # Fill form field
playwright-cli type "text"             # Type into focused element
playwright-cli check <ref>             # Check checkbox
playwright-cli select <ref> "value"    # Select dropdown option
playwright-cli hover <ref>             # Hover over element
playwright-cli drag <startRef> <endRef> # Drag and drop
```

### Keyboard & Mouse
```bash
playwright-cli press Enter             # Press key
playwright-cli keydown Control         # Key down
playwright-cli keyup Control           # Key up
playwright-cli mousemove 100 200       # Move mouse
playwright-cli mousewheel 0 100        # Scroll
```

### Capture
```bash
playwright-cli screenshot [ref]        # Screenshot page or element
playwright-cli pdf                     # Save as PDF
playwright-cli eval "expression"       # Execute JavaScript
```

### Tabs
```bash
playwright-cli tab-list                # List all tabs
playwright-cli tab-new [url]           # Open new tab
playwright-cli tab-select <index>      # Switch to tab
playwright-cli tab-close <index>       # Close tab
```

## Common Workflows

### Login and Save Authentication

```bash
# Navigate and login
playwright-cli goto https://app.example.com/login
playwright-cli snapshot --filename login.md
playwright-cli fill ref-email "user@example.com"
playwright-cli fill ref-password "password"
playwright-cli click ref-submit

# Wait for redirect
playwright-cli eval "new Promise(r => setTimeout(r, 2000))"

# Save auth state for reuse
playwright-cli state-save auth.json

playwright-cli close
```

### Reuse Saved Session

```bash
playwright-cli open
playwright-cli state-load auth.json  # Load auth state
playwright-cli goto https://app.example.com/dashboard  # Already logged in
```

### Test with Network Mocking

```bash
# Mock API response
playwright-cli route "**/api/users" \
  --status 200 \
  --body '[{"id": 1, "name": "Test User"}]' \
  --content-type "application/json"

# Navigate to page that calls API
playwright-cli goto https://app.example.com/users

# Verify mocked data appears
playwright-cli snapshot --filename mocked.md

# Remove mock
playwright-cli unroute "**/api/users"
```

### Multi-Session Testing

```bash
# Admin session
playwright-cli -s=admin open https://app.example.com
playwright-cli -s=admin snapshot --filename admin-view.md

# User session
playwright-cli -s=user open https://app.example.com
playwright-cli -s=user snapshot --filename user-view.md

# Compare views
playwright-cli close-all
```

## Storage & State Management

### Cookies
```bash
playwright-cli cookie-list                    # List all cookies
playwright-cli cookie-get session_id          # Get cookie
playwright-cli cookie-set name value          # Set cookie
playwright-cli cookie-delete name             # Delete cookie
playwright-cli cookie-clear                   # Clear all
```

### Local/Session Storage
```bash
playwright-cli localstorage-list              # List items
playwright-cli localstorage-get theme         # Get item
playwright-cli localstorage-set theme dark    # Set item
playwright-cli localstorage-delete cache      # Delete item
playwright-cli localstorage-clear             # Clear all

# Same commands for sessionstorage-*
```

### Browser State
```bash
playwright-cli state-save [filename]          # Save auth state
playwright-cli state-load <filename>          # Load auth state
```

## Debugging & Monitoring

### Console Messages
```bash
playwright-cli console                 # All console messages
playwright-cli console error           # Only errors
```

### Network Monitoring
```bash
playwright-cli network                 # All network requests
```

### Recording
```bash
playwright-cli tracing-start           # Start trace
playwright-cli tracing-stop            # Stop & save trace

playwright-cli video-start             # Start video
playwright-cli video-stop              # Stop & save video
```

### Run Playwright Code
```bash
# Execute playwright code snippet
playwright-cli run-code "await page.locator('button').click()"
```

## Reference Documentation

For detailed command reference and examples:

- **[references/playwright-reference.md](references/playwright-reference.md)**: Complete command reference including all options, patterns, and common use cases organized by command type
- **[references/examples.md](references/examples.md)**: Real-world workflow examples organized by category (basic workflows, form automation, data extraction, testing, authentication, advanced patterns)

Load reference files when:
- Need detailed options for specific commands
- Looking for workflow examples (pagination, auth, multi-tab, etc.)
- Debugging complex interactions
- Learning advanced features (network mocking, tracing, state management)

## Best Practices

### Always Use Snapshots

Get snapshot before interacting to see available elements:
```bash
playwright-cli snapshot --filename page.md
# Review refs, then interact
playwright-cli click ref-7
```

### Use Named Sessions for Clarity

```bash
playwright-cli -s=admin goto https://app.example.com
playwright-cli -s=user goto https://app.example.com
```

### Save State for Reuse

```bash
# Do login once
playwright-cli goto https://app.example.com/login
# ... login steps ...
playwright-cli state-save app-auth.json

# Reuse in future sessions
playwright-cli state-load app-auth.json
```

### Use Eval for Data Extraction

```bash
# Extract structured data
playwright-cli eval "Array.from(document.querySelectorAll('.item')).map(el => ({
  title: el.querySelector('.title').textContent,
  price: el.querySelector('.price').textContent
}))"
```

### Mock Network for Testing

```bash
# Test with controlled data
playwright-cli route "**/api/products" --body '[{"id":1}]'
playwright-cli goto https://app.example.com
playwright-cli unroute  # Clean up
```

## Troubleshooting

**Command not found**: Install playwright-cli
```bash
npm install -g @playwright/cli@latest
playwright-cli install
```

**Element not found**: Get fresh snapshot
```bash
playwright-cli snapshot --filename debug.md
# Check available refs
```

**Page not loaded**: Add delay
```bash
playwright-cli goto https://example.com
playwright-cli eval "new Promise(r => setTimeout(r, 2000))"
playwright-cli snapshot --filename loaded.md
```

**Session issues**: Close all and restart
```bash
playwright-cli close-all
playwright-cli kill-all  # For zombie processes
```

## When to Use What

**Use `snapshot`** to:
- See available elements and their refs
- Debug page structure
- Verify page loaded correctly

**Use `screenshot`** to:
- Capture visual state
- Document results
- Debug layout issues

**Use `eval`** to:
- Extract data
- Execute JavaScript
- Manipulate page state

**Use `route`** to:
- Test with mock data
- Simulate API failures
- Control network responses

**Use `state-save/load`** to:
- Reuse authentication
- Speed up testing
- Share sessions

## Example End-to-End Workflow

```bash
# Setup
playwright-cli open https://app.example.com/login

# Login
playwright-cli snapshot --filename 1-login.md
playwright-cli fill ref-email "test@example.com"
playwright-cli fill ref-password "password"
playwright-cli click ref-submit
playwright-cli eval "new Promise(r => setTimeout(r, 1000))"

# Navigate
playwright-cli goto https://app.example.com/products
playwright-cli snapshot --filename 2-products.md

# Add to cart
playwright-cli click ref-add-product-1
playwright-cli click ref-add-product-2

# Checkout
playwright-cli goto https://app.example.com/cart
playwright-cli snapshot --filename 3-cart.md
playwright-cli click ref-checkout
playwright-cli snapshot --filename 4-checkout.md

# Fill checkout
playwright-cli fill ref-name "John Doe"
playwright-cli fill ref-address "123 Main St"
playwright-cli click ref-submit-order

# Confirm
playwright-cli snapshot --filename 5-confirmation.md
playwright-cli screenshot --filename receipt.png

# Cleanup
playwright-cli close
```

This approach provides clear visibility at each step via snapshots and screenshots, making debugging and verification straightforward.
