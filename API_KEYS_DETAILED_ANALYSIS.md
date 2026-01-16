# Sơ đồ vấn đề & giải pháp - Quản lý API

## 1️⃣ HIỆN TƯỢNG BUG (Trước khi fix)

```
User Interface (Admin Dashboard)
    ↓
[Click "Thêm API" button]
    ↓
Frontend: AdminAPIs.tsx
    ├─ Validate form data ✅
    ├─ Send POST /api/api-keys ✅
    └─ Wait for response...
         ↓
    Backend: api-keys.ts
         ├─ Receive POST request ✅
         ├─ Validate data ✅
         └─ Execute SQL query:
            INSERT INTO api_keys (...) VALUES (...)
                 ↓
            ❌ DATABASE ERROR!
            "Table 'api_keys' doesn't exist"
                 ↓
         ❌ API returns error response
              ↓
    Frontend:
         ├─ Receives error response ✅
         ├─ BUT: catch block shows
         │   alert("Lỗi khi lưu API key")
         └─ ❌ Message not shown to user?
                OR user dismisses it?
    ↓
Result:
    ❌ Data NOT saved to database
    ❌ User sees success message (bug in UI error handling)
    ❌ Refresh page → API key gone
```

## 2️⃣ CÁC FILE LIÊN QUAN

```
project/
├── client/
│   └── components/admin/
│       └── AdminAPIs.tsx [Frontend UI]
│           ├─ handleSave(): Gửi POST request
│           ├─ loadAPIKeys(): Fetch danh sách
│           └─ handleDelete(): Xóa API key
│
├── server/
│   └── routes/
│       └── api-keys.ts [Backend API]
│           ├─ handleCreateAPIKey(): INSERT
│           ├─ handleGetAPIKeys(): SELECT
│           ├─ handleUpdateAPIKey(): UPDATE
│           └─ handleDeleteAPIKey(): DELETE
│
└── database/
    ├── init.sql [Database schema]
    ├── DATABASE_IMPORT.sql [Import script]
    └── migrations/
        ├── create_api_keys_table.sql [Existing]
        └── fix_api_keys_table.sql [NEW - untuk fix]

❌ MISSING: Table 'api_keys' in actual database!
```

## 3️⃣ ROOT CAUSE ANALYSIS

| Level | File | Status |
|-------|------|--------|
| **Frontend** | `client/components/admin/AdminAPIs.tsx` | ✅ Code OK |
| **Backend** | `server/routes/api-keys.ts` | ✅ Code OK |
| **Database** | `database/init.sql` | ❌ Table definition missing! |
| **Database** | `database/migrations/create_api_keys_table.sql` | ✅ Definition exists, but |
| **Database** | **Actual database tables** | ❌ Table NOT created! |

**Problem:** Migration file exists, but migration has NOT been applied to actual database.

## 4️⃣ SOLUTION FLOW

```
BEFORE:
┌─────────────────────────────────────────┐
│ Frontend code         ✅ OK             │
│ Backend code          ✅ OK             │
│ Migration SQL file    ✅ EXISTS         │
│ Actual DB table       ❌ DOESN'T EXIST  │ ← BUG HERE!
└─────────────────────────────────────────┘
         ↓
    [Run Migration SQL]
         ↓
AFTER:
┌─────────────────────────────────────────┐
│ Frontend code         ✅ OK             │
│ Backend code          ✅ OK             │
│ Migration SQL file    ✅ EXISTS         │
│ Actual DB table       ✅ EXISTS NOW!    │ ← FIXED!
└─────────────────────────────────────────┘
```

## 5️⃣ DETAILED FLOW AFTER FIX

```
User clicks "Thêm API"
    ↓
Frontend: POST /api/api-keys
    ↓ Request: {
        provider: "openai",
        category: "content",
        api_key: "sk-...",
        description: "...",
        is_active: true
    }
    ↓
Backend: api-keys.ts
    ├─ Validate ✅
    ├─ Check required fields ✅
    └─ Execute SQL:
       INSERT INTO api_keys 
       (provider, category, api_key, description, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())
            ↓
       Database: ✅ TABLE EXISTS!
       ✅ Row inserted successfully
       ✅ Return id: 1
            ↓
    ✅ Response: {
        message: "API key created successfully",
        id: 1
    }
    ↓
Frontend:
    ├─ response.ok = true ✅
    ├─ Close dialog ✅
    ├─ Call loadAPIKeys() ✅
    │  └─ Fetch GET /api/api-keys
    │     ├─ Backend SELECT * FROM api_keys
    │     └─ Return all keys
    ├─ Update UI with new key ✅
    └─ Show alert("API key đã được thêm") ✅
    ↓
Result:
    ✅ Data saved to database
    ✅ Success message displayed
    ✅ New key visible in list
    ✅ Refresh page → Key still there
```

## 6️⃣ TABLE SCHEMA

```sql
CREATE TABLE api_keys (
    id                INT             PRIMARY KEY AUTO_INCREMENT
    provider          VARCHAR(100)    NOT NULL  (openai, serpapi, etc)
    category          VARCHAR(50)     NOT NULL  (content, search)
    api_key           VARCHAR(500)    NOT NULL  (actual key)
    description       VARCHAR(255)    nullable  (optional label)
    is_active         BOOLEAN         DEFAULT TRUE
    quota_remaining   INT             nullable  (if tracked)
    last_used_at      TIMESTAMP       nullable
    created_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
    updated_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
    
    INDEXES:
    ├─ idx_provider   (faster lookups by provider)
    ├─ idx_category   (faster lookups by category)  
    ├─ idx_is_active  (faster active/inactive filter)
    └─ idx_created_at (faster date range queries)
)
```

## 7️⃣ API ENDPOINTS

```
Method | Endpoint            | Action
-------|---------------------|--------
GET    | /api/api-keys       | Fetch all API keys
POST   | /api/api-keys       | Create new API key
PUT    | /api/api-keys/:id   | Update API key
DELETE | /api/api-keys/:id   | Delete API key
```

## 8️⃣ FILES MODIFIED

```
✅ database/init.sql
   - Added CREATE TABLE api_keys

✅ DATABASE_IMPORT.sql
   - Added CREATE TABLE api_keys

✅ database/migrations/fix_api_keys_table.sql
   - NEW: Standalone migration file
   - Can be run independently

✅ QUICK_FIX_API_KEYS.md
   - Quick fix guide (this one)

✅ API_KEYS_FIX_SUMMARY.md
   - Technical summary

✅ FIX_API_KEYS_MANAGEMENT.md
   - Detailed step-by-step guide
```

## 9️⃣ VERIFICATION QUERIES

```sql
-- Check if table exists
SHOW TABLES LIKE 'api_keys';

-- Check table structure
DESCRIBE api_keys;

-- Check if table is empty (newly created)
SELECT COUNT(*) FROM api_keys;

-- Add test data (optional)
INSERT INTO api_keys (provider, category, api_key, is_active)
VALUES ('openai', 'content', 'sk-test-123', TRUE);

-- Verify test data
SELECT * FROM api_keys;
```

---

**Summary:** 
- ❌ **Root Cause:** Table definition missing in actual database
- ✅ **Solution:** Run migration SQL to create table
- ✅ **Status:** 3 files updated, ready to deploy
- ⏳ **Action needed:** Run SQL migration on database server
