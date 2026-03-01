# Platform & Device Adaptation

## Size Classes: The Foundation

**Use size classes, not device detection.** SwiftUI provides horizontal and vertical size classes.

```swift
@Environment(\.horizontalSizeClass) var horizontalSizeClass
@Environment(\.verticalSizeClass) var verticalSizeClass

var body: some View {
    if horizontalSizeClass == .compact {
        // iPhone portrait, compact layout
        CompactLayout()
    } else {
        // iPad, iPhone landscape, regular layout
        RegularLayout()
    }
}
```

## Platform-Specific Code

**Use conditional compilation:**

```swift
#if os(iOS)
ContentView()
    .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
            Button("Add", systemImage: "plus") { }
        }
    }
#elseif os(macOS)
ContentView()
    .toolbar {
        ToolbarItem(placement: .primaryAction) {
            Button("Add", systemImage: "plus") { }
        }
    }
    .frame(minWidth: 600, minHeight: 400)
#elseif os(watchOS)
ContentView()
    .toolbar {
        ToolbarItem(placement: .topBarLeading) {
            Button("Add", systemImage: "plus") { }
        }
    }
#endif
```

## Navigation Patterns by Platform

### iOS: Tab Bar

```swift
TabView(selection: $selectedTab) {
    HomeView()
        .tabItem { Label("Home", systemImage: "house") }
        .tag(Tab.home)
    
    SearchView()
        .tabItem { Label("Search", systemImage: "magnifyingglass") }
        .tag(Tab.search)
    
    ProfileView()
        .tabItem { Label("Profile", systemImage: "person") }
        .tag(Tab.profile)
}
```

### iPadOS/macOS: Split View

```swift
NavigationSplitView {
    // Sidebar
    List(selection: $selectedItem) {
        Section("Library") {
            Label("All Items", systemImage: "folder")
            Label("Recent", systemImage: "clock")
        }
    }
    .navigationTitle("Library")
} detail: {
    // Detail
    if let item = selectedItem {
        DetailView(item: item)
    } else {
        Text("Select an item")
            .foregroundStyle(.secondary)
    }
}
```

## Device Idiom Detection

```swift
@Environment(\.idiom) var idiom

var body: some View {
    switch idiom {
    case .phone:
        PhoneLayout()
    case .pad:
        PadLayout()
    case .mac:
        MacLayout()
    case .watch:
        WatchLayout()
    case .tv:
        TVLayout()
    default:
        DefaultLayout()
    }
}
```

## Dynamic Type Support

**Always support Dynamic Type for accessibility:**

```swift
// Use semantic font styles - they scale automatically
Text("Title")
    .font(.headline) // Scales with Dynamic Type

Text("Body")
    .font(.body)

// For custom fonts, scale manually
@ScaledMetric(relativeTo: .body) var fontSize: CGFloat = 16

Text("Custom Font")
    .font(.custom("CustomFont", size: fontSize))

// Test with accessibility sizes
// Settings > Accessibility > Display & Text Size > Larger Text
```

## Safe Areas

**Handle notches and home indicators:**

```swift
ContentView()
    .safeAreaPadding() // Adds padding for safe areas

// Or read safe area directly
@Environment(\.safeAreaInsets) var safeAreaInsets

// For full-bleed content with safe area handling
Image("background")
    .ignoresSafeArea()
    .overlay {
        ContentView()
            .safeAreaPadding()
    }
```

## Orientation Support

**Test both orientations:**

```swift
@Environment(\.verticalSizeClass) var verticalSizeClass

var body: some View {
    if verticalSizeClass == .compact {
        // Landscape
        HStack {
            SidebarView()
            DetailView()
        }
    } else {
        // Portrait
        VStack {
            DetailView()
        }
    }
}
```

## Window Size on macOS

```swift
WindowGroup {
    ContentView()
}
.defaultSize(width: 800, height: 600)
.windowResizability(.contentSize) // Or .automatic

// Read window size
@Environment(\.controlSize) var controlSize

// Or with GeometryReader
GeometryReader { geometry in
    let width = geometry.size.width
    // Adapt based on width
}
```

## Multi-Window Support (iPad/macOS)

```swift
// Open new window
#if os(macOS) || os(visionOS)
Button("New Window") {
    openWindow(id: "document", value: document.id)
}
#endif

// Register window in App
WindowGroup(for: Document.ID.self) { $documentID in
    if let documentID {
        DocumentView(document: documentID)
    }
}
```

## Keyboard Shortcuts (macOS)

```swift
Button("Save") { save() }
    .keyboardShortcut("s", modifiers: .command)

Button("New") { newItem() }
    .keyboardShortcut("n", modifiers: .command)

Button("Close") { close() }
    .keyboardShortcut("w", modifiers: .command)

// In menus
.commands {
    CommandGroup(replacing: .newItem) {
        Button("New Document", systemImage: "doc.badge.plus") { }
            .keyboardShortcut("n", modifiers: .command)
    }
}
```

## Touch vs Pointer Input

**Use interaction type to detect input method:**

```swift
@Environment(\.interactionType) var interactionType

// Or for hover effects
Button("Action") { }
    .onHover { isHovering in
        withAnimation {
            isHighlighted = isHovering
        }
    }
```

## Testing: Don't Trust Simulator Alone

Simulator misses:

- Actual touch interactions
- Real CPU/memory constraints
- Haptic feedback
- Dynamic Type at extreme sizes
- VoiceOver navigation

**Test on at least**: One real iPhone, one real iPad, real Mac. Older devices reveal performance issues.

---

**Avoid**: Device detection instead of size classes. Forgetting landscape orientation. Ignoring different device sizes. Platform anti-patterns (iOS nav on macOS).
