#!/usr/bin/env python
import os
import sys
import django

backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecm_backend.settings')
django.setup()

from accounts.models import User
from organization.models import Directorate

md_office = Directorate.objects.get(name='Managing Director Office')
user = User.objects.filter(email='apitester@example.com').first()

if user:
    user.directorate = md_office
    user.save()
    print(f'✓ Fixed: {user.email} - Assigned to {md_office.name}')
else:
    print('User not found')

