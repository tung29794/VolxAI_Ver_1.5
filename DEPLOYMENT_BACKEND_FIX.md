# Backend Deployment Fix - January 3, 2026

## Vấn đề

User gặp lỗi 404 khi đăng bài lên WordPress:
```
Failed to load resource: the server responded with a status of 404
api.volxai.com/api/websites/1/publish
```

## Root Cause

1. **Backend build mới** (với route `/api/websites/:id/publish`) được deploy vào thư mục **SAI**:
   - ❌ Deployed to: `~/api_server/` (thư mục mới tạo)
   - ✅ Should be: `~/api.volxai.com/` (thư mục đang chạy)

2. **Passenger server** đang chạy từ `~/api.volxai.com/` và chưa được restart với code mới

## Solution

### 1. Deploy đúng thư mục
```bash
# Deploy backend build to correct location
rsync -avz -e "ssh -p 2210" \
  dist/server/node-build.mjs \
  jybcaorr@103.221.221.67:~/api.volxai.com/
```

### 2. Restart Passenger server
```bash
# Trigger Passenger restart
ssh -p 2210 jybcaorr@103.221.221.67 \
  "touch ~/api.volxai.com/tmp/restart.txt"
```

## Server Structure

### ✅ Correct Structure
```
~/api.volxai.com/
├── node-build.mjs          # Backend build (Express server)
├── node_modules/           # Dependencies
├── package.json
├── .env                    # Environment variables
├── .htaccess              # Passenger configuration
└── tmp/
    └── restart.txt        # Touch to restart server
```

### ❌ Incorrect (was deployed here)
```
~/api_server/              # Wrong location - server không chạy từ đây
├── node-build.mjs
└── ...
```

## Backend Routes Added

New routes trong `server/routes/websites.ts`:

### 1. Get Post Types
```typescript
GET /api/websites/:websiteId/post-types
```

### 2. Publish Article
```typescript
POST /api/websites/:websiteId/publish
Body: {
  articleId: number,
  postType: string
}
```

## Deployment Commands (Correct)

### Frontend
```bash
npm run build
rsync -avz --delete -e "ssh -p 2210" \
  dist/spa/ \
  jybcaorr@103.221.221.67:~/public_html/
```

### Backend
```bash
rsync -avz -e "ssh -p 2210" \
  dist/server/node-build.mjs \
  jybcaorr@103.221.221.67:~/api.volxai.com/

# Restart server
ssh -p 2210 jybcaorr@103.221.221.67 \
  "touch ~/api.volxai.com/tmp/restart.txt"
```

### .htaccess
```bash
rsync -avz -e "ssh -p 2210" \
  public_html/.htaccess \
  jybcaorr@103.221.221.67:~/public_html/
```

## Server Configuration

### Passenger (.htaccess in api.volxai.com)
```apache
PassengerEnabled On
PassengerNodejs /home/jybcaorr/.nvm/versions/node/v20.18.1/bin/node
PassengerAppRoot /home/jybcaorr/api.volxai.com
PassengerStartupFile node-build.mjs
PassengerAppType node
PassengerRestartDir /home/jybcaorr/api.volxai.com/tmp
```

## Verification Steps

### 1. Check server is running
```bash
ssh -p 2210 jybcaorr@103.221.221.67 \
  "tail -50 ~/api.volxai.com/stderr.log"
```

### 2. Test API endpoint
```bash
curl -X GET https://api.volxai.com/api/ping
# Should return: {"success": true, "message": "API is running"}
```

### 3. Test websites route
```bash
curl -X GET https://api.volxai.com/api/websites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test publish endpoint
```bash
curl -X POST https://api.volxai.com/api/websites/1/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"articleId": 123, "postType": "post"}'
```

## Known Issues (From Logs)

### 1. Missing column 'primary_keyword'
```
Error: Unknown column 'primary_keyword' in 'INSERT INTO'
```
**Solution**: Database migration needed
```sql
ALTER TABLE articles ADD COLUMN primary_keyword VARCHAR(255) NULL;
```

### 2. Wrong SPA path in backend
```
Error: ENOENT: no such file or directory, stat '/home/jybcaorr/spa/index.html'
```
**Solution**: Update backend to use correct path
- Should be: `/home/jybcaorr/public_html/`
- Currently: `/home/jybcaorr/spa/`

## Production URLs

- **Frontend**: https://volxai.com
- **Backend API**: https://api.volxai.com
- **Server Location**: `~/api.volxai.com/` on shared hosting

## Future Improvements

1. **Deployment Script**: Create automated script that deploys to correct locations
2. **Health Check**: Add `/api/health` endpoint to verify server status
3. **Database Migrations**: Automated migration system
4. **Environment Check**: Verify all required columns exist before starting

## Summary

✅ **Fixed**: Backend được deploy đúng vị trí và restart thành công  
✅ **Route added**: `/api/websites/:id/publish` endpoint  
⚠️ **Note**: Database cần migration để add `primary_keyword` column  
⚠️ **Note**: SPA path trong backend code cần sửa

---

**Date**: January 3, 2026  
**Status**: Backend deployed và running  
**Next**: Test publish functionality from frontend
