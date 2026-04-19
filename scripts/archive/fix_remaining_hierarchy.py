#!/usr/bin/env python
"""
Script to fix remaining user hierarchy issues.
Assigns appropriate hierarchy to users missing assignments.
"""

import os
import sys
import django

backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecm_backend.settings')
django.setup()

from accounts.models import User
from organization.models import Directorate, Division, Department

def fix_remaining_issues():
    """Fix all remaining hierarchy issues."""
    
    print("=" * 80)
    print("FIXING REMAINING USER HIERARCHY ISSUES")
    print("=" * 80)
    print()
    
    fixes_applied = 0
    
    # Get all users missing hierarchy
    all_missing = User.objects.filter(
        directorate__isnull=True,
        division__isnull=True,
        department__isnull=True,
        is_active=True
    ).order_by('-date_joined')
    
    # Manually dedupe by email (keep most recent)
    seen_emails = set()
    users_missing = []
    for user in all_missing:
        if user.email:
            if user.email not in seen_emails:
                seen_emails.add(user.email)
                users_missing.append(user)
        else:
            # Users without email - include them
            users_missing.append(user)
    
    print(f"Found {len(users_missing)} users missing all hierarchy assignments")
    print()
    
    # Get directorates
    md_office = Directorate.objects.filter(name__icontains='Managing Director').first()
    ed_ets = Directorate.objects.filter(name__icontains='Engineering & Technical').first()
    ed_fa = Directorate.objects.filter(name__icontains='Finance & Administration').first()
    ed_mo = Directorate.objects.filter(name__icontains='Marine & Operations').first()
    
    for user in users_missing:
        try:
            email = user.email or ''
            grade_level = user.grade_level or ''
            system_role = user.system_role.name if user.system_role else ''
            username = user.username or ''
            
            # Skip only test accounts, but fix admin accounts
            if 'apitester' in email.lower() or 'test' in username.lower():
                print(f"⏭️  Skipping test account: {user.get_full_name() or user.username} ({email})")
                continue
            
            assigned = False
            
            # Assign based on grade level and role
            if grade_level == 'MDCS' or 'Managing Director' in system_role:
                if md_office:
                    user.directorate = md_office
                    user.save()
                    print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Managing Director Office")
                    fixes_applied += 1
                    assigned = True
            
            elif grade_level == 'EDCS' or 'Executive Director' in system_role:
                # Assign based on email or name
                if 'ets' in email.lower() or 'engineering' in email.lower() or 'technical' in email.lower():
                    if ed_ets:
                        user.directorate = ed_ets
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Executive Director, Engineering & Technical Services")
                        fixes_applied += 1
                        assigned = True
                elif 'fa' in email.lower() or 'finance' in email.lower() or 'admin' in email.lower():
                    if ed_fa:
                        user.directorate = ed_fa
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Executive Director, Finance & Administration")
                        fixes_applied += 1
                        assigned = True
                elif 'mo' in email.lower() or 'marine' in email.lower() or 'operations' in email.lower():
                    if ed_mo:
                        user.directorate = ed_mo
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Executive Director, Marine & Operations")
                        fixes_applied += 1
                        assigned = True
                else:
                    # Default to first ED if can't determine
                    if ed_fa:
                        user.directorate = ed_fa
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Executive Director, Finance & Administration (default)")
                        fixes_applied += 1
                        assigned = True
            
            elif 'GM' in grade_level or 'General Manager' in system_role:
                # Try to find division based on email or name
                if 'oversea' in email.lower() or 'overseas' in email.lower():
                    division = Division.objects.filter(name__icontains='Oversea').first()
                    if division:
                        user.directorate = division.directorate
                        user.division = division
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to {division.name}")
                        fixes_applied += 1
                        assigned = True
                elif 'erm' in email.lower() or 'risk' in email.lower():
                    division = Division.objects.filter(name__icontains='Direct Reports').first()
                    if division:
                        user.directorate = division.directorate
                        user.division = division
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to {division.name}")
                        fixes_applied += 1
                        assigned = True
                elif 'ops' in email.lower() or 'operations' in email.lower():
                    division = Division.objects.filter(name__icontains='Operations', directorate=ed_mo).first()
                    if division:
                        user.directorate = division.directorate
                        user.division = division
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to {division.name}")
                        fixes_applied += 1
                        assigned = True
                else:
                    # Assign to MD office as default for GMs
                    if md_office:
                        user.directorate = md_office
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Managing Director Office (default)")
                        fixes_applied += 1
                        assigned = True
            
            elif 'AGM' in grade_level or 'Assistant General Manager' in system_role:
                # Try to find department based on email
                if 'abuja' in email.lower():
                    dept = Department.objects.filter(name__icontains='Abuja').first()
                    if dept:
                        user.directorate = dept.division.directorate
                        user.division = dept.division
                        user.department = dept
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to {dept.name}")
                        fixes_applied += 1
                        assigned = True
                elif 'oversea' in email.lower() or 'overseas' in email.lower():
                    division = Division.objects.filter(name__icontains='Oversea').first()
                    if division:
                        user.directorate = division.directorate
                        user.division = division
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to {division.name}")
                        fixes_applied += 1
                        assigned = True
                else:
                    # Assign to MD office as default
                    if md_office:
                        user.directorate = md_office
                        user.save()
                        print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Managing Director Office (default)")
                        fixes_applied += 1
                        assigned = True
            
            elif 'Assistant' in system_role or 'PA' in system_role or 'TA' in system_role:
                # Assistants - assign based on their executive's directorate if possible
                # For now, assign to MD office
                if md_office:
                    user.directorate = md_office
                    user.save()
                    print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Managing Director Office (assistant)")
                    fixes_applied += 1
                    assigned = True
            
            else:
                # For other users, assign to MD office as default
                if md_office:
                    user.directorate = md_office
                    user.save()
                    print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Managing Director Office (default)")
                    fixes_applied += 1
                    assigned = True
            
            if not assigned:
                print(f"⚠️  Could not assign hierarchy to: {user.get_full_name() or user.username} ({email})")
        
        except Exception as e:
            print(f"⚠️  Error fixing {user.get_full_name() or user.username}: {e}")
    
    print()
    print("=" * 80)
    print(f"Fixes Applied: {fixes_applied}")
    print("=" * 80)
    print()
    
    return fixes_applied

if __name__ == '__main__':
    try:
        fixes = fix_remaining_issues()
        
        print("=" * 80)
        print("VERIFICATION - Re-running check...")
        print("=" * 80)
        print()
        
        # Re-verify
        from verify_user_hierarchy import verify_user_hierarchy
        verify_user_hierarchy()
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

