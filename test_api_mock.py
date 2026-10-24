"""
StudyPilot AI - Mock Socket REST API Tester
Tests StudyPilotHTTPHandler routing, JSON serialization, and status codes
using in-memory BytesIO streams (no network socket required).
"""

import io
import json
import unittest
from backend.server import StudyPilotHTTPHandler, init_db, compute_comprehensive_analytics
from backend.seed_data import seed_demo_data

class MockSocket:
    def __init__(self, data=b""):
        self.data = data
    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return io.BytesIO(self.data)
        elif 'w' in mode:
            return io.BytesIO()

class DummyHandler(StudyPilotHTTPHandler):
    def __init__(self, method, path, body=b"", headers=None):
        self.rfile = io.BytesIO(body)
        self.wfile = io.BytesIO()
        self.command = method
        self.path = path
        self.request_version = "HTTP/1.1"
        self.headers = {}
        if headers:
            self.headers.update(headers)
        if body:
            self.headers['Content-Length'] = str(len(body))
        self.close_connection = False

        if method == "GET":
            self.do_GET()
        elif method == "POST":
            self.do_POST()
        elif method == "PATCH":
            self.do_PATCH()
        elif method == "DELETE":
            self.do_DELETE()

    def send_response(self, code, message=None):
        self.response_code = code
    def send_header(self, keyword, value):
        pass
    def end_headers(self):
        pass

class TestStudyPilotAPIRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_demo_data(clear_first=True)

    def test_get_health(self):
        handler = DummyHandler("GET", "/api/health")
        self.assertEqual(handler.response_code, 200)
        res = json.loads(handler.wfile.getvalue().decode('utf-8'))
        self.assertEqual(res['status'], "healthy")

    def test_get_tasks(self):
        handler = DummyHandler("GET", "/api/tasks")
        self.assertEqual(handler.response_code, 200)
        res = json.loads(handler.wfile.getvalue().decode('utf-8'))
        self.assertGreaterEqual(len(res['tasks']), 5)

    def test_post_task_and_toggle(self):
        # Create
        task_data = json.dumps({
            "title": "Mock API Unit Task",
            "subject": "Computer Science",
            "duration_mins": 35,
            "priority": "High",
            "deadline": "2026-10-25T18:00"
        }).encode('utf-8')
        handler = DummyHandler("POST", "/api/tasks", body=task_data)
        self.assertEqual(handler.response_code, 201)
        created = json.loads(handler.wfile.getvalue().decode('utf-8'))['task']
        task_id = created['id']

        # Toggle
        handler2 = DummyHandler("PATCH", f"/api/tasks/{task_id}/toggle")
        self.assertEqual(handler2.response_code, 200)
        toggled = json.loads(handler2.wfile.getvalue().decode('utf-8'))['task']
        self.assertEqual(toggled['status'], 'completed')

        # Delete
        handler3 = DummyHandler("DELETE", f"/api/tasks/{task_id}")
        self.assertEqual(handler3.response_code, 200)

    def test_rescue_my_day_endpoint(self):
        rescue_payload = json.dumps({
            "remaining_mins": 90,
            "start_time": "18:30",
            "break_mins": 10
        }).encode('utf-8')
        handler = DummyHandler("POST", "/api/rescue", body=rescue_payload)
        self.assertEqual(handler.response_code, 200)
        res = json.loads(handler.wfile.getvalue().decode('utf-8'))
        self.assertTrue(res['success'])
        self.assertIn("narrative_message", res)
        self.assertGreater(len(res['explanations']), 0)

    def test_generate_timetable_endpoint(self):
        tt_payload = json.dumps({
            "daily_hours": 3.0,
            "preferred_time": "evening",
            "session_duration_mins": 45,
            "break_duration_mins": 10,
            "days": 3
        }).encode('utf-8')
        handler = DummyHandler("POST", "/api/timetable/generate", body=tt_payload)
        self.assertEqual(handler.response_code, 200)
        res = json.loads(handler.wfile.getvalue().decode('utf-8'))
        self.assertTrue(res['success'])
        self.assertGreater(res['total_slots'], 0)

    def test_ai_coach_endpoint(self):
        coach_payload = json.dumps({
            "prompt": "Explain Binary Search Trees at a beginner level"
        }).encode('utf-8')
        handler = DummyHandler("POST", "/api/ai/coach", body=coach_payload)
        self.assertEqual(handler.response_code, 200)
        res = json.loads(handler.wfile.getvalue().decode('utf-8'))
        self.assertTrue(res['success'])
        self.assertIn("response", res)
        self.assertIn("provider", res)

    def test_analytics_endpoint(self):
        handler = DummyHandler("GET", "/api/analytics")
        self.assertEqual(handler.response_code, 200)
        res = json.loads(handler.wfile.getvalue().decode('utf-8'))
        self.assertGreater(res['total_tasks'], 0)
        self.assertIn("activity_7days", res)

    def test_static_index_html(self):
        handler = DummyHandler("GET", "/")
        self.assertEqual(handler.response_code, 200)
        content = handler.wfile.getvalue().decode('utf-8')
        self.assertIn("StudyPilot", content)
        self.assertIn("Rescue My Day", content)

if __name__ == "__main__":
    unittest.main()
