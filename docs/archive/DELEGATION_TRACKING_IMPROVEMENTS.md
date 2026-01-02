# Delegation Tracking Improvements

## Current State

### Secretary-Executive Relationship
- **Status**: Implicit relationship through office membership
- **Tracking**: `acted_by_secretary` flag on minutes
- **Limitation**: No explicit model linking secretaries to specific executives

### Assistant-Executive Relationship
- **Status**: Explicit relationship through `Delegation` model
- **Tracking**: `acted_by_assistant` flag + `assistant_type` on minutes
- **Strengths**: Clear principal-assistant relationship, configurable permissions

---

## Proposed Improvements

### 1. **Secretary-Executive Relationship Tracking**

#### Option A: Office-Based (Current - Keep)
**Approach**: Secretaries support executives in the same office
- ✅ Simple, no additional model needed
- ✅ Aligns with organizational structure
- ❌ Less explicit than assistant relationships

#### Option B: Explicit Secretary Assignment Model
**Approach**: Create `SecretaryAssignment` model similar to `Delegation`
```python
class SecretaryAssignment(UUIDModel, TimeStampedModel):
    """Explicit assignment of secretary to executive(s)."""
    secretary = models.ForeignKey(User, related_name="secretary_assignments")
    executive = models.ForeignKey(User, related_name="secretary_support")
    office = models.ForeignKey(Office, related_name="secretary_assignments")
    can_approve = models.BooleanField(default=False)
    can_distribute = models.BooleanField(default=True)
    active = models.BooleanField(default=True)
    starts_at = models.DateField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)
```

**Pros**:
- ✅ Explicit relationship tracking
- ✅ Can support multiple executives per secretary
- ✅ Can track assignment dates and permissions

**Cons**:
- ❌ Additional model complexity
- ❌ May duplicate office membership information

#### Option C: Enhanced Office Membership (Recommended)
**Approach**: Use existing `OfficeMembership` with enhanced tracking
- Add `supports_executive` field to link secretary to specific executive
- Add `secretary_permissions` JSONField for configurable permissions
- Leverage existing `assignment_role: "SECRETARIAT"`

**Implementation**:
```python
# In OfficeMembership model
supports_executive = models.ForeignKey(
    User,
    null=True,
    blank=True,
    related_name="supported_by_secretaries",
    help_text="Executive this secretary supports (if specific)"
)
secretary_permissions = models.JSONField(
    default=dict,
    help_text="Configurable permissions for this secretary assignment"
)
```

---

### 2. **Enhanced Audit Trail**

#### Current Tracking
- ✅ `acted_by_secretary` flag
- ✅ `performed_by` field (actual user)
- ✅ `user` field (appears to be from)

#### Proposed Enhancements
1. **Relationship Type Indicator**
   - Add `relationship_type` field: "secretary" | "assistant" | "direct"
   - Makes audit trail clearer

2. **Executive Context**
   - Store `executive_id` on minutes when acted by secretary/assistant
   - Makes it easier to query "all actions for executive X"

3. **Delegation Reference**
   - Link minutes to `Delegation` or `SecretaryAssignment` when applicable
   - Provides full context of the delegation

---

### 3. **UI Improvements**

#### Secretary Relationship Display
- Show which executive(s) a secretary supports
- Display office-based vs explicit assignments
- Show active/inactive status

#### Assistant Relationship Display
- Already implemented through `AssistantAssignmentModal`
- Could enhance with better visualization

#### Audit Trail Visibility
- Filter by relationship type (secretary vs assistant)
- Show delegation context in minute details
- Display executive context for secretary actions

---

### 4. **Analytics Enhancements**

#### Current
- Tracks secretary actions separately in analytics
- `rolePerformance` includes "Secretary" role

#### Proposed
- Track secretary-to-executive relationships
- Measure secretary efficiency per executive
- Compare secretary vs assistant performance
- Report on delegation patterns

---

## Recommended Implementation Plan

### Phase 1: Enhanced Office Membership (Low Risk)
1. Add `supports_executive` field to `OfficeMembership`
2. Update secretary assignment UI to allow linking to specific executive
3. Enhance minute creation to capture executive context
4. Update audit trail to show executive context

### Phase 2: Relationship Tracking (Medium Risk)
1. Add `relationship_type` to `Minute` model
2. Link minutes to delegation/assignment when applicable
3. Update analytics to track relationships
4. Enhance UI to show relationship context

### Phase 3: Advanced Features (Future)
1. Consider `SecretaryAssignment` model if needed
2. Support multiple executives per secretary
3. Time-based assignment tracking
4. Permission inheritance from executive

---

## Code Changes Required

### Backend
1. **OfficeMembership Model** (`organization/models.py`)
   - Add `supports_executive` ForeignKey
   - Add `secretary_permissions` JSONField

2. **Minute Model** (`correspondence/models.py`)
   - Add `relationship_type` CharField (optional)
   - Add `executive_context` ForeignKey (optional)
   - Add `delegation_reference` ForeignKey (optional)

3. **Views** (`correspondence/views.py`)
   - Update minute creation to capture relationship context
   - Enhance queries to include relationship information

### Frontend
1. **Secretary Assignment UI**
   - Add executive selection when assigning secretary
   - Display secretary-executive relationships
   - Show relationship type in user profiles

2. **Minute Display**
   - Show relationship context (secretary vs assistant)
   - Display executive information for secretary actions
   - Enhanced audit trail visualization

3. **Analytics**
   - Add secretary-executive relationship metrics
   - Compare secretary vs assistant performance
   - Track delegation patterns

---

## Migration Strategy

1. **Backward Compatible**: All new fields should be nullable/optional
2. **Gradual Rollout**: Start with office-based tracking, then add explicit assignments
3. **Data Migration**: Populate `supports_executive` from existing office memberships
4. **UI Updates**: Add new features without breaking existing functionality

---

## Summary

**Current State**: Secretary-executive relationship is implicit through office membership
**Proposed**: Enhance `OfficeMembership` to explicitly track secretary-executive relationships
**Benefits**: 
- Clearer relationship tracking
- Better audit trail
- Enhanced analytics
- Improved UI visibility

**Risk Level**: Low (backward compatible changes)
**Effort**: Medium (requires backend and frontend updates)

