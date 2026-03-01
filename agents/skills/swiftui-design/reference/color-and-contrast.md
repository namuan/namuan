# Color & Contrast

## Color in SwiftUI: Use Asset Catalogs

**Use asset catalogs for all colors.** They support light/dark mode, high contrast variants, and accessibility settings automatically.

```swift
// Define in Asset Catalog, reference in code
extension Color {
    static let brandPrimary = Color("BrandPrimary")
    static let brandSecondary = Color("BrandSecondary")
    static let success = Color("SuccessColor")
    static let error = Color("ErrorColor")
}

// Usage
Text("Title")
    .foregroundStyle(.brandPrimary)
```

**Key insight**: Asset catalogs handle light/dark mode automatically. Define color variants for each mode, and SwiftUI switches automatically.

## Building Functional Palettes

### Semantic Colors

**Use SwiftUI's semantic colors for UI elements:**

| Color | Purpose |
|-------|---------|
| `.primary` | Primary text |
| `.secondary` | Secondary text, labels |
| `.accentColor` / `.tint` | Interactive elements |
| `.red` / `.orange` / `.green` | Semantic meaning (error, warning, success) |

```swift
Text("Title")
    .foregroundStyle(.primary)

Text("Subtitle")
    .foregroundStyle(.secondary)

Button("Action") { }
    .tint(.accentColor)
```

### Palette Structure

A complete system needs:

| Role | Purpose | Implementation |
|------|---------|----------------|
| **Primary** | Brand, CTAs, key actions | Asset catalog, 1 color with variants |
| **Neutral** | Text, backgrounds, borders | System colors (.primary, .secondary) |
| **Semantic** | Success, error, warning, info | Asset catalog, 4 colors |
| **Surface** | Cards, sheets, overlays | System materials |

**Skip secondary/tertiary brand colors unless you need them.** Most apps work fine with one accent color.

### The 60-30-10 Rule (Applied Correctly)

This rule is about **visual weight**, not pixel count:

- **60%**: Neutral backgrounds, system surfaces, white space
- **30%**: Secondary colors—text, borders, inactive states
- **10%**: Accent—CTAs, highlights, focus states

The common mistake: using the accent color everywhere because it's "the brand color." Accent colors work *because* they're rare. Overuse kills their power.

## Contrast & Accessibility

### WCAG Requirements

| Content Type | AA Minimum | AAA Target |
|--------------|------------|------------|
| Body text | 4.5:1 | 7:1 |
| Large text (18pt+ or 14pt bold) | 3:1 | 4.5:1 |
| UI components, icons | 3:1 | 4.5:1 |

### Dangerous Color Combinations

These commonly fail contrast or cause readability issues:

- Light gray text on white (the #1 accessibility fail)
- **Gray text on colored backgrounds**—use white or a darker shade of the background color
- Red text on green background (or vice versa)—8% of men can't distinguish these
- Thin light text on images (unpredictable contrast)

### Testing

Don't trust your eyes. Use tools:

- Xcode Accessibility Inspector
- Simulate color blindness in Accessibility Inspector
- [Contrast](https://usecontrast.com) for quick checks

## Theming: Light & Dark Mode

### Dark Mode Is Not Inverted Light Mode

You can't just swap colors. Dark mode requires different design decisions:

| Light Mode | Dark Mode |
|------------|-----------|
| Dark text on light | Light text on dark |
| Vibrant accents | Slightly desaturated accents |
| White backgrounds | Never pure black—use dark gray |

```swift
// Asset catalog handles this automatically
// Just define both variants:

// BrandPrimary (Light): #3366CC
// BrandPrimary (Dark): #6699FF (slightly lighter, less saturated)

// Or use system colors that adapt automatically
Text("Title")
    .foregroundStyle(.primary) // Adapts to mode
```

### High Contrast Mode

```swift
// Asset catalogs support high contrast variants
// Define: BrandPrimary, BrandPrimary-HighContrast

// Or check in code
@Environment(\.colorSchemeContrast) var contrast

if contrast == .increased {
    // Use higher contrast colors
}
```

## Materials for Depth

SwiftUI materials provide depth and hierarchy:

```swift
// Thin materials
.background(.thinMaterial)

// Ultra thin (for subtle overlays)
.background(.ultraThinMaterial)

// Regular thickness
.background(.regularMaterial)

// Thick materials
.background(.thickMaterial)

// Ultra thick (for prominent surfaces)
.background(.ultraThickMaterial)
```

**Materials automatically adapt** to light/dark mode and vibrancy settings.

## System Colors for Semantics

```swift
// Status colors
.foregroundStyle(.red)     // Error, destructive
.foregroundStyle(.orange)  // Warning
.foregroundStyle(.green)   // Success
.foregroundStyle(.blue)    // Info, links

// Text colors
.foregroundStyle(.primary)    // Primary text
.foregroundStyle(.secondary)  // Secondary text

// Interactive colors
.tint(.accentColor)        // Default accent
.tint(.blue)               // Standard link color
```

---

**Avoid**: Relying on color alone to convey information. Creating palettes without clear roles. Hard-coding hex colors in code. Skipping color blindness testing (8% of men affected). Forgetting to test dark mode.
