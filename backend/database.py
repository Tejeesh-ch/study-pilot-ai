"""
StudyPilot AI - SQLite Database Interface
Handles persistence for tasks, timetables, exams, focus sessions, and user settings.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "studypilot.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initialize database tables with appropriate schemas and indexes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tasks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        duration_mins INTEGER NOT NULL DEFAULT 45,
        priority TEXT NOT NULL DEFAULT 'Medium', -- 'Urgent', 'High', 'Medium', 'Low'
        deadline TEXT NOT NULL,                  -- ISO string 'YYYY-MM-DDTHH:MM'
        status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'missed'
        notes TEXT DEFAULT '',
        urgency_score REAL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        completed_at TEXT
    )
    """)

    # Timetable slots table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS timetable_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        day_of_week TEXT NOT NULL,               -- 'Monday', 'Tuesday', ...
        start_time TEXT NOT NULL,                -- '09:00'
        end_time TEXT NOT NULL,                  -- '09:45'
        slot_type TEXT NOT NULL DEFAULT 'study', -- 'study', 'break', 'review'
        status TEXT NOT NULL DEFAULT 'scheduled',-- 'scheduled', 'completed', 'missed', 'deferred'
        date_str TEXT NOT NULL,                  -- 'YYYY-MM-DD'
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
    """)

    # Exams table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        exam_date TEXT NOT NULL,                 -- 'YYYY-MM-DD'
        confidence_level INTEGER DEFAULT 3,      -- 1 to 5
        syllabus_topics TEXT DEFAULT '[]',       -- JSON list of topics
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )
    """)

    # Focus Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS focus_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        task_title TEXT,
        subject TEXT,
        duration_mins INTEGER NOT NULL,
        completed_at TEXT NOT NULL,              -- ISO datetime
        session_type TEXT DEFAULT 'pomodoro',    -- 'pomodoro', 'short_break', 'long_break'
        notes TEXT DEFAULT '',
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
    """)

    # User Settings & Rescue logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rescue_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        remaining_mins INTEGER NOT NULL,
        original_tasks_count INTEGER NOT NULL,
        rescheduled_tasks_count INTEGER NOT NULL,
        deferred_tasks_count INTEGER NOT NULL,
        explanations_json TEXT NOT NULL,
        accepted INTEGER DEFAULT 1
    )
    """)

    conn.commit()
    conn.close()

# ----------------- Tasks CRUD ----------------- #

def get_all_tasks(subject: Optional[str] = None, priority: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM tasks WHERE 1=1"
    params = []

    if subject and subject.lower() != 'all':
        query += " AND LOWER(subject) = LOWER(?)"
        params.append(subject)
    if priority and priority.lower() != 'all':
        query += " AND LOWER(priority) = LOWER(?)"
        params.append(priority)
    if status and status.lower() != 'all':
        query += " AND LOWER(status) = LOWER(?)"
        params.append(status)
    if search:
        query += " AND (title LIKE ? OR notes LIKE ? OR subject LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])

    query += " ORDER BY CASE priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 ELSE 5 END, deadline ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_task_by_id(task_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_task(title: str, subject: str, duration_mins: int = 45, priority: str = 'Medium', deadline: str = '', notes: str = '', status: str = 'pending') -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()
    if not deadline:
        deadline = datetime.now().strftime("%Y-%m-%dT23:59")
        
    cursor.execute("""
    INSERT INTO tasks (title, subject, duration_mins, priority, deadline, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (title.strip(), subject.strip(), duration_mins, priority, deadline, status, notes, created_at))
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_task_by_id(task_id)

def update_task(task_id: int, **fields) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    allowed_fields = ['title', 'subject', 'duration_mins', 'priority', 'deadline', 'status', 'notes', 'completed_at']
    updates = []
    values = []

    for k, v in fields.items():
        if k in allowed_fields:
            updates.append(f"{k} = ?")
            values.append(v)

    if not updates:
        conn.close()
        return get_task_by_id(task_id)

    values.append(task_id)
    query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    conn.close()
    return get_task_by_id(task_id)

def delete_task(task_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetable_slots WHERE task_id = ?", (task_id,))
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def toggle_task_status(task_id: int) -> Optional[Dict[str, Any]]:
    task = get_task_by_id(task_id)
    if not task:
        return None
    new_status = 'completed' if task['status'] != 'completed' else 'pending'
    completed_at = datetime.now().isoformat() if new_status == 'completed' else None
    return update_task(task_id, status=new_status, completed_at=completed_at)

# ----------------- Timetable CRUD ----------------- #

def get_timetable_slots(date_str: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if date_str:
        cursor.execute("SELECT * FROM timetable_slots WHERE date_str = ? ORDER BY start_time ASC", (date_str,))
    else:
        cursor.execute("SELECT * FROM timetable_slots ORDER BY date_str ASC, start_time ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def clear_timetable_slots(date_str: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if date_str:
        cursor.execute("DELETE FROM timetable_slots WHERE date_str = ?", (date_str,))
    else:
        cursor.execute("DELETE FROM timetable_slots")
    conn.commit()
    conn.close()

def save_timetable_slots(slots: List[Dict[str, Any]]):
    conn = get_db_connection()
    cursor = conn.cursor()
    for s in slots:
        cursor.execute("""
        INSERT INTO timetable_slots (task_id, title, subject, day_of_week, start_time, end_time, slot_type, status, date_str)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s.get('task_id'),
            s.get('title', 'Study Session'),
            s.get('subject', 'General'),
            s.get('day_of_week', 'Today'),
            s.get('start_time', '09:00'),
            s.get('end_time', '09:45'),
            s.get('slot_type', 'study'),
            s.get('status', 'scheduled'),
            s.get('date_str', datetime.now().strftime("%Y-%m-%d"))
        ))
    conn.commit()
    conn.close()

def update_slot_status(slot_id: int, status: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE timetable_slots SET status = ? WHERE id = ?", (status, slot_id))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated

# ----------------- Exams CRUD ----------------- #

def get_all_exams() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM exams ORDER BY exam_date ASC")
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        try:
            d['syllabus_topics'] = json.loads(d['syllabus_topics'] or '[]')
        except Exception:
            d['syllabus_topics'] = []
        results.append(d)
    return results

def get_exam_by_id(exam_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM exams WHERE id = ?", (exam_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    try:
        d['syllabus_topics'] = json.loads(d['syllabus_topics'] or '[]')
    except Exception:
        d['syllabus_topics'] = []
    return d

def create_exam(title: str, subject: str, exam_date: str, confidence_level: int = 3, syllabus_topics: Optional[List[Dict[str, Any]]] = None, notes: str = '') -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    topics_json = json.dumps(syllabus_topics or [])
    created_at = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO exams (title, subject, exam_date, confidence_level, syllabus_topics, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (title.strip(), subject.strip(), exam_date, confidence_level, topics_json, notes, created_at))
    exam_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_exam_by_id(exam_id)

def update_exam(exam_id: int, **fields) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    allowed = ['title', 'subject', 'exam_date', 'confidence_level', 'syllabus_topics', 'notes']
    updates = []
    values = []
    for k, v in fields.items():
        if k in allowed:
            if k == 'syllabus_topics' and isinstance(v, (list, dict)):
                v = json.dumps(v)
            updates.append(f"{k} = ?")
            values.append(v)
    if not updates:
        conn.close()
        return get_exam_by_id(exam_id)
    values.append(exam_id)
    cursor.execute(f"UPDATE exams SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return get_exam_by_id(exam_id)

def delete_exam(exam_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM exams WHERE id = ?", (exam_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# ----------------- Focus Sessions ----------------- #

def log_focus_session(task_id: Optional[int], task_title: str, subject: str, duration_mins: int, session_type: str = 'pomodoro', notes: str = '') -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    completed_at = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO focus_sessions (task_id, task_title, subject, duration_mins, completed_at, session_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (task_id, task_title, subject, duration_mins, completed_at, session_type, notes))
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {
        "id": session_id,
        "task_id": task_id,
        "task_title": task_title,
        "subject": subject,
        "duration_mins": duration_mins,
        "completed_at": completed_at,
        "session_type": session_type,
        "notes": notes
    }

def get_focus_sessions() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM focus_sessions ORDER BY completed_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ----------------- Settings & Rescue History ----------------- #

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM user_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row['value'] if row else default

def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()

def get_all_settings() -> Dict[str, str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM user_settings")
    rows = cursor.fetchall()
    conn.close()
    settings = {
        'daily_study_hours': '4',
        'preferred_study_time': 'evening',
        'pomodoro_work_mins': '25',
        'pomodoro_break_mins': '5',
        'break_interval': '10',
        'student_name': 'Alex Rivera',
        'college_major': 'Computer Science'
    }
    for r in rows:
        settings[r['key']] = r['value']
    return settings

def log_rescue(remaining_mins: int, orig_count: int, resched_count: int, def_count: int, explanations: List[Dict[str, Any]], accepted: bool = True):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO rescue_history (timestamp, remaining_mins, original_tasks_count, rescheduled_tasks_count, deferred_tasks_count, explanations_json, accepted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (datetime.now().isoformat(), remaining_mins, orig_count, resched_count, def_count, json.dumps(explanations), 1 if accepted else 0))
    conn.commit()
    conn.close()
