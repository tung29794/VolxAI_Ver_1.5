# Fix: Register Endpoint JSON Parsing Error

**Commit:** `c6c1bdb`

## 🔴 Problem

When user clicks register button, getting error:
```
Unexpected token '<', '<!doctype'... is not valid JSON
```

This error indicates the server is returning **HTML instead of JSON**.

## 🔍 Root Cause

The register endpoint in `AuthContext.tsx` was using **relative URL**:

```typescript
// OLD (❌ Wrong)
const response = await fetch("/api/auth/register", {
  // This becomes a relative URL!
  // If frontend and backend are on different domains, it breaks
});
```

When frontend and backend are on **different domains**, a relative URL like `/api/auth/register` gets resolved to the frontend domain's HTML page, not the API!

## ✅ Solution

Use the `buildApiUrl()` helper function which constructs the proper absolute URL:

```typescript
// NEW (✅ Correct)
import { buildApiUrl } from "@/lib/api";

const response = await fetch(buildApiUrl("/api/auth/register"), {
  // buildApiUrl() constructs: https://api.domain.com/api/auth/register
  // Properly reaches the backend API
});
```

### How buildApiUrl() Works

```typescript
// From lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.volxai.com";

export function buildApiUrl(path: string): string {
  return API_BASE_URL + path;
}

// Example:
buildApiUrl("/api/auth/register")
// Returns: "https://api.volxai.com/api/auth/register"
```

## 🔧 Files Modified

- `client/contexts/AuthContext.tsx`:
  - Line 8: Added `buildApiUrl` to imports
  - Line 115: Changed `/api/auth/register` to `buildApiUrl("/api/auth/register")`

## ✅ Testing Steps

1. Go to `/register` page
2. Fill in registration form (email, username, password, name)
3. Click "Đăng ký" button
4. **Expected:** User registers successfully, redirected to home/dashboard
5. **No error:** "Unexpected token '<'" error should be gone

## 🎯 Why This Pattern Matters

The app supports multiple deployment scenarios:
- Frontend on `volxai.com`, Backend on `api.volxai.com` (different subdomains)
- Frontend on `example.com`, Backend on `api.example.com` (cross-domain)
- Local dev: Frontend on `localhost:5173`, Backend on `localhost:3000`

Using `buildApiUrl()` ensures the correct endpoint is always reached regardless of deployment setup.

## 📝 Similar Issues Found

Check other auth endpoints to ensure they all use `buildApiUrl()`:
- ✅ Login - already uses helper functions
- ✅ Logout - already uses helper functions  
- ✅ Get current user - already uses helper functions
- ✅ Register - **FIXED in this commit**

## 🚀 Deployment

```bash
git pull origin main
npm run build
# Restart Node.js
pkill -f "node.*node-build.mjs"
node dist/server/node-build.mjs &
```

Test registration on production after deployment!
