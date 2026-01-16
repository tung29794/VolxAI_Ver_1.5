# Quy Trình Tạo và Lưu Bài Khi Sử Dụng "Viết Bài Hàng Loạt"

## 📊 Sơ Đồ Tổng Quan

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Frontend)                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. User mở BatchWriteByKeywords modal                            │
│ 2. Nhập keywords, chọn model, settings                           │
│ 3. Click "Tạo X bài viết" → POST /api/batch-jobs               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND API LAYER (Express Routes)                  │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/batch-jobs                                            │
│ • Validate user token                                            │
│ • Snapshot user tokens & article limit                           │
│ • Create batch_jobs record with status='pending'                │
│ • Return jobId to frontend                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│           BACKGROUND BATCH WORKER (5s interval polling)         │
├─────────────────────────────────────────────────────────────────┤
│ processBatchJobs() - Chạy mỗi 5 giây                           │
│ 1. Query pending jobs                                            │
│ 2. Process tối đa 5 jobs đồng thời (1 per user)                │
│ 3. Gọi processJob() cho từng job                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│         ARTICLE GENERATION SERVICE (Per Keyword Loop)            │
├─────────────────────────────────────────────────────────────────┤
│ For each keyword in batch:                                       │
│ 1. Check user tokens (pause if insufficient)                    │
│ 2. Check article limit (pause if reached)                       │
│ 3. Call generateCompleteArticle()                               │
│ 4. Save article to database                                      │
│ 5. Update batch_jobs progress                                    │
│ 6. Update user tokens_remaining                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│         AI METADATA GENERATION (Dynamic Model Selection)         │
├─────────────────────────────────────────────────────────────────┤
│ For each article created:                                        │
│ • title: from AI (using selected model)                         │
│ • meta_title: from AI (using selected model) ✅ FIXED           │
│ • meta_description: from AI (using selected model) ✅ FIXED     │
│ • slug: generated from title                                     │
│ • status: set to 'draft'                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 CHI TIẾT TỪNG BƯỚC

### PHASE 1: Frontend - User Creates Batch Job

**File:** `client/components/BatchWriteByKeywords.tsx`

```
Bước 1: User mở modal "Viết Bài Hàng Loạt"
├─ Input keywords (multi-line textarea)
├─ Select model (GPT-4o-mini, GPT-4, Gemini, v.v.)
├─ Select language (vi, en, etc.)
├─ Select tone (professional, casual, creative)
├─ Select length (short, medium, long)
├─ Choose outline option (no-outline, AI outline)
├─ Toggle auto insert images + max count
└─ Select website (optional)

Bước 2: Click "Tạo X bài viết"
├─ Validate keywords not empty
├─ Parse keywords (split by newline + comma)
├─ Count total articles
├─ Show warning if > 10 articles
└─ Submit to backend

Bước 3: POST /api/batch-jobs
└─ Body: {
     keywords: ["keyword1", "keyword2", ...],
     settings: {
       model: "GPT-4o-mini",
       language: "vi",
       tone: "professional",
       length: "short",
       outlineOption: "no-outline",
       customOutline: null,
       autoInsertImages: true,
       maxImages: 5,
       websiteId: null,
       useGoogleSearch: false
     }
   }
```

**User Experience:**
- Thấy toast: "Đã tạo batch job với X bài viết..."
- Auto navigate to `/account?tab=batch-jobs`
- Thấy job progress trong tab "Batch Jobs"
- Status badge: "Đang xử lý..." (processing)
- Progress bar: "0/X articles"

---

### PHASE 2: Backend API - Create Batch Job Record

**File:** `server/routes/batchJobs.ts`

```typescript
POST /api/batch-jobs
├─ Authenticate user (JWT token)
├─ Validate request body
├─ Create batch_jobs record:
│  ├─ user_id: from JWT token
│  ├─ job_type: 'batch_keywords'
│  ├─ status: 'pending'
│  ├─ total_items: keywords.length
│  ├─ completed_items: 0
│  ├─ failed_items: 0
│  ├─ job_data: JSON.stringify(jobData)
│  ├─ current_item_index: 0
│  ├─ tokens_at_start: user.tokens_remaining (snapshot)
│  ├─ articles_limit_at_start: user.article_limit (snapshot)
│  ├─ created_at: NOW()
│  └─ updated_at: NOW()
├─ Return: { jobId, status: 'pending' }
└─ Response time: < 100ms
```

**Database Record:**
```sql
INSERT INTO batch_jobs (
  user_id,
  job_type,
  status,
  total_items,
  completed_items,
  failed_items,
  job_data,
  article_ids,
  current_item_index,
  tokens_at_start,
  tokens_used,
  articles_limit_at_start,
  error_message,
  created_at,
  updated_at
) VALUES (
  5,
  'batch_keywords',
  'pending',
  5,
  0,
  0,
  '{"keywords":["..."],"settings":{...}}',
  NULL,
  0,
  10000,
  0,
  100,
  NULL,
  NOW(),
  NOW()
)
```

---

### PHASE 3: Background Worker - Batch Job Processing Loop

**File:** `server/workers/batchJobProcessor.ts`

**Worker Start:** Server initialization
```typescript
// server/index.ts
startBatchJobWorker(5000); // Process every 5 seconds
```

**Processing Loop (mỗi 5 giây):**

```
Bước 1: Query Pending Jobs
├─ SELECT * FROM batch_jobs WHERE status = 'pending'
├─ LIMIT: MAX_CONCURRENT_JOBS (5)
├─ Exclude jobs for users already processing
└─ Log: "[BatchWorker] Processing 2 jobs in parallel"

Bước 2: Process Each Job Parallel
├─ Promise.allSettled() for multiple jobs
├─ Max 1 job per user (avoid token/limit conflicts)
└─ Each job calls processJob(job)

Bước 3: Update Job Status → processing
├─ UPDATE batch_jobs SET status = 'processing'
├─ SET started_at = COALESCE(started_at, NOW())
└─ SET last_activity_at = NOW()

Bước 4: Parse Job Data
├─ JSON.parse(job.job_data) → { keywords, settings }
├─ JSON.parse(job.article_ids) → []
├─ startIndex = job.current_item_index || 0
└─ Get keywords and user settings

Bước 5: Loop Through Each Keyword
└─ FOR i = startIndex TO keywords.length:
     • Check tokens (pause if < minimum)
     • Check article limit (pause if <= 0)
     • Call createArticle(userId, keyword, i, settings)
     • Update progress and tokens
     • Continue to next keyword

Bước 6: Complete Job
├─ UPDATE batch_jobs SET status = 'completed'
├─ SET completed_items = total_items
└─ SET last_activity_at = NOW()
```

**Processing States:**
```
pending   → Job waiting to be processed
processing → Job currently being processed  
completed → Job finished successfully
paused    → Job paused (tokens/limit reached)
failed    → Job failed with error
cancelled → User cancelled the job
```

---

### PHASE 4: Article Generation - Per Keyword

**File:** `server/workers/batchJobProcessor.ts::createArticle()`

```
For each keyword in batch:

Bước 1: Create Empty Article Record
├─ INSERT INTO articles:
│  ├─ user_id: from batch job
│  ├─ title: (from keyword, will update later)
│  ├─ slug: (generated later)
│  ├─ content: ""
│  ├─ outline: (if selected)
│  ├─ status: 'draft'
│  ├─ created_at: NOW()
│  └─ updated_at: NOW()
└─ Get articleId from insert

Bước 2: Call generateCompleteArticle()
├─ Function: articleGenerationService.ts
├─ Parameters:
│  ├─ userId: number
│  ├─ articleId: number
│  ├─ keyword: string (as title)
│  ├─ settings: {
│  │   model: "GPT-4o-mini", ← Dynamic selection
│  │   language: "vi",
│  │   tone: "professional",
│  │   length: "short",
│  │   outlineOption: "no-outline"
│  │ }
│  └─ fromBatch: true
└─ This function handles all AI generation async

Bước 3: Update Article with AI Content
├─ Receive from AI:
│  ├─ content: Full HTML article
│  ├─ title: SEO-optimized title
│  ├─ meta_title: Meta title (from selected model) ✅
│  ├─ meta_description: Meta description (from selected model) ✅
│  ├─ slug: URL-friendly slug
│  └─ tokensUsed: Token count
└─ UPDATE articles SET content, title, slug, meta_title, meta_description

Bước 4: Update Batch Job Progress
├─ article_ids: Push articleId to array
├─ completed_items: Increment count
├─ tokens_used: Add tokensUsed
├─ current_item_index: Set to current i
├─ last_activity_at: NOW()
└─ Log: "[BatchWorker] Successfully created article #456"

Bước 5: Update User Tokens
├─ UPDATE users SET tokens_remaining -= tokensUsed
└─ This affects tokens available for next keywords
```

---

### PHASE 5: AI Metadata Generation - Key Fixes ✅

**File:** `server/routes/ai.ts` (Lines 6118, 6158)

**BEFORE FIX (Hardcoded):**
```typescript
// Line 6118 - SEO Title Generation
const titleResponse = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // ❌ HARDCODED!
  messages: [...],
});

// Line 6158 - Meta Description Generation
const descResponse = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // ❌ HARDCODED!
  messages: [...],
});
```

**AFTER FIX (Dynamic):**
```typescript
// Line 6118 - SEO Title Generation
const titleResponse = await openai.chat.completions.create({
  model: model, // ✅ Uses selected model (GPT-4o-mini, GPT-4, etc.)
  messages: [...],
});

// Line 6158 - Meta Description Generation
const descResponse = await openai.chat.completions.create({
  model: model, // ✅ Uses selected model
  messages: [...],
});
```

**API Provider Selection:**
```typescript
// Lines 5902-5930 - Dynamic API Key Selection
if (model.includes('gemini') || model.includes('gpt-4o')) {
  // Use appropriate API key based on model
  const selectedApiKey = model.includes('gemini') 
    ? googleApiKey 
    : openaiApiKey;
}
```

**For Gemini Title Generation (Line 5970):**
```typescript
// @ts-expect-error - Gemini API is optional import
const genAI = new GoogleGenerativeAI(googleApiKey);
const genModel = genAI.getGenerativeModel({ model: model });
const titleResult = await genModel.generateContent(...);
```

---

### PHASE 6: Database Updates - Real-time Progress

**Batch Jobs Table Updates (Real-time):**

```sql
-- Initial state after job created
UPDATE batch_jobs SET 
  status = 'pending',
  created_at = '2026-01-16 10:00:00'
WHERE id = 123;

-- When worker starts processing
UPDATE batch_jobs SET 
  status = 'processing',
  started_at = '2026-01-16 10:00:05'
WHERE id = 123;

-- After 1st keyword (progress update)
UPDATE batch_jobs SET 
  completed_items = 1,
  current_item_index = 1,
  article_ids = '[456]',
  tokens_used = 450,
  last_activity_at = '2026-01-16 10:00:15'
WHERE id = 123;

-- After 2nd keyword
UPDATE batch_jobs SET 
  completed_items = 2,
  current_item_index = 2,
  article_ids = '[456, 457]',
  tokens_used = 900,
  last_activity_at = '2026-01-16 10:00:25'
WHERE id = 123;

-- When all keywords processed
UPDATE batch_jobs SET 
  status = 'completed',
  completed_items = 5,
  current_item_index = 5,
  article_ids = '[456, 457, 458, 459, 460]',
  tokens_used = 2250,
  last_activity_at = '2026-01-16 10:01:00'
WHERE id = 123;
```

**Articles Table Inserts (5 articles):**

```sql
-- Article 1
INSERT INTO articles (
  user_id, title, slug, content, meta_title, meta_description,
  status, created_at, updated_at
) VALUES (
  5,
  'Học Forex Cơ Bản: Hướng Dẫn Chi Tiết', -- From AI
  'hoc-forex-co-ban-huong-dan-chi-tiet',     -- Slugified
  '<p>Nội dung bài viết...</p>',               -- Full HTML
  'Học Forex Cơ Bản 2026 - Bí Quyết Thành Công', -- From AI model
  'Hướng dẫn chi tiết về forex cơ bản...',    -- From AI model
  'draft',
  NOW(),
  NOW()
);

-- Article 2, 3, 4, 5 (similar pattern)
```

**Users Table Token Update:**

```sql
-- Before batch (User has 10000 tokens)
SELECT tokens_remaining FROM users WHERE id = 5;
-- Result: 10000

-- After batch (Used 2250 tokens total)
UPDATE users SET tokens_remaining = tokens_remaining - 2250
WHERE id = 5;

-- After batch
SELECT tokens_remaining FROM users WHERE id = 5;
-- Result: 7750
```

---

## 📱 Frontend Progress Display

**Location:** `/account?tab=batch-jobs`

**Display Elements:**

```
┌──────────────────────────────────────────────┐
│  Batch Jobs Status                    [Close] │
├──────────────────────────────────────────────┤
│                                              │
│  Job #123: Batch Keywords                   │
│  Status: ⚙️ Đang xử lý...  [Pause] [Cancel]  │
│                                              │
│  Progress: ████████░░░░░░░░░░░░░░░ 40% (2/5) │
│                                              │
│  Created Articles:                           │
│  • Article #456: "Học Forex Cơ Bản"         │
│  • Article #457: "Giao Dịch Forex an Toàn"  │
│                                              │
│  Tokens Used: 900 / 10,000                  │
│  Time Elapsed: 00:00:25                     │
│                                              │
│  [View Articles] [Refresh]                  │
└──────────────────────────────────────────────┘
```

**Real-time Updates (Poll every 2-3 seconds):**
- Progress bar updates
- Article list grows
- Token counter decreases
- Time elapsed increases
- Status changes to "completed" when done

---

## 🔐 Error Handling & Pausing

**Pause Triggers:**

```
1. Insufficient Tokens:
   ├─ Check: tokensRemaining < minimum_for_next_article
   ├─ Action: Update batch_jobs SET status = 'paused'
   ├─ Message: "Out of tokens at keyword 3/5"
   └─ User can: Buy more tokens → Resume job

2. Article Limit Reached:
   ├─ Check: articleLimit <= 0
   ├─ Action: Update batch_jobs SET status = 'paused'
   ├─ Message: "Article limit reached at keyword 2/5"
   └─ User can: Upgrade plan → Resume job

3. API Error:
   ├─ Check: AI generation failure
   ├─ Action: Increment failed_items, continue to next
   ├─ Log: "[BatchWorker] Failed to create article..."
   └─ Result: Job completes with some failed items

4. User Cancellation:
   ├─ API: POST /api/batch-jobs/:id/cancel
   ├─ Action: Update batch_jobs SET status = 'cancelled'
   ├─ Result: Stop processing immediately
   └─ Articles: Already created articles remain
```

---

## 🎯 Complete Workflow Timeline

```
Time    Event                                Status
────────────────────────────────────────────────────
10:00   User submits batch job (5 keywords)  pending
10:00   Job record created in database       pending
10:01   Worker picks up job                  processing
10:01   Keyword 1: "Forex cơ bản"            processing (1/5)
10:15   Article #456 created + metadata     processing (1/5) ✅
10:16   Keyword 2: "Giao dịch forex"         processing (2/5)
10:30   Article #457 created + metadata     processing (2/5) ✅
10:31   Keyword 3: "Strategie forex"        processing (3/5)
10:45   Article #458 created + metadata     processing (3/5) ✅
10:46   Keyword 4: "Quản lý rủi ro"         processing (4/5)
11:00   Article #459 created + metadata     processing (4/5) ✅
11:01   Keyword 5: "Forex cho người mới"    processing (5/5)
11:15   Article #460 created + metadata     processing (5/5) ✅
11:16   All keywords processed              completed ✅
11:16   User tokens updated (remaining)     ✅
11:16   Batch job marked completed          completed ✅
```

---

## 📊 Key Data Snapshots

**At Job Creation:**
```javascript
{
  jobId: 123,
  totalItems: 5,
  completedItems: 0,
  failedItems: 0,
  tokensAtStart: 10000,
  tokensUsed: 0,
  currentIndex: 0,
  status: 'pending'
}
```

**At Completion:**
```javascript
{
  jobId: 123,
  totalItems: 5,
  completedItems: 5,
  failedItems: 0,
  tokensAtStart: 10000,
  tokensUsed: 2250,
  articleIds: [456, 457, 458, 459, 460],
  status: 'completed',
  elapsedSeconds: 76
}
```

---

## 🔧 Technical Stack

| Layer | Technology | File |
|-------|-----------|------|
| Frontend | React + TypeScript | `BatchWriteByKeywords.tsx` |
| API | Express.js + Node.js | `server/routes/batchJobs.ts` |
| Worker | Node.js + MySQL | `server/workers/batchJobProcessor.ts` |
| AI Generation | OpenAI/Gemini APIs | `server/routes/ai.ts` |
| AI Metadata | Dynamic model selection | `server/routes/ai.ts` (lines 6118, 6158) ✅ |
| Database | MariaDB | `batch_jobs`, `articles`, `users` tables |
| Job Queue | Simple polling (5s interval) | `batchJobProcessor.ts` |

---

## ✅ Improvements Made (This Session)

1. **Fixed SEO Title Generation** (Line 6118)
   - ❌ Was: `model: 'gpt-3.5-turbo'` (hardcoded)
   - ✅ Now: `model: model` (dynamic, respects user selection)

2. **Fixed Meta Description Generation** (Line 6158)
   - ❌ Was: `model: 'gpt-3.5-turbo'` (hardcoded)
   - ✅ Now: `model: model` (dynamic, respects user selection)

3. **Added Gemini Support** (Lines 5970, 6074)
   - Dynamic API provider selection based on model
   - Google Generative AI optional import with error handling

4. **Fixed Deploy Scripts**
   - `deploy-quick.sh`: Fixed incorrect scp path
   - `deploy-fix-ssh.sh`: Fixed incorrect upload directory

---

## 🚀 Production Status

- ✅ Code compiled successfully
- ✅ Deployed to production
- ✅ Batch job system operational
- ✅ AI model selection working correctly
- ✅ SEO metadata using selected model
- ✅ All deploy scripts fixed and consistent

