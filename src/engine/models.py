from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

DAYS_OF_WEEK = [
    "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"
]

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
class TimeSlot:
    day_index: int       # 0..6 (T2..CN)
    slot_index: int      # 0..5 (S1..S6)
    day_name: str = ""
    slot_label: str = ""
    slot_tag: str = ""

    def __post_init__(self):
        if 0 <= self.day_index < NUM_DAYS:
            self.day_name = DAYS_OF_WEEK[self.day_index]
        if 0 <= self.slot_index < NUM_SLOTS:
            self.slot_label = TIME_SLOTS[self.slot_index]["label"]
            self.slot_tag = TIME_SLOTS[self.slot_index]["tag"]


@dataclass
class Member:
    id: str
    name: str
    matrix: List[List[int]]  # 7x6 binary matrix

    def __post_init__(self):
        # Validate matrix shape 7x6
        if len(self.matrix) != NUM_DAYS:
            raise ValueError(f"Matrix must have {NUM_DAYS} days")
        for row in self.matrix:
            if len(row) != NUM_SLOTS:
                raise ValueError(f"Each day must have {NUM_SLOTS} slots")


@dataclass
class Group:
    members: List[Member] = field(default_factory=list)
    threshold_pct: float = 0.8  # Threshold percentage (default 80%)

    @property
    def total_members(self) -> int:
        return len(self.members)

    @property
    def min_threshold(self) -> int:
        if self.total_members == 0:
            return 0
        return max(1, int(self.total_members * self.threshold_pct))


@dataclass
class Venue:
    id: str
    name: str
    category: str              # "cafe", "restaurant", "entertainment", "pub"
    time_tags: List[str]       # ["morning", "noon", "afternoon", "evening"]
    price_range: str           # "$", "$$", "$$$"
    capacity: int
    address: str
    tags: List[str]            # ["cà phê", "yên tĩnh", "boardgame", "ăn trưa"]
    rating: float = 4.5
    image_url: str = ""
