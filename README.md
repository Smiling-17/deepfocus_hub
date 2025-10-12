# DeepFocus Hub

> ✨ **Trải nghiệm ngay:** [https://deepfocushub-smiling.vercel.app/](https://deepfocushub-smiling.vercel.app/)

**DeepFocus Hub** là trung tâm điều phối năng suất cá nhân dành cho những ai theo đuổi phương pháp *Deep Work*. Ứng dụng kết nối toàn bộ hành trình tập trung sâu — từ lập lịch, bước vào “Không Gian Tập Trung”, đánh giá sau phiên cho tới phân tích thống kê & gợi ý AI — giúp bạn duy trì nhịp độ tập trung ổn định và bứt phá hiệu quả mỗi ngày.

<p align="center">
  <img src="./client/public/Calistya.png" alt="DeepFocus Hub Logo" height="128" />
</p>

---

## 📌 Tính năng nổi bật

### 1. Xác thực người dùng (JWT)
- Đăng ký / đăng nhập với username & mật khẩu (bcrypt hash).
- JWT lưu trữ phía client, middleware `protect` đảm bảo chỉ người dùng hợp lệ mới truy cập API.
- Luồng UX: đăng ký → chuyển login → pop-up giới thiệu → vào bảng điều khiển.

### 2. Bảng điều khiển & Lịch nhiệm vụ
- Timeline nhiệm vụ theo ngày với hiệu ứng động.
- Thêm, chỉnh sửa, xóa, đánh dấu hoàn thành — nhiệm vụ gắn `userId`.
- Modal “Đặt mục tiêu” để khởi tạo phiên Deep Work.

### 3. Không Gian Tập Trung
- Đồng hồ đếm ngược dạng vòng conic (50 phút mặc định, tùy chỉnh).
- Tạm dừng (tối đa 2 lần, 3 phút/lần), ghi xao nhãng, ghi chú nhanh.
- Giao diện “phóng to toàn màn” cho trải nghiệm tập trung tuyệt đối.
- Tự động chuyển sang màn hình đánh giá + âm báo khi hết giờ.

### 4. Đánh giá phiên & ghi dữ liệu
- Lưu `DeepWorkSession`: mục tiêu, thời lượng, rating 1–5 sao, ghi chú, điểm thưởng.
- Màn hình đánh giá hiển thị nhanh nhật ký, xao nhãng, tạm dừng.

### 5. Thống kê & Game hóa
- Tổng giờ Deep Work, chuỗi streak, điểm tập trung, số lần xao nhãng.
- Heatmap theo ngày, breakdown theo tuần, phân phối rating, khung giờ vàng.
- Huy hiệu (badge) theo milestones, danh sách phiên gần đây.
- Tính năng “Nhận gợi ý thông minh” sử dụng OpenAI (tùy chọn).

### 6. Giao diện & trải nghiệm
- Theme sáng/tối với animation nhân vật GSAP.
- Trang đăng nhập/đăng ký nền chuyển động, placeholder chữ nhảy.
- Checkbox “Đánh dấu hoàn thành” animation cầu vồng.
- Mobile-first, hỗ trợ keyboard, ARIA label đầy đủ.

---

## 🛠️ Công nghệ sử dụng

| Thành phần      | Công nghệ chính                                                                               |
|-----------------|-----------------------------------------------------------------------------------------------|
| Frontend        | React 18 + Vite, Tailwind CSS, Day.js, GSAP, Axios, React Router                             |
| Backend         | Node.js, Express.js, Mongoose, JSON Web Token, bcrypt                                        |
| Database        | MongoDB (Atlas hoặc tự triển khai)                                                           |
| Auth            | JWT Bearer, middleware `protect`                                                             |
| AI (tùy chọn)   | OpenAI Responses API (`gpt-4o-mini`)                                                         |
| Deployment        | Backend: **Render** (production: `https://deepfocus-hub.onrender.com`) / Frontend: **Vercel** (production: `deepfocushub-smiling.vercel.app`) |
---

## 📂 Cấu trúc thư mục

```
DeepFocus_Hub/
├── client/                         # Frontend (React + Vite)
│   ├── public/
│   │   ├── Calistya.png            # Logo
│   │   └── background_login.jpg    # Ảnh nền trang đăng nhập/đăng ký
│   ├── src/
│   │   ├── components/             # ThemeToggle, AnimatedInput, …
│   │   ├── context/                # ThemeContext, AuthContext
│   │   ├── layouts/                # AppLayout (navigation, footer)
│   │   ├── pages/                  # LoginPage, RegisterPage, DashboardPage, …
│   │   ├── utils/                  # apiClient (Axios config)
│   │   └── index.css               # Tailwind + custom animations
│   └── .env.example                # Mẫu environment cho frontend
├── server/                         # Backend (Express + Mongoose)
│   ├── src/
│   │   ├── config/                 # Kết nối MongoDB
│   │   ├── controllers/            # auth, tasks, sessions, stats, insights
│   │   ├── middleware/             # protect, error handler
│   │   ├── models/                 # User, Task, DeepWorkSession
│   │   └── routes/                 # Router Express
│   └── .env.example                # Mẫu environment cho backend
├── .gitignore
└── README.md
```

---

## ⚙️ Hướng dẫn cài đặt & chạy local

### Điều kiện
- Node.js 18+
- MongoDB (local hoặc Atlas)

### 1. Clone & cài đặt
```bash
# Clone project
git clone https://github.com/<your-account>/DeepFocus_Hub.git
cd DeepFocus_Hub

# Backend
cd server
npm install
cp .env.example .env             # cập nhật giá trị cụ thể

# Frontend
cd ../client
npm install
cp .env.example .env             # chỉnh VITE_API_URL
```

### 2. Khởi chạy
```bash
# Terminal 1
cd server
npm run dev                      # chạy Express tại PORT (mặc định 5000)

# Terminal 2
cd client
npm run dev                      # chạy Vite tại http://localhost:5173
```

---

## 🌐 Triển khai (chỉ dẫn nhanh)

1. **MongoDB Atlas**: tạo cluster, lấy URI, whiltelist IP.
2. **Backend (Render - production)**
   - Create a **Web Service** on Render: https://dashboard.render.com
   - Connect this repository and choose the deploy branch (e.g. `main`).
   - Set `Root Directory` to `server/`, `Build Command`: `npm install`, `Start Command`: `npm start`.
   - Configure required environment variables:
     ```
     MONGODB_URI=...
     JWT_SECRET=...
     CLIENT_ORIGIN=http://localhost:5173,https://deepfocushub-smiling.vercel.app
     OPENAI_API_KEY=...  # optional
     ```
   - After deploying, Render will expose `https://deepfocus-hub.onrender.com` (or your custom domain).
   - Health check: HTTP `GET /` is already wired up.

3. **Frontend (Vercel):**
   - Build: `npm run build`
   - Output: `dist`
   - Env: `VITE_API_URL=https://deepfocus-hub.onrender.com/api`
   - `client/vercel.json` rewrite `/api/:path*` → `https://deepfocus-hub.onrender.com/api/:path*`
   - After updating envs, redeploy to refresh configuration.

4. Cập nhật `.env` local nếu đổi domain (client `.env`, server `.env`).

---

## 🔐 Lưu ý bảo mật

- Không commit `.env` (đã cấu hình `.gitignore`).
- JWT secret đặt chuỗi đủ dài, nên xoay vòng định kỳ.
- Nếu dùng OpenAI, để API key ở backend, không expose trên client.
- Cân nhắc rate limit hoặc CAPTCHA khi mở public.

---

## 🧭 Lộ trình phát triển tiếp

- Tích hợp email thông báo, nhắc lịch tập trung.
- Hỗ trợ đồng bộ với lịch Google / Outlook.
- Thêm các preset phiên (Pomodoro, Ultradian).
- Dashboard team (theo dõi Deep Work của nhóm).
- Ứng dụng mobile (React Native / Expo).

---

## 📄 Bản quyền & Giấy phép

Dự án thuộc bản quyền của bạn. Nếu muốn chia sẻ hoặc công khai, đề nghị bổ sung giấy phép phù hợp (MIT, Apache-2.0, …) trong repository.

---

## 🙌 Đóng góp

Pull Request / issue / góp ý rất hoan nghênh! Khi gửi PR hãy:
1. Fork repository và tạo branch mới.
2. Giữ coding style nhất quán.
3. Viết mô tả rõ ràng về thay đổi & ảnh hưởng.
