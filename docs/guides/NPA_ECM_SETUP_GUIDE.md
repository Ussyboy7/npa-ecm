# NPA Electronic Content Management System - Setup Guide

## Overview
Complete setup guide for the NPA ECM system with the official organizational structure.

---

## 📋 Prerequisites

### Backend Requirements
- Python 3.13+
- PostgreSQL 14+ (or SQLite for testing)
- Redis (for caching and WebSockets)
- Tesseract OCR

### Frontend Requirements
- Node.js 18+
- npm or yarn

---

## 🚀 Quick Start (Development)

### 1. Backend Setup

```bash
cd npa-ecm/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Populate NPA organizational structure
python manage.py shell < populate_npa_structure.py

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend will run at: `http://localhost:8000`

### 2. Frontend Setup

```bash
cd npa-ecm/frontend

# Install dependencies
npm install

# Start development server
npm run dev -- -p 3002
```

Frontend will run at: `http://localhost:3002`

---

## 🏢 NPA Organizational Structure

### Populated Data

After running `populate_npa_structure.py`, the system will have:

#### ✅ 8 Ports
- Lagos Port Complex (LPC)
- Onne Port
- Lekki Deep Sea Port
- Tin Can Island Port Complex (TCIPC)
- Port Harcourt Port
- Warri Port
- Calabar Port
- Headquarters (HQ)

#### ✅ 23 Main Divisions
1. Human Resources
2. Finance
3. Procurement
4. Administration
5. Medical Services
6. Superannuation
7. Marine & Operations
8. Security
9. Health, Safety & Environment
10. Regulatory Services
11. Public-Private Partnership
12. Engineering & Technical Services
13. Information & Communication Technology
14. Lands & Assets Administration
15. Corporate & Strategic Planning
16. Corporate & Strategic Communications
17. Audit
18. Legal Services
19. Tariff & Billing
20. Monitoring
21. SERVICOM
22. Enterprise Risk Management
23. Administrative Support & Liaison
24. Special Duties

#### ✅ 60+ Departments/Units
All subdepartments are created with proper parent-child relationships.

#### ✅ Sample User Accounts
Default credentials (Change in production!):
- **MD** - `md` / `password123` (Managing Director)
- **GM ICT** - `gm.ict` / `password123`
- **AGM Software** - `agm.software` / `password123`
- **GM HR** - `gm.hr` / `password123`
- **GM Finance** - `gm.finance` / `password123`
- **Port Manager LPC** - `pm.lpc` / `password123`
- **Admin** - `admin` / `password123`

---

## 📊 Organizational Hierarchy

```
Managing Director (MD)
│
├── Executive Director, Finance & Administration
│   ├── Human Resources (GM, HR)
│   │   ├── HR Operations (AGM)
│   │   ├── Employee & Labour Relations (AGM)
│   │   └── Training & Capacity Development (AGM)
│   ├── Finance (GM, Finance)
│   │   ├── Finance Operations (AGM)
│   │   ├── Accounts (AGM)
│   │   ├── Tax (AGM)
│   │   └── Investment (AGM)
│   ├── Procurement (GM, Procurement)
│   ├── Administration (GM, Administration)
│   ├── Medical Services (GM, Medical)
│   └── Superannuation (GM, Superannuation)
│
├── Executive Director, Marine & Operations
│   ├── Marine & Operations (GM, Marine & GM, Operations)
│   │   ├── Marine Operations (AGM)
│   │   ├── Vessel Management (AGM)
│   │   ├── Hydrographic (AGM)
│   │   └── Port Operations (AGM)
│   │       ├── Port Manager, LPC
│   │       ├── Port Manager, Onne
│   │       ├── Port Manager, Lekki
│   │       ├── Port Manager, TCIPC
│   │       ├── Port Manager, Port Harcourt
│   │       ├── Port Manager, Warri
│   │       └── Port Manager, Calabar
│   ├── Security (GM, Security)
│   ├── Health, Safety & Environment (GM, HSE)
│   ├── Regulatory Services (GM, Regulatory)
│   └── Public-Private Partnership (GM, PPP)
│
├── Executive Director, Engineering & Technical Services
│   ├── Engineering & Technical Services (GM, Engineering)
│   │   ├── Ports Engineering (AGM)
│   │   ├── Electrical & Corrosion (AGM)
│   │   └── Civil Engineering (AGM)
│   ├── Information & Communication Technology (GM, ICT)
│   │   ├── Software Applications & DB Management (AGM)
│   │   ├── Hardware, Infrastructure & Support (AGM)
│   │   ├── Networks & Communication (AGM)
│   │   └── Research & Special Projects (AGM)
│   └── Lands & Assets Administration (GM, Lands)
│
└── Corporate Services (Direct to MD)
    ├── Corporate & Strategic Planning (GM, C&SP)
    ├── Corporate & Strategic Communications (GM, C&SC)
    ├── Audit (GM, Audit)
    ├── Legal Services (GM, Legal)
    ├── Tariff & Billing (GM, Tariff)
    ├── Monitoring (GM, Monitoring)
    ├── SERVICOM (GM, SERVICOM)
    ├── Enterprise Risk Management (AGM, ERM)
    ├── Administrative Support & Liaison (GM, Liaison)
    └── Special Duties (GM, Special Duties)
```

---

## 🔐 Access Control Levels

### Document Access Hierarchy

1. **Level 1 - Confidential** (MD, EDs only)
   - Board documents
   - Strategic plans
   - Executive decisions

2. **Level 2 - Restricted** (GMs and above)
   - Divisional reports
   - Budget proposals
   - Cross-divisional memos

3. **Level 3 - Internal** (AGMs and above)
   - Department reports
   - Operational documents
   - Standard memos

4. **Level 4 - General** (All staff)
   - Circulars
   - Announcements
   - Public documents

---

## 📁 Document Types

The system supports:
- Official Memos
- Circulars
- Policy Documents
- Reports
- Contracts
- Correspondence
- Meeting Minutes
- Budget Documents
- Financial Reports
- Technical Documents
- Operational Documents
- Legal Documents
- HR Documents
- Audit Reports
- Board Papers

---

## 🔄 Workflow Routing

### Approval Hierarchy Examples

#### Financial Documents (>₦10M)
1. Initiating Officer
2. AGM, Finance
3. GM, Finance
4. ED, Finance & Admin
5. MD

#### Policy Documents
1. Department AGM
2. Division GM
3. Legal Review (AGM, Legal)
4. Relevant ED
5. MD

#### Contract Documents
1. AGM, Procurement
2. GM, Procurement
3. AGM, Legal (Review)
4. GM, Legal (Approval)
5. Relevant ED
6. MD

#### Port-Specific Documents
1. Port Manager
2. AGM, Port Operations
3. GM, Marine/Operations
4. ED, Marine & Operations

---

## 🛠️ Development Workflow

### Adding New Users

```bash
python manage.py shell
```

```python
from ecm_core.models import User, Department

# Get department
dept = Department.objects.get(code='ICT')

# Create user
user = User.objects.create_user(
    username='john.doe',
    email='john.doe@npa.gov.ng',
    password='password123',
    first_name='John',
    last_name='Doe',
    role='user',
    department=dept
)
```

### Creating Document Types

```python
from ecm_core.models import DocumentType, Department

# Get department
dept = Department.objects.get(code='ICT')

# Create document type
doc_type = DocumentType.objects.create(
    name='IT Policy',
    code='IT-POLICY',
    description='Information Technology policies',
    department=dept,
    requires_approval=True,
    retention_period=7
)
```

### Creating Workflow Templates

```python
from ecm_core.models import WorkflowTemplate, DocumentType

# Get document type
doc_type = DocumentType.objects.get(code='IT-POLICY')

# Create workflow template
workflow = WorkflowTemplate.objects.create(
    name='IT Policy Approval',
    document_type=doc_type,
    steps=[
        {'order': 1, 'role': 'AGM', 'name': 'Technical Review'},
        {'order': 2, 'role': 'GM', 'name': 'Management Approval'},
        {'order': 3, 'role': 'ED', 'name': 'Executive Approval'},
    ]
)
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login/` - Login and get JWT token
- `POST /api/auth/refresh/` - Refresh JWT token

### Documents
- `GET /api/documents/` - List documents
- `POST /api/documents/` - Upload document
- `GET /api/documents/{id}/` - Get document details
- `POST /api/documents/{id}/approve/` - Approve document
- `POST /api/documents/{id}/reject/` - Reject document

### Workflows
- `GET /api/workflow-instances/` - List workflows
- `POST /api/workflow-instances/` - Create workflow
- `GET /api/workflow-instances/{id}/` - Get workflow details

### Admin
- `GET /api/users/` - List users
- `POST /api/users/` - Create user
- `GET /api/departments/` - List departments
- `GET /api/ports/` - List ports

---

## 🎯 Testing the System

### 1. Upload a Document
1. Login as `gm.ict` / `password123`
2. Go to Documents → Upload Document
3. Fill in details and upload
4. Select document type and access level

### 2. Start a Workflow
1. Go to Workflows → Start Workflow
2. Select uploaded document
3. Choose workflow template
4. Set priority and due date

### 3. Approve Document
1. Login as approver
2. Go to Approvals
3. Click on pending approval
4. Click Approve and add comments

### 4. View Audit Trail
1. Login as admin
2. Go to Admin → Audit Logs
3. View all system activities

---

## 🔧 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_ctl status

# Or use SQLite (temporary)
# In settings.py, use SQLite configuration
```

### Port Already in Use
```bash
# Backend (port 8000)
lsof -ti:8000 | xargs kill -9

# Frontend (port 3002)
lsof -ti:3002 | xargs kill -9
```

### Migration Issues
```bash
# Reset migrations (development only!)
python manage.py migrate ecm_core zero
rm ecm_core/migrations/0*.py
python manage.py makemigrations ecm_core
python manage.py migrate
```

---

## 📚 Additional Resources

- **Backend API Docs**: `http://localhost:8000/api/docs/`
- **Admin Interface**: `http://localhost:8000/admin/`
- **Frontend**: `http://localhost:3002`

---

## 🎉 Next Steps

1. ✅ Populate organizational structure
2. ✅ Create sample users
3. ⬜ Create workflow templates
4. ⬜ Set up document types
5. ⬜ Configure retention policies
6. ⬜ Test complete workflows
7. ⬜ Set up production environment
8. ⬜ Configure backups
9. ⬜ Deploy to servers

---

## 📞 Support

For issues or questions:
1. Check backend logs: `npa-ecm/backend/logs/ecm.log`
2. Check browser console for frontend errors
3. Review API documentation
4. Contact ICT division

---

**Last Updated:** December 16, 2024  
**Version:** 1.0.0  
**Status:** ✅ Structure Implemented

