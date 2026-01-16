# 🎯 ACTION REQUIRED - Setup Database for AI Prompts

## ⚠️ QUAN TRỌNG: Cần chạy setup database!

Màn hình trắng vì table `ai_prompts` chưa được tạo trong database.

---

## 🚀 Chạy lệnh này NGAY:

```bash
cd /Users/tungnguyen/VolxAI_2_1_26/VolxAI_Ver_1.5
./setup-database.sh
```

**Nhập password khi được hỏi:** [database password]

Script sẽ:
1. ✅ Tạo table `ai_prompts`
2. ✅ Import 5 default prompts
3. ✅ Verify data

**Thời gian:** ~30 giây

---

## 📋 Sau khi chạy script

### 1. Restart backend server
```bash
ssh -p 2210 jybcaorr@ghf57-22175.azdigihost.com "touch /home/jybcaorr/api.volxai.com/tmp/restart.txt"
```

### 2. Test Admin UI
1. Vào: https://volxai.com/admin
2. Nhấn **Cmd+Shift+R** để hard refresh
3. Login lại
4. Click tab **"AI Prompts"**
5. Bạn sẽ thấy 5 prompts! 🎉

---

## ✅ Checklist

- [ ] Chạy `./setup-database.sh` (nhập password)
- [ ] Thấy message "✅ Database setup complete!"
- [ ] Restart backend với SSH command
- [ ] Hard refresh browser (Cmd+Shift+R)
- [ ] Vào Admin → AI Prompts
- [ ] Thấy 5 prompts hiển thị

---

## 🔍 Nếu cần help

Xem chi tiết trong: **FIX_WHITE_SCREEN_AI_PROMPTS.md**

---

**TL;DR:** Chạy `./setup-database.sh` ngay để fix! 🚀
