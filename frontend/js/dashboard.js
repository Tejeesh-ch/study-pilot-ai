/**
 * StudyPilot AI - Dashboard Controller
 */

const Dashboard = {
  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;

    try {
      const [analytics, timetableRes, settingsRes, tasksRes] = await Promise.all([
        API.getAnalytics(),
        API.getTimetable(),
        API.getSettings(),
        API.getTasks({ status: 'pending' })
      ]);

      const studentName = settingsRes.settings.student_name || 'Alex Rivera';
      const major = settingsRes.settings.college_major || 'Computer Science';
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

      const todaySlots = timetableRes.slots || [];
      const pendingTasks = tasksRes.tasks || [];

      container.innerHTML = `
        <!-- Welcome Hero Banner -->
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge badge-subject">${major}</span>
              <span style="font-size:0.8rem; color:var(--navy-400);">${todayStr}</span>
            </div>
            <h1 style="font-size:1.75rem; font-weight:800; color:var(--navy-900); letter-spacing:-0.02em;">
              Welcome back, ${studentName}! 🚀
            </h1>
            <p style="color:var(--navy-600); font-size:0.95rem;">
              Stay adaptive: You have <strong>${analytics.pending_tasks} study tasks</strong> and <strong>${analytics.exam_readiness.length} upcoming exams</strong> on your radar.
            </p>
          </div>

          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="App.navigate('tasks'); Tasks.openAddModal();">
              ${ICONS.plus} Add Task
            </button>
            <button class="btn btn-rescue" onclick="Rescue.openModal();">
              ${ICONS.rescue} Rescue My Day
            </button>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon purple">${ICONS.tasks}</div>
            <div class="stat-details">
              <div class="stat-label">Task Completion</div>
              <div class="stat-value">${analytics.completion_rate}%</div>
              <div class="stat-subtext">${analytics.completed_tasks} of ${analytics.total_tasks} tasks finished</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon emerald">${ICONS.timer}</div>
            <div class="stat-details">
              <div class="stat-label">Focus Logged Today</div>
              <div class="stat-value">${analytics.today_focus_mins} <span style="font-size:1rem;font-weight:600;">min</span></div>
              <div class="stat-subtext">${analytics.total_focus_sessions} total Pomodoros logged</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon amber">${ICONS.exams}</div>
            <div class="stat-details">
              <div class="stat-label">Exam Readiness</div>
              <div class="stat-value">${analytics.avg_exam_readiness}%</div>
              <div class="stat-subtext">Across ${analytics.exam_readiness.length} registered exams</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon rose">${ICONS.alert}</div>
            <div class="stat-details">
              <div class="stat-label">Pending / Overdue</div>
              <div class="stat-value">${analytics.pending_tasks + analytics.missed_tasks}</div>
              <div class="stat-subtext">${analytics.missed_tasks} marked as missed</div>
            </div>
          </div>
        </div>

        <!-- Prominent Rescue Alert Banner if missed sessions exist -->
        ${analytics.missed_tasks > 0 ? `
          <div class="rescue-hero-banner">
            <div class="rescue-hero-left">
              <h3>${ICONS.rescue} ${analytics.missed_tasks} Study Session Missed Today!</h3>
              <p>
                Don't panic! StudyPilot's adaptive engine can instantly recalculate your evening slots, prioritize urgent midterm topics, and shift low-priority tasks to tomorrow.
              </p>
            </div>
            <button class="btn btn-primary btn-lg" onclick="Rescue.openModal();" style="background:#ffffff; color:#5b21b6; white-space:nowrap; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
              ${ICONS.rescue} Rescue My Schedule Now
            </button>
          </div>
        ` : ''}

        <!-- 2 Column Layout: Today's Schedule & High-Yield Recommendations -->
        <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px;">
          <!-- Left Column: Today's Schedule -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">${ICONS.timetable} Today's Adaptive Schedule</div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-sm btn-secondary" onclick="App.navigate('timetable'); Timetable.openGenerateModal();">
                  ${ICONS.sparkle} Regenerate
                </button>
              </div>
            </div>

            <div id="dashboard-schedule-list">
              ${todaySlots.length === 0 ? `
                <div style="text-align:center; padding:36px; color:var(--navy-400);">
                  <div style="margin-bottom:8px;">${ICONS.timetable}</div>
                  <p>No study sessions scheduled for today yet.</p>
                  <button class="btn btn-sm btn-primary" style="margin-top:12px;" onclick="Timetable.openGenerateModal();">
                    Generate Smart Schedule
                  </button>
                </div>
              ` : `
                <div style="display:flex; flex-direction:column; gap:12px;">
                  ${todaySlots.map(slot => this.renderSlotCard(slot)).join('')}
                </div>
              `}
            </div>
          </div>

          <!-- Right Column: Priority Tasks & Exam Countdown -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Urgent Pending Tasks -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">${ICONS.tasks} Priority Tasks</div>
                <button class="btn btn-sm btn-secondary" onclick="App.navigate('tasks');">View All</button>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                ${pendingTasks.slice(0, 4).map(task => `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid var(--border-light); border-radius:var(--radius-md); background:var(--navy-50);">
                    <div style="flex:1; margin-right:10px;">
                      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                        <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="badge badge-subject">${task.subject}</span>
                      </div>
                      <div style="font-weight:600; font-size:0.88rem; color:var(--navy-900);">${task.title}</div>
                      <div style="font-size:0.75rem; color:var(--navy-500); display:flex; align-items:center; gap:8px; margin-top:2px;">
                        <span>${ICONS.clock} ${task.duration_mins}m</span>
                        <span>• ${formatDeadlineRelative(task.deadline)}</span>
                      </div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="Timer.startWithTask(${task.id}, '${task.title.replace(/'/g, "\\'")}', '${task.subject}', ${task.duration_mins});" title="Start Focus Sprint">
                      ${ICONS.play} Focus
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Exam Countdown Widget -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">${ICONS.exams} Upcoming Exams</div>
                <button class="btn btn-sm btn-secondary" onclick="App.navigate('exams');">View Syllabus</button>
              </div>

              <div style="display:flex; flex-direction:column; gap:12px;">
                ${analytics.exam_readiness.map(ex => `
                  <div style="padding:14px; border:1px solid var(--border-light); border-radius:var(--radius-md); background:#ffffff;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                      <span class="badge badge-subject">${ex.subject}</span>
                      <span class="badge ${ex.days_left <= 3 ? 'badge-urgent' : 'badge-high'}">${ex.days_left <= 0 ? 'Today!' : `In ${ex.days_left} days`}</span>
                    </div>
                    <div style="font-weight:700; font-size:0.92rem; color:var(--navy-900); margin-bottom:6px;">${ex.title}</div>
                    
                    <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.78rem; color:var(--navy-500); margin-bottom:4px;">
                      <span>Readiness Score</span>
                      <strong>${ex.score}%</strong>
                    </div>
                    <div style="height:6px; width:100%; background:var(--navy-200); border-radius:4px; overflow:hidden;">
                      <div style="height:100%; width:${ex.score}%; background:var(--primary-600); border-radius:4px;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--accent-rose);"><p>Error loading dashboard: ${err.message}</p></div>`;
    }
  },

  renderSlotCard(slot) {
    const isBreak = slot.slot_type === 'break';
    const isMissed = slot.status === 'missed';
    const isCompleted = slot.status === 'completed';

    let cardBg = '#ffffff';
    let borderColor = 'var(--border-light)';
    let statusBadge = `<span class="badge badge-low" style="background:#f1f5f9;color:#475569;">Scheduled</span>`;

    if (isBreak) {
      cardBg = '#f0fdf4';
      borderColor = '#bbf7d0';
      statusBadge = `<span class="badge badge-low">Break</span>`;
    } else if (isMissed) {
      cardBg = '#fff1f2';
      borderColor = '#fecdd3';
      statusBadge = `<span class="badge badge-urgent">Missed</span>`;
    } else if (isCompleted) {
      cardBg = '#faf5ff';
      borderColor = '#e9d5ff';
      statusBadge = `<span class="badge badge-low" style="background:#ede9fe;color:#6d28d9;">Completed</span>`;
    }

    return `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-radius:var(--radius-md); border:1px solid ${borderColor}; background:${cardBg}; transition:all 0.2s ease;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="text-align:center; min-width:85px; font-weight:700; font-size:0.85rem; color:var(--navy-700); padding-right:12px; border-right:1px solid var(--border-light);">
            ${slot.start_time} - ${slot.end_time}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
              ${statusBadge}
              ${!isBreak ? `<span class="badge badge-subject">${slot.subject}</span>` : ''}
            </div>
            <div style="font-weight:600; font-size:0.92rem; color:var(--navy-900); text-decoration:${isCompleted ? 'line-through' : 'none'}; opacity:${isCompleted ? 0.7 : 1};">
              ${slot.title}
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px;">
          ${!isBreak && !isCompleted ? `
            <button class="btn btn-sm btn-primary" onclick="Timer.startWithTask(${slot.task_id || 'null'}, '${slot.title.replace(/'/g, "\\'")}', '${slot.subject}', 45);" title="Start Session">
              ${ICONS.play} Start
            </button>
            ${!isMissed ? `
              <button class="btn btn-sm btn-secondary" onclick="Dashboard.markSlotStatus(${slot.id}, 'missed');" title="Simulate Missed Session for Demo">
                Mark Missed
              </button>
            ` : `
              <button class="btn btn-sm btn-rescue" onclick="Rescue.openModal();" title="Rescue this missed session">
                ${ICONS.rescue} Rescue
              </button>
            `}
          ` : ''}
          ${!isBreak && !isCompleted ? `
            <button class="btn btn-sm btn-secondary" onclick="Dashboard.markSlotStatus(${slot.id}, 'completed');" title="Mark Done">
              ${ICONS.check}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  async markSlotStatus(slotId, status) {
    try {
      await API.updateSlotStatus(slotId, status);
      showToast(`Session marked as ${status}!`, status === 'missed' ? 'warning' : 'success');
      await this.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
