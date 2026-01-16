# Deployment Log - Post Type Selection Fix

**Date**: January 4, 2026  
**Fix**: Post Type Selection Issue in Publish Modal

## SSH Connection Info
- **Host**: ghf57-22175.azdigihost.com
- **Username**: jybcaorr
- **Port**: 2210
- **Server Path**: /home/jybcaorr/api.volxai.com/
- **Client Path**: /home/jybcaorr/public_html/

## Deployment Steps

### 1. ✅ Build Server
```bash
npm run build:server
```
**Result**: ✓ 12 modules transformed (317ms)
**Output**: dist/server/node-build.mjs (128.39 kB)

### 2. ✅ Upload Server Build
```bash
scp -P 2210 dist/server/node-build.mjs \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
```
**Result**: 100% uploaded (125KB @ 1.7MB/s)

### 3. ✅ Restart Server
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```
**Result**: Server restarted successfully

### 4. ✅ Build Client
```bash
npm run build:client
```
**Result**: ✓ 1953 modules transformed (1.87s)
**Output**: 
- dist/spa/index.html (0.41 kB)
- dist/spa/assets/index-cNBCx-f2.css (102.72 kB)
- dist/spa/assets/index-BPP8LfKb.js (901.00 kB)

### 5. ✅ Upload Client Files
```bash
rsync -avz -e "ssh -p 2210" dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ \
  --exclude='.htaccess'
```
**Result**: 8 files transferred
- Transfer speed: 2.46 MB/s
- Total size: 1017083 bytes
- Files:
  - favicon.ico
  - index.html
  - placeholder.svg
  - robots.txt
  - assets/index-BPP8LfKb.js
  - assets/index-cNBCx-f2.css

## Changes Deployed

### Backend (server/routes/websites.ts)
✅ **Post Types Normalization**:
- Validate post_types array from WordPress
- Normalize to consistent `{slug, label}` format
- Filter invalid entries
- Added detailed logging for debugging

### Frontend (client/components/PublishModal.tsx)
✅ **Post Type Selection**:
- Improved validation and filtering
- Handle both object and string formats
- Unique keys for SelectItem components
- Filter null values before rendering

## Testing Checklist

### Post Type Selection
- [ ] Open article editor
- [ ] Click "Đăng bài" or "Cập nhật" button
- [ ] Select a WordPress website (not VolxAI)
- [ ] Post Type dropdown should:
  - [ ] Display individual options clearly
  - [ ] Allow selecting one option at a time
  - [ ] Not auto-select all options
  - [ ] Allow deselecting by choosing another option
- [ ] Check browser console for:
  - [ ] "Raw response from WordPress" log
  - [ ] "Normalized post types" log
  - [ ] Individual "Rendering option" logs with correct slug/label

### Publish Functionality
- [ ] Select post type (e.g., "post", "page")
- [ ] Select categories/tags if available
- [ ] Click "Đăng ngay" - should publish successfully
- [ ] Check WordPress to verify:
  - [ ] Article published
  - [ ] Correct post type applied
  - [ ] Categories/tags assigned properly

### Schedule Functionality
- [ ] Select post type
- [ ] Choose date and time
- [ ] Click "Hẹn giờ"
- [ ] Verify scheduled in database

## Quick Rollback (if needed)

If issues occur, rollback with previous build:
```bash
# From backup directory
scp -P 2210 node-build.mjs.backup \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/node-build.mjs

ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

## Monitoring

**Check server logs**:
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "tail -f /home/jybcaorr/api.volxai.com/logs/error.log"
```

**Check application**:
- Frontend: https://volxai.com
- Backend API: https://api.volxai.com/health

## Related Documentation
- `FIX_POST_TYPE_SELECTION.md` - Technical details of the fix
- `PUBLISH_MODAL_FEATURE_GUIDE.md` - Feature documentation

## Status
✅ **DEPLOYED SUCCESSFULLY**

All deployment steps completed without errors. Ready for testing.

---
**Deployed by**: GitHub Copilot  
**Deployment Time**: ~10 seconds  
**Total Size**: ~1.2 MB
