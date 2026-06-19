# NPA ECM Documentation

Welcome to the NPA Electronic Content Management System documentation.

## Documentation Structure

```
docs/
├── adr/                  # Architecture Decision Records
│   └── 0001-document-access-architecture.md
├── architecture/         # Architecture documentation
│   ├── correspondence-routing.md
│   ├── org-hierarchy.md
│   └── signature-seal-flow.md
├── features/             # Feature documentation (living docs)
│   ├── admin.md
│   ├── analytics.md
│   ├── auth-seal.md
│   ├── correspondence.md
│   ├── dms.md
│   ├── inbox.md
│   ├── search.md
│   └── workflow.md
├── guides/               # Development & operations guides
│   ├── CI-CD-README.md
│   ├── DATABASE_PERSISTENCE_GUIDE.md
│   ├── DEPENDENCY_INSTALLATION_GUIDE.md
│   ├── MANUAL_DEPLOYMENT.md
│   ├── NPA_ECM_SETUP_GUIDE.md
│   ├── ORACLE_ERP_INTEGRATION_GUIDE.md
│   ├── QUICK_INSTALL_GUIDE.md
│   ├── QUICK_START.md
│   ├── SYSTEM_DEPENDENCIES_INSTALLATION.md
│   ├── code-quality.md
│   ├── database-optimizations.md
│   └── migration-guide.md
├── components/           # Component API/props reference
│   └── COMPONENTS_REFERENCE.md
├── api/                  # API documentation
│   └── API_REFERENCE.md
├── user-guides/          # User-facing guides
│   └── USER_GUIDES.md
├── modules/              # Module implementation docs
│   └── NOTIFICATIONS_AND_AUDIT_IMPLEMENTATION.md
└── README.md             # This file
```

## Key Documents

### For Developers
- **[Feature Docs](./features/)**: Living documentation per feature area (DMS, correspondence, inbox, search, etc.)
- **[Architecture Docs](./architecture/)**: System architecture and design documentation
- **[ADR](./adr/)**: Architecture Decision Records
- **[Component Reference](./components/COMPONENTS_REFERENCE.md)**: Component props and API
- **[API Reference](./api/API_REFERENCE.md)**: Complete API documentation
- **[Guides](./guides/)**: Development, deployment, and operations guides

### For End Users
- **[User Guides](./user-guides/USER_GUIDES.md)**: Step-by-step instructions
