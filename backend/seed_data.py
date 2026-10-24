"""
StudyPilot AI - Realistic Student Demo Data Generator
Seeds a rich, realistic college student scenario for hackathon demonstrations.
"""

from datetime import datetime, timedelta
import json
from backend.database import (
    get_db_connection,
    init_db,
    create_task,
    create_exam,
    log_focus_session,
    set_setting,
    save_timetable_slots,
    clear_timetable_slots
)

def seed_demo_data(clear_first: bool = True):
    """Populates the database with realistic college student data for hackathon demos."""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    if clear_first:
        cursor.execute("DELETE FROM timetable_slots")
        cursor.execute("DELETE FROM focus_sessions")
        cursor.execute("DELETE FROM exams")
        cursor.execute("DELETE FROM tasks")
        cursor.execute("DELETE FROM rescue_history")
        cursor.execute("DELETE FROM user_settings")
        conn.commit()
    conn.close()

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    tomorrow = now + timedelta(days=1)
    in_2_days = now + timedelta(days=2)
    in_3_days = now + timedelta(days=3)
    in_4_days = now + timedelta(days=4)
    in_5_days = now + timedelta(days=5)
    in_7_days = now + timedelta(days=7)

    # 1. User Settings
    set_setting("student_name", "Alex Rivera")
    set_setting("college_major", "Computer Science (2nd Year)")
    set_setting("daily_study_hours", "4")
    set_setting("preferred_study_time", "evening")
    set_setting("pomodoro_work_mins", "25")
    set_setting("pomodoro_break_mins", "5")
    set_setting("break_interval", "10")

    # 2. Realistic College Tasks
    t1 = create_task(
        title="Implement Red-Black Tree Balancing & Rotations",
        subject="Data Structures",
        duration_mins=50,
        priority="Urgent",
        deadline=tomorrow.strftime("%Y-%m-%dT18:00"),
        notes="Crucial for DSA Midterm. Need to verify double-red violation handling and left/right tree rotations.",
        status="pending"
    )

    t2 = create_task(
        title="Java Spring Boot REST API Controller & Service Layer",
        subject="Java",
        duration_mins=60,
        priority="High",
        deadline=in_2_days.strftime("%Y-%m-%dT23:59"),
        notes="Build @RestController with CRUD endpoints for Student Gradebook project.",
        status="pending"
    )

    t3 = create_task(
        title="Discrete Math Problem Set 4: Graph Proofs & Trees",
        subject="Mathematics",
        duration_mins=45,
        priority="Medium",
        deadline=in_4_days.strftime("%Y-%m-%dT17:00"),
        notes="Prove tree theorem: any connected acyclic graph with n vertices has exactly n - 1 edges.",
        status="pending"
    )

    t4 = create_task(
        title="OS Virtual Memory & Page Replacement Algorithms Review",
        subject="Computer Science",
        duration_mins=40,
        priority="Medium",
        deadline=in_5_days.strftime("%Y-%m-%dT22:00"),
        notes="Review LRU, FIFO, and Optimal Page Replacement comparisons for mid-semester quiz.",
        status="pending"
    )

    t5 = create_task(
        title="Binary Tree Level Order Traversal (BFS Practice)",
        subject="Data Structures",
        duration_mins=35,
        priority="High",
        deadline=today_str + "T12:00",
        notes="Morning study block was missed due to extended lab lecture! Primed for Rescue My Day.",
        status="missed"
    )

    t6 = create_task(
        title="Java Generics & Wildcards Code Exercises",
        subject="Java",
        duration_mins=30,
        priority="High",
        deadline=now.strftime("%Y-%m-%dT10:00"),
        notes="Covered bounded type parameters <T extends Comparable<T>> and upper/lower wildcards.",
        status="completed"
    )

    t7 = create_task(
        title="Array & Linked List Big-O Comparison Summary",
        subject="Data Structures",
        duration_mins=25,
        priority="Low",
        deadline=now.strftime("%Y-%m-%dT09:00"),
        notes="Created quick lookup cheat-sheet for index access vs insertion/deletion complexities.",
        status="completed"
    )

    # 3. Upcoming Exams with Detailed Topic Breakdown
    create_exam(
        title="Data Structures & Algorithms Midterm Exam",
        subject="Data Structures",
        exam_date=in_3_days.strftime("%Y-%m-%d"),
        confidence_level=3,
        syllabus_topics=[
            {"id": "dsa-1", "name": "Arrays & Dynamic Array Resizing", "status": "revised", "confidence": 5},
            {"id": "dsa-2", "name": "Singly & Doubly Linked Lists", "status": "revised", "confidence": 4},
            {"id": "dsa-3", "name": "Stack & Queue Implementations", "status": "revised", "confidence": 5},
            {"id": "dsa-4", "name": "Binary Search Trees (BST)", "status": "in_progress", "confidence": 3},
            {"id": "dsa-5", "name": "Self-Balancing Trees (AVL & Red-Black)", "status": "not_started", "confidence": 2},
            {"id": "dsa-6", "name": "Graph Traversals (BFS & DFS)", "status": "in_progress", "confidence": 3},
            {"id": "dsa-7", "name": "Dynamic Programming Intro (Memoization)", "status": "not_started", "confidence": 1}
        ],
        notes="Exam room: Hall 302. Calculators not allowed. Focus heavily on Tree rotations and BFS/DFS queue tracing."
    )

    create_exam(
        title="Discrete Mathematics Midterm Quiz 2",
        subject="Mathematics",
        exam_date=in_7_days.strftime("%Y-%m-%d"),
        confidence_level=4,
        syllabus_topics=[
            {"id": "dm-1", "name": "Propositional & Predicate Logic", "status": "revised", "confidence": 5},
            {"id": "dm-2", "name": "Set Theory & Boolean Algebra", "status": "revised", "confidence": 4},
            {"id": "dm-3", "name": "Equivalence Relations & Partitions", "status": "in_progress", "confidence": 3},
            {"id": "dm-4", "name": "Mathematical Induction Proofs", "status": "in_progress", "confidence": 3},
            {"id": "dm-5", "name": "Graph Theory & Tree Properties", "status": "not_started", "confidence": 2}
        ],
        notes="Worth 25% of final grade. Cheat-sheet of 1 page double-sided allowed."
    )

    # 4. Completed Focus Sessions
    log_focus_session(
        task_id=t6['id'] if t6 else None,
        task_title="Java Generics & Wildcards Code Exercises",
        subject="Java",
        duration_mins=30,
        session_type="pomodoro",
        notes="Completed all wildcard exercises without checking hints."
    )
    log_focus_session(
        task_id=t7['id'] if t7 else None,
        task_title="Array & Linked List Big-O Comparison Summary",
        subject="Data Structures",
        duration_mins=25,
        session_type="pomodoro",
        notes="Clean notes compiled for flashcards."
    )
    log_focus_session(
        task_id=None,
        task_title="Quick Code Review & Morning Warmup",
        subject="Computer Science",
        duration_mins=20,
        session_type="pomodoro",
        notes="Solved 1 warm-up problem on string manipulation."
    )

    # 5. Today's Initial Schedule (showing the missed session and remaining planned sessions)
    initial_schedule = [
        {
            "task_id": t5['id'] if t5 else None,
            "title": "Binary Tree Level Order Traversal (BFS)",
            "subject": "Data Structures",
            "day_of_week": now.strftime("%A"),
            "start_time": "09:30",
            "end_time": "10:05",
            "slot_type": "study",
            "status": "missed",
            "date_str": today_str
        },
        {
            "task_id": None,
            "title": "Morning Break & Tea",
            "subject": "Wellness",
            "day_of_week": now.strftime("%A"),
            "start_time": "10:05",
            "end_time": "10:15",
            "slot_type": "break",
            "status": "completed",
            "date_str": today_str
        },
        {
            "task_id": t2['id'] if t2 else None,
            "title": "Java Spring Boot REST API Endpoint Homework",
            "subject": "Java",
            "day_of_week": now.strftime("%A"),
            "start_time": "14:00",
            "end_time": "15:00",
            "slot_type": "study",
            "status": "scheduled",
            "date_str": today_str
        },
        {
            "task_id": None,
            "title": "Afternoon Refreshment Break",
            "subject": "Wellness",
            "day_of_week": now.strftime("%A"),
            "start_time": "15:00",
            "end_time": "15:15",
            "slot_type": "break",
            "status": "scheduled",
            "date_str": today_str
        },
        {
            "task_id": t1['id'] if t1 else None,
            "title": "Implement Red-Black Tree Balancing & Rotations",
            "subject": "Data Structures",
            "day_of_week": now.strftime("%A"),
            "start_time": "16:30",
            "end_time": "17:20",
            "slot_type": "study",
            "status": "scheduled",
            "date_str": today_str
        }
    ]
    save_timetable_slots(initial_schedule)

    print("Successfully seeded realistic college student demo data for Alex Rivera.")

if __name__ == "__main__":
    seed_demo_data(clear_first=True)
