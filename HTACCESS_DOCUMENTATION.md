# .htaccess Configuration for public_html

## Status

✅ `.htaccess` file is already configured in `/public_html/.htaccess`

## What It Does

### 1. **React Router SPA Routing** ✅
Rewrites all requests to non-existent files/directories to `index.html` so React Router can handle all routes:

```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

**How it works**:
- User visits `/upgrade` 
- Server checks: Is `/upgrade` a real file? NO
- Server checks: Is `/upgrade` a real directory? NO
- Server rewrites the request to `/index.html`
- React Router in `index.html` handles the `/upgrade` route

### 2. **Security Headers** ✅
Protects against common web vulnerabilities:

```apache
X-Frame-Options: SAMEORIGIN          # Prevents clickjacking
X-XSS-Protection: 1; mode=block       # Enables XSS protection
X-Content-Type-Options: nosniff       # Prevents MIME type sniffing
Content-Security-Policy: ...          # Restricts resource loading
```

### 3. **Gzip Compression** ✅
Compresses text, CSS, JS, and JSON responses to reduce bandwidth:

```apache
AddOutputFilterByType DEFLATE text/html
AddOutputFilterByType DEFLATE text/css
AddOutputFilterByType DEFLATE application/javascript
```

Reduces file size by ~70% for text-based content.

### 4. **Browser Caching** ✅
Tells browsers when to cache files for better performance:

**HTML**: Cache for 0 seconds
- Always fetch latest version (so updates appear immediately)

**CSS/JS**: Cache for 1 year
- Safe because Vite adds hash to filenames: `index-CtieqMJH.css`
- When you rebuild, filename changes, old cache is ignored

**Images/Fonts**: Cache for 1 year
- Static assets that don't change often

### 5. **MIME Types** ✅
Correctly identifies file types for proper serving:

```apache
AddType application/json .json
AddType application/javascript .js
AddType text/css .css
AddType image/svg+xml .svg
AddType font/woff2 .woff2
```

### 6. **Security** ✅
Prevents access to sensitive files:

```apache
Deny: .env, .sql, .json, .config, .log
```

### 7. **UTF-8 Encoding** ✅
Ensures proper character encoding for Vietnamese text:

```apache
AddDefaultCharset utf-8
```

## Features Currently Disabled (Optional)

These are commented out in the file. Enable them if needed:

### Remove www from URLs
```apache
# RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
# RewriteRule ^(.*)$ https://%1/$1 [R=301,L]
```
Enable this if you want `www.volxai.com` → `volxai.com`

### Force HTTPS
```apache
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```
Enable this if you have SSL certificate and want to force HTTPS

### HSTS Header
```apache
# Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```
Enable this for HTTPS-only enforcement (after enabling force HTTPS)

## How to Deploy

The `.htaccess` file is already in the repository at `/public_html/.htaccess`.

When you rsync deploy the frontend:
```bash
rsync -avz -e "ssh -p 2210" /Users/tungnguyen/VolxAI-20Website/dist/spa/ \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --delete
```

The `.htaccess` file is NOT in `dist/spa/`, so it won't be deleted by `--delete`.

The file is already on the production server and working!

## Performance Impact

With these settings enabled:

✅ **Faster Page Loads**
- Gzip compression: ~70% smaller files
- Browser caching: No re-download of CSS/JS/images

✅ **Better Security**
- Security headers prevent common attacks
- Sensitive files protected

✅ **Proper SPA Routing**
- All routes work correctly with React Router

## Verification

To verify the configuration is working:

### 1. Check SPA Routing
```bash
curl -I https://volxai.com/upgrade
# Should return 200, serving index.html
```

### 2. Check Gzip Compression
```bash
curl -I -H "Accept-Encoding: gzip" https://volxai.com
# Should see: Content-Encoding: gzip
```

### 3. Check Security Headers
```bash
curl -I https://volxai.com
# Should see X-Frame-Options, X-Content-Type-Options, etc.
```

### 4. Check Caching Headers
```bash
curl -I https://volxai.com/assets/index-CtieqMJH.css
# Should see: Cache-Control: public, max-age=31536000 (1 year)
```

## Content Security Policy (CSP)

The current CSP allows:
- Scripts from: `'self'` (same origin) + `'unsafe-inline'` + https:
- Styles from: `'self'` + `'unsafe-inline'` + https:
- API calls to: `https://api.volxai.com`

If you encounter CSP violations:
1. Check browser console for CSP errors
2. Update the CSP header in `.htaccess`
3. Example: Allow Google Fonts:
```apache
font-src 'self' data: https: fonts.googleapis.com;
```

## Future Improvements

1. **Remove `'unsafe-inline'`** for better security
   - Requires updating React build to generate inline styles properly
   - More effort but much more secure

2. **Enable Force HTTPS** if you have SSL certificate
   - Uncomment HTTPS redirect section

3. **Add HSTS** for maximum security
   - Prevents man-in-the-middle attacks
   - Only enable after HTTPS is working

## Troubleshooting

### Routes not working (404 on non-root routes)
- Check: `mod_rewrite` is enabled
- Fix: Enable rewrite module in cPanel

### Styles/scripts not loading
- Check: MIME types are correct
- Check: Security headers allow the resources
- Fix: Update CSP if needed

### Files downloading instead of displaying
- Check: MIME type in `.htaccess`
- Fix: Add correct MIME type for file extension

### Old cached files showing
- Client: Browser cache, Cmd+Shift+R to clear
- Server: Vite updates filenames, so cache should be fine

## Related Files

- `/public_html/.htaccess` - Apache configuration (this file)
- `/dist/spa/` - Built frontend files
- Vite config handles file hashing for cache busting
