from typing import List, Dict, Any, Tuple
from .models import Group, Member, NUM_DAYS, NUM_SLOTS, DAYS_OF_WEEK, TIME_SLOTS

class MatcherEngine:
    """
    Thuật toán khớp lịch và phân tích ma trận tổng hợp nhóm.
    """

    @staticmethod
    def calculate_aggregate_matrix(group: Group) -> List[List[int]]:
        """
        Tính Ma trận Tổng hợp M(d, s) = sum_{i=1}^{n} A_{u_i}(d, s)
        """
        aggregate = [[0 for _ in range(NUM_SLOTS)] for _ in range(NUM_DAYS)]
        for member in group.members:
            for d in range(NUM_DAYS):
                for s in range(NUM_SLOTS):
                    aggregate[d][s] += member.matrix[d][s]
        return aggregate

    @staticmethod
    def calculate_continuity_bonus(aggregate: List[List[int]]) -> List[List[float]]:
        """
        Tính điểm thưởng độ liền mạch (Continuous Slot Score)
        Nếu slot liền kề (s-1 hoặc s+1 cùng ngày) có M >= threshold thì cộng bonus.
        """
        bonus = [[0.0 for _ in range(NUM_SLOTS)] for _ in range(NUM_DAYS)]
        for d in range(NUM_DAYS):
            for s in range(NUM_SLOTS):
                current_m = aggregate[d][s]
                if current_m == 0:
                    continue
                # Check previous slot
                prev_m = aggregate[d][s - 1] if s > 0 else 0
                # Check next slot
                next_m = aggregate[d][s + 1] if s < NUM_SLOTS - 1 else 0
                
                # Bonus if adjacent slots also have available members
                bonus[d][s] = (prev_m * 0.5) + (next_m * 0.5)
        return bonus

    @classmethod
    def analyze_schedule(cls, group: Group) -> Dict[str, Any]:
        """
        Phân tích chi tiết và xếp hạng các khung giờ theo logic-co-ban.md
        """
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

                # Classification
                if available_count == n:
                    status = "optimal"
                elif available_count >= k:
                    status = "sub_optimal"
                else:
                    status = "conflict"

                # Composite score: count * 10 + continuity_bonus
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

        # Sort slots by score descending, then available_count descending
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
