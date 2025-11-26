# Routing Hierarchy - Implementation Guide

## Hierarchy Structure

```
MD (Managing Director)
  └── ED (Executive Director) - per Directorate
       └── GM (General Manager) - per Division
            └── AGM (Assistant General Manager) - per Department
                 └── Staff
```

## Routing Rules

### 1. Office-Level Routing (Executive Level)

#### Downward Routing
- **MD → AGM**: Direct routing to AGM office
- **MD → GM → AGM**: Through division (if GM office exists)
- **MD → ED → GM → AGM**: Through directorate (if ED office exists)

**Example:**
- MD wants to send to AGM ICT
- MD searches for "AGM ICT" officer name
- Selects the user
- System validates user is in AGM ICT office
- Routes to that user, displays "AGM Name (AGM ICT Office)"

#### Upward Routing
- **AGM → GM → ED → MD**: If offices are in different directorates
- **AGM → GM → MD**: If offices are in same directorate (skips ED)

**Path Determination:**
- System checks `office.directorate` for both sender and recipient
- If same directorate: AGM → GM → MD
- If different directorates: AGM → GM → ED → MD

### 2. Lateral/Inter-Department Routing

#### Peer-to-Peer Routing (Same Tier)
- **AGM → AGM**: Different departments, divisions, or directorates
  - Example: AGM SA&DM → AGM HI&S (different departments)
  - Example: AGM SA&DM → AGM Procurement (different departments, divisions, or directorates)
  - Requires `allow_lateral_routing = true` on sender's office
- **GM → GM**: Different divisions or directorates
  - Example: GM ICT → GM Servicom (different divisions)
  - Requires `allow_lateral_routing = true` on sender's office

#### Cross-Tier Routing (Different Tiers)
- **AGM → GM**: Different departments, divisions, or directorates
  - Example: AGM SA&DM → GM Procurement (can be different departments, divisions, or directorates)
  - Requires `allow_lateral_routing = true` on sender's office
  - Allows AGM to route to GM (one level up in hierarchy)

**Lateral Routing Rules:**
- Controlled by `Office.allow_lateral_routing` field
- Default: `true` (enabled by default)
- Can be disabled per office if needed
- Applies to both downward and upward routing directions

### 3. User-Level Routing (Department Level)

#### AGM → Staff
- AGM can send directly to staff members
- This is **user-to-user** routing
- Still validates user is in their primary office
- Display: "Staff Name (Department Office)"

#### Staff → AGM
- Staff can send upward to their AGM
- User-to-user routing
- Display: "AGM Name (AGM Office)"

## Implementation Details

### Office-Level Routing Logic
```python
# When routing to office:
1. User selects recipient (by name search)
2. System validates: user is in specified office
3. If valid:
   - Set to_user = selected user
   - Set to_office = user's office
   - Route to that user
   - Display: "User Name (Office Name)"
4. If invalid:
   - Show error: "User is not a member of Office X"
```

### User-Level Routing Logic
```python
# When routing user-to-user (AGM ↔ Staff):
1. User selects recipient directly
2. System validates: user is in their primary office
3. Set to_user = selected user
4. Set to_office = user's primary office
5. Route directly to that user
6. Display: "User Name (Office Name)"
```

### Hierarchy Path Calculation
```python
# For upward routing:
def calculate_routing_path(from_office, to_office):
    if from_office.directorate == to_office.directorate:
        # Same directorate: skip ED
        return [from_office, GM_office, MD_office]
    else:
        # Different directorates: include ED
        return [from_office, GM_office, ED_office, MD_office]
```

## Current Implementation Status

✅ **Completed:**
- User validation in office
- Office head fallback (principal → acting → highest grade)
- `to_user` field added to Minute model
- Migration applied successfully
- Frontend validation
- Display shows "User Name • Office Name"
- **Lateral routing support** (AGM → AGM, GM → GM)
- **Cross-tier routing** (AGM → GM)
- **Lateral routing permission check** (`allow_lateral_routing`)

⚠️ **To Implement:**
- Hierarchy path calculation for upward routing
- Directorate-based routing path determination
- Visual indication of routing path in UI

## Testing Scenarios

1. **MD → AGM (Office-level, downward)**
   - MD selects AGM ICT officer
   - Validates user is in AGM ICT office
   - Routes to that user
   - Shows: "AGM Name (AGM ICT Office)"

2. **AGM → GM → MD (Office-level, upward, same directorate)**
   - AGM sends upward
   - System determines path: AGM → GM → MD (skips ED)
   - Routes through hierarchy

3. **AGM → GM → ED → MD (Office-level, upward, different directorates)**
   - AGM sends upward
   - System determines path: AGM → GM → ED → MD
   - Routes through hierarchy

4. **AGM → Staff (User-level)**
   - AGM selects staff member
   - Routes directly to that user
   - Shows: "Staff Name (Department Office)"

5. **Staff → AGM (User-level, upward)**
   - Staff selects their AGM
   - Routes directly to AGM
   - Shows: "AGM Name (AGM Office)"

6. **AGM SA&DM → AGM HI&S (Lateral, peer-to-peer)**
   - AGM SA&DM selects AGM HI&S
   - Both are AGM level (same tier)
   - Different departments
   - Requires `allow_lateral_routing = true` on AGM SA&DM office
   - Routes directly, shows: "AGM HI&S Name (AGM HI&S Office)"

6b. **AGM SA&DM → AGM Procurement (Lateral, peer-to-peer, cross-division/directorate)**
   - AGM SA&DM selects AGM Procurement
   - Both are AGM level (same tier)
   - Different departments, divisions, or directorates
   - Requires `allow_lateral_routing = true` on AGM SA&DM office
   - Routes directly, shows: "AGM Procurement Name (AGM Procurement Office)"

7. **GM ICT → GM Servicom (Lateral, peer-to-peer)**
   - GM ICT selects GM Servicom
   - Both are GM level (same tier)
   - Different divisions
   - Requires `allow_lateral_routing = true` on GM ICT office
   - Routes directly, shows: "GM Servicom Name (GM Servicom Office)"

8. **AGM SA&DM → GM Procurement (Cross-tier, lateral)**
   - AGM SA&DM selects GM Procurement
   - Different tiers (AGM → GM)
   - Different departments
   - Requires `allow_lateral_routing = true` on AGM SA&DM office
   - Routes directly, shows: "GM Procurement Name (GM Procurement Office)"

