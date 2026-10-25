/**
 * StudyPilot AI - "Rescue My Day" Dynamic Reschedule Controller
 * Core Differentiator for Hackathon Demonstrations
 */

const Rescue = {
  currentResult: null,

  openModal() {
    let modal = document.getElementById('modal-rescue');
    if (!modal) {
      this.createModalDOM();
      modal = document.getElementById('modal-rescue');
    }
    this.resetForm();
    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('modal-rescue');
    if (modal) modal.classList.remove('active');
  },

  createModalDOM() {
    const modalHtml = `
      <div id="modal-rescue" class="modal-overlay">
        <div class="modal-content modal-lg">
          <div class="modal-header" style="background: linear-gradient(135deg, #1e1b4b, #312e81); color:#ffffff;">
            <div class="modal-title" style="color:#ffffff;">
              <span style="color:#a78bfa;">${ICONS.rescue}</span> Rescue My Day — Adaptive Schedule Rebalance
            </div>
            <button class="modal-close-btn" style="color:#ffffff;" onclick="Rescue.closeModal();">
              ${ICONS.close}
            </button>
          </div>

          <div class="modal-body" id="rescue-modal-body">
            <!-- Step 1: Input Form -->
            <div id="rescue-step-input">
              <div style="background:var(--primary-50); border:1px solid var(--primary-200); border-radius:var(--radius-md); padding:16px; margin-bottom:20px;">
                <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary-900); margin-bottom:4px;">
                  Ran out of time or missed a session today?
                </h4>
                <p style="font-size:0.85rem; color:var(--primary-800); line-height:1.4;">
                  Tell StudyPilot how much study time you realistically have remaining. Our adaptive triage algorithm analyzes your exam deadlines, subject priorities, and task durations to build a high-yield emergency schedule and safely defer the rest.
                </p>
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight:700;">How much study time do you have remaining today?</label>
                <div class="time-presets-grid">
                  <div class="preset-chip" onclick="Rescue.selectPreset(30, this)">30 Mins</div>
                  <div class="preset-chip" onclick="Rescue.selectPreset(45, this)">45 Mins</div>
                  <div class="preset-chip" onclick="Rescue.selectPreset(60, this)">60 Mins</div>
                  <div class="preset-chip active" onclick="Rescue.selectPreset(90, this)">90 Mins</div>
                  <div class="preset-chip" onclick="Rescue.selectPreset(120, this)">120 Mins</div>
                </div>

                <div class="form-row" style="margin-top:12px;">
                  <div>
                    <label class="form-label">Custom Duration (Minutes)</label>
                    <input type="number" id="rescue-custom-mins" class="form-control" value="90" min="15" max="360" onchange="Rescue.onCustomTimeChange(this.value)">
                  </div>
                  <div>
                    <label class="form-label">Starting Time</label>
                    <input type="time" id="rescue-start-time" class="form-control" value="18:30">
                  </div>
                </div>
              </div>

              <div class="form-row" style="margin-bottom:20px;">
                <div>
                  <label class="form-label">Break Duration</label>
                  <select id="rescue-break-mins" class="form-control">
                    <option value="5">5 Minutes</option>
                    <option value="10" selected>10 Minutes (Recommended)</option>
                    <option value="15">15 Minutes</option>
                    <option value="0">No Breaks (Sprint)</option>
                  </select>
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end;">
                <button class="btn btn-rescue btn-lg" id="btn-run-rescue" onclick="Rescue.executeRescue();">
                  ${ICONS.rescue} Calculate Adaptive Schedule
                </button>
              </div>
            </div>

            <!-- Step 2: Results & Comparison (Hidden initially) -->
            <div id="rescue-step-results" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  resetForm() {
    const inputStep = document.getElementById('rescue-step-input');
    const resultsStep = document.getElementById('rescue-step-results');
    if (inputStep) inputStep.style.display = 'block';
    if (resultsStep) {
      resultsStep.style.display = 'none';
      resultsStep.innerHTML = '';
    }

    // Set starting time to current time or next 5 min interval
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(Math.ceil(now.getMinutes() / 5) * 5 % 60).padStart(2, '0');
    const timeInput = document.getElementById('rescue-start-time');
    if (timeInput) timeInput.value = `${hours}:${mins}`;
  },

  selectPreset(mins, element) {
    document.querySelectorAll('.preset-chip').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    const customInput = document.getElementById('rescue-custom-mins');
    if (customInput) customInput.value = mins;
  },

  onCustomTimeChange(val) {
    document.querySelectorAll('.preset-chip').forEach(el => el.classList.remove('active'));
  },

  async executeRescue() {
    const remainingMins = parseInt(document.getElementById('rescue-custom-mins').value) || 90;
    const startTime = document.getElementById('rescue-start-time').value || '18:30';
    const breakMins = parseInt(document.getElementById('rescue-break-mins').value) || 10;
    const runBtn = document.getElementById('btn-run-rescue');

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = `${ICONS.sparkle} Recalculating Schedule...`;
    }

    try {
      const result = await API.runRescue({
        remaining_mins: remainingMins,
        start_time: startTime,
        break_mins: breakMins,
        save_immediately: false
      });

      this.currentResult = result;
      this.renderResults(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = `${ICONS.rescue} Calculate Adaptive Schedule`;
      }
    }
  },

  renderResults(res) {
    const inputStep = document.getElementById('rescue-step-input');
    const resultsStep = document.getElementById('rescue-step-results');
    if (inputStep) inputStep.style.display = 'none';
    if (!resultsStep) return;

    resultsStep.style.display = 'block';

    const canFitAll = res.can_fit_all;
    const alertBg = canFitAll ? '#ecfdf5' : '#fffbeb';
    const alertBorder = canFitAll ? '#a7f3d0' : '#fde68a';
    const alertColor = canFitAll ? '#065f46' : '#92400e';

    resultsStep.innerHTML = `
      <!-- Triage Realism Status Banner -->
      <div style="background:${alertBg}; border:1px solid ${alertBorder}; border-radius:var(--radius-lg); padding:16px 20px; margin-bottom:20px; color:${alertColor};">
        <div style="font-weight:800; font-size:1.05rem; display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          ${canFitAll ? ICONS.check : ICONS.alert} ${res.narrative_status}
        </div>
        <p style="font-size:0.88rem; line-height:1.5;">${res.narrative_message}</p>
        <div style="margin-top:8px; font-size:0.8rem; font-weight:600; opacity:0.9;">
          ⏱️ Budget: ${res.remaining_mins_budget}m | Study Used: ${res.spent_study_mins}m | Breaks: ${res.spent_break_mins}m ${res.deficit_mins > 0 ? `| Deficit: ${res.deficit_mins}m safely shifted` : ''}
        </div>
      </div>

      <!-- 3-Column Visual Comparison: Original vs Revised vs Deferred -->
      <div class="rescue-comparison-grid">
        <!-- Col 1: Original Today Plan -->
        <div class="rescue-col">
          <div class="rescue-col-header">
            <span>📅 Original Plan</span>
            <span class="badge badge-low">${res.original_plan.length} slots</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${res.original_plan.length === 0 ? '<p style="font-size:0.8rem;color:var(--navy-400);">No prior slots</p>' : ''}
            ${res.original_plan.map(slot => `
              <div class="rescue-item-card ${slot.status === 'missed' ? 'deferred' : ''}">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--navy-500); margin-bottom:2px;">
                  <span>${slot.start_time} - ${slot.end_time}</span>
                  <span class="badge ${slot.status === 'missed' ? 'badge-urgent' : 'badge-low'}">${slot.status}</span>
                </div>
                <div style="font-weight:600; font-size:0.82rem; color:var(--navy-800);">${slot.title}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Col 2: Revised Plan (The Priority Fits) -->
        <div class="rescue-col highlight-revised">
          <div class="rescue-col-header" style="color:var(--primary-700);">
            <span>⚡ Revised Schedule (Fits Today)</span>
            <span class="badge badge-subject">${res.revised_plan.filter(s => s.slot_type === 'study').length} tasks fitted</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${res.revised_plan.map(slot => `
              <div class="rescue-item-card ${slot.slot_type === 'break' ? 'break-slot' : ''}">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--navy-600); margin-bottom:2px;">
                  <strong style="color:var(--primary-700);">${slot.start_time} - ${slot.end_time}</strong>
                  <span class="badge ${slot.slot_type === 'break' ? 'badge-low' : 'badge-subject'}">${slot.slot_type === 'break' ? 'Rest Break' : slot.subject}</span>
                </div>
                <div style="font-weight:700; font-size:0.85rem; color:var(--navy-900);">${slot.title}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Col 3: Safely Deferred Tasks -->
        <div class="rescue-col">
          <div class="rescue-col-header" style="color:#b45309;">
            <span>🗓️ Deferred to Tomorrow</span>
            <span class="badge badge-medium">${res.deferred_tasks.length} tasks</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${res.deferred_tasks.length === 0 ? `
              <p style="font-size:0.8rem;color:var(--accent-emerald);font-weight:600;padding:8px;">
                🎉 Zero tasks deferred! Everything fits within your budget.
              </p>
            ` : ''}
            ${res.deferred_tasks.map(t => `
              <div class="rescue-item-card deferred">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
                  <span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span>
                  <span class="badge badge-subject">${t.subject}</span>
                </div>
                <div style="font-weight:600; font-size:0.82rem; color:var(--navy-800);">${t.title}</div>
                <div style="font-size:0.72rem; color:#b45309; margin-top:4px;">
                  Suggested: Tomorrow 10:00 AM (${t.duration_mins}m)
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Decision Explanations Section -->
      <div style="background:#ffffff; border:1px solid var(--border-light); border-radius:var(--radius-lg); padding:18px; margin-bottom:20px;">
        <h4 style="font-size:0.92rem; font-weight:700; color:var(--navy-900); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
          ${ICONS.coach} Why Did StudyPilot AI Make These Scheduling Decisions?
        </h4>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${res.explanations.map(exp => `
            <div style="padding:10px 14px; border-radius:var(--radius-md); border-left:3px solid ${exp.action === 'prioritized' ? 'var(--primary-600)' : '#f59e0b'}; background:var(--navy-50); font-size:0.82rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <strong style="color:var(--navy-900);">${exp.task_title} (${exp.subject})</strong>
                <span class="badge ${exp.action === 'prioritized' ? 'badge-high' : 'badge-medium'}">
                  ${exp.action.toUpperCase()} • ${exp.urgency_score} pts
                </span>
              </div>
              <p style="color:var(--navy-700); line-height:1.4;">${exp.summary}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding-top:10px;">
        <button class="btn btn-secondary" onclick="Rescue.resetForm();">
          ← Adjust Time & Re-run
        </button>
        <button class="btn btn-rescue btn-lg" onclick="Rescue.applyRevisedSchedule();">
          ${ICONS.check} Accept & Apply Revised Schedule
        </button>
      </div>
    `;
  },

  async applyRevisedSchedule() {
    if (!this.currentResult || !this.currentResult.revised_plan) return;

    try {
      await API.acceptRescuePlan(this.currentResult.revised_plan);
      showToast("🎉 Adaptive rescue schedule applied to your timetable!", 'rescue');
      this.closeModal();

      // Refresh both Dashboard and Timetable views
      if (typeof Dashboard !== 'undefined') await Dashboard.render();
      if (typeof Timetable !== 'undefined') await Timetable.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
