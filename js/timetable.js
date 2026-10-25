/**
 * StudyPilot AI - Smart Study Timetable Controller
 */

const Timetable = {
  viewMode: 'daily', // 'daily' or 'weekly'

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-timetable');
    if (!container) return;

    try {
      const res = await API.getTimetable();
      const slots = res.slots || [];

      // Group slots by date
      const slotsByDate = {};
      slots.forEach(s => {
        const d = s.date_str;
        if (!slotsByDate[d]) slotsByDate[d] = [];
        slotsByDate[d].push(s);
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const todaySlots = slotsByDate[todayStr] || slots.slice(0, 6);

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; color:var(--navy-900);">Smart Study Timetable</h1>
            <p style="color:var(--navy-600); font-size:0.9rem;">
              Balanced scheduling with cognitive interleaving, mandatory rest breaks, and collision avoidance.
            </p>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">
            <div style="display:flex; gap:4px; background:var(--navy-50); padding:4px; border-radius:var(--radius-md); border:1px solid var(--border-light);">
              <button class="btn btn-sm ${this.viewMode === 'daily' ? 'btn-primary' : 'btn-secondary'}" onclick="Timetable.setViewMode('daily')">
                Today's Timeline
              </button>
              <button class="btn btn-sm ${this.viewMode === 'weekly' ? 'btn-primary' : 'btn-secondary'}" onclick="Timetable.setViewMode('weekly')">
                Weekly Overview
              </button>
            </div>

            <button class="btn btn-primary" onclick="Timetable.openGenerateModal();">
              ${ICONS.sparkle} Generate Timetable
            </button>
          </div>
        </div>

        ${this.viewMode === 'daily' ? this.renderDailyView(todaySlots) : this.renderWeeklyView(slotsByDate)}
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color:var(--accent-rose);"><p>Error loading timetable: ${e.message}</p></div>`;
    }
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  },

  renderDailyView(slots) {
    if (!slots || slots.length === 0) {
      return `
        <div class="card" style="text-align:center; padding:60px; color:var(--navy-400);">
          <div style="margin-bottom:12px;">${ICONS.timetable}</div>
          <h3 style="font-size:1.15rem; color:var(--navy-800); margin-bottom:6px;">No Timetable Generated Yet</h3>
          <p style="font-size:0.9rem; max-width:450px; margin:0 auto 16px auto;">
            Let StudyPilot analyze your pending tasks, upcoming exam dates, and preferred study hours to generate an optimal timetable.
          </p>
          <button class="btn btn-primary" onclick="Timetable.openGenerateModal();">
            ${ICONS.sparkle} Generate Smart Schedule
          </button>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            ${ICONS.clock} Today's Schedule — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <span class="badge badge-subject">${slots.filter(s => s.slot_type === 'study').length} Study Sessions</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          ${slots.map(s => Dashboard.renderSlotCard(s)).join('')}
        </div>
      </div>
    `;
  },

  renderWeeklyView(slotsByDate) {
    const dates = Object.keys(slotsByDate);
    if (dates.length === 0) {
      return this.renderDailyView([]);
    }

    return `
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
        ${dates.map(dateKey => {
          const dateObj = new Date(dateKey + 'T00:00:00');
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const daySlots = slotsByDate[dateKey] || [];

          return `
            <div class="card" style="padding:18px;">
              <div style="font-weight:700; font-size:1rem; color:var(--navy-900); padding-bottom:10px; margin-bottom:12px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">
                <span>${dayName}</span>
                <span class="badge badge-low">${daySlots.filter(s => s.slot_type === 'study').length} sessions</span>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px;">
                ${daySlots.map(s => `
                  <div style="padding:8px 10px; border-radius:var(--radius-md); font-size:0.8rem; background:${s.slot_type === 'break' ? '#f0fdf4' : 'var(--navy-50)'}; border:1px solid ${s.slot_type === 'break' ? '#bbf7d0' : 'var(--border-light)'};">
                    <div style="display:flex; justify-content:space-between; font-weight:700; color:${s.slot_type === 'break' ? '#166534' : 'var(--primary-700)'}; margin-bottom:2px;">
                      <span>${s.start_time} - ${s.end_time}</span>
                      <span>${s.slot_type === 'break' ? 'Break' : s.subject}</span>
                    </div>
                    <div style="font-weight:600; color:var(--navy-800); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      ${s.title}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openGenerateModal() {
    let modal = document.getElementById('modal-generate-timetable');
    if (!modal) {
      this.createGenerateModalDOM();
      modal = document.getElementById('modal-generate-timetable');
    }
    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('modal-generate-timetable');
    if (modal) modal.classList.remove('active');
  },

  createGenerateModalDOM() {
    const html = `
      <div id="modal-generate-timetable" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">
              <span style="color:var(--primary-600);">${ICONS.sparkle}</span> Generate Smart Study Timetable
            </div>
            <button class="modal-close-btn" onclick="Timetable.closeModal();">${ICONS.close}</button>
          </div>

          <div class="modal-body">
            <p style="font-size:0.85rem; color:var(--navy-600); margin-bottom:18px;">
              StudyPilot schedules your pending tasks based on deadline urgency, interleaves diverse subjects, and guarantees rest breaks.
            </p>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Available Study Hours / Day *</label>
                <select id="tt-daily-hours" class="form-control">
                  <option value="2.0">2 Hours / Day</option>
                  <option value="3.0">3 Hours / Day</option>
                  <option value="4.0" selected>4 Hours / Day (Recommended)</option>
                  <option value="5.0">5 Hours / Day</option>
                  <option value="6.0">6 Hours / Day (Intensive)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Preferred Study Window *</label>
                <select id="tt-preferred-time" class="form-control">
                  <option value="morning">Morning (8:30 AM - 12:00 PM)</option>
                  <option value="afternoon">Afternoon (1:30 PM - 5:00 PM)</option>
                  <option value="evening" selected>Evening (6:00 PM - 9:30 PM)</option>
                  <option value="night">Night Owl (8:00 PM - 11:30 PM)</option>
                  <option value="balanced">Balanced Split Sessions</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Study Session Duration</label>
                <select id="tt-session-dur" class="form-control">
                  <option value="25">25 Mins (Pomodoro)</option>
                  <option value="45" selected>45 Mins (Standard Focus)</option>
                  <option value="60">60 Mins (Deep Work)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Break Duration</label>
                <select id="tt-break-dur" class="form-control">
                  <option value="5">5 Minutes</option>
                  <option value="10" selected>10 Minutes</option>
                  <option value="15">15 Minutes</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Plan Horizon</label>
              <select id="tt-days" class="form-control">
                <option value="1">Today Only (1 Day)</option>
                <option value="3">Next 3 Days</option>
                <option value="7" selected>Full Week (7 Days)</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Timetable.closeModal();">Cancel</button>
            <button class="btn btn-primary" onclick="Timetable.executeGenerate();">
              ${ICONS.sparkle} Generate & Apply Timetable
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  async executeGenerate() {
    const dailyHours = parseFloat(document.getElementById('tt-daily-hours').value) || 4.0;
    const preferredTime = document.getElementById('tt-preferred-time').value || 'evening';
    const sessionDur = parseInt(document.getElementById('tt-session-dur').value) || 45;
    const breakDur = parseInt(document.getElementById('tt-break-dur').value) || 10;
    const days = parseInt(document.getElementById('tt-days').value) || 7;

    try {
      await API.generateTimetable({
        daily_hours: dailyHours,
        preferred_time: preferredTime,
        session_duration_mins: sessionDur,
        break_duration_mins: breakDur,
        days: days
      });

      showToast("Smart study timetable generated successfully!", 'success');
      this.closeModal();
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
