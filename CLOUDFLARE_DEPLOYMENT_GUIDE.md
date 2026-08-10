# Hướng Dẫn Kỹ Thuật & Lưu Ý Triển Khai Full-Stack Hangout Planner Trên Cloudflare

Tệp tài liệu này ghi nhận toàn bộ ngữ cảnh (context), quyết định kiến trúc và các lưu ý kỹ thuật quan trọng khi vận hành và triển khai ứng dụng **Hangout Planner (Lịch Đi Cafe)** lên **Cloudflare Pages & Cloudflare D1 Database**.

---

## 🏗️ 1. Tổng Quan Kiến Trúc Full-Stack (Full-Stack Architecture)

| Tầng (Layer) | Công Nghệ / Thư Mục | Vai Trò & Cơ Chế Hoạt Động |
| :--- | :--- | :--- |
| **Frontend** | Static Assets (`src/web`) | Giao diện HTML5, Vanilla JS, Tailwind CSS CDN. Được phân phối qua CDN Edge toàn cầu của Cloudflare. |
| **Backend API** | Cloudflare Pages Functions (`functions/api/[[path]].ts`) | Sử dụng framework **Hono (TypeScript)** chạy trên V8 Edge Workers. |
| **Database** | Cloudflare D1 Database (`migrations/0001_initial_schema.sql`) | CSDL quan hệ SQL SQLite chuẩn Edge. Kết nối với Backend thông qua binding `env.DB`. |
| **Core Engine** | TypeScript Engine (`src/engine_ts/`) | Port từ Python Engine, thực thi thuật toán khớp lịch 7x6 và lọc địa điểm phù hợp trực tiếp tại Edge & Client. |

---

## 🔑 2. Quản Lý Phiên Lịch Nhóm Độc Lập (Group Sessions & Base64 Token)

- **Khởi Tạo Phiên**: Người dùng đặt **Tên Nhóm** (vd: *"Hội Cà Phê Cuối Tuần"*).
- **Mã Định Danh Base64**: Tự động sinh mã `session_id` URL-safe Base64 độc lập.
- **Link Chia Sẻ Phiên**: Đường dẫn riêng biệt theo dạng `https://lichdicafe.pages.dev/?room=<BASE64_SESSION_ID>`.
- **Phân Lập Dữ Liệu**: Mọi ma trận khả dụng của các thành viên và bình chọn địa điểm được phân lập tuyệt đối bằng `room_id` trong Cloudflare D1 Database.

---

## ⚠️ 3. Các Lưu Ý Kỹ Thuật Quan Trọng Khi Deploy Trực Tiếp Trên Cloudflare Pages

### 🛑 1. Không dùng khối `[build]` trong tệp `wrangler.toml`
- **Lưu ý**: Tệp [wrangler.toml](file:///d:/DebianBackup/source_code/lich-di-cafe/wrangler.toml) dành cho **Cloudflare Pages** **KHÔNG ĐƯỢC CHỨA KHỐI `[build]`** (`[build] command = "..."`).
- **Lý do**: Bộ kiểm tra của Cloudflare Pages sẽ báo lỗi `Configuration file for Pages projects does not support "build"`. Lệnh build phải được định nghĩa trong `package.json` (`"build": "python scripts/build.py"`).

### 🛑 2. Không dùng lệnh Deploy Worker (`npx wrangler deploy`) cho Pages
- **Lưu ý**: Ô **Deploy command** trên giao diện Cloudflare Pages **PHẢI ĐỂ TRỐNG (BLANK)**.
- **Lý do**: Lệnh `wrangler deploy` dành riêng cho Cloudflare Worker thuần. Đối với Cloudflare Pages, sau khi hoàn thành Build command, Cloudflare sẽ tự động publish thư mục `src/web` và tự động gắn thư mục `functions/api/`.

### 🛑 3. Liên kết D1 Database Binding trong Cloudflare Dashboard
- **Thao tác bắt buộc**: Sau khi khởi tạo Pages project trên Dashboard:
  - Vào **Settings** ➡️ **Functions** ➡️ Cuộn xuống **D1 Database bindings** ➡️ Bấm **Add binding**:
    - **Variable name**: `DB` *(Viết hoa 2 chữ cái)*
    - **D1 Database**: Chọn `lich-di-cafe-db`

---

## 🛠️ 4. Quy Trình Khởi Tạo & Deploy Chi Tiết Từ Đầu

### Bước 1: Khởi Tạo CSDL D1 & Chạy Remote Migration
```bash
# 1. Đăng nhập Wrangler
npx wrangler login

# 2. Áp dụng schema migration lên Cloudflare D1 Cloud
npx wrangler d1 migrations apply lich-di-cafe-db --remote
```

### Bước 2: Khởi Tạo Project Trên Cloudflare Dashboard
1. Truy cập Cloudflare Dashboard ➡️ **Workers & Pages** ➡️ Bấm nút **Create application**.
2. Nhìn bên dưới thẻ trắng lớn, bấm vào dòng chữ: **`Looking to deploy Pages? Get started`**.
3. Chọn **Connect to Git** ➡️ Chọn repository `wane-bs/lich-di-cafe` ➡️ Branch `main`.
4. Điền thiết lập:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `src/web`
   - **Deploy command**: *(Để trống)*
5. Bấm **Save and Deploy**.

### Bước 3: Cấu Hình GitHub Actions CI/CD (Tùy Chọn)
Nếu muốn GitHub Actions tự động kiểm thử và deploy mỗi khi push code, thêm 2 Secret tại **GitHub Repo Settings** ➡️ **Secrets and variables** ➡️ **Actions**:
- `CLOUDFLARE_API_TOKEN`: API Token tạo từ Cloudflare Dashboard.
- `CLOUDFLARE_ACCOUNT_ID`: Account ID lấy tại trang chủ Cloudflare Dashboard.
