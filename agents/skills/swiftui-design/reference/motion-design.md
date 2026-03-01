# Motion Design

## Duration: The 100/300/500 Rule

Timing matters more than easing. These durations feel right for most SwiftUI UI:

| Duration | Use Case | Examples |
|----------|----------|----------|
| **100-150ms** | Instant feedback | Button press, toggle |
| **200-300ms** | State changes | Menu open, sheet |
| **300-500ms** | Layout changes | Accordion, navigation |
| **500-800ms** | Entrance animations | View load, hero |

**Exit animations are faster than entrances**—use ~75% of enter duration.

## Easing: Pick the Right Curve

**Use spring animations for natural feel.**

```swift
// Gentle spring - most UI elements
.animation(.spring(response: 0.3, dampingFraction: 0.75), value: state)

// Snappy spring - quick interactions
.animation(.spring(response: 0.2, dampingFraction: 0.85), value: state)

// Bouncy spring - playful moments (use sparingly)
.animation(.spring(response: 0.4, dampingFraction: 0.6), value: state)
```

**For specific timing, use ease curves:**

```swift
// Smooth deceleration (recommended)
.animation(.easeOut(duration: 0.3), value: state)

// Smooth acceleration (for exits)
.animation(.easeIn(duration: 0.25), value: state)

// For state toggles
.animation(.easeInOut(duration: 0.3), value: state)
```

**AVOID** - Bounce and elastic curves feel dated. Real objects decelerate smoothly.

## The Properties to Animate

**Transform and opacity are GPU-accelerated:**

```swift
// Good: GPU-accelerated
.scaleEffect(scale)
.opacity(opacity)
.offset(x: offset)
.rotationEffect(angle)

// Bad: Causes layout recalculation
.frame(width: animatedWidth, height: animatedHeight)
.padding(animatedPadding)
```

**For height animations, use frame with ideal size:**

```swift
// Expand/collapse
VStack {
    if isExpanded {
        ExpandedContent()
    }
}
.frame(maxHeight: isExpanded ? .infinity : 0)
.clipped()
.animation(.spring(response: 0.3), value: isExpanded)
```

## Transitions

**Built-in transitions:**

```swift
// Fade
.transition(.opacity)

// Slide
.transition(.slide)
.transition(.move(edge: .bottom))

// Scale
.transition(.scale)

// Combined
.transition(.opacity.combined(with: .move(edge: .trailing)))

// Asymmetric (different insertion/removal)
.transition(.asymmetric(
    insertion: .move(edge: .trailing),
    removal: .opacity
))
```

## Staggered Animations

Use delays for staggered effects:

```swift
ForEach(items.indices, id: \.self) { index in
    ItemView(item: items[index])
        .transition(.opacity.combined(with: .move(edge: .bottom)))
        .animation(.spring(response: 0.3).delay(Double(index) * 0.05), value: showItems)
}
```

**Cap total stagger time**—10 items at 50ms = 500ms total.

## Reduced Motion

**This is not optional.** Support the accessibility setting.

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

var body: some View {
    ContentView()
        .animation(reduceMotion ? .none : .spring(response: 0.3), value: state)
}

// Or use transaction modifier
.transaction { transaction in
    if reduceMotion {
        transaction.animation = nil
    }
}
```

**What to preserve**: Functional animations like progress bars should still work—just without spatial movement.

## Perceived Performance

**Nobody cares how fast your app is—just how fast it feels.**

**The 80ms threshold**: Our brains buffer sensory input for ~80ms. Anything under 80ms feels instant.

**Strategies to improve perceived speed:**

- **Skeleton screens**: Show structure while loading
- **Optimistic updates**: Update UI immediately, sync later
- **Progressive loading**: Show content as it arrives

```swift
// Optimistic update pattern
func toggleFavorite(_ item: Item) {
    // Update UI immediately
    item.isFavorite.toggle()
    
    // Sync in background
    Task {
        do {
            try await api.updateFavorite(item)
        } catch {
            // Revert on failure
            item.isFavorite.toggle()
            showError = true
        }
    }
}
```

**Caution**: Too-fast responses can decrease perceived value. Complex operations may benefit from a brief delay.

## Performance

**Don't use `drawingGroup` preemptively:**

```swift
// Use only for complex static graphics
ZStack {
    ForEach(0..<100) { i in
        Circle()
            .frame(width: CGFloat(i) * 2)
    }
}
.drawingGroup() // Renders once as bitmap
```

**For scroll-triggered animations, use scroll geometry reader:**

```swift
.scrollGeometryReader { geometry in
    let offset = geometry.contentOffset.y
    // Use offset for animations
}
```

---

**Avoid**: Animating everything (animation fatigue is real). Using >500ms for UI feedback. Ignoring `accessibilityReduceMotion`. Using animation to hide slow loading.
