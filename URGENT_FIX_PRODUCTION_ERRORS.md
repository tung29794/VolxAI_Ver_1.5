# 🚨 URGENT: Fix Production Errors

## ❌ Current Issues

Backend đang crash với 2 lỗi:

1. **Missing column:** `tokens_remaining` không tồn tại trong table `users`
2. **SQL syntax error:** `YEAR_MONTH()` không support trong MariaDB

---

## ✅ Solution: Chạy 2 SQL Scripts

### Script 1: Fix tokens_remaining column
**File:** `FIX_TOKENS_REMAINING_COLUMN.sql`

```sql
ALTER TABLE users 
ADD COLUMN tokens_remaining INT DEFAULT NULL 
AFTER email;

UPDATE users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.is_active = 1
SET u.tokens_remaining = COALESCE(us.tokens_limit, 0)
WHERE u.tokens_remaining IS NULL;
```

### Script 2: Create ai_prompts table
**File:** `CREATE_AI_PROMPTS_TABLE.sql` (đã có sẵn)

---

## 📋 Steps to Fix (VIA cPANEL)

### 1. Login cPanel phpMyAdmin
- URL: https://ghf57-22175.azdigihost.com:2083
- Database: `jybcaorr_lisacontentdbapi`

### 2. Run Script 1 - Fix tokens_remaining
1. Click tab **SQL**
2. Copy script từ `FIX_TOKENS_REMAINING_COLUMN.sql`
3. Paste vào editor
4. Click **Go**
5. Should see success message

**Verify:**
```sql
DESCRIBE users;
-- Should show tokens_remaining column
```

### 3. Run Script 2 - Create ai_prompts
1. Stay in SQL tab
2. Copy toàn bộ `CREATE_AI_PROMPTS_TABLE.sql`
3. Paste vào editor
4. Click **Go**
5. Should create table + insert 7 records

**Verify:**
```sql
SELECT COUNT(*) FROM ai_prompts;
-- Should return 7
```

### 4. Restart Backend
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com \
  "cd /home/jybcaorr/api.volxai.com && touch tmp/restart.txt"
```

### 5. Test
1. Refresh admin page
2. Should load without errors
3. Click **AI Prompts** menu
4. Should see 7 prompts

---

## 🔍 Why This Happened

**tokens_remaining:**
- Added in previous session to fix token balance bug
- Migration SQL was created but **never executed** on production
- Backend code expects this column → crashes when not found

**YEAR_MONTH():**
- MySQL function not available in MariaDB
- Affects statistics page only
- Can ignore for now, focus on AI Prompts feature

---

## ⚡ Quick Fix (If can't access cPanel)

SSH method:

```bash
# 1. Upload SQL files
scp -P 2210 FIX_TOKENS_REMAINING_COLUMN.sql \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/

scp -P 2210 CREATE_AI_PROMPTS_TABLE.sql \
  jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/

# 2. Connect to server
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com

# 3. Run scripts
mysql -h 103.221.221.67 -P 3306 \
  -u jybcaorr_lisaaccountcontentapi \
  -p jybcaorr_lisacontentdbapi \
  < FIX_TOKENS_REMAINING_COLUMN.sql

mysql -h 103.221.221.67 -P 3306 \
  -u jybcaorr_lisaaccountcontentapi \
  -p jybcaorr_lisacontentdbapi \
  < CREATE_AI_PROMPTS_TABLE.sql

# 4. Restart
cd /home/jybcaorr/api.volxai.com
touch tmp/restart.txt
```

---

## ✅ After Fix

Expected results:
- ✅ No more console errors
- ✅ Admin Dashboard loads properly
- ✅ AI Prompts menu shows 7 prompts
- ✅ Can edit prompts
- ✅ Write More uses database prompts

---

**Priority:** 🔴 CRITICAL - Must fix to restore functionality  
**Time Needed:** 2-5 minutes  
**Risk:** Low (just adding missing column + table)
