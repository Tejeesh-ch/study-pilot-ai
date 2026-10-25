"""
StudyPilot AI - Vercel Serverless Function Entrypoint
Routes all /api/* HTTP requests to StudyPilotHTTPHandler.
"""

import sys
import os
from http.server import BaseHTTPRequestHandler

# Add root directory to sys.path so backend modules can be imported
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.database import init_db, get_all_tasks
from backend.seed_data import seed_demo_data
from backend.server import StudyPilotHTTPHandler

# Auto-initialize database on cold start
try:
    init_db()
    if len(get_all_tasks()) == 0:
        seed_demo_data(clear_first=False)
except Exception as e:
    print(f"Database init notice: {e}")

class handler(StudyPilotHTTPHandler):
    """Vercel Python Serverless Handler"""
    pass
