# NPA ECM - Quick Start Guide

## 🚀 Start the Application

```bash
# Frontend (from project root)
cd npa-ecm/frontend
npm run dev -- -p 3002
```

Access at: **http://localhost:3002**

## 📍 All Available Pages

### Main Navigation
| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Welcome page with feature overview |
| Dashboard | `/dashboard` | Main overview with stats and activities |
| Documents | `/documents` | Document library and management |
| Workflows | `/workflows` | Workflow management and monitoring |
| Approvals | `/approvals` | Document approval queue |
| Search | `/search` | Advanced document search |
| Archive | `/archive` | Archived documents |
| Reports | `/reports` | Analytics and reports |

### Workflow Actions
| Page | URL | Description |
|------|-----|-------------|
| Upload Document | `/documents/new` | Upload new documents |
| Create Template | `/workflows/templates/new` | Create workflow templates |
| Start Workflow | `/workflows/start` | Initiate new workflows |

### User Pages
| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Authentication page |
| Profile | `/profile` | User profile management |
| Settings | `/settings` | User preferences |

### Admin Pages
| Page | URL | Description |
|------|-----|-------------|
| User Management | `/admin/users` | Manage users and roles |
| Audit Logs | `/admin/audit` | System activity logs |
| System Admin | `/admin/system` | System health and config |

## 🎯 Quick Demo Flow

### 1. Start Application
```bash
cd npa-ecm/frontend && npm run dev -- -p 3002
```

### 2. Open in Browser
Navigate to `http://localhost:3002`

### 3. Explore Features

**Dashboard Overview:**
- View statistics
- See recent documents
- Check pending approvals

**Document Management:**
1. Go to Documents
2. Click "Upload Document"
3. Fill in details and upload

**Workflow Creation:**
1. Go to Workflows
2. Click "Create Template"
3. Add multiple approval steps
4. Save template

**Approval Process:**
1. Go to Approvals
2. Select a document
3. Click "Approve" or "Reject"
4. Add comments
5. Confirm action

**Admin Functions:**
1. Go to Admin → Users
2. View user list and roles
3. Check Audit Logs for activity
4. Monitor System health

## 🎨 Features to Showcase

### Interactive Elements
- ✅ Drag-and-drop file upload
- ✅ Approval/rejection dialogs with comments
- ✅ Batch approval selection
- ✅ Real-time search and filtering
- ✅ Responsive sidebar navigation
- ✅ Progress indicators
- ✅ Status badges and priority labels

### Visual Design
- ✅ Clean, modern interface
- ✅ Consistent color scheme
- ✅ Smooth transitions
- ✅ Responsive layout
- ✅ Professional enterprise look

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3002
lsof -ti:3002 | xargs kill -9

# Or use different port
npm run dev -- -p 3003
```

### Dependencies Not Installed
```bash
cd npa-ecm/frontend
npm install
```

### Page Not Loading
1. Check browser console for errors
2. Verify server is running
3. Clear browser cache
4. Try incognito/private mode

## 📱 Mobile Testing

Access from mobile device on same network:
```
http://[YOUR_COMPUTER_IP]:3002
```

Find your IP:
```bash
# Mac/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

## 🎬 Demo Script

### 5-Minute Demo
1. **Landing Page** (30 sec) - Show features overview
2. **Dashboard** (1 min) - Highlight stats and quick access
3. **Document Upload** (1 min) - Demo upload process
4. **Workflow** (1.5 min) - Create template and start workflow
5. **Approvals** (1 min) - Show approval dialog and batch actions

### Full Demo (15 minutes)
1. Introduction (2 min)
2. Document Management (3 min)
3. Workflow System (4 min)
4. Approval Process (3 min)
5. Admin Features (2 min)
6. Q&A (1 min)

## 📊 Test Data

All pages include realistic mock data:
- **Documents:** 100+ documents across various types
- **Users:** 125 users with different roles
- **Workflows:** Multiple active workflows
- **Departments:** Finance, HR, Legal, Operations, Technical
- **Audit Logs:** 1,284 logged events

## 🎯 Key Highlights

### For Management
- Professional enterprise interface
- Complete audit trail
- System health monitoring
- Role-based access visualization

### For Operations
- Intuitive document management
- Clear workflow visualization
- Efficient approval process
- Quick search and filters

### For IT/Admins
- User management dashboard
- Comprehensive audit logs
- System resource monitoring
- Service status tracking

## ✅ All Pages Working

Test each page:
```bash
# Quick test all pages
curl -I http://localhost:3002/dashboard
curl -I http://localhost:3002/documents
curl -I http://localhost:3002/workflows
curl -I http://localhost:3002/approvals
curl -I http://localhost:3002/search
curl -I http://localhost:3002/archive
curl -I http://localhost:3002/reports
curl -I http://localhost:3002/settings
curl -I http://localhost:3002/profile
curl -I http://localhost:3002/admin/users
curl -I http://localhost:3002/admin/audit
curl -I http://localhost:3002/admin/system
```

All should return `HTTP/1.1 200 OK`

## 🎉 Ready to Demo!

The frontend is complete and ready for:
- ✅ Stakeholder presentations
- ✅ User acceptance testing
- ✅ Backend API integration
- ✅ Production deployment planning

---

**Need Help?** Check the browser console or terminal for any errors.

