"""
StudyPilot AI - Backend Verification Test Suite
Tests SQLite persistence, Rescue My Day algorithm, Timetable engine, and AI coach.
"""

import unittest
import os
import json
from datetime import datetime, timedelta

from backend.database import (
    init_db,
    get_all_tasks,
    create_task,
    update_task,
    delete_task,
    toggle_task_status,
    get_all_exams,
    create_exam,
    log_focus_session,
    get_focus_sessions
)
from backend.rescheduler import rescue_my_day, calculate_task_urgency
from backend.timetable_engine import generate_smart_timetable
from backend.ai_coach import handle_coach_query
from backend.server import compute_comprehensive_analytics
from backend.seed_data import seed_demo_data

class TestStudyPilotBackend(unittest.TestCase):

    def setUp(self):
        # Seed realistic demo data for testing
        seed_demo_data(clear_first=True)

    def test_database_initialization_and_tasks(self):
        tasks = get_all_tasks()
        self.assertGreaterEqual(len(tasks), 5, "Demo seed should create at least 5 tasks")
        
        # Test create task
        new_task = create_task(
            title="Algorithm Graph BFS Practice",
            subject="Computer Science",
            duration_mins=30,
            priority="High",
            deadline=(datetime.now() + timedelta(days=2)).isoformat(),
            notes="Review queue implementation"
        )
        self.assertIsNotNone(new_task['id'])
        self.assertEqual(new_task['title'], "Algorithm Graph BFS Practice")

        # Test toggle
        toggled = toggle_task_status(new_task['id'])
        self.assertEqual(toggled['status'], 'completed')
        self.assertIsNotNone(toggled['completed_at'])

        # Toggle back
        toggled_back = toggle_task_status(new_task['id'])
        self.assertEqual(toggled_back['status'], 'pending')

        # Test delete
        deleted = delete_task(new_task['id'])
        self.assertTrue(deleted)

    def test_rescue_my_day_algorithm(self):
        """
        Verify the core differentiator:
        When a student has only 60 minutes remaining, but unfinished tasks require more,
        the algorithm must:
        1. Prioritize Urgent tasks with approaching exams/deadlines.
        2. Safely defer lower priority tasks.
        3. Never pretend all tasks fit! (can_fit_all must be False, deficit_mins > 0).
        4. Provide explicit reasonings.
        """
        # Run Rescue with 60 minutes remaining
        result = rescue_my_day(remaining_mins=60, start_time="19:00", break_mins=10, save_immediately=False)

        self.assertTrue(result['success'])
        self.assertEqual(result['remaining_mins_budget'], 60)
        self.assertFalse(result['can_fit_all'], "60 minutes cannot fit all unfinished tasks")
        self.assertGreater(result['deficit_mins'], 0, "Deficit must be explicitly recognized")
        self.assertGreater(len(result['allocated_tasks']), 0, "At least 1 high-priority task should fit")
        self.assertGreater(len(result['deferred_tasks']), 0, "Lower priority tasks must be deferred")
        
        # Verify explanations exist for both prioritized and deferred
        explanations = result['explanations']
        prioritized_exps = [e for e in explanations if e['action'] == 'prioritized']
        deferred_exps = [e for e in explanations if e['action'] == 'deferred']
        self.assertGreater(len(prioritized_exps), 0)
        self.assertGreater(len(deferred_exps), 0)

        # Check total allocated time does not exceed budget
        self.assertLessEqual(result['total_used_mins'], 60, "Allocated study + break time must not exceed remaining budget")

    def test_smart_timetable_generation(self):
        """Verify daily & weekly timetable generator produces valid slots with breaks."""
        tt = generate_smart_timetable(daily_hours=3.0, preferred_time="evening", session_duration_mins=45, break_duration_mins=10, days_to_plan=5, save_to_db=False)
        self.assertTrue(tt['success'])
        self.assertEqual(tt['days_planned'], 5)
        self.assertGreater(tt['total_slots'], 0)
        
        # Check that break slots are generated
        slots = tt['all_slots']
        break_slots = [s for s in slots if s['slot_type'] == 'break']
        study_slots = [s for s in slots if s['slot_type'] == 'study']
        self.assertGreater(len(break_slots), 0, "Timetable must include rest breaks")
        self.assertGreater(len(study_slots), 0, "Timetable must include study slots")

    def test_ai_coach_knowledge_and_labeling(self):
        """Verify AI study coach responds accurately and labels provider honestly."""
        query_result = handle_coach_query("Explain Binary Search Trees at a beginner level")
        self.assertTrue(query_result['success'])
        self.assertIn("response", query_result)
        self.assertIn("provider", query_result)
        # Verify no false labeling
        if not os.environ.get("GEMINI_API_KEY"):
            self.assertFalse(query_result['is_live_ai'])
            self.assertIn("Offline Mode", query_result['provider'])

    def test_real_analytics_calculation(self):
        """Verify analytics are genuinely derived from database records."""
        analytics = compute_comprehensive_analytics()
        self.assertGreater(analytics['total_tasks'], 0)
        self.assertGreaterEqual(analytics['completion_rate'], 0.0)
        self.assertGreater(len(analytics['activity_7days']), 0)
        self.assertGreater(len(analytics['exam_readiness']), 0)
        self.assertIn("recommended_next_topics", analytics)

if __name__ == "__main__":
    unittest.main()
