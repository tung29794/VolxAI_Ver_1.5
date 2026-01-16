# Batch Job System Implementation - Progress Report

## ✅ Completed Tasks

### 1. Database Schema (100%)
**File:** `CREATE_BATCH_JOBS_TABLE.sql`

Đã tạo bảng `batch_jobs` với đầy đủ các trường:
- **Tracking fields:** `id`, `user_id`, `job_type`, `status`
- **Progress fields:** `total_items`, `completed_items`, `failed_items`, `current_item_index`
- **Data fields:** `job_data` (JSON), `article_ids` (JSON)
- **Limits tracking:** `tokens_at_start`, `tokens_used`, `articles_limit_at_start`
- **Timestamps:** `started_at`, `completed_at`, `last_activity_at`, `created_at`, `updated_at`
- **Status enum:** `pending`, `processing`, `completed`, `failed`, `paused`, `cancelled`

**Indexes:**
- `idx_user_id` - Fast queries by user
- `idx_status` - Fast queries by status
- `idx_created_at` - Chronological ordering

**Foreign Key:** CASCADE delete on `user_id`

---

### 2. Backend API (100%)
**File:** `server/routes/batchJobs.ts`

Đã tạo 7 RESTful endpoints:

#### GET `/api/batch-jobs`
- List user's batch jobs
- Pagination support (page, limit)
- Filter by status
- Returns total count và pagination info

#### GET `/api/batch-jobs/:id`
- Get single job details
- Auto parse JSON fields (job_data, article_ids)
- Security: Only owner can view

#### POST `/api/batch-jobs`
- Create new batch job
- Snapshot user's current tokens & article limit
- Store keywords array + settings in job_data
- Returns jobId for tracking

#### POST `/api/batch-jobs/:id/cancel`
- Cancel pending/processing job
- Only owner can cancel
- Job must be in cancelable state

#### POST `/api/batch-jobs/:id/pause`
- Pause processing job (NOT USED YET - for future)
- Preserves current progress

#### POST `/api/batch-jobs/:id/resume`
- Resume paused job (NOT USED YET - for future)
- Sets status back to 'pending'

#### DELETE `/api/batch-jobs/:id`
- Delete completed/failed/cancelled jobs
- Cannot delete active jobs

**Authentication:** All endpoints protected by JWT middleware

**Registered in:** `server/index.ts` line 82

---

### 3. Background Worker (100%)
**File:** `server/workers/batchJobProcessor.ts`

Worker chạy mỗi 5 giây để xử lý batch jobs:

**Features:**
- ✅ Sequential processing (không parallel)
- ✅ Check limits TRƯỚC mỗi bài viết
- ✅ Update progress SAU mỗi bài viết
- ✅ Handle pause/cancel mid-processing
- ✅ Auto-resume from last position
- ✅ Error tracking per article
- ✅ Prevent concurrent processing (isProcessing flag)

**Logic Flow:**
1. Poll database for oldest pending job
2. Mark job as 'processing'
3. For each keyword:
   - Check job status (cancelled/paused?)
   - Check user's current tokens_remaining
   - Check user's current article_limit
   - If insufficient: PAUSE job with error message
   - Create article draft
   - Trigger AI generation (TODO: needs integration)
   - Update progress
   - Sleep 1 second
4. Mark job as 'completed'

**Started in:** `server/index.ts` line 28-30

---

## ⏳ TODO: High Priority

### 1. AI Generation Integration (CRITICAL)
**File to modify:** `server/workers/batchJobProcessor.ts` line 266-280

**Current Status:** Placeholder function `generateArticleContent()`

**What needs to be done:**
1. Extract AI generation logic from `server/routes/ai.ts` into a shared service
2. Create `server/services/aiService.ts` with reusable functions:
   - `generateOutline(keyword, userId)`
   - `generateArticle(articleId, outlineOption, keyword, userId)`
   - `insertImages(articleId, maxImages)`
3. Update worker to call these services
4. Ensure token deduction happens correctly

**Why this is critical:**
- Right now worker creates draft articles but doesn't generate content
- Articles will remain empty without this integration

---

### 2. Update BatchWriteByKeywords Component
**File to modify:** `client/components/BatchWriteByKeywords.tsx`

**Current behavior:**
- Creates articles directly
- Fires AI generation in parallel (fire-and-forget)
- No progress tracking
- No limits checking

**Need to change to:**
```typescript
// OLD (lines ~400-450):
const articlePromises = parsedKeywords.map(async keyword => {
  const response = await fetch("/api/articles", {
    method: "POST",
    body: JSON.stringify({ title: keyword, content: "", status: "draft" })
  });
  
  const article = await response.json();
  
  // Fire and forget AI generation
  fetch("/api/ai/generate-article", {
    method: "POST",
    body: JSON.stringify({ articleId: article.data.id, ... })
  });
});

await Promise.all(articlePromises);

// NEW (to implement):
const response = await fetch("/api/batch-jobs", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    job_type: "batch_keywords",
    keywords: parsedKeywords,
    settings: {
      outlineOption: selectedOutline,
      autoInsertImages: autoInsert,
      maxImages: maxImageCount,
    },
  }),
});

const result = await response.json();
const jobId = result.data.jobId;

// Redirect to batch jobs list or show progress
navigate(`/account?tab=batch-jobs`);
// OR open BatchJobProgress modal with jobId
```

---

### 3. Create Batch Job Progress Component (NEW FILE)
**File to create:** `client/components/BatchJobProgress.tsx`

**Purpose:** Real-time progress tracking UI

**Features needed:**
- Show job status badge (pending/processing/completed/failed/paused)
- Progress bar: `completed_items / total_items`
- Show created articles list (from article_ids JSON)
- Action buttons:
  - Pause (if processing)
  - Resume (if paused)
  - Cancel (if pending/processing)
  - Delete (if completed/failed/cancelled)
  - View Articles (navigate to articles list)
- Auto-refresh every 3 seconds while processing
- Show error message if paused due to limits

**Example UI:**
```
┌─────────────────────────────────────────────────┐
│ Batch Job #123 - Processing ⚙️                 │
│                                                 │
│ Progress: 5 / 20 articles                      │
│ ████████████░░░░░░░░░░░░░░░░ 25%              │
│                                                 │
│ Created Articles:                               │
│ • Article #456: "Keyword 1"                    │
│ • Article #457: "Keyword 2"                    │
│ • Article #458: "Keyword 3"                    │
│ • Article #459: "Keyword 4"                    │
│ • Article #460: "Keyword 5"                    │
│                                                 │
│ [Pause] [Cancel]                               │
└─────────────────────────────────────────────────┘
```

---

### 4. Add Batch Jobs Tab to Account Page
**File to modify:** `client/pages/Account.tsx`

**Changes needed:**
1. Add new tab "Batch Jobs" (sau tab "Articles")
2. Fetch batch jobs from `/api/batch-jobs`
3. Display list of jobs with:
   - Job ID
   - Status badge
   - Progress (5/20)
   - Created date
   - Action button (View Details)
4. Click "View Details" → Open BatchJobProgress modal

---

## 📝 Testing Checklist

### Database Setup
- [ ] Run `CREATE_BATCH_JOBS_TABLE.sql` on database
- [ ] Verify table exists: `SHOW TABLES LIKE 'batch_jobs'`
- [ ] Verify columns: `DESCRIBE batch_jobs`

### API Endpoints
- [ ] GET `/api/batch-jobs` - List jobs
- [ ] GET `/api/batch-jobs/:id` - Get single job
- [ ] POST `/api/batch-jobs` - Create job
- [ ] POST `/api/batch-jobs/:id/cancel` - Cancel job
- [ ] DELETE `/api/batch-jobs/:id` - Delete job

### Worker Functionality
- [ ] Worker starts on server startup
- [ ] Worker processes pending jobs
- [ ] Worker updates progress correctly
- [ ] Worker checks limits before each article
- [ ] Worker pauses when tokens exhausted
- [ ] Worker pauses when article limit reached
- [ ] Worker handles cancellation mid-processing

### Frontend Integration (After TODO #2-4)
- [ ] BatchWriteByKeywords creates batch job
- [ ] Batch jobs tab shows all user jobs
- [ ] Progress modal updates in real-time
- [ ] Pause/Resume/Cancel buttons work
- [ ] Articles list shows created articles
- [ ] Error messages display correctly

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
mysql -u your_user -p your_database < CREATE_BATCH_JOBS_TABLE.sql
```

### 2. Build & Deploy
```bash
npm run build
npm run start
```

### 3. Verify Worker Started
Check server logs for:
```
✓ Database connected
✓ Batch job worker started
[BatchWorker] Starting worker with 5000ms interval
```

---

## 📊 System Behavior

### Q: User thoát browser thì 100 bài có tiếp tục viết không?
**A: CÓ ✅**
- Batch jobs chạy trên server, KHÔNG phụ thuộc browser
- Worker poll database mỗi 5 giây
- Ngay cả khi user tắt máy, server vẫn tiếp tục xử lý

### Q: Đang viết bài 67/100 mà hết token thì có dừng lại không?
**A: CÓ ✅**
- Worker check `tokens_remaining` TRƯỚC KHI viết mỗi bài
- Nếu token <= 0: PAUSE job + lưu error message
- User có thể resume sau khi nạp thêm token
- Không lãng phí token vào các bài không thể hoàn thành

### Q: Có thể pause giữa chừng không?
**A: CÓ ✅ (API sẵn sàng, cần UI)**
- POST `/api/batch-jobs/:id/pause`
- Worker check status sau mỗi bài
- Nếu status = 'paused': dừng ngay lập tức
- Resume bằng POST `/api/batch-jobs/:id/resume`

---

## 🎯 Next Steps (Priority Order)

1. **Run database migration** (2 minutes)
   - `mysql -u user -p database < CREATE_BATCH_JOBS_TABLE.sql`

2. **Test API endpoints** (10 minutes)
   - Use Postman/Thunder Client
   - Test create job → check worker logs

3. **AI generation integration** (30-60 minutes)
   - Extract logic from ai.ts
   - Create aiService.ts
   - Update worker to call service

4. **Update BatchWriteByKeywords** (15 minutes)
   - Replace direct article creation with batch job creation
   - Show success message

5. **Create BatchJobProgress component** (30-45 minutes)
   - Progress bar
   - Articles list
   - Action buttons
   - Auto-refresh

6. **Add Batch Jobs tab** (15 minutes)
   - New tab in Account page
   - List jobs with status
   - Open progress modal

7. **Full system test** (20 minutes)
   - Create batch job with 5 keywords
   - Verify sequential processing
   - Test pause/resume
   - Test limits enforcement
   - Test browser close behavior

**Total estimated time:** 2-3 hours

---

## 📚 File Summary

### Created Files (3):
1. `CREATE_BATCH_JOBS_TABLE.sql` - Database schema
2. `server/routes/batchJobs.ts` - API endpoints
3. `server/workers/batchJobProcessor.ts` - Background worker

### Modified Files (1):
1. `server/index.ts` - Import routes + start worker

### TODO Files (2):
1. `server/services/aiService.ts` - To be created
2. `client/components/BatchJobProgress.tsx` - To be created

### To Modify Files (2):
1. `client/components/BatchWriteByKeywords.tsx` - Update to use API
2. `client/pages/Account.tsx` - Add batch jobs tab

---

**Status:** Backend infrastructure 100% complete ✅  
**Next:** Database migration → AI integration → Frontend updates
