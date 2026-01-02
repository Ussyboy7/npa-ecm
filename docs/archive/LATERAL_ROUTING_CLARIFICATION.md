# Lateral Routing - Cross-Organizational Boundaries

## Clarification

Lateral routing now explicitly supports routing across **any organizational boundaries**:
- ✅ Different **departments**
- ✅ Different **divisions**
- ✅ Different **directorates**

## Examples

### Example 1: AGM SA&DM → AGM Procurement
**Scenario:**
- **Sender**: AGM SA&DM
  - Department: SA&DM
  - Division: Division A
  - Directorate: Directorate X
- **Recipient**: AGM Procurement
  - Department: Procurement
  - Division: Division B (different from Division A)
  - Directorate: Directorate Y (different from Directorate X)

**Result**: ✅ **Allowed** (peer-to-peer lateral routing across divisions and directorates)

### Example 2: GM ICT → GM Servicom
**Scenario:**
- **Sender**: GM ICT
  - Division: ICT Division
  - Directorate: Directorate A
- **Recipient**: GM Servicom
  - Division: Servicom Division (different from ICT)
  - Directorate: Directorate B (different from Directorate A)

**Result**: ✅ **Allowed** (peer-to-peer lateral routing across divisions and directorates)

### Example 3: AGM SA&DM → GM Procurement
**Scenario:**
- **Sender**: AGM SA&DM
  - Department: SA&DM
  - Division: Division A
  - Directorate: Directorate X
- **Recipient**: GM Procurement
  - Division: Procurement Division (different from Division A)
  - Directorate: Directorate Y (different from Directorate X)

**Result**: ✅ **Allowed** (cross-tier lateral routing across divisions and directorates)

## Implementation Details

### Code Logic
The lateral routing logic does **NOT** check for:
- ❌ Same division
- ❌ Same directorate
- ❌ Same department

It **ONLY** checks for:
- ✅ Same grade level (for peer-to-peer)
- ✅ `allow_lateral_routing = true` on sender's office
- ✅ User is active
- ✅ User hasn't already acted on the correspondence

### Key Code Snippet
```typescript
// Lateral routing: same grade level, can be different department/division/directorate
// Examples: AGM SA&DM → AGM Procurement (different departments, divisions, or directorates)
//           GM ICT → GM Servicom (different divisions or directorates)
if (canRouteLaterally && user.gradeLevel === currentUser?.gradeLevel) {
  // AGM to AGM, GM to GM (peer-to-peer across any organizational boundaries)
  return true;
}
```

## Benefits

1. **Flexibility**: Executives can route to peers across the entire organization
2. **Collaboration**: Enables cross-functional communication
3. **Efficiency**: No need to route through hierarchy for peer-to-peer communication
4. **Controlled**: Still respects `allow_lateral_routing` office setting

## Configuration

- **Default**: `allow_lateral_routing = true` (enabled)
- **To Disable**: Set `office.allow_lateral_routing = False` for specific offices
- **Location**: `backend/organization/models.py` → `Office.allow_lateral_routing`

## Notes

- Lateral routing works in **both directions** (downward and upward)
- Still validates that users are in their target offices
- Prevents routing loops (users who already acted are excluded)
- Works with parallel routing

