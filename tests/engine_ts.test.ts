import assert from "node:assert";
import { test, describe } from "node:test";
import { MatcherEngine } from "../src/engine_ts/matcher";
import { RecommenderEngine } from "../src/engine_ts/recommender";
import { Member, Group, Venue } from "../src/engine_ts/models";

describe("MatcherEngine (TypeScript)", () => {
    test("calculates aggregate matrix correctly", () => {
        const m1: Member = {
            id: "u1",
            name: "Alice",
            matrix: [
                [1, 0, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
            ],
        };

        const m2: Member = {
            id: "u2",
            name: "Bob",
            matrix: [
                [1, 1, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
            ],
        };

        const group: Group = {
            members: [m1, m2],
            threshold_pct: 0.8,
        };

        const result = MatcherEngine.analyzeSchedule(group);

        assert.strictEqual(result.summary.total_members, 2);
        assert.strictEqual(result.aggregate_matrix[0][0], 2); // Alice + Bob
        assert.strictEqual(result.aggregate_matrix[0][1], 1); // Only Bob
        assert.strictEqual(result.optimal_slots.length, 2); // (0,0) and (1,1)
        assert.strictEqual(result.optimal_slots[0].day_index, 0);
        assert.strictEqual(result.optimal_slots[0].slot_index, 0);
    });

    test("handles empty group", () => {
        const group: Group = { members: [], threshold_pct: 0.8 };
        const result = MatcherEngine.analyzeSchedule(group);
        assert.strictEqual(result.summary.total_members, 0);
        assert.strictEqual(result.ranked_slots.length, 0);
    });
});

describe("RecommenderEngine (TypeScript)", () => {
    const mockVenues: Venue[] = [
        {
            id: "v1",
            name: "Highlands Coffee",
            category: "cafe",
            time_tags: ["morning", "afternoon"],
            price_range: "$$",
            capacity: 20,
            address: "123 Le Loi",
            city: "TP. Hồ Chí Minh",
            ward: "Phường Bến Nghé",
            rating: 4.5,
            tags: ["cà phê", "yên tĩnh"],
            image_url: "",
        },
        {
            id: "v2",
            name: "Nhà hàng Ăn Trưa",
            category: "restaurant",
            time_tags: ["noon"],
            price_range: "$$$",
            capacity: 50,
            address: "456 Nguyen Hue",
            city: "TP. Hồ Chí Minh",
            ward: "Phường Bến Nghé",
            rating: 4.8,
            tags: ["ăn trưa", "món việt"],
            image_url: "",
        },
    ];

    test("filters venues by slot tag and capacity", () => {
        const results = RecommenderEngine.filterAndRankVenues(mockVenues, {
            slot_tag: "morning",
            group_size: 5,
        });

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].venue.id, "v1");
    });
});
