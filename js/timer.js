/**
 * StudyPilot AI - Pomodoro Focus Timer Controller
 */

const Timer = {
  durationMins: 25,
  timeLeftSeconds: 25 * 60,
  timerInterval: null,
  isRunning: false,
  mode: 'pomodoro', // 'pomodoro', 'short_break', 'long_break'
  activeTaskId: null,
  activeTaskTitle: 'General Focus Sprint',
  activeSubject: 'General',

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-timer');
    if (!container) return;

    try {
      const [tasksRes, sessionsRes] = await Promise.all([
        API.getTasks({ status: 'pending' }),
        API.request('/api/focus-sessions')
      ]);

      const pendingTasks = tasksRes.tasks || [];
      const pastSessions = sessionsRes.sessions || [];

      const minutes = Math.floor(this.timeLeftSeconds / 60);
      const seconds = this.timeLeftSeconds % 60;
      const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Calculate progress for circular SVG
      const totalSecs = this.durationMins * 60;
      const progressPercent = totalSecs > 0 ? (this.timeLeftSeconds / totalSecs) : 0;
      const strokeDashoffset = 754 * (1 - progressPercent); // 2 * PI * 120 = 754

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; color:var(--navy-900);">Focus Timer & Pomodoro</h1>
            <p style="color:var(--navy-600); font-size:0.9rem;">
              Maintain high cognitive stamina with structured work and recovery intervals.
            </p>
          </div>

          <!-- Mode Selector Tabs -->
          <div style="display:flex; gap:6px; background:var(--navy-50); padding:4px; border-radius:var(--radius-md); border:1px solid var(--border-light);">
            <button class="btn btn-sm ${this.mode === 'pomodoro' ? 'btn-primary' : 'btn-secondary'}" onclick="Timer.switchMode('pomodoro', 25)">
              Pomodoro (25m)
            </button>
            <button class="btn btn-sm ${this.mode === 'short_break' ? 'btn-primary' : 'btn-secondary'}" onclick="Timer.switchMode('short_break', 5)">
              Short Break (5m)
            </button>
            <button class="btn btn-sm ${this.mode === 'long_break' ? 'btn-primary' : 'btn-secondary'}" onclick="Timer.switchMode('long_break', 15)">
              Long Break (15m)
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:24px;">
          <!-- Timer Display Card -->
          <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 24px; text-align:center;">
            <!-- Active Task Selector -->
            <div style="margin-bottom:24px; max-width:400px; width:100%;">
              <label class="form-label" style="font-size:0.8rem; text-transform:uppercase; letter-spacing:0.04em;">Focusing On:</label>
              <select class="form-control" onchange="Timer.onTaskSelect(this.value)">
                <option value="none">-- General Focus Sprint --</option>
                ${pendingTasks.map(t => `
                  <option value="${t.id}" ${this.activeTaskId === t.id ? 'selected' : ''}>
                    [${t.subject}] ${t.title}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Circular SVG Timer -->
            <div style="position:relative; width:280px; height:280px; margin-bottom:32px;">
              <svg width="280" height="280" viewBox="0 0 280 280" style="transform: rotate(-90deg);">
                <!-- Background Circle -->
                <circle cx="140" cy="140" r="120" stroke="#f1f5f9" stroke-width="12" fill="none" />
                <!-- Progress Circle -->
                <circle id="timer-progress-circle" cx="140" cy="140" r="120" stroke="var(--primary-600)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="754" stroke-dashoffset="${strokeDashoffset}" style="transition: stroke-dashoffset 0.8s ease;" />
              </svg>

              <!-- Central Countdown Display -->
              <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div id="timer-countdown-text" style="font-size:3.5rem; font-weight:800; font-family:var(--font-mono); color:var(--navy-900); letter-spacing:-0.04em;">
                  ${timeDisplay}
                </div>
                <div style="font-size:0.85rem; font-weight:600; color:var(--navy-400); text-transform:uppercase; letter-spacing:0.08em; margin-top:4px;">
                  ${this.mode.replace('_', ' ')}
                </div>
              </div>
            </div>

            <!-- Controls -->
            <div style="display:flex; gap:16px; align-items:center;">
              <button class="btn btn-secondary btn-lg" onclick="Timer.resetTimer();" title="Reset Timer">
                ${ICONS.reset} Reset
              </button>

              <button class="btn btn-primary btn-lg" id="btn-timer-toggle" onclick="Timer.toggleTimer();" style="min-width:140px; font-size:1.05rem;">
                ${this.isRunning ? `${ICONS.pause} Pause` : `${ICONS.play} Start`}
              </button>

              <button class="btn btn-secondary btn-lg" onclick="Timer.completeSessionEarly();" title="Log & Complete Session">
                ${ICONS.check} Finish
              </button>
            </div>
          </div>

          <!-- Past Focus History -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">${ICONS.timer} Recent Completed Sprints</div>
              <span class="badge badge-low">${pastSessions.length} logged</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; max-height:450px; overflow-y:auto;">
              ${pastSessions.length === 0 ? `
                <p style="color:var(--navy-400); font-size:0.85rem; text-align:center; padding:30px;">
                  No focus sessions logged yet today. Hit Start to begin your first 25-minute sprint!
                </p>
              ` : pastSessions.slice(0, 8).map(s => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius:var(--radius-md); background:var(--navy-50); border:1px solid var(--border-light);">
                  <div>
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                      <span class="badge badge-subject">${s.subject || 'General'}</span>
                      <span style="font-size:0.75rem; color:var(--navy-400);">${new Date(s.completed_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div style="font-weight:600; font-size:0.88rem; color:var(--navy-900);">
                      ${s.task_title || 'Focus Session'}
                    </div>
                  </div>
                  <div style="font-weight:700; font-size:0.92rem; color:var(--accent-emerald);">
                    +${s.duration_mins}m
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color:var(--accent-rose);"><p>Error loading timer: ${e.message}</p></div>`;
    }
  },

  switchMode(mode, mins) {
    this.pauseTimer();
    this.mode = mode;
    this.durationMins = mins;
    this.timeLeftSeconds = mins * 60;
    this.render();
  },

  onTaskSelect(taskIdStr) {
    if (taskIdStr === 'none') {
      this.activeTaskId = null;
      this.activeTaskTitle = 'General Focus Sprint';
      this.activeSubject = 'General';
    } else {
      this.activeTaskId = parseInt(taskIdStr);
      API.getTasks().then(res => {
        const t = (res.tasks || []).find(x => x.id === this.activeTaskId);
        if (t) {
          this.activeTaskTitle = t.title;
          this.activeSubject = t.subject;
        }
      });
    }
  },

  startWithTask(taskId, title, subject, estimatedMins) {
    this.activeTaskId = taskId;
    this.activeTaskTitle = title;
    this.activeSubject = subject;
    this.switchMode('pomodoro', 25);
    App.navigate('timer');
    this.startTimer();
  },

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  },

  startTimer() {
    if (this.isRunning) return;
    this.isRunning = true;
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) btn.innerHTML = `${ICONS.pause} Pause`;

    this.timerInterval = setInterval(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
        this.updateDisplay();
      } else {
        this.onTimerCompleted();
      }
    }, 1000);
  },

  pauseTimer() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) btn.innerHTML = `${ICONS.play} Resume`;
  },

  resetTimer() {
    this.pauseTimer();
    this.timeLeftSeconds = this.durationMins * 60;
    this.updateDisplay();
  },

  updateDisplay() {
    const textEl = document.getElementById('timer-countdown-text');
    const circleEl = document.getElementById('timer-progress-circle');

    const minutes = Math.floor(this.timeLeftSeconds / 60);
    const seconds = this.timeLeftSeconds % 60;
    const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (textEl) textEl.textContent = timeDisplay;

    if (circleEl) {
      const totalSecs = this.durationMins * 60;
      const progressPercent = totalSecs > 0 ? (this.timeLeftSeconds / totalSecs) : 0;
      const strokeDashoffset = 754 * (1 - progressPercent);
      circleEl.style.strokeDashoffset = strokeDashoffset;
    }
  },

  async onTimerCompleted() {
    this.pauseTimer();
    playChimeSound('timer_done');

    showToast(`🎉 Focus session completed! Logged ${this.durationMins} minutes to your study progress.`, 'success', 6000);

    try {
      await API.logFocusSession({
        task_id: this.activeTaskId,
        task_title: this.activeTaskTitle,
        subject: this.activeSubject,
        duration_mins: this.durationMins,
        session_type: this.mode
      });

      // Switch to break
      if (this.mode === 'pomodoro') {
        this.switchMode('short_break', 5);
      } else {
        this.switchMode('pomodoro', 25);
      }
    } catch (e) {
      console.error("Error logging focus session:", e);
    }
  },

  async completeSessionEarly() {
    const elapsedMins = Math.max(1, Math.round((this.durationMins * 60 - this.timeLeftSeconds) / 60));
    this.pauseTimer();
    playChimeSound('timer_done');

    try {
      await API.logFocusSession({
        task_id: this.activeTaskId,
        task_title: this.activeTaskTitle,
        subject: this.activeSubject,
        duration_mins: elapsedMins,
        session_type: this.mode
      });

      showToast(`Logged ${elapsedMins} focus minutes!`, 'success');
      this.resetTimer();
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
