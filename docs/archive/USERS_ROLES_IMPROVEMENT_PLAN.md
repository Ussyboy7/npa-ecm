# Users & Roles Module - Improvement Plan

**Date:** January 2025  
**Module:** Users, Roles, and Assistants Management  
**Status:** Implementation Plan

---

## Executive Summary

The Users & Roles module is functional but needs enhancements:
- ✅ **Users Management:** Good foundation, needs bulk operations frontend implementation
- ✅ **Roles Management:** Complete and functional
- ⚠️ **Assistants Management:** Needs clarification on data model (OfficeMembership vs Delegation)

---

## Current State Analysis

### 1. Users Management (`/admin/users`)

**Strengths:**
- ✅ Comprehensive filtering and search
- ✅ Pagination with configurable page size
- ✅ Export to CSV
- ✅ Search autocomplete
- ✅ User edit/create dialog
- ✅ Bulk selection UI exists

**Issues:**
- ⚠️ Bulk operations UI exists but not connected to backend
- ⚠️ Backend has bulk endpoints but frontend doesn't call them
- ⚠️ Missing bulk role assignment
- ⚠️ Missing user import functionality

**Backend Endpoints Available:**
- ✅ `POST /api/v1/accounts/users/bulk-archive/` - Archive users
- ✅ `POST /api/v1/accounts/users/bulk-delete/` - Delete users
- ✅ `POST /api/v1/accounts/users/bulk-activate/` - Activate users
- ✅ `POST /api/v1/accounts/users/bulk-deactivate/` - Deactivate users

### 2. Roles Management (`/admin/roles`)

**Strengths:**
- ✅ Full CRUD operations
- ✅ Permission management
- ✅ User count tracking
- ✅ Role cloning
- ✅ Role templates
- ✅ Bulk role assignment endpoint exists

**Issues:**
- ⚠️ No frontend UI for bulk role assignment
- ⚠️ Permission structure is JSON (could use validation)

**Backend Endpoints Available:**
- ✅ `POST /api/v1/organization/roles/bulk-assign/` - Assign role to multiple users
- ✅ `POST /api/v1/organization/roles/{id}/clone/` - Clone role
- ✅ `GET /api/v1/organization/roles/templates/` - Get role templates
- ✅ `POST /api/v1/organization/roles/create-from-template/` - Create from template

### 3. Assistants Management (`/admin/assistants`)

**Strengths:**
- ✅ Good UI with executive/assistant views
- ✅ TA/PA distinction
- ✅ Permission management
- ✅ Specialization tracking

**Issues:**
- ⚠️ Unclear data model (uses OfficeMembership with SECRETARIAT role vs Delegation model)
- ⚠️ Need to verify backend API endpoints
- ⚠️ May need dedicated AssistantAssignment model

---

## Implementation Plan

### Phase 1: Complete Bulk Operations for Users (Priority: High)

#### 1.1 Connect Frontend to Backend Bulk Endpoints

**File:** `frontend/app/admin/users/page.tsx`

**Changes Needed:**

1. **Add bulk operation handlers:**

```typescript
// Add to UserManagementPageContent component

const handleBulkActivate = async () => {
  if (selectedUserIds.size === 0) {
    toast({
      title: "No users selected",
      description: "Please select at least one user",
      variant: "destructive",
    });
    return;
  }

  try {
    const response = await apiFetch('/accounts/users/bulk-activate/', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: Array.from(selectedUserIds),
      }),
    });

    toast({
      title: "Success",
      description: `Activated ${response.activated_count} user(s)`,
    });

    setSelectedUserIds(new Set());
    setIsBulkActionMode(false);
    await loadUsers();
  } catch (error: any) {
    handleApiError(error, 'Bulk Activate');
  }
};

const handleBulkDeactivate = async () => {
  if (selectedUserIds.size === 0) {
    toast({
      title: "No users selected",
      description: "Please select at least one user",
      variant: "destructive",
    });
    return;
  }

  setShowBulkDeactivateConfirm(true);
};

const confirmBulkDeactivate = async () => {
  try {
    const response = await apiFetch('/accounts/users/bulk-deactivate/', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: Array.from(selectedUserIds),
      }),
    });

    toast({
      title: "Success",
      description: `Deactivated ${response.deactivated_count} user(s)`,
    });

    setSelectedUserIds(new Set());
    setIsBulkActionMode(false);
    setShowBulkDeactivateConfirm(false);
    await loadUsers();
  } catch (error: any) {
    handleApiError(error, 'Bulk Deactivate');
  }
};

const handleBulkArchive = async () => {
  if (selectedUserIds.size === 0) {
    toast({
      title: "No users selected",
      description: "Please select at least one user",
      variant: "destructive",
    });
    return;
  }

  try {
    const response = await apiFetch('/accounts/users/bulk-archive/', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: Array.from(selectedUserIds),
      }),
    });

    toast({
      title: "Success",
      description: `Archived ${response.archived_count} user(s)`,
    });

    setSelectedUserIds(new Set());
    setIsBulkActionMode(false);
    await loadUsers();
  } catch (error: any) {
    handleApiError(error, 'Bulk Archive');
  }
};

const handleBulkDelete = async () => {
  if (selectedUserIds.size === 0) {
    toast({
      title: "No users selected",
      description: "Please select at least one user",
      variant: "destructive",
    });
    return;
  }

  // Show confirmation dialog
  // Then call API
  try {
    const response = await apiFetch('/accounts/users/bulk-delete/', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: Array.from(selectedUserIds),
      }),
    });

    toast({
      title: "Success",
      description: `Deleted ${response.deleted_count} user(s)`,
    });

    setSelectedUserIds(new Set());
    setIsBulkActionMode(false);
    await loadUsers();
  } catch (error: any) {
    handleApiError(error, 'Bulk Delete');
  }
};
```

2. **Update bulk action buttons:**

```typescript
// Replace the commented-out bulk action buttons with:

{selectedUserIds.size > 0 && (
  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
    <Badge variant="secondary">
      {selectedUserIds.size} selected
    </Badge>
    <Button
      size="sm"
      variant="outline"
      onClick={handleBulkActivate}
    >
      Activate
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={handleBulkDeactivate}
    >
      Deactivate
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={handleBulkArchive}
    >
      Archive
    </Button>
    <Button
      size="sm"
      variant="destructive"
      onClick={handleBulkDelete}
    >
      Delete
    </Button>
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        setSelectedUserIds(new Set());
        setIsBulkActionMode(false);
      }}
    >
      Clear
    </Button>
  </div>
)}
```

3. **Add bulk role assignment:**

```typescript
const handleBulkAssignRole = async (roleId: string) => {
  if (selectedUserIds.size === 0) {
    toast({
      title: "No users selected",
      description: "Please select at least one user",
      variant: "destructive",
    });
    return;
  }

  try {
    const response = await apiFetch('/organization/roles/bulk-assign/', {
      method: 'POST',
      body: JSON.stringify({
        role_id: roleId,
        user_ids: Array.from(selectedUserIds),
      }),
    });

    toast({
      title: "Success",
      description: `Assigned role to ${response.assigned_count} user(s)`,
    });

    setSelectedUserIds(new Set());
    setIsBulkActionMode(false);
    await loadUsers();
  } catch (error: any) {
    handleApiError(error, 'Bulk Role Assignment');
  }
};
```

#### 1.2 Add Bulk Role Assignment UI

```typescript
// Add to bulk actions menu
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="outline">
      Assign Role
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {roles.map((role) => (
      <DropdownMenuItem
        key={role.id}
        onClick={() => handleBulkAssignRole(role.id)}
      >
        {role.name}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

### Phase 2: Enhance Roles Management (Priority: Medium)

#### 2.1 Add Bulk Role Assignment UI

**File:** `frontend/app/admin/roles/page.tsx`

**Add bulk assignment feature:**

```typescript
// Add state
const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
const [selectedRole, setSelectedRole] = useState<Role | null>(null);

// Add handler
const handleBulkAssign = async (userIds: string[]) => {
  if (!selectedRole) return;

  try {
    const response = await apiFetch('/organization/roles/bulk-assign/', {
      method: 'POST',
      body: JSON.stringify({
        role_id: selectedRole.id,
        user_ids: userIds,
      }),
    });

    toast({
      title: "Success",
      description: `Assigned role "${selectedRole.name}" to ${response.assigned_count} user(s)`,
    });

    await refreshOrganizationData();
    setBulkAssignOpen(false);
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to assign role",
      variant: "destructive",
    });
  }
};

// Add button in roles page
<Button onClick={() => setBulkAssignOpen(true)}>
  <Users className="h-4 w-4 mr-2" />
  Bulk Assign
</Button>
```

#### 2.2 Add Role Permission Validation

**File:** `backend/organization/models.py`

```python
import jsonschema
from django.core.exceptions import ValidationError

class Role(UUIDModel, TimeStampedModel):
    # ... existing fields ...
    
    PERMISSION_SCHEMA = {
        "type": "object",
        "patternProperties": {
            "^[a-z_]+$": {
                "type": "object",
                "patternProperties": {
                    "^[a-z_]+$": {"type": "boolean"}
                }
            }
        }
    }
    
    def clean(self):
        """Validate permissions JSON structure."""
        super().clean()
        
        if self.permissions:
            try:
                jsonschema.validate(
                    instance=self.permissions,
                    schema=self.PERMISSION_SCHEMA
                )
            except jsonschema.ValidationError as e:
                raise ValidationError({
                    'permissions': f'Invalid permissions structure: {e.message}'
                })
    
    def save(self, *args, **kwargs):
        """Override save to call clean."""
        self.full_clean()
        super().save(*args, **kwargs)
```

### Phase 3: Clarify and Enhance Assistants Management (Priority: High)

#### 3.1 Data Model Clarification

**Current Situation:**
- Frontend uses `AssistantAssignment` interface
- Backend has `OfficeMembership` with `SECRETARIAT` role
- Backend also has `Delegation` model

**Recommendation:** Use `OfficeMembership` with `SECRETARIAT` role as the primary model, and enhance it.

#### 3.2 Enhance OfficeMembership for Assistants

**File:** `backend/organization/models.py`

```python
class OfficeMembership(UUIDModel, TimeStampedModel):
    # ... existing fields ...
    
    # Add assistant-specific fields
    assistant_type = models.CharField(
        max_length=5,
        choices=[
            ('TA', 'Technical Assistant'),
            ('PA', 'Personal Assistant'),
        ],
        blank=True,
        null=True,
        help_text="Type of assistant (only for SECRETARIAT role)"
    )
    
    specialization = models.CharField(
        max_length=255,
        blank=True,
        help_text="Assistant specialization area"
    )
    
    assistant_permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of permissions for assistant (e.g., ['view', 'draft', 'route'])"
    )
    
    # Add validation
    def clean(self):
        """Validate assistant-specific fields."""
        super().clean()
        
        # If assignment_role is SECRETARIAT, assistant_type should be set
        if self.assignment_role == self.AssignmentRole.SECRETARIAT:
            if not self.assistant_type:
                raise ValidationError({
                    'assistant_type': 'Assistant type (TA/PA) is required for SECRETARIAT role'
                })
        
        # Validate assistant_permissions
        if self.assistant_permissions:
            valid_permissions = ['view', 'draft', 'route', 'minute', 'approve']
            for perm in self.assistant_permissions:
                if perm not in valid_permissions:
                    raise ValidationError({
                        'assistant_permissions': f'Invalid permission: {perm}'
                    })
```

#### 3.3 Create Assistant Assignment API Endpoints

**File:** `backend/organization/views.py`

```python
class AssistantAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing assistant assignments."""
    
    queryset = OfficeMembership.objects.filter(
        assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT
    ).select_related("office", "user")
    
    serializer_class = OfficeMembershipSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by executive office."""
        queryset = super().get_queryset()
        executive_id = self.request.query_params.get('executive_id')
        if executive_id:
            # Get executive's office
            from accounts.models import User
            try:
                executive = User.objects.get(id=executive_id)
                # Find executive's primary office
                office = OfficeMembership.objects.filter(
                    user=executive,
                    assignment_role__in=[
                        OfficeMembership.AssignmentRole.PRINCIPAL,
                        OfficeMembership.AssignmentRole.ACTING
                    ],
                    is_primary=True
                ).first()
                if office:
                    queryset = queryset.filter(office=office.office)
            except User.DoesNotExist:
                pass
        return queryset
    
    def perform_create(self, serializer):
        """Create assistant assignment."""
        instance = serializer.save()
        
        # Audit log
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=self.request.user,
            action=ActivityLog.ActionType.ORGANIZATION_UPDATED,
            object_type="assistant_assignment",
            object_id=str(instance.id),
            object_repr=f"{instance.user.username} → {instance.office.name}",
            module="organization",
            description=f"Assigned {instance.user.username} as {instance.get_assistant_type_display()} to {instance.office.name}",
            request=self.request,
        )
```

#### 3.4 Update Frontend to Use OfficeMembership API

**File:** `frontend/contexts/OrganizationContext.tsx`

```typescript
// Update assistant assignment functions to use OfficeMembership API

const addAssignment = async (assignment: Omit<AssistantAssignment, 'id'>) => {
  // Find executive's office
  const executive = users.find(u => u.id === assignment.executiveId);
  if (!executive) throw new Error('Executive not found');
  
  // Get executive's primary office
  // Then create OfficeMembership with SECRETARIAT role
  const response = await apiFetch('/organization/office-memberships/', {
    method: 'POST',
    body: JSON.stringify({
      office: executiveOfficeId,
      user: assignment.assistantId,
      assignment_role: 'secretariat',
      assistant_type: assignment.type,
      specialization: assignment.specialization,
      assistant_permissions: assignment.permissions,
      is_active: true,
    }),
  });
  
  // Refresh organization data
  await refreshOrganizationData();
};
```

### Phase 4: User Import/Export Enhancement (Priority: Low)

#### 4.1 Add User Import from CSV

**File:** `backend/accounts/views.py`

```python
@action(detail=False, methods=["post"], url_path="bulk-import")
def bulk_import(self, request):
    """Import users from CSV file."""
    self._ensure_super_admin()
    
    if 'file' not in request.FILES:
        raise ValidationError({"file": "CSV file is required"})
    
    import csv
    from io import TextIOWrapper
    
    file = request.FILES['file']
    reader = csv.DictReader(TextIOWrapper(file, encoding='utf-8'))
    
    created = []
    errors = []
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (row 1 is header)
        try:
            # Validate required fields
            required = ['username', 'email', 'first_name', 'last_name']
            for field in required:
                if not row.get(field):
                    errors.append({
                        'row': row_num,
                        'error': f'Missing required field: {field}'
                    })
                    continue
            
            # Create user
            user = User.objects.create_user(
                username=row['username'],
                email=row['email'],
                first_name=row['first_name'],
                last_name=row['last_name'],
                password=row.get('password', User.objects.make_random_password()),
                is_active=row.get('is_active', 'true').lower() == 'true',
                grade_level=row.get('grade_level', ''),
                employee_id=row.get('employee_id', ''),
            )
            
            # Assign role if provided
            if row.get('role'):
                try:
                    role = Role.objects.get(name=row['role'])
                    user.system_role = role
                    user.save()
                except Role.DoesNotExist:
                    pass
            
            created.append(user.id)
            
        except Exception as e:
            errors.append({
                'row': row_num,
                'error': str(e)
            })
    
    return Response({
        'created_count': len(created),
        'error_count': len(errors),
        'created_ids': created,
        'errors': errors,
    })
```

**Frontend Implementation:**

```typescript
// frontend/app/admin/users/page.tsx

const handleImportUsers = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await apiFetch('/accounts/users/bulk-import/', {
      method: 'POST',
      body: formData,
    });
    
    toast({
      title: "Import Complete",
      description: `Imported ${response.created_count} user(s). ${response.error_count} error(s).`,
    });
    
    if (response.errors.length > 0) {
      // Show errors in a dialog
      console.error('Import errors:', response.errors);
    }
    
    await loadUsers();
  } catch (error: any) {
    handleApiError(error, 'User Import');
  }
};
```

---

## Testing Checklist

### Users Management
- [ ] Bulk activate works
- [ ] Bulk deactivate works
- [ ] Bulk archive works
- [ ] Bulk delete works (with confirmation)
- [ ] Bulk role assignment works
- [ ] User import from CSV works
- [ ] User export to CSV works
- [ ] All operations are audited

### Roles Management
- [ ] Bulk role assignment works
- [ ] Role cloning works
- [ ] Role templates work
- [ ] Permission validation works
- [ ] All operations are audited

### Assistants Management
- [ ] Assistant assignment creates OfficeMembership
- [ ] TA/PA distinction works
- [ ] Permissions are stored correctly
- [ ] Specialization is tracked
- [ ] All operations are audited

---

## Implementation Priority

1. **🔴 Critical (This Week):**
   - Connect bulk operations frontend to backend
   - Add bulk role assignment UI
   - Clarify assistants data model

2. **🟡 High Priority (Next Week):**
   - Add user import functionality
   - Enhance assistant assignment model
   - Add permission validation

3. **🟢 Medium Priority (This Month):**
   - Add role templates UI
   - Enhance user activity tracking
   - Add grade level validation

---

## Next Steps

1. Review and approve this plan
2. Implement Phase 1 (Bulk Operations)
3. Test thoroughly
4. Move to Phase 2

---

**End of Plan**

