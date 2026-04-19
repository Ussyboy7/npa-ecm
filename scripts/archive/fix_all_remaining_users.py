#!/usr/bin/env python
"""
Comprehensive script to fix ALL remaining user hierarchy issues.
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

def fix_all_remaining():
    """Fix all remaining hierarchy issues with specific mappings."""
    
    print("=" * 80)
    print("FIXING ALL REMAINING USER HIERARCHY ISSUES")
    print("=" * 80)
    print()
    
    fixes_applied = 0
    
    # Get directorates
    md_office = Directorate.objects.get(name='Managing Director Office')
    ed_ets = Directorate.objects.get(name='Executive Director, Engineering & Technical Services')
    ed_fa = Directorate.objects.get(name='Executive Director, Finance & Administration')
    ed_mo = Directorate.objects.get(name='Executive Director, Marine & Operations')
    
    # Specific user fixes based on email patterns
    user_fixes = [
        # MD and EDs
        ('md@npa.gov.ng', md_office, None, None, 'Managing Director Office'),
        ('ed.ets@npa.gov.ng', ed_ets, None, None, 'Executive Director, Engineering & Technical Services'),
        ('ed.fa@npa.gov.ng', ed_fa, None, None, 'Executive Director, Finance & Administration'),
        ('ed.mo@npa.gov.ng', ed_mo, None, None, 'Executive Director, Marine & Operations'),
        
        # AGMs
        ('agm.overseas@npa.gov.ng', md_office, 'Oversea Liaison Office', None, 'Oversea Liaison Office'),
        
        # Assistants
        ('assistant.md@npa.gov.ng', md_office, None, None, 'Managing Director Office (Assistant)'),
        
        # GMs
        ('gm.erm@npa.gov.ng', ed_fa, 'Executive Director, Finance & Administration - Direct Reports', None, 'EDFA Direct Reports'),
        ('gm.ops@npa.gov.ng', ed_mo, 'Operations', None, 'Operations'),
    ]
    
    for email_pattern, target_directorate, division_name, dept_name, description in user_fixes:
        try:
            # Handle duplicates - get most recent active user
            users = User.objects.filter(email=email_pattern, is_active=True).order_by('-date_joined')
            if not users.exists():
                print(f"⚠️  User not found: {email_pattern}")
                continue
            
            user = users.first()
            
            # Skip if already has correct assignment
            if user.directorate == target_directorate:
                if division_name:
                    division = Division.objects.filter(name=division_name, directorate=target_directorate).first()
                    if division and user.division == division:
                        continue
                else:
                    continue
            
            # Apply fixes
            user.directorate = target_directorate
            
            if division_name:
                division = Division.objects.filter(name=division_name, directorate=target_directorate).first()
                if division:
                    user.division = division
                    
                    if dept_name:
                        dept = Department.objects.filter(name=dept_name, division=division).first()
                        if dept:
                            user.department = dept
            
            user.save()
            print(f"✓ Fixed: {user.get_full_name() or user.username} ({email_pattern}) - {description}")
            fixes_applied += 1
            
        except Exception as e:
            print(f"⚠️  Could not fix {email_pattern}: {e}")
    
    # Also fix admin@npa.com if it's the super admin
    try:
        admin_user = User.objects.filter(email='admin@npa.com', is_active=True).first()
        if admin_user and not admin_user.directorate:
            admin_user.directorate = md_office
            admin_user.save()
            print(f"✓ Fixed: {admin_user.get_full_name() or admin_user.username} - Assigned to Managing Director Office")
            fixes_applied += 1
    except Exception as e:
        print(f"⚠️  Could not fix admin@npa.com: {e}")
    
    print()
    print("=" * 80)
    print(f"Total Fixes Applied: {fixes_applied}")
    print("=" * 80)
    print()
    
    return fixes_applied

if __name__ == '__main__':
    try:
        fixes = fix_all_remaining()
        
        print("=" * 80)
        print("FINAL VERIFICATION")
        print("=" * 80)
        print()
        
        # Re-verify
        from verify_user_hierarchy import verify_user_hierarchy
        success = verify_user_hierarchy()
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

