from typing import List, Dict, Any, Optional
from .models import Venue

class RecommenderEngine:
    """
    Thuật toán lọc và xếp hạng địa điểm đi chơi/cà phê theo khung giờ và sở thích.
    """

    @staticmethod
    def filter_and_rank_venues(
        venues: List[Venue],
        slot_tag: str,
        group_size: int = 1,
        preferences: Optional[List[str]] = None,
        max_price: Optional[str] = None,
        category: Optional[str] = None,
        city: Optional[str] = None,
        ward: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lọc cứng (Hard Filter) và Phân điểm (Scoring) danh sách địa điểm.
        """
        if preferences is None:
            preferences = []

        scored_venues = []

        for venue in venues:
            # 1. Hard Filter: Time tag match (Ngoại trừ trường hợp venue phù hợp mọi khung giờ "all")
            if slot_tag not in venue.time_tags and "all" not in venue.time_tags:
                continue

            # 2. Hard Filter: Sức chứa vừa nhóm
            if venue.capacity < group_size:
                continue

            # 3. Hard Filter: Category nếu được yêu cầu
            if category and category != "all" and venue.category != category:
                continue

            # 4. Hard Filter: City nếu được yêu cầu
            if city and city != "all" and venue.city.lower() != city.lower():
                continue

            # 5. Hard Filter: Ward (Xã/Phường) nếu được yêu cầu
            if ward and ward != "all" and venue.ward.lower() != ward.lower():
                continue

            # --- SOFT FILTER & SCORING ---
            score = 0.0

            # Tag preference matching bonus (+10 điểm mỗi tag trùng)
            pref_matches = 0
            if preferences:
                for pref in preferences:
                    if any(pref.lower() in t.lower() for t in venue.tags):
                        pref_matches += 1
                score += pref_matches * 10.0

            # Rating score (+ rating * 5 điểm)
            score += venue.rating * 5.0

            # Price preference bonus
            if max_price:
                if venue.price_range == max_price:
                    score += 5.0

            scored_venues.append({
                "venue": {
                    "id": venue.id,
                    "name": venue.name,
                    "category": venue.category,
                    "time_tags": venue.time_tags,
                    "price_range": venue.price_range,
                    "capacity": venue.capacity,
                    "address": venue.address,
                    "city": venue.city,
                    "ward": venue.ward,
                    "lat": venue.lat,
                    "lng": venue.lng,
                    "tags": venue.tags,
                    "rating": venue.rating,
                    "image_url": venue.image_url
                },
                "score": round(score, 2),
                "pref_matches": pref_matches
            })

        # Sort by score descending, then rating descending
        ranked = sorted(scored_venues, key=lambda x: (x["score"], x["venue"]["rating"]), reverse=True)
        return ranked
