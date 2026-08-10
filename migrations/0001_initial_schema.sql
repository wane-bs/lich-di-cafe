-- Cloudflare D1 Initial Migration Schema for Hangout Planner (lich-di-cafe)

-- 1. Bảng Phòng / Phiên Nhóm (Rooms / Group Sessions)
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,               -- Base64 URL-safe Session Token (vd: cGhpZW4tY2EtcGhl)
    group_name TEXT NOT NULL,          -- Tên Nhóm do người tạo đặt (vd: "Hội Cà Phê Cuối Tuần")
    passcode TEXT,                     -- Mã PIN bảo vệ (tùy chọn)
    threshold_pct REAL DEFAULT 0.8,    -- Ngưỡng chốt lịch (mặc định 80%)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Thành viên & Ma trận lịch theo Phiên (Members)
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,             -- Khóa ngoại tham chiếu đến phiên (rooms.id)
    name TEXT NOT NULL,
    matrix_json TEXT NOT NULL,         -- Chuỗi JSON 7x6 [ [0,1,0...], ... ]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 3. Bảng Địa điểm (Venues)
CREATE TABLE IF NOT EXISTS venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    time_tags TEXT NOT NULL,           -- Array JSON ["morning", "evening"]
    price_range TEXT NOT NULL,
    capacity INTEGER DEFAULT 0,
    address TEXT NOT NULL,
    city TEXT DEFAULT 'TP. Hồ Chí Minh',
    ward TEXT DEFAULT 'Phường Bến Nghé',
    lat REAL,
    lng REAL,
    rating REAL DEFAULT 4.5,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Bình chọn Địa điểm Trong Phiên (Room Venue Votes)
CREATE TABLE IF NOT EXISTS room_venue_votes (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    venue_id TEXT NOT NULL,
    voter_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
);

-- Indexing Strategy
CREATE INDEX IF NOT EXISTS idx_members_room_id ON members(room_id);
CREATE INDEX IF NOT EXISTS idx_votes_room_id ON room_venue_votes(room_id);
CREATE INDEX IF NOT EXISTS idx_venues_ward_cat ON venues(ward, category);
