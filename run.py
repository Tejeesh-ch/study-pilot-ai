"""
StudyPilot AI - One-Command Launcher
Runs the full-stack web application with SQLite persistence and REST API.
Usage:
    python run.py
"""

import sys
import os
import webbrowser
from backend.database import init_db, get_all_tasks
from backend.seed_data import seed_demo_data
from backend.server import run_server, PORT

def main():
    print("=" * 65)
    print("🎓 StudyPilot AI — The Adaptive Study Planner")
    print("=" * 65)
    print("⚡ Initializing SQLite database...")
    init_db()

    tasks = get_all_tasks()
    if len(tasks) == 0:
        print("🌱 Seeding realistic college student scenario (Alex Rivera)...")
        seed_demo_data(clear_first=False)
    else:
        print(f"📦 Loaded {len(tasks)} existing study tasks from studypilot.db.")

    print(f"🚀 Starting StudyPilot AI Web Server on http://localhost:{PORT}")
    print("=" * 65)
    print(f"👉 Open in your web browser: http://localhost:{PORT}")
    print("Press Ctrl+C to terminate the server.\n")

    try:
        run_server(PORT)
    except KeyboardInterrupt:
        print("\nStudyPilot AI shutdown safely.")

if __name__ == "__main__":
    main()
