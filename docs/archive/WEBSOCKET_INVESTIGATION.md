# WebSocket Connection Investigation & Fixes

## Issue Summary
WebSocket connections to `/ws/notifications/` are failing with errors:
```
WebSocket connection to 'ws:<URL>/ws/notifications/?token=...' failed: WebSocket is closed before the connection is established.
```

## Root Cause Analysis

### 1. URL Construction Issues
The error message shows `ws:<URL>` instead of `ws://<URL>`, suggesting potential URL malformation. However, the code logic appears correct.

### 2. Possible Causes
- **URL Construction Edge Cases**: When `NEXT_PUBLIC_API_URL` is set to `http://localhost:8002/api/v1`, the URL extraction might fail in edge cases
- **Network Issues**: WebSocket connections might be blocked by firewall/proxy
- **Backend Configuration**: Daphne server might not be properly handling WebSocket upgrade requests
- **CORS/Origin Issues**: WebSocket connections might be rejected due to origin mismatch

## Implemented Fixes

### 1. Enhanced URL Construction (`use-notification-websocket.ts`)
- ✅ Added try-catch around URL construction
- ✅ Added detailed logging for URL construction steps
- ✅ Added URL validation using `new URL()` before creating WebSocket
- ✅ Improved fallback logic with better error handling
- ✅ Added logging for connection attempts and errors

### 2. Improved Error Handling
- ✅ Enhanced `onerror` handler with detailed error information
- ✅ Enhanced `onclose` handler with close code, reason, and clean status
- ✅ Better logging for debugging connection issues

### 3. Connection State Management
- ✅ Added validation before WebSocket creation
- ✅ Better cleanup on disconnect
- ✅ Improved reconnection logic with detailed logging

## Backend Configuration Status

### ✅ Verified Components
1. **Daphne Server**: Running and configured correctly
   - Command: `daphne -b 0.0.0.0 -p 8002 ecm_backend.asgi:application`
   - Status: ✅ Running in Docker container

2. **ASGI Configuration**: Properly set up
   - File: `backend/ecm_backend/asgi.py`
   - WebSocket routing: ✅ Configured
   - JWT Middleware: ✅ Implemented

3. **Channel Layers**: Configured with Redis
   - Backend: `channels_redis.core.RedisChannelLayer`
   - Redis: ✅ Running and healthy

4. **WebSocket Consumer**: Implemented
   - File: `backend/notifications/consumers.py`
   - Authentication: ✅ JWT token support
   - Message handling: ✅ Implemented

## Testing Recommendations

### 1. Check WebSocket URL Construction
Open browser console and look for logs:
```
WebSocket URL construction - baseUrl: ...
WebSocket URL constructed: ...
Attempting WebSocket connection to: ...
```

### 2. Verify Backend WebSocket Endpoint
Test WebSocket connection directly:
```bash
# Using wscat (install: npm install -g wscat)
wscat -c "ws://localhost:8002/ws/notifications/?token=YOUR_TOKEN"
```

### 3. Check Network Connectivity
- Verify port 8002 is accessible
- Check for firewall/proxy blocking WebSocket connections
- Verify CORS settings allow WebSocket connections

### 4. Monitor Backend Logs
```bash
docker-compose -f docker-compose.local.yml logs -f backend | grep -i websocket
```

## Environment Variables

### Frontend
- `NEXT_PUBLIC_API_URL`: Should be set to `http://localhost:8002/api/v1` (or appropriate backend URL)
- `NEXT_PUBLIC_NOTIFICATIONS_WS_DISABLED`: Set to `true` to disable WebSocket (falls back to polling)

### Backend
- `REDIS_HOST`: Should point to Redis container (default: `redis` in Docker, `localhost` locally)
- `REDIS_PORT`: Should match Redis port (default: `6379`)

## Fallback Behavior

The system gracefully falls back to polling if WebSocket fails:
- ✅ Polling interval: 30 seconds (configurable)
- ✅ No user-facing errors
- ✅ Automatic retry with exponential backoff
- ✅ Max reconnection attempts: 5 (configurable)

## Next Steps

1. **Monitor Logs**: Check browser console and backend logs for WebSocket connection attempts
2. **Test URL Construction**: Verify the constructed WebSocket URL is correct
3. **Check Network**: Ensure WebSocket connections aren't blocked
4. **Verify Token**: Ensure JWT token is valid and not expired
5. **Test Direct Connection**: Use `wscat` or similar tool to test WebSocket endpoint directly

## Known Limitations

- WebSocket connections require a persistent connection
- Some network configurations (proxies, firewalls) may block WebSocket connections
- WebSocket connections are automatically retried with exponential backoff
- System gracefully falls back to polling if WebSocket is unavailable

## Related Files

- `frontend/hooks/use-notification-websocket.ts` - WebSocket client hook
- `backend/notifications/consumers.py` - WebSocket consumer
- `backend/notifications/routing.py` - WebSocket routing
- `backend/ecm_backend/asgi.py` - ASGI application configuration
- `backend/notifications/middleware.py` - JWT authentication middleware

