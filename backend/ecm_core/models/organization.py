"""
Organizational Structure Models for ECM

This module defines the hierarchical organizational structure:
- Department: Hierarchical departments (HR, Operations, Finance, Legal, etc.)
- Port: NPA ports with sub-units  
- OrganizationalUnit: Generic unit for headquarters/departments/ports/sub-units hierarchy
- User: Extended Django user with role-based access per organizational unit
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
import uuid


class Department(models.Model):
    """Hierarchical departments within NPA"""
    
    DEPARTMENT_TYPES = [
        ('headquarters', 'Headquarters'),
        ('functional', 'Functional Department'),
        ('operational', 'Operational Department'),
        ('support', 'Support Department'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(
        max_length=20, 
        unique=True,
        validators=[RegexValidator(r'^[A-Z0-9_]+$', 'Only uppercase letters, numbers and underscores allowed.')]
    )
    description = models.TextField(blank=True)
    department_type = models.CharField(max_length=20, choices=DEPARTMENT_TYPES, default='functional')
    
    # Hierarchical structure
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sub_departments')
    
    # Contact information
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Status and metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'departments'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['parent', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def get_ancestors(self):
        """Get all ancestor departments up the hierarchy"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors
    
    def get_descendants(self):
        """Get all descendant departments down the hierarchy"""
        descendants = list(self.sub_departments.all())
        for sub_dept in list(descendants):
            descendants.extend(sub_dept.get_descendants())
        return descendants


class Port(models.Model):
    """NPA ports with sub-units"""
    
    PORT_TYPES = [
        ('major', 'Major Port'),
        ('minor', 'Minor Port'),
        ('terminal', 'Terminal'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(
        max_length=10, 
        unique=True,
        validators=[RegexValidator(r'^[A-Z0-9]+$', 'Only uppercase letters and numbers allowed.')]
    )
    description = models.TextField(blank=True)
    port_type = models.CharField(max_length=20, choices=PORT_TYPES, default='major')
    
    # Location information
    location = models.CharField(max_length=200)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='Nigeria')
    
    # Contact information
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Operational details
    capacity_annual = models.BigIntegerField(null=True, blank=True, help_text="Annual capacity in TEUs")
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ports'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class OrganizationalUnit(models.Model):
    """Generic organizational unit for hierarchy management"""
    
    UNIT_TYPES = [
        ('headquarters', 'NPA Headquarters'),
        ('department', 'Department'),
        ('division', 'Division'),
        ('unit', 'Unit'),
        ('team', 'Team'),
        ('port', 'Port'),
        ('terminal', 'Terminal'),
        ('section', 'Section'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    unit_type = models.CharField(max_length=20, choices=UNIT_TYPES)
    
    # Hierarchical structure - can link to departments or ports
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sub_units')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True, related_name='units')
    port = models.ForeignKey(Port, on_delete=models.CASCADE, null=True, blank=True, related_name='units')
    
    # Contact information
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Manager role (will link to User model)
    manager_position = models.CharField(max_length=100, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'organizational_units'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['unit_type']),
            models.Index(fields=['parent', 'is_active']),
            models.Index(fields=['department', 'is_active']),
            models.Index(fields=['port', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def get_full_path(self):
        """Get the full hierarchical path of this unit"""
        path = [self.name]
        current = self.parent
        while current:
            path.insert(0, current.name)
            current = current.parent
        return ' > '.join(path)


class User(AbstractUser):
    """Extended Django User model for ECM with organizational hierarchy support"""
    
    ROLE_CHOICES = [
        ('md', 'Managing Director'),
        ('ed', 'Executive Director'),
        ('gm', 'General Manager'),
        ('agm', 'Assistant General Manager'),
        ('pm', 'Principal Manager'),
        ('sm', 'Senior Manager'),
        ('manager', 'Manager'),
        ('am', 'Assistant Manager'),
        ('senior_officer', 'Senior Officer'),
        ('officer', 'Officer'),
        ('junior_officer', 'Junior Officer'),
        ('staff', 'Staff'),
        ('secretary', 'Secretary'),
        ('registry', 'Registry Officer'),
        ('admin', 'System Administrator'),
    ]
    
    EMPLOYMENT_STATUS = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_leave', 'On Leave'),
        ('terminated', 'Terminated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic employee information
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='officer')
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS, default='active')
    
    # Organizational assignment
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    port = models.ForeignKey(Port, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    organizational_unit = models.ForeignKey(OrganizationalUnit, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    
    # Additional profile information
    phone_number = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/%Y/%m/', blank=True, null=True)
    
    # Extended fields
    job_title = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    
    # Permissions and access control
    document_access_level = models.CharField(
        max_length=20,
        choices=[
            ('read', 'Read Only'),
            ('write', 'Read & Write'),
            ('admin', 'Administrator'),
        ],
        default='read'
    )

    # Secretary-specific fields
    is_secretary = models.BooleanField(default=False)
    reports_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='secretaries')
    can_act_on_behalf = models.BooleanField(default=False)
    delegation_level = models.CharField(
        max_length=20,
        choices=[
            ('full', 'Full Authority'),
            ('routine', 'Routine Matters Only'),
            ('none', 'No Delegation')
        ],
        default='routine'
    )

    # Status and metadata
    is_active = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['department', 'is_active']),
            models.Index(fields=['port', 'is_active']),
            models.Index(fields=['organizational_unit', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username}) - {self.get_role_display()}"
    
    def get_role_display_name(self):
        """Get full role display name"""
        return dict(self.ROLE_CHOICES).get(self.role, self.role.title())
    
    def get_organizational_path(self):
        """Get the full organizational path for this user"""
        path_parts = []
        
        if self.department:
            path_parts.append(self.department.name)
        if self.port:
            path_parts.append(self.port.name)
        if self.organizational_unit:
            path_parts.append(self.organizational_unit.get_full_path())
        
        return ' > '.join(path_parts) if path_parts else 'Unassigned'
    
    def can_access_department(self, department):
        """Check if user can access documents from a specific department"""
        if self.role in ['admin']:
            return True
        return self.department == department
    
    def can_manage_documents(self):
        """Check if user can manage (create/edit/approve) documents"""
        return self.role in ['admin', 'supervisor', 'manager'] and self.is_active
