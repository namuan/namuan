# Spatial Design

## Spacing Systems

### Use 4pt Base

4pt systems provide granularity: 4, 8, 12, 16, 24, 32, 48, 64, 96pt.

```swift
extension CGFloat {
    static let spacingXS: CGFloat = 4
    static let spacingSM: CGFloat = 8
    static let spacingMD: CGFloat = 16
    static let spacingLG: CGFloat = 24
    static let spacingXL: CGFloat = 32
    static let spacingXXL: CGFloat = 48
}

// Usage
VStack(spacing: .spacingMD) {
    HeaderView()
    ContentView()
}
.padding(.spacingLG)
```

### Name Tokens Semantically

Name by relationship, not value:

```swift
// Good: Semantic names
static let spacingTight: CGFloat = 8
static let spacingDefault: CGFloat = 16
static let spacingRelaxed: CGFloat = 24

// Bad: Value-based names
static let spacing8: CGFloat = 8
static let spacing16: CGFloat = 16
```

### Use Semantic Padding

```swift
// System default padding
ContentView()
    .padding() // ~16pt

// Edge-specific
ContentView()
    .padding(.horizontal)
    .padding(.vertical, 8)

// Named padding regions
ContentView()
    .padding([.horizontal, .bottom])
```

## Grid Systems

### SwiftUI Lazy Grids

```swift
// Adaptive grid - columns fit automatically
LazyVGrid(columns: [
    GridItem(.adaptive(minimum: 150))
]) {
    ForEach(items) { item in
        ItemCell(item: item)
    }
}

// Fixed columns
LazyVGrid(columns: [
    GridItem(.flexible()),
    GridItem(.flexible()),
    GridItem(.flexible())
]) {
    ForEach(items) { item in
        ItemCell(item: item)
    }
}

// Fixed width columns
LazyVGrid(columns: [
    GridItem(.fixed(100)),
    GridItem(.fixed(200)),
])
```

### Grid Alignment

```swift
// Use alignment guides for custom alignment
HStack(alignment: .firstTextBaseline) {
    Text("$")
        .font(.caption)
    Text("99")
        .font(.title)
    Text(".99")
        .font(.subheadline)
}

// Custom alignment
extension VerticalAlignment {
    struct MidItem: AlignmentID {
        static func defaultValue(in context: ViewDimensions) -> CGFloat {
            context[VerticalAlignment.center]
        }
    }
    static let midItem = VerticalAlignment(MidItem.self)
}
```

## Visual Hierarchy

### The Squint Test

Blur your eyes. Can you still identify:
- The most important element?
- The second most important?
- Clear groupings?

If everything looks the same weight blurred, you have a hierarchy problem.

### Hierarchy Through Multiple Dimensions

Don't rely on size alone. Combine:

| Tool | Strong Hierarchy | Weak Hierarchy |
|------|------------------|----------------|
| **Size** | 3:1 ratio or more | <2:1 ratio |
| **Weight** | Bold vs Regular | Medium vs Regular |
| **Color** | Primary vs secondary | Similar tones |
| **Position** | Top/left (primary) | Bottom/right |
| **Space** | Surrounded by white space | Crowded |

**The best hierarchy uses 2-3 dimensions at once:**

```swift
VStack(alignment: .leading, spacing: 16) {
    Text("Title")
        .font(.title)      // Size
        .fontWeight(.bold) // Weight
        .foregroundStyle(.primary) // Color
    
    Text("Subtitle")
        .font(.headline)
        .foregroundStyle(.secondary)
    
    Text("Body text")
        .font(.body)
}
```

### Grouping Without Cards

Spacing and alignment create visual grouping naturally:

```swift
// Group related items with spacing
VStack(spacing: 0) {
    // Group 1
    VStack(alignment: .leading, spacing: 8) {
        Text("Section 1")
            .font(.headline)
        Text("Content for section 1")
    }
    .padding()
    
    Divider() // Visual separator
    
    // Group 2
    VStack(alignment: .leading, spacing: 8) {
        Text("Section 2")
            .font(.headline)
        Text("Content for section 2")
    }
    .padding()
}
```

## Depth & Elevation

### Shadows

```swift
// Subtle elevation
ContentView()
    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)

// Stronger elevation
ContentView()
    .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)

// Multiple shadows for depth
ContentView()
    .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
```

### Materials

```swift
// Material backgrounds create depth
ContentView()
    .background(.ultraThinMaterial)

// Material with vibrancy
ContentView()
    .background(.regularMaterial)
    .clipShape(RoundedRectangle(cornerRadius: 12))
```

### Z-Index

```swift
// Control layer order
ZStack {
    BackgroundView()
        .zIndex(0)
    
    ContentView()
        .zIndex(1)
    
    OverlayView()
        .zIndex(2)
}
```

## Touch Targets

**44x44pt minimum for interactive elements:**

```swift
// Small visual, large touch target
Button { } label: {
    Image(systemName: "heart")
        .font(.title3) // Visual size
}
.frame(width: 44, height: 44) // Touch target
.contentShape(Rectangle()) // Expand hit area

// Or use padding
Button { } label: {
    Image(systemName: "heart")
}
.padding(12) // Expands touch target
```

## Optical Adjustments

### Icon Alignment

```swift
// Icons may need offset for optical centering
HStack {
    Image(systemName: "star.fill")
        .offset(y: -1) // Optical adjustment
    Text("Featured")
}

// Or use frame alignment
HStack(alignment: .firstTextBaseline) {
    Image(systemName: "star.fill")
    Text("Featured")
}
```

### Text Margins

```swift
// Text at margin: 0 can look indented
Text("Title")
    .padding(.leading, -0.05) // Optical adjustment
```

---

**Avoid**: Arbitrary spacing values outside your scale. Making all spacing equal (variety creates hierarchy). Creating hierarchy through size alone - combine size, weight, color, and space.
