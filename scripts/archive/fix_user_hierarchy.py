#!/usr/bin/env python
"""
Script to fix user hierarchy data issues.
Fixes hierarchy mismatches and assigns missing hierarchy to users.
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

def fix_hierarchy_issues():
    """Fix all hierarchy issues found in verification."""
    
    print("=" * 80)
    print("FIXING USER HIERARCHY ISSUES")
    print("=" * 80)
    print()
    
    fixes_applied = 0
    
    # Fix 1: Engr. Bello - Hydrographic is in Engineering division (not Marine)
    try:
        users = User.objects.filter(email='agm.hydrographic@npa.gov.ng')
        if users.exists():
            user = users.first()
            # Hydrographic department is in Engineering & Technical Services division
            correct_directorate = Directorate.objects.get(name='Executive Director, Engineering & Technical Services')
            correct_division = Division.objects.get(name='Engineering & Technical Services', directorate=correct_directorate)
            correct_department = Department.objects.filter(name__icontains='Hydrographic', division=correct_division).first()
        
            if correct_directorate and correct_division:
                if user.directorate != correct_directorate or user.division != correct_division:
                    user.directorate = correct_directorate
                    user.division = correct_division
                    if correct_department:
                        user.department = correct_department
                    user.save()
                    print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Engineering & Technical Services")
                    fixes_applied += 1
    except Exception as e:
        print(f"⚠️  Could not fix agm.hydrographic@npa.gov.ng: {e}")
    
    # Fix 2: Mr. Balogun - Department 'Investment' should be in 'Superannuation & Investment' division
    try:
        user = User.objects.get(email='agm.investment@npa.gov.ng')
        correct_directorate = Directorate.objects.get(name='Executive Director, Finance & Administration')
        correct_division = Division.objects.get(name='Superannuation & Investment', directorate=correct_directorate)
        correct_department = Department.objects.get(name='Investment', division=correct_division)
        
        if user.directorate != correct_directorate or user.division != correct_division or user.department != correct_department:
            user.directorate = correct_directorate
            user.division = correct_division
            user.department = correct_department
            user.save()
            print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to correct hierarchy")
            fixes_applied += 1
    except Exception as e:
        print(f"⚠️  Could not fix agm.investment@npa.gov.ng: {e}")
    
    # Fix 3: Mrs. Okoro - Performance Management is in HR division, not Monitoring
    try:
        users = User.objects.filter(email='agm.performance@npa.gov.ng')
        if users.exists():
            user = users.first()
            # Performance Management is in Human Resources division
            correct_directorate = Directorate.objects.get(name='Executive Director, Finance & Administration')
            correct_division = Division.objects.get(name='Human Resources', directorate=correct_directorate)
            correct_department = Department.objects.filter(name__icontains='Performance', division=correct_division).first()
            
            if correct_directorate and correct_division:
                if user.directorate != correct_directorate or user.division != correct_division:
                    user.directorate = correct_directorate
                    user.division = correct_division
                    if correct_department:
                        user.department = correct_department
                    user.save()
                    print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Human Resources")
                    fixes_applied += 1
    except Exception as e:
        print(f"⚠️  Could not fix agm.performance@npa.gov.ng: {e}")
    
    # Fix 4: Mr. Musa (abuja) - Add division for department
    try:
        user = User.objects.get(email='agm.abuja@npa.gov.ng')
        correct_directorate = Directorate.objects.get(name='Managing Director Office')
        correct_division = Division.objects.get(name='Abuja Liaison Office', directorate=correct_directorate)
        correct_department = Department.objects.get(name='Abuja Liaison Office', division=correct_division)
        
        if user.division != correct_division:
            user.directorate = correct_directorate
            user.division = correct_division
            user.department = correct_department
            user.save()
            print(f"✓ Fixed: {user.get_full_name() or user.username} - Added missing division")
            fixes_applied += 1
    except Exception as e:
        print(f"⚠️  Could not fix agm.abuja@npa.gov.ng: {e}")
    
    # Fix 5: Mrs. Adekunle (erm) - Add division for department
    try:
        user = User.objects.get(email='agm.erm@npa.gov.ng')
        correct_directorate = Directorate.objects.get(name='Executive Director, Finance & Administration')
        correct_division = Division.objects.get(name='Executive Director, Finance & Administration - Direct Reports', directorate=correct_directorate)
        correct_department = Department.objects.get(name='Enterprise Risk Management', division=correct_division)
        
        if user.division != correct_division:
            user.directorate = correct_directorate
            user.division = correct_division
            user.department = correct_department
            user.save()
            print(f"✓ Fixed: {user.get_full_name() or user.username} - Added missing division")
            fixes_applied += 1
    except Exception as e:
        print(f"⚠️  Could not fix agm.erm@npa.gov.ng: {e}")
    
    # Fix 6: Assign hierarchy to MD (handle duplicates - use most recent active one)
    try:
        users = User.objects.filter(email='md@npa.gov.ng', is_active=True).order_by('-date_joined')
        if users.exists():
            user = users.first()
            correct_directorate = Directorate.objects.get(name='Managing Director Office')
            
            if user.directorate != correct_directorate:
                user.directorate = correct_directorate
                user.save()
                print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to Managing Director Office")
                fixes_applied += 1
    except Exception as e:
        print(f"⚠️  Could not fix md@npa.gov.ng: {e}")
    
    # Fix 7: Assign hierarchy to EDs (handle duplicates)
    ed_assignments = {
        'ed.ets@npa.gov.ng': 'Executive Director, Engineering & Technical Services',
        'ed.fa@npa.gov.ng': 'Executive Director, Finance & Administration',
        'ed.mo@npa.gov.ng': 'Executive Director, Marine & Operations',
    }
    
    for email, directorate_name in ed_assignments.items():
        try:
            users = User.objects.filter(email=email, is_active=True).order_by('-date_joined')
            if users.exists():
                user = users.first()
                correct_directorate = Directorate.objects.get(name=directorate_name)
                
                if user.directorate != correct_directorate:
                    user.directorate = correct_directorate
                    user.save()
                    print(f"✓ Fixed: {user.get_full_name() or user.username} - Assigned to {directorate_name}")
                    fixes_applied += 1
        except Exception as e:
            print(f"⚠️  Could not fix {email}: {e}")
    
    print()
    print("=" * 80)
    print(f"Fixes Applied: {fixes_applied}")
    print("=" * 80)
    print()
    
    return fixes_applied

def display_hierarchy():
    """Display the complete organizational hierarchy."""
    
    print("=" * 80)
    print("ORGANIZATIONAL HIERARCHY STRUCTURE")
    print("=" * 80)
    print()
    
    directorates = Directorate.objects.select_related('executive_director').prefetch_related(
        'divisions__departments',
        'divisions__general_manager'
    ).all().order_by('name')
    
    for directorate in directorates:
        ed_name = directorate.executive_director.get_full_name() if directorate.executive_director else "Not Assigned"
        print(f"📁 {directorate.name}")
        print(f"   Executive Director: {ed_name}")
        print(f"   Code: {directorate.code}")
        print()
        
        divisions = directorate.divisions.all().order_by('name')
        for division in divisions:
            gm_name = division.general_manager.get_full_name() if division.general_manager else "Not Assigned"
            print(f"   📂 {division.name}")
            print(f"      General Manager: {gm_name}")
            print(f"      Code: {division.code}")
            
            departments = division.departments.all().order_by('name')
            for department in departments:
                hod_name = department.head_of_department.get_full_name() if department.head_of_department else "Not Assigned"
                user_count = User.objects.filter(department=department).count()
                print(f"      📄 {department.name} ({user_count} users)")
                print(f"         Head: {hod_name}")
                print(f"         Code: {department.code}")
            
            if not departments.exists():
                print(f"      (No departments)")
            print()
        
        if not divisions.exists():
            print(f"   (No divisions)")
        print()
    
    print("=" * 80)
    print()

if __name__ == '__main__':
    try:
        # Display hierarchy first
        display_hierarchy()
        
        # Then fix issues
        fixes = fix_hierarchy_issues()
        
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

