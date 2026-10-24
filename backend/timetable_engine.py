"""
StudyPilot AI - Smart Study Timetable Generator
Generates balanced, realistic daily and weekly study timetables with breaks and interleaving.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from backend.database import (
    get_all_tasks,
    get_all_exams,
    clear_timetable_slots,
    save_timetable_slots,
    get_timetable_slots
)
from backend.rescheduler import calculate_task_urgency

# Preferred time intervals
TIME_SLOT_RANGES = {
    'morning': [('08:30', '12:00')],
    'afternoon': [('13:30', '17:00')],
    'evening': [('18:00', '21:30')],
    'night': [('20:00', '23:30')],
    'balanced': [('09:30', '12:00'), ('16:00', '18:30'), ('19:30', '21:30')]
}

def generate_smart_timetable(
    daily_hours: float = 4.0,
    preferred_time: str = 'evening',
    session_duration_mins: int = 45,
    break_duration_mins: int = 10,
    days_to_plan: int = 7,
    save_to_db: bool = True
) -> Dict[str, Any]:
    """
    Generates a daily and weekly study plan from the student's actual tasks & exams.
    Applies spaced interleaving (alternating subjects) and ensures breaks between sessions.
    """
    now = datetime.now()
    all_tasks = get_all_tasks()
    all_exams = get_all_exams()

    pending_tasks = [t for t in all_tasks if t.get('status') != 'completed']

    # Urgency scoring for each task
    scored_tasks = []
    for t in pending_tasks:
        score, reasons = calculate_task_urgency(t, all_exams, now)
        t_copy = dict(t)
        t_copy['urgency_score'] = score
        t_copy['urgency_reasons'] = reasons
        scored_tasks.append(t_copy)

    # Sort descending by urgency
    scored_tasks.sort(key=lambda x: x['urgency_score'], reverse=True)

    # Select base time window
    time_windows = TIME_SLOT_RANGES.get(preferred_time.lower(), TIME_SLOT_RANGES['evening'])

    all_generated_slots = []
    task_cycle_index = 0

    for day_offset in range(days_to_plan):
        target_date = now + timedelta(days=day_offset)
        date_str = target_date.strftime("%Y-%m-%d")
        day_name = target_date.strftime("%A")

        # Determine daily minutes budget
        daily_budget_mins = int(daily_hours * 60)
        daily_allocated_mins = 0

        # Iterate over time windows for the day
        for win_start, win_end in time_windows:
            if daily_allocated_mins >= daily_budget_mins:
                break

            current_time = datetime.strptime(win_start, "%H:%M")
            window_end_time = datetime.strptime(win_end, "%H:%M")

            session_count_in_window = 0

            while current_time + timedelta(minutes=session_duration_mins) <= window_end_time:
                if daily_allocated_mins + session_duration_mins > daily_budget_mins:
                    break

                # Pick next task, prioritizing urgency while interleaving subjects
                if scored_tasks:
                    # Select next task in round-robin fashion or top-urgent
                    task_to_schedule = scored_tasks[task_cycle_index % len(scored_tasks)]
                    task_cycle_index += 1
                else:
                    task_to_schedule = {
                        "id": None,
                        "title": "General Topic Review & Flashcards",
                        "subject": "Core Review"
                    }

                slot_start = current_time.strftime("%H:%M")
                current_time += timedelta(minutes=session_duration_mins)
                slot_end = current_time.strftime("%H:%M")
                daily_allocated_mins += session_duration_mins
                session_count_in_window += 1

                all_generated_slots.append({
                    "task_id": task_to_schedule.get('id'),
                    "title": task_to_schedule.get('title'),
                    "subject": task_to_schedule.get('subject'),
                    "day_of_week": day_name,
                    "start_time": slot_start,
                    "end_time": slot_end,
                    "slot_type": "study",
                    "status": "scheduled",
                    "date_str": date_str
                })

                # Insert break if time permits in this window
                if break_duration_mins > 0 and current_time + timedelta(minutes=break_duration_mins) <= window_end_time:
                    b_start = current_time.strftime("%H:%M")
                    current_time += timedelta(minutes=break_duration_mins)
                    b_end = current_time.strftime("%H:%M")
                    daily_allocated_mins += break_duration_mins

                    all_generated_slots.append({
                        "task_id": None,
                        "title": "Brain Rest & Hydration Break",
                        "subject": "Wellness",
                        "day_of_week": day_name,
                        "start_time": b_start,
                        "end_time": b_end,
                        "slot_type": "break",
                        "status": "scheduled",
                        "date_str": date_str
                    })

    if save_to_db:
        # Clear existing slots and save new
        clear_timetable_slots()
        save_timetable_slots(all_generated_slots)

    # Group by day
    schedule_by_day = {}
    for slot in all_generated_slots:
        d = slot['date_str']
        if d not in schedule_by_day:
            schedule_by_day[d] = {
                "date_str": d,
                "day_name": slot['day_of_week'],
                "slots": []
            }
        schedule_by_day[d]["slots"].append(slot)

    return {
        "success": True,
        "total_slots": len(all_generated_slots),
        "days_planned": days_to_plan,
        "daily_hours_target": daily_hours,
        "schedule_by_day": schedule_by_day,
        "all_slots": all_generated_slots
    }
