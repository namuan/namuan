---
name: swiftui-design
description: Create distinctive, production-grade SwiftUI interfaces with high design quality for Apple platforms. Use this skill when the user asks to build iOS, iPadOS, macOS, watchOS, or tvOS interfaces. Generates creative, polished code that follows Apple Human Interface Guidelines.
---

This skill guides creation of distinctive, production-grade SwiftUI interfaces that follow Apple Human Interface Guidelines and avoid generic aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Design Direction

Commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Platform**: Which Apple platform? (iOS, macOS, iPadOS, watchOS, tvOS)
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work—the key is intentionality, not intensity.

Then implement working code that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail
- Following Apple Human Interface Guidelines

## SwiftUI Design Guidelines

### Typography

→ *Consult [typography reference](reference/typography.md) for scales, pairing, and Dynamic Type strategies.*

Use SwiftUI's semantic typography. Create hierarchy through weight, size, and color.

**DO**: Use semantic font styles (.headline, .body, .caption, .title)
**DO**: Support Dynamic Type for accessibility
**DO**: Create clear typographic hierarchy with 2-3 sizes
**DON'T**: Hard-code font sizes when semantic styles work
**DON'T**: Use more than 2-3 font sizes in a single view
**DON'T**: Ignore Dynamic Type—test at accessibility sizes

```swift
// Good: Semantic typography
Text("Title")
    .font(.headline)
Text("Body")
    .font(.body)
Text("Caption")
    .font(.caption)
    .foregroundStyle(.secondary)
```

### Color & Theme

→ *Consult [color reference](reference/color-and-contrast.md) for asset catalogs, semantic colors, and dark mode.*

Commit to a cohesive palette. Use system semantic colors and asset catalogs.

**DO**: Use asset catalog for brand colors with light/dark variants
**DO**: Use semantic colors (.primary, .secondary, .accentColor, .tint)
**DO**: Test in both light and dark mode
**DON'T**: Hard-code hex colors in code
**DON'T**: Use saturated colors for text on colored backgrounds
**DON'T**: Forget about colorblind users—don't rely on color alone

```swift
// Good: Semantic colors from asset catalog
extension Color {
    static let brandPrimary = Color("BrandPrimary")
}

Text("Title")
    .foregroundStyle(.primary) // Adapts to mode
```

### Layout & Space

→ *Consult [spatial reference](reference/spatial-design.md) for grids, rhythm, and safe areas.*

Create visual rhythm through varied spacing. Use SwiftUI's built-in spacing and padding.

**DO**: Use consistent spacing values (8, 16, 24, 32)
**DO**: Use semantic padding (.padding() for default)
**DO**: Respect safe areas with .safeAreaPadding()
**DON'T**: Use arbitrary spacing values
**DON'T**: Forget landscape orientation
**DON'T**: Ignore different device sizes

```swift
// Good: Consistent spacing
VStack(spacing: 16) {
    HeaderView()
    ContentView()
}
.padding()
```

### Visual Details

**DO**: Use SF Symbols for icons—they're consistent and semantic
**DO**: Use materials (.ultraThinMaterial) for depth
**DO**: Apply subtle shadows intentionally
**DON'T**: Overuse visual effects
**DON'T**: Add decorations without purpose
**DON'T**: Use custom shapes when system shapes work

```swift
// Good: Intentional visual depth
ContentView()
    .background(.ultraThinMaterial)
    .clipShape(RoundedRectangle(cornerRadius: 12))
```

### Motion

→ *Consult [motion reference](reference/motion-design.md) for timing, easing, and reduced motion.*

Focus on high-impact moments: one well-orchestrated transition creates more delight than scattered animations.

**DO**: Use spring animations for natural feel
**DO**: Respect `accessibilityReduceMotion`
**DO**: Keep feedback animations short (0.1-0.3s)
**DON'T**: Animate layout properties—use transforms
**DON'T**: Use bounce or elastic curves
**DON'T**: Animate everything

```swift
// Good: Natural spring animation
.animation(.spring(response: 0.3, dampingFraction: 0.75), value: state)

// Handle reduced motion
@Environment(\.accessibilityReduceMotion) var reduceMotion
.animation(reduceMotion ? .none : .spring(), value: state)
```

### Interaction

→ *Consult [interaction reference](reference/interaction-design.md) for forms, focus, and loading patterns.*

Make interactions feel fast. Use SwiftUI's built-in interaction patterns.

**DO**: Use semantic button styles (.borderedProminent, .bordered)
**DO**: Provide loading states with ProgressView
**DO**: Design empty states that guide action
**DON'T**: Create custom button styles when system styles work
**DON'T**: Block interaction unnecessarily
**DON'T**: Forget keyboard interactions on macOS

```swift
// Good: Semantic button styles
Button("Save") { }
    .buttonStyle(.borderedProminent)
Button("Cancel") { }
    .buttonStyle(.bordered)
```

### Platform Conventions

→ *Consult [platform reference](reference/responsive-design.md) for iOS, macOS, and iPadOS patterns.*

**DO**: Use TabView for iOS navigation
**DO**: Use NavigationSplitView for iPad/macOS
**DO**: Support platform-specific features (keyboard shortcuts on macOS)
**DON'T**: Mix platform patterns (iOS nav on macOS)
**DON'T**: Forget about different device sizes
**DON'T**: Ignore platform-specific interactions

```swift
// iOS: Tab bar
TabView {
    HomeView()
        .tabItem { Label("Home", systemImage: "house") }
}

// macOS: Sidebar navigation
NavigationSplitView {
    SidebarView()
} detail: {
    DetailView()
}
```

### UX Writing

→ *Consult [ux-writing reference](reference/ux-writing.md) for labels, errors, and empty states.*

**DO**: Use specific button labels ("Save Changes" not "OK")
**DO**: Write helpful error messages
**DO**: Use String Catalogs for localization
**DON'T**: Use generic labels
**DON'T**: Blame users in error messages
**DON'T**: Repeat information

---

## The Generic Design Test

**Critical quality check**: If you showed this interface to someone and said "a beginner made this," would they believe you immediately? If yes, that's the problem.

A distinctive interface should make someone ask "how was this made?" not "which tutorial did they follow?"

Review the DON'T guidelines above—they are the fingerprints of generic, template-like SwiftUI work.

---

## Implementation Principles

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate views with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different aesthetics, and platform conventions. NEVER converge on common choices across generations.

Remember: SwiftUI is capable of extraordinary creative work. Don't hold back—show what can truly be created when thinking outside the box and committing fully to a distinctive vision while following Apple Human Interface Guidelines.
