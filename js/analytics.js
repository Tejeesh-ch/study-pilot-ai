/**
 * StudyPilot AI - Progress Analytics & Real Data Visualization
 */

const Analytics = {
  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-analytics');
    if (!container) return;

    try {
      const data = await API.getAnalytics();

      container.innerHTML = `
        <div style="margin-bottom:24px;">
          <h1 style="font-size:1.6rem; font-weight:800; color:var(--navy-900);">Progress Analytics</h1>
          <p style="color:var(--navy-600); font-size:0.9rem;">
            Real-time metrics computed directly from your SQLite database. Zero hardcoded placeholders.
          </p>
        </div>

        <!-- Metrics Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon purple">${ICONS.tasks}</div>
            <div class="stat-details">
              <div class="stat-label">Task Completion Rate</div>
              <div class="stat-value">${data.completion_rate}%</div>
              <div class="stat-subtext">${data.completed_tasks} completed / ${data.total_tasks} total</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon emerald">${ICONS.timer}</div>
            <div class="stat-details">
              <div class="stat-label">Total Focus Time</div>
              <div class="stat-value">${data.total_focus_mins} <span style="font-size:1rem;font-weight:600;">min</span></div>
              <div class="stat-subtext">${data.total_focus_sessions} completed Pomodoros</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon amber">${ICONS.exams}</div>
            <div class="stat-details">
              <div class="stat-label">Exam Readiness Index</div>
              <div class="stat-value">${data.avg_exam_readiness}%</div>
              <div class="stat-subtext">Across ${data.exam_readiness.length} subjects</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon rose">${ICONS.clock}</div>
            <div class="stat-details">
              <div class="stat-label">Today's Focus Log</div>
              <div class="stat-value">${data.today_focus_mins} <span style="font-size:1rem;font-weight:600;">min</span></div>
              <div class="stat-subtext">Active daily pace</div>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:24px; margin-bottom:24px;">
          <!-- 7-Day Activity Chart Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">${ICONS.analytics} Weekly Study Activity (Past 7 Days)</div>
              <span class="badge badge-subject">Focus Minutes Logged</span>
            </div>

            <div style="padding:10px 0;">
              <canvas id="weekly-activity-canvas" width="600" height="240" style="width:100%; height:240px;"></canvas>
            </div>
          </div>

          <!-- Subject Distribution Breakdown -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">${ICONS.tasks} Subject Workload Distribution</div>
            </div>

            <div style="display:flex; flex-direction:column; gap:16px;">
              ${Object.keys(data.subject_counts).map(subj => {
                const count = data.subject_counts[subj];
                const pct = data.total_tasks > 0 ? Math.round((count / data.total_tasks) * 100) : 0;
                const focusMins = data.subject_focus_mins[subj] || 0;

                return `
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; color:var(--navy-800); margin-bottom:4px;">
                      <span>${subj} (${count} tasks)</span>
                      <span>${focusMins} mins focus • ${pct}%</span>
                    </div>
                    <div style="height:8px; width:100%; background:var(--navy-100); border-radius:4px; overflow:hidden;">
                      <div style="height:100%; width:${pct}%; background:var(--primary-600); border-radius:4px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      // Render custom chart on canvas
      this.drawWeeklyChart(data.activity_7days);
    } catch (e) {
      container.innerHTML = `<div class="card" style="color:var(--accent-rose);"><p>Error loading analytics: ${e.message}</p></div>`;
    }
  },

  drawWeeklyChart(activity) {
    const canvas = document.getElementById('weekly-activity-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale for high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 240 * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = 240;
    const padding = { top: 20, right: 20, bottom: 40, left: 45 };

    ctx.clearRect(0, 0, width, height);

    const maxMins = Math.max(60, ...activity.map(a => a.focus_mins)) * 1.2;
    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;
    const barWidth = Math.min(40, (chartWidth / activity.length) * 0.5);
    const step = chartWidth / activity.length;

    // Draw horizontal grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const yVal = Math.round((maxMins / 4) * i);
      const yPos = height - padding.bottom - (chartHeight / 4) * i;

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      ctx.fillText(`${yVal}m`, padding.left - 8, yPos + 3);
    }

    // Draw Bars
    activity.forEach((item, idx) => {
      const x = padding.left + idx * step + (step - barWidth) / 2;
      const barH = (item.focus_mins / maxMins) * chartHeight;
      const y = height - padding.bottom - barH;

      // Gradient bar fill
      const grad = ctx.createLinearGradient(0, y, 0, height - padding.bottom);
      grad.addColorStop(0, '#7c3aed');
      grad.addColorStop(1, '#a78bfa');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, Math.max(4, barH), [4, 4, 0, 0]);
      ctx.fill();

      // Day Label
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(item.day, x + barWidth / 2, height - padding.bottom + 18);

      // Value atop bar if > 0
      if (item.focus_mins > 0) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(`${item.focus_mins}m`, x + barWidth / 2, y - 6);
      }
    });
  }
};
