import {
    Group,
    Member,
    NUM_DAYS,
    NUM_SLOTS,
    DAYS_OF_WEEK,
    TIME_SLOTS,
    SlotAnalysis,
    ScheduleAnalysisResult
} from "./models";

export class MatcherEngine {
    /**
     * Tính Ma trận Tổng hợp M(d, s) = sum_{i=1}^{n} A_{u_i}(d, s)
     */
    static calculateAggregateMatrix(group: Group): number[][] {
        const aggregate: number[][] = Array.from({ length: NUM_DAYS }, () =>
            Array(NUM_SLOTS).fill(0)
        );

        for (const member of group.members) {
            for (let d = 0; d < NUM_DAYS; d++) {
                for (let s = 0; s < NUM_SLOTS; s++) {
                    if (member.matrix && member.matrix[d] && member.matrix[d][s]) {
                        aggregate[d][s] += member.matrix[d][s];
                    }
                }
            }
        }
        return aggregate;
    }

    /**
     * Tính điểm thưởng độ liền mạch (Continuous Slot Score)
     */
    static calculateContinuityBonus(aggregate: number[][]): number[][] {
        const bonus: number[][] = Array.from({ length: NUM_DAYS }, () =>
            Array(NUM_SLOTS).fill(0)
        );

        for (let d = 0; d < NUM_DAYS; d++) {
            for (let s = 0; s < NUM_SLOTS; s++) {
                const currentM = aggregate[d][s];
                if (currentM === 0) continue;

                const prevM = s > 0 ? aggregate[d][s - 1] : 0;
                const nextM = s < NUM_SLOTS - 1 ? aggregate[d][s + 1] : 0;

                bonus[d][s] = prevM * 0.5 + nextM * 0.5;
            }
        }
        return bonus;
    }

    /**
     * Phân tích chi tiết và xếp hạng các khung giờ
     */
    static analyzeSchedule(group: Group): ScheduleAnalysisResult {
        const n = group.members.length;
        if (n === 0) {
            return {
                aggregate_matrix: Array.from({ length: NUM_DAYS }, () => Array(NUM_SLOTS).fill(0)),
                ranked_slots: [],
                optimal_slots: [],
                sub_optimal_slots: [],
                conflict_slots: [],
                summary: {
                    total_members: 0,
                    threshold_k: 0,
                    optimal_count: 0,
                    sub_optimal_count: 0,
                    conflict_count: 0
                }
            };
        }

        const thresholdPct = group.threshold_pct ?? 0.8;
        const k = Math.max(1, Math.floor(n * thresholdPct));
        const M = this.calculateAggregateMatrix(group);
        const continuity = this.calculateContinuityBonus(M);

        const allSlots: SlotAnalysis[] = [];

        for (let d = 0; d < NUM_DAYS; d++) {
            for (let s = 0; s < NUM_SLOTS; s++) {
                const availableCount = M[d][s];
                const availMembers: string[] = [];
                const absentMembers: string[] = [];

                for (const member of group.members) {
                    if (member.matrix && member.matrix[d] && member.matrix[d][s] === 1) {
                        availMembers.push(member.name);
                    } else {
                        absentMembers.push(member.name);
                    }
                }

                let status: "optimal" | "sub_optimal" | "conflict";
                if (availableCount === n) {
                    status = "optimal";
                } else if (availableCount >= k) {
                    status = "sub_optimal";
                } else {
                    status = "conflict";
                }

                const score = availableCount * 10.0 + continuity[d][s];

                allSlots.push({
                    day_index: d,
                    slot_index: s,
                    day_name: DAYS_OF_WEEK[d],
                    slot_label: TIME_SLOTS[s].label,
                    slot_tag: TIME_SLOTS[s].tag,
                    available_count: availableCount,
                    total_members: n,
                    score: Number(score.toFixed(2)),
                    status,
                    available_members: availMembers,
                    absent_members: absentMembers
                });
            }
        }

        // Sort by score descending, then available_count descending
        const rankedSlots = [...allSlots].sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.available_count - a.available_count;
        });

        const optimalSlots = rankedSlots.filter((s) => s.status === "optimal");
        const subOptimalSlots = rankedSlots.filter((s) => s.status === "sub_optimal");
        const conflictSlots = rankedSlots.filter((s) => s.status === "conflict");

        return {
            aggregate_matrix: M,
            ranked_slots: rankedSlots,
            optimal_slots: optimalSlots,
            sub_optimal_slots: subOptimalSlots,
            conflict_slots: conflictSlots,
            summary: {
                total_members: n,
                threshold_k: k,
                optimal_count: optimalSlots.length,
                sub_optimal_count: subOptimalSlots.length,
                conflict_count: conflictSlots.length
            }
        };
    }
}
