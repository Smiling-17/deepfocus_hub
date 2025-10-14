# DeepFocus Hub

> 🎯 **Trải nghiệm ngay:** [https://deepfocushub-smiling.vercel.app](https://deepfocushub-smiling.vercel.app)

DeepFocus Hub là “trợ lý tập trung” dành cho những ai muốn xây dựng thói quen Deep Work. Ứng dụng giúp bạn lập lịch, thực hiện, đánh giá và phân tích từng phiên tập trung nhờ hệ thống thống kê – gamification – AI.

<p align="center">
  <img src="./client/public/Calistya.png" alt="DeepFocus Hub Logo" height="128" />
</p>

---

## 🌟 Tính năng nổi bật

### 1. Xác thực & Quản lý người dùng
- Đăng ký/đăng nhập bằng username & mật khẩu (bcrypt + JWT).
- Token lưu ở client và kiểm tra bằng middleware `protect` cho mọi API bảo vệ.
- Trải nghiệm onboarding nhẹ nhàng: đăng ký → giới thiệu → dashboard.

### 2. Lịch nhiệm vụ & Bảng điều khiển
- Timeline nhiệm vụ theo ngày với trạng thái trực quan.
- Thêm / sửa / xóa / đánh dấu hoàn thành nhiệm vụ gắn `userId`.
- Checklist con & ghi chú tiến độ cho từng nhiệm vụ.
- Modal “Mục tiêu phiên” giúp khởi tạo Deep Work nhanh.

### 3. Không Gian Tập Trung
- Đồng hồ đếm ngược dạng vòng tròn, tự thu phóng theo màn hình.
- Tạm dừng tối đa 2 lần, mỗi lần 3 phút; ghi lại thời điểm xao nhãng.
- Ghi chú nhanh, lưu tự động; âm báo và auto chuyển sang màn đánh giá khi hết giờ.
- Chế độ toàn màn hình (immersive mode) cho trải nghiệm tập trung tuyệt đối.

### 4. Đánh giá & Lưu dữ liệu phiên
- Mỗi phiên lưu mục tiêu, thời lượng đặt ra/thực tế, số lần xao nhãng, ghi chú, điểm thưởng, đánh giá 1–5 sao.
- Màn đánh giá sau phiên cho phép bạn tổng kết nhanh và chấm điểm.

### 5. Thống kê & Gamification
- **Reset theo tháng**: Tổng giờ Deep Work, Điểm tập trung, Heatmap, Phân phối đánh giá, Khung giờ tập trung, Thống kê theo tuần, Tóm tắt nhiệm vụ sẽ tự động reset vào ngày đầu tháng mới.
- **Giữ nguyên theo toàn thời gian**: Chuỗi tập trung hiện tại (streak), Huy hiệu & thành tựu – giúp bạn duy trì động lực dài hạn.
- Heatmap theo ngày, breakdown theo tuần ISO, biểu đồ phân phối đánh giá, khung giờ tập trung đa sắc, tóm tắt dự án.
- Huy hiệu (badge) theo các cột mốc quan trọng.
- AI phân tích cá nhân hóa dựa trên dữ liệu gần nhất (OpenAI).

### 6. Giao diện & Trải nghiệm
- Dark/Light mode, giao diện gradient mượt mà, animation GSAP.
- Form đăng nhập/đăng ký sinh động, checkbox animation.
- Responsive mobile-first, hỗ trợ bàn phím & ARIA cho accessibility.

---

## 🧰 Công nghệ sử dụng

| Thành phần   | Công nghệ chính                                                                 |
|--------------|----------------------------------------------------------------------------------|
| Frontend     | React 18 + Vite, Tailwind CSS, Day.js, GSAP, Axios, React Router                |
| Backend      | Node.js, Express.js, Mongoose, JSON Web Token, bcrypt                           |
| Cơ sở dữ liệu| MongoDB (Atlas hoặc self-host)                                                  |
| Xác thực     | JWT Bearer + middleware `protect`                                               |
| AI (tùy chọn)| OpenAI Responses API (`gpt-4o-mini`)                                            |
| Triển khai   | Backend: Render (`https://deepfocus-hub.onrender.com`), Frontend: Vercel        |

---

## 🗂️ Cấu trúc thư mục

```
DeepFocus_Hub/
├── client/                   # Frontend (React + Vite)
│   ├── public/               # Tài nguyên tĩnh (logo, background, ...)
│   └── src/
│       ├── components/       # ThemeToggle, AnimatedInput, ...
│       ├── context/          # ThemeContext, AuthContext
│       ├── layouts/          # AppLayout
│       ├── pages/            # Login, Register, Dashboard, FocusArena, Statistics, ...
│       ├── utils/            # apiClient (Axios), dayjs helper
│       └── index.css         # Tailwind + custom style
├── server/                   # Backend (Express + Mongoose)
│   └── src/
│       ├── config/           # Kết nối MongoDB
│       ├── controllers/      # auth, tasks, sessions, stats, insights
│       ├── middleware/       # protect, error handler
│       ├── models/           # User, Task, DeepWorkSession
│       └── routes/           # Router Express
├── README.md
└── ...
```

---

## ⚙️ Cài đặt & chạy local

### Yêu cầu
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
cp .env.example .env        # cập nhật MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN, ...

# Frontend
cd ../client
npm install
cp .env.example .env        # chỉnh VITE_API_URL (ví dụ http://localhost:5000/api)
```

### 2. Chạy local
```bash
# Terminal 1 - Backend
cd server
npm run dev                 # Express chạy tại PORT (mặc định 5000)

# Terminal 2 - Frontend
cd client
npm run dev                 # Vite chạy tại http://localhost:5173
```

---

## 🚀 Triển khai nhanh

1. **MongoDB Atlas**: tạo cluster, lấy connection string và whitelist IP.
2. **Backend (Render)**  
   - Root directory: `server/`  
   - Build command: `npm install`  
   - Start command: `npm start`  
   - Env cần thiết:
     ```
     MONGODB_URI=...
     JWT_SECRET=...
     CLIENT_ORIGIN=http://localhost:5173,https://deepfocushub-smiling.vercel.app
     OPENAI_API_KEY=... # tùy chọn
     ```
3. **Frontend (Vercel)**  
   - Build command: `npm run build`  
   - Output: `dist`  
   - Env: `VITE_API_URL=https://deepfocus-hub.onrender.com/api`  
   - `client/vercel.json` đã cấu hình rewrite `/api/:path*` → backend Render.

---

## 🔐 Lưu ý bảo mật

- Không commit file `.env`; đã có `.gitignore` chặn.
- Đặt `JWT_SECRET` đủ dài, thay đổi định kỳ nếu cần.
- Chỉ sử dụng OpenAI API key ở backend; không để lộ ở client.
- Khi mở public, cân nhắc thêm rate limit, CAPTCHA, giám sát logs.

---

## 🛣️ Hướng phát triển tiếp theo

- Nhắc lịch & báo cáo định kỳ qua email.
- Đồng bộ lịch với Google / Outlook.
- Preset phiên (Pomodoro, Ultradian).
- Dashboard nhóm (Deep Work cho team).
- Ứng dụng mobile (React Native / Expo).

---

## 🤝 Đóng góp

Rất hoan nghênh mọi đóng góp! Khi gửi PR:
1. Fork repository, tạo branch riêng.
2. Giữ phong cách code nhất quán, thêm chú thích khi cần.
3. Mô tả rõ thay đổi và ảnh hưởng trong phần mô tả PR.

Chúc bạn có những giờ Deep Work hiệu quả! 🚀
