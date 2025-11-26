# Lateral/Inter-Department Routing Implementation

## Overview
Added support for lateral and inter-department routing scenarios, allowing executives to route correspondence to peers and cross-tier recipients across different departments, divisions, and directorates.

## Scenarios Supported

### 1. Peer-to-Peer Routing (Same Tier)
- **AGM → AGM**: Different departments, divisions, or directorates
  - Example: AGM SA&DM → AGM HI&S (different departments)
  - Example: AGM SA&DM → AGM Procurement (different departments, divisions, or directorates)
- **GM → GM**: Different divisions or directorates
  - Example: GM ICT → GM Servicom (different divisions)

### 2. Cross-Tier Routing (Different Tiers)
- **AGM → GM**: Different departments, divisions, or directorates
  - Example: AGM SA&DM → GM Procurement (can be different departments, divisions, or directorates)

## Implementation Details

### Frontend Changes (`MinuteModal.tsx`)

#### Updated `getSuggestedApprovers()` Function

**Key Changes:**
1. **Office Permission Check**: 
   - Retrieves current user's primary office
   - Checks `allowLateralRouting` flag
   - Defaults to `true` if office not found

2. **Lateral Routing Logic (Downward)**:
   ```typescript
   // Same division (hierarchical routing)
   if (user.division === currentDivisionId) return true;
   
   // Lateral routing: same grade level, can be different department/division/directorate
   // Examples: AGM SA&DM → AGM Procurement (different departments, divisions, or directorates)
   //           GM ICT → GM Servicom (different divisions or directorates)
   if (canRouteLaterally && user.gradeLevel === currentUser?.gradeLevel) {
     // AGM to AGM, GM to GM (peer-to-peer across any organizational boundaries)
     return true;
   }
   
   // Cross-tier routing: AGM can route to GM (one level up in hierarchy)
   // Can be different departments, divisions, or directorates
   if (canRouteLaterally && currentUser?.gradeLevel === 'AGMCS' && user.gradeLevel === 'GMCS') {
     return true;
   }
   ```

3. **Lateral Routing Logic (Upward)**:
   - Standard upward routing (same division/directorate)
   - Lateral routing: same grade level, different departments/divisions
   - Cross-tier routing: AGM → GM

### Backend Support

The backend already supports these scenarios through:
- `Office.allow_lateral_routing` field (default: `true`)
- `Minute.to_user` field for precise recipient tracking
- Office validation in routing endpoints

## Configuration

### Office Settings
Each office has an `allow_lateral_routing` field:
- **Default**: `true` (enabled)
- **Purpose**: Controls whether the office can route to peer offices at the same tier
- **Location**: `backend/organization/models.py` → `Office.allow_lateral_routing`

### Disabling Lateral Routing
To disable lateral routing for a specific office:
```python
office.allow_lateral_routing = False
office.save()
```

## User Experience

### Routing Flow
1. User opens Minute Modal
2. System checks user's primary office `allow_lateral_routing` setting
3. If enabled, suggests:
   - Standard hierarchical routing (same division)
   - Lateral routing candidates (same tier, different departments)
   - Cross-tier routing candidates (AGM → GM)
4. User selects recipient
5. System validates recipient is in their office
6. Routes correspondence

### Display
- Always shows: "User Name • Office Name"
- Example: "AGM HI&S Name • AGM HI&S Office"

## Testing Checklist

- [x] AGM → AGM (same tier, different departments)
- [x] GM → GM (same tier, different divisions)
- [x] AGM → GM (cross-tier, different departments)
- [x] Respects `allow_lateral_routing` office setting
- [x] Validates user is in target office
- [x] Prevents routing to users who already acted
- [x] Works in both downward and upward directions

## Examples

### Example 1: AGM SA&DM → AGM HI&S
```
Sender: AGM SA&DM (Department: SA&DM)
Recipient: AGM HI&S (Department: HI&S)
Type: Lateral (peer-to-peer)
Requirement: allow_lateral_routing = true on AGM SA&DM office
Result: ✅ Allowed
```

### Example 1b: AGM SA&DM → AGM Procurement (Different Divisions/Directorates)
```
Sender: AGM SA&DM (Department: SA&DM, Division: X, Directorate: Y)
Recipient: AGM Procurement (Department: Procurement, Division: Z, Directorate: W)
Type: Lateral (peer-to-peer across divisions/directorates)
Requirement: allow_lateral_routing = true on AGM SA&DM office
Result: ✅ Allowed (works across any organizational boundaries)
```

### Example 2: GM ICT → GM Servicom
```
Sender: GM ICT (Division: ICT)
Recipient: GM Servicom (Division: Servicom)
Type: Lateral (peer-to-peer)
Requirement: allow_lateral_routing = true on GM ICT office
Result: ✅ Allowed
```

### Example 3: AGM SA&DM → GM Procurement
```
Sender: AGM SA&DM (Department: SA&DM)
Recipient: GM Procurement (Division: Procurement)
Type: Cross-tier (AGM → GM)
Requirement: allow_lateral_routing = true on AGM SA&DM office
Result: ✅ Allowed
```

## Notes

1. **Lateral routing is enabled by default** for all offices
2. **Cross-tier routing** currently supports AGM → GM only
3. **User validation** still applies - user must be in the target office
4. **Prevents loops** - users who already acted are excluded
5. **Works with parallel routing** - lateral routing candidates can be selected for parallel routes

## Future Enhancements

- [ ] Add more cross-tier routing options (e.g., GM → ED)
- [ ] Visual indicator in UI for lateral routing candidates
- [ ] Routing path visualization showing lateral vs hierarchical routes
- [ ] Analytics for lateral routing patterns

