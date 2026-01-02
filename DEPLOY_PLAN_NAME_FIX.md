# Production Deployment Instructions

## Issue Found
Plan name not displaying after admin approval because `subscription_history.to_plan` was NULL in database.

## Files to Deploy
- `server/routes/admin.ts` (Line 356-358: Added `to_plan = ?` parameter)

## Quick Deployment Steps via SSH

### 1. Connect to server
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com
```

### 2. Navigate to project
```bash
cd public_html
```

### 3. Pull latest changes
```bash
git pull origin main
```

### 4. Rebuild backend (if needed)
```bash
npm run build
```

### 5. Restart Node.js server
```bash
# Kill existing process
pkill -f "node.*node-build.mjs"

# Start new process
node dist/server/node-build.mjs &
```

## Verification

After deployment, test with:

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check approval endpoint works
curl -X POST http://localhost:3000/api/admin/payments/1/approve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

Then verify in database:
```bash
mysql -h localhost -u jybcaorr_lisaaccountcontentapi -p'ISlc)_+hKk+g2.m^' jybcaorr_lisacontentdbapi -e "
SELECT id, from_plan, to_plan, status FROM subscription_history 
WHERE user_id = 9 ORDER BY id DESC LIMIT 1;
"
```

Expected: `to_plan` should show the plan name (e.g., "pro"), not NULL.

## Rollback (if needed)
```bash
git revert HEAD
npm run build
# Restart Node.js server
```
