"""
StudyPilot AI - Rescue My Day Engine
Adaptive dynamic rescheduling algorithm when students miss study sessions or run out of time.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import json

from backend.database import (
    get_all_tasks,
    get_all_exams,
    get_timetable_slots,
    save_timetable_slots,
    clear_timetable_slots,
    log_rescue
)

PRIORITY_WEIGHTS = {
    'urgent': 100,
    'high': 75,
    'medium': 45,
    'low': 20
}

def calculate_task_urgency(task: Dict[str, Any], upcoming_exams: List[Dict[str, Any]], now: datetime) -> Tuple[float, List[str]]:
    """
    Calculate an objective urgency score and human-readable reasoning points.
    Higher score = higher priority for today's emergency rescue.
    """
    score = 0.0
    reasons = []

    priority = task.get('priority', 'Medium').lower()
    base_weight = PRIORITY_WEIGHTS.get(priority, 45)
    score += base_weight
    reasons.append(f"Marked as {task.get('priority')} Priority (+{base_weight} pts)")

    # Deadline proximity
    deadline_str = task.get('deadline', '')
    days_to_deadline = 999.0
    if deadline_str:
        try:
            # Handle ISO formats
            clean_str = deadline_str.replace("Z", "").split(".")[0]
            dl = datetime.fromisoformat(clean_str)
            delta = dl - now
            days_to_deadline = delta.total_seconds() / 86400.0

            if days_to_deadline < 0:
                score += 80
                reasons.append(f"Overdue by {abs(round(days_to_deadline, 1))} days! (+80 pts)")
            elif days_to_deadline <= 1.0:
                score += 60
                reasons.append(f"Deadline due within 24 hours ({dl.strftime('%b %d, %H:%M')}) (+60 pts)")
            elif days_to_deadline <= 2.0:
                score += 40
                reasons.append(f"Deadline due in {round(days_to_deadline, 1)} days (+40 pts)")
            elif days_to_deadline <= 4.0:
                score += 20
                reasons.append(f"Deadline in {round(days_to_deadline, 1)} days (+20 pts)")
            else:
                score += 5
                reasons.append(f"Comfortable deadline buffer ({round(days_to_deadline, 1)} days away)")
        except Exception:
            pass

    # Exam proximity check
    task_subject = (task.get('subject') or '').lower().strip()
    closest_exam = None
    min_exam_days = 999.0

    for exam in upcoming_exams:
        exam_subj = (exam.get('subject') or '').lower().strip()
        if exam_subj in task_subject or task_subject in exam_subj:
            try:
                ed = datetime.fromisoformat(exam.get('exam_date'))
                d = (ed - now).total_seconds() / 86400.0
                if 0 <= d < min_exam_days:
                    min_exam_days = d
                    closest_exam = exam
            except Exception:
                pass

    if closest_exam and min_exam_days <= 7.0:
        if min_exam_days <= 3.0:
            exam_boost = 50
            reasons.append(f"Subject Exam '{closest_exam['title']}' is in {round(min_exam_days, 1)} days! High stakes (+50 pts)")
        else:
            exam_boost = 25
            reasons.append(f"Subject Exam '{closest_exam['title']}' is in {round(min_exam_days, 1)} days (+25 pts)")
        score += exam_boost

    # Duration efficiency: Shorter high-yield tasks get slight quick-win bonus
    dur = task.get('duration_mins', 45)
    if dur <= 30 and priority in ['urgent', 'high']:
        score += 10
        reasons.append(f"Compact duration ({dur}m) provides high-yield completion momentum (+10 pts)")

    return round(score, 1), reasons

def rescue_my_day(
    remaining_mins: int,
    start_time_str: str = "",
    start_time: str = "",
    break_mins: int = 10,
    save_immediately: bool = False
) -> Dict[str, Any]:
    """
    Recalculates the remaining schedule given the student's actual remaining study time.
    Preserves urgent/high tasks, shifts lower-priority tasks to tomorrow, and generates
    detailed explanations.
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    tomorrow = now + timedelta(days=1)
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")

    # Determine starting time
    if not start_time_str and start_time:
        start_time_str = start_time
    if not start_time_str:
        # Default to now + 5 mins rounded to 5 mins
        start_dt = now + timedelta(minutes=5)
        minute_round = (start_dt.minute // 5) * 5
        start_time_str = f"{start_dt.hour:02d}:{minute_round:02d}"

    # Get all tasks & exams
    all_tasks = get_all_tasks()
    all_exams = get_all_exams()

    # Identify candidate tasks for rescue:
    # 1. Tasks in status 'pending' or 'missed' or 'in_progress'
    unfinished_tasks = [t for t in all_tasks if t.get('status') in ['pending', 'missed', 'in_progress']]

    # Get today's existing timetable slots
    existing_slots = get_timetable_slots(today_str)
    
    # Calculate urgency score and reasonings for each unfinished task
    scored_tasks = []
    total_unfinished_mins = 0
    for task in unfinished_tasks:
        score, reasons = calculate_task_urgency(task, all_exams, now)
        task_copy = dict(task)
        task_copy['urgency_score'] = score
        task_copy['urgency_reasons'] = reasons
        scored_tasks.append(task_copy)
        total_unfinished_mins += task.get('duration_mins', 45)

    # Sort descending by urgency score
    scored_tasks.sort(key=lambda x: x['urgency_score'], reverse=True)

    # Fit into remaining_mins budget
    allocated_tasks = []
    deferred_tasks = []
    spent_study_mins = 0
    spent_break_mins = 0
    current_time_cursor = datetime.strptime(start_time_str, "%H:%M")

    revised_schedule_slots = []
    detailed_explanations = []

    for idx, task in enumerate(scored_tasks):
        dur = task.get('duration_mins', 45)
        
        # Check if this task fits in remaining available study time
        needed_mins = dur
        # Add break if there's already a scheduled session
        needed_with_break = needed_mins + (break_mins if len(allocated_tasks) > 0 else 0)

        if (spent_study_mins + spent_break_mins + needed_with_break) <= remaining_mins or (len(allocated_tasks) == 0 and needed_mins <= remaining_mins):
            # Task fits!
            if len(allocated_tasks) > 0 and break_mins > 0:
                # Insert break slot
                b_start = current_time_cursor.strftime("%H:%M")
                current_time_cursor += timedelta(minutes=break_mins)
                b_end = current_time_cursor.strftime("%H:%M")
                spent_break_mins += break_mins

                revised_schedule_slots.append({
                    "task_id": None,
                    "title": "Rest & Recharge Break",
                    "subject": "Wellness",
                    "day_of_week": now.strftime("%A"),
                    "start_time": b_start,
                    "end_time": b_end,
                    "slot_type": "break",
                    "status": "scheduled",
                    "date_str": today_str
                })

            slot_start = current_time_cursor.strftime("%H:%M")
            current_time_cursor += timedelta(minutes=dur)
            slot_end = current_time_cursor.strftime("%H:%M")
            spent_study_mins += dur

            slot_data = {
                "task_id": task['id'],
                "title": task['title'],
                "subject": task['subject'],
                "day_of_week": now.strftime("%A"),
                "start_time": slot_start,
                "end_time": slot_end,
                "slot_type": "study",
                "status": "scheduled",
                "date_str": today_str
            }
            revised_schedule_slots.append(slot_data)
            allocated_tasks.append(task)

            detailed_explanations.append({
                "task_id": task['id'],
                "task_title": task['title'],
                "subject": task['subject'],
                "action": "prioritized",
                "urgency_score": task['urgency_score'],
                "duration_mins": dur,
                "scheduled_time": f"{slot_start} - {slot_end}",
                "reasons": task['urgency_reasons'],
                "summary": f"Prioritized for today because of higher urgency ({task['urgency_score']} pts): " + ", ".join(task['urgency_reasons'][:2])
            })
        else:
            # Does not fit within remaining time -> Safely defer to tomorrow
            deferred_tasks.append(task)
            suggested_tomorrow_slot = f"Tomorrow ({tomorrow.strftime('%a')}) 10:00 AM" if len(deferred_tasks) == 1 else f"Tomorrow ({tomorrow.strftime('%a')}) 14:00 PM"
            
            detailed_explanations.append({
                "task_id": task['id'],
                "task_title": task['title'],
                "subject": task['subject'],
                "action": "deferred",
                "urgency_score": task['urgency_score'],
                "duration_mins": dur,
                "suggested_slot": suggested_tomorrow_slot,
                "reasons": task['urgency_reasons'],
                "summary": f"Deferred to protect your available {remaining_mins} min window and prevent burnout. Scheduled deadline has sufficient buffer to reschedule for tomorrow."
            })

    total_used_mins = spent_study_mins + spent_break_mins
    deficit_mins = max(0, total_unfinished_mins - remaining_mins)
    can_fit_all = (deficit_mins == 0) and len(deferred_tasks) == 0

    # Build human-readable high-impact message
    if can_fit_all:
        narrative_status = "Full Coverage Achieved"
        narrative_message = (
            f"Great news! All {len(allocated_tasks)} unfinished tasks ({spent_study_mins}m study + {spent_break_mins}m break) "
            f"fit cleanly within your remaining {remaining_mins} minutes."
        )
    else:
        narrative_status = f"Realistic Triage: {len(allocated_tasks)} Prioritized, {len(deferred_tasks)} Deferred"
        narrative_message = (
            f"You have {remaining_mins} minutes available, but your unfinished study workload requires {total_unfinished_mins} minutes "
            f"({deficit_mins} min deficit). StudyPilot AI prioritised the top {len(allocated_tasks)} most critical task(s) "
            f"({spent_study_mins}m study + {spent_break_mins}m break) and deferred {len(deferred_tasks)} lower-urgency task(s) "
            f"to tomorrow without risking exam readiness."
        )

    # Save to history
    log_rescue(
        remaining_mins=remaining_mins,
        orig_count=len(unfinished_tasks),
        resched_count=len(allocated_tasks),
        def_count=len(deferred_tasks),
        explanations=detailed_explanations,
        accepted=save_immediately
    )

    if save_immediately:
        # Update today's timetable slots
        clear_timetable_slots(today_str)
        save_timetable_slots(revised_schedule_slots)

    return {
        "success": True,
        "can_fit_all": can_fit_all,
        "remaining_mins_budget": remaining_mins,
        "spent_study_mins": spent_study_mins,
        "spent_break_mins": spent_break_mins,
        "total_used_mins": total_used_mins,
        "total_unfinished_mins": total_unfinished_mins,
        "deficit_mins": deficit_mins,
        "narrative_status": narrative_status,
        "narrative_message": narrative_message,
        "original_plan": existing_slots,
        "revised_plan": revised_schedule_slots,
        "allocated_tasks": allocated_tasks,
        "deferred_tasks": deferred_tasks,
        "explanations": detailed_explanations
    }
