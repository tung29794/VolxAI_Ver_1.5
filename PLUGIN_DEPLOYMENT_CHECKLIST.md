# 📋 WordPress Plugin Deployment Checklist

## ✅ Pre-Deployment

- [x] Code updated with new endpoints
- [x] Version bumped to 1.0.2
- [x] Changelog created
- [x] Documentation written
- [x] Plugin packaged as ZIP
- [x] VolxAI backend already deployed

## 🚀 Deployment Steps

### Step 1: Backup (Recommended)
```bash
# On each WordPress site
cd wp-content/plugins/
cp -r article-writer-publisher article-writer-publisher-backup-v1.0.0
```

### Step 2: Upload Plugin
Choose one method:

#### Method A: WordPress Admin (Easiest)
- [ ] Go to: Plugins → Add New → Upload Plugin
- [ ] Upload: `article-writer-publisher-v1.0.2.zip`
- [ ] Click: Install Now
- [ ] Click: Activate Plugin

#### Method B: FTP/SFTP
- [ ] Connect to WordPress server
- [ ] Navigate to: `/wp-content/plugins/`
- [ ] Delete old: `article-writer-publisher/` (or rename)
- [ ] Upload: `lisa-content-app-plugin/` folder
- [ ] Rename to: `article-writer-publisher/`
- [ ] Activate in WordPress Admin

#### Method C: SSH (For servers like Da Nang Chill Ride, Master Trading Wave)
```bash
# Example for Da Nang Chill Ride
scp -P 2210 article-writer-publisher-v1.0.2.zip user@server:/home/user/
ssh -p 2210 user@server
cd ~/public_html/wp-content/plugins/
unzip ~/article-writer-publisher-v1.0.2.zip
mv article-writer-publisher article-writer-publisher-old
mv lisa-content-app-plugin article-writer-publisher
chown -R www-data:www-data article-writer-publisher
chmod -R 755 article-writer-publisher
```

### Step 3: Verify Installation
- [ ] Check WordPress Admin → Plugins
- [ ] Verify version shows: **1.0.2**
- [ ] Check Settings → Article Writer
- [ ] Confirm API token still present

### Step 4: Test New APIs

#### Test Check Slug:
```bash
curl "https://YOUR_SITE/wp-json/article-writer/v1/check-slug?slug=test&post_type=post" \
  -H "X-Article-Writer-Token: YOUR_TOKEN"
```
- [ ] Returns valid JSON response
- [ ] Shows `exists: true/false`

#### Test Delete Post:
```bash
# Create a test post first, then:
curl -X POST "https://YOUR_SITE/wp-json/article-writer/v1/delete/POST_ID" \
  -H "X-Article-Writer-Token: YOUR_TOKEN"
```
- [ ] Returns success message
- [ ] Post actually deleted

### Step 5: Integration Test
- [ ] Publish article from VolxAI with existing slug
- [ ] Verify old post deleted
- [ ] Verify new post created with clean slug (no -2)
- [ ] Check post content matches
- [ ] Verify featured image uploaded

## 🌐 Deploy to All Sites

### Site 1: Da Nang Chill Ride
- [ ] Plugin uploaded
- [ ] Version verified: 1.0.2
- [ ] APIs tested
- [ ] Integration test passed

### Site 2: Master Trading Wave  
- [ ] Plugin uploaded
- [ ] Version verified: 1.0.2
- [ ] APIs tested
- [ ] Integration test passed

### Site 3: [Add your sites]
- [ ] Plugin uploaded
- [ ] Version verified: 1.0.2
- [ ] APIs tested
- [ ] Integration test passed

## 🔍 Post-Deployment Verification

- [ ] No 404 errors on API endpoints
- [ ] No PHP errors in WordPress error log
- [ ] Plugin logs show activity in `/wp-content/plugins/article-writer-publisher/logs/`
- [ ] Old publish functionality still works
- [ ] New anti-duplicate system works

## 🐛 Troubleshooting

If issues occur:

1. **API returns 404**
   - Go to: Settings → Permalinks → Save Changes
   - This flushes rewrite rules

2. **API returns 401/403**
   - Check API token in Settings → Article Writer
   - Verify token in VolxAI matches

3. **Delete doesn't work**
   - Check post ID exists
   - Check WordPress user permissions
   - Check error logs

4. **Rollback needed**
   ```bash
   cd wp-content/plugins/
   rm -rf article-writer-publisher
   mv article-writer-publisher-backup-v1.0.0 article-writer-publisher
   ```

## 📝 Notes

- **Safe upgrade**: No database changes
- **Backward compatible**: All old endpoints work
- **No downtime**: Can upgrade while site is live
- **API tokens preserved**: No need to regenerate

## ✅ Final Check

After deploying to all sites:
- [ ] All WordPress sites show v1.0.2
- [ ] VolxAI can publish to all sites
- [ ] No slug-2 duplicates created
- [ ] Featured images upload correctly
- [ ] SEO data preserved
- [ ] Taxonomies assigned correctly

---

**Status:** Ready to deploy! 🚀

**Package Location:** 
```
/Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5/article-writer-publisher-v1.0.2.zip
```

**Estimated Time:** 5-10 minutes per site
