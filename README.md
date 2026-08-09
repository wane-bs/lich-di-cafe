# SmartHangout Engine - Hệ Thống Lên Lịch & Đề Xuất Địa Điểm Đi Chơi Nhóm

Ứng dụng web giúp nhóm bạn tự động tính toán thời gian khả dụng (Heatmap Matrix) và đề xuất địa điểm (cà phê, ăn uống, boardgame, pub) phù hợp nhất với khung giờ đã chốt.

Sản phẩm được xây dựng bằng **Python** (.py) làm Core Engine thực thi trực tiếp trên trình duyệt Web qua **Pyodide WebAssembly (WASM)**, kết hợp với giao diện **HTML5/TailwindCSS** tĩnh triển khai trên **GitHub Pages**.

---

## 🚀 Cấu trúc Thư mục Dự án

```text
lich-di-cafe/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions CI/CD Pipeline
├── src/
│   ├── engine/                  # Core Python Engine
│   │   ├── __init__.py
│   │   ├── models.py            # Data Models (Member, Group, Venue)
│   │   ├── matcher.py           # Thuật toán Ma trận M(d,s) & Score
│   │   └── recommender.py       # Thuật toán lọc & phân điểm địa điểm
│   ├── data/
│   │   └── venues.json          # Cơ sở dữ liệu các địa điểm cafe/giải trí
│   └── web/                     # Web Static Frontend (GitHub Pages Deploy)
│       ├── index.html           # Giao diện chính ứng dụng
│       ├── css/
│       │   └── style.css        # CSS tùy chỉnh & Heatmap styling
│       └── js/
│           ├── app.js           # Quản lý trạng thái & URL State Base64
│           ├── pyodide-bridge.js # Cầu nối JS <-> Python Pyodide WASM
│           └── matrix-ui.js     # Render ma trận nhập & Heatmap
├── tests/                       # Unit Test Suite bằng Python
│   ├── __init__.py
│   ├── test_matcher.py          # Kiểm thử thuật toán khớp lịch
│   └── test_recommender.py      # Kiểm thử thuật toán lọc địa điểm
├── scripts/
│   └── build.py                 # Script kiểm tra hợp lệ dữ liệu build
├── logic-co-ban.md              # Đặc tả thuật toán & logic toán học
├── hangout_schedule_app.html    # MVP tĩnh gốc
├── requirements.txt             # Thư viện phụ thuộc
└── README.md
```

---

## 💻 Chạy & Kiểm thử Cục bộ (Local Development)

### 1. Chạy Kiểm thử Python Engine

```bash
# Chạy toàn bộ Unit Tests bằng Python unittest
python -m unittest discover -s tests

# Hoặc nếu dùng pytest
pytest tests/
```

### 2. Kiểm tra Dữ liệu Địa điểm

```bash
python scripts/build.py
```

### 3. Khởi chạy Web App Cục bộ

```bash
# Chạy HTTP Server tại thư mục src/web
python -m http.server 8000 --directory src/web
```

Trực tiếp mở trình duyệt truy cập: `http://localhost:8000`

---

## 🌐 Triển khai lên GitHub Pages

1. Đẩy mã nguồn lên kho chứa GitHub của bạn:

```bash
git add .
git commit -m "Setup complete Python Engine & Web App structure"
git push origin main
```

2. Workflow trong `.github/workflows/deploy.yml` sẽ tự động chạy kiểm thử `pytest` và deploy trang web tĩnh lên nhánh `gh-pages`.
3. Truy cập trang Web tại đường dẫn: `https://<your-username>.github.io/<repo-name>/`.
