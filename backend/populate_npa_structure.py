"""
Populate NPA Organizational Structure
This script creates all divisions, departments, ports, and initial users
based on the official NPA organizational structure.

Run: python manage.py shell < populate_npa_structure.py
Or: python populate_npa_structure.py (if Django is set up)
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecm.settings')
django.setup()

from ecm_core.models import Department, Port, User
from django.contrib.auth.hashers import make_password

def populate_structure():
    print("🚀 Starting NPA Organizational Structure Population...")
    
    # Create Ports first
    ports_data = [
        {"name": "Lagos Port Complex", "code": "LPC", "location": "Lagos", "port_type": "seaport"},
        {"name": "Onne Port", "code": "ONNE", "location": "Rivers State", "port_type": "seaport"},
        {"name": "Lekki Deep Sea Port", "code": "LEKKI", "location": "Lagos", "port_type": "seaport"},
        {"name": "Tin Can Island Port Complex", "code": "TCIPC", "location": "Lagos", "port_type": "seaport"},
        {"name": "Port Harcourt Port", "code": "PHC", "location": "Rivers State", "port_type": "seaport"},
        {"name": "Warri Port", "code": "WARRI", "location": "Delta State", "port_type": "seaport"},
        {"name": "Calabar Port", "code": "CALABAR", "location": "Cross River State", "port_type": "seaport"},
        {"name": "Headquarters", "code": "HQ", "location": "Lagos", "port_type": "administrative"},
    ]
    
    print("\n📍 Creating Ports...")
    ports = {}
    for port_data in ports_data:
        port, created = Port.objects.get_or_create(
            code=port_data["code"],
            defaults=port_data
        )
        ports[port_data["code"]] = port
        status = "✅ Created" if created else "ℹ️  Exists"
        print(f"{status}: {port.name} ({port.code})")
    
    # Create all departments with proper hierarchy
    print("\n🏢 Creating Departments and Divisions...")
    
    departments_structure = [
        # Finance & Administration ED
        {
            "name": "Human Resources",
            "code": "HR",
            "description": "Human resources, training, and employee relations",
            "parent": None,
            "subdepartments": [
                {"name": "HR Operations", "code": "HR-OPS"},
                {"name": "Employee & Labour Relations", "code": "HR-ELR"},
                {"name": "Training & Capacity Development", "code": "HR-TCD"},
            ]
        },
        {
            "name": "Finance",
            "code": "FIN",
            "description": "Financial management and accounting",
            "parent": None,
            "subdepartments": [
                {"name": "Finance Operations", "code": "FIN-OPS"},
                {"name": "Accounts", "code": "FIN-ACC"},
                {"name": "Tax", "code": "FIN-TAX"},
                {"name": "Investment", "code": "FIN-INV"},
            ]
        },
        {
            "name": "Procurement",
            "code": "PROC",
            "description": "Procurement and supply chain management",
            "parent": None,
        },
        {
            "name": "Administration",
            "code": "ADMIN",
            "description": "General administration and facility management",
            "parent": None,
            "subdepartments": [
                {"name": "Archives & Records Management", "code": "ADMIN-ARM"},
                {"name": "Facility Management", "code": "ADMIN-FM"},
                {"name": "Land & Estate", "code": "ADMIN-LE"},
            ]
        },
        {
            "name": "Medical Services",
            "code": "MED",
            "description": "Medical and health services",
            "parent": None,
            "subdepartments": [
                {"name": "Medical Services", "code": "MED-SVC"},
                {"name": "Pharmacy", "code": "MED-PHM"},
                {"name": "Occupational Health", "code": "MED-OH"},
            ]
        },
        {
            "name": "Superannuation",
            "code": "SUPER",
            "description": "Pension and retirement management",
            "parent": None,
        },
        
        # Marine & Operations ED
        {
            "name": "Marine & Operations",
            "code": "MAR-OPS",
            "description": "Marine operations and vessel management",
            "parent": None,
            "subdepartments": [
                {"name": "Marine Operations", "code": "MAR-MOPS"},
                {"name": "Vessel Management", "code": "MAR-VM"},
                {"name": "Hydrographic", "code": "MAR-HYD"},
                {"name": "Port Operations", "code": "MAR-POPS"},
            ]
        },
        {
            "name": "Security",
            "code": "SEC",
            "description": "Security and safety operations",
            "parent": None,
        },
        {
            "name": "Health, Safety & Environment",
            "code": "HSE",
            "description": "Environmental and safety management",
            "parent": None,
            "subdepartments": [
                {"name": "Environment", "code": "HSE-ENV"},
                {"name": "Safety", "code": "HSE-SAF"},
            ]
        },
        {
            "name": "Regulatory Services",
            "code": "REG",
            "description": "Regulatory compliance and oversight",
            "parent": None,
        },
        {
            "name": "Public-Private Partnership",
            "code": "PPP",
            "description": "PPP initiatives and management",
            "parent": None,
        },
        
        # Engineering & Technical Services ED
        {
            "name": "Engineering & Technical Services",
            "code": "ENG",
            "description": "Engineering and infrastructure management",
            "parent": None,
            "subdepartments": [
                {"name": "Ports Engineering", "code": "ENG-PE"},
                {"name": "Electrical & Corrosion", "code": "ENG-EC"},
                {"name": "Civil Engineering", "code": "ENG-CE"},
            ]
        },
        {
            "name": "Information & Communication Technology",
            "code": "ICT",
            "description": "IT systems and infrastructure",
            "parent": None,
            "subdepartments": [
                {"name": "Software Applications & Database Management", "code": "ICT-SADM"},
                {"name": "Hardware, Infrastructure & Support", "code": "ICT-HIS"},
                {"name": "Networks & Communication", "code": "ICT-NC"},
                {"name": "Research & Special Projects", "code": "ICT-RSP"},
            ]
        },
        {
            "name": "Lands & Assets Administration",
            "code": "LANDS",
            "description": "Land and asset management",
            "parent": None,
            "subdepartments": [
                {"name": "Assets Administration", "code": "LANDS-AA"},
            ]
        },
        
        # Corporate Services (Direct to MD)
        {
            "name": "Corporate & Strategic Planning",
            "code": "CSP",
            "description": "Strategic planning and research",
            "parent": None,
            "subdepartments": [
                {"name": "Research & Statistics", "code": "CSP-RS"},
                {"name": "Planning & Monitoring", "code": "CSP-PM"},
                {"name": "IMO London Office", "code": "CSP-IMO"},
            ]
        },
        {
            "name": "Corporate & Strategic Communications",
            "code": "CSC",
            "description": "Corporate communications and CSR",
            "parent": None,
            "subdepartments": [
                {"name": "Media & Communication", "code": "CSC-MC"},
                {"name": "Corporate Social Responsibility", "code": "CSC-CSR"},
            ]
        },
        {
            "name": "Audit",
            "code": "AUDIT",
            "description": "Internal audit and compliance",
            "parent": None,
            "subdepartments": [
                {"name": "Finance & Investment Audit", "code": "AUDIT-FI"},
                {"name": "Systems & ICT Audit", "code": "AUDIT-ICT"},
                {"name": "Policy Compliance Audit", "code": "AUDIT-PC"},
            ]
        },
        {
            "name": "Legal Services",
            "code": "LEGAL",
            "description": "Legal advisory and services",
            "parent": None,
        },
        {
            "name": "Tariff & Billing",
            "code": "TARIFF",
            "description": "Tariff management and billing",
            "parent": None,
        },
        {
            "name": "Monitoring",
            "code": "MON",
            "description": "Performance monitoring and management",
            "parent": None,
            "subdepartments": [
                {"name": "Monitoring Operations", "code": "MON-OPS"},
                {"name": "Performance Management", "code": "MON-PM"},
            ]
        },
        {
            "name": "SERVICOM",
            "code": "SERVICOM",
            "description": "Service delivery and customer service",
            "parent": None,
        },
        {
            "name": "Enterprise Risk Management",
            "code": "ERM",
            "description": "Risk management and mitigation",
            "parent": None,
        },
        {
            "name": "Administrative Support & Liaison",
            "code": "LIAISON",
            "description": "Liaison offices and support",
            "parent": None,
            "subdepartments": [
                {"name": "Abuja Liaison Office", "code": "LIAISON-ABJ"},
                {"name": "Overseas Liaison Office", "code": "LIAISON-OVS"},
            ]
        },
        {
            "name": "Special Duties",
            "code": "SPECIAL",
            "description": "MD's office and special projects",
            "parent": None,
            "subdepartments": [
                {"name": "MD's Office", "code": "SPECIAL-MD"},
                {"name": "Board Secretariat", "code": "SPECIAL-BOARD"},
            ]
        },
    ]
    
    created_depts = {}
    
    # Create parent departments first
    for dept_data in departments_structure:
        dept, created = Department.objects.get_or_create(
            code=dept_data["code"],
            defaults={
                "name": dept_data["name"],
                "description": dept_data.get("description", ""),
                "parent_department": None,
            }
        )
        created_depts[dept_data["code"]] = dept
        status = "✅ Created" if created else "ℹ️  Exists"
        print(f"{status}: {dept.name} ({dept.code})")
        
        # Create subdepartments
        if "subdepartments" in dept_data:
            for subdept_data in dept_data["subdepartments"]:
                subdept, created = Department.objects.get_or_create(
                    code=subdept_data["code"],
                    defaults={
                        "name": subdept_data["name"],
                        "description": subdept_data.get("description", ""),
                        "parent_department": dept,
                    }
                )
                created_depts[subdept_data["code"]] = subdept
                status = "  ✅ Created" if created else "  ℹ️  Exists"
                print(f"{status}: {subdept.name} ({subdept.code})")
    
    # Create sample users for demonstration
    print("\n👥 Creating Sample Users...")
    
    sample_users = [
        {
            "username": "md",
            "email": "md@npa.gov.ng",
            "first_name": "Managing",
            "last_name": "Director",
            "role": "admin",
            "department": None,
        },
        {
            "username": "gm.ict",
            "email": "gm.ict@npa.gov.ng",
            "first_name": "ICT",
            "last_name": "General Manager",
            "role": "manager",
            "department": created_depts.get("ICT"),
        },
        {
            "username": "agm.software",
            "email": "agm.software@npa.gov.ng",
            "first_name": "Software",
            "last_name": "AGM",
            "role": "manager",
            "department": created_depts.get("ICT-SADM"),
        },
        {
            "username": "gm.hr",
            "email": "gm.hr@npa.gov.ng",
            "first_name": "HR",
            "last_name": "General Manager",
            "role": "manager",
            "department": created_depts.get("HR"),
        },
        {
            "username": "gm.finance",
            "email": "gm.finance@npa.gov.ng",
            "first_name": "Finance",
            "last_name": "General Manager",
            "role": "manager",
            "department": created_depts.get("FIN"),
        },
        {
            "username": "pm.lpc",
            "email": "pm.lpc@npa.gov.ng",
            "first_name": "LPC",
            "last_name": "Port Manager",
            "role": "manager",
            "department": created_depts.get("MAR-POPS"),
        },
        {
            "username": "admin",
            "email": "admin@npa.gov.ng",
            "first_name": "System",
            "last_name": "Administrator",
            "role": "admin",
            "department": created_depts.get("ICT"),
        },
    ]
    
    for user_data in sample_users:
        user, created = User.objects.get_or_create(
            username=user_data["username"],
            defaults={
                **user_data,
                "password": make_password("password123"),  # Change in production!
            }
        )
        status = "✅ Created" if created else "ℹ️  Exists"
        dept_name = user.department.name if user.department else "No Department"
        print(f"{status}: {user.username} - {user.get_full_name()} ({dept_name})")
    
    print("\n" + "="*60)
    print("✅ NPA Organizational Structure Population Complete!")
    print("="*60)
    print(f"\n📊 Summary:")
    print(f"   Ports: {Port.objects.count()}")
    print(f"   Departments: {Department.objects.count()}")
    print(f"   Users: {User.objects.count()}")
    print("\n🔐 Default Password: password123 (Change in production!)")
    print("\n📝 Sample User Accounts:")
    print("   - md / password123 (Managing Director)")
    print("   - gm.ict / password123 (GM ICT)")
    print("   - admin / password123 (System Admin)")
    print("\n" + "="*60)

if __name__ == "__main__":
    populate_structure()

