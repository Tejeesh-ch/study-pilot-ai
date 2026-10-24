# StudyPilot AI — The Adaptive Study Planner

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![SQLite](https://img.shields.io/badge/database-SQLite3-green.svg)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Hackathon Demo Ready](https://img.shields.io/badge/Hackathon-Demo%20Ready-7c3aed.svg)](#hackathon-demonstration-flow)

> **StudyPilot AI** is an intelligent, full-stack adaptive study planning platform designed specifically for college students. It helps learners organize coursework across rigorous engineering subjects (Java, Data Structures, Mathematics, Computer Science), schedule exam deadlines, generate balanced study timetables with mandatory cognitive breaks, and dynamically salvage unfinished study sessions with its signature **"Rescue My Day"** adaptive triage engine.

---

## 🌟 Key Differentiator: "Rescue My Day"

Traditional study planners break the moment a student misses a single study session or gets pulled into an unexpected lab. They pile uncompleted tasks into an insurmountable backlog, leading to academic burnout.

**StudyPilot AI solves this with "Rescue My Day":**
- **Prominent Emergency Trigger**: Always accessible in the header with high visibility.
- **Realistic Time Budgeting**: Asks the student: *"How much time do you actually have remaining today?"* (e.g., 60 mins, 90 mins).
- **Multi-Factor Triage Algorithm**:
  $$\text{Urgency Score} = \text{Priority Weight} + \text{Deadline Proximity} + \text{Exam Stakes} + \text{Yield Factor}$$
- **Zero False Promises**: If unfinished tasks require 180 minutes but only 90 minutes remain, StudyPilot **never pretends everything fits**. It flags the deficit and protects student rest.
- **Side-by-Side Visual Comparison**:
  1. *Original Plan*: Highlights missed and stalled blocks.
  2. *Revised Plan*: Compact, achievable high-yield sessions with 10-minute breaks.
  3. *Deferred to Tomorrow*: Safely rescheduled for the next morning with buffer reasons.
- **Transparent Decision Explanations**: Explains exactly *why* each task was prioritized or deferred (e.g., *"Data Structures Trees prioritized because DSA Midterm is in 3 days; Discrete Math deferred to tomorrow 10:00 AM because deadline has 4 days buffer"*).

---

## 🎯 Core Features

### 1. Student Dashboard
- **Personalized Welcome & Real-Time Date/Time**: College major and live session timer.
- **Today's Adaptive Schedule**: Visual timeline with status tags (`Scheduled`, `Completed`, `Missed`) and 1-click focus triggers.
- **Live Metrics**: Task completion percentage, focus minutes logged today, pending task counters, and exam readiness gauges.
- **Proactive Missed Session Alert**: Highlights missed blocks and guides students directly to the Rescue flow.

### 2. Subject & Task Management
- **Full CRUD & Toggle**: Add, edit, delete, and mark tasks as complete with 1-click checkboxes.
- **Academic Fields**: Title, Subject (Java, Data Structures, Mathematics, Computer Science, OS, DB), Duration (mins), Priority (Urgent, High, Medium, Low), Deadline, and Study Notes.
- **Multi-Filter & Instant Search**: Filter by subject, priority level, completion status, or keywords.
- **Persistent Storage**: Backed by a relational SQLite database schema.

### 3. Smart Study Timetable Generator
- **Interleaving Study Science**: Alternates subjects (e.g. 45m Java + break + 45m Discrete Math) instead of exhausting marathon cram sessions.
- **Configurable Horizon**: Daily and 7-day weekly calendar views.
- **Collision Avoidance**: Strictly fits within the student's available daily hours and preferred windows (Morning, Afternoon, Evening, Night).
- **Rest & Hydration Breaks**: Automatically interleaves 5–15 minute breaks between study sprints.

### 4. AI Study Coach
- **Pedagogical Assistance**: Explains complex concepts at a beginner-friendly level using code analogies and intuitive breakdowns.
- **Exam Revision Strategies**: Recommends Active Recall, Feynman Technique, and Spaced Repetition frameworks.
- **Practice Question Generator**: Generates high-yield quiz problems with complete step-by-step solutions.
- **Secure Architecture**: Server-side Google Gemini API integration using environment variables (`GEMINI_API_KEY`). API keys are never exposed to the frontend.
- **Offline Knowledge Engine Fallback**: Includes a built-in pedagogical knowledge base. Transparently labels whether responses are from *Google Gemini (Live AI)* or *StudyPilot Knowledge Engine (Offline Mode)*.

### 5. Pomodoro Focus Timer
- **Working Interactive Timer**: Start, pause, resume, reset, and early finish controls.
- **Configurable Modes**: 25m Pomodoro, 5m Short Break, 15m Long Break.
- **Direct Task Association**: Link any timer session directly to an active task.
- **Browser-Native Audio Chime**: Dual-tone celebration sound synthesized via the Web Audio API (zero external audio file dependencies).
- **Automatic Logging**: Every completed session is persisted to the `focus_sessions` SQLite table.

### 6. Exam Readiness & Syllabus Tracker
- **Countdown Badges**: Real-time days remaining countdown for each midterm and final exam.
- **Syllabus Topic Checklist**: Track topics as *Not Started*, *In Progress*, or *Revised*.
- **Confidence Rating**: 1-to-5 star confidence self-assessment per topic.
- **Algorithmic Readiness Score**: Dynamically calculated percentage reflecting syllabus coverage and confidence.
- **"What to Study Next" Recommendation**: Automatically flags the weakest topic for the closest upcoming exam with a 1-click button to create a study sprint.

### 7. Progress Analytics
- **100% Genuine Data**: Calculated dynamically from SQLite database records.
- **7-Day Study Activity Chart**: Custom canvas bar chart displaying daily focus minutes.
- **Subject Workload Breakdown**: Visual progress bars showing focus distribution across Java, DSA, Math, and CS.

### 8. Settings & Demo Controls
- **Student Preferences**: Customize daily study hours, preferred study windows, and major.
- **Realistic Sample Data**: Pre-loaded college student profile (`Alex Rivera`, CS Sophomore) with realistic coursework and a missed session primed for live hackathon judging.
- **1-Click Reset**: Instant reset to demo data or clear all data.

---

## 🏗️ System Architecture

```
study pilot ai/
├── backend/
│   ├── __init__.py
│   ├── server.py             # HTTP server handling API routes, CORS, and static asset serving
│   ├── database.py           # SQLite3 relational schema, queries, and migrations
│   ├── rescheduler.py        # "Rescue My Day" algorithmic optimization engine
│   ├── timetable_engine.py   # Daily & weekly timetable generator with interleaving
│   ├── ai_coach.py           # Gemini 1.5 Flash integration + offline pedagogical knowledge fallback
│   ├── seed_data.py          # Realistic college student demo dataset (Alex Rivera)
│   └── test_backend.py       # Comprehensive unit tests for database and engines
├── frontend/
│   ├── index.html            # Single Page Application layout
│   ├── css/
│   │   └── styles.css        # Premium SaaS design system (Purple, White, Dark Navy)
│   └── js/
│       ├── utils.js          # SVG icons, Web Audio chime synthesizer, toast notifications
│       ├── api.js            # REST client for backend endpoints
│       ├── dashboard.js      # Student dashboard & timetable cards
│       ├── tasks.js          # Task manager with filters and modals
│       ├── timetable.js      # Smart timetable & generator wizard
│       ├── rescue.js         # "Rescue My Day" modal, algorithm runner & comparison UI
│       ├── timer.js          # Pomodoro timer with Web Audio alerts
│       ├── exams.js          # Exam readiness tracker & syllabus breakdown
│       ├── coach.js          # AI Study Coach chat interface
│       ├── analytics.js      # Canvas activity chart & real database metrics
│       ├── settings.js       # Student preferences & demo reset controller
│       └── app.js            # Main router and navigation coordinator
├── test_api_mock.py          # In-memory mock tests for all REST API endpoints
├── run.py                    # One-command quick launcher for the full application
├── .env.example              # Example environment configuration
├── package.json              # Project metadata & npm script shortcuts
└── README.md                 # Complete documentation & demo walkthrough
```

---

## ⚡ Quickstart Guide

### Prerequisites
- Python 3.10 or higher installed on your system.
- Modern web browser (Chrome, Edge, Firefox, Safari, Opera).
- **Zero paid services required** for all core planner features, timetable generator, focus timer, analytics, and built-in study coach.

### Running the Application

1. **Clone or navigate to the project directory:**
   ```bash
   cd "c:\study pilot ai"
   ```

2. **Launch StudyPilot AI:**
   ```bash
   python run.py
   ```

3. **Open the application in your browser:**
   ```
   http://localhost:8000
   ```

*(On startup, the SQLite database is automatically initialized and seeded with the realistic student demo data).*

---

## 🧪 Running Automated Tests

Run backend unit tests:
```bash
python -m unittest backend/test_backend.py
```

Run mock API route tests:
```bash
python test_api_mock.py
```

---

## 🏆 Hackathon Demonstration Flow

Follow this 7-step presentation script during judging to highlight every major capability in under 3 minutes:

| Step | Action | What to Point Out to Judges |
| :--- | :--- | :--- |
| **1. Add Task** | Click **Tasks & Subjects** $\rightarrow$ **Add New Study Task**. Enter `Graph BFS Practice`, Subject `Computer Science`, Priority `Urgent`, Duration `30m`. Save task. | Instant persistence in SQLite database with deadline countdown. |
| **2. Review Schedule** | Click **Dashboard**. Point out the schedule timeline and metric cards. | Realistic college student profile (`Alex Rivera`, CS Sophomore). Notice the session marked **Missed** from the morning lab. |
| **3. Simulate Missed Session** | Click **Mark Missed** on any planned afternoon session card. | The dashboard immediately alerts the student: *"1 Study Session Missed Today!"* with an emergency callout. |
| **4. Trigger Rescue** | Click the glowing **"⚡ Rescue My Day"** button in the header. | Explain how students usually abandon planners when plans derail, but StudyPilot adapts in real time. |
| **5. Adaptive Rebalance** | Select **90 Mins** remaining. Click **Calculate Adaptive Schedule**. | **Core Differentiator**: Point out the 3-column side-by-side comparison (*Original vs Revised vs Deferred*), the deficit alert (*"170m workload vs 90m budget"*), and the transparent explanation card justifying why urgent tasks were prioritized and lower-priority tasks safely deferred to protect sleep. Click **Accept & Apply Revised Schedule**! |
| **6. Ask AI Coach** | Switch to **AI Study Coach**. Click the chip: *"Explain Binary Search Trees at a beginner level"*. | Notice the structured beginner explanation with ASCII trees, high-yield practice questions with solutions, and transparent provider badge. |
| **7. Focus & Analytics** | Go to **Focus Timer**, select a task, and click **Start** (or click Finish to log a session). Then open **Analytics**. | Point out that all metrics and the 7-day activity chart are computed directly from actual SQLite records, with zero hardcoded fake numbers. |

---

## 🔑 Environment Variables (Optional)

Create a `.env` file or export environment variables:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port for the local web server |
| `GEMINI_API_KEY` | *(empty)* | Optional Google Gemini API key to activate live generative AI |

*Note: If `GEMINI_API_KEY` is not provided, the application runs seamlessly using its built-in pedagogical knowledge engine and explicitly badges its offline status.*

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
"# study-pilot-ai" 
