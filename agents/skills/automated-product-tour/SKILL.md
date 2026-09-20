---
name: automated-product-tour
description: Build deterministic, fixture-driven product tours for desktop applications by driving the real UI, capturing feature screenshots, and generating linked Markdown documentation. Use when a product tour, feature walkthrough, screenshot documentation, or repeatable UI showcase is requested.
---

# Automated Product Tour

Create a product tour that can be regenerated after UI changes with one project command. The tour must exercise the real application UI, use stable fixture data, capture screenshots, and generate its documentation from the same manifest used by the capture script.

## Core principles

- Drive the real UI rather than drawing mock screens.
- Use local fixtures instead of live APIs, authentication, clocks, or network services.
- Capture one user-facing capability per image.
- Keep screenshot names, titles, descriptions, and ordering in one generator manifest.
- Generate both images and Markdown; do not hand-edit generated output.
- Make repeated runs replace stale screenshots and produce identical dimensions.
- Add a project command such as `make tour` or `npm run tour`.
- Run the tour generator and relevant application tests before committing.

## Deliverables

Use the host project's conventions, but prefer this layout:

```text
scripts/generate_product_tour.py
assets/product-tour/01-canvas.png
assets/product-tour/02-search.png
docs/product-tour.md
```

Add the tour to the project README and document the regeneration command near the development instructions.

## Workflow

### 1. Inventory capabilities

Read the application source, README, and existing UI tests. Make a short feature inventory based on visible user workflows, for example:

- Main overview or dashboard
- Primary navigation
- Search or command palette
- Detail or diff view
- Inline actions
- Filtering or sorting
- Draft or submission flow
- Empty, loading, or error state when it is important to the product

Choose approximately five to eight frames. Each frame should communicate one capability without requiring the reader to infer a hidden state.

### 2. Build deterministic fixture data

Create a fixture client or fixture loader with enough data to show the product's important states. For a code review application, include:

- A representative pull request
- Nested files with additions and deletions
- Multiple review threads
- At least two reviewers
- Resolved and unresolved threads
- A draft comment
- Data that exercises long labels and realistic counts

Do not make the generator call production APIs. If the application's normal loading path is asynchronous, construct the application's loaded-state object and pass it through the same success handler used by the real client.

Use a temporary persistence database. Clear or recreate the output directory at the beginning of every run.

### 3. Drive the real application

Start the application's actual main window with the normal theme, dimensions, icons, and styles. Use the framework's UI automation tools:

- PySide6: `QTest`, signals, `QApplication.processEvents()`, and `QWidget.grab()`
- Qt popups and dialogs: capture the parent window and composite the visible popup image over it
- Web applications: use the project's browser automation tool
- Other native toolkits: use their accessibility or UI-test APIs and follow their existing test harness

After each state change, wait for rendering and asynchronous layout to settle before capturing. Avoid arbitrary long sleeps; use a short event-loop settle helper.

### 4. Capture screenshots

Use a single capture helper that:

1. Grabs the application window at a fixed size.
2. Optionally composites a popup, menu, or dialog at its window-relative position.
3. Saves a predictable PNG filename.
4. Records the image filename, title, and description in an in-memory manifest.

For PySide6, the essential pattern is:

```python
from PySide6.QtCore import QPoint
from PySide6.QtGui import QImage, QPainter


def capture_window(window, output_path, overlay=None):
    image = window.grab().toImage().convertToFormat(QImage.Format.Format_ARGB32)
    if overlay and overlay.isVisible():
        overlay_image = overlay.grab().toImage()
        global_position = overlay.mapToGlobal(QPoint(0, 0))
        position = window.mapFromGlobal(global_position)
        painter = QPainter(image)
        painter.drawImage(position, overlay_image)
        painter.end()
    image.save(str(output_path))
```

A popup is often a separate top-level window and will not be included in `window.grab()`. Composite it explicitly so the generated image represents what a user sees.

### 5. Generate Markdown

Generate the tour document from the capture manifest. Each entry should contain:

- A heading
- A concise description of the capability
- A relative image link

Example:

```markdown
## Quick search

Press Cmd+Shift+F to find a file and highlight it in the canvas.

![Quick search](../assets/product-tour/03-quick-search.png)
```

Include a generated-file notice at the top of the document. Never manually edit generated screenshots or generated Markdown.

### 6. Add a project command

Add a command that runs the generator in the project's normal environment. For a PySide6 and `uv` project:

```make
.PHONY: tour

tour:
	QT_QPA_PLATFORM=offscreen uv run python scripts/generate_product_tour.py
```

If practical, add a verification command that regenerates the tour and fails when the generated files differ from the committed files:

```make
.PHONY: tour-check

tour-check: tour
	git diff --exit-code -- assets/product-tour docs/product-tour.md
```

The verification command is useful in CI, while `make tour` is the normal local update command.

### 7. Verify and publish

Run, in order:

```bash
make tour
make check
make test-gui
```

Review every generated image, especially popups and dialogs. Confirm that:

- The application URL or fixture identity is not misleading.
- No live credentials, private data, or temporary paths appear.
- Text is legible at the committed image dimensions.
- The number and ordering of images match the Markdown.
- The output directory contains no stale files.

Commit the generator, fixture data, documentation, and screenshots together. Push the change when the project workflow requires it.

## PySide6 implementation guidance

Use a direct loaded-state fixture when possible. This avoids duplicating the production networking path while still exercising parsing, rendering, focus, menus, dialogs, and actions:

```python
with tempfile.TemporaryDirectory() as temporary_directory:
    persistence = Persistence(Path(temporary_directory) / "tour.sqlite3")
    window = MainWindow(persistence=persistence)
    window.resize(1450, 950)
    window.show()
    window._load_finished(fixture_loaded_pull_request())
    window.drafts = [fixture_draft(window.pull_request)]
    window._render_loaded_state()
    settle(application)
```

For modal dialogs that use `exec()`, schedule a callback before opening the dialog. The callback can locate the visible dialog, capture it as an overlay, and reject it so the generator continues without submitting anything:

```python
def capture_dialog():
    dialog = visible_dialog()
    if dialog:
        capture_window(window, output_path, dialog)
        dialog.reject()
    else:
        QTimer.singleShot(20, capture_dialog)

QTimer.singleShot(0, capture_dialog)
window.submit_review()
```

For menus, use non-blocking `popup()` instead of a blocking `showMenu()` call:

```python
position = button.mapToGlobal(QPoint(0, button.height()))
menu.popup(position)
settle(application)
capture_window(window, output_path, menu)
menu.close()
```

Keep fixture setup and capture steps in named functions. Avoid depending on private widget geometry except where the product's public interaction cannot expose the state another way.

## Naming and manifest rules

Use two-digit numeric prefixes so the tour has a stable reading order:

```text
01-canvas-overview.png
02-keyboard-navigation.png
03-quick-search.png
04-diff-comments.png
05-reviewer-filter.png
06-submit-review.png
```

Descriptions should describe the user outcome, not implementation details. Keep the same description in the image documentation and generated Markdown if images contain captions.

## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| Generator hangs | A blocking menu or dialog was opened without a scheduled close | Use `popup()` or schedule a callback before `exec()` |
| Popup is missing | Parent `grab()` excludes top-level child windows | Composite the popup using global-to-window coordinates |
| Screenshot shows old state | Queued layout or render work has not completed | Process events, wait briefly, then process events again |
| Results differ between runs | Live data, timestamps, random IDs, or persisted state | Use fixtures and a temporary database |
| Hidden file cannot be focused | An ancestor folder is collapsed | Expand ancestors before focusing the selected result |
| Stale screenshots remain | Generator only overwrites known names | Delete old PNGs before generating |
| Tour documents the wrong feature | One image contains too many unrelated states | Split it into one capability per image |
| CI cannot render Qt | Display backend is unavailable | Set `QT_QPA_PLATFORM=offscreen` and use a fixed application style |

## Skill boundaries

Use this skill for reproducible, code-driven product tours generated from a project. For a live macOS application where screenshots must be annotated from Accessibility coordinates, use the separate `macos-product-tour` skill instead. For browser-specific screenshot capture, use the project's browser screenshot skill.

## Completion checklist

- [ ] Feature inventory completed from source and UI tests.
- [ ] Fixture data is deterministic and offline.
- [ ] Real application UI is driven for every frame.
- [ ] One capability is represented per screenshot.
- [ ] Popups and dialogs are composited into screenshots.
- [ ] Stale output files are removed before generation.
- [ ] Markdown is generated from the same manifest as the images.
- [ ] A one-command regeneration target exists.
- [ ] README links to the tour and explains regeneration.
- [ ] Tour generation and application tests pass.
- [ ] Generated assets and source are committed together.
