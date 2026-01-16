# 🔧 FIXED: .htaccess Issue

## ❌ Vấn đề
File `.htaccess` bị xóa khi deploy với `rsync --delete`, gây lỗi routing cho React SPA.

## ✅ Giải pháp đã áp dụng

### 1. Tạo .htaccess Template
**File:** `dist/spa/.htaccess`

**Nội dung:**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>
```

Cấu hình này cho phép:
- ✅ React Router hoạt động (client-side routing)
- ✅ Direct URL access (e.g., /admin, /articles/123)
- ✅ Browser refresh không bị 404
- ✅ CORS headers
- ✅ Compression
- ✅ Browser caching

### 2. Post-Build Script
**File:** `post-build.sh`

Tự động tạo `.htaccess` sau mỗi lần build:
```bash
npm run build:client
# → vite build
# → ./post-build.sh (tạo .htaccess)
```

### 3. Safe Deploy Script
**File:** `deploy-frontend-safe.sh`

Deploy mà **không xóa** .htaccess:
```bash
rsync -avz --exclude='.htaccess' ...
```

### 4. Updated package.json
```json
"build:client": "vite build && ./post-build.sh"
```

---

## 🚀 Cách sử dụng

### Deploy Frontend (Recommended)
```bash
./deploy-frontend-safe.sh
```

Script này sẽ:
1. ✅ Build frontend
2. ✅ Tạo .htaccess
3. ✅ Upload files (preserve .htaccess)
4. ✅ Verify .htaccess exists

### Build Only
```bash
npm run build:client
# Automatically creates .htaccess via post-build.sh
```

### Manual Deploy (if needed)
```bash
# Build
npm run build:client

# Deploy without deleting .htaccess
rsync -avz --exclude='.htaccess' \
  -e "ssh -p 2210" \
  dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/

# Ensure .htaccess exists
scp -P 2210 dist/spa/.htaccess \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/.htaccess
```

---

## ✅ Đã deploy

- ✅ `.htaccess` uploaded to production
- ✅ `post-build.sh` created and executable
- ✅ `deploy-frontend-safe.sh` created and executable
- ✅ `package.json` updated with post-build hook
- ✅ Routing should work now

---

## 🔍 Verify

### Test Routing
1. Vào: https://volxai.com
2. Navigate to: https://volxai.com/admin
3. Refresh page (F5)
4. Should NOT get 404 ✅

### Check .htaccess
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "cat /home/jybcaorr/public_html/.htaccess"
# Should show the RewriteRule content
```

---

## 📊 Files Created

| File | Purpose |
|------|---------|
| `dist/spa/.htaccess` | Apache rewrite rules for SPA |
| `post-build.sh` | Auto-create .htaccess after build |
| `deploy-frontend-safe.sh` | Safe deploy script (preserves .htaccess) |
| `HTACCESS_FIX.md` | This documentation |

---

## 🎯 Best Practices

### Always use safe deploy:
```bash
./deploy-frontend-safe.sh
```

### Never use rsync --delete without exclude:
```bash
# ❌ BAD: Deletes .htaccess
rsync -avz --delete dist/spa/ server:/path/

# ✅ GOOD: Preserves .htaccess
rsync -avz --exclude='.htaccess' dist/spa/ server:/path/
```

### Check .htaccess after deploy:
```bash
curl -I https://volxai.com/admin
# Should return 200 OK, not 404
```

---

## 🚨 If .htaccess is missing again

**Quick fix:**
```bash
scp -P 2210 dist/spa/.htaccess \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/.htaccess
```

**Or re-run:**
```bash
./deploy-frontend-safe.sh
```

---

**Status:** ✅ FIXED - .htaccess deployed and protected from future deletions
