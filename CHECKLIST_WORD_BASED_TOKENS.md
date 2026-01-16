# ✅ DEPLOYMENT CHECKLIST - Word-Based Token Calculation

## 📋 Pre-Deployment

### Code Review
- [x] Code written and reviewed
- [x] Build successful (no errors)
- [x] TypeScript compilation passed
- [x] All imports resolved

### Documentation
- [x] Technical docs complete
- [x] Deployment guide ready
- [x] Confirmation document written
- [x] Visual diagrams created

### Files Ready
- [x] `server/lib/tokenCalculator.ts` created
- [x] `server/routes/ai.ts` updated
- [x] `ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql` ready
- [x] `UPDATE_TOKEN_COSTS_TO_WORD_BASED.sql` ready

---

## 🗄️ Database Migration

### Backup (CRITICAL!)
- [ ] Backup database before migration
  ```bash
  mysqldump -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

### Run Migration 1
- [ ] Connect to MySQL
  ```bash
  mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p
  ```

- [ ] Select database
  ```sql
  USE jybcaorr_lisacontentdbapi;
  ```

- [ ] Check current state
  ```sql
  SELECT feature_key, token_cost FROM ai_feature_token_costs LIMIT 5;
  -- Should show large values like 15000
  ```

- [ ] Run main migration
  ```bash
  SOURCE /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5/ADD_TOKEN_COSTS_AND_ARTICLE_TRACKING.sql;
  ```

- [ ] Verify tables created
  ```sql
  SHOW TABLES LIKE 'ai_feature_token_costs';
  DESC articles;  -- Check for word_count, tokens_used columns
  ```

### Run Migration 2
- [ ] Update token costs
  ```bash
  SOURCE /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5/UPDATE_TOKEN_COSTS_TO_WORD_BASED.sql;
  ```

- [ ] Verify token costs
  ```sql
  SELECT feature_key, feature_name, token_cost, description 
  FROM ai_feature_token_costs 
  ORDER BY token_cost DESC;
  ```

  **Expected results**:
  ```
  generate_news: 20
  generate_toplist: 18
  generate_article: 15
  ai_rewrite_text: 10
  write_more: 8
  continue_article: 5
  ```

---

## 💻 Code Deployment

### Deploy
- [ ] Restart server
  ```bash
  pm2 restart volxai-server
  ```

### Verify Logs
- [ ] Check startup logs
  ```bash
  pm2 logs volxai-server --lines 50
  ```

---

## 🧪 Testing

### Test 1: Generate Article
- [ ] Create article and verify word_count > 0

### Test 2: AI Rewrite
- [ ] Use AI Rewrite and check token deduction

### Test 3: Write More
- [ ] Use Write More and verify logs

---

## 📊 Success Criteria

- [ ] word_count populated in new articles
- [ ] tokens_used matches formula
- [ ] Logs show "📊 Token Calculation"

---

**Status**: Ready for deployment
