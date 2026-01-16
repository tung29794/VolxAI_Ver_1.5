# Token Tracking System - Implementation Summary

## 📦 Files Created

### ✅ Frontend
1. `client/components/TokenUpgradeModal.tsx` - Modal hiển thị khi hết token
2. `client/lib/tokenUtils.ts` - Utilities để estimate và format tokens

### ✅ Backend
1. `server/lib/tokenManager.ts` - Token management functions
2. `CREATE_TOKEN_USAGE_LOGS_TABLE.sql` - Database migration

### ✅ Documentation
1. `TOKEN_TRACKING_IMPLEMENTATION_GUIDE.md` - Hướng dẫn chi tiết

## 🎯 Token Costs

| Feature | Tokens | Notes |
|---------|--------|-------|
| AI Rewrite (Short) | 500 | < 100 words |
| AI Rewrite (Medium) | 1,000 | 100-300 words |
| AI Rewrite (Long) | 2,000 | > 300 words |
| Generate SEO Title | 300 | Fixed |
| Generate Meta Desc | 400 | Fixed |
| Write More | 1,500 | Fixed |
| Find Image | 100 | Per search |

## 🔧 Next Steps to Complete

### 1. Run Database Migration
```bash
# Connect to production database
mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi

# Then run:
CREATE TABLE IF NOT EXISTS token_usage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tokens_used INT NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_feature_name (feature_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Update Backend AI Routes

Thêm vào đầu file `server/routes/ai.ts`:
```typescript
import {
  checkTokensMiddleware,
  deductTokens,
  estimateRewriteTokens,
  calculateActualTokens,
  TOKEN_COSTS,
} from "../lib/tokenManager";
```

Update mỗi AI handler theo pattern:
```typescript
const handleFeature: RequestHandler = async (req, res) => {
  if (!(await verifyUser(req, res))) return;
  const userId = (req as any).userId;
  
  // 1. Estimate tokens
  const estimatedTokens = TOKEN_COSTS.FEATURE_NAME;
  
  // 2. Check tokens
  const tokenCheck = await checkTokensMiddleware(userId, estimatedTokens, "FEATURE_NAME");
  if (!tokenCheck.allowed) {
    return res.status(402).json({
      success: false,
      error: "Insufficient tokens",
      requiredTokens: estimatedTokens,
      remainingTokens: tokenCheck.remainingTokens,
      featureName: "Feature Display Name",
    });
  }
  
  // 3. Call AI API (existing code)
  
  // 4. Deduct tokens
  await deductTokens(userId, estimatedTokens, "FEATURE_NAME");
  
  // 5. Return with token info
  res.json({ ...data, tokensUsed: estimatedTokens });
};
```

### 3. Update Frontend ArticleEditor

Add to `client/pages/ArticleEditor.tsx`:

```typescript
import { TokenUpgradeModal } from "@/components/TokenUpgradeModal";

// Add state
const [showTokenModal, setShowTokenModal] = useState(false);
const [tokenModalData, setTokenModalData] = useState({
  remainingTokens: 0,
  requiredTokens: 0,
  featureName: "",
});

// Update each AI function to handle 402 response
const handleAIFeature = async () => {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 402) {
      const error = await response.json();
      setTokenModalData({
        remainingTokens: error.remainingTokens || 0,
        requiredTokens: error.requiredTokens || 0,
        featureName: error.featureName || "AI Feature",
      });
      setShowTokenModal(true);
      return;
    }
    
    // ... rest of code
  } catch (error) {
    // ... error handling
  }
};

// Add modal at end of return
<TokenUpgradeModal
  isOpen={showTokenModal}
  onClose={() => setShowTokenModal(false)}
  {...tokenModalData}
/>
```

## 📝 AI Endpoints to Update

1. `/api/ai/rewrite` - handleRewrite
2. `/api/ai/generate-seo-title` - handleGenerateSeoTitle  
3. `/api/ai/generate-meta-description` - handleGenerateMetaDescription
4. `/api/ai/write-more` - handleWriteMore
5. `/api/ai/find-image` - handleFindImage

## 🚀 Quick Deploy After Updates

```bash
# Build & Deploy
npm run build
scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --exclude='.htaccess'
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

## ✅ Testing

Test cases:
- User with enough tokens → Feature works, tokens deducted
- User with insufficient tokens → Modal shows, feature blocked
- User with 0 tokens → Modal shows immediately

## 📊 Monitor Token Usage

```sql
-- View token usage by feature
SELECT feature_name, SUM(tokens_used), COUNT(*) 
FROM token_usage_logs 
GROUP BY feature_name;

-- View user token balance
SELECT username, tokens_remaining 
FROM users 
ORDER BY tokens_remaining ASC 
LIMIT 10;
```

---

Bạn muốn tôi:
1. ✅ Update trực tiếp vào code ngay bây giờ?
2. ⏸️ Review implementation trước?
3. 📝 Tạo thêm documentation?

Hãy cho tôi biết để tôi tiếp tục!
