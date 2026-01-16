# 🚀 Quick Deploy: Toplist Adaptive Paragraphs

## What Changed
✅ AI Outline: Always 2 paragraphs per item  
✅ No Outline: Variable paragraphs (2/3/5) based on length  
✅ Continuation logic updated to match initial generation

## Deploy Steps

### 1. Build (Already Done ✅)
```bash
npm run build
# ✓ Client: 105.27 kB CSS, 956.37 kB JS
# ✓ Server: 276.74 kB (dist/server/node-build.mjs)
```

### 2. Upload to Production
```bash
scp dist/server/node-build.mjs user@production:/path/to/volxai/server/
```

### 3. Restart Server
```bash
# SSH into production
ssh user@production

# Restart Node.js
pm2 restart volxai-server
# Or:
systemctl restart volxai
```

## Test After Deploy

### Test 1: AI Outline + Medium
1. Create new toplist article
2. Set: Medium length, 10 items
3. Use AI Outline (auto-toplist)
4. **Expected**: Each item has exactly 2 paragraphs

### Test 2: No Outline + Medium  
1. Create new toplist article
2. Set: Medium length, 10 items
3. Do NOT use AI Outline
4. **Expected**: Each item has exactly 3 paragraphs

### Console Check
Look for this log:
```
📋 Toplist config: medium length, auto-toplist outline → 2 paragraphs per item
```

## Rollback (If Needed)
```bash
# Keep backup of previous build
cp node-build.mjs node-build.mjs.backup

# If issues, restore:
mv node-build.mjs.backup node-build.mjs
pm2 restart volxai-server
```

## Files Changed
- ✅ `server/routes/ai.ts` - Updated toplist generation logic

## No Changes Needed
- ❌ Database migrations
- ❌ Environment variables
- ❌ Client code
- ❌ AI prompts in database

---

**Ready**: ✅ Build successful  
**Next**: Upload + Restart + Test
