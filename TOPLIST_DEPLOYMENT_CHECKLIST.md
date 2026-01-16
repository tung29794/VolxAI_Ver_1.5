# ✅ TOPLIST FEATURE - DEPLOYMENT CHECKLIST

**Feature:** Viết Bài Dạng Toplist  
**Date:** 2026-01-08  
**Status:** Ready for Production ✅

---

## 🔍 PRE-DEPLOYMENT VERIFICATION

### ✅ Code Quality
- [x] No TypeScript errors
- [x] No lint warnings
- [x] Build successful (frontend: 1.94s, backend: 191ms)
- [x] All functions tested locally
- [x] Error handling in place
- [x] Token management working

### ✅ Database
- [x] Prompts created (ID 23, 24)
- [x] Prompts are active (is_active = TRUE)
- [x] Variables defined correctly
- [x] SQL script executed successfully

### ✅ Documentation
- [x] TOPLIST_FEATURE_COMPLETE_GUIDE.md created
- [x] TOPLIST_FEATURE_SUMMARY.md created
- [x] TOPLIST_VIDEO_SCRIPT.md created
- [x] Code comments added
- [x] API endpoints documented

---

## 📦 FILES TO DEPLOY

### Frontend Files (dist/spa/):
```
dist/spa/
├── index.html
├── assets/
│   ├── index-CrnhMJnX.css (106 KB)
│   └── index-ewqppjMH.js (939 KB)
└── .htaccess
```

### Backend Files (dist/server/):
```
dist/server/
└── node-build.mjs (209 KB)
```

### Database:
```
ADD_TOPLIST_PROMPTS.sql
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backup Current Production
```bash
# SSH to server
sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Backup public_html
cd ~
tar -czf backup_volxai_$(date +%Y%m%d_%H%M%S).tar.gz public_html/

# Backup database
mysqldump -u jybcaorr_lisaaccountcontentapi -p'ISlc)_+hKk+g2.m^' \
  jybcaorr_lisacontentdbapi > backup_db_$(date +%Y%m%d_%H%M%S).sql

# Verify backups
ls -lh backup_*
```

**Checklist:**
- [ ] public_html backed up
- [ ] Database backed up
- [ ] Backup files verified

---

### Step 2: Database Update

```bash
# Execute SQL script
sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "mysql -u jybcaorr_lisaaccountcontentapi -p'ISlc)_+hKk+g2.m^' \
  jybcaorr_lisacontentdbapi" < ADD_TOPLIST_PROMPTS.sql

# Verify prompts
sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "mysql -u jybcaorr_lisaaccountcontentapi -p'ISlc)_+hKk+g2.m^' \
  jybcaorr_lisacontentdbapi -e \"SELECT id, feature_name, display_name, is_active \
  FROM ai_prompts WHERE id IN (23, 24);\""
```

**Expected Output:**
```
+----+---------------------------+----------------------+-----------+
| id | feature_name              | display_name         | is_active |
+----+---------------------------+----------------------+-----------+
| 23 | generate_toplist_title    | Tạo tiêu đề Toplist  |         1 |
| 24 | generate_toplist_outline  | Tạo dàn ý Toplist    |         1 |
+----+---------------------------+----------------------+-----------+
```

**Checklist:**
- [ ] SQL executed without errors
- [ ] Prompt ID 23 exists and active
- [ ] Prompt ID 24 exists and active

---

### Step 3: Upload Frontend Files

**Option A: Via cPanel File Manager**
1. Login to cPanel: https://ghf57-22175.azdigihost.com:2083
2. Go to File Manager → public_html
3. Delete old files:
   - `index.html`
   - `assets/` folder
4. Upload new files from `dist/spa/`:
   - `index.html`
   - `assets/index-CrnhMJnX.css`
   - `assets/index-ewqppjMH.js`
   - `.htaccess`
5. Set permissions: 644 for files, 755 for folders

**Option B: Via SCP**
```bash
# Upload frontend files
scp -P 2210 dist/spa/index.html \
  jybcaorr@ghf57-22175.azdigihost.com:~/public_html/

scp -P 2210 -r dist/spa/assets/ \
  jybcaorr@ghf57-22175.azdigihost.com:~/public_html/

scp -P 2210 dist/spa/.htaccess \
  jybcaorr@ghf57-22175.azdigihost.com:~/public_html/
```

**Checklist:**
- [ ] index.html uploaded
- [ ] assets/ folder uploaded
- [ ] .htaccess uploaded
- [ ] File permissions correct

---

### Step 4: Upload Backend Files

**Via cPanel File Manager:**
1. Go to File Manager → (your node.js app directory)
2. Upload `dist/server/node-build.mjs`
3. Set permissions: 644

**Via SCP:**
```bash
# Upload backend file
scp -P 2210 dist/server/node-build.mjs \
  jybcaorr@ghf57-22175.azdigihost.com:~/[node-app-directory]/
```

**Checklist:**
- [ ] node-build.mjs uploaded
- [ ] File permissions correct

---

### Step 5: Restart Node.js Application

**Via cPanel:**
1. Login to cPanel
2. Go to "Setup Node.js App"
3. Find your VolxAI application
4. Click "Restart" button
5. Wait for confirmation

**Via SSH:**
```bash
# SSH to server
sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# Restart app (command may vary)
pm2 restart volxai
# OR
touch ~/[node-app-directory]/tmp/restart.txt
```

**Checklist:**
- [ ] Node.js app restarted
- [ ] No error messages
- [ ] App status: Running

---

### Step 6: Clear Cache

**Browser Cache:**
- Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- Or clear browser cache completely

**Server Cache (if applicable):**
```bash
# Clear Redis cache (if using)
redis-cli FLUSHALL

# Clear opcache (if using PHP opcache)
# (Not applicable for this project)
```

**Checklist:**
- [ ] Browser cache cleared
- [ ] Server cache cleared (if applicable)

---

### Step 7: Verify Deployment

**Test 1: Homepage loads**
- [ ] Visit: https://volxai.com
- [ ] No 500/404 errors
- [ ] Assets load correctly (CSS, JS)

**Test 2: Login works**
- [ ] Visit: https://volxai.com/login
- [ ] Login with test account
- [ ] Redirect to /account successful

**Test 3: Toplist feature visible**
- [ ] Navigate to "Viết bài bằng AI"
- [ ] "Viết bài Toplist" card visible (purple)
- [ ] Click card → form appears

**Test 4: Outline generation**
- [ ] Fill: Topic = "Cách học tiếng Anh"
- [ ] Fill: Item count = 5
- [ ] Select: Auto Toplist
- [ ] Click: "Tạo Dàn Ý Toplist" (if Custom selected)
- [ ] Outline appears in textarea

**Test 5: Article generation**
- [ ] Fill all required fields
- [ ] Click: "Tạo Bài Toplist"
- [ ] Progress view shows
- [ ] Typing effect works
- [ ] Article completes (30-60s)
- [ ] Redirect to editor

**Test 6: Article structure**
- [ ] Title is toplist-style (Top X, X Ways...)
- [ ] Has intro paragraph (no heading)
- [ ] Has numbered H2 sections (1, 2, 3...)
- [ ] Has conclusion
- [ ] Paragraph count correct (2/3/5 per item)

**Test 7: Token deduction**
- [ ] Check user tokens before generation
- [ ] Generate article
- [ ] Check user tokens after generation
- [ ] Tokens deducted correctly (5k/10k/20k)

**Test 8: Database record**
```sql
-- Check latest toplist article
SELECT id, title, slug, status, created_at 
FROM articles 
ORDER BY id DESC 
LIMIT 1;

-- Should have toplist-style title
-- Should be status = 'draft'
```

**Checklist:**
- [ ] All tests passed
- [ ] No console errors
- [ ] No network errors
- [ ] Tokens deducted correctly
- [ ] Article saved to database

---

## 🔍 POST-DEPLOYMENT MONITORING

### Day 1: Initial Monitoring (0-24h)

**Metrics to watch:**
- [ ] Total toplist articles generated
- [ ] Error rate (< 1%)
- [ ] Average generation time (30-60s)
- [ ] Token consumption patterns
- [ ] User feedback/support tickets

**Database Queries:**
```sql
-- Total toplist articles today
SELECT COUNT(*) FROM articles 
WHERE DATE(created_at) = CURDATE() 
AND (title LIKE 'Top %' OR title LIKE '% Cách %' OR title LIKE '% Lý Do %');

-- Token usage for toplist
SELECT COUNT(*), SUM(tokens_used) 
FROM token_usage_logs 
WHERE feature_name LIKE '%TOPLIST%' 
AND DATE(created_at) = CURDATE();

-- Error logs
SELECT * FROM error_logs 
WHERE DATE(created_at) = CURDATE() 
AND message LIKE '%toplist%' 
ORDER BY created_at DESC;
```

---

### Week 1: Feature Adoption (0-7 days)

**KPIs:**
- [ ] Daily toplist articles generated
- [ ] % of users trying toplist feature
- [ ] Completion rate (started vs completed)
- [ ] Average article length
- [ ] Most popular item counts (5, 7, 10)

**User Feedback:**
- [ ] Survey existing users
- [ ] Collect feature requests
- [ ] Monitor support tickets
- [ ] Check social media mentions

---

### Month 1: Optimization (0-30 days)

**Analysis:**
- [ ] Compare toplist vs regular article performance
- [ ] Identify popular topics/keywords
- [ ] Analyze title formats (Top X vs X Ways)
- [ ] Check SEO rankings for toplist articles
- [ ] Review token costs vs user value

**Improvements:**
- [ ] Fine-tune prompts based on feedback
- [ ] Adjust paragraph counts if needed
- [ ] Add new toplist formats if requested
- [ ] Optimize token costs
- [ ] Update documentation

---

## 🐛 TROUBLESHOOTING

### Issue: Prompts not found (ID 23, 24)

**Symptoms:**
- Error: "No prompt found for generate_toplist_title"
- Article generation fails

**Solution:**
```bash
# Re-run SQL script
sshpass -p ';)|o|=NhgnM)' ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "mysql -u jybcaorr_lisaaccountcontentapi -p'ISlc)_+hKk+g2.m^' \
  jybcaorr_lisacontentdbapi" < ADD_TOPLIST_PROMPTS.sql

# Verify
# ... (query to check prompts)
```

---

### Issue: "Toplist card not visible"

**Symptoms:**
- Card doesn't appear in feature grid
- Console error: "ToplistForm is not defined"

**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Check file upload: `assets/index-ewqppjMH.js` exists
3. Re-upload frontend files if needed
4. Restart Node.js app

---

### Issue: "Insufficient tokens" even with enough balance

**Symptoms:**
- Error shows incorrect token balance
- Token check fails before generation

**Solution:**
```sql
-- Check user token balance
SELECT id, username, tokens_remaining FROM users WHERE id = [USER_ID];

-- Check token costs
-- Should match TOKEN_COSTS in tokenManager.ts
```

---

### Issue: Article structure not correct

**Symptoms:**
- No numbered headings (1, 2, 3...)
- Missing intro/conclusion
- Wrong paragraph count

**Solution:**
1. Check prompt in database (ID 24):
   ```sql
   SELECT prompt_template FROM ai_prompts WHERE id = 24;
   ```
2. Verify outline format includes:
   - `[intro]` tag
   - `[h2] 1. ...` format
   - `[h2] Kết luận` at end
3. Edit prompt if needed via Admin panel

---

## 📞 SUPPORT CONTACTS

**Technical Issues:**
- Developer: [Your email]
- Support: support@volxai.com

**Server Access:**
- cPanel: https://ghf57-22175.azdigihost.com:2083
- SSH: jybcaorr@ghf57-22175.azdigihost.com (port 2210)

**Database:**
- Host: localhost (via SSH)
- Database: jybcaorr_lisacontentdbapi
- User: jybcaorr_lisaaccountcontentapi

---

## ✅ FINAL CHECKLIST

### Before Going Live:
- [ ] All code merged to main branch
- [ ] Build successful (no errors)
- [ ] Database prompts verified
- [ ] Backup completed
- [ ] Team notified

### During Deployment:
- [ ] Frontend files uploaded
- [ ] Backend files uploaded
- [ ] Node.js app restarted
- [ ] Cache cleared

### After Deployment:
- [ ] All tests passed
- [ ] No critical errors
- [ ] Users notified (email/announcement)
- [ ] Documentation published
- [ ] Monitoring enabled

### Within 24 Hours:
- [ ] Monitor error logs
- [ ] Check usage metrics
- [ ] Respond to user feedback
- [ ] Fix any critical bugs

### Within 1 Week:
- [ ] Collect user feedback
- [ ] Optimize prompts if needed
- [ ] Update documentation
- [ ] Plan next improvements

---

**Deployment Date:** [YYYY-MM-DD]  
**Deployed By:** [Your Name]  
**Status:** ✅ LIVE / 🔄 IN PROGRESS / ❌ FAILED  
**Notes:** [Any additional notes]

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0  
**Next Review:** 2026-01-15
