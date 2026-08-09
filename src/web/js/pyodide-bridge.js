/**
 * PyodideBridge: Cầu nối chạy Python Engine trực tiếp trong Trình duyệt (WebAssembly)
 */

window.PyodideBridge = {
    pyodide: null,
    isReady: false,

    async init() {
        try {
            console.log("[PyodideBridge] Khởi tạo Pyodide WebAssembly runtime...");
            if (window.loadPyodide) {
                this.pyodide = await window.loadPyodide();
                console.log("[PyodideBridge] Pyodide đã sẵn sàng. Đang nạp Python Engine...");
                
                // Nạp mã Python Engine trực tiếp vào Pyodide
                await this.loadPythonEngine();
                this.isReady = true;
                console.log("[PyodideBridge] Python Engine nạp thành công!");

                const indicator = document.getElementById("pyodide-status");
                if (indicator) {
                    indicator.innerHTML = '<span class="text-xs bg-green-700/80 text-green-200 px-2.5 py-1 rounded-full"><i class="fa-solid fa-bolt text-yellow-300 mr-1"></i>Python Engine (Pyodide WASM) Ready</span>';
                }
            } else {
                console.warn("[PyodideBridge] Không tìm thấy Pyodide CDN, sử dụng Fallback JS Engine.");
            }
        } catch (err) {
            console.error("[PyodideBridge] Lỗi nạp Pyodide WASM:", err);
        }
    },

    async loadPythonEngine() {
        const pythonCode = `
import json
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"]
TIME_SLOTS = [
    {"id": 0, "name": "S1", "label": "08:00 - 10:00", "tag": "morning"},
    {"id": 1, "name": "S2", "label": "10:00 - 12:00", "tag": "morning"},
    {"id": 2, "name": "S3", "label": "12:00 - 14:00", "tag": "noon"},
    {"id": 3, "name": "S4", "label": "14:00 - 16:00", "tag": "afternoon"},
    {"id": 4, "name": "S5", "label": "16:00 - 18:00", "tag": "afternoon"},
    {"id": 5, "name": "S6", "label": "18:00 - 20:00", "tag": "evening"},
]
NUM_DAYS = 7
NUM_SLOTS = 6

@dataclass
class Member:
    id: str
    name: str
    matrix: List[List[int]]

@dataclass
class Venue:
    id: str
    name: str
    category: str
    time_tags: List[str]
    price_range: str
    capacity: int
    address: str
    tags: List[str]
    city: str = "TP. Hồ Chí Minh"
    ward: str = "Phường Bến Nghé"
    lat: Optional[float] = None
    lng: Optional[float] = None
    rating: float = 4.5
    image_url: str = ""

@dataclass
class Group:
    members: List[Member]
    threshold_pct: float = 0.8

    @property
    def total_members(self) -> int:
        return len(self.members)

    @property
    def min_threshold(self) -> int:
        if self.total_members == 0:
            return 0
        return max(1, int(self.total_members * self.threshold_pct))

class MatcherEngine:
    @staticmethod
    def calculate_aggregate_matrix(group: Group) -> List[List[int]]:
        aggregate = [[0 for _ in range(NUM_SLOTS)] for _ in range(NUM_DAYS)]
        for member in group.members:
            for d in range(NUM_DAYS):
                for s in range(NUM_SLOTS):
                    aggregate[d][s] += member.matrix[d][s]
        return aggregate

    @staticmethod
    def calculate_continuity_bonus(aggregate: List[List[int]]) -> List[List[float]]:
        bonus = [[0.0 for _ in range(NUM_SLOTS)] for _ in range(NUM_DAYS)]
        for d in range(NUM_DAYS):
            for s in range(NUM_SLOTS):
                if aggregate[d][s] == 0:
                    continue
                prev_m = aggregate[d][s - 1] if s > 0 else 0
                next_m = aggregate[d][s + 1] if s < NUM_SLOTS - 1 else 0
                bonus[d][s] = (prev_m * 0.5) + (next_m * 0.5)
        return bonus

    @classmethod
    def analyze_schedule(cls, group: Group) -> Dict[str, Any]:
        n = group.total_members
        if n == 0:
            return {
                "aggregate_matrix": [[0]*NUM_SLOTS for _ in range(NUM_DAYS)],
                "ranked_slots": [],
                "optimal_slots": [],
                "sub_optimal_slots": [],
                "conflict_slots": [],
                "summary": {"total_members": 0, "optimal_count": 0, "sub_optimal_count": 0}
            }

        k = group.min_threshold
        M = cls.calculate_aggregate_matrix(group)
        continuity = cls.calculate_continuity_bonus(M)

        all_slots = []
        for d in range(NUM_DAYS):
            for s in range(NUM_SLOTS):
                available_count = M[d][s]
                avail_members = [m.name for m in group.members if m.matrix[d][s] == 1]
                absent_members = [m.name for m in group.members if m.matrix[d][s] == 0]

                if available_count == n:
                    status = "optimal"
                elif available_count >= k:
                    status = "sub_optimal"
                else:
                    status = "conflict"

                score = available_count * 10.0 + continuity[d][s]

                slot_info = {
                    "day_index": d,
                    "slot_index": s,
                    "day_name": DAYS_OF_WEEK[d],
                    "slot_label": TIME_SLOTS[s]["label"],
                    "slot_tag": TIME_SLOTS[s]["tag"],
                    "available_count": available_count,
                    "total_members": n,
                    "score": round(score, 2),
                    "status": status,
                    "available_members": avail_members,
                    "absent_members": absent_members
                }
                all_slots.append(slot_info)

        ranked_slots = sorted(all_slots, key=lambda x: (x["score"], x["available_count"]), reverse=True)
        optimal_slots = [s for s in ranked_slots if s["status"] == "optimal"]
        sub_optimal_slots = [s for s in ranked_slots if s["status"] == "sub_optimal"]
        conflict_slots = [s for s in ranked_slots if s["status"] == "conflict"]

        return {
            "aggregate_matrix": M,
            "ranked_slots": ranked_slots,
            "optimal_slots": optimal_slots,
            "sub_optimal_slots": sub_optimal_slots,
            "conflict_slots": conflict_slots,
            "summary": {
                "total_members": n,
                "threshold_k": k,
                "optimal_count": len(optimal_slots),
                "sub_optimal_count": len(sub_optimal_slots),
                "conflict_count": len(conflict_slots)
            }
        }

def py_analyze_group_json(members_json_str):
    raw_members = json.loads(members_json_str)
    members = [Member(id=m['id'], name=m['name'], matrix=m['matrix']) for m in raw_members]
    group = Group(members=members)
    result = MatcherEngine.analyze_schedule(group)
    return json.dumps(result, ensure_ascii=False)
`;
        await this.pyodide.runPythonAsync(pythonCode);
    },

    analyzeSchedule(members) {
        if (this.isReady && this.pyodide) {
            try {
                const membersJson = JSON.stringify(members);
                const jsonStrResult = this.pyodide.globals.get('py_analyze_group_json')(membersJson);
                return JSON.parse(jsonStrResult);
            } catch (err) {
                console.error("[PyodideBridge] Exception during Python analysis execution:", err);
            }
        }
        return null;
    }
};
