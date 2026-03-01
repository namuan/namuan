# Typography

## SwiftUI Typography

### Semantic Font Styles

**Use SwiftUI's semantic styles—they scale with Dynamic Type automatically:**

| Style | Size | Use Case |
|-------|------|----------|
| `.largeTitle` | 34pt | Hero headlines |
| `.title` | 28pt | Section headers |
| `.title2` | 22pt | Card titles |
| `.title3` | 20pt | Subsection headers |
| `.headline` | 17pt semibold | Emphasis, labels |
| `.body` | 17pt | Body text |
| `.callout` | 16pt | Secondary text |
| `.subheadline` | 15pt | Captions, metadata |
| `.footnote` | 13pt | Fine print |
| `.caption` | 12pt | Labels, hints |
| `.caption2` | 11pt | Smallest text |

```swift
Text("Title")
    .font(.headline)

Text("Body text")
    .font(.body)

Text("Caption")
    .font(.caption)
    .foregroundStyle(.secondary)
```

### Custom Fonts

```swift
// Register custom font in Info.plist (iOS) or use Fontbook (macOS)

// Use custom font
Text("Custom Text")
    .font(.custom("CustomFontName", size: 16))

// Custom font with Dynamic Type scaling
@ScaledMetric(relativeTo: .body) var fontSize: CGFloat = 16

Text("Custom Text")
    .font(.custom("CustomFontName", size: fontSize))
```

## Classic Typography Principles

### Vertical Rhythm

Use consistent spacing that relates to your text size:

```swift
// Body at 17pt with 1.5 line height = ~25pt rhythm
VStack(spacing: 24) { // Close to rhythm
    Text("Paragraph 1")
        .font(.body)
    Text("Paragraph 2")
        .font(.body)
}
```

### Modular Scale

Use fewer sizes with more contrast:

```swift
extension Font {
    // 5 sizes cover most needs
    static let display = Font.system(size: 36, weight: .bold)
    static let heading = Font.system(size: 24, weight: .semibold)
    static let subheading = Font.system(size: 18, weight: .medium)
    static let body = Font.system(size: 17, weight: .regular)
    static let caption = Font.system(size: 14, weight: .regular)
}
```

Popular ratios: 1.25 (major third), 1.333 (perfect fourth), 1.5 (perfect fifth).

### Line Length

Use `.frame(maxWidth:)` to limit line length:

```swift
Text(longText)
    .font(.body)
    .frame(maxWidth: 600) // Optimal reading width
```

**Optimal line length**: 45-75 characters for comfortable reading.

### Line Height

Line height scales with size. For custom fonts:

```swift
Text("Custom text")
    .font(.custom("CustomFont", size: 16))
    .lineSpacing(4) // Add extra spacing
```

**Non-obvious**: Increase line height for light text on dark backgrounds.

## Font Selection

### System Fonts

**SF Pro is underrated.** It's highly readable, supports all scripts, and adapts to all sizes.

```swift
// System font (SF Pro on Apple platforms)
Text("Body")
    .font(.body)

// Rounded variant
Text("Friendly text")
    .font(.system(.body, design: .rounded))

// Monospace for code
Text("code")
    .font(.system(.body, design: .monospaced))

// Serif for editorial
Text("Elegant text")
    .font(.system(.body, design: .serif))
```

### Font Pairing

**The non-obvious truth**: You often don't need a second font. One font family with multiple weights creates clean hierarchy.

When pairing, contrast on multiple axes:
- Serif + Sans (structure contrast)
- Geometric + Humanist (personality contrast)

**Never pair similar fonts.** They create visual tension without clear hierarchy.

## Text Styling

### Weight

```swift
Text("Title")
    .fontWeight(.bold)

Text("Emphasis")
    .fontWeight(.semibold)

Text("Regular")
    .fontWeight(.regular)

Text("Light")
    .fontWeight(.light)
```

### Color

```swift
Text("Primary text")
    .foregroundStyle(.primary)

Text("Secondary text")
    .foregroundStyle(.secondary)

Text("Accent text")
    .foregroundStyle(.tint)
```

### Truncation

```swift
// Single line with truncation
Text(title)
    .lineLimit(1)
    .truncationMode(.tail)

// Multi-line
Text(description)
    .lineLimit(3)

// No truncation
Text(text)
    .lineLimit(nil) // Or remove lineLimit entirely
    .fixedSize(horizontal: false, vertical: true)
```

### Text Layout

```swift
// Alignment
Text("Text")
    .multilineTextAlignment(.center)

// Dynamic Type with minimum scale
Text("Fitting text")
    .font(.headline)
    .minimumScaleFactor(0.75) // Shrink if needed
    .lineLimit(1)
```

## Accessibility Considerations

### Dynamic Type

**Always test at all accessibility sizes:**

- xSmall
- Small (default)
- Medium
- Large
- xLarge
- xxLarge
- xxxLarge (accessibility sizes)
- Accessibility Medium
- Accessibility Large
- Accessibility Extra Large
- Accessibility Extra Extra Large
- Accessibility Extra Extra Extra Large

```swift
// Semantic styles scale automatically
Text("Body")
    .font(.body) // Use this

// NOT this - doesn't scale
Text("Body")
    .font(.system(size: 17))
```

### Minimum Sizes

```swift
// Ensure minimum readable size
Text("Caption")
    .font(.caption)
    .minimumScaleFactor(0.75) // Shrink gracefully if needed
```

### Bold Text

```swift
// Support Bold Text accessibility setting
@Environment(\.legibilityWeight) var legibilityWeight

Text("Body")
    .fontWeight(legibilityWeight == .bold ? .bold : .regular)
```

---

**Avoid**: More than 2-3 font families. Hard-coded sizes when semantic styles work. Ignoring Dynamic Type. Using decorative fonts for body text. Light fonts at small sizes.
