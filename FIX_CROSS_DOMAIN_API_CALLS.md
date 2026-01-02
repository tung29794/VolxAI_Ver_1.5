# Cross-Domain API Calls Fix - Complete Summary

## Problem

Console was showing many errors like:
- ❌ `Failed to load user data: SyntaxError: Unexpected token '<', "<!DOCTYPE "`
- ❌ `Failed to load plans: SyntaxError: Unexpected token '<', "<!DOCTYPE "`
- ❌ `GET https://volxai.com/api/auth/... 404 (Not Found)`

**Root Cause**: Frontend (https://volxai.com) and Backend API (https://api.volxai.com) are on **different domains**. Using relative API paths like `/api/auth/me` caused browsers to make requests to the wrong domain:
- Request went to: `https://volxai.com/api/auth/me` ❌
- Should go to: `https://api.volxai.com/api/auth/me` ✅

## Solution

### 1. Created buildApiUrl() Helper Function
**File**: `client/lib/api.ts`

```typescript
/**
 * Build full API URL with base URL
 * Used for all API calls that need full URLs (cross-domain requests)
 */
export function buildApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}

/**
 * Build admin API URL with base URL
 * Alias for buildApiUrl for consistency with existing admin components
 */
export function buildAdminApiUrl(path: string): string {
  return buildApiUrl(path);
}
```

### 2. Updated All Files with Relative API Paths

#### Account.tsx (7 endpoints fixed)
```typescript
// Before:
const response = await fetch("/api/auth/plans");
const response = await fetch("/api/auth/me", {...});
const response = await fetch("/api/auth/upgrade-history", {...});
const response = await fetch("/api/auth/change-password", {...});
const response = await fetch("/api/auth/update-profile", {...});
const response = await fetch("/api/auth/request-upgrade", {...});

// After:
const response = await fetch(buildApiUrl("/api/auth/plans"));
const response = await fetch(buildApiUrl("/api/auth/me"), {...});
const response = await fetch(buildApiUrl("/api/auth/upgrade-history"), {...});
const response = await fetch(buildApiUrl("/api/auth/change-password"), {...});
const response = await fetch(buildApiUrl("/api/auth/update-profile"), {...});
const response = await fetch(buildApiUrl("/api/auth/request-upgrade"), {...});
```

#### Upgrade.tsx (3 endpoints fixed)
- `/api/auth/plans` ✅
- `/api/auth/me` ✅
- `/api/auth/request-upgrade` ✅

#### Index.tsx (1 endpoint fixed)
- `/api/demo` ✅

#### Header.tsx (1 endpoint fixed)
- `/api/auth/me` ✅

#### PlanSelectionModal.tsx (1 endpoint fixed)
- `/api/auth/plans` ✅

**Total: 13 API calls fixed across 6 files**

## Deployment

### Build
```bash
npm run build
```
✅ Result: 1788 modules transformed, 482KB JS, 73KB CSS

### Deploy
```bash
rsync -avz -e "ssh -p 2210" /Users/tungnguyen/VolxAI-20Website/dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --delete
```
✅ Result: 8 files transferred successfully

### Verification
```bash
curl https://api.volxai.com/api/ping
```
✅ Result: `{"message":"ping pong"}` - Backend is running

## Git Commit
```
Commit: 55440e2
Message: "fix: Add buildApiUrl helper and fix all API calls for cross-domain requests"
Files changed: 6
Insertions: 30
Deletions: 16
```

## Testing Checklist

After deployment, verify that all these features work without errors:

### Account Page (https://volxai.com/account)
- [ ] User data loads (fullName, email, subscription)
- [ ] Plans load from API (not just fallback defaults)
- [ ] Upgrade history displays
- [ ] Can change password
- [ ] Can update profile (fullName)
- [ ] Can request plan upgrade

### Upgrade Page (https://volxai.com/upgrade)
- [ ] Plans load from API
- [ ] Current plan displays correctly
- [ ] Can request plan upgrade

### Index/Home Page
- [ ] Demo message loads from `/api/demo`

### Header Component
- [ ] Token limit displays correctly
- [ ] Subscription data loads on login

### Plan Selection Modal
- [ ] Opens without errors
- [ ] Plans load from API

## Architecture Context

```
┌─────────────────────────────┐
│   Frontend Server            │
│   https://volxai.com         │
│   /home/jybcaorr/public_html │
└──────────────┬──────────────┘
               │
               │ API Requests (HTTPS)
               ↓
┌─────────────────────────────┐
│   Backend API Server         │
│   https://api.volxai.com     │
│   /home/jybcaorr/             │
│   api.volxai.com             │
└─────────────────────────────┘
```

**Important**: All API calls from frontend must use full URLs:
- ✅ `https://api.volxai.com/api/auth/...`
- ❌ `/api/auth/...` (wrong domain)

## Environment Configuration

**VITE_API_URL**: `https://api.volxai.com`

This environment variable is used by the `buildApiUrl()` helper to construct full URLs.

## Files Modified

1. `client/lib/api.ts` - Added buildApiUrl() helper
2. `client/pages/Account.tsx` - Fixed 7 API endpoints
3. `client/pages/Upgrade.tsx` - Fixed 3 API endpoints
4. `client/pages/Index.tsx` - Fixed 1 API endpoint
5. `client/components/Header.tsx` - Fixed 1 API endpoint
6. `client/components/PlanSelectionModal.tsx` - Fixed 1 API endpoint

## Summary

✅ **All console errors related to API calls should be resolved**

The fix ensures that all frontend API requests target the correct backend domain (`api.volxai.com`) instead of the frontend domain, which was causing "Unexpected token '<'" errors (HTML error pages being parsed as JSON).
