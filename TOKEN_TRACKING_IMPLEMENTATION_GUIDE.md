# Token Tracking Implementation Guide

## Overview
Đã implement hệ thống token tracking toàn diện để quản lý việc sử dụng AI features và trừ token từ tài khoản người dùng.

## Components Created

### 1. Frontend Components & Utilities

#### A. TokenUpgradeModal (`client/components/TokenUpgradeModal.tsx`)
Modal hiển thị khi user hết token hoặc không đủ token:
- Hiển thị số token hiện tại
- Hiển thị số token cần thiết
- Hiển thị số token thiếu
- Button "Nâng cấp ngay" → redirect to /upgrade
- Button "Để sau" → close modal

#### B. Token Utils (`client/lib/tokenUtils.ts`)
Utilities để estimate và format tokens:
- `TOKEN_COSTS`: Object chứa giá token cho từng feature
- `estimateRewriteTokens()`: Estimate tokens cho rewrite dựa vào độ dài text
- `estimateArticleTokens()`: Estimate tokens cho việc viết bài
- `getFeatureTokenCost()`: Lấy token cost cho một feature cụ thể
- `hasEnoughTokens()`: Check xem có đủ token không
- `calculateActualTokens()`: Tính actual tokens từ OpenAI response
- `formatTokenCount()`: Format số token để hiển thị (1K, 1M, etc.)
- `FEATURE_NAMES`: Mapping tên feature để hiển thị

### 2. Backend Components

#### A. Token Manager (`server/lib/tokenManager.ts`)
Backend utilities để manage tokens:
- `getUserTokenBalance()`: Lấy số dư token của user
- `hasEnoughTokens()`: Check có đủ token không
- `deductTokens()`: Trừ token từ account và log usage
- `logTokenUsage()`: Ghi log vào database
- `estimateRewriteTokens()`: Estimate tokens (giống frontend)
- `calculateActualTokens()`: Tính actual tokens
- `checkTokensMiddleware()`: Middleware để check token trước khi call API

#### B. Database Migration (`CREATE_TOKEN_USAGE_LOGS_TABLE.sql`)
Table để track token usage:
```sql
CREATE TABLE token_usage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tokens_used INT NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Indexes for performance
  -- Foreign key to users table
);
```

## Token Cost Structure

| Feature | Cost (Tokens) | Notes |
|---------|---------------|-------|
| AI Rewrite (Short < 100 words) | 500 | Base cost |
| AI Rewrite (Medium 100-300 words) | 1,000 | Base cost |
| AI Rewrite (Long > 300 words) | 2,000 | Base cost |
| AI Rewrite (Expanding styles) | +50% | longer, creative, professional |
| Generate SEO Title | 300 | Fixed cost |
| Generate Meta Description | 400 | Fixed cost |
| Write More | 1,500 | Fixed cost |
| Find Image | 100 | Per search |
| Write Article (Short < 500 words) | 5,000 | Base cost |
| Write Article (Medium 500-1500) | 10,000 | Base cost |
| Write Article (Long > 1500) | 20,000 | Base cost |

## Implementation Steps

### Step 1: Update AI Routes (server/routes/ai.ts)

For EACH AI endpoint, add token checking:

```typescript
import {
  checkTokensMiddleware,
  deductTokens,
  estimateRewriteTokens,
  calculateActualTokens,
  TOKEN_COSTS
} from "../lib/tokenManager";

// Example for handleRewrite
const handleRewrite: RequestHandler = async (req, res) => {
  try {
    // Verify user first
    if (!(await verifyUser(req, res))) return;
    const userId = (req as any).userId;

    const { text, style, language = "en" } = req.body;

    // STEP 1: Estimate tokens required
    const estimatedTokens = estimateRewriteTokens(text, style);

    // STEP 2: Check if user has enough tokens
    const tokenCheck = await checkTokensMiddleware(
      userId,
      estimatedTokens,
      "AI_REWRITE"
    );

    if (!tokenCheck.allowed) {
      return res.status(402).json({
        success: false,
        error: "Insufficient tokens",
        requiredTokens: estimatedTokens,
        remainingTokens: tokenCheck.remainingTokens,
        featureName: "AI Rewrite",
      });
    }

    // STEP 3: Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      // ... existing code
    });

    const data = await response.json();

    // STEP 4: Calculate actual tokens used
    const actualTokens = calculateActualTokens(data);
    const tokensToDeduct = actualTokens > 0 ? actualTokens : estimatedTokens;

    // STEP 5: Deduct tokens
    await deductTokens(userId, tokensToDeduct, "AI_REWRITE");

    // STEP 6: Return response with token info
    res.json({
      rewrittenText: data.choices[0]?.message?.content?.trim(),
      tokensUsed: tokensToDeduct,
      remainingTokens: tokenCheck.remainingTokens - tokensToDeduct,
    });
  } catch (error) {
    // ... error handling
  }
};
```

### Step 2: Update Frontend AI Calls (client/pages/ArticleEditor.tsx)

For EACH AI feature call, add token checking:

```typescript
import { TokenUpgradeModal } from "@/components/TokenUpgradeModal";
import { getFeatureTokenCost, FEATURE_NAMES } from "@/lib/tokenUtils";
import { useAuth } from "@/contexts/AuthContext";

// Add state
const [showTokenModal, setShowTokenModal] = useState(false);
const [tokenModalData, setTokenModalData] = useState({
  remainingTokens: 0,
  requiredTokens: 0,
  featureName: "",
});

// Example: handleRewriteText
const handleRewriteText = async (style: RewriteStyle) => {
  if (!selectedText || !quillRef.current) return;

  setIsRewriting(true);

  try {
    const response = await fetch(buildApiUrl("/api/ai/rewrite"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({
        text: selectedText,
        style: style,
        language: language,
      }),
    });

    // Check if insufficient tokens (402 Payment Required)
    if (response.status === 402) {
      const error = await response.json();
      setTokenModalData({
        remainingTokens: error.remainingTokens || 0,
        requiredTokens: error.requiredTokens || 0,
        featureName: error.featureName || "AI Rewrite",
      });
      setShowTokenModal(true);
      setIsRewriting(false);
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to rewrite text");
    }

    const data = await response.json();

    // Replace selected text
    const editor = quillRef.current.getEditor();
    const selection = editor.getSelection();
    if (selection) {
      editor.deleteText(selection.index, selection.length);
      editor.insertText(selection.index, data.rewrittenText);
    }

    // Show success with tokens used
    toast.success(
      `Đã rewrite! Tokens used: ${data.tokensUsed}. Remaining: ${data.remainingTokens}`
    );

    setIsRewriteModalOpen(false);
    setSelectedText("");
  } catch (error) {
    console.error("Error rewriting text:", error);
    toast.error("Không thể rewrite văn bản");
  } finally {
    setIsRewriting(false);
  }
};

// Add TokenUpgradeModal at end of component
return (
  <>
    {/* ... existing JSX ... */}
    
    {/* Token Upgrade Modal */}
    <TokenUpgradeModal
      isOpen={showTokenModal}
      onClose={() => setShowTokenModal(false)}
      remainingTokens={tokenModalData.remainingTokens}
      requiredTokens={tokenModalData.requiredTokens}
      featureName={tokenModalData.featureName}
    />
  </>
);
```

## Features to Update

### Priority 1 - High Usage Features
1. ✅ AI Rewrite (handleRewrite)
2. ✅ Generate SEO Title (handleGenerateSeoTitle)
3. ✅ Generate Meta Description (handleGenerateMetaDescription)
4. ✅ Write More (handleWriteMore)
5. ✅ Find Image (handleFindImage)

### Priority 2 - Article Generation
6. Write by Keyword (existing write endpoints)
7. Batch Writing
8. Auto Blog

## Testing Checklist

### Backend Testing
- [ ] Run SQL migration to create token_usage_logs table
- [ ] Test getUserTokenBalance() function
- [ ] Test deductTokens() function
- [ ] Test checkTokensMiddleware() for user with enough tokens
- [ ] Test checkTokensMiddleware() for user with insufficient tokens
- [ ] Verify tokens are logged to token_usage_logs table

### Frontend Testing
- [ ] Test TokenUpgradeModal displays correctly
- [ ] Test modal shows correct token amounts
- [ ] Test "Nâng cấp ngay" button navigates to /upgrade
- [ ] Test "Để sau" button closes modal

### Integration Testing
1. **User with sufficient tokens:**
   - [ ] AI Rewrite works and deducts tokens
   - [ ] Generate SEO Title works and deducts tokens
   - [ ] Generate Meta Desc works and deducts tokens
   - [ ] Write More works and deducts tokens
   - [ ] Find Image works and deducts tokens

2. **User with insufficient tokens:**
   - [ ] AI Rewrite shows TokenUpgradeModal
   - [ ] Generate SEO Title shows TokenUpgradeModal
   - [ ] Generate Meta Desc shows TokenUpgradeModal
   - [ ] Write More shows TokenUpgradeModal
   - [ ] Find Image shows TokenUpgradeModal
   - [ ] Modal shows correct remaining and required tokens

3. **User with 0 tokens:**
   - [ ] All AI features show TokenUpgradeModal immediately
   - [ ] Modal shows "Không đủ Token" message

## Deployment Steps

1. **Database Migration**
   ```bash
   # Run on production database
   mysql -h 103.221.221.67 -u jybcaorr_lisaaccountcontentapi -p jybcaorr_lisacontentdbapi < CREATE_TOKEN_USAGE_LOGS_TABLE.sql
   ```

2. **Backend Deployment**
   ```bash
   npm run build:server
   scp -P 2210 dist/server/node-build.mjs jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/api.volxai.com/
   ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
   ```

3. **Frontend Deployment**
   ```bash
   npm run build:client
   rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --exclude='.htaccess'
   ```

## Monitoring & Analytics

Track token usage with queries:

```sql
-- Total tokens used by feature
SELECT feature_name, SUM(tokens_used) as total_tokens, COUNT(*) as usage_count
FROM token_usage_logs
GROUP BY feature_name
ORDER BY total_tokens DESC;

-- Top users by token consumption
SELECT u.username, SUM(tl.tokens_used) as total_tokens
FROM token_usage_logs tl
JOIN users u ON tl.user_id = u.id
GROUP BY tl.user_id
ORDER BY total_tokens DESC
LIMIT 10;

-- Daily token usage
SELECT DATE(created_at) as date, SUM(tokens_used) as total_tokens
FROM token_usage_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Next Steps

1. Update all AI endpoints in server/routes/ai.ts
2. Update all AI feature calls in ArticleEditor.tsx
3. Run database migration
4. Test thoroughly
5. Deploy to production
6. Monitor token usage and user feedback

## Notes

- Token costs are estimates and may need adjustment based on actual usage
- OpenAI returns actual token usage in API response - use when available
- Always fallback to estimates if actual usage not available
- Log all token usage for analytics and billing
- Consider adding admin panel to view token usage statistics
