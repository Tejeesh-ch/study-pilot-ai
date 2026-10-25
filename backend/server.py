"""
StudyPilot AI - REST API & Static Web Server
Powered by Python standard library http.server, sqlite3, and json.
Zero external dependencies required.
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Tuple

from backend.database import (
    init_db,
    get_all_tasks,
    get_task_by_id,
    create_task,
    update_task,
    delete_task,
    toggle_task_status,
    get_timetable_slots,
    save_timetable_slots,
    clear_timetable_slots,
    update_slot_status,
    get_all_exams,
    get_exam_by_id,
    create_exam,
    update_exam,
    delete_exam,
    log_focus_session,
    get_focus_sessions,
    get_all_settings,
    set_setting,
    get_setting
)
from backend.rescheduler import rescue_my_day
from backend.timetable_engine import generate_smart_timetable
from backend.ai_coach import handle_coach_query
from backend.seed_data import seed_demo_data

PORT = int(os.environ.get("PORT", 8000))
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon"
}

def compute_comprehensive_analytics() -> Dict[str, Any]:
    """Calculates all displayed metrics from actual application SQLite database."""
    tasks = get_all_tasks()
    exams = get_all_exams()
    focus_sessions = get_focus_sessions()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.get('status') == 'completed')
    pending_tasks = sum(1 for t in tasks if t.get('status') in ['pending', 'in_progress'])
    missed_tasks = sum(1 for t in tasks if t.get('status') == 'missed')
    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    # Focus minutes
    total_focus_mins = sum(s.get('duration_mins', 0) for s in focus_sessions)
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_focus_mins = sum(s.get('duration_mins', 0) for s in focus_sessions if (s.get('completed_at') or '').startswith(today_str))

    # Subject distribution
    subject_counts = {}
    subject_focus_mins = {}
    for t in tasks:
        subj = t.get('subject', 'General')
        subject_counts[subj] = subject_counts.get(subj, 0) + 1
    for s in focus_sessions:
        subj = s.get('subject', 'General')
        subject_focus_mins[subj] = subject_focus_mins.get(subj, 0) + s.get('duration_mins', 0)

    # 7-day study activity (past 7 days)
    activity_7days = []
    now = datetime.now()
    for i in range(6, -1, -1):
        day_date = now - timedelta(days=i)
        d_str = day_date.strftime("%Y-%m-%d")
        day_label = day_date.strftime("%a")
        day_mins = sum(s.get('duration_mins', 0) for s in focus_sessions if (s.get('completed_at') or '').startswith(d_str))
        completed_on_day = sum(1 for t in tasks if (t.get('completed_at') or '').startswith(d_str))
        activity_7days.append({
            "date": d_str,
            "day": day_label,
            "focus_mins": day_mins,
            "tasks_completed": completed_on_day
        })

    # Exam readiness calculations
    exam_readiness = []
    total_readiness_pts = 0
    recommended_topics_to_study = []

    for ex in exams:
        topics = ex.get('syllabus_topics', [])
        total_topics = len(topics)
        revised_topics = sum(1 for top in topics if top.get('status') == 'revised')
        in_prog_topics = sum(1 for top in topics if top.get('status') == 'in_progress')
        
        # Readiness score formula: (revised * 1.0 + in_progress * 0.5) / total * 100
        score = 0
        if total_topics > 0:
            score = round(((revised_topics * 1.0 + in_prog_topics * 0.5) / total_topics) * 100)

        # Days remaining
        days_left = 0
        try:
            ex_date = datetime.fromisoformat(ex.get('exam_date'))
            days_left = (ex_date - now).days
        except Exception:
            days_left = 1

        exam_readiness.append({
            "exam_id": ex['id'],
            "title": ex['title'],
            "subject": ex['subject'],
            "exam_date": ex['exam_date'],
            "days_left": days_left,
            "total_topics": total_topics,
            "revised_topics": revised_topics,
            "score": score
        })
        total_readiness_pts += score

        # Check lowest confidence topics
        for top in topics:
            if top.get('status') != 'revised':
                recommended_topics_to_study.append({
                    "exam_title": ex['title'],
                    "subject": ex['subject'],
                    "topic_name": top.get('name'),
                    "topic_status": top.get('status'),
                    "confidence": top.get('confidence', 2),
                    "days_left": days_left
                })

    avg_exam_readiness = round(total_readiness_pts / len(exams)) if exams else 0

    # Sort recommended topics: prioritize low confidence and close exam
    recommended_topics_to_study.sort(key=lambda x: (x['days_left'], x['confidence']))

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "missed_tasks": missed_tasks,
        "completion_rate": completion_rate,
        "total_focus_mins": total_focus_mins,
        "today_focus_mins": today_focus_mins,
        "total_focus_sessions": len(focus_sessions),
        "subject_counts": subject_counts,
        "subject_focus_mins": subject_focus_mins,
        "activity_7days": activity_7days,
        "exam_readiness": exam_readiness,
        "avg_exam_readiness": avg_exam_readiness,
        "recommended_next_topics": recommended_topics_to_study[:5]
    }

from datetime import timedelta

class StudyPilotHTTPHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for dynamic API responses
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data: Any, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def parse_body(self) -> Dict[str, Any]:
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length <= 0:
            return {}
        try:
            raw_body = self.rfile.read(content_length).decode('utf-8')
            return json.loads(raw_body)
        except Exception:
            return {}

    def get_route_path(self) -> Tuple[str, Dict[str, Any]]:
        raw_path = self.headers.get('x-forwarded-uri') or self.headers.get('x-real-path') or self.path
        parsed_url = urllib.parse.urlparse(raw_path)
        path = parsed_url.path
        if len(path) > 1 and path.endswith("/"):
            path = path[:-1]
        query_params = urllib.parse.parse_qs(parsed_url.query)
        return path, query_params

    def do_GET(self):
        path, query_params = self.get_route_path()

        # API Routes
        if path in ["/api", "/api/health", "/api/index.py", "/api/index"]:
            self.send_json({"status": "healthy", "service": "StudyPilot AI", "time": datetime.now().isoformat()})
            return

        if path == "/api/tasks":
            subject = query_params.get("subject", [None])[0]
            priority = query_params.get("priority", [None])[0]
            status = query_params.get("status", [None])[0]
            search = query_params.get("search", [None])[0]
            tasks = get_all_tasks(subject=subject, priority=priority, status=status, search=search)
            self.send_json({"tasks": tasks})
            return

        if path.startswith("/api/tasks/"):
            try:
                task_id = int(path.split("/")[-1])
                task = get_task_by_id(task_id)
                if task:
                    self.send_json({"task": task})
                else:
                    self.send_json({"error": "Task not found"}, status=404)
            except Exception:
                self.send_json({"error": "Invalid task ID"}, status=400)
            return

        if path == "/api/timetable":
            date_str = query_params.get("date", [None])[0]
            slots = get_timetable_slots(date_str)
            self.send_json({"slots": slots})
            return

        if path == "/api/exams":
            exams = get_all_exams()
            self.send_json({"exams": exams})
            return

        if path.startswith("/api/exams/"):
            try:
                exam_id = int(path.split("/")[-1])
                exam = get_exam_by_id(exam_id)
                if exam:
                    self.send_json({"exam": exam})
                else:
                    self.send_json({"error": "Exam not found"}, status=404)
            except Exception:
                self.send_json({"error": "Invalid exam ID"}, status=400)
            return

        if path == "/api/focus-sessions":
            sessions = get_focus_sessions()
            self.send_json({"sessions": sessions})
            return

        if path == "/api/analytics":
            analytics = compute_comprehensive_analytics()
            self.send_json(analytics)
            return

        if path == "/api/settings":
            settings = get_all_settings()
            # Do not leak full API key, just report whether configured
            api_key = get_setting("gemini_api_key", os.environ.get("GEMINI_API_KEY", ""))
            settings["has_gemini_key"] = bool(api_key and len(api_key.strip()) > 5)
            self.send_json({"settings": settings})
            return

        # Static file serving
        self.serve_static_file(path)

    def do_POST(self):
        path, _ = self.get_route_path()
        body = self.parse_body()

        if path == "/api/tasks":
            title = body.get("title", "").strip()
            subject = body.get("subject", "").strip()
            if not title or not subject:
                self.send_json({"error": "Title and subject are required"}, status=400)
                return
            duration = int(body.get("duration_mins", 45))
            priority = body.get("priority", "Medium")
            deadline = body.get("deadline", "")
            notes = body.get("notes", "")
            status = body.get("status", "pending")
            task = create_task(title, subject, duration, priority, deadline, notes, status)
            self.send_json({"task": task, "message": "Task created successfully"}, status=201)
            return

        if path == "/api/timetable/generate":
            daily_hours = float(body.get("daily_hours", 4.0))
            preferred_time = body.get("preferred_time", "evening")
            session_dur = int(body.get("session_duration_mins", 45))
            break_dur = int(body.get("break_duration_mins", 10))
            days = int(body.get("days", 7))
            result = generate_smart_timetable(daily_hours, preferred_time, session_dur, break_dur, days, save_to_db=True)
            self.send_json(result)
            return

        if path == "/api/timetable/save":
            slots = body.get("slots", [])
            clear_timetable_slots()
            save_timetable_slots(slots)
            self.send_json({"success": True, "message": "Timetable saved"})
            return

        if path == "/api/rescue":
            remaining_mins = int(body.get("remaining_mins", 90))
            start_time = body.get("start_time", "")
            break_mins = int(body.get("break_mins", 10))
            save_immediately = bool(body.get("save_immediately", False))
            result = rescue_my_day(remaining_mins, start_time, break_mins, save_immediately)
            self.send_json(result)
            return

        if path == "/api/rescue/accept":
            revised_plan = body.get("revised_plan", [])
            today_str = datetime.now().strftime("%Y-%m-%d")
            clear_timetable_slots(today_str)
            save_timetable_slots(revised_plan)
            self.send_json({"success": True, "message": "Revised rescue schedule applied to your timetable!"})
            return

        if path == "/api/ai/coach":
            prompt = body.get("prompt", "").strip()
            history = body.get("history", [])
            override_key = get_setting("gemini_api_key", "")
            if not prompt:
                self.send_json({"error": "Prompt cannot be empty"}, status=400)
                return
            result = handle_coach_query(prompt, history, override_key)
            self.send_json(result)
            return

        if path == "/api/exams":
            title = body.get("title", "").strip()
            subject = body.get("subject", "").strip()
            exam_date = body.get("exam_date", "")
            if not title or not subject or not exam_date:
                self.send_json({"error": "Title, subject, and exam date are required"}, status=400)
                return
            confidence = int(body.get("confidence_level", 3))
            topics = body.get("syllabus_topics", [])
            notes = body.get("notes", "")
            exam = create_exam(title, subject, exam_date, confidence, topics, notes)
            self.send_json({"exam": exam, "message": "Exam created successfully"}, status=201)
            return

        if path == "/api/focus-sessions":
            task_id = body.get("task_id")
            task_title = body.get("task_title", "Focus Session")
            subject = body.get("subject", "General")
            duration_mins = int(body.get("duration_mins", 25))
            session_type = body.get("session_type", "pomodoro")
            notes = body.get("notes", "")
            session = log_focus_session(task_id, task_title, subject, duration_mins, session_type, notes)
            self.send_json({"session": session, "message": "Focus session logged!"}, status=201)
            return

        if path == "/api/settings":
            for k, v in body.items():
                set_setting(k, str(v))
            self.send_json({"success": True, "message": "Settings updated"})
            return

        if path == "/api/reset-demo":
            seed_demo_data(clear_first=True)
            self.send_json({"success": True, "message": "Realistic college student demo data reseeded successfully!"})
            return

        if path == "/api/clear-all":
            seed_demo_data(clear_first=True)
            # Empty out
            conn = backend.database.get_db_connection()
            c = conn.cursor()
            c.execute("DELETE FROM timetable_slots")
            c.execute("DELETE FROM focus_sessions")
            c.execute("DELETE FROM exams")
            c.execute("DELETE FROM tasks")
            c.execute("DELETE FROM rescue_history")
            conn.commit()
            conn.close()
            self.send_json({"success": True, "message": "All planner data cleared."})
            return

        self.send_json({"error": "Not Found"}, status=404)

    def do_PUT(self):
        path, _ = self.get_route_path()
        body = self.parse_body()

        if path.startswith("/api/tasks/"):
            try:
                task_id = int(path.split("/")[-1])
                updated = update_task(task_id, **body)
                if updated:
                    self.send_json({"task": updated, "message": "Task updated"})
                else:
                    self.send_json({"error": "Task not found"}, status=404)
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
            return

        if path.startswith("/api/exams/"):
            try:
                exam_id = int(path.split("/")[-1])
                updated = update_exam(exam_id, **body)
                if updated:
                    self.send_json({"exam": updated, "message": "Exam updated"})
                else:
                    self.send_json({"error": "Exam not found"}, status=404)
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
            return

        self.send_json({"error": "Not Found"}, status=404)

    def do_PATCH(self):
        path, _ = self.get_route_path()
        body = self.parse_body()

        if path.startswith("/api/tasks/") and path.endswith("/toggle"):
            try:
                parts = path.split("/")
                task_id = int(parts[3])
                updated = toggle_task_status(task_id)
                if updated:
                    self.send_json({"task": updated, "message": "Task status toggled"})
                else:
                    self.send_json({"error": "Task not found"}, status=404)
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
            return

        if path.startswith("/api/timetable/slot/"):
            try:
                slot_id = int(path.split("/")[-1])
                status = body.get("status", "completed")
                updated = update_slot_status(slot_id, status)
                self.send_json({"success": updated, "message": f"Slot marked as {status}"})
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
            return

        if path.startswith("/api/exams/") and "/topic" in path:
            try:
                parts = path.split("/")
                exam_id = int(parts[3])
                exam = get_exam_by_id(exam_id)
                if not exam:
                    self.send_json({"error": "Exam not found"}, status=404)
                    return
                topic_id = body.get("topic_id")
                new_status = body.get("status")
                new_confidence = body.get("confidence")

                topics = exam.get('syllabus_topics', [])
                for top in topics:
                    if top.get("id") == topic_id or top.get("name") == topic_id:
                        if new_status:
                            top["status"] = new_status
                        if new_confidence is not None:
                            top["confidence"] = int(new_confidence)
                        break

                updated = update_exam(exam_id, syllabus_topics=topics)
                self.send_json({"exam": updated, "message": "Topic updated"})
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
            return

        self.send_json({"error": "Not Found"}, status=404)

    def do_DELETE(self):
        path, _ = self.get_route_path()

        if path.startswith("/api/tasks/"):
            try:
                task_id = int(path.split("/")[-1])
                deleted = delete_task(task_id)
                self.send_json({"success": deleted, "message": "Task deleted"})
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
            return

        if path.startswith("/api/exams/"):
            try:
                exam_id = int(path.split("/")[-1])
                deleted = delete_exam(exam_id)
                self.send_json({"success": deleted, "message": "Exam deleted"})
            except Exception as e:
                self.send_json({"error": str(e)}, status=400)
            return

        self.send_json({"error": "Not Found"}, status=404)

    def serve_static_file(self, path: str):
        if path == "/" or not path:
            path = "/index.html"

        # Sanitize path to prevent directory traversal
        clean_path = os.path.normpath(path.lstrip("/"))
        file_path = os.path.join(FRONTEND_DIR, clean_path)

        # Check if file exists within FRONTEND_DIR
        if not file_path.startswith(FRONTEND_DIR) or not os.path.isfile(file_path):
            # Fallback to index.html for SPA client-side routing
            file_path = os.path.join(FRONTEND_DIR, "index.html")

        if not os.path.isfile(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        _, ext = os.path.splitext(file_path)
        content_type = MIME_TYPES.get(ext.lower(), "application/octet-stream")

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error reading file: {e}".encode('utf-8'))

    def log_message(self, format, *args):
        # Keep server log clean and concise
        pass

def run_server(port: int = PORT):
    init_db()
    # Check if DB has any tasks; if not, automatically seed realistic demo data
    tasks = get_all_tasks()
    if len(tasks) == 0:
        seed_demo_data(clear_first=False)

    server_address = ("127.0.0.1", port)
    # Enable SO_REUSEADDR
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(server_address, StudyPilotHTTPHandler) as httpd:
        print(f"🚀 StudyPilot AI running at http://localhost:{port}")
        print(f"🌟 Adaptive Study Planner backend initialized.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    run_server()
