# WebSocket Connection Troubleshooting Guide

## Why "WebSocket connection failed. Using polling mode for notifications." Appears

This message appears when the frontend cannot establish a WebSocket connection to the backend. The system automatically falls back to polling mode, which works but is less efficient.

## Common Causes

### 1. **Environment Variables Not Set** ⚠️ Most Common

The WebSocket URL is constructed from environment variables. If they're not set correctly, the connection will fail.

**Check your environment variables:**
- `NEXT_PUBLIC_WS_URL` - Explicit WebSocket URL (optional)
- `NEXT_PUBLIC_API_URL` - API URL used to construct WebSocket URL (required if `NEXT_PUBLIC_WS_URL` not set)

**For Local Development:**
```env
# .env.local or .env
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
# OR explicitly:
NEXT_PUBLIC_WS_URL=ws://localhost:8002/ws/notifications/
```

**For Production:**
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
# OR explicitly:
NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws/notifications/
```

**How to check:**
1. Open browser console (F12)
2. Look for logs starting with "Attempting WebSocket connection"
3. Check the `environment` object in the log to see what values are set

### 2. **Backend WebSocket Server Not Running**

The Django Channels WebSocket server must be running for WebSocket connections to work.

**Check if backend is running:**
```bash
# Check if Django server is running
ps aux | grep "python.*manage.py.*runserver"

# Check if Daphne/ASGI server is running (required for WebSocket)
ps aux | grep daphne
```

**Start the backend with WebSocket support:**
```bash
# Using Daphne (recommended for WebSocket)
daphne -b 0.0.0.0 -p 8002 ecm_backend.asgi:application

# OR using runserver (development only, limited WebSocket support)
python manage.py runserver 0.0.0.0:8002
```

### 3. **Wrong Port or URL**

The WebSocket URL must match your backend server's port and host.

**Check the constructed URL:**
1. Open browser console
2. Look for "Attempting WebSocket connection" log
3. Verify the URL matches your backend:
   - Port should match (default: 8002)
   - Protocol should match (ws:// for http, wss:// for https)
   - Path should be `/ws/notifications/`

**Example:**
- If backend is at `http://localhost:8002`
- WebSocket should be at `ws://localhost:8002/ws/notifications/`

### 4. **Authentication Issues**

WebSocket connections require authentication. The JWT token is sent in the query string.

**Check authentication:**
1. Open browser console
2. Look for "Attempting WebSocket connection" log
3. Check `hasToken: true/false` in the log
4. If `hasToken: false`, you need to log in first

**Common authentication errors:**
- Token expired → Log out and log in again
- Token invalid → Check token in localStorage: `localStorage.getItem('npa_ecm_access_token')`
- Token not sent → Check if token is being added to WebSocket URL

### 5. **CORS Issues**

If the frontend and backend are on different origins, CORS must be configured.

**Check CORS settings in backend:**
```python
# backend/ecm_backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3002",  # Frontend URL
    "http://localhost:3000",
]
```

**For WebSocket, also check:**
- Django Channels routing is configured correctly
- ASGI application includes WebSocket routing

### 6. **Network/Firewall Issues**

Firewalls or network configurations might block WebSocket connections.

**Check:**
- Firewall allows WebSocket connections (port 8002)
- Proxy settings don't interfere with WebSocket
- Network allows `ws://` or `wss://` protocols

## How to Diagnose

### Step 1: Check Browser Console

Open browser console (F12) and look for:
- `[INFO] Attempting WebSocket connection` - Shows the URL being used
- `[WARN] Notifications WebSocket error` - Shows error details
- `[INFO] WebSocket disconnected` - Shows close code and reason

### Step 2: Check Environment Variables

In browser console, run:
```javascript
console.log({
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
```

**Note:** In Next.js, environment variables are embedded at build time. You may need to restart the dev server after changing `.env` files.

### Step 3: Test WebSocket Connection Manually

In browser console, try:
```javascript
const ws = new WebSocket('ws://localhost:8002/ws/notifications/?token=YOUR_TOKEN');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

### Step 4: Check Backend Logs

Check your Django backend logs for:
- WebSocket connection attempts
- Authentication errors
- Routing errors

## Quick Fixes

### Fix 1: Set Environment Variables

Create or update `.env.local` in `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8002/api/v1
```

Then restart the Next.js dev server:
```bash
npm run dev
```

### Fix 2: Ensure Backend is Running

```bash
cd backend
python manage.py runserver 0.0.0.0:8002
```

Or with Daphne (better for WebSocket):
```bash
pip install daphne
daphne -b 0.0.0.0 -p 8002 ecm_backend.asgi:application
```

### Fix 3: Check WebSocket Routing

Verify `backend/notifications/routing.py` exists:
```python
websocket_urlpatterns = [
    path("ws/notifications/", NotificationConsumer.as_asgi()),
]
```

And `backend/ecm_backend/asgi.py` includes it:
```python
from notifications.routing import websocket_urlpatterns as notification_websocket_urlpatterns
```

### Fix 4: Verify Authentication

1. Log in to the application
2. Check browser console for `hasToken: true` in WebSocket connection log
3. If `hasToken: false`, log out and log in again

## Expected Behavior

### When WebSocket Works:
- ✅ No "WebSocket connection failed" toast
- ✅ Real-time notifications appear instantly
- ✅ Connection status indicator shows connected
- ✅ Browser console shows: `[INFO] WebSocket connected for notifications`

### When WebSocket Fails (Polling Mode):
- ⚠️ Toast appears: "WebSocket connection failed. Using polling mode for notifications."
- ⚠️ Warning icon appears on notification bell
- ⚠️ Notifications update every 30 seconds (polling interval)
- ⚠️ Browser console shows: `[WARN] Notifications WebSocket error`

## Still Not Working?

1. **Check all logs** in browser console for detailed error messages
2. **Verify backend is running** and accessible
3. **Test WebSocket manually** using browser console
4. **Check network tab** in browser DevTools for WebSocket connection attempts
5. **Review backend logs** for WebSocket-related errors

## Additional Resources

- [Django Channels Documentation](https://channels.readthedocs.io/)
- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

