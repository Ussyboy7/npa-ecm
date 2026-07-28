# NPA ECM Frontend

A modern React-based frontend application for the NPA Electronic Content Management (ECM) system.

## 🚀 Features

- **Document Management**: Upload, version diff, DRM policies, `/dms` library
- **Correspondence System**: Office routing, minutes, seals, My Sent / Office Sent
- **Advanced Search**: Full-text + semantic re-rank toggle (MVP)
- **Helpdesk**: User tickets (`/helpdesk`) and admin queue
- **Real-time Notifications**: WebSocket-powered notifications and updates
- **Role-based Access**: Comprehensive permissions and user management
- **Analytics Dashboard**: System statistics and reporting
- **Responsive Design**: Modern UI with Tailwind CSS and shadcn/ui

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + React Query
- **WebSocket**: Native WebSocket + Channels fallback
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for analytics

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── dms/               # Document management (canonical)
│   ├── documents/         # Redirects to /dms
│   ├── helpdesk/          # User support tickets
│   ├── correspondence/    # Correspondence system
│   ├── workflow/          # Workflow management
│   ├── search/            # Advanced search
│   ├── analytics/         # Reports and analytics
│   ├── admin/             # Administration modules
│   └── api/               # API routes (if needed)
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui base components
│   ├── documents/        # Document-related components
│   ├── correspondence/   # Correspondence components
│   └── shared/           # Shared utilities
├── lib/                  # Utilities and services
│   ├── api/              # API client and services
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand stores
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript definitions
├── contexts/             # React contexts
├── hooks/                # Additional custom hooks
└── public/               # Static assets
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Backend API running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your API URL and other settings

# Start development server
npm run dev
```

The application will be available at `http://localhost:3002`

## 🔧 Configuration

### Environment Variables (.env.local)

```env
# API Configuration — must include the /api/v1 suffix (no trailing slash after v1)
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:8002/ws

# Authentication
NEXT_PUBLIC_TOKEN_STORAGE=localStorage

# Feature Flags
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Development
NEXT_PUBLIC_DEBUG=false
```

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Linting
npm run lint

# Bundle analysis
npm run analyze
```

## 🔗 API Integration

The frontend communicates with the Django REST API backend:

- **Base URL**: Configurable via `NEXT_PUBLIC_API_URL` (must end with `/api/v1`)
- **Authentication**: JWT tokens with automatic refresh
- **WebSocket**: Real-time notifications via `/ws/notifications/`
- **File Upload**: Direct to backend with progress tracking

## 📚 Key Modules

### Document Management System (DMS)
- Document upload with drag-and-drop
- Version control and metadata management
- Full-text search and filtering
- Access control and sharing

### Correspondence System
- Letter and memo management
- Approval workflows
- Digital signatures
- Routing and tracking

### Workflow Engine
- Custom workflow templates
- Multi-step approvals
- Parallel and sequential routing
- Status tracking and analytics

### Administration
- User management
- Role and permission configuration
- System settings
- Audit logs and monitoring

## 🎨 UI Components

Built with modern React patterns:

- **shadcn/ui**: Consistent component library
- **Tailwind CSS**: Utility-first styling
- **Responsive Design**: Mobile-first approach
- **Accessibility**: ARIA compliance and keyboard navigation

## 🔒 Security

- **Authentication**: JWT-based with secure token storage
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Zod schemas for all forms
- **CSRF Protection**: Built-in Next.js protection
- **Content Security**: Strict CSP headers

## 📊 Performance

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js built-in optimization
- **Caching**: React Query for API caching
- **Bundle Analysis**: Webpack bundle analyzer integration

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (if configured)
npm run test:e2e
```

## 🚢 Deployment

### Docker Build

```bash
# Build for production
docker build -f Dockerfile.frontend -t npa-ecm-frontend .

# Run container
docker run -p 3000:3000 npa-ecm-frontend
```

### Environment Setup

For production deployment:

1. Set `NODE_ENV=production`
2. Configure production API URLs
3. Enable HTTPS and secure headers
4. Set up proper logging and monitoring

## 🤝 Contributing

1. Follow the existing TypeScript and React patterns
2. Use the established component library (shadcn/ui)
3. Ensure proper error handling and loading states
4. Add tests for new features
5. Follow the commit message conventions

## 📝 Documentation

- **API Docs**: See backend README for API documentation
- **Component Docs**: Inline JSDoc comments
- **Architecture**: See main project README
- **Deployment**: See deployment guides in `/docs`

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Issues**
   - Check `NEXT_PUBLIC_API_URL` configuration
   - Ensure backend is running and accessible

2. **WebSocket Connection**
   - Verify `NEXT_PUBLIC_WS_URL` configuration
   - Check network/firewall settings

3. **Build Issues**
   - Clear `node_modules` and reinstall
   - Check Node.js version compatibility

## 📄 License

This project is proprietary software of the Nigerian Ports Authority (NPA).

---

**For backend setup and full system documentation, see the main project README.**