# Code Quality Guide

**Last Updated:** April 2026
**Purpose:** Comprehensive guide for maintaining code quality and implementing best practices

---

## Overview

This guide consolidates all code quality improvements, automation scripts, testing strategies, and development best practices implemented during the ECM system development.

---

## Code Quality Improvements

### 1. Console Statement Cleanup ✅

**Status:** Complete - Major cleanup performed

**Problem:**
- 150+ console.log/warn/error statements throughout codebase
- Inconsistent logging practices
- Performance impact in production
- Security concerns (information leakage)

**Solution:**
- Replaced all console statements with structured logging
- Implemented `logError()`, `logWarn()`, `logInfo()` functions
- Added proper error context and user-friendly messages

**Files Modified:**
- `app/correspondence/[id]/page.tsx` - 23 console statements
- `components/SimplifiedRoleSwitcher.tsx` - 2 console statements
- `app/inbox/page.tsx` - 1 console statement
- `app/dms/[id]/page.tsx` - 6 console statements
- `components/correspondence/MinuteModal.tsx` - 27 console statements
- `components/correspondence/TreatmentModal.tsx` - 6 console statements

**Logging Implementation:**
```typescript
// lib/client-logger.ts
export const logError = (message: string, error?: unknown) => {
  console.error(`[ECM Error] ${message}`, error);
  // Additional error reporting logic
};

export const logWarn = (message: string, data?: unknown) => {
  console.warn(`[ECM Warning] ${message}`, data);
};

export const logInfo = (message: string, data?: unknown) => {
  console.info(`[ECM Info] ${message}`, data);
};
```

### 2. TypeScript Type Safety ✅

**Status:** Complete - Comprehensive type improvements

**Problem:**
- 463 `any` types across 96 files
- Type safety violations
- IntelliSense limitations
- Runtime error potential

**Solution:**
- Replaced `any` types with proper TypeScript types
- Implemented `unknown` for truly unknown types
- Added proper generic constraints
- Enhanced type definitions

**Type Replacements:**
- `any` → `unknown` (error handling)
- `any[]` → `unknown[]` (arrays)
- `<any>` → `<Record<string, unknown>>` (generics)
- `any` → `Error` (error objects)
- `any` → specific interface types

**Files with Major Improvements:**
- `lib/dms-storage.ts` - 64 `any` types → properly typed
- `lib/api-client.ts` - Complete type safety overhaul
- All API client files - Generic type constraints added

### 3. Import Optimization ✅

**Status:** Complete - Unused imports removed

**Problem:**
- Duplicate imports across files
- Unused imported modules
- Bundle size inflation
- Code maintainability issues

**Solution:**
- Automated import analysis and cleanup
- Removed duplicate `Link` imports
- Eliminated unused component imports
- Consolidated import statements

**Examples Fixed:**
```typescript
// Before
import Link from 'next/link';
import { Link } from 'lucide-react'; // Duplicate
import { AlertTriangle } from 'lucide-react'; // Unused

// After
import { Link } from 'lucide-react'; // Single import
```

---

## Automation Scripts

### 1. Console Statement Replacer

**Purpose:** Automatically replace console statements with proper logging

**Usage:**
```bash
node scripts/replace-console-statements.js
```

**Features:**
- Scans all `.tsx` and `.ts` files
- Replaces `console.error()` → `logError()`
- Replaces `console.warn()` → `logWarn()`
- Replaces `console.log()` → `logInfo()`
- Adds required imports automatically
- Preserves existing import organization

### 2. Documentation Organizer

**Purpose:** Organize documentation files into proper folder structure

**Usage:**
```bash
./scripts/organize-docs.sh
```

**Features:**
- Moves implementation docs to `docs/implementation/`
- Moves review docs to `docs/reviews/`
- Moves guides to `docs/guides/`
- Archives obsolete docs to `docs/archive/`
- Updates file references automatically

### 3. TypeScript Type Analyzer

**Purpose:** Find and report all `any` types for manual fixing

**Usage:**
```bash
node scripts/fix-any-types.js
```

**Features:**
- Scans all TypeScript files
- Reports file location and line numbers
- Groups results by file for efficient fixing
- Generates summary statistics

---

## Testing Strategy

### Backend Testing

**Framework:** pytest with Django test client

**Test Categories:**
- **Unit Tests:** Individual function/component testing
- **Integration Tests:** API endpoint testing
- **Database Tests:** Model and migration testing
- **Async Tests:** Celery task testing

**Testing Structure:**
```
backend/
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # API integration tests
│   ├── fixtures/       # Test data fixtures
│   └── conftest.py     # Test configuration
```

**Key Testing Features:**
- Factory Boy for test data generation
- Mock services for external dependencies
- Database transaction rollback
- Coverage reporting with minimum thresholds

### Frontend Testing

**Framework:** Vitest with React Testing Library

**Test Categories:**
- **Component Tests:** UI component testing
- **Integration Tests:** User flow testing
- **API Tests:** Mock API response testing
- **Hook Tests:** Custom hook testing

**Testing Structure:**
```
frontend/
├── __tests__/          # Test files
├── __mocks__/         # Mock implementations
└── test-utils/        # Testing utilities
```

**Key Testing Features:**
- MSW for API mocking
- Custom render utilities
- Accessibility testing integration
- Visual regression testing setup

---

## Code Style Standards

### TypeScript Standards

**Type Safety Requirements:**
- No `any` types except in migration code
- Proper generic constraints
- Interface definitions for all data structures
- Union types for variant data

**Import Organization:**
```typescript
// External libraries first
import React from 'react';
import { useState, useEffect } from 'react';

// Internal imports
import { apiClient } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';

// Type imports
import type { User, Document } from '@/types';
```

### React Best Practices

**Component Patterns:**
- Functional components with hooks
- Proper dependency arrays in useEffect
- Error boundaries for error handling
- Loading states for async operations

**Hook Guidelines:**
- Custom hooks for reusable logic
- Proper cleanup in useEffect
- Memoization for expensive computations
- Error handling in async operations

### Django Best Practices

**Model Design:**
- Proper field types and constraints
- Index optimization
- Related name conventions
- Model method organization

**View Patterns:**
- Class-based views for complex logic
- Function-based views for simple operations
- Proper permission checking
- Comprehensive error handling

---

## Performance Optimization

### Frontend Performance

**Code Splitting:**
- Route-based code splitting with Next.js
- Dynamic imports for heavy components
- Vendor chunk separation
- Lazy loading implementation

**Caching Strategy:**
- React Query for API caching
- Service worker for static assets
- Image optimization with Next.js
- Font loading optimization

### Backend Performance

**Database Optimization:**
- Proper indexing strategy
- Query optimization with select_related/prefetch_related
- Database connection pooling
- Query result caching

**API Optimization:**
- Pagination for large datasets
- Response compression
- Rate limiting implementation
- Async processing for heavy operations

---

## Security Best Practices

### Authentication Security

**JWT Implementation:**
- Short-lived access tokens (15 minutes)
- Secure refresh token handling
- Automatic token refresh
- Secure token storage

**Password Policies:**
- Minimum complexity requirements
- Password history checking
- Account lockout protection
- Secure password reset flow

### Data Protection

**Input Validation:**
- Comprehensive input sanitization
- SQL injection prevention
- XSS protection
- File upload validation

**API Security:**
- CORS configuration
- CSRF protection
- Rate limiting
- Request logging

---

## Development Workflow

### Git Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `hotfix/*` - Critical fixes

**Commit Standards:**
- Clear, descriptive commit messages
- Atomic commits for related changes
- Proper issue tracking references

### Code Review Process

**Review Checklist:**
- [ ] Code follows established patterns
- [ ] Proper error handling implemented
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] Security considerations addressed

**Automated Checks:**
- ESLint for code style
- TypeScript for type safety
- Tests for functionality
- Security scanning for vulnerabilities

---

## Monitoring and Alerting

### Application Monitoring

**Health Checks:**
- Database connectivity
- Redis connectivity
- External service availability
- Celery worker status

**Performance Metrics:**
- Response time monitoring
- Error rate tracking
- Database query performance
- Memory and CPU usage

### Error Tracking

**Error Reporting:**
- Sentry integration for error tracking
- Structured error logging
- Error categorization and prioritization
- Automated alerting for critical errors

**Log Management:**
- Centralized log aggregation
- Log retention policies
- Search and filtering capabilities
- Performance impact monitoring

---

## Quality Gates

### Pre-commit Hooks

**Automated Checks:**
- Code linting (ESLint)
- Type checking (TypeScript)
- Unit tests execution
- Import sorting (isort for Python)
- Code formatting (Prettier)

### CI/CD Quality Gates

**Pipeline Checks:**
- Build success verification
- Test coverage requirements (minimum 80%)
- Security vulnerability scanning
- Performance regression testing
- Accessibility compliance checking

---

## Documentation Standards

### Code Documentation

**JSDoc Comments:**
```typescript
/**
 * Processes OCR for a document
 * @param documentId - The document ID to process
 * @param options - Processing options
 * @returns Promise<OCRResult>
 */
async function processOCR(
  documentId: string,
  options: OCRProcessingOptions
): Promise<OCRResult> {
  // Implementation
}
```

**README Files:**
- Clear setup instructions
- API documentation
- Troubleshooting guides
- Contributing guidelines

### API Documentation

**OpenAPI Specification:**
- Comprehensive endpoint documentation
- Request/response examples
- Error response definitions
- Authentication requirements

---

## Tooling and Automation

### Development Tools

**Required Tools:**
- Node.js 20+ with npm
- Python 3.13+ with pip
- Docker and Docker Compose
- Git with proper configuration

**Recommended Extensions:**
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type checking
- Jest/Vitest for testing

### Build Automation

**Package Scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

**Python Scripts:**
```bash
# Backend development
pip install -r requirements.txt
python manage.py runserver

# Testing
pytest
coverage run -m pytest
```

---

## Continuous Improvement

### Code Quality Metrics

**Target Metrics:**
- Test Coverage: >85%
- ESLint Violations: 0
- TypeScript Errors: 0
- Bundle Size: <500KB
- Lighthouse Score: >90

### Regular Audits

**Monthly Reviews:**
- Code coverage analysis
- Performance benchmarking
- Security vulnerability assessment
- Dependency updates review

**Quarterly Activities:**
- Architecture review
- Technology stack evaluation
- Process improvement implementation

---

## Training and Onboarding

### Developer Onboarding

**Required Knowledge:**
- TypeScript and React fundamentals
- Django and DRF basics
- Git workflow and branching strategy
- Testing methodologies
- Code review processes

**Resources:**
- This code quality guide
- API documentation
- Component library documentation
- Testing guides and examples

### Knowledge Sharing

**Team Activities:**
- Code review sessions
- Tech talk presentations
- Pair programming sessions
- Documentation contributions

**Documentation Updates:**
- Regular guide updates
- New pattern documentation
- Best practice sharing

---

**This guide represents the comprehensive code quality standards and practices implemented throughout the ECM system development. All team members should follow these guidelines to maintain high code quality and development efficiency.**</content>
<parameter name="filePath">../npa-ecm/docs/implementation/CODE_QUALITY_GUIDE.md