# VolxAI Database Setup Guide

## Database Connection Details

```
Host: 103.221.221.67
Database: jybcaorr_lisacontentdbapi
User: jybcaorr_lisaaccountcontentapi
Password: 18{hopk2e$#CBv=1
Port: 3306
```

---

## Option 1: Setup via phpMyAdmin (Recommended for beginners)

1. **Access phpMyAdmin**
   - Your hosting provider should provide access
   - Usually at: `https://your-domain.com/phpmyadmin`
   - Login with credentials from your hosting panel

2. **Navigate to Your Database**
   - Left sidebar → Click on `jybcaorr_lisacontentdbapi`
   - You should see an empty database

3. **Import the SQL Script**
   - Click "Import" tab at the top
   - Click "Choose File" and select `database/init.sql` from this project
   - Click "Go" to execute
   - Wait for success message

4. **Verify Tables Created**
   - Click on the database name
   - You should see these tables:
     - ✅ users
     - ✅ sessions
     - ✅ password_reset_tokens
     - ✅ user_subscriptions
     - ✅ articles
     - ✅ token_usage_history
     - ✅ audit_logs

---

## Option 2: Setup via Command Line

### 2a. From Your Local Machine

```bash
# Install MySQL client (if not already installed)
# On Mac:
brew install mysql-client

# On Linux:
sudo apt-get install mysql-client

# On Windows:
# Download from https://dev.mysql.com/downloads/mysql/

# Connect to remote database
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p jybcaorr_lisacontentdbapi < database/init.sql

# When prompted, enter password: 18{hopk2e$#CBv=1
```

### 2b. From Server SSH

```bash
# SSH into your hosting server
ssh volxai@103.221.221.67

# Upload the init.sql file (from your local machine)
# Or create it manually on the server

# Run the SQL script
mysql -h 127.0.0.1 \
       -u jybcaorr_lisaaccountcontentapi \
       -p jybcaorr_lisacontentdbapi < init.sql

# When prompted, enter password: 18{hopk2e$#CBv=1
```

---

## Option 3: Setup via Node.js Script

Use the automated setup script:

```bash
node database/setup.js
```

See `database/setup.js` for the implementation.

---

## Database Schema Overview

### 1. **users** - User Accounts
```sql
- id: Unique user ID
- username: Unique username
- email: User email address
- password_hash: Bcrypt hashed password
- full_name: User's full name
- token_balance: Remaining tokens
- is_active: Account status
- created_at: Account creation timestamp
- updated_at: Last update timestamp
- last_login: Last login timestamp
```

### 2. **sessions** - Active Sessions
```sql
- id: Session ID
- user_id: Foreign key to users
- token: JWT token
- expires_at: Token expiration time
- created_at: Session creation time
```

### 3. **password_reset_tokens** - Password Recovery
```sql
- id: Reset token ID
- user_id: Foreign key to users
- token: Reset token
- expires_at: Token expiration
- created_at: Request timestamp
```

### 4. **user_subscriptions** - Plans & Billing
```sql
- id: Subscription ID
- user_id: Foreign key to users
- plan_name: Starter/Grow/Pro/Corp/Premium
- plan_price: Monthly/annual price
- is_annual: Annual or monthly subscription
- monthly_articles: Limit per month
- monthly_tokens: Token limit per month
- is_active: Subscription status
- created_at: Subscription start date
- end_date: Subscription end date
```

### 5. **articles** - Generated Articles
```sql
- id: Article ID
- user_id: Author (foreign key)
- title: Article title
- content: Full article content
- ai_model: Model used (GPT-3, Claude, etc)
- keyword: Target keyword
- status: draft/published/archived
- tokens_used: Tokens consumed
- created_at: Creation timestamp
- published_at: Publication timestamp
```

### 6. **token_usage_history** - Usage Tracking
```sql
- id: Log ID
- user_id: User who used tokens
- article_id: Related article
- tokens_used: Number of tokens
- action: generate/edit/publish
- created_at: Timestamp
```

### 7. **audit_logs** - Activity Logging
```sql
- id: Log ID
- user_id: User performing action
- action: Action name
- resource_type: Type of resource
- resource_id: Resource ID
- details: JSON details
- ip_address: User's IP
- user_agent: Browser info
- created_at: Timestamp
```

---

## Verify Connection from Backend

After tables are created, test the connection:

```bash
# Build backend
npm run build

# Start backend
cd dist/server
node node-build.mjs
```

You should see:
```
✓ Database pool created successfully
✓ Database connection successful
🚀 VolxAI Server running on port 3000
```

If you see database errors, check:
1. Database credentials in `.env`
2. Tables exist in database (check phpMyAdmin)
3. MariaDB/MySQL is running
4. Port 3306 is accessible from your app server

---

## Test Database Connection

### Using curl

```bash
# Health check (no database query)
curl http://103.221.221.67:3000/api/ping

# Response should be:
# {"message":"ping pong"}
```

### Using Node.js Script

```bash
node database/test-connection.js
```

---

## Common Issues & Solutions

### 1. "Can't connect to MySQL server"
**Cause:** Database server not accessible or wrong credentials
**Solution:**
- Verify credentials are correct
- Check if database server is running
- Check if port 3306 is open/whitelisted
- Contact hosting provider if external connection blocked

### 2. "Unknown database 'jybcaorr_lisacontentdbapi'"
**Cause:** Database doesn't exist
**Solution:**
- Create database via phpMyAdmin or CLI:
  ```sql
  CREATE DATABASE jybcaorr_lisacontentdbapi 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
  ```

### 3. "Access denied for user"
**Cause:** Wrong password or user
**Solution:**
- Verify `.env` has correct credentials
- Reset database user password via hosting panel

### 4. "Table 'users' doesn't exist"
**Cause:** init.sql not executed
**Solution:**
- Run `database/init.sql` via phpMyAdmin
- Or use command line: `mysql ... < database/init.sql`

### 5. "Connection timeout"
**Cause:** Network/firewall issue
**Solution:**
- Check if your IP is whitelisted on the database server
- Contact hosting provider to whitelist your server's IP

---

## Backup & Maintenance

### Backup Database

```bash
# Create a backup
mysqldump -h 103.221.221.67 \
          -u jybcaorr_lisaaccountcontentapi \
          -p jybcaorr_lisacontentdbapi > backup.sql

# When prompted, enter password: 18{hopk2e$#CBv=1
```

### Restore from Backup

```bash
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p jybcaorr_lisacontentdbapi < backup.sql
```

### Monitor Database Size

```bash
# Connect to database
mysql -h 103.221.221.67 \
       -u jybcaorr_lisaaccountcontentapi \
       -p

# Run in MySQL console:
SELECT 
  TABLE_SCHEMA,
  ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as 'Size (MB)'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'jybcaorr_lisacontentdbapi'
GROUP BY TABLE_SCHEMA;
```

---

## Next Steps

1. ✅ Run `database/init.sql` to create tables
2. ✅ Verify tables exist (check phpMyAdmin)
3. ✅ Update `.env` with database credentials (already done)
4. ✅ Deploy backend: `node deploy-backend.mjs`
5. ✅ Test API: `curl http://103.221.221.67:3000/api/ping`
6. ✅ Test auth: Register/login on frontend

---

## Environment Variables (.env)

Your `.env` should have:

```bash
# Database Configuration
DB_HOST=103.221.221.67
DB_USER=jybcaorr_lisaaccountcontentapi
DB_PASSWORD=18{hopk2e$#CBv=1
DB_NAME=jybcaorr_lisacontentdbapi
DB_PORT=3306

# JWT Configuration
JWT_SECRET=volxai-secret-jwt-key-2024

# Server Configuration
PORT=3000
NODE_ENV=production
PING_MESSAGE=ping pong
```

---

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to git
- Change JWT_SECRET to a strong random value in production
- Use HTTPS for all API calls
- Implement rate limiting on auth endpoints
- Regularly backup your database
- Monitor database access logs

---

## Support

If you encounter database issues:
1. Check DATABASE_SETUP.md (this file)
2. Check server logs: `tail -f /var/log/mysql/error.log`
3. Contact hosting provider
4. Check MySQL documentation: https://dev.mysql.com/doc/

**Database Setup Complete!** 🎉

Your VolxAI database is now ready for:
- User registration & authentication
- Session management
- Subscription tracking
- Article storage
- Token usage history
