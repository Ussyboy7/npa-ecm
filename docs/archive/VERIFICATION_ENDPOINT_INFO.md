# Seal Verification Endpoint Information

## First Attempt URL Construction

### Base URL Logic
The verification request URL is constructed as follows:

1. **Get Base URL** (`getApiBaseUrl()`):
   - Checks `process.env.NEXT_PUBLIC_API_URL`
   - If not set, defaults to: `http://localhost:8002/api`
   - Normalizes to ensure `/api/v1` is in the path

2. **Full Verification URL**:
   ```
   ${baseUrl}/accounts/seal/verify/${encodeURIComponent(serialNumber)}/
   ```

### Example for Serial: `NPA-20251225-346B646C`

**If `NEXT_PUBLIC_API_URL` is not set:**
- Base URL: `http://localhost:8002/api/v1`
- Full URL: `http://localhost:8002/api/v1/accounts/seal/verify/NPA-20251225-346B646C/`

**If `NEXT_PUBLIC_API_URL` is set to `http://localhost:8002/api`:**
- Base URL: `http://localhost:8002/api/v1`
- Full URL: `http://localhost:8002/api/v1/accounts/seal/verify/NPA-20251225-346B646C/`

**If `NEXT_PUBLIC_API_URL` is set to `http://localhost:8002/api/v1`:**
- Base URL: `http://localhost:8002/api/v1`
- Full URL: `http://localhost:8002/api/v1/accounts/seal/verify/NPA-20251225-346B646C/`

### Request Details

**Method:** `GET`

**Headers:**
- `Accept: application/json`
- `Content-Type: application/json`
- `credentials: 'include'` (includes cookies)

**Mode:** `cors`

### Backend Endpoint

**Django URL Pattern:**
```python
path("seal/verify/<str:serial_number>/", SealVerificationView.as_view(), name="seal_verify")
```

**Full Backend Path:**
```
/api/v1/accounts/seal/verify/<serial_number>/
```

### Debugging

Console logs have been added to show:
- Serial number being verified
- Base URL used
- Full verification URL
- Response status and details
- Any errors encountered

Check browser console for `[Seal Verification]` logs to see exactly where the request is going.

