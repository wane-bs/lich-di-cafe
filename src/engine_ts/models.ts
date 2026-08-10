export const DAYS_OF_WEEK = [
    "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"
];

export const TIME_SLOTS = [
    { id: 0, name: "S1", label: "08:00 - 10:00", tag: "morning" },
    { id: 1, name: "S2", label: "10:00 - 12:00", tag: "morning" },
    { id: 2, name: "S3", label: "12:00 - 14:00", tag: "noon" },
    { id: 3, name: "S4", label: "14:00 - 16:00", tag: "afternoon" },
    { id: 4, name: "S5", label: "16:00 - 18:00", tag: "afternoon" },
    { id: 5, name: "S6", label: "18:00 - 20:00", tag: "evening" },
];

export const NUM_DAYS = 7;
export const NUM_SLOTS = 6;

export interface Member {
    id: str;
    name: string;
    matrix: number[][]; // 7x6 binary matrix
}

export interface Group {
    members: Member[];
    threshold_pct: number; // e.g. 0.8
}

export interface Venue {
    id: string;
    name: string;
    category: string;
    time_tags: string[];
    price_range: string;
    capacity: number;
    address: string;
    tags: string[];
    city: string;
    ward: string;
    lat?: number | null;
    lng?: number | null;
    rating: number;
    image_url: string;
}

export interface SlotAnalysis {
    day_index: number;
    slot_index: number;
    day_name: string;
    slot_label: string;
    slot_tag: string;
    available_count: number;
    total_members: number;
    score: number;
    status: "optimal" | "sub_optimal" | "conflict";
    available_members: string[];
    absent_members: string[];
}

export interface ScheduleAnalysisResult {
    aggregate_matrix: number[][];
    ranked_slots: SlotAnalysis[];
    optimal_slots: SlotAnalysis[];
    sub_optimal_slots: SlotAnalysis[];
    conflict_slots: SlotAnalysis[];
    summary: {
        total_members: number;
        threshold_k: number;
        optimal_count: number;
        sub_optimal_count: number;
        conflict_count: number;
    };
}
type str = string;
