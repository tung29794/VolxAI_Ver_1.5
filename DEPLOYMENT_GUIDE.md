# Deployment Guide - VolxAI Website

## Thông tin Hosting

- **FTP Host**: 103.221.221.67
- **FTP Username**: volxai@volxai.com
- **FTP Password**: Qnoc7vBSy8qh+BpV

## Thông tin Database

- **Host**: 103.221.221.67
- **Database**: jybcaorr_lisacontentdbapi
- **Username**: jybcaorr_lisaaccountcontentapi
- **Password**: 18{hopk2e$#CBv=1

## Các Bước Deploy

### 1. Chuẩn bị Source Code

```bash
# Clone repository
git clone https://github.com/tung29794/VolxAI-20Website.git
cd VolxAI-20Website

# Cài dependencies
npm install
# hoặc nếu dùng pnpm
pnpm install
```

### 2. Build Production

```bash
# Build client và server
npm run build

# Hoặc nếu dùng pnpm
pnpm build
```

Sau khi build, bạn sẽ có:
- `dist/spa/` - Frontend files (HTML, JS, CSS)
- `dist/server/` - Backend server files

### 3. Cấu Hình Database

#### 3.1 Thêm các cột vào bảng users

Truy cập phpMyAdmin hoặc chạy SQL query:

```sql
-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE AFTER password_hash,
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) AFTER email,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE AFTER full_name,
ADD INDEX IF NOT EXISTS idx_email (email);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. Upload lên FTP

#### Cách 1: Sử dụng FileZilla (GUI)

1. Mở FileZilla
2. Tạo new site:
   - Host: `103.221.221.67`
   - Username: `volxai@volxai.com`
   - Password: `Qnoc7vBSy8qh+BpV`
   - Port: `21`

3. Upload file:
   - Toàn bộ thư mục `dist/spa/` lên `public_html/` hoặc web root
   - Thư mục `dist/server/` lên một folder riêng (ví dụ: `/api/`)
   - File `.env` lên root folder

#### Cách 2: Sử dụng Terminal (FTP Script)

```bash
#!/bin/bash

# Deploy script - deploy.sh
HOST="103.221.221.67"
USER="volxai@volxai.com"
PASS="Qnoc7vBSy8qh+BpV"

# Upload frontend files
lftp -u $USER,$PASS $HOST <<EOF
mirror -R dist/spa/ /public_html/
quit
EOF

# Upload backend files
lftp -u $USER,$PASS $HOST <<EOF
mirror -R dist/server/ /api/
put .env
quit
EOF

echo "✓ Deploy complete!"
```

#### Cách 3: Sử dụng NodeJS SFTP (Nếu có SFTP)

```bash
npm install ssh2-sftp-client --save-dev
```

Tạo file `deploy.js`:

```javascript
const sftp = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

const client = new sftp();

const config = {
  host: '103.221.221.67',
  port: 22,
  username: 'volxai@volxai.com',
  password: 'Qnoc7vBSy8qh+BpV',
};

async function deploy() {
  try {
    await client.connect(config);
    
    // Upload frontend
    await client.uploadDir('dist/spa', '/public_html/');
    console.log('✓ Frontend uploaded');
    
    // Upload backend
    await client.uploadDir('dist/server', '/api/');
    console.log('✓ Backend uploaded');
    
    // Upload .env
    await client.put('.env', '/.env');
    console.log('✓ .env uploaded');
    
    await client.end();
    console.log('✓ Deploy complete!');
  } catch (err) {
    console.error('Deploy failed:', err);
    await client.end();
  }
}

deploy();
```

Chạy:
```bash
node deploy.js
```

### 5. Cấu Hình Server Node.js

Nếu hosting hỗ trợ Node.js:

1. **Cài PM2** (Process manager):
```bash
npm install -g pm2
```

2. **Tạo PM2 config** - `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'volxai-api',
    script: 'dist/server/node-build.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

3. **Start server**:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Cấu Hình Web Server (Apache/Nginx)

#### Nếu dùng Apache (.htaccess):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### Nếu dùng Nginx:

```nginx
server {
    listen 80;
    server_name volxai.com www.volxai.com;

    root /home/volxai/public_html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7. Verify Deployment

```bash
# Test frontend
curl https://volxai.com

# Test API
curl https://volxai.com/api/ping

# Test auth register
curl -X POST https://volxai.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@volxai.com",
    "username": "testuser",
    "password": "password123",
    "full_name": "Test User"
  }'

# Test auth login
curl -X POST https://volxai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@volxai.com",
    "password": "password123"
  }'
```

## Troubleshooting

### Database connection failed
- Kiểm tra `.env` có đúng credentials không
- Kiểm tra IP host có truy cập được database không
- Ping: `ping 103.221.221.67`
- Telnet: `telnet 103.221.221.67 3306`

### FTP upload lỗi
- Kiểm tra username/password
- Kiểm tra folder permissions (755 cho folders, 644 cho files)
- Kiểm tra file size limit

### Server không chạy
- Kiểm tra Node.js version (>=16.0.0)
- Kiểm tra port 3000 có occupied không
- Xem logs: `pm2 logs volxai-api`

## Security Notes

1. **Thay đổi JWT_SECRET** trong `.env`:
```
JWT_SECRET=your-long-random-secret-key-here
```

2. **Bảo vệ `.env` file**:
   - Không commit vào git
   - Set permissions: `chmod 600 .env`

3. **HTTPS**:
   - Sử dụng Let's Encrypt
   - Redirect HTTP → HTTPS

4. **Database**:
   - Backup dữ liệu thường xuyên
   - Cập nhật password định kỳ

## Support

Nếu cần hỗ trợ, kiểm tra logs:
- Frontend: Browser console
- Backend: `pm2 logs volxai-api`
- Server: `/var/log/apache2/error.log` hoặc `/var/log/nginx/error.log`
