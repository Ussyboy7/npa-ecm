# NPA ECM API Reference

This document provides comprehensive API documentation for the NPA Electronic Content Management System, including the frontend API client implementation and available endpoints.

## Table of Contents

- [API Client Overview](#api-client-overview)
- [Authentication](#authentication)
- [Core API Functions](#core-api-functions)
- [Correspondence APIs](#correspondence-apis)
- [Document Management APIs](#document-management-apis)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)

---

## API Client Overview

The NPA ECM frontend uses a centralized API client that provides authentication, error handling, and consistent HTTP request management.

### Location
`frontend/lib/api-client.ts`

### Features

- **JWT Authentication**: Automatic token management and refresh
- **Error Handling**: Standardized error responses and retry logic
- **Type Safety**: Full TypeScript support with proper interfaces
- **Request Interception**: Automatic auth header injection
- **Response Parsing**: JSON parsing with error detection

---

## Authentication

### Token Management

#### getStoredAccessToken()
Retrieves the current access token from localStorage.

```typescript
function getStoredAccessToken(): string | null
```

#### getStoredRefreshToken()
Retrieves the current refresh token from localStorage.

```typescript
function getStoredRefreshToken(): string | null
```

#### storeTokens(accessToken, refreshToken, expiresInSeconds?)
Stores authentication tokens with optional expiration.

```typescript
function storeTokens(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds?: number
): void
```

#### clearTokens()
Removes all stored authentication tokens.

```typescript
function clearTokens(): void
```

#### hasTokens()
Checks if valid authentication tokens exist.

```typescript
function hasTokens(): boolean
```

### Login Process

#### login(username, password)
Authenticates user and stores tokens.

```typescript
async function login(
  username: string,
  password: string
): Promise<LoginResponse>
```

**Parameters:**
- `username`: User login name
- `password`: User password

**Returns:**
```typescript
interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}
```

**Throws:**
- `Error`: Invalid credentials or network issues

### Logout Process

#### logout()
Logs out user and clears tokens.

```typescript
async function logout(): Promise<void>
```

---

## Core API Functions

### apiFetch<T>(path, options)
Main API request function with automatic authentication and error handling.

```typescript
async function apiFetch<T = unknown>(
  path: string,
  options?: ApiFetchOptions
): Promise<T>
```

**Parameters:**
- `path`: API endpoint path (without base URL)
- `options`: Request configuration

**Options:**
```typescript
interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;           // Skip automatic auth headers
  responseType?: "json" | "text" | "blob"; // Response type
}
```

**Example:**
```typescript
// GET request with auth
const data = await apiFetch<User[]>('/users/');

// POST request
const newUser = await apiFetch<User>('/users/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData)
});

// File upload
const formData = new FormData();
formData.append('file', file);
const result = await apiFetch<DocumentRecord>('/documents/', {
  method: 'POST',
  body: formData
});
```

---

## Correspondence APIs

### Sidebar Counts

#### GET /correspondence/inbox/counts/
Retrieves inbox counts for sidebar display.

```typescript
interface InboxCounts {
  office: number;
  my: number;
  delegated: number;
  secretary: number;
}
```

**Used by:** `useSidebarCounts` hook

### Sent counts (via sidebar-counts)

Sent badge counts are included on `GET /correspondence/items/sidebar-counts/` as `mySent` and `officeSent`.

```typescript
interface SidebarSentCounts {
  mySent: number;
  officeSent: number;
}
```

List endpoints: `GET /correspondence/items/my-sent/`, `GET /correspondence/items/office-sent/`.

### Case Counts

#### GET /correspondence/cases/counts/
Retrieves case counts for sidebar display.

```typescript
interface CaseCounts {
  my: number;
  office: number;
  all: number;
}
```

### Executive Approvals

#### GET /approvals/executive/count/
Retrieves count of pending executive approvals.

```typescript
interface ApprovalCount {
  count: number;
}
```

### Document Statistics

#### GET /dms/documents/counts/
Retrieves document counts for current user.

```typescript
interface DocumentCounts {
  my: number;
}
```

---

## Document Management APIs

### Document CRUD Operations

#### GET /dms/documents/
List documents with optional filtering.

**Query Parameters:**
- `search`: Search query
- `type`: Document type filter
- `status`: Status filter
- `page`: Page number
- `page_size`: Items per page

#### POST /dms/documents/
Create a new document.

**Request Body (FormData):**
- `file`: Document file (required)
- `title`: Document title (required)
- `description`: Document description (optional)
- `document_type`: Document type (optional)
- `created_by`: User ID (optional)

#### GET /dms/documents/{id}/
Retrieve specific document details.

#### PATCH /dms/documents/{id}/
Update document metadata.

#### DELETE /dms/documents/{id}/
Delete document (soft delete).

### Version Management

#### POST /dms/documents/{id}/versions/
Upload new document version.

**Request Body (FormData):**
- `file`: New version file (required)
- `title`: Version title (optional)
- `description`: Version description (optional)

#### GET /dms/documents/{id}/versions/
List all versions of a document.

---

## Error Handling

### Error Response Structure

All API errors follow a consistent structure:

```typescript
interface ApiError extends Error {
  status: number;        // HTTP status code
  apiMessage?: string;   // API-provided error message
  body?: string;         // Raw response body
}
```

### Common Error Codes

| Status Code | Description | Handling |
|-------------|-------------|----------|
| 400 | Bad Request | Validate input data |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Show 404 page |
| 422 | Validation Error | Display field errors |
| 500 | Server Error | Show generic error |

### Error Handling Patterns

```typescript
try {
  const data = await apiFetch('/endpoint/');
  // Handle success
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
    router.push('/login');
  } else if (error.status === 403) {
    // Show permission error
    toast.error('Insufficient permissions');
  } else {
    // Show generic error
    toast.error(error.apiMessage || 'An error occurred');
  }
}
```

### Automatic Retry Logic

The API client includes automatic retry for transient errors:
- Network timeouts
- 5xx server errors
- Rate limiting (429)

```typescript
// Automatic retry for failed requests
const result = await apiFetch('/unreliable-endpoint/');
// Client will retry up to 3 times with exponential backoff
```

---

## Type Definitions

### Core Types

```typescript
interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
  responseType?: "json" | "text" | "blob";
}

interface ApiError extends Error {
  status: number;
  apiMessage?: string;
  body?: string;
}
```

### Correspondence Types

```typescript
interface InboxCounts {
  office: number;
  my: number;
  delegated: number;
  secretary: number;
}

interface SentSidebarCounts {
  mySent: number;
  officeSent: number;
}

interface CaseCounts {
  my: number;
  office: number;
  all: number;
}
```

### Document Types

```typescript
interface DocumentRecord {
  id: string;
  title: string;
  description?: string;
  document_type?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  created_by: string;
  versions: DocumentVersion[];
}

interface DocumentVersion {
  id: string;
  version_number: number;
  title: string;
  description?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  created_by: string;
}
```

---

## Usage Examples

### Basic CRUD Operations

```typescript
// Create document
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('title', 'Important Document');
formData.append('description', 'Business critical document');

const newDoc = await apiFetch<DocumentRecord>('/dms/documents/', {
  method: 'POST',
  body: formData
});

// Update document
const updated = await apiFetch<DocumentRecord>(`/dms/documents/${docId}/`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Updated Title' })
});

// Delete document
await apiFetch(`/dms/documents/${docId}/`, {
  method: 'DELETE'
});
```

### File Upload with Progress

```typescript
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', file.name);

  try {
    const result = await apiFetch<DocumentRecord>('/dms/documents/', {
      method: 'POST',
      body: formData
    });
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### Authentication Flow

```typescript
const loginUser = async (username: string, password: string) => {
  try {
    const response = await login(username, password);
    // Tokens are automatically stored
    return response.user;
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Invalid credentials');
    }
    throw error;
  }
};

const logoutUser = async () => {
  await logout();
  // Tokens are automatically cleared
  router.push('/login');
};
```

### Error Handling with Retry

```typescript
const fetchWithRetry = async (endpoint: string, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFetch(endpoint);
    } catch (error) {
      if (attempt === maxRetries || error.status < 500) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

---

## Configuration

### Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1

# Authentication
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_API_RETRIES=3
```

### Client Configuration

The API client is configured automatically based on environment variables and includes:

- Base URL from `NEXT_PUBLIC_API_URL`
- 30-second timeout (configurable)
- Automatic JSON parsing
- Request/response interceptors
- Error normalization

---

## Testing

### Mock API Responses

```typescript
// Mock successful response
const mockApiFetch = (response: any) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response)
    })
  );
};

// Mock error response
const mockApiError = (status: number, message: string) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      text: () => Promise.resolve(message)
    })
  );
};
```

### Integration Testing

```typescript
describe('API Client', () => {
  it('should handle authentication', async () => {
    const response = await login('testuser', 'password');
    expect(response.access).toBeDefined();
    expect(hasTokens()).toBe(true);
  });

  it('should handle API errors', async () => {
    mockApiError(404, 'Not found');
    await expect(apiFetch('/invalid/')).rejects.toThrow();
  });
});
```

---

## Migration Notes

### Phase 9–11 API additions (June 2026)

| Area | Endpoint | Notes |
|------|----------|-------|
| Search | `GET /api/v1/search/?q=…&search_mode=semantic` | MVP semantic re-rank (no pgvector) |
| DMS diff | `GET /api/v1/dms/versions/{id}/diff/?compare_with={id}` | Text version comparison |
| Audit | `GET /api/v1/audit/activity-logs/compliance-export/` | Tamper-evident bundle |
| Records | `GET /api/v1/records/legal-holds/{id}/ediscovery-export/` | Legal hold ZIP |
| DRM | `GET /api/v1/dms/documents/{id}/drm-rights/` | Effective rights for user |
| Support | `POST /api/v1/support/tickets/` | Helpdesk tickets |

See Swagger at `/api/docs/` for the authoritative schema.

### From Previous Versions

- **Token Storage**: Now uses localStorage instead of cookies for better cross-tab sync
- **Error Handling**: More detailed error information with `apiMessage` property
- **Retry Logic**: Automatic retry for transient failures
- **Type Safety**: Full TypeScript support with proper return types

### Backward Compatibility

The API client maintains backward compatibility while adding new features:

- Existing code continues to work
- New features are opt-in
- Migration guides provided for major changes