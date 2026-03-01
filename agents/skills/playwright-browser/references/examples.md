# Playwright-CLI Workflow Examples

## Table of Contents
- [Basic Workflows](#basic-workflows)
- [Form Automation](#form-automation)
- [Data Extraction](#data-extraction)
- [Testing & Debugging](#testing--debugging)
- [Authentication & State](#authentication--state)
- [Advanced Workflows](#advanced-workflows)

## Basic Workflows

### Take Screenshot of Website

```bash
# Open browser and navigate
playwright-cli open https://example.com

# Take screenshot
playwright-cli screenshot --filename example.png

# Full-page screenshot
playwright-cli screenshot --full-page --filename example-full.png

# Close when done
playwright-cli close
```

### Extract Page Content

```bash
# Navigate to page
playwright-cli goto https://news.ycombinator.com

# Get page snapshot (includes text and element refs)
playwright-cli snapshot --filename hn-snapshot.md

# Extract title
playwright-cli eval "document.title"

# Extract specific data with JavaScript
playwright-cli eval "Array.from(document.querySelectorAll('.titleline > a')).map(a => a.textContent).slice(0, 10)"
```

### Click Throughworkflow

```bash
# Open and navigate
playwright-cli open https://example.com

# Get element references
playwright-cli snapshot --filename page1.md
# Review snapshot to find button ref (e.g., ref-5)

# Click button to navigate
playwright-cli click ref-5

# Snapshot new page
playwright-cli snapshot --filename page2.md

# Screenshot result
playwright-cli screenshot --filename result.png
```

## Form Automation

### Simple Form Submission

```bash
# Navigate to form
playwright-cli goto https://example.com/contact

# Get snapshot to see form fields
playwright-cli snapshot --filename contact-form.md

# Fill form fields (using refs from snapshot)
playwright-cli fill ref-name "John Doe"
playwright-cli fill ref-email "john@example.com"
playwright-cli fill ref-message "This is a test message"

# Check agreement checkbox
playwright-cli check ref-agree

# Submit form
playwright-cli click ref-submit

# Wait a moment for submission
playwright-cli eval "new Promise(r => setTimeout(r, 2000))"

# Capture confirmation
playwright-cli screenshot --filename submitted.png
playwright-cli snapshot --filename confirmation.md
```

### Complex Multi-Step Form

```bash
# Start at form
playwright-cli goto https://example.com/multi-step-form

# Step 1: Personal Info
playwright-cli snapshot --filename step1.md
playwright-cli fill ref-firstname "John"
playwright-cli fill ref-lastname "Doe"
playwright-cli click ref-next

# Step 2: Contact Info
playwright-cli snapshot --filename step2.md
playwright-cli fill ref-email "john@example.com"
playwright-cli fill ref-phone "555-1234"
playwright-cli click ref-next

# Step 3: Preferences
playwright-cli snapshot --filename step3.md
playwright-cli check ref-newsletter
playwright-cli select ref-country "United States"
playwright-cli click ref-submit

# Confirmation
playwright-cli snapshot --filename final.md
playwright-cli screenshot --filename completed.png
```

### File Upload

```bash
playwright-cli goto https://example.com/upload

playwright-cli snapshot --filename upload-form.md

# Upload file
playwright-cli upload /path/to/document.pdf

# Click upload button
playwright-cli click ref-upload-btn

# Wait for upload to complete
playwright-cli eval "new Promise(r => setTimeout(r, 3000))"

playwright-cli snapshot --filename uploaded.md
```

## Data Extraction

### Extract Links from Page

```bash
playwright-cli goto https://news.ycombinator.com

# Extract all story links
playwright-cli eval "Array.from(document.querySelectorAll('.titleline > a')).map(a => ({ title: a.textContent, url: a.href }))"

# Or save to snapshot for manual review
playwright-cli snapshot --filename hn-links.md
```

### Scrape Table Data

```bash
playwright-cli goto https://example.com/data-table

# Extract table rows as JSON
playwright-cli eval "
Array.from(document.querySelectorAll('table tbody tr')).map(row => {
  const cells = Array.from(row.querySelectorAll('td'));
  return cells.map(cell => cell.textContent.trim());
})
"

# Save snapshot to see formatted table
playwright-cli snapshot --filename table-data.md
```

### Monitor Console Messages

```bash
playwright-cli goto https://example.com

# Perform actions...
playwright-cli click ref-action

# Check console for errors
playwright-cli console error

# Or see all console output
playwright-cli console
```

### Track Network Requests

```bash
playwright-cli goto https://example.com/dashboard

# Perform action that triggers API call
playwright-cli click ref-refresh

# View network requests
playwright-cli network

# Look for API responses in the output
```

### Extract Dynamic Content

```bash
playwright-cli goto https://example.com/dynamic

# Scroll to trigger lazy loading
playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"

# Wait for content to load
playwright-cli eval "new Promise(r => setTimeout(r, 2000))"

# Extract loaded content
playwright-cli eval "document.querySelector('.dynamic-content').textContent"
```

## Testing & Debugging

### Test Login Flow

```bash
# Navigate to login
playwright-cli goto https://app.example.com/login

# Snapshot to verify page loaded
playwright-cli snapshot --filename login-page.md

# Enter credentials
playwright-cli fill ref-email "test@example.com"
playwright-cli fill ref-password "testpass123"

# Click submit
playwright-cli click ref-submit

# Wait for redirect
playwright-cli eval "new Promise(r => setTimeout(r, 2000))"

# Verify dashboard loaded
playwright-cli eval "document.title"
playwright-cli snapshot --filename dashboard.md

# Expect to see "Dashboard" in the snapshot
```

### Test with Network Mocking

```bash
# Mock API response
playwright-cli route "**/api/products" \
  --status 200 \
  --body '[{"id":1,"name":"Test Product","price":99}]' \
  --content-type "application/json"

# Navigate to page that calls API
playwright-cli goto https://app.example.com/products

# Verify mocked data appears
playwright-cli snapshot --filename mocked-products.md

# Screenshot for visual verification
playwright-cli screenshot --filename mocked-view.png

# Check network tab to confirm mock was used
playwright-cli network

# Remove mock
playwright-cli unroute "**/api/products"
```

### Record Trace for Debugging

```bash
# Start trace
playwright-cli tracing-start

# Perform test actions
playwright-cli goto https://example.com
playwright-cli snapshot --filename test-start.md
playwright-cli click ref-button
playwright-cli snapshot --filename after-click.md

# Stop trace (saves to file)
playwright-cli tracing-stop

# View trace file in Playwright Inspector
# open trace.zip in https://trace.playwright.dev/
```

### Video Recording

```bash
# Start recording
playwright-cli video-start

# Perform workflow
playwright-cli goto https://example.com/demo
playwright-cli click ref-play
playwright-cli eval "new Promise(r => setTimeout(r, 5000))"
playwright-cli click ref-stop

# Stop recording
playwright-cli video-stop
```

### Test Responsive Design

```bash
# Mobile viewport
playwright-cli resize 375 667
playwright-cli goto https://example.com
playwright-cli screenshot --filename mobile.png

# Tablet viewport
playwright-cli resize 768 1024
playwright-cli reload
playwright-cli screenshot --filename tablet.png

# Desktop viewport
playwright-cli resize 1920 1080
playwright-cli reload
playwright-cli screenshot --filename desktop.png
```

## Authentication & State

### Login and Save State

```bash
# Perform login
playwright-cli goto https://app.example.com/login
playwright-cli snapshot --filename login.md
playwright-cli fill ref-email "user@example.com"
playwright-cli fill ref-password "password"
playwright-cli click ref-submit

# Wait for authentication
playwright-cli eval "new Promise(r => setTimeout(r, 2000))"

# Save authentication state
playwright-cli state-save app-auth.json

# Close browser
playwright-cli close
```

### Reuse Saved Authentication

```bash
# Open new session
playwright-cli open

# Load saved auth state
playwright-cli state-load app-auth.json

# Navigate to protected page (already authenticated)
playwright-cli goto https://app.example.com/dashboard
playwright-cli snapshot --filename authenticated-dashboard.md
```

### Manage Cookies

```bash
# View all cookies
playwright-cli cookie-list

# Set custom cookie
playwright-cli cookie-set session_token "abc123xyz"
playwright-cli cookie-set user_id "42"

# Get specific cookie
playwright-cli cookie-get session_token

# Delete cookie
playwright-cli cookie-delete temp_data

# Clear all cookies (logout)
playwright-cli cookie-clear
```

### Local Storage Management

```bash
# View current local storage
playwright-cli localstorage-list

# Set preferences
playwright-cli localstorage-set theme "dark"
playwright-cli localstorage-set language "en"

# Reload to apply
playwright-cli reload

# Get value
playwright-cli localstorage-get theme

# Clear specific item
playwright-cli localstorage-delete cache

# Clear all
playwright-cli localstorage-clear
```

## Advanced Workflows

### Multi-Tab Workflow

```bash
# Open first tab
playwright-cli open https://example.com/page1

# List tabs
playwright-cli tab-list

# Open second tab
playwright-cli tab-new https://example.com/page2

# Take snapshot of current tab (tab 1)
playwright-cli snapshot --filename tab2.md

# Switch back to first tab
playwright-cli tab-select 0

# Take snapshot
playwright-cli snapshot --filename tab1.md

# Close second tab
playwright-cli tab-close 1
```

### Shopping Cart Flow

```bash
# Browse products
playwright-cli goto https://shop.example.com/products
playwright-cli snapshot --filename products.md

# Add first product to cart (using ref from snapshot)
playwright-cli click ref-add-to-cart-1

# Add second product
playwright-cli click ref-add-to-cart-2

# Go to cart
playwright-cli goto https://shop.example.com/cart
playwright-cli snapshot --filename cart.md

# Proceed to checkout
playwright-cli click ref-checkout

# Fill checkout form
playwright-cli snapshot --filename checkout.md
playwright-cli fill ref-name "John Doe"
playwright-cli fill ref-address "123 Main St"
playwright-cli fill ref-card "4111111111111111"

# Submit order
playwright-cli click ref-place-order

# Confirmation
playwright-cli snapshot --filename order-confirmation.md
playwright-cli screenshot --filename receipt.png
```

### Search and Paginate

```bash
# Search
playwright-cli goto https://example.com
playwright-cli snapshot --filename home.md
playwright-cli fill ref-search "playwright automation"
playwright-cli press Enter

# First page results
playwright-cli snapshot --filename results-page1.md

# Go to next page
playwright-cli click ref-next-page

# Second page results
playwright-cli snapshot --filename results-page2.md

# Extract all result titles
playwright-cli eval "Array.from(document.querySelectorAll('.result-title')).map(el => el.textContent)"
```

### Infinite Scroll

```bash
playwright-cli goto https://example.com/feed

# Scroll and load more content multiple times
for i in {1..5}; do
  playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"
  playwright-cli eval "new Promise(r => setTimeout(r, 1500))"
done

# Extract all loaded items
playwright-cli eval "document.querySelectorAll('.feed-item').length"
playwright-cli snapshot --filename full-feed.md
```

### Download Generated PDF

```bash
# Navigate to report page
playwright-cli goto https://example.com/reports

# Select options
playwright-cli snapshot --filename report-options.md
playwright-cli select ref-date-range "last-30-days"
playwright-cli check ref-include-charts

# Generate report
playwright-cli click ref-generate

# Wait for report to load
playwright-cli eval "new Promise(r => setTimeout(r, 3000))"

# Save as PDF
playwright-cli pdf --filename report.pdf
```

### Session-Based Testing

```bash
# Create session 1 - Admin user
playwright-cli -s=admin open https://app.example.com/login
playwright-cli -s=admin fill ref-email "admin@example.com"
playwright-cli -s=admin fill ref-password "admin123"
playwright-cli -s=admin click ref-submit
playwright-cli -s=admin goto https://app.example.com/admin
playwright-cli -s=admin snapshot --filename admin-view.md

# Create session 2 - Regular user
playwright-cli -s=user open https://app.example.com/login
playwright-cli -s=user fill ref-email "user@example.com"
playwright-cli -s=user fill ref-password "user123"
playwright-cli -s=user click ref-submit
playwright-cli -s=user goto https://app.example.com/dashboard
playwright-cli -s=user snapshot --filename user-view.md

# Compare views
# admin-view.md should have admin controls
# user-view.md should not have admin controls

# Close all sessions
playwright-cli close-all
```

### Handle Dialogs

```bash
playwright-cli goto https://example.com

# Set up dialog handler (accept automatically)
# Note: May need to use run-code for complex dialog handling
playwright-cli run-code "
  page.on('dialog', dialog => dialog.accept());
"

# Click button that shows confirm dialog
playwright-cli click ref-delete-button

# Or manually handle
playwright-cli click ref-prompt-button
playwright-cli dialog-accept "User input for prompt"
```

### Drag and Drop

```bash
playwright-cli goto https://example.com/kanban

playwright-cli snapshot --filename kanban.md

# Drag task from "To Do" to "In Progress"
# (refs from snapshot)
playwright-cli drag ref-task-1 ref-inprogress-column

playwright-cli snapshot --filename after-drag.md
playwright-cli screenshot --filename updated-kanban.png
```

