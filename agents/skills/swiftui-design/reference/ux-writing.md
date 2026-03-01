# UX Writing

## The Button Label Problem

**Never use "OK", "Submit", or "Yes/No".** These are lazy and ambiguous. Use specific verb + object patterns:

| Bad | Good | Why |
|-----|------|-----|
| OK | Save Changes | Says what will happen |
| Submit | Create Account | Outcome-focused |
| Yes | Delete Message | Confirms the action |
| Cancel | Keep Editing | Clarifies what "cancel" means |
| Click here | Download PDF | Describes the destination |

**For destructive actions**, name the destruction:
- "Delete" not "Remove" (delete is permanent, remove implies recoverable)
- "Delete 5 Items" not "Delete Selected" (show the count)

```swift
// Good button labels
Button("Save Changes") { save() }
    .buttonStyle(.borderedProminent)

Button("Delete Project", role: .destructive) { delete() }

Button("Keep Editing", role: .cancel) { }
```

## Error Messages: The Formula

Every error message should answer: (1) What happened? (2) Why? (3) How to fix it?

```swift
// Bad
.alert("Error", isPresented: $showError) {
    Button("OK") { }
}

// Good
.alert("Unable to Save", isPresented: $showError) {
    Button("Try Again") { retry() }
    Button("Cancel", role: .cancel) { }
} message: {
    Text("Check your internet connection and try again.")
}
```

### Error Message Templates

| Situation | Template |
|-----------|----------|
| **Format error** | "[Field] needs to be [format]. Example: [example]" |
| **Missing required** | "Please enter [what's missing]" |
| **Permission denied** | "You don't have access to [thing]. [What to do instead]" |
| **Network error** | "Couldn't connect. Check your connection and [action]." |
| **Server error** | "Something went wrong on our end. [Alternative action]" |

### Don't Blame the User

```swift
// Bad
Text("You entered an invalid date")

// Good
Text("Please enter a date in MM/DD/YYYY format")
```

## Empty States Are Opportunities

Empty states are onboarding moments:

1. Acknowledge briefly
2. Explain the value of filling it
3. Provide a clear action

```swift
// Bad
Text("No items")

// Good
VStack(spacing: 16) {
    Image(systemName: "folder.badge.plus")
        .font(.system(size: 48))
        .foregroundStyle(.secondary)
    
    Text("No Projects Yet")
        .font(.headline)
    
    Text("Create your first project to get started.")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    
    Button("Create Project") { }
        .buttonStyle(.borderedProminent)
}
```

## Voice vs Tone

**Voice** is your brand's personality—consistent everywhere.
**Tone** adapts to the moment.

| Moment | Tone Shift |
|--------|------------|
| Success | Celebratory, brief: "Done! Your changes are saved." |
| Error | Empathetic, helpful: "That didn't work. Here's what to try..." |
| Loading | Reassuring: "Saving your work..." |
| Destructive confirm | Serious, clear: "Delete this project? This can't be undone." |

**Never use humor for errors.** Users are already frustrated. Be helpful, not cute.

## Writing for Accessibility

### Labels

```swift
// Icon buttons need labels
Button { } label: {
    Image(systemName: "heart.fill")
}
.accessibilityLabel("Add to favorites")
.accessibilityHint("Double tap to add to favorites")

// Links need standalone meaning
Text("Read our [privacy policy](url) for details.")
// Not: "Click here to read our privacy policy"
```

### Announcements

```swift
// Announce changes to VoiceOver
@AccessibilityFocusState private var focus: AccessibilityFocus?

Text(message)
    .accessibilityFocused($focus, equals: .message)
    .onChange(of: message) { _, newValue in
        if !newValue.isEmpty {
            focus = .message
        }
    }
```

## Writing for Localization

### Plan for Expansion

German text is ~30% longer than English. Allocate space:

| Language | Expansion |
|----------|-----------|
| German | +30% |
| French | +20% |
| Finnish | +30-40% |
| Chinese | -30% (fewer chars, but same width) |

```swift
// Use String Catalogs (xcstrings)
Text("welcome_message")

// NOT string concatenation
Text("You have " + count + " items") // Bad for localization

// Good: Use interpolation
Text("You have \(count) items") // Localizes properly
```

### Localization-Friendly Patterns

- Keep numbers separate ("New messages: 3" not "You have 3 new messages")
- Use full sentences as single strings (word order varies)
- Avoid abbreviations ("5 minutes ago" not "5 mins ago")
- Use String Catalogs for context

```swift
// Use String Catalog with pluralization
Text("^[\(count) item](inflect: true)")

// Or format properly
Text("\(count) \(count == 1 ? "item" : "items")")
```

## Consistency: The Terminology Problem

Pick one term and stick with it:

| Inconsistent | Consistent |
|--------------|------------|
| Delete / Remove / Trash | Delete |
| Settings / Preferences / Options | Settings |
| Sign in / Log in / Enter | Sign in |
| Create / Add / New | Create |

Build a terminology glossary and enforce it. Variety creates confusion.

## Avoid Redundant Copy

If the heading explains it, the intro is redundant. If the button is clear, don't explain it again. Say it once, say it well.

```swift
// Bad: Redundant
VStack {
    Text("Delete Account")
        .font(.headline)
    Text("Delete your account") // Redundant!
    Button("Delete Account") { } // Redundant!
}

// Good: Clean
VStack(spacing: 16) {
    Text("Delete Account")
        .font(.headline)
    Text("This action cannot be undone. All your data will be permanently removed.")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    Button("Delete Account", role: .destructive) { }
}
```

## Loading States

Be specific:

```swift
// Bad
ProgressView()
    .progressViewStyle(.circular)
Text("Loading...")

// Good
ProgressView()
Text("Syncing your data...")

// For long waits
ProgressView()
VStack {
    Text("Processing your upload...")
    Text("This usually takes about 30 seconds")
        .font(.caption)
        .foregroundStyle(.secondary)
}
```

## Confirmation Dialogs: Use Sparingly

Most confirmation dialogs are design failures—consider undo instead. When you must confirm:

- Name the action
- Explain consequences
- Use specific button labels

```swift
.confirmationDialog(
    "Delete Project?",
    isPresented: $showingDelete,
    titleVisibility: .visible
) {
    Button("Delete Project", role: .destructive) { delete() }
    Button("Keep Project", role: .cancel) { }
} message: {
    Text("This will permanently delete '\(projectName)'. This action cannot be undone.")
}
```

---

**Avoid**: Jargon without explanation. Blaming users. Vague errors ("Something went wrong"). Varying terminology. Humor for errors. Long redundant copy.
