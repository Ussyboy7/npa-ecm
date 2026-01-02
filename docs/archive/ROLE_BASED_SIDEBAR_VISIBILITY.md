# Role-Based Sidebar Visibility Discussion

## Overview

This document outlines proposed role-based visibility rules for the sidebar navigation. The goal is to show users only the sections and pages relevant to their role and responsibilities.

---

## Role Categories

### 1. **Executive Roles** (Grade-Based)
- **MDCS** (Managing Director) - Full system access
- **EDCS** (Executive Director) - Directorate-level access
- **GM/MSS1** (General Manager) - Division-level access
- **AGM/MSS2** (Assistant General Manager) - Department-level access
- **Principal Manager/MSS3** - Unit-level access

### 2. **Functional Roles** (System Roles)
- **Super Admin** - Full system access
- **Secretary** - Acts on behalf of executives
- **Registry Officer** - Handles registration and archiving
- **System Administrator** - System management
- **Port Manager** - Port operations management
- **Chief Port HRO Officer** - Port HR management

### 3. **Standard Users**
- **Managers** (MSS4, SSS1, SSS2) - Team management
- **Officers** (JSS3-JSS5, MSS1) - Standard operations
- **Staff** (JSS1-JSS2) - Basic access

---

## Proposed Sidebar Visibility Matrix

### **My Workspace** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Outbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Executive Approvals | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ | ✅ |
| My Tasks & Alerts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- *Secretary: Can see Executive Approvals when assigned to an executive
- Executive Approvals: Only for management grades (MDCS, EDCS, GM, AGM, Principal Manager) and Super Admin

---

### **Offices & Registry** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| Office Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |
| Register Correspondence | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Office Outbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |

**Notes:**
- *Officer: Only if they have office membership
- Register Correspondence: Management grades (MDCS, EDCS, GM, AGM), Secretary, Registry, Super Admin
- Office Inbox/Outbox: Requires office membership

---

### **Case Management** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| My Cases | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Office Cases | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |
| All Cases | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅* | ❌ | ✅ |

**Notes:**
- *Officer: Office Cases only if they have office membership
- *Secretary: All Cases when assigned to executive
- **Case Scope by Role:**
  - **MDCS:** Organization-wide (all cases)
  - **EDCS:** Directorate-wide (all cases in their directorate)
  - **GM:** Division-wide (all cases in their division, across all departments)
  - **AGM:** Department-wide (all cases in their department(s))
  - **Others:** My Cases and Office Cases only

---

### **Documents & Records** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| Search Documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Content Capture | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Forms Library | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verify Seal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Records & Archives | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |

**Notes:**
- *Officer: Records & Archives only if they have office membership or are in a division/department
- All users can search, capture, and verify documents

---

### **Analytics & Reports** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| Executive Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Performance Analytics | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅* | ❌ | ✅ |
| Reports & Intelligence | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅* | ❌ | ✅ |

**Notes:**
- *Secretary: Performance Analytics and Reports when assigned to executive
- Executive Dashboard: Only MDCS, EDCS, Super Admin
- Performance Analytics: MDCS, EDCS, GM, AGM, Secretary (when assigned), Super Admin
- Reports: MDCS, EDCS, GM, AGM, Secretary (when assigned), Super Admin

---

### **Administration** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| Organization & Offices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Users & Roles | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Workflow & SLA | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Templates | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit & Compliance | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Notes:**
- Organization & Offices: MDCS, EDCS, GM, Super Admin
- Users & Roles: MDCS, EDCS, GM, AGM (department scope), Super Admin
- Workflow & SLA: MDCS, EDCS, GM, Super Admin
- Audit & Compliance: MDCS, EDCS, GM, AGM (department scope), Super Admin
- Templates: All users (for creating/using templates)
- *AGM: Users & Roles and Audit & Compliance limited to their department(s)

---

### **Integration** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| Integration Hub | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Notes:**
- Integration Hub: MDCS, EDCS, GM, AGM, System Administrator, Super Admin

---

### **System** Section

| Item | MDCS | EDCS | GM | AGM | Principal Manager | Manager | Officer | Secretary | Registry | Super Admin |
|------|------|------|----|----|------------------|---------|--------|-----------|----------|-------------|
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Help & Guides | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- All users can access Settings and Help & Guides

---

## Special Cases & Edge Cases

### **Secretary Role**
- **Visibility depends on assignment:**
  - If assigned to MDCS/EDCS: Can see Executive Dashboard (read-only)
  - If assigned to GM/AGM: Can see Performance Analytics and Reports
  - Can always see Executive Approvals if they have active assignments
  - Can see All Cases if assigned to executive

### **Registry Officer**
- **Special permissions:**
  - Can Register Correspondence (primary function)
  - Can view all Records & Archives
  - Cannot access Administration (except Templates)
  - Cannot access Analytics & Reports

### **Officers without Office Membership**
- **Limited visibility:**
  - Cannot see Office Inbox/Outbox
  - Cannot see Office Cases
  - Cannot see Records & Archives (unless in division/department)
  - Can see My Inbox, My Outbox, My Cases, Search Documents

### **Port Manager & Chief Port HRO Officer**
- **Decision:** Same as GM/AGM level, but with port-specific views
- **Access:** Similar to GM/AGM with scope limited to port operations

---

## Questions for Discussion

### 1. **Secretary Permissions**
- ✅ **Agreed:** Secretary can see Executive Approvals when assigned
- ⏳ **Pending:** Should Secretary see Executive Dashboard when assigned to MDCS/EDCS?
- ⏳ **Pending:** Should Secretary see All Cases when not assigned to executive?

### 2. **Registry Officer Permissions**
- ✅ **Agreed:** Registry can Register Correspondence
- ⏳ **Pending:** Should Registry see all Records & Archives or only those they registered?
- ⏳ **Pending:** Should Registry have access to Analytics & Reports?

### 3. **Officer Permissions**
- ✅ **Agreed:** Officers need office membership for Office Inbox/Outbox
- ⏳ **Pending:** Should Officers without office membership see any Records & Archives?
- ⏳ **Pending:** Should Officers see Performance Analytics for their own metrics?

### 4. **Principal Manager Permissions**
- ✅ **Agreed:** Principal Manager can see Executive Approvals
- ⏳ **Pending:** Should Principal Manager see Performance Analytics?
- ⏳ **Pending:** Should Principal Manager be able to Register Correspondence?

### 5. **Port Manager & Chief Port HRO Officer**
- ✅ **Decided:** Same as GM/AGM level, but with port-specific views

### 6. **Integration Hub**
- ✅ **Decided:** AGM and System Administrator should have access

### 7. **Templates**
- ✅ **Agreed:** All users can access Templates
- ⏳ **Pending:** Should all users be able to create templates, or only management?

### 8. **Case Management Scope** ✅ **DECIDED**
- ✅ **MDCS:** Organization-wide (all cases)
- ✅ **EDCS:** Directorate-wide (all cases in their directorate)
- ✅ **GM:** Division-wide (all cases in their division, across all departments)
- ✅ **AGM:** Department-wide (all cases in their department(s))

### 9. **AGM Administration Access** ✅ **DECIDED**
- ✅ **Users & Roles:** AGM can access for their department(s)
- ✅ **Audit & Compliance:** AGM can access for their department(s)

---

## Implementation Approach

### **Option 1: Role-Based Visibility**
- Check user's `systemRole` and `gradeLevel`
- Show/hide sidebar sections based on role matrix
- Dynamic sidebar rendering
- **Pros:** Simple, fast, clear rules
- **Cons:** Less flexible, requires code changes for new roles

### **Option 2: Permission-Based Visibility**
- Use existing `useUserPermissions` hook
- Map sidebar items to permissions
- More flexible but requires permission mapping
- **Pros:** Flexible, database-driven, easier to extend
- **Cons:** More complex, requires permission setup

### **Option 3: Hybrid Approach** ⭐ **RECOMMENDED**
- Combine role checks with permission checks
- Use roles for broad visibility, permissions for fine-grained access
- Most flexible but more complex
- **Pros:** Best of both worlds, supports hierarchical access (AGM→GM→ED→MD)
- **Cons:** More complex to implement

---

## Recommended Implementation ⭐

**Use Option 3 (Hybrid Approach) with hierarchical scope support:**

### **Why Hybrid?**
1. **Hierarchical Case Access:** AGM→GM→ED→MD requires scope-based filtering
2. **Department/Division/Directorate Scoping:** AGM needs department scope, GM needs division scope
3. **Flexibility:** Can handle edge cases (Secretary assignments, office memberships)
4. **Maintainability:** Clear separation between role checks and permission checks

### **Implementation Structure:**

```typescript
// 1. Role-based visibility checks (broad)
const shouldShowSection = (section: string) => {
  const role = currentUser?.systemRole?.name;
  const grade = currentUser?.gradeLevel;
  
  // Role-based rules
  switch(section) {
    case 'executive-dashboard':
      return isMD || isED || isSuperAdmin;
    case 'administration':
      return isMD || isED || isGM || isAGM || isSuperAdmin;
    // ... etc
  }
};

// 2. Scope-based filtering (fine-grained)
const getCaseScope = () => {
  if (isMD) return 'organization';
  if (isED) return 'directorate'; // Filter by user's directorate
  if (isGM) return 'division'; // Filter by user's division
  if (isAGM) return 'department'; // Filter by user's department(s)
  return 'personal'; // My Cases + Office Cases
};

// 3. Permission checks for edge cases
const shouldShowItem = (item: string) => {
  // Check role first
  if (!shouldShowSection(getSectionForItem(item))) return false;
  
  // Then check permissions/context
  switch(item) {
    case 'office-inbox':
      return userOfficeIds.length > 0 || isSuperAdmin;
    case 'register-correspondence':
      return isManagement || isSecretary || isRegistry || isSuperAdmin;
    case 'all-cases':
      return getCaseScope() !== 'personal';
    // ... etc
  }
};
```

### **Key Components:**

1. **Role Detection Helper:**
```typescript
const useRoleChecks = (user) => {
  const grade = user?.gradeLevel;
  const role = user?.systemRole?.name;
  
  return {
    isMD: grade === 'MDCS',
    isED: grade === 'EDCS',
    isGM: grade === 'MSS1',
    isAGM: grade === 'MSS2',
    isPrincipalManager: grade === 'MSS3',
    isManagement: ['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3'].includes(grade),
    isSecretary: role?.toLowerCase() === 'secretary',
    isRegistry: role?.toLowerCase() === 'registry officer',
    isSuperAdmin: user?.isSuperuser || role?.toLowerCase() === 'super admin',
  };
};
```

2. **Scope Helper:**
```typescript
const useScopeChecks = (user, organization) => {
  const { isMD, isED, isGM, isAGM } = useRoleChecks(user);
  
  return {
    caseScope: isMD ? 'organization' 
            : isED ? 'directorate' 
            : isGM ? 'division' 
            : isAGM ? 'department' 
            : 'personal',
    userDepartmentIds: user?.department ? [user.department.id] : [],
    userDivisionIds: user?.division ? [user.division.id] : [],
    userDirectorateIds: user?.directorate ? [user.directorate.id] : [],
  };
};
```

3. **Sidebar Visibility Hook:**
```typescript
const useSidebarVisibility = () => {
  const { currentUser } = useCurrentUser();
  const { officeMemberships } = useOrganization();
  const roleChecks = useRoleChecks(currentUser);
  const scopeChecks = useScopeChecks(currentUser, organization);
  
  return {
    // Section visibility
    showAnalytics: roleChecks.isMD || roleChecks.isED || 
                   roleChecks.isGM || roleChecks.isAGM || 
                   roleChecks.isSuperAdmin,
    showAdministration: roleChecks.isMD || roleChecks.isED || 
                       roleChecks.isGM || roleChecks.isAGM || 
                       roleChecks.isSuperAdmin,
    
    // Item visibility
    showExecutiveDashboard: roleChecks.isMD || roleChecks.isED || 
                           roleChecks.isSuperAdmin,
    showAllCases: scopeChecks.caseScope !== 'personal',
    showOfficeInbox: userOfficeIds.length > 0 || roleChecks.isSuperAdmin,
    showUsersRoles: roleChecks.isMD || roleChecks.isED || 
                   roleChecks.isGM || roleChecks.isAGM || 
                   roleChecks.isSuperAdmin,
    // ... etc
  };
};
```

### **Benefits:**
1. ✅ Supports hierarchical access (AGM→GM→ED→MD)
2. ✅ Handles scope-based filtering (department/division/directorate)
3. ✅ Flexible for edge cases (Secretary, Registry, office memberships)
4. ✅ Maintainable (clear separation of concerns)
5. ✅ Extensible (easy to add new roles or permissions)

### **Implementation Steps:**
1. Create `useRoleChecks` hook
2. Create `useScopeChecks` hook  
3. Create `useSidebarVisibility` hook
4. Update `AppSidebar.tsx` to use visibility hooks
5. Update case filtering API to support scope parameter
6. Test with different user roles

---

## Next Steps

1. **Review and discuss** the visibility matrix above
2. **Answer questions** in the "Questions for Discussion" section
3. **Finalize rules** for edge cases
4. **Implement** role-based visibility in `AppSidebar.tsx`
5. **Test** with different user roles

---

## Summary Table (Quick Reference)

| Section | Who Can See |
|---------|-------------|
| **My Workspace** | All users |
| **Offices & Registry** | Users with office membership or management |
| **Case Management** | All users (scope varies by role) |
| **Documents & Records** | All users |
| **Analytics & Reports** | Management + Secretary (when assigned) + Super Admin |
| **Administration** | MDCS, EDCS, GM, Super Admin |
| **Integration** | MDCS, EDCS, GM, Super Admin |
| **System** | All users |

---

---

## ✅ Final Recommendations Summary

### **Why Hybrid Approach is Best for This System:**

1. **Hierarchical Case Access:**
   - AGM sees department cases → GM sees division cases → ED sees directorate cases → MD sees all
   - Requires scope-based filtering, not just role checks
   - Hybrid approach supports this naturally

2. **Department/Division Scoping:**
   - AGM needs Users & Roles and Audit & Compliance scoped to their department
   - GM needs division-wide scope
   - ED needs directorate-wide scope
   - Pure role-based can't handle this granularity

3. **Flexibility for Edge Cases:**
   - Secretary visibility depends on executive assignment
   - Officers need office membership checks
   - Registry has special permissions
   - Hybrid allows role + context checks

4. **Maintainability:**
   - Clear separation: roles for broad visibility, scope for filtering
   - Easy to extend for new roles (Port Manager, etc.)
   - Testable components (hooks)

5. **Performance:**
   - Role checks are fast (simple comparisons)
   - Scope checks only when needed
   - No unnecessary API calls

### **Implementation Priority:**

1. **Phase 1:** Create role and scope hooks
2. **Phase 2:** Update sidebar visibility logic
3. **Phase 3:** Update case filtering API to support scope
4. **Phase 4:** Update Users & Roles and Audit & Compliance to respect AGM scope
5. **Phase 5:** Test with all role combinations

---

**Last Updated:** 2025-01-XX
**Status:** ✅ **DECISIONS MADE - Ready for Implementation**

