import unittest
from src.engine.models import Venue
from src.engine.recommender import RecommenderEngine

class TestRecommenderEngine(unittest.TestCase):

    def setUp(self):
        self.sample_venues = [
            Venue(
                id="v1",
                name="Morning Coffee",
                category="cafe",
                time_tags=["morning"],
                price_range="$$",
                capacity=20,
                address="District 1",
                city="TP. Hồ Chí Minh",
                ward="Phường Bến Nghé",
                lat=10.78,
                lng=106.70,
                tags=["cà phê", "yên tĩnh"],
                rating=4.8
            ),
            Venue(
                id="v2",
                name="Evening Pub",
                category="pub",
                time_tags=["evening"],
                price_range="$$$",
                capacity=50,
                address="District 3",
                city="TP. Hồ Chí Minh",
                ward="Phường Võ Thị Sáu",
                lat=10.78,
                lng=106.69,
                tags=["nhạc sống", "acoustic", "pub"],
                rating=4.9
            )
        ]

    def test_time_based_filter(self):
        morning_results = RecommenderEngine.filter_and_rank_venues(
            venues=self.sample_venues,
            slot_tag="morning",
            group_size=4
        )
        self.assertEqual(len(morning_results), 1)
        self.assertEqual(morning_results[0]["venue"]["id"], "v1")

        evening_results = RecommenderEngine.filter_and_rank_venues(
            venues=self.sample_venues,
            slot_tag="evening",
            group_size=4
        )
        self.assertEqual(len(evening_results), 1)
        self.assertEqual(evening_results[0]["venue"]["id"], "v2")

    def test_preference_scoring(self):
        results = RecommenderEngine.filter_and_rank_venues(
            venues=self.sample_venues,
            slot_tag="morning",
            preferences=["yên tĩnh"]
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["pref_matches"], 1)
        self.assertEqual(results[0]["score"], 34.0)

    def test_ward_and_city_filter(self):
        results = RecommenderEngine.filter_and_rank_venues(
            venues=self.sample_venues,
            slot_tag="evening",
            city="TP. Hồ Chí Minh",
            ward="Phường Võ Thị Sáu"
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["venue"]["id"], "v2")

        no_results = RecommenderEngine.filter_and_rank_venues(
            venues=self.sample_venues,
            slot_tag="evening",
            ward="Phường Bến Thành"
        )
        self.assertEqual(len(no_results), 0)


if __name__ == "__main__":
    unittest.main()
