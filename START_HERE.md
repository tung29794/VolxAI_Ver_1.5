# 🚀 START HERE - VolxAI Deployment

**Goal:** Deploy VolxAI on your shared hosting (jybcaorr account)  
**Estimated Time:** 15-20 minutes  
**Difficulty:** Easy - Just follow the steps

---

## 📚 Which Document Should I Read?

### 🏃 **I want to start NOW!**

👉 Read: **`QUICK_START_JYBCAORR.md`**

- Fast step-by-step checklist
- Just follow the steps
- Takes ~15 minutes

---

### 📖 **I want detailed explanations**

👉 Read: **`DEPLOYMENT_VOLXAI_JYBCAORR.md`**

- Full explanations for each step
- Troubleshooting included
- Takes ~30 minutes to read
- 👍 Recommended to understand the process

---

### 🔍 **I want just the reference**

👉 Read: **`DEPLOYMENT_READY.md`**

- Quick overview
- Links to all resources
- Use as a reference guide

---

## 📋 The 6 Simple Steps

No matter which guide you follow, it's basically these 6 steps:

```
┌─────────────────────────────────────┐
│ 1. Setup Database (5 min)           │
│    - Create DB & user on cPanel     │
│    - Import SQL schema              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 2. Upload Backend (2 min)           │
│    - Upload to /api.volxai.com      │
│    - Setup Node.js App              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 3. Upload Frontend (1 min)          │
│    - Upload to /public_html         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 4. Configure API URL (1 min)        │
│    - Set correct backend port       │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ 5. Test Everything (5 min)          │
│    - Test API & Frontend            │
│    - Test Registration              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ ✅ DONE! Your app is live!          │
└─────────────────────────────────────┘
```

---

## 📦 Files You Need to Deploy

### Backend Files (upload to `/home/jybcaorr/api.volxai.com`):

- ✅ `dist/server/node-build.mjs` ← Main backend file
- ✅ `dist/server/node-build.mjs.map` ← Debug map
- ✅ `.env` ← Configuration (use `.env.jybcaorr-production` as template)

### Frontend Files (upload to `/home/jybcaorr/public_html`):

- ✅ `dist/spa/index.html`
- ✅ `dist/spa/assets/` (folder with all CSS/JS)

### Database Schema:

- ✅ `DATABASE_IMPORT.sql` ← Copy & paste into phpMyAdmin

### Configuration:

- ✅ `.env.jybcaorr-production` ← Copy this, rename to `.env`

---

## 🎯 What You Need From cPanel

Before starting, you'll need:

```
1. cPanel login access
2. phpMyAdmin access
3. File Manager access (or FTP)
4. Node.js version (18.x or 20.x available in cPanel)
```

---

## ⚡ Quick Reference - Key Information

### Your Database:

```
Database Name: jybcaorr_volxai_db
User: jybcaorr_volxaiuser
Host: localhost
Port: 3306
```

### Your Paths:

```
Backend: /home/jybcaorr/api.volxai.com
Frontend: /home/jybcaorr/public_html
```

### Your Domains:

```
Frontend: https://api.volxai.com (or your domain)
Backend: https://api.volxai.com:PORT/api (PORT assigned by cPanel)
```

---

## 🎬 Ready? Let's Start!

### ✅ OPTION 1: Quick Start (Recommended for first time)

```
1. Open: QUICK_START_JYBCAORR.md
2. Follow each step exactly
3. Takes ~15 minutes
```

### ✅ OPTION 2: With Detailed Explanations

```
1. Open: DEPLOYMENT_VOLXAI_JYBCAORR.md
2. Read full explanations
3. Understand what you're doing
4. Takes ~30 minutes
```

### ✅ OPTION 3: Just Reference

```
1. Open: DEPLOYMENT_READY.md
2. See what's available
3. Link to detailed guides as needed
```

---

## 🆘 If You Get Stuck

### Step 1 Problem?

→ Check database section in `DEPLOYMENT_VOLXAI_JYBCAORR.md` (Phần 1)

### Step 2 Problem?

→ Check backend section in `DEPLOYMENT_VOLXAI_JYBCAORR.md` (Phần 4)

### Step 3 Problem?

→ Check frontend section in `DEPLOYMENT_VOLXAI_JYBCAORR.md` (Phần 5)

### Step 4 Problem?

→ Check troubleshooting in same file

---

## 🔐 Important Security Notes

⚠️ **Before deploying:**

- Change `JWT_SECRET` to a unique strong key
- Use a strong password for MySQL user
- Don't share `.env` file
- Don't commit `.env` to git
- Use HTTPS for all URLs

---

## 🚀 Let's Go!

**Choose your path:**

👉 **Fast & Easy?** → Open `QUICK_START_JYBCAORR.md`

👉 **Want to learn?** → Open `DEPLOYMENT_VOLXAI_JYBCAORR.md`

👉 **Need reference?** → Open `DEPLOYMENT_READY.md`

---

**Estimated time:** 15-20 minutes  
**Difficulty:** Beginner-friendly  
**Help available:** Check the relevant document section

**You've got this! 💪 Let's deploy VolxAI!** 🚀

---

## 📝 After Deployment

Once deployed successfully:

1. ✅ Share your app URL with friends
2. ✅ Monitor Node.js logs in cPanel
3. ✅ Regular database backups (ask hosting provider)
4. ✅ Update security settings as needed
5. ✅ Plan for growth/scaling if needed

---

**Questions?** → Check the relevant guide document  
**Ready?** → Pick a guide above and start deploying! 🎯
