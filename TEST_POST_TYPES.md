# Test Post Types Feature

## Quick Test Steps

### 1. Clear Browser Cache
- Open DevTools (F12)
- Right-click Refresh button → "Empty Cache and Hard Reload"
- OR use Incognito/Private window

### 2. Login
- Go to https://volxai.com
- Login with: webmtpvn@gmail.com

### 3. Test Endpoint Manually

Get fresh token from browser:
1. F12 → Application tab → Local Storage → volxai.com
2. Copy `authToken` value
3. Test in terminal:

```bash
TOKEN="paste_your_token_here"

# Test get post types
curl -X GET "https://api.volxai.com/api/websites/1/post-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "name": "post",
      "label": "Posts",
      "singular": "Post",
      "count": 45,
      ...
    }
  ]
}
```

### 4. Test in Browser

1. Go to https://volxai.com/account
2. Click "Website" tab
3. Click "Đồng bộ" button on "Da Nang Chill Ride"
4. Modal should appear with post types list

### 5. Check Console

Open DevTools Console and look for:
- Network tab → XHR/Fetch → Check request to `/api/websites/1/post-types`
- Console tab → Look for any JavaScript errors
- Response status should be 200, not 500 or 404

## Troubleshooting

### Error: "Failed to load resource: status 500"
**Cause:** Old JavaScript file cached or backend not restarted
**Solution:**
```bash
# 1. Restart backend
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch api.volxai.com/tmp/restart.txt"

# 2. Clear browser cache completely
# 3. Try Incognito mode
```

### Error: "404 Not Found"
**Cause:** Route order issue or backend not deployed
**Solution:**
```bash
# Redeploy backend
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
npm run build:server
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:api.volxai.com/
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch api.volxai.com/tmp/restart.txt"
```

### Error: Modal doesn't open
**Cause:** Frontend not updated
**Solution:**
```bash
# Rebuild and deploy frontend
npm run build:client
rsync -avz --delete -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:public_html/
```

## Current Status

✅ Backend deployed: `api.volxai.com/node-build.mjs` (109.38 KB)
✅ Frontend deployed: `public_html/assets/index-Bk23dLFs.js` (881.69 KB)
✅ Route order fixed: `/:id/post-types` before `/:id`
✅ WordPress plugin ready: `lisa-content-app-plugin-with-post-types.zip`

⏳ **Next:** Clear browser cache and test!
