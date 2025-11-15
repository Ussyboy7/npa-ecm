# NPA ECM Roles Discussion

## Current Role Structure

### 1. **Grade-Based Roles** (from GradeLevel)
These are derived from grade levels and map to organizational hierarchy:

| Grade Level | System Role | Approval Authority | Typical Position |
|------------|-------------|-------------------|------------------|
| JSS3, JSS4 | Officer | 1 | Junior Staff |
| JSS5, MSS1 | Senior Officer | 2 | Middle Staff |
| MSS2 | Principal Officer | 3 | Middle Staff |
| MSS3 | Principal Manager | 4 | Unit Head |
| MSS4, SSS1, SSS2 | Manager | 5-6 | Manager |
| AGM | Assistant General Manager | 7 | Department Head |
| GM | General Manager | 8 | Division Head |
| ED | Executive Director | 9 | Directorate Head |
| MD, MDCS | Managing Director | 10 | CEO |

### 2. **Special Roles** (from Backend ROLE_CHOICES)
These are functional roles that don't map directly to grade levels:

- **Secretary** - Supports executives, can act on behalf of
- **Registry Officer** - Handles document registration and archiving
- **System Administrator** - Full system access
- **Port Manager** - Manages port operations
- **Chief Port HRO Officer** - Port HR management

### 3. **Current Capabilities by Role**

#### **Managing Director (MDCS)**
- ✅ Full system access
- ✅ Can mark correspondence as complete/archive
- ✅ Can add distribution (CC) to correspondence
- ✅ Can view all correspondence
- ✅ Executive dashboard with divisional metrics
- ✅ Dual inbox (personal + secretary)

#### **Executive Director (EDCS)**
- ✅ Can add distribution (CC) to correspondence
- ✅ Can view divisional correspondence
- ✅ Can minute and forward
- ⚠️ Limited dashboard features

#### **General Manager (MSS1)**
- ✅ Can add distribution (CC) to correspondence
- ✅ Can view divisional correspondence
- ✅ Can minute and forward
- ⚠️ Limited dashboard features

#### **Assistant General Manager (MSS2)**
- ✅ Can add distribution (CC) to correspondence
- ✅ Can view departmental correspondence
- ✅ Can minute and forward
- ✅ Departmental oversight dashboard

#### **Principal Manager (MSS3)**
- ✅ Can add distribution (CC) to correspondence
- ✅ Can minute and forward
- ✅ Team oversight

#### **Manager**
- ✅ Can minute and forward
- ✅ Team management
- ❌ Cannot add distribution (CC) - Management level only

#### **Officer/Senior Officer**
- ✅ Can treat and respond to correspondence
- ✅ Can view assigned correspondence
- ❌ Cannot add distribution (CC) - Management level only
- ❌ Cannot minute (only treat/respond)

#### **Secretary**
- ✅ Can act on behalf of executive
- ✅ Can register correspondence
- ✅ Can minute on behalf of executive
- ⚠️ Limited implementation

#### **Registry Officer**
- ✅ Can register correspondence
- ⚠️ Minimal implementation
- ❌ Limited features

#### **System Administrator**
- ✅ User management
- ✅ System health monitoring
- ✅ Organizational structure management
- ⚠️ Basic implementation

---

## Key Discussion Points

### 1. **Role vs Grade Level**
- Currently, `systemRole` is derived from `gradeLevel`
- But backend has separate `role` field with more options
- **Question**: Should we separate functional roles from grade-based roles?

### 2. **Distribution (CC) Permissions**
- Currently: MDCS, EDCS, MSS1, MSS2, MSS3 can add distribution
- **Question**: Should this be role-based or grade-based?
- **Question**: Should Registry be able to add distribution?

### 3. **Secretary Role**
- Can act on behalf of executives
- **Question**: Should Secretary have same permissions as their executive?
- **Question**: Should Secretary be able to add distribution?

### 4. **Registry Role**
- Handles document registration
- **Question**: What permissions should Registry have?
- **Question**: Should Registry be able to view all correspondence?

### 5. **Port Manager Role**
- Manages port operations
- **Question**: Should Port Manager have special permissions?
- **Question**: Should Port Manager be able to add distribution?

### 6. **Workflow Permissions**
- **Question**: Who can register correspondence? (Currently: Registry)
- **Question**: Who can minute? (Currently: All management levels)
- **Question**: Who can treat/respond? (Currently: Officers)
- **Question**: Who can archive? (Currently: MD only)

### 7. **Access Levels**
From NPA structure document:
- **Level 1 - Confidential**: MD, EDs only
- **Level 2 - Restricted**: GMs and above
- **Level 3 - Internal**: AGMs and above
- **Level 4 - General**: All staff

**Question**: Should we implement document access levels based on these?

### 8. **Role Permissions Matrix**
**Question**: Should we create a permissions matrix for each role?

Example:
| Action | MDCS | EDCS | MSS1 | MSS2 | MSS3 | Manager | Officer | Secretary | Registry | Admin |
|--------|------|------|------|------|------|---------|---------|-----------|----------|-------|
| Register Correspondence | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Minute & Forward | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Treat & Respond | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Add Distribution (CC) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Archive | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View All Correspondence | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage Org Structure | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Recommendations

### 1. **Separate Grade from Role**
- Keep `gradeLevel` for hierarchy
- Add `role` field for functional roles (Secretary, Registry, Admin)
- A user can have both: `gradeLevel: 'AGM'` + `role: 'Secretary'`

### 2. **Role-Based Permissions**
- Create a permissions system based on roles
- Allow role-based access control (RBAC)
- Support multiple roles per user

### 3. **Workflow Permissions**
- Define clear permissions for each workflow action
- Registry: Register, view all
- Secretary: Act on behalf, minute, view assigned
- Management: Minute, forward, add distribution
- Officers: Treat, respond, view assigned

### 4. **Document Access Levels**
- Implement 4-level access control
- Confidential → MD, ED only
- Restricted → GM and above
- Internal → AGM and above
- General → All staff

---

## Questions for Discussion

1. **Should Secretary have same permissions as their executive?**
2. **Should Registry be able to add distribution (CC)?**
3. **Should Port Manager have special permissions?**
4. **Should we implement document access levels?**
5. **Should we allow multiple roles per user?**
6. **What permissions should System Admin have?**
7. **Should Principal Manager be able to add distribution?**
8. **What's the difference between Secretary and Assistant (TA/PA)?**

