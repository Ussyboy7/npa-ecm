# Admin Modules - Elaborated Recommendations

**Date:** January 2025  
**Purpose:** Detailed elaboration on recommendations from ADMIN_MODULES_COMPREHENSIVE_REVIEW.md  
**Status:** Implementation Guide

---

## Table of Contents

1. [Organization Models Overview](#1-organization-models-overview)
2. [Fix Duplicate Indexes in Division Model](#2-fix-duplicate-indexes-in-division-model)
3. [Office Code Uniqueness Validation](#3-office-code-uniqueness-validation)
4. [Audit for Office Membership Changes](#4-audit-for-office-membership-changes)
5. [Password Reset Functionality](#5-password-reset-functionality)
6. [SLA Tracking and Enforcement](#6-sla-tracking-and-enforcement)
7. [Escalation Logic Implementation](#7-escalation-logic-implementation)
8. [Tests for Assignment Scenarios](#8-tests-for-assignment-scenarios)
9. [Workflow Visualization](#9-workflow-visualization)
10. [Move Document Templates to Backend](#10-move-document-templates-to-backend)
11. [JSON Schema Validation for Form Templates](#11-json-schema-validation-for-form-templates)
12. [Template Versioning](#12-template-versioning)
13. [Explicit Sharing UI](#13-explicit-sharing-ui)
14. [Template Categories](#14-template-categories)
15. [Search for Document Templates](#15-search-for-document-templates)
16. [Template Preview](#16-template-preview)
17. [Missing Audit Action Types](#17-missing-audit-action-types)
18. [Log Retention Policy](#18-log-retention-policy)
19. [Compliance Report Generation](#19-compliance-report-generation)
20. [Anomaly Detection](#20-anomaly-detection)
21. [Data Masking for Sensitive Fields](#21-data-masking-for-sensitive-fields)

---

## 1. Organization Models Overview

### Current Structure

The organization module implements a **hierarchical organizational structure** that mirrors the NPA's real-world structure:

```
Directorate (Top Level)
  └── Division
      └── Department
          └── Office (Operational Units)
```

### Model Relationships Explained

#### Directorate
- **Purpose:** Top-level organizational unit (e.g., "Marine & Operations Directorate")
- **Leadership:** Led by an Executive Director
- **Characteristics:**
  - Unique name and code
  - Can have multiple divisions
  - Can be active/inactive
  - Links to executive director user

#### Division
- **Purpose:** Sub-unit within a directorate (e.g., "Port Operations Division")
- **Leadership:** Led by a General Manager
- **Characteristics:**
  - Belongs to one directorate (CASCADE delete)
  - Unique name within directorate
  - Can have multiple departments
  - Links to general manager user

#### Department
- **Purpose:** Sub-unit within a division (e.g., "Container Terminal Department")
- **Leadership:** Led by a Head of Department
- **Characteristics:**
  - Belongs to one division (CASCADE delete)
  - Unique name within division
  - Can have multiple offices
  - Links to head of department user

#### Office
- **Purpose:** Operational office for routing and workflow
- **Types:** MD, ED, GM, AGM, Directorate, Division, Department, Unit, Registry, Project, Custom
- **Characteristics:**
  - Can belong to directorate, division, or department (optional)
  - Has parent-child relationships (self-referential)
  - Controls routing behavior (lateral routing, external intake)
  - Unique code across all offices

#### OfficeMembership
- **Purpose:** Links users to offices with specific roles
- **Assignment Roles:**
  - `PRINCIPAL` - Office Head
  - `ACTING` - Acting Head
  - `STAFF` - Staff Officer
  - `SECRETARIAT` - PA/TA
  - `REGISTRY` - Registry staff
  - `SUPPORT` - Support staff
- **Permissions:**
  - `can_register` - Can register new correspondence
  - `can_route` - Can route correspondence
  - `can_approve` - Can approve correspondence
- **Date Ranges:** `starts_at`, `ends_at` for temporary assignments

### Use Cases

1. **Correspondence Routing:** Offices determine where correspondence can be routed
2. **Workflow Assignment:** Steps can be assigned to specific offices
3. **Permission Management:** Office memberships determine user capabilities
4. **Organizational Reporting:** Hierarchy enables organizational analytics

### Best Practices

- Always use `select_related()` when querying divisions/departments with directorates
- Use `prefetch_related()` for office memberships
- Cache organization structure (changes infrequently)
- Validate hierarchy integrity (department must belong to division that belongs to directorate)

---

## 2. Fix Duplicate Indexes in Division Model

### Problem

The `Division` model in `backend/organization/models.py` has duplicate index definitions (lines 58-63 and 64-69), which:
- Wastes database resources
- Creates confusion
- May cause migration issues
- Increases maintenance overhead

### Current Code (Incorrect)

```python
class Division(UUIDModel, TimeStampedModel):
    # ... fields ...
    
    class Meta:
        unique_together = ("directorate", "name")
        ordering = ["directorate__name", "name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["directorate", "is_active"]),
        ]
        indexes = [  # ❌ DUPLICATE - This overwrites the previous one
            models.Index(fields=["name"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["directorate", "is_active"]),
        ]
```

### Fixed Code

```python
class Division(UUIDModel, TimeStampedModel):
    """Division that belongs to a directorate."""
    
    directorate = models.ForeignKey(
        Directorate,
        on_delete=models.CASCADE,
        related_name="divisions",
    )
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    general_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="divisions_led",
    )

    class Meta:
        unique_together = ("directorate", "name")
        ordering = ["directorate__name", "name"]
        indexes = [
            # Single field indexes (already have db_index=True, but explicit is better)
            models.Index(fields=["name"], name="division_name_idx"),
            models.Index(fields=["code"], name="division_code_idx"),
            models.Index(fields=["is_active"], name="division_is_active_idx"),
            # Composite index for common query pattern
            models.Index(
                fields=["directorate", "is_active"],
                name="division_directorate_active_idx"
            ),
        ]
```

### Migration Required

```python
# backend/organization/migrations/XXXX_fix_division_indexes.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('organization', '0008_rename_org_dept_name_idx_organizatio_name_93bf26_idx_and_more'),
    ]

    operations = [
        # Remove duplicate indexes
        migrations.AlterField(
            model_name='division',
            name='name',
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='division',
            name='code',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='division',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
        # Ensure composite index exists
        migrations.AddIndex(
            model_name='division',
            index=models.Index(
                fields=['directorate', 'is_active'],
                name='division_directorate_active_idx'
            ),
        ),
    ]
```

### Index Strategy Explanation

1. **Single Field Indexes:**
   - `name` - For searching divisions by name
   - `code` - For looking up by code
   - `is_active` - For filtering active/inactive

2. **Composite Index:**
   - `(directorate, is_active)` - For common query: "Get all active divisions in a directorate"
   - This is more efficient than separate indexes

### Testing

```python
# backend/organization/tests/test_models.py
from django.test import TestCase
from organization.models import Division, Directorate

class DivisionIndexTests(TestCase):
    def test_division_indexes_exist(self):
        """Verify indexes are created correctly."""
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'organization_division'
            """)
            indexes = [row[0] for row in cursor.fetchall()]
            
            # Check for expected indexes
            self.assertIn('division_name_idx', indexes)
            self.assertIn('division_code_idx', indexes)
            self.assertIn('division_is_active_idx', indexes)
            self.assertIn('division_directorate_active_idx', indexes)
```

---

## 3. Office Code Uniqueness Validation

### Problem

The `Office` model has `code = models.CharField(max_length=64, unique=True)`, which ensures uniqueness, but:
- No validation at the model level for format
- No validation for conflicts during bulk operations
- No clear error messages for users
- No validation for code format/pattern

### Current Implementation

```python
class Office(UUIDModel, TimeStampedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64, unique=True)  # ✅ Unique but no format validation
    office_type = models.CharField(max_length=32, choices=OfficeTier.choices)
    # ...
```

### Enhanced Implementation

```python
import re
from django.core.exceptions import ValidationError
from django.db import models

class Office(UUIDModel, TimeStampedModel):
    """Represents an operational office."""
    
    # Office code pattern: Uppercase letters, numbers, hyphens, underscores
    CODE_PATTERN = re.compile(r'^[A-Z0-9_-]+$')
    
    name = models.CharField(max_length=255)
    code = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique office code (uppercase letters, numbers, hyphens, underscores only)"
    )
    office_type = models.CharField(max_length=32, choices=OfficeTier.choices)
    # ... other fields ...
    
    def clean(self):
        """Validate office code format."""
        super().clean()
        
        if self.code:
            # Normalize to uppercase
            self.code = self.code.upper().strip()
            
            # Check format
            if not self.CODE_PATTERN.match(self.code):
                raise ValidationError({
                    'code': 'Office code must contain only uppercase letters, numbers, hyphens, and underscores.'
                })
            
            # Check length
            if len(self.code) < 2:
                raise ValidationError({
                    'code': 'Office code must be at least 2 characters long.'
                })
            
            # Check for reserved codes
            reserved_codes = ['SYSTEM', 'ADMIN', 'ROOT', 'NULL', 'NONE']
            if self.code in reserved_codes:
                raise ValidationError({
                    'code': f'"{self.code}" is a reserved code and cannot be used.'
                })
    
    def save(self, *args, **kwargs):
        """Override save to call clean."""
        self.full_clean()
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=['code'],
                name='unique_office_code'
            ),
        ]
```

### Serializer Validation

```python
# backend/organization/serializers.py
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

class OfficeSerializer(serializers.ModelSerializer):
    code = serializers.CharField(
        max_length=64,
        validators=[
            UniqueValidator(queryset=Office.objects.all()),
            # Custom validator
        ]
    )
    
    def validate_code(self, value):
        """Validate office code format."""
        value = value.upper().strip()
        
        # Check format
        if not re.match(r'^[A-Z0-9_-]+$', value):
            raise serializers.ValidationError(
                'Office code must contain only uppercase letters, numbers, hyphens, and underscores.'
            )
        
        # Check length
        if len(value) < 2:
            raise serializers.ValidationError(
                'Office code must be at least 2 characters long.'
            )
        
        return value
    
    class Meta:
        model = Office
        fields = '__all__'
```

### Frontend Validation

```typescript
// frontend/lib/admin-validation.ts
export function validateOfficeCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Office code is required' };
  }
  
  const normalized = code.toUpperCase().trim();
  
  // Check length
  if (normalized.length < 2) {
    return { valid: false, error: 'Office code must be at least 2 characters' };
  }
  
  if (normalized.length > 64) {
    return { valid: false, error: 'Office code must be 64 characters or less' };
  }
  
  // Check format
  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    return { valid: false, error: 'Office code can only contain uppercase letters, numbers, hyphens, and underscores' };
  }
  
  // Check reserved codes
  const reserved = ['SYSTEM', 'ADMIN', 'ROOT', 'NULL', 'NONE'];
  if (reserved.includes(normalized)) {
    return { valid: false, error: 'This code is reserved and cannot be used' };
  }
  
  return { valid: true };
}
```

### Testing

```python
# backend/organization/tests/test_office_validation.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from organization.models import Office, Directorate

class OfficeCodeValidationTests(TestCase):
    def setUp(self):
        self.directorate = Directorate.objects.create(
            name="Test Directorate",
            code="TEST"
        )
    
    def test_valid_office_code(self):
        """Test valid office codes."""
        office = Office(
            name="Test Office",
            code="TEST-OFFICE-01",
            office_type=Office.OfficeTier.CUSTOM
        )
        office.full_clean()  # Should not raise
        office.save()
        self.assertEqual(office.code, "TEST-OFFICE-01")
    
    def test_code_normalized_to_uppercase(self):
        """Test code is normalized to uppercase."""
        office = Office(
            name="Test Office",
            code="test-office",
            office_type=Office.OfficeTier.CUSTOM
        )
        office.full_clean()
        office.save()
        self.assertEqual(office.code, "TEST-OFFICE")
    
    def test_invalid_code_format(self):
        """Test invalid code formats."""
        invalid_codes = [
            "test office",  # Space
            "test@office",  # Special character
            "test.office",  # Period
            "test office!",  # Exclamation
        ]
        
        for code in invalid_codes:
            office = Office(
                name="Test Office",
                code=code,
                office_type=Office.OfficeTier.CUSTOM
            )
            with self.assertRaises(ValidationError):
                office.full_clean()
    
    def test_reserved_code_rejected(self):
        """Test reserved codes are rejected."""
        office = Office(
            name="Test Office",
            code="SYSTEM",
            office_type=Office.OfficeTier.CUSTOM
        )
        with self.assertRaises(ValidationError) as context:
            office.full_clean()
        self.assertIn('reserved', str(context.exception).lower())
    
    def test_code_uniqueness(self):
        """Test code uniqueness constraint."""
        Office.objects.create(
            name="Office 1",
            code="OFFICE-01",
            office_type=Office.OfficeTier.CUSTOM
        )
        
        # Try to create duplicate
        office2 = Office(
            name="Office 2",
            code="OFFICE-01",  # Same code
            office_type=Office.OfficeTier.CUSTOM
        )
        with self.assertRaises(ValidationError):
            office2.full_clean()
```

---

## 4. Audit for Office Membership Changes

### Problem

Currently, office membership changes (create, update, delete) are not being audited, which means:
- No record of when users were assigned to offices
- No history of permission changes
- No tracking of acting assignments
- Compliance gaps for organizational changes

### Current State

Office memberships are created/updated/deleted but not logged in the audit trail.

### Implementation

#### 1. Add Audit Logging to OfficeMembership Model

```python
# backend/organization/models.py
from audit.services import AuditService
from audit.models import ActivityLog

class OfficeMembership(UUIDModel, TimeStampedModel):
    # ... existing fields ...
    
    def save(self, *args, **kwargs):
        """Override save to log changes."""
        is_new = self.pk is None
        if is_new:
            old_instance = None
        else:
            try:
                old_instance = OfficeMembership.objects.get(pk=self.pk)
            except OfficeMembership.DoesNotExist:
                old_instance = None
        
        super().save(*args, **kwargs)
        
        # Log the change
        if is_new:
            self._log_creation()
        else:
            self._log_update(old_instance)
    
    def delete(self, *args, **kwargs):
        """Override delete to log removal."""
        self._log_deletion()
        super().delete(*args, **kwargs)
    
    def _log_creation(self):
        """Log office membership creation."""
        AuditService.log_activity(
            user=getattr(self, '_current_user', None),
            action=ActivityLog.ActionType.ORGANIZATION_UPDATED,
            object_type="office_membership",
            object_id=str(self.id),
            object_repr=f"{self.user.username} → {self.office.name} ({self.assignment_role})",
            module="organization",
            description=f"Created office membership: {self.user.username} assigned to {self.office.name} as {self.get_assignment_role_display()}",
            metadata={
                "office_id": str(self.office.id),
                "office_name": self.office.name,
                "user_id": str(self.user.id),
                "user_username": self.user.username,
                "assignment_role": self.assignment_role,
                "is_primary": self.is_primary,
                "can_register": self.can_register,
                "can_route": self.can_route,
                "can_approve": self.can_approve,
                "starts_at": self.starts_at.isoformat() if self.starts_at else None,
                "ends_at": self.ends_at.isoformat() if self.ends_at else None,
            }
        )
    
    def _log_update(self, old_instance):
        """Log office membership updates."""
        changes = {}
        
        # Track field changes
        fields_to_track = [
            'assignment_role', 'is_primary', 'can_register',
            'can_route', 'can_approve', 'starts_at', 'ends_at', 'is_active'
        ]
        
        for field in fields_to_track:
            old_value = getattr(old_instance, field, None)
            new_value = getattr(self, field, None)
            
            if old_value != new_value:
                changes[field] = {
                    "old": str(old_value) if old_value is not None else None,
                    "new": str(new_value) if new_value is not None else None,
                }
        
        if changes:
            AuditService.log_activity(
                user=getattr(self, '_current_user', None),
                action=ActivityLog.ActionType.ORGANIZATION_UPDATED,
                object_type="office_membership",
                object_id=str(self.id),
                object_repr=f"{self.user.username} → {self.office.name} ({self.assignment_role})",
                module="organization",
                description=f"Updated office membership: {self.user.username} in {self.office.name}",
                metadata={
                    "office_id": str(self.office.id),
                    "office_name": self.office.name,
                    "user_id": str(self.user.id),
                    "user_username": self.user.username,
                    "changes": changes,
                }
            )
    
    def _log_deletion(self):
        """Log office membership deletion."""
        AuditService.log_activity(
            user=getattr(self, '_current_user', None),
            action=ActivityLog.ActionType.ORGANIZATION_DELETED,
            object_type="office_membership",
            object_id=str(self.id),
            object_repr=f"{self.user.username} → {self.office.name} ({self.assignment_role})",
            module="organization",
            description=f"Deleted office membership: {self.user.username} removed from {self.office.name}",
            metadata={
                "office_id": str(self.office.id),
                "office_name": self.office.name,
                "user_id": str(self.user.id),
                "user_username": self.user.username,
                "assignment_role": self.assignment_role,
            }
        )
```

#### 2. Update ViewSet to Pass User Context

```python
# backend/organization/views.py
class OfficeMembershipViewSet(viewsets.ModelViewSet):
    queryset = OfficeMembership.objects.select_related("office", "user")
    serializer_class = OfficeMembershipSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        instance = serializer.save()
        # Set user context for audit logging
        instance._current_user = self.request.user
        instance.save()  # This will trigger _log_creation
    
    def perform_update(self, serializer):
        instance = serializer.save()
        # Set user context for audit logging
        instance._current_user = self.request.user
        instance.save()  # This will trigger _log_update
    
    def perform_destroy(self, instance):
        # Set user context for audit logging
        instance._current_user = self.request.user
        instance.delete()  # This will trigger _log_deletion
```

#### 3. Add Missing Action Types to ActivityLog

```python
# backend/audit/models.py
class ActivityLog(UUIDModel):
    class ActionType(models.TextChoices):
        # ... existing actions ...
        
        # Organization actions
        ORGANIZATION_CREATED = "organization_created", "Organization Created"
        ORGANIZATION_UPDATED = "organization_updated", "Organization Updated"
        ORGANIZATION_DELETED = "organization_deleted", "Organization Deleted"
        
        # Office membership actions
        OFFICE_MEMBERSHIP_CREATED = "office_membership_created", "Office Membership Created"
        OFFICE_MEMBERSHIP_UPDATED = "office_membership_updated", "Office Membership Updated"
        OFFICE_MEMBERSHIP_DELETED = "office_membership_deleted", "Office Membership Deleted"
```

#### 4. Create Migration for New Action Types

```python
# backend/audit/migrations/XXXX_add_organization_action_types.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('audit', '0001_initial'),
    ]

    operations = [
        # Note: Since ActionType is a TextChoices, we don't need a migration
        # The new choices are automatically available
        # But we should document this change
    ]
```

### Testing

```python
# backend/organization/tests/test_office_membership_audit.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from organization.models import Office, OfficeMembership, Directorate
from audit.models import ActivityLog

User = get_user_model()

class OfficeMembershipAuditTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="adminpass123"
        )
        
        self.directorate = Directorate.objects.create(
            name="Test Directorate",
            code="TEST"
        )
        
        self.office = Office.objects.create(
            name="Test Office",
            code="TEST-OFFICE",
            office_type=Office.OfficeTier.CUSTOM
        )
    
    def test_office_membership_creation_logged(self):
        """Test that office membership creation is logged."""
        membership = OfficeMembership.objects.create(
            office=self.office,
            user=self.user,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
            is_primary=True,
            _current_user=self.admin
        )
        
        # Check audit log was created
        log = ActivityLog.objects.filter(
            object_type="office_membership",
            object_id=str(membership.id)
        ).first()
        
        self.assertIsNotNone(log)
        self.assertEqual(log.action, ActivityLog.ActionType.ORGANIZATION_UPDATED)
        self.assertIn(self.user.username, log.description)
        self.assertIn(self.office.name, log.description)
    
    def test_office_membership_update_logged(self):
        """Test that office membership updates are logged."""
        membership = OfficeMembership.objects.create(
            office=self.office,
            user=self.user,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
            can_approve=False,
            _current_user=self.admin
        )
        
        # Update membership
        membership.can_approve = True
        membership._current_user = self.admin
        membership.save()
        
        # Check audit log was created
        logs = ActivityLog.objects.filter(
            object_type="office_membership",
            object_id=str(membership.id)
        ).order_by('-timestamp')
        
        self.assertGreaterEqual(logs.count(), 2)  # Creation + update
        
        update_log = logs[0]  # Most recent
        self.assertIn("changes", update_log.metadata)
        self.assertIn("can_approve", update_log.metadata["changes"])
    
    def test_office_membership_deletion_logged(self):
        """Test that office membership deletion is logged."""
        membership = OfficeMembership.objects.create(
            office=self.office,
            user=self.user,
            assignment_role=OfficeMembership.AssignmentRole.STAFF,
            _current_user=self.admin
        )
        
        membership_id = str(membership.id)
        membership._current_user = self.admin
        membership.delete()
        
        # Check audit log was created
        log = ActivityLog.objects.filter(
            object_type="office_membership",
            object_id=membership_id,
            action=ActivityLog.ActionType.ORGANIZATION_DELETED
        ).first()
        
        self.assertIsNotNone(log)
        self.assertIn("deleted", log.description.lower())
```

### Benefits

1. **Compliance:** Full audit trail of organizational changes
2. **Accountability:** Know who made changes and when
3. **Debugging:** Track permission issues to their source
4. **Reporting:** Generate reports on organizational changes
5. **Security:** Detect unauthorized changes to office memberships

---

## 5. Password Reset Functionality

### Problem

Password reset functionality may not be fully implemented or visible in the codebase review. This is critical for:
- User self-service password recovery
- Security compliance
- User experience
- Account recovery

### Implementation

#### 1. Add Password Reset Models

```python
# backend/accounts/models.py
from django.utils import timezone
from datetime import timedelta
import secrets

class PasswordResetToken(UUIDModel, TimeStampedModel):
    """Temporary token for password reset."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens"
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["token"]),
            models.Index(fields=["user", "is_used"]),
            models.Index(fields=["expires_at"]),
        ]
    
    @classmethod
    def generate_token(cls) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def create_for_user(cls, user: User, validity_hours: int = 24) -> "PasswordResetToken":
        """Create a new password reset token for a user."""
        # Invalidate existing unused tokens
        cls.objects.filter(
            user=user,
            is_used=False,
            expires_at__gt=timezone.now()
        ).update(is_used=True)
        
        # Create new token
        return cls.objects.create(
            user=user,
            token=cls.generate_token(),
            expires_at=timezone.now() + timedelta(hours=validity_hours)
        )
    
    def is_valid(self) -> bool:
        """Check if token is still valid."""
        if self.is_used:
            return False
        if timezone.now() > self.expires_at:
            return False
        return True
    
    def use(self, ip_address: str = None):
        """Mark token as used."""
        self.is_used = True
        self.used_at = timezone.now()
        if ip_address:
            self.ip_address = ip_address
        self.save(update_fields=["is_used", "used_at", "ip_address"])
```

#### 2. Create Password Reset Views

```python
# backend/accounts/views.py
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from .models import PasswordResetToken, User

class PasswordResetRequestView(APIView):
    """Request password reset."""
    permission_classes = []  # Public endpoint
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # Don't reveal if email exists (security)
            return Response(
                {'message': 'If the email exists, a password reset link has been sent.'},
                status=status.HTTP_200_OK
            )
        
        # Create reset token
        token_obj = PasswordResetToken.create_for_user(user, validity_hours=24)
        
        # Generate reset URL
        reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password?token={token_obj.token}"
        
        # Send email
        try:
            send_mail(
                subject='Password Reset Request - NPA ECM',
                message=f'Click the link to reset your password: {reset_url}',
                html_message=render_to_string(
                    'accounts/password_reset_email.html',
                    {
                        'user': user,
                        'reset_url': reset_url,
                        'expires_in_hours': 24,
                    }
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            # Log activity
            from audit.services import AuditService
            from audit.models import ActivityLog
            AuditService.log_activity(
                user=user,
                action=ActivityLog.ActionType.USER_UPDATED,
                object_type="user",
                object_id=str(user.id),
                object_repr=user.username,
                module="accounts",
                description="Password reset requested",
                request=request,
                metadata={"ip_address": self._get_client_ip(request)},
            )
            
            return Response(
                {'message': 'If the email exists, a password reset link has been sent.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return Response(
                {'error': 'Failed to send password reset email. Please contact support.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token."""
    permission_classes = []  # Public endpoint
    
    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('password')
        
        if not token or not new_password:
            return Response(
                {'error': 'Token and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password strength
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(new_password)
        except ValidationError as e:
            return Response(
                {'error': 'Password does not meet requirements', 'details': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find token
        try:
            token_obj = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired reset token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate token
        if not token_obj.is_valid():
            return Response(
                {'error': 'Invalid or expired reset token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset password
        user = token_obj.user
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        token_obj.use(ip_address=self._get_client_ip(request))
        
        # Log activity
        from audit.services import AuditService
        from audit.models import ActivityLog
        AuditService.log_activity(
            user=user,
            action=ActivityLog.ActionType.USER_UPDATED,
            object_type="user",
            object_id=str(user.id),
            object_repr=user.username,
            module="accounts",
            description="Password reset completed",
            request=request,
            metadata={"ip_address": self._get_client_ip(request)},
        )
        
        return Response(
            {'message': 'Password has been reset successfully'},
            status=status.HTTP_200_OK
        )
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
```

#### 3. Add URLs

```python
# backend/accounts/urls.py
from django.urls import path
from .views import PasswordResetRequestView, PasswordResetConfirmView

urlpatterns = [
    # ... existing patterns ...
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
```

#### 4. Create Email Template

```html
<!-- backend/accounts/templates/accounts/password_reset_email.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset - NPA ECM</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello {{ user.get_full_name|default:user.username }},</p>
        <p>You have requested to reset your password for your NPA ECM account.</p>
        <p>Click the button below to reset your password:</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{{ reset_url }}" 
               style="background-color: #0066cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
            </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0066cc;">{{ reset_url }}</p>
        <p><strong>This link will expire in {{ expires_in_hours }} hours.</strong></p>
        <p>If you did not request this password reset, please ignore this email or contact support.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
            This is an automated message from NPA Electronic Content Management System.
        </p>
    </div>
</body>
</html>
```

#### 5. Frontend Implementation

```typescript
// frontend/lib/api/auth.ts
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
}

export async function requestPasswordReset(data: PasswordResetRequest): Promise<void> {
  const response = await apiClient.post('/accounts/password-reset/request/', data);
  return response.data;
}

export async function confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
  const response = await apiClient.post('/accounts/password-reset/confirm/', data);
  return response.data;
}
```

```tsx
// frontend/app/(auth)/reset-password/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset, confirmPasswordReset } from "@/lib/api/auth";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"request" | "confirm">(token ? "confirm" : "request");
  
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await requestPasswordReset({ email });
      toast.success("If the email exists, a password reset link has been sent.");
      setStep("confirm");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    
    setLoading(true);
    
    try {
      await confirmPasswordReset({ token: token!, password });
      toast.success("Password has been reset successfully");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };
  
  if (step === "request") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestReset}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfirmReset}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Security Considerations

1. **Token Expiration:** Tokens expire after 24 hours
2. **Single Use:** Tokens can only be used once
3. **Rate Limiting:** Add rate limiting to prevent abuse
4. **Email Validation:** Don't reveal if email exists
5. **Password Strength:** Enforce strong passwords
6. **Audit Logging:** Log all password reset attempts
7. **IP Tracking:** Track IP addresses for security

---

## 6. SLA Tracking and Enforcement

### Problem

SLA (Service Level Agreement) tracking and enforcement needs verification to ensure:
- SLA targets are properly configured
- SLA status is calculated correctly
- SLA breaches are detected and logged
- Escalations trigger based on SLA status

### Current Implementation Status

Based on codebase review, SLA functionality exists:
- `SLAConfiguration` model in `backend/analytics/models.py`
- `check_sla_and_escalate` Celery task
- SLA calculation in `AnalyticsService`

### Verification Checklist

#### 1. Verify SLA Models Exist

```python
# backend/analytics/models.py - Verify these exist:
class SLAConfiguration(UUIDModel, TimeStampedModel):
    """SLA configuration for correspondence types and priorities."""
    # Should have:
    # - correspondence_type
    # - priority
    # - target_days
    # - division (optional override)
    
class Escalation(UUIDModel, TimeStampedModel):
    """Records of escalations triggered."""
    # Should have:
    # - correspondence
    # - rule
    # - trigger_reason
    # - action_taken
    # - status
```

#### 2. Verify SLA Calculation Service

```python
# backend/analytics/services.py
class AnalyticsService:
    @staticmethod
    def calculate_sla_status(correspondence) -> dict:
        """
        Calculate SLA status for a correspondence item.
        
        Returns:
            {
                'status': 'ok' | 'warning' | 'breach' | 'critical',
                'days_open': int,
                'target_days': int,
                'days_remaining': int,
                'percentage_used': float
            }
        """
        # Implementation should:
        # 1. Get SLA configuration for correspondence type/priority
        # 2. Check for division-specific overrides
        # 3. Calculate days open
        # 4. Compare against target
        # 5. Return status
        pass
```

#### 3. Verify SLA Monitoring Task

```python
# backend/analytics/tasks.py
@shared_task(name="analytics.check_sla_and_escalate")
def check_sla_and_escalate():
    """
    Periodic task to check SLA status and trigger escalations.
    
    Should:
    1. Get all pending/in-progress correspondence
    2. Calculate SLA status for each
    3. Check escalation rules
    4. Create escalations
    5. Send notifications
    """
    pass
```

### Implementation Verification

#### Test SLA Calculation

```python
# backend/analytics/tests/test_sla.py
from django.test import TestCase
from datetime import timedelta
from django.utils import timezone
from correspondence.models import Correspondence
from analytics.models import SLAConfiguration
from analytics.services import AnalyticsService

class SLACalculationTests(TestCase):
    def setUp(self):
        # Create SLA configuration
        self.sla_config = SLAConfiguration.objects.create(
            correspondence_type=Correspondence.CorrespondenceType.MEMO,
            priority=Correspondence.Priority.HIGH,
            target_days=5
        )
        
        # Create correspondence
        self.correspondence = Correspondence.objects.create(
            subject="Test",
            correspondence_type=Correspondence.CorrespondenceType.MEMO,
            priority=Correspondence.Priority.HIGH,
            status=Correspondence.Status.PENDING,
            created_at=timezone.now() - timedelta(days=3)
        )
    
    def test_sla_status_calculation(self):
        """Test SLA status calculation."""
        status = AnalyticsService.calculate_sla_status(self.correspondence)
        
        self.assertEqual(status['days_open'], 3)
        self.assertEqual(status['target_days'], 5)
        self.assertEqual(status['days_remaining'], 2)
        self.assertEqual(status['percentage_used'], 0.6)
        self.assertEqual(status['status'], 'ok')
    
    def test_sla_warning_threshold(self):
        """Test SLA warning threshold (80% of target)."""
        # Set created_at to 4 days ago (80% of 5 days)
        self.correspondence.created_at = timezone.now() - timedelta(days=4)
        self.correspondence.save()
        
        status = AnalyticsService.calculate_sla_status(self.correspondence)
        self.assertEqual(status['status'], 'warning')
    
    def test_sla_breach(self):
        """Test SLA breach (exceeds target)."""
        # Set created_at to 6 days ago (exceeds 5 day target)
        self.correspondence.created_at = timezone.now() - timedelta(days=6)
        self.correspondence.save()
        
        status = AnalyticsService.calculate_sla_status(self.correspondence)
        self.assertEqual(status['status'], 'breach')
```

#### Test SLA Monitoring Task

```python
# backend/analytics/tests/test_sla_tasks.py
from django.test import TestCase
from celery import current_app
from analytics.tasks import check_sla_and_escalate

class SLAMonitoringTaskTests(TestCase):
    def test_sla_monitoring_runs(self):
        """Test that SLA monitoring task runs without errors."""
        result = check_sla_and_escalate.delay()
        # Task should complete successfully
        self.assertIsNotNone(result)
```

### SLA Status Definitions

```python
# Recommended SLA status thresholds:
SLA_STATUS_THRESHOLDS = {
    'ok': 0.0,          # 0-79% of target used
    'warning': 0.8,     # 80-99% of target used
    'breach': 1.0,      # 100%+ of target used
    'critical': 1.5,    # 150%+ of target used
}
```

### SLA Dashboard Metrics

```python
# backend/analytics/views.py
@action(detail=False, methods=['get'])
def sla_metrics(self, request):
    """Get SLA metrics for dashboard."""
    from analytics.services import AnalyticsService
    
    # Get all pending/in-progress items
    items = Correspondence.objects.filter(
        status__in=[Correspondence.Status.PENDING, Correspondence.Status.IN_PROGRESS]
    )
    
    metrics = {
        'total_items': items.count(),
        'on_track': 0,
        'warning': 0,
        'breach': 0,
        'critical': 0,
    }
    
    for item in items:
        status = AnalyticsService.calculate_sla_status(item)
        metrics[status['status']] += 1
    
    return Response(metrics)
```

---

## 7. Escalation Logic Implementation

### Problem

Escalation rules exist but need verification that:
- Escalation logic is properly implemented
- Escalations trigger at the right time
- Actions are executed correctly
- Cooldown periods are respected

### Current Implementation

Based on codebase review:
- `EscalationRule` model exists
- `Escalation` model exists
- `check_sla_and_escalate` task exists
- Escalation matching logic exists

### Verification Steps

#### 1. Verify Escalation Rule Matching

```python
# backend/analytics/models.py
class EscalationRule(UUIDModel, TimeStampedModel):
    def matches_correspondence(self, correspondence) -> bool:
        """
        Check if this rule should apply to the given correspondence.
        
        Should check:
        1. Trigger type matches (SLA warning/breach/critical, etc.)
        2. Priority matches (if specified)
        3. Division matches (if specified)
        4. Other trigger conditions
        """
        # Implementation should be comprehensive
        pass
```

#### 2. Verify Escalation Action Execution

```python
# backend/analytics/tasks.py
def _execute_escalation_action(escalation, correspondence, rule) -> bool:
    """
    Execute the action specified in the escalation rule.
    
    Actions:
    - EMAIL_ASSIGNEE
    - EMAIL_MANAGER
    - EMAIL_DIVISION_HEAD
    - EMAIL_CUSTOM
    - IN_APP_NOTIFICATION
    - AUTO_ESCALATE
    - DAILY_DIGEST
    """
    action_type = rule.action_type
    
    if action_type == EscalationRule.ActionType.EMAIL_ASSIGNEE:
        # Send email to assignee
        pass
    elif action_type == EscalationRule.ActionType.IN_APP_NOTIFICATION:
        # Create notification
        pass
    elif action_type == EscalationRule.ActionType.AUTO_ESCALATE:
        # Escalate to manager
        pass
    # ... etc
```

### Comprehensive Testing

```python
# backend/analytics/tests/test_escalation.py
from django.test import TestCase
from datetime import timedelta
from django.utils import timezone
from correspondence.models import Correspondence
from analytics.models import EscalationRule, Escalation
from analytics.tasks import check_sla_and_escalate

class EscalationTests(TestCase):
    def setUp(self):
        # Create escalation rule
        self.rule = EscalationRule.objects.create(
            name="SLA Breach Alert",
            trigger_type=EscalationRule.TriggerType.SLA_BREACH,
            action_type=EscalationRule.ActionType.IN_APP_NOTIFICATION,
            is_active=True,
            priority_order=1
        )
        
        # Create correspondence that will breach SLA
        self.correspondence = Correspondence.objects.create(
            subject="Test",
            priority=Correspondence.Priority.HIGH,
            status=Correspondence.Status.PENDING,
            created_at=timezone.now() - timedelta(days=10)  # Breaches 5-day SLA
        )
    
    def test_escalation_rule_matching(self):
        """Test that escalation rule matches correspondence."""
        # Calculate SLA status (should be 'breach')
        from analytics.services import AnalyticsService
        sla_status = AnalyticsService.calculate_sla_status(self.correspondence)
        
        # Rule should match
        self.assertTrue(self.rule.matches_correspondence(self.correspondence))
    
    def test_escalation_creation(self):
        """Test that escalations are created when rules match."""
        # Run escalation check
        result = check_sla_and_escalate.delay()
        
        # Check escalation was created
        escalation = Escalation.objects.filter(
            correspondence=self.correspondence,
            rule=self.rule
        ).first()
        
        self.assertIsNotNone(escalation)
        self.assertEqual(escalation.status, Escalation.Status.PENDING)
    
    def test_escalation_cooldown(self):
        """Test that escalation cooldown is respected."""
        # Create first escalation
        Escalation.objects.create(
            correspondence=self.correspondence,
            rule=self.rule,
            triggered_at=timezone.now() - timedelta(hours=1)  # 1 hour ago
        )
        
        # Rule has 24-hour cooldown, so should not trigger again
        result = check_sla_and_escalate.delay()
        
        # Should not create duplicate escalation
        escalations = Escalation.objects.filter(
            correspondence=self.correspondence,
            rule=self.rule
        )
        self.assertEqual(escalations.count(), 1)
    
    def test_escalation_action_execution(self):
        """Test that escalation actions are executed."""
        # Create escalation
        escalation = Escalation.objects.create(
            correspondence=self.correspondence,
            rule=self.rule,
            status=Escalation.Status.PENDING
        )
        
        # Execute action
        from analytics.tasks import _execute_escalation_action
        result = _execute_escalation_action(escalation, self.correspondence, self.rule)
        
        # Action should be executed
        self.assertTrue(result)
        escalation.refresh_from_db()
        self.assertEqual(escalation.status, Escalation.Status.COMPLETED)
```

### Escalation Rule Priority

```python
# Escalation rules should execute in priority order
# Lower priority_order numbers execute first

# Example:
rule1 = EscalationRule(priority_order=1)  # Executes first
rule2 = EscalationRule(priority_order=2)  # Executes second
rule3 = EscalationRule(priority_order=100)  # Executes last
```

### Escalation Action Types Implementation

```python
# backend/analytics/tasks.py
def _execute_escalation_action(escalation, correspondence, rule) -> bool:
    """Execute escalation action."""
    from notifications.services import NotificationService
    from notifications.models import Notification
    
    action_type = rule.action_type
    
    try:
        if action_type == EscalationRule.ActionType.IN_APP_NOTIFICATION:
            # Create in-app notification
            NotificationService.create_notification(
                recipient=correspondence.current_approver or correspondence.created_by,
                title=f"SLA Alert: {correspondence.subject}",
                message=rule.email_body_template.format(
                    priority=correspondence.get_priority_display(),
                    subject=correspondence.subject,
                    reference=correspondence.reference_number,
                    days_pending=(timezone.now() - correspondence.created_at).days,
                ),
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.HIGH,
                module="analytics",
                related_object_type="correspondence",
                related_object_id=str(correspondence.id),
            )
            return True
            
        elif action_type == EscalationRule.ActionType.EMAIL_ASSIGNEE:
            # Send email to assignee
            if correspondence.current_approver:
                send_mail(
                    subject=rule.email_subject_template.format(
                        priority=correspondence.get_priority_display(),
                        subject=correspondence.subject,
                    ),
                    message=rule.email_body_template.format(
                        priority=correspondence.get_priority_display(),
                        subject=correspondence.subject,
                        reference=correspondence.reference_number,
                        days_pending=(timezone.now() - correspondence.created_at).days,
                        link=f"{settings.FRONTEND_BASE_URL}/correspondence/{correspondence.id}",
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[correspondence.current_approver.email],
                )
                return True
            return False
            
        elif action_type == EscalationRule.ActionType.AUTO_ESCALATE:
            # Escalate to manager
            # Implementation depends on organizational structure
            pass
            
        # ... other action types
        
        escalation.status = Escalation.Status.COMPLETED
        escalation.completed_at = timezone.now()
        escalation.save()
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to execute escalation action: {e}")
        escalation.status = Escalation.Status.FAILED
        escalation.error_message = str(e)
        escalation.save()
        return False
```

---

## 8. Tests for Assignment Scenarios

### Problem

Workflow task assignment logic is complex (role, grade, office, assistants) and needs comprehensive testing to ensure:
- Correct users are assigned
- Edge cases are handled
- Multiple assignment criteria work together
- Assistant assignments are handled correctly

### Assignment Logic Complexity

Workflow steps can be assigned based on:
1. **Role-based:** `required_role`
2. **Grade-based:** `required_grade_level`
3. **Organizational unit:** `directorate`, `division`, `department`
4. **Office-based:** `office`
5. **Assistant requirements:** `requires_all_assistants`

### Test Scenarios

#### 1. Role-Based Assignment

```python
# backend/workflow/tests/test_assignment.py
from django.test import TestCase
from workflow.models import WorkflowTemplate, WorkflowStep, ApprovalTask
from organization.models import Role
from accounts.models import User

class RoleBasedAssignmentTests(TestCase):
    def setUp(self):
        # Create role
        self.role = Role.objects.create(
            name="General Manager",
            is_active=True
        )
        
        # Create users with and without role
        self.user_with_role = User.objects.create_user(
            username="gm_user",
            email="gm@example.com",
            system_role=self.role
        )
        
        self.user_without_role = User.objects.create_user(
            username="regular_user",
            email="regular@example.com"
        )
        
        # Create workflow step requiring role
        self.template = WorkflowTemplate.objects.create(
            name="Test Workflow",
            slug="test-workflow"
        )
        
        self.step = WorkflowStep.objects.create(
            template=self.template,
            order=1,
            title="GM Approval",
            required_role="General Manager"
        )
    
    def test_role_based_assignment(self):
        """Test that users with required role are assigned."""
        from workflow.services import WorkflowService
        
        # Start workflow
        task = WorkflowService.assign_step(self.step, document=None)
        
        # Should assign to user with role
        self.assertEqual(task.assignee, self.user_with_role)
        self.assertNotEqual(task.assignee, self.user_without_role)
```

#### 2. Grade-Based Assignment

```python
class GradeBasedAssignmentTests(TestCase):
    def setUp(self):
        # Create users with different grades
        self.user_grade_17 = User.objects.create_user(
            username="grade17",
            email="grade17@example.com",
            grade_level="GL17"
        )
        
        self.user_grade_14 = User.objects.create_user(
            username="grade14",
            email="grade14@example.com",
            grade_level="GL14"
        )
        
        self.step = WorkflowStep.objects.create(
            template=self.template,
            order=1,
            title="Senior Approval",
            required_grade_level="GL17"
        )
    
    def test_grade_based_assignment(self):
        """Test that users with required grade are assigned."""
        from workflow.services import WorkflowService
        
        task = WorkflowService.assign_step(self.step, document=None)
        
        # Should assign to user with required grade
        self.assertEqual(task.assignee, self.user_grade_17)
        self.assertNotEqual(task.assignee, self.user_grade_14)
```

#### 3. Office-Based Assignment

```python
class OfficeBasedAssignmentTests(TestCase):
    def setUp(self):
        from organization.models import Office, OfficeMembership
        
        # Create office
        self.office = Office.objects.create(
            name="MD Office",
            code="MD-OFFICE"
        )
        
        # Create users in and out of office
        self.user_in_office = User.objects.create_user(
            username="office_user",
            email="office@example.com"
        )
        
        OfficeMembership.objects.create(
            office=self.office,
            user=self.user_in_office,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL
        )
        
        self.user_out_office = User.objects.create_user(
            username="outside_user",
            email="outside@example.com"
        )
        
        self.step = WorkflowStep.objects.create(
            template=self.template,
            order=1,
            title="MD Approval",
            office=self.office
        )
    
    def test_office_based_assignment(self):
        """Test that users in required office are assigned."""
        from workflow.services import WorkflowService
        
        task = WorkflowService.assign_step(self.step, document=None)
        
        # Should assign to user in office
        self.assertEqual(task.assignee, self.user_in_office)
        self.assertNotEqual(task.assignee, self.user_out_office)
```

#### 4. Combined Criteria Assignment

```python
class CombinedCriteriaAssignmentTests(TestCase):
    def test_role_and_grade_assignment(self):
        """Test assignment with multiple criteria."""
        # Create user matching both criteria
        role = Role.objects.create(name="Manager")
        user_both = User.objects.create_user(
            username="both",
            email="both@example.com",
            system_role=role,
            grade_level="GL17"
        )
        
        # Create user matching only one
        user_role_only = User.objects.create_user(
            username="role_only",
            email="role@example.com",
            system_role=role,
            grade_level="GL14"
        )
        
        step = WorkflowStep.objects.create(
            template=self.template,
            order=1,
            title="Senior Manager Approval",
            required_role="Manager",
            required_grade_level="GL17"
        )
        
        from workflow.services import WorkflowService
        task = WorkflowService.assign_step(step, document=None)
        
        # Should assign to user matching both criteria
        self.assertEqual(task.assignee, user_both)
        self.assertNotEqual(task.assignee, user_role_only)
```

#### 5. Assistant Assignment

```python
class AssistantAssignmentTests(TestCase):
    def test_assistant_assignment(self):
        """Test assignment to assistants."""
        from organization.models import Office, OfficeMembership
        
        # Create office with principal and assistants
        office = Office.objects.create(name="ED Office", code="ED-OFFICE")
        
        principal = User.objects.create_user(username="principal", email="p@example.com")
        assistant1 = User.objects.create_user(username="assistant1", email="a1@example.com")
        assistant2 = User.objects.create_user(username="assistant2", email="a2@example.com")
        
        OfficeMembership.objects.create(
            office=office,
            user=principal,
            assignment_role=OfficeMembership.AssignmentRole.PRINCIPAL
        )
        
        OfficeMembership.objects.create(
            office=office,
            user=assistant1,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT
        )
        
        OfficeMembership.objects.create(
            office=office,
            user=assistant2,
            assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT
        )
        
        step = WorkflowStep.objects.create(
            template=self.template,
            order=1,
            title="Assistant Review",
            office=office,
            requires_all_assistants=True
        )
        
        from workflow.services import WorkflowService
        tasks = WorkflowService.assign_step(step, document=None, require_all_assistants=True)
        
        # Should create tasks for all assistants
        self.assertEqual(tasks.count(), 2)
        self.assertIn(assistant1, [t.assignee for t in tasks])
        self.assertIn(assistant2, [t.assignee for t in tasks])
```

#### 6. No Matching User Scenario

```python
class NoMatchingUserTests(TestCase):
    def test_no_matching_user_handling(self):
        """Test handling when no user matches criteria."""
        step = WorkflowStep.objects.create(
            template=self.template,
            order=1,
            title="Special Approval",
            required_role="NonExistentRole"
        )
        
        from workflow.services import WorkflowService
        
        # Should handle gracefully
        with self.assertRaises(ValueError) as context:
            WorkflowService.assign_step(step, document=None)
        
        self.assertIn("No user found", str(context.exception))
```

### Assignment Service Implementation

```python
# backend/workflow/services.py
class WorkflowService:
    @staticmethod
    def assign_step(step: WorkflowStep, document=None, correspondence=None) -> ApprovalTask:
        """Assign workflow step to appropriate user(s)."""
        from organization.models import OfficeMembership
        
        queryset = User.objects.filter(is_active=True)
        
        # Apply role filter
        if step.required_role:
            queryset = queryset.filter(system_role__name=step.required_role)
        
        # Apply grade filter
        if step.required_grade_level:
            queryset = queryset.filter(grade_level=step.required_grade_level)
        
        # Apply organizational filters
        if step.directorate:
            queryset = queryset.filter(directorate=step.directorate)
        if step.division:
            queryset = queryset.filter(division=step.division)
        if step.department:
            queryset = queryset.filter(department=step.department)
        
        # Apply office filter
        if step.office:
            if step.requires_all_assistants:
                # Get all assistants in office
                memberships = OfficeMembership.objects.filter(
                    office=step.office,
                    assignment_role=OfficeMembership.AssignmentRole.SECRETARIAT,
                    is_active=True
                )
                user_ids = memberships.values_list('user_id', flat=True)
                queryset = queryset.filter(id__in=user_ids)
            else:
                # Get principal or staff in office
                memberships = OfficeMembership.objects.filter(
                    office=step.office,
                    assignment_role__in=[
                        OfficeMembership.AssignmentRole.PRINCIPAL,
                        OfficeMembership.AssignmentRole.STAFF
                    ],
                    is_active=True
                )
                user_ids = memberships.values_list('user_id', flat=True)
                queryset = queryset.filter(id__in=user_ids)
        
        # Get matching users
        users = list(queryset)
        
        if not users:
            raise ValueError(f"No user found matching criteria for step: {step.title}")
        
        # If requires all assistants, create tasks for all
        if step.requires_all_assistants and len(users) > 1:
            tasks = []
            for user in users:
                task = ApprovalTask.objects.create(
                    template=step.template,
                    step=step,
                    document=document,
                    correspondence=correspondence,
                    assignee=user,
                    status=ApprovalTask.Status.PENDING
                )
                tasks.append(task)
            return tasks
        
        # Otherwise, assign to first matching user
        # (Could implement round-robin or other logic)
        user = users[0]
        
        task = ApprovalTask.objects.create(
            template=step.template,
            step=step,
            document=document,
            correspondence=correspondence,
            assignee=user,
            status=ApprovalTask.Status.PENDING
        )
        
        return task
```

---

*[Document continues with remaining sections 9-21...]*

Due to length, I'll create a summary document. The full elaboration document has been started with detailed implementations for sections 1-8. Would you like me to:

1. Continue adding the remaining sections (9-21) to complete the document?
2. Create a separate document for the remaining sections?
3. Focus on specific sections you'd like prioritized?

The document currently covers:
- ✅ Organization Models Overview
- ✅ Fix Duplicate Indexes
- ✅ Office Code Validation
- ✅ Office Membership Audit
- ✅ Password Reset
- ✅ SLA Tracking (started)
- ✅ Escalation Logic (started)
- ✅ Assignment Tests (started)

Remaining sections to add:
- Workflow Visualization
- Document Templates Backend Migration
- JSON Schema Validation
- Template Versioning
- Explicit Sharing UI
- Template Categories
- Template Search
- Template Preview
- Missing Audit Actions
- Log Retention
- Compliance Reports
- Anomaly Detection
- Data Masking

Should I continue with the remaining sections?


