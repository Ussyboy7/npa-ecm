#!/usr/bin/env python
"""
Script to verify user hierarchy data integrity.
Checks that all users have proper directorate, division, department assignments
and that hierarchy relationships are correct.
"""

import os
import sys
import django

# Setup Django
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecm_backend.settings')
django.setup()

from accounts.models import User
from organization.models import Directorate, Division, Department

def verify_user_hierarchy():
    """Verify all users have proper hierarchy assignments."""
    
    print("=" * 80)
    print("USER HIERARCHY VERIFICATION REPORT")
    print("=" * 80)
    print()
    
    all_users = User.objects.select_related('directorate', 'division', 'department', 'division__directorate', 'department__division', 'department__division__directorate').all()
    total_users = all_users.count()
    
    print(f"Total Users: {total_users}")
    print()
    
    issues = []
    stats = {
        'has_directorate': 0,
        'has_division': 0,
        'has_department': 0,
        'directorate_from_division': 0,
        'directorate_from_department': 0,
        'missing_all': 0,
        'hierarchy_mismatch': 0,
    }
    
    for user in all_users:
        user_issues = []
        
        # Check direct assignments
        has_directorate = user.directorate is not None
        has_division = user.division is not None
        has_department = user.department is not None
        
        if has_directorate:
            stats['has_directorate'] += 1
        if has_division:
            stats['has_division'] += 1
        if has_department:
            stats['has_department'] += 1
        
        # Derive directorate from division if not directly set
        derived_directorate = None
        if not has_directorate and has_division:
            derived_directorate = user.division.directorate if user.division else None
            if derived_directorate:
                stats['directorate_from_division'] += 1
        
        # Derive directorate from department if not directly set
        if not has_directorate and not derived_directorate and has_department:
            derived_directorate = user.department.division.directorate if user.department and user.department.division else None
            if derived_directorate:
                stats['directorate_from_department'] += 1
        
        # Check if user has any hierarchy assignment
        if not has_directorate and not has_division and not has_department:
            stats['missing_all'] += 1
            user_issues.append("Missing all hierarchy assignments (directorate, division, department)")
        
        # Check hierarchy consistency
        if has_division and has_directorate:
            if user.division.directorate_id != user.directorate.id:
                stats['hierarchy_mismatch'] += 1
                user_issues.append(f"Division '{user.division.name}' does not belong to directorate '{user.directorate.name}'")
        
        if has_department and has_division:
            if user.department.division_id != user.division.id:
                stats['hierarchy_mismatch'] += 1
                user_issues.append(f"Department '{user.department.name}' does not belong to division '{user.division.name}'")
        
        if has_department and not has_division:
            stats['hierarchy_mismatch'] += 1
            user_issues.append("Has department but no division assigned")
        
        if has_division and not has_directorate and not derived_directorate:
            user_issues.append("Has division but no directorate (and cannot derive from division)")
        
        if user_issues:
            issues.append({
                'user': user,
                'issues': user_issues,
                'directorate': user.directorate.name if user.directorate else (derived_directorate.name if derived_directorate else 'N/A'),
                'division': user.division.name if user.division else 'N/A',
                'department': user.department.name if user.department else 'N/A',
            })
    
    # Print statistics
    print("STATISTICS:")
    print("-" * 80)
    print(f"Users with directorate: {stats['has_directorate']} ({stats['has_directorate']/total_users*100:.1f}%)")
    print(f"Users with division: {stats['has_division']} ({stats['has_division']/total_users*100:.1f}%)")
    print(f"Users with department: {stats['has_department']} ({stats['has_department']/total_users*100:.1f}%)")
    print(f"Users missing all: {stats['missing_all']} ({stats['missing_all']/total_users*100:.1f}%)")
    print(f"Users with hierarchy mismatches: {stats['hierarchy_mismatch']} ({stats['hierarchy_mismatch']/total_users*100:.1f}%)")
    print(f"Users who can derive directorate from division: {stats['directorate_from_division']}")
    print(f"Users who can derive directorate from department: {stats['directorate_from_department']}")
    print()
    
    # Print issues
    if issues:
        print("=" * 80)
        print(f"ISSUES FOUND: {len(issues)} users with problems")
        print("=" * 80)
        print()
        
        for issue in issues[:50]:  # Show first 50 issues
            user = issue['user']
            print(f"User: {user.get_full_name() or user.username} ({user.email})")
            print(f"  Directorate: {issue['directorate']}")
            print(f"  Division: {issue['division']}")
            print(f"  Department: {issue['department']}")
            print(f"  Grade Level: {user.grade_level or 'N/A'}")
            print(f"  System Role: {user.system_role.name if user.system_role else 'N/A'}")
            for problem in issue['issues']:
                print(f"  ⚠️  {problem}")
            print()
        
        if len(issues) > 50:
            print(f"... and {len(issues) - 50} more users with issues")
            print()
    else:
        print("=" * 80)
        print("✓ NO ISSUES FOUND - All users have proper hierarchy assignments!")
        print("=" * 80)
        print()
    
    # Check organizational structure
    print("=" * 80)
    print("ORGANIZATIONAL STRUCTURE SUMMARY")
    print("=" * 80)
    print()
    
    directorates = Directorate.objects.all()
    print(f"Total Directorates: {directorates.count()}")
    for dir in directorates:
        divisions = dir.divisions.all()
        print(f"  - {dir.name}: {divisions.count()} divisions")
        for div in divisions:
            depts = div.departments.all()
            print(f"    - {div.name}: {depts.count()} departments")
            for dept in depts:
                users_in_dept = User.objects.filter(department=dept).count()
                print(f"      - {dept.name}: {users_in_dept} users")
    print()
    
    return len(issues) == 0

if __name__ == '__main__':
    try:
        success = verify_user_hierarchy()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

