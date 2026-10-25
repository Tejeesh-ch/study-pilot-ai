"""
StudyPilot AI - Vercel Serverless Catch-All Route Handler
Natively handles all /api/* routes on Vercel.
"""

import sys
import os

# Add root directory to sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from api.index import handler
