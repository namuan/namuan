# Feature: <Feature Name>

## Objective
- <What problem this feature solves>
- <Primary business/user outcome>

## Actors
- <Actor Name>: <permissions and constraints>
- <Actor Name>: <permissions and constraints>

## Scenarios
### SC-001: <Scenario name>
- Given: <initial state>
- When: <action/event>
- Then:
  - <expected outcome>
  - <expected status/error code if applicable>

### SC-002: <Scenario name>
- Given: <initial state>
- When: <action/event>
- Then:
  - <expected outcome>

## Error and Edge Behavior
- <Invalid input behavior>
- <Unauthorized behavior>
- <Conflict/not found/rate limit behavior>

## Data Models
### <Model Name>
| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| <field_name> | <string/number/integer/boolean/array/object> | <true/false> | <e.g., maxLength=100> |

## Assumptions (optional)
- <assumption>

## Non-Functional Requirements (optional)
- <latency/availability/security/compliance requirement>