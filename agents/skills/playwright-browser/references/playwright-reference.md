# Playwright-CLI Command Reference

## Overview

`playwright-cli` is a session-based browser automation tool that operates through command-line interface. It maintains persistent browser sessions and uses element references from snapshots.

## Installation

```bash
# Install playwright-cli (via npm)
npm install -g @playwright/cli@latest

# Initialize workspace and install browsers
playwright-cli install
playwright-cli install-browser
```

## Session Management

### Browser Sessions

```bash
# List all active sessions
playwright-cli list

# Open browser (creates new session or reuses existing)
playwright-cli open
playwright-cli open https://example.com

# Use specific session
playwright-cli -s=session1 goto https://example.com

# Close current session
playwright-cli close

# Close all sessions
playwright-cli close-all

# Kill zombie processes
playwright-cli kill-all
```

## Core Commands

### Navigation

```bash
# Navigate to URL
playwright-cli goto https://example.com

# Go back/forward
playwright-cli go-back
playwright-cli go-forward

# Reload page
playwright-cli reload
```

### Element Interaction

**Key concept**: Use `snapshot` to get element references, then use those refs with other commands.

```bash
# Get page snapshot with element references
playwright-cli snapshot
playwright-cli snapshot --filename snapshot.md

# Click element (ref from snapshot)
playwright-cli click <ref>
playwright-cli click <ref> right           # Right-click
playwright-cli click <ref> --modifiers alt # Click with modifier

# Double-click
playwright-cli dblclick <ref>

# Fill form field
playwright-cli fill <ref> "text content"

# Type text into focused element
playwright-cli type "text to type"

# Hover over element
playwright-cli hover <ref>

# Select dropdown option
playwright-cli select <ref> "option value"

# Check/uncheck checkboxes
playwright-cli check <ref>
playwright-cli uncheck <ref>

# Drag and drop
playwright-cli drag <startRef> <endRef>

# File upload
playwright-cli upload /path/to/file.pdf
```

### Keyboard & Mouse

```bash
# Keyboard
playwright-cli press Enter
playwright-cli press a
playwright-cli press ArrowLeft
playwright-cli keydown Control
playwright-cli keyup Control

# Mouse movements
playwright-cli mousemove 100 200
playwright-cli mousedown left
playwright-cli mouseup
playwright-cli mousewheel 0 100  # Scroll down
```

### Capture & Export

```bash
# Screenshot full page
playwright-cli screenshot
playwright-cli screenshot --filename page.png
playwright-cli screenshot --full-page --filename full.png

# Screenshot specific element
playwright-cli screenshot <ref> --filename element.png

# Save as PDF
playwright-cli pdf --filename page.pdf
```

### JavaScript Evaluation

```bash
# Evaluate on page
playwright-cli eval "document.title"
playwright-cli eval "window.scrollTo(0, 500)"

# Evaluate on element
playwright-cli eval "el => el.textContent" <ref>
```

### Dialogs

```bash
# Accept dialog
playwright-cli dialog-accept
playwright-cli dialog-accept "prompt text"

# Dismiss dialog
playwright-cli dialog-dismiss
```

## Tab Management

```bash
# List all tabs
playwright-cli tab-list

# Create new tab
playwright-cli tab-new
playwright-cli tab-new https://example.com

# Switch to tab
playwright-cli tab-select 0  # First tab
playwright-cli tab-select 1  # Second tab

# Close tab
playwright-cli tab-close 0
```

## Storage & State

### Browser State (Authentication)

```bash
# Save authentication state
playwright-cli state-save auth.json
playwright-cli state-save  # Uses default filename

# Load authentication state
playwright-cli state-load auth.json
```

### Cookies

```bash
# List cookies
playwright-cli cookie-list

# Get specific cookie
playwright-cli cookie-get session_id

# Set cookie
playwright-cli cookie-set name value
playwright-cli cookie-set session_id abc123

# Delete cookie
playwright-cli cookie-delete session_id

# Clear all cookies
playwright-cli cookie-clear
```

### Local Storage

```bash
# List all items
playwright-cli localstorage-list

# Get item
playwright-cli localstorage-get userPrefs

# Set item
playwright-cli localstorage-set theme dark

# Delete item
playwright-cli localstorage-delete cache

# Clear all
playwright-cli localstorage-clear
```

### Session Storage

```bash
# List all items
playwright-cli sessionstorage-list

# Get item
playwright-cli sessionstorage-get tempData

# Set item
playwright-cli sessionstorage-set token xyz

# Delete item
playwright-cli sessionstorage-delete token

# Clear all
playwright-cli sessionstorage-clear
```

## Network Control

### Route Mocking

```bash
# Mock API response
playwright-cli route "**/api/users" --status 200 --body '{"users":[]}'

# Mock with headers
playwright-cli route "**/api/data" \
  --body '{"result":"success"}' \
  --content-type "application/json" \
  --header "X-Custom: value"

# List active routes
playwright-cli route-list

# Remove specific route
playwright-cli unroute "**/api/users"

# Remove all routes
playwright-cli unroute
```

## DevTools

### Console Monitoring

```bash
# List console messages
playwright-cli console

# Filter by level (log, warn, error)
playwright-cli console error
```

### Network Monitoring

```bash
# List all network requests
playwright-cli network
```

### Recording

```bash
# Start trace
playwright-cli tracing-start

# Stop trace (saves to file)
playwright-cli tracing-stop

# Start video recording
playwright-cli video-start

# Stop video recording
playwright-cli video-stop
```

### Run Playwright Code

```bash
# Execute playwright code snippet
playwright-cli run-code "await page.locator('button').click()"
```

## Utilities

```bash
# Resize browser window
playwright-cli resize 1920 1080

# Delete session data
playwright-cli delete-data
```

## Element Reference Workflow

The key workflow pattern:

1. **Snapshot** - Get element references
2. **Interact** - Use refs with action commands
3. **Capture** - Screenshot or extract data

```bash
# 1. Get snapshot to see elements
playwright-cli snapshot --filename page.md

# 2. Use refs from snapshot (e.g., ref-3, ref-7)
playwright-cli fill ref-3 "username"
playwright-cli fill ref-5 "password"
playwright-cli click ref-7

# 3. Capture result
playwright-cli screenshot --filename result.png
```

## Common Patterns by Task Type

### Form Submission
```bash
playwright-cli goto https://example.com/form
playwright-cli snapshot --filename form.md
# Review refs, then:
playwright-cli fill ref-1 "John Doe"
playwright-cli fill ref-2 "john@example.com"
playwright-cli check ref-3
playwright-cli click ref-4
```

### Login Flow
```bash
playwright-cli goto https://app.example.com/login
playwright-cli snapshot --filename login.md
playwright-cli fill ref-username "user@example.com"
playwright-cli fill ref-password "secret"
playwright-cli click ref-submit
playwright-cli state-save auth.json  # Save auth for reuse
```

### Data Extraction
```bash
playwright-cli goto https://example.com/data
playwright-cli snapshot --filename data.md
playwright-cli eval "Array.from(document.querySelectorAll('.item')).map(el => el.textContent)"
```

### Testing with Mock Data
```bash
playwright-cli route "**/api/products" --body '[{"id":1,"name":"Test"}]'
playwright-cli goto https://app.example.com
playwright-cli snapshot --filename mocked.md
```
