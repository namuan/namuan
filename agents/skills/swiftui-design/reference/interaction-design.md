# Interaction Design

## The Eight Interactive States

Every interactive element needs these states designed:

| State | When | SwiftUI Handling |
|-------|------|------------------|
| **Default** | At rest | Base styling |
| **Pressed** | Being tapped | `.buttonStyle()` handles automatically |
| **Focused** | Keyboard focus (macOS) | `.focusable()` and focus effects |
| **Disabled** | Not interactive | `.disabled()` handles automatically |
| **Loading** | Processing | ProgressView, conditional rendering |
| **Error** | Invalid state | Red border, icon, message |
| **Success** | Completed | Green check, confirmation |

**The common miss**: Forgetting loading and error states. Every async action needs visual feedback.

## Button Styles

**Use SwiftUI's semantic button styles:**

```swift
// Primary action
Button("Save") { }
    .buttonStyle(.borderedProminent)

// Secondary action
Button("Cancel") { }
    .buttonStyle(.bordered)

// Destructive action
Button("Delete", role: .destructive) { }
    .buttonStyle(.borderedProminent)

// Tertiary/ghost action
Button("Learn More") { }
    .buttonStyle(.plain)
```

**Custom button style when needed:**

```swift
struct CustomButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}
```

## Focus Management

### macOS Focus

```swift
// Make view focusable
Button("Action") { }
    .focusable()

// Focus border
Button("Action") { }
    .focusable()
    .focusEffectDisabled() // If you want custom focus indicator

// Focus state
@FocusState private var isFocused: Bool

TextField("Input", text: $text)
    .focused($isFocused)

Button("Focus") {
    isFocused = true
}
```

### Focus Ring Design
- Use system default focus indicators
- High contrast (visible in all modes)
- Consistent across all interactive elements

## Form Design

**Labels should always be visible:**

```swift
// Good: Visible label
VStack(alignment: .leading) {
    Text("Email Address")
        .font(.headline)
    TextField("name@example.com", text: $email)
        .textFieldStyle(.roundedBorder)
}

// Or use LabeledContent
LabeledContent("Email Address") {
    TextField("name@example.com", text: $email)
}

// Or use Form styling
Form {
    Section("Account") {
        TextField("Email", text: $email)
        SecureField("Password", text: $password)
    }
}
```

**Validation on appropriate trigger:**
```swift
// Validate on submit or blur, not every keystroke
TextField("Email", text: $email)
    .textInputAutocapitalization(.never)
    .keyboardType(.emailAddress)
    .onSubmit {
        validateEmail()
    }
```

## Loading States

**Skeleton screens > generic spinners:**

```swift
// Skeleton loading
struct SkeletonView: View {
    var body: some View {
        VStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.3))
                .frame(height: 24)
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.3))
                .frame(height: 16)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .redacted(reason: .placeholder)
    }
}

// Conditional loading state
if isLoading {
    SkeletonView()
} else {
    ContentView()
}
```

## Alerts & Dialogs

**Use semantic APIs:**

```swift
// Alert
.alert("Unable to Save", isPresented: $showError) {
    Button("Try Again") { retry() }
    Button("Cancel", role: .cancel) { }
} message: {
    Text("Check your connection and try again.")
}

// Confirmation dialog (action sheet)
.confirmationDialog(
    "Delete Item?",
    isPresented: $showingDelete,
    titleVisibility: .visible
) {
    Button("Delete", role: .destructive) { delete() }
    Button("Cancel", role: .cancel) { }
} message: {
    Text("This action cannot be undone.")
}
```

## Sheets & Full-Screen Covers

```swift
// Sheet for modal content
.sheet(isPresented: $showSheet) {
    DetailView()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
}

// Full-screen cover for immersive content
.fullScreenCover(isPresented: $showFullScreen) {
    ImmersiveView()
}
```

## Context Menus

```swift
// Context menu
Text("Item")
    .contextMenu {
        Button("Edit", systemImage: "pencil") { }
        Button("Duplicate", systemImage: "doc.on.doc") { }
        Divider()
        Button("Delete", role: .destructive, systemImage: "trash") { }
    }
```

## Destructive Actions: Undo > Confirm

**Undo is better than confirmation dialogs.** Remove from UI immediately, show undo toast:

```swift
// Undo toast pattern
@State private var showUndoToast = false
@State private var deletedItem: Item?

func delete(_ item: Item) {
    deletedItem = item
    items.removeAll { $0.id == item.id }
    showUndoToast = true
}

func undo() {
    if let item = deletedItem {
        items.append(item)
        deletedItem = nil
    }
    showUndoToast = false
}

// Toast overlay
.overlay(alignment: .bottom) {
    if showUndoToast {
        HStack {
            Text("Item deleted")
            Spacer()
            Button("Undo") { undo() }
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding()
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}
```

## Keyboard Navigation (macOS)

```swift
// Keyboard shortcuts
Button("Save") { save() }
    .keyboardShortcut("s", modifiers: .command)

Button("New") { newDocument() }
    .keyboardShortcut("n", modifiers: .command)

// Focus navigation
@FocusState private var focusedField: Field?

enum Field: Hashable {
    case email, password
}

TextField("Email", text: $email)
    .focused($focusedField, equals: .email)
    .onSubmit { focusedField = .password }

SecureField("Password", text: $password)
    .focused($focusedField, equals: .password)
    .onSubmit { login() }
```

## Haptic Feedback (iOS)

```swift
// Selection feedback
.sensoryFeedback(.selection, trigger: selectedItem)

// Success feedback
.sensoryFeedback(.success, trigger: operationComplete)

// Error feedback
.sensoryFeedback(.error, trigger: operationFailed)

// Impact feedback
.sensoryFeedback(.impact(weight: .medium), trigger: itemAdded)
```

## Gesture Discoverability

Gestures are invisible. Hint at their existence:

- **Provide visible alternatives**: Menu items for swiped actions
- **Onboarding**: Coach marks on first use
- **Visual hints**: Subtle indicators of swipeable content

```swift
// Always provide menu alternative
List {
    ForEach(items) { item in
        ItemRow(item)
            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                Button(role: .destructive) { delete(item) } label: {
                    Label("Delete", systemImage: "trash")
                }
            }
            .contextMenu {
                Button("Delete", role: .destructive) { delete(item) }
            }
    }
}
```

---

**Avoid**: Missing loading states. Generic error messages. Touch targets <44x44pt. Custom controls without accessibility support. Forgetting keyboard shortcuts on macOS.
