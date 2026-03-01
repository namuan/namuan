# Feature: User Profile Editing

## Objective
- Allow authorized users to edit profile attributes.
- Prevent unauthorized profile edits.

## Actors
- User: authenticated user can edit only their own profile.
- Admin: authenticated admin can edit any non-admin user profile.

## Scenarios
### SC-001: User edits own profile
- Given: Actor is User and is viewing own profile.
- When: User updates `name` to a valid string.
- Then:
  - System accepts update.
  - User profile `name` is persisted.
  - Response is `200 OK`.

### SC-002: Admin edits another user's profile
- Given: Actor is Admin and target is another user profile.
- When: Admin updates `bio`.
- Then:
  - System accepts update.
  - Target profile `bio` is persisted.
  - Response is `200 OK`.

### SC-003: User edits another user's profile
- Given: Actor is User and target is a different user profile.
- When: User attempts any profile update.
- Then:
  - System rejects update.
  - Profile data remains unchanged.
  - Response is `403 Forbidden`.

## Error and Edge Behavior
- Invalid field payload returns `400 Bad Request`.
- Unknown target profile returns `404 Not Found`.

## Data Models
### UserProfile
| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| name | string | true | maxLength=100 |
| bio | string | false | maxLength=500 |