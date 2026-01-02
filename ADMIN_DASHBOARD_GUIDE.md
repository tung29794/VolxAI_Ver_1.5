# Admin Dashboard Implementation Guide

## Overview

A comprehensive admin dashboard has been created for VolxAI to manage users, articles, and payment approvals. This guide explains the structure, features, and how to use the admin system.

---

## Features

### 1. **Tổng quan (Overview) - Statistics & Analytics**

The Overview page displays key metrics and purchase statistics:

- **Key Metrics:**
  - Total number of users
  - Number of free users
  - Number of upgraded users
  - Total revenue (all successful payments)

- **Purchase Statistics Charts:**
  - Daily revenue
  - Monthly revenue
  - Quarterly revenue
  - Yearly revenue

**Location:** `/admin` → Click "Tổng quan" in sidebar

---

### 2. **Bài viết (Articles) - Article Management**

Manage all articles in the database with filtering and actions:

- **Filter by Status:**
  - All articles
  - Draft (Nháp)
  - Published (Đã xuất bản)
  - Archived (Lưu trữ)

- **Article Information Displayed:**
  - Title
  - Author/Username
  - Status badge
  - View count
  - Tokens used
  - Creation date

- **Admin Actions:**
  - Archive article (move to archived status)
  - Delete article (permanently remove)

- **Sample Articles:** 6 sample articles are automatically created in the database for testing

**Location:** `/admin` → Click "Bài viết" in sidebar

---

### 3. **Thanh toán (Payments) - Payment Approval Workflow**

This is the most important feature for managing user upgrades:

#### Payment Status Workflow:

1. **User Action:** User clicks "Tôi đã thanh toán" (I've paid) on the payment modal
2. **Payment Created:** A pending payment approval record is created
3. **Admin Review:** Payment appears in admin dashboard with "Chờ duyệt" (Pending Approval) status
4. **Admin Approval:**
   - Click "Duyệt" button to approve payment
   - Payment status changes to "Đã duyệt" (Approved)
   - User's subscription is upgraded automatically
5. **Rejection Option:**
   - Click "Từ chối" button to reject payment
   - Must provide rejection reason
   - User's subscription remains unchanged

#### Payment Information Displayed:

- User information (username, email)
- Plan upgrade path (from_plan → to_plan)
- Amount to pay
- Billing period (monthly/annual)
- Payment date
- Status badge with visual indicator

#### Admin Alert:

- Yellow alert shows if there are pending payments that need approval
- Updates in real-time (refreshes every 10 seconds)

**Location:** `/admin` → Click "Thanh toán" in sidebar

---

## Database Schema Changes

### New Tables Created:

#### 1. **payment_approvals** table

Stores pending payment requests from users:

```sql
- id: Primary key
- user_id: Foreign key to users
- subscription_id: Foreign key to subscription_history
- from_plan: Current plan
- to_plan: Desired plan
- amount: Payment amount in VND
- billing_period: 'monthly' or 'annual'
- status: 'pending', 'approved', or 'rejected'
- payment_date: When payment was made
- approved_by: Admin user ID who approved
- approved_at: When payment was approved
- rejection_reason: Reason for rejection (if rejected)
- created_at: Timestamp
```

#### 2. Schema Updates:

```sql
-- Added role column to users table
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';

-- Updated subscription_history status values
ENUM('pending', 'pending_approval', 'completed', 'cancelled', 'failed')
```

---

## API Endpoints

### Admin Endpoints (require admin role)

All admin endpoints require a valid JWT token with admin role in the Authorization header.

#### 1. **GET /api/admin/statistics**

Get dashboard statistics and revenue data.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "freeUsers": 120,
    "upgradedUsers": 30,
    "totalRevenue": 5000000,
    "dailyRevenue": [{"date": "2024-01-01", "amount": 100000}, ...],
    "monthlyRevenue": [{"month": "2024-01", "amount": 500000}, ...],
    "quarterlyRevenue": [...],
    "yearlyRevenue": [...]
  }
}
```

#### 2. **GET /api/admin/articles**

Get all articles with user information.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Article Title",
      "status": "published",
      "views_count": 125,
      "tokens_used": 50000,
      "created_at": "2024-01-01T...",
      "username": "user1"
    },
    ...
  ]
}
```

#### 3. **POST /api/admin/articles/:id/archive**

Archive an article (soft delete).

#### 4. **DELETE /api/admin/articles/:id**

Delete an article permanently.

#### 5. **GET /api/admin/payments**

Get all pending and processed payment approvals.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 10,
      "username": "john_doe",
      "email": "john@example.com",
      "from_plan": "free",
      "to_plan": "starter",
      "amount": 150000,
      "billing_period": "monthly",
      "status": "pending",
      "payment_date": "2024-01-15T...",
      "created_at": "2024-01-15T..."
    },
    ...
  ]
}
```

#### 6. **POST /api/admin/payments/:id/approve**

Approve a pending payment and upgrade user's subscription.

**Response:**

```json
{
  "success": true,
  "message": "Payment approved successfully"
}
```

#### 7. **POST /api/admin/payments/:id/reject**

Reject a pending payment with optional reason.

**Request Body:**

```json
{
  "reason": "Invalid payment information"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment rejected successfully"
}
```

### User Endpoints

#### **POST /api/auth/request-upgrade**

User requests a subscription upgrade and waits for admin approval.

**Request:**

```json
{
  "newPlan": "starter",
  "amount": 150000,
  "billingPeriod": "monthly"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Upgrade request submitted successfully. Awaiting admin approval.",
  "data": {
    "status": "pending_approval",
    "fromPlan": "free",
    "toPlan": "starter",
    "amount": 150000
  }
}
```

---

## User Flow

### Before Admin System:

1. User selects a plan → Payment modal shows QR code
2. User clicks "Tôi đã thanh toán" → Subscription upgraded immediately
3. No verification process

### After Admin System:

1. User selects a plan → Payment modal shows QR code
2. User clicks "Tôi đã thanh toán" → Upgrade request created (status: pending_approval)
3. Upgrade appears in user's "Lịch sử nâng cấp" with "⏳ Chờ duyệt" badge
4. Admin reviews payment in admin dashboard
5. Admin clicks "Duyệt" button → Subscription is upgraded
6. User's upgrade history updates to "✓ Hoàn thành"

---

## How to Set Admin Role

### Method 1: Database Direct Update

```sql
-- Update an existing user to admin
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

-- Verify
SELECT id, email, role FROM users WHERE email = 'admin@example.com';
```

### Method 2: Create Admin User via SQL

```sql
INSERT INTO users (email, username, password, full_name, role, is_active, is_verified)
VALUES ('admin@volxai.com', 'admin', '<hashed_password>', 'Admin User', 'admin', TRUE, TRUE);
```

---

## Testing the Admin Dashboard

### Setup:

1. **Update database:**
   - Run migrations: `database/migrations/002_add_admin_support.sql`
   - Insert sample articles: `database/migrations/003_sample_articles.sql`
   - Set a user as admin

2. **Login as Admin:**
   - Use an admin account to log in
   - Navigate to `/admin`

3. **Test Overview:**
   - View statistics and charts
   - Switch between day/month/quarter/year views

4. **Test Articles:**
   - View all articles
   - Filter by status
   - Archive/delete articles

5. **Test Payments:**
   - Create a test upgrade request from a regular user account
   - Switch to admin account
   - Approve or reject the payment
   - Verify user's subscription status changes

---

## Security Considerations

1. **Admin Verification:** All admin endpoints verify JWT token and check admin role
2. **Database Transactions:** Payment approvals update multiple tables atomically
3. **Audit Trail:** Activity logs are created for sensitive operations
4. **Input Validation:** All inputs are validated before database operations

---

## Troubleshooting

### Issue: "Access denied. Admin role required."

**Solution:** Make sure your user account has `role = 'admin'` in the users table.

### Issue: Admin dashboard is blank

**Solution:**

- Check browser console for errors
- Verify JWT token is valid
- Check that database migrations were applied

### Issue: Payment not showing in admin dashboard

**Solution:**

- Verify the payment_approvals table exists
- Check that the user made the upgrade request via the new `/api/auth/request-upgrade` endpoint
- Refresh the admin payments page

### Issue: Approving payment doesn't update user subscription

**Solution:**

- Check that payment status is 'pending'
- Verify user_subscriptions table exists and user has a subscription record
- Check server logs for errors

---

## Future Enhancements

1. **Batch Approvals:** Allow admin to approve multiple payments at once
2. **Payment Analytics:** More detailed payment reports and trends
3. **Audit Logs:** Full audit trail of all admin actions
4. **Email Notifications:** Send emails when payments are approved/rejected
5. **Partial Approval:** Allow adjusting payment amount before approval
6. **Refund System:** Process refunds for cancelled subscriptions

---

## Support

For issues or questions about the admin dashboard, refer to:

- Database schema in `DATABASE_IMPORT.sql`
- API endpoint documentation in `server/routes/admin.ts`
- Frontend components in `client/components/admin/`
- Pages in `client/pages/AdminDashboard.tsx`
