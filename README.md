# Hangout Planner (Lịch Đi Cafe) - Cloudflare Pages Full-Stack Web App

Ứng dụng web hỗ trợ nhóm bạn tự động tính toán thời gian rảnh chung (Heatmap Matrix), chốt phiên lịch nhóm độc lập và gợi ý địa điểm (cà phê, ăn uống, giải trí, pub) phù hợp nhất.

Dự án hiện được tái cấu trúc thành ứng dụng **Full-Stack sản xuất trên Cloudflare Pages**, bao gồm **Hono TypeScript Backend API**, **Cloudflare D1 SQL Database** và **TypeScript Core Engine** tại Edge.

---

## 📖 Hướng Dẫn & Lưu Ý Triển Khai Cloudflare

Chi tiết toàn bộ quyết định kiến trúc, lưu ý lỗi cấu hình và hướng dẫn deploy từng bước có tại:
👉 **[CLOUDFLARE_DEPLOYMENT_GUIDE.md](file:///d:/DebianBackup/source_code/lich-di-cafe/CLOUDFLARE_DEPLOYMENT_GUIDE.md)**

---

## 🚀 Cấu Trúc Thư Mục Dự Án

```text
lich-di-cafe/
├── .github/
│   └── workflows/
│       └── cloudflare-pages.yml  # GitHub Actions CI/CD Pipeline cho Cloudflare
├── functions/
│   └── api/
│       └── [[path]].ts           # Hono TypeScript Backend REST API (Edge Functions)
├── migrations/
│   └── 0001_initial_schema.sql  # Schema D1 Database cho Rooms, Members, Venues, Votes
├── src/
│   ├── engine_ts/                # Core TypeScript Engine (Matcher & Recommender)
│   │   ├── models.ts
│   │   ├── matcher.ts
│   │   └── recommender.ts
│   ├── engine/                   # Legacy Python Engine
│   └── web/                      # Static Frontend (Deployed on Cloudflare Pages)
│       ├── index.html            # Giao diện chính với Modal Khởi tạo Phiên Nhóm
│       ├── css/
│       └── js/
│           ├── app.js            # Client App kết nối REST API & Base64 Session Link
│           └── matrix-ui.js      # Component Ma trận 7x6 & Heatmap
├── tests/
│   ├── engine_ts.test.ts         # Vitest/Node Unit Tests cho TS Engine
│   └── test_matcher.py           # Unit Tests cho Python Engine
├── package.json                  # Npm scripts & dependencies (Hono, Wrangler, TS)
├── wrangler.toml                 # Cloudflare D1 Database binding configuration
├── CLOUDFLARE_DEPLOYMENT_GUIDE.md # Tệp hướng dẫn & lưu ý deploy Cloudflare đầy đủ
└── README.md
```

---

## 💻 Kiểm Thử & Phát Triển Cục Bộ (Local Development)

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Chạy kiểm thử tự động (TypeScript Engine & Python Engine)
npm test

# 3. Khởi chạy thử nghiệm Cloudflare Pages & API local
npx wrangler pages dev src/web
```
