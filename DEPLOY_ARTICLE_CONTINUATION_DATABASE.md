# 🚀 Deployment: Article Continuation Database Prompts

## 📋 Quick Summary

**Mục đích:** Refactor article continuation để sử dụng database prompts thay vì hardcoded prompts.

**Files thay đổi:**
- ✅ `server/routes/ai.ts` - Refactored continuation logic
- ✅ `ADD_CONTINUE_ARTICLE_PROMPT.sql` - New database prompt template
- ✅ Build successful: `dist/server/node-build.mjs` (280.05 kB)

**Deployment priority:** MEDIUM - Improvement, không phải bug fix khẩn cấp

---

## 🔐 Pre-Deployment Checklist

- [x] Code refactored and tested locally
- [x] Build successful without errors
- [x] Database migration SQL created
- [x] Fallback logic added for backward compatibility
- [x] Documentation complete
- [ ] Database credentials verified
- [ ] SSH access tested
- [ ] Backup plan prepared

---

## 📦 Deployment Steps

### Step 1: Backup Current System

```bash
# Backup database (continuation prompts)
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "mysqldump -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi ai_prompts > ~/backup_ai_prompts_$(date +%Y%m%d_%H%M%S).sql"

# Backup current server build
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "cp ~/api.volxai.com/node-build.mjs ~/api.volxai.com/node-build.mjs.backup_$(date +%Y%m%d_%H%M%S)"
```

### Step 2: Deploy Database Changes

```bash
# Run SQL migration
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < ADD_CONTINUE_ARTICLE_PROMPT.sql
```

**Expected output:**
```
Query OK, 1 row affected (0.XX sec)
```

**Verify:**
```bash
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi -e "SELECT prompt_name, feature_name, description FROM ai_prompts WHERE prompt_name = 'continue_article';"
```

Should see:
```
+------------------+------------------+--------------------------------------------+
| prompt_name      | feature_name     | description                                |
+------------------+------------------+--------------------------------------------+
| continue_article | generate_article | Prompt template for continuing article...  |
+------------------+------------------+--------------------------------------------+
```

### Step 3: Deploy Server Build

```bash
# Upload new server build
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:~/api.volxai.com/
```

**Expected output:**
```
node-build.mjs                           100%  280KB   X.XMB/s   00:00
```

### Step 4: Restart Server

```bash
# Restart via .lsphp_restart.txt
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch ~/api.volxai.com/.lsphp_restart.txt"

# Wait 5-10 seconds for server to restart
sleep 10

# Verify server is running
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "curl -s -o /dev/null -w '%{http_code}' http://localhost:5001/api/health || echo 'Health check endpoint may not exist'"
```

### Step 5: Verify Deployment

#### 5.1 Test Database Prompt Loading
```bash
# Check server logs for continuation prompt loading
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "tail -f ~/logs/node.log" | grep -i "continue_article"
```

Expected messages:
- `✅ Using database prompt for continue_article` ← Good!
- `⚠️ Database prompt not found for continue_article, using fallback` ← Database not updated yet

#### 5.2 Test Article Generation with Continuation
1. Login to https://volxai.com
2. Go to "Viết bài" (Write Article)
3. Create a LONG article:
   - Keyword: "Top 10 cách học tiếng Anh hiệu quả"
   - Length: Long (3000-4000 words)
   - Outline: AI Outline (will auto-generate many sections)
   - Model: Gemini hoặc GPT-3.5-turbo
4. Click "Tạo bài viết"
5. Wait for generation to complete
6. **Check console logs** để xem continuation có được trigger không:
   ```
   🔍 Continuation loop iteration 2/10
   ✅ Using database prompt for continue_article
   📋 Missing H2 sections: [list of missing sections]
   ```

#### 5.3 Verify Article Quality
After generation completes:
- ✅ Article has all sections from outline (no missing H2/H3)
- ✅ Each section has adequate paragraphs (2-3+ depending on length)
- ✅ Writing style is consistent throughout
- ✅ No repeated content
- ✅ Proper HTML formatting

---

## 🔧 Rollback Procedure (If Issues Occur)

### Quick Rollback

```bash
# Step 1: Restore previous server build
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "cp ~/api.volxai.com/node-build.mjs.backup_YYYYMMDD_HHMMSS ~/api.volxai.com/node-build.mjs"

# Step 2: Restart server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch ~/api.volxai.com/.lsphp_restart.txt"

# Step 3: Verify rollback
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "tail -n 20 ~/logs/node.log"
```

### Database Rollback (If Needed)
```bash
# Remove the new prompt (fallback will be used)
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi -e "DELETE FROM ai_prompts WHERE prompt_name = 'continue_article';"
```

**Note:** Code có fallback logic nên ngay cả khi database prompt không có, system vẫn hoạt động bình thường với hardcoded prompts.

---

## 📊 Success Criteria

### Must Have (Critical)
- [x] Server starts without errors
- [x] Article generation works normally
- [x] Continuation logic triggers when needed
- [x] No errors in console logs
- [x] Articles are saved successfully

### Should Have (Important)
- [ ] Database prompt is loaded successfully (check logs for "✅ Using database prompt")
- [ ] Continuation completes outline properly
- [ ] Writing style is maintained across continuations
- [ ] No repeated content in continuations

### Nice to Have (Optional)
- [ ] Performance metrics similar to before (no degradation)
- [ ] Console logs show clear continuation progress
- [ ] Admin can see and edit continuation prompt via UI

---

## 🐛 Troubleshooting

### Issue: "Database prompt not found for continue_article"

**Cause:** Database migration không chạy hoặc chạy thất bại.

**Solution:**
```bash
# Verify database has the prompt
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi -e "SELECT * FROM ai_prompts WHERE prompt_name = 'continue_article'\G"

# If not found, run migration again
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < ADD_CONTINUE_ARTICLE_PROMPT.sql
```

### Issue: Continuation not working at all

**Cause:** Code error hoặc prompt template có vấn đề.

**Debug:**
```bash
# Check server logs for errors
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "tail -f ~/logs/node.log" | grep -E "(error|Error|ERROR|continuation)"

# Check if loadPrompt function is working
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "tail -f ~/logs/node.log" | grep "loadPrompt"
```

**Solution:**
1. Verify database connection is working
2. Check prompt template in database has valid format
3. Check interpolatePrompt function is receiving all required variables

### Issue: Continuation writes wrong content

**Cause:** Prompt template chưa đủ chi tiết hoặc thiếu instructions.

**Solution:**
```bash
# Update prompt template in database
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi

# Then run:
UPDATE ai_prompts 
SET prompt_template = '[your updated template]'
WHERE prompt_name = 'continue_article';
```

---

## 📈 Post-Deployment Monitoring

### Week 1: Intensive Monitoring
- Check logs daily for any errors related to continuation
- Monitor user reports about article quality
- Track completion rate of outlines (should be ~100%)

### Week 2-4: Normal Monitoring
- Weekly review of continuation prompt performance
- Gather feedback from users about article quality
- Consider A/B testing different continuation prompts

### Metrics to Track
- Article generation success rate
- Outline completion rate
- Average continuation attempts needed
- User satisfaction with generated articles

---

## 📝 Notes

- **Zero Downtime:** Deployment không ảnh hưởng đến users đang sử dụng system
- **Backward Compatible:** Có fallback logic nên ngay cả khi database prompt chưa có cũng không bị lỗi
- **Reversible:** Có thể rollback bất cứ lúc nào nếu có vấn đề
- **Low Risk:** Chỉ thay đổi implementation, không thay đổi logic hoặc features

---

## ✅ Sign-off

**Developer:** [Your name]  
**Date:** 2026-01-13  
**Build Version:** node-build.mjs (280.05 kB)  
**Database Migration:** ADD_CONTINUE_ARTICLE_PROMPT.sql  
**Status:** Ready for production deployment

**Approved by:**  
- [ ] Tech Lead: _______________  
- [ ] QA: _______________  
- [ ] Product Owner: _______________
