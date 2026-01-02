# Quick Test Guide - Cross-Domain API Fix

## 🚀 Quick Test (1-2 minutes)

### Test 1: Account Page
1. Go to https://volxai.com/account
2. Login with your admin account
3. Check that **user data loads** (fullName, email visible)
4. Check that **plans load** (should see plan options, not empty)
5. **Open Developer Console** (F12)
   - **Should NOT see**: "Failed to load user data: SyntaxError"
   - **Should NOT see**: "Failed to load plans: SyntaxError"
   - **Should NOT see**: "404 Not Found" on /api/ requests

### Test 2: Upgrade Page
1. Go to https://volxai.com/upgrade
2. Check that **plans display** correctly
3. Check that **current plan shows** your subscription
4. Check **no errors in console**

### Test 3: Check Network Requests
1. Open Developer Tools → Network tab
2. Reload page
3. Look for API requests in the Network tab
4. Check that requests like:
   - `https://api.volxai.com/api/auth/me` ✅ (correct domain)
   - `https://api.volxai.com/api/auth/plans` ✅ (correct domain)
   - NOT `https://volxai.com/api/...` ❌ (wrong domain)

## ✅ What You Should See

**Before fix**:
```
❌ GET https://volxai.com/api/auth/me 404
❌ Failed to load user data: SyntaxError: Unexpected token '<'
❌ Plans array is empty, using fallback defaults
```

**After fix**:
```
✅ GET https://api.volxai.com/api/auth/me 200
✅ User data loads successfully
✅ Plans load from database (13 records)
✅ No console errors related to API calls
```

## 🐛 Troubleshooting

### Issue: Still seeing "Failed to load user data" error

**Solution 1: Clear browser cache**
- Mac: Cmd+Shift+R (hard refresh)
- Windows: Ctrl+Shift+F5 (hard refresh)
- Or: Dev Tools → Right-click refresh button → "Empty cache and hard refresh"

**Solution 2: Check browser cache**
- Sometimes old built files are cached
- Hard refresh forces loading new build from server

### Issue: Plans still empty or showing 404

**Solution**: Check that backend is running
```bash
curl https://api.volxai.com/api/ping
# Should return: {"message":"ping pong"}
```

If not, restart backend on the server:
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
cd /home/jybcaorr/api.volxai.com
npm start  # or your start command
```

### Issue: Network requests still going to volxai.com

**Possible causes**:
1. Old build files still being served - clear cache and hard refresh
2. CDN caching - may take a few minutes to propagate
3. Service worker caching - clear service worker in Dev Tools

## 📊 Expected API Behavior

### Endpoints that should work now:

#### Authentication
- `GET https://api.volxai.com/api/auth/me` → User data
- `GET https://api.volxai.com/api/auth/plans` → All plans
- `GET https://api.volxai.com/api/auth/upgrade-history` → User's upgrade history
- `POST https://api.volxai.com/api/auth/change-password` → Change password
- `POST https://api.volxai.com/api/auth/update-profile` → Update profile
- `POST https://api.volxai.com/api/auth/request-upgrade` → Request plan upgrade

#### Admin (if admin user)
- `GET https://api.volxai.com/api/admin/features` → Features list
- `GET https://api.volxai.com/api/admin/statistics` → Dashboard stats
- And other admin endpoints...

## ✨ Success Criteria

✅ All of these should be true:
1. No "SyntaxError: Unexpected token '<'" errors in console
2. No "Failed to load..." errors in console
3. User data displays on Account page
4. Plans display (not fallback defaults)
5. Upgrade history shows (if any upgrades exist)
6. Network requests go to `api.volxai.com` domain
7. All API responses are JSON (not HTML error pages)

## 📝 Changes Made

**Total files fixed**: 6
- `client/lib/api.ts` - Added buildApiUrl() helper
- `client/pages/Account.tsx` - 7 endpoints
- `client/pages/Upgrade.tsx` - 3 endpoints
- `client/pages/Index.tsx` - 1 endpoint
- `client/components/Header.tsx` - 1 endpoint
- `client/components/PlanSelectionModal.tsx` - 1 endpoint

**Total API calls fixed**: 13

## 🔄 Rollback (if needed)

If something breaks:
```bash
git revert 55440e2  # Revert the cross-domain fix commit
npm run build
rsync ...  # Redeploy
```

---

**Questions?** Check `FIX_CROSS_DOMAIN_API_CALLS.md` for detailed information.
