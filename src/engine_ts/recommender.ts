import { Venue } from "./models";

export interface FilterOptions {
    slot_tag: string;
    group_size?: number;
    preferences?: string[];
    max_price?: string;
    category?: string;
    city?: string;
    ward?: string;
}

export interface RankedVenueResult {
    venue: Venue;
    score: number;
    pref_matches: number;
}

export class RecommenderEngine {
    /**
     * Lọc cứng (Hard Filter) và Phân điểm (Scoring) danh sách địa điểm.
     */
    static filterAndRankVenues(
        venues: Venue[],
        options: FilterOptions
    ): RankedVenueResult[] {
        const {
            slot_tag,
            group_size = 1,
            preferences = [],
            max_price,
            category,
            city,
            ward
        } = options;

        const scoredVenues: RankedVenueResult[] = [];

        for (const venue of venues) {
            // 1. Hard Filter: Time tag match
            const hasTimeTag =
                venue.time_tags.includes(slot_tag) || venue.time_tags.includes("all");
            if (!hasTimeTag) continue;

            // 2. Hard Filter: Sức chứa vừa nhóm
            if (venue.capacity < group_size) continue;

            // 3. Hard Filter: Category nếu được yêu cầu
            if (category && category !== "all" && venue.category !== category) continue;

            // 4. Hard Filter: City nếu được yêu cầu
            if (city && city !== "all" && venue.city.toLowerCase() !== city.toLowerCase()) continue;

            // 5. Hard Filter: Ward nếu được yêu cầu
            if (ward && ward !== "all" && venue.ward.toLowerCase() !== ward.toLowerCase()) continue;

            // --- SOFT FILTER & SCORING ---
            let score = 0.0;
            let prefMatches = 0;

            if (preferences && preferences.length > 0) {
                for (const pref of preferences) {
                    const prefLower = pref.toLowerCase();
                    if (venue.tags.some((t) => t.toLowerCase().includes(prefLower))) {
                        prefMatches += 1;
                    }
                }
                score += prefMatches * 10.0;
            }

            score += (venue.rating || 4.5) * 5.0;

            if (max_price && venue.price_range === max_price) {
                score += 5.0;
            }

            scoredVenues.push({
                venue,
                score: Number(score.toFixed(2)),
                pref_matches: prefMatches
            });
        }

        // Sort by score descending, then rating descending
        scoredVenues.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.venue.rating - a.venue.rating;
        });

        return scoredVenues;
    }
}
