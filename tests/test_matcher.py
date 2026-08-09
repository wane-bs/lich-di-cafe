import unittest
from src.engine.models import Group, Member, NUM_DAYS, NUM_SLOTS
from src.engine.matcher import MatcherEngine

def create_empty_matrix():
    return [[0 for _ in range(NUM_SLOTS)] for _ in range(NUM_DAYS)]

class TestMatcherEngine(unittest.TestCase):

    def test_aggregate_matrix_calculation(self):
        m1_matrix = create_empty_matrix()
        m1_matrix[0][0] = 1 # Mon S1
        m1_matrix[0][1] = 1 # Mon S2

        m2_matrix = create_empty_matrix()
        m2_matrix[0][0] = 1 # Mon S1
        m2_matrix[0][1] = 0 # Mon S2

        member1 = Member(id="1", name="An", matrix=m1_matrix)
        member2 = Member(id="2", name="Bình", matrix=m2_matrix)
        group = Group(members=[member1, member2], threshold_pct=0.5)

        result = MatcherEngine.analyze_schedule(group)
        agg = result["aggregate_matrix"]

        self.assertEqual(agg[0][0], 2)  # Both free
        self.assertEqual(agg[0][1], 1)  # Only An free
        self.assertEqual(agg[0][2], 0)  # Neither free

        self.assertGreaterEqual(result["summary"]["optimal_count"], 1)
        top_slot = result["ranked_slots"][0]
        self.assertEqual(top_slot["day_index"], 0)
        self.assertEqual(top_slot["slot_index"], 0)
        self.assertEqual(top_slot["status"], "optimal")
        self.assertIn("An", top_slot["available_members"])
        self.assertIn("Bình", top_slot["available_members"])

    def test_continuity_bonus(self):
        m_matrix = create_empty_matrix()
        m_matrix[1][2] = 1 # Tue S3 (12-14)
        m_matrix[1][3] = 1 # Tue S4 (14-16)

        member = Member(id="1", name="Cường", matrix=m_matrix)
        group = Group(members=[member])

        result = MatcherEngine.analyze_schedule(group)
        tue_s3 = [s for s in result["ranked_slots"] if s["day_index"] == 1 and s["slot_index"] == 2][0]
        tue_s4 = [s for s in result["ranked_slots"] if s["day_index"] == 1 and s["slot_index"] == 3][0]

        self.assertGreater(tue_s3["score"], 10.0)
        self.assertGreater(tue_s4["score"], 10.0)

if __name__ == "__main__":
    unittest.main()
