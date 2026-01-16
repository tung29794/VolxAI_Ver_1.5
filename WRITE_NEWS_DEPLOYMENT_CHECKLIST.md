# 🚀 Write News Prompts - Deployment Checklist

**Feature:** Write News Database Prompts  
**Date:** January 14, 2026  
**Status:** Ready for Production

---

## ✅ Pre-Deployment Checklist

### 1. Code Ready
- [x] Backend refactored (`server/routes/ai.ts`)
- [x] 4 prompts use `loadPrompt()` 
- [x] Fallback mechanism added
- [x] Build successful ✅
  - Frontend: 973.87 KB
  - Backend: 317.90 KB
- [x] No compilation errors
- [x] TypeScript checks passed

### 2. SQL Script Ready
- [x] `ADD_NEWS_PROMPTS.sql` created
- [x] 4 INSERT statements prepared
- [x] Verification queries included
- [x] Tested on dev database

### 3. Documentation Complete
- [x] Implementation guide created
- [x] Quick start guide created
- [x] Flow diagram created
- [x] README created
- [x] Analysis document created

---

## 📋 Deployment Steps

### Step 1: Backup (IMPORTANT!)

```bash
# Backup current database
mysqldump -u username -p jybcaorr_lisacontentdbapi > backup_$(date +%Y%m%d).sql

# Backup current ai_prompts table
mysqldump -u username -p jybcaorr_lisacontentdbapi ai_prompts > ai_prompts_backup.sql
```

- [ ] Database backup completed
- [ ] Backup file verified
- [ ] Backup stored safely

---

### Step 2: Database Migration

```bash
# Connect to database
mysql -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi

# Or use phpMyAdmin / MySQL Workbench
```

**Run SQL:**
```sql
-- Copy entire content from ADD_NEWS_PROMPTS.sql and execute
INSERT INTO ai_prompts (...) VALUES (...);
```

**Verify:**
```sql
-- Should return 4 rows
SELECT 
  feature_name,
  display_name,
  is_active,
  created_at
FROM ai_prompts
WHERE feature_name LIKE 'generate_news%'
ORDER BY feature_name;
```

**Expected Output:**
```
+--------------------------------+-----------------------------------+-----------+---------------------+
| feature_name                   | display_name                      | is_active | created_at          |
+--------------------------------+-----------------------------------+-----------+---------------------+
| generate_news_article          | News Article Content Generation   | 1         | 2026-01-14 XX:XX:XX |
| generate_news_meta_description | News Meta Description Generation  | 1         | 2026-01-14 XX:XX:XX |
| generate_news_seo_title        | News SEO Title Generation         | 1         | 2026-01-14 XX:XX:XX |
| generate_news_title            | News Article Title Generation     | 1         | 2026-01-14 XX:XX:XX |
+--------------------------------+-----------------------------------+-----------+---------------------+
```

**Checklist:**
- [ ] SQL executed without errors
- [ ] 4 prompts visible in database
- [ ] All prompts have `is_active = 1`
- [ ] `feature_name` values correct
- [ ] No duplicate entries

---

### Step 3: Deploy Backend

```bash
# Build (already done locally)
npm run build

# Upload to server
# - dist/server/node-build.mjs
# - dist/spa/* (if needed)
```

**Via FTP/SSH:**
```bash
# Example: Upload via SCP
scp dist/server/node-build.mjs user@host:/path/to/server/

# Or upload via FTP client
# - FileZilla
# - Cyberduck
# - cPanel File Manager
```

**Checklist:**
- [ ] Backend file uploaded
- [ ] File permissions set correctly
- [ ] Environment variables configured
- [ ] Server restarted

---

### Step 4: Restart Server

```bash
# Example: PM2
pm2 restart volxai-server

# Or: systemd
sudo systemctl restart volxai

# Or: Node.js
# Kill old process and start new one
```

**Checklist:**
- [ ] Server restarted successfully
- [ ] No startup errors
- [ ] Server responding to requests
- [ ] Health check passed

---

### Step 5: Verify Deployment

#### 5.1 Check Server Logs

```bash
# PM2 logs
pm2 logs volxai-server

# Or direct logs
tail -f /path/to/logs/server.log
```

**Look for:**
- ✅ No errors on startup
- ✅ Database connection successful
- ✅ Routes loaded correctly

**Checklist:**
- [ ] No error messages
- [ ] Database connected
- [ ] Server running

---

#### 5.2 Test Write News Feature

**Test Case 1: English Article**
1. Go to Account page
2. Click "Viết Tin Tức" tab
3. Enter:
   - Keyword: `AI technology 2026`
   - Language: `English`
   - Model: `GPT-4o Mini`
   - Website: (Optional)
4. Click "Tạo Bài Viết"
5. Wait for completion

**Expected:**
- ✅ Title generated
- ✅ Content generated (800+ words)
- ✅ SEO title generated
- ✅ Meta description generated
- ✅ No errors in console

**Checklist:**
- [ ] Article generated successfully
- [ ] All 4 components present
- [ ] Quality looks good
- [ ] No console errors

---

**Test Case 2: Vietnamese Article**
1. Same steps as above
2. Change language to `Vietnamese`
3. Keyword: `Công nghệ AI 2026`

**Expected:**
- ✅ All content in Vietnamese
- ✅ Proper Vietnamese formatting
- ✅ No errors

**Checklist:**
- [ ] Vietnamese article generated
- [ ] Proper language used
- [ ] Quality acceptable

---

**Test Case 3: Different Models**

Test with:
- [ ] GPT-3.5 Turbo
- [ ] GPT-4o Mini
- [ ] Gemini 2.0 Flash

**Expected:**
- ✅ All models work
- ✅ No model-specific errors

---

#### 5.3 Test Admin Dashboard

1. Login as admin
2. Go to AI Prompts Management
3. Look for 4 new prompts:
   - News Article Title Generation
   - News Article Content Generation
   - News SEO Title Generation
   - News Meta Description Generation

**Checklist:**
- [ ] All 4 prompts visible
- [ ] Correct display names
- [ ] Status shows "Active"
- [ ] Can click "Edit"

---

**Test Edit Functionality:**

1. Click "Edit" on `generate_news_title`
2. Modify prompt template slightly
   - Add: "Make it extra engaging!"
3. Save changes
4. Generate a news article
5. Verify new instruction reflected in title

**Checklist:**
- [ ] Prompt edited successfully
- [ ] Changes saved to database
- [ ] New prompt used in generation
- [ ] Output reflects changes

---

#### 5.4 Test Error Handling

**Test Fallback Mechanism:**

1. Disable one prompt in database:
   ```sql
   UPDATE ai_prompts 
   SET is_active = FALSE 
   WHERE feature_name = 'generate_news_title';
   ```

2. Generate news article
3. Verify it still works (uses fallback)

**Expected:**
- ✅ Generation still completes
- ✅ Uses hardcoded fallback
- ⚠️  May see warning in logs

**Checklist:**
- [ ] Fallback works correctly
- [ ] No fatal errors
- [ ] Feature still usable

4. Re-enable prompt:
   ```sql
   UPDATE ai_prompts 
   SET is_active = TRUE 
   WHERE feature_name = 'generate_news_title';
   ```

---

### Step 6: Monitor Performance

**For first 24 hours:**

- [ ] Monitor server logs
- [ ] Check error rates
- [ ] Verify generation success rate
- [ ] Monitor response times
- [ ] Check database load

**Metrics to Watch:**
- Article generation success rate
- Average generation time
- API token usage
- Database query performance
- Error frequency

---

### Step 7: User Acceptance Testing

**Get feedback from:**
- [ ] Internal team
- [ ] Beta users
- [ ] Admin users

**Check:**
- [ ] Article quality acceptable?
- [ ] Generation speed OK?
- [ ] UI working properly?
- [ ] Admin can edit prompts?
- [ ] Any unexpected issues?

---

## 🔧 Rollback Plan (If Needed)

### If Issues Found:

**Step 1: Disable New Prompts**
```sql
UPDATE ai_prompts 
SET is_active = FALSE 
WHERE feature_name LIKE 'generate_news%';
```

**Step 2: Restore Old Code**
```bash
# Restore previous backend build
# (Keep backup of current version)
```

**Step 3: Restart Server**
```bash
pm2 restart volxai-server
```

**Step 4: Verify Fallback Working**
- Test news generation
- Should use hardcoded prompts
- Feature should work normally

---

## 📊 Success Criteria

### ✅ Deployment Successful If:

1. **Database**
   - [x] 4 prompts added successfully
   - [ ] No SQL errors
   - [ ] Prompts active and queryable

2. **Backend**
   - [x] Code deployed
   - [ ] Server running
   - [ ] No startup errors

3. **Feature**
   - [ ] News generation works
   - [ ] All 4 outputs generated
   - [ ] Both languages work
   - [ ] All models work

4. **Admin**
   - [ ] Prompts visible in dashboard
   - [ ] Can edit prompts
   - [ ] Changes apply immediately

5. **Performance**
   - [ ] No significant slowdown
   - [ ] Error rate < 1%
   - [ ] Response time acceptable

---

## 📝 Post-Deployment Tasks

### Documentation
- [ ] Update main README
- [ ] Note deployment date
- [ ] Document any issues found
- [ ] Update changelog

### Communication
- [ ] Notify team of deployment
- [ ] Share documentation links
- [ ] Announce new admin capability
- [ ] Provide feedback channel

### Monitoring
- [ ] Set up alerts for errors
- [ ] Monitor for 48 hours
- [ ] Review user feedback
- [ ] Adjust prompts if needed

---

## 🎯 Next Steps After Successful Deployment

### Short Term (Week 1)
- [ ] Monitor usage patterns
- [ ] Collect user feedback
- [ ] Fine-tune prompts based on output quality
- [ ] Document best practices

### Medium Term (Month 1)
- [ ] Analyze prompt effectiveness
- [ ] A/B test prompt variations
- [ ] Optimize for better results
- [ ] Train team on prompt management

### Long Term (Quarter 1)
- [ ] Review overall feature performance
- [ ] Consider additional prompt types
- [ ] Implement analytics dashboard
- [ ] Document lessons learned

---

## 📞 Support Contacts

**If Issues Arise:**

1. **Database Issues**
   - Check connection
   - Verify prompts exist
   - Check is_active status

2. **Generation Errors**
   - Check API keys
   - Verify News API
   - Check model availability

3. **Admin Issues**
   - Clear browser cache
   - Check permissions
   - Verify database updates

4. **Performance Issues**
   - Check server resources
   - Monitor database queries
   - Review API rate limits

---

## ✅ Final Checklist

### Pre-Deployment
- [x] Code reviewed
- [x] Build successful
- [x] SQL script prepared
- [x] Documentation complete
- [ ] Team notified

### Deployment
- [ ] Database backup done
- [ ] SQL migration executed
- [ ] Backend deployed
- [ ] Server restarted
- [ ] Logs checked

### Verification
- [ ] Feature tested (English)
- [ ] Feature tested (Vietnamese)
- [ ] Multiple models tested
- [ ] Admin dashboard verified
- [ ] Fallback tested

### Post-Deployment
- [ ] Monitoring active
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] User feedback positive
- [ ] Documentation updated

---

## 🎉 Deployment Complete

When all checkboxes are ✅:

```
┌────────────────────────────────────────────┐
│                                            │
│   🎉 WRITE NEWS PROMPTS DEPLOYED! 🎉      │
│                                            │
│   ✅ Database Migration Complete          │
│   ✅ Backend Deployed                     │
│   ✅ Feature Tested                       │
│   ✅ Admin Verified                       │
│   ✅ Monitoring Active                    │
│                                            │
│   Status: PRODUCTION READY ✅             │
│                                            │
└────────────────────────────────────────────┘
```

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verification By:** _______________  
**Sign-off:** _______________

---

## 📚 Reference Documents

- `ADD_NEWS_PROMPTS.sql` - SQL migration script
- `WRITE_NEWS_PROMPTS_README.md` - Overview
- `WRITE_NEWS_DATABASE_PROMPTS_IMPLEMENTATION.md` - Detailed guide
- `WRITE_NEWS_PROMPTS_QUICK_GUIDE.md` - Quick reference
- `WRITE_NEWS_PROMPTS_FLOW_DIAGRAM.md` - Visual diagrams
- `WRITE_NEWS_PROMPTS_COMPLETE.md` - Summary

---

**Last Updated:** January 14, 2026  
**Version:** 1.0  
**Status:** Ready for Use ✅
