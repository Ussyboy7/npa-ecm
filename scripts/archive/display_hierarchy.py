#!/usr/bin/env python
"""Display organizational hierarchy in a clean format."""

import os
import sys
import django

backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecm_backend.settings')
django.setup()

from organization.models import Directorate, Division, Department
from accounts.models import User

def display_hierarchy():
    """Display the complete organizational hierarchy."""
    
    print("=" * 100)
    print("ORGANIZATIONAL HIERARCHY STRUCTURE")
    print("=" * 100)
    print()
    
    directorates = Directorate.objects.select_related('executive_director').prefetch_related(
        'divisions__departments',
        'divisions__general_manager',
        'divisions__departments__head_of_department'
    ).all().order_by('name')
    
    total_divisions = 0
    total_departments = 0
    total_users = 0
    
    for directorate in directorates:
        ed_name = directorate.executive_director.get_full_name() if directorate.executive_director else "Not Assigned"
        dir_users = User.objects.filter(directorate=directorate).count()
        total_users += dir_users
        
        print(f"📁 {directorate.name}")
        print(f"   Executive Director: {ed_name}")
        print(f"   Code: {directorate.code}")
        print(f"   Total Users: {dir_users}")
        print()
        
        divisions = directorate.divisions.all().order_by('name')
        total_divisions += divisions.count()
        
        for division in divisions:
            gm_name = division.general_manager.get_full_name() if division.general_manager else "Not Assigned"
            div_users = User.objects.filter(division=division).count()
            
            print(f"   📂 {division.name}")
            print(f"      General Manager: {gm_name}")
            print(f"      Code: {division.code}")
            print(f"      Users: {div_users}")
            
            departments = division.departments.all().order_by('name')
            total_departments += departments.count()
            
            for department in departments:
                hod_name = department.head_of_department.get_full_name() if department.head_of_department else "Not Assigned"
                dept_users = User.objects.filter(department=department).count()
                print(f"      📄 {department.name}")
                print(f"         Head: {hod_name}")
                print(f"         Code: {department.code}")
                print(f"         Users: {dept_users}")
            
            if not departments.exists():
                print(f"      (No departments)")
            print()
        
        if not divisions.exists():
            print(f"   (No divisions)")
        print()
        print("-" * 100)
        print()
    
    print("=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print(f"Total Directorates: {directorates.count()}")
    print(f"Total Divisions: {total_divisions}")
    print(f"Total Departments: {total_departments}")
    print(f"Total Users: {User.objects.count()}")
    print("=" * 100)

if __name__ == '__main__':
    display_hierarchy()

