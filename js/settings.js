/**
 * StudyPilot AI - Settings & Demo Data Controller
 */

const Settings = {
  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    try {
      const res = await API.getSettings();
      const s = res.settings || {};

      container.innerHTML = `
        <div style="margin-bottom:24px;">
          <h1 style="font-size:1.6rem; font-weight:800; color:var(--navy-900);">Settings & Demo Controls</h1>
          <p style="color:var(--navy-600); font-size:0.9rem;">
            Configure your study preferences, API credentials, and manage hackathon demonstration data.
          </p>
        </div>

        <!-- Hackathon Demonstration Walkthrough Guide -->
        <div class="card" style="margin-bottom:24px; border:2px solid var(--primary-300); background:linear-gradient(135deg, #ffffff, #faf5ff);">
          <div class="card-header">
            <div class="card-title" style="color:var(--primary-800);">
              ${ICONS.sparkle} Hackathon Evaluation Flow (Step-by-Step)
            </div>
            <button class="btn btn-sm btn-primary" onclick="Settings.resetDemoData();">
              ${ICONS.reset} Reset Sample Student Data
            </button>
          </div>

          <p style="font-size:0.88rem; color:var(--navy-700); margin-bottom:14px; line-height:1.5;">
            Experience StudyPilot AI just like a hackathon judge in 7 easy steps:
          </p>

          <ol style="padding-left:20px; font-size:0.85rem; color:var(--navy-800); display:flex; flex-direction:column; gap:8px;">
            <li><strong>Step 1:</strong> Go to <em>Tasks</em> and add a new study task with Urgent priority.</li>
            <li><strong>Step 2:</strong> Go to <em>Dashboard</em> to review today's study schedule. Notice the <em>Missed Session</em> alert banner.</li>
            <li><strong>Step 3:</strong> On any planned session card, click <em>'Mark Missed'</em> to simulate running out of time.</li>
            <li><strong>Step 4:</strong> Click the glowing <strong>'⚡ Rescue My Day'</strong> button in the top bar.</li>
            <li><strong>Step 5:</strong> Select <strong>60 Mins</strong> or <strong>90 Mins</strong> remaining. Review the 3-column side-by-side comparison, deficit alert, and detailed prioritization reasoning. Click <em>'Accept Revised Schedule'</em>!</li>
            <li><strong>Step 6:</strong> Switch to <em>AI Study Coach</em> and ask: <em>'Explain Binary Search Trees at a beginner level'</em>.</li>
            <li><strong>Step 7:</strong> Start a 25-minute Pomodoro session in <em>Focus Timer</em> or click complete to see real-time progress update in <em>Analytics</em>!</li>
          </ol>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
          <!-- Student Profile & Study Target -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">${ICONS.settings} Student Profile</div>
            </div>

            <div class="form-group">
              <label class="form-label">Student Name</label>
              <input type="text" id="settings-student-name" class="form-control" value="${s.student_name || 'Alex Rivera'}">
            </div>

            <div class="form-group">
              <label class="form-label">College Major</label>
              <input type="text" id="settings-college-major" class="form-control" value="${s.college_major || 'Computer Science (2nd Year)'}">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Daily Study Goal (Hours)</label>
                <input type="number" id="settings-daily-hours" class="form-control" value="${s.daily_study_hours || '4'}" min="1" max="12">
              </div>

              <div class="form-group">
                <label class="form-label">Preferred Study Window</label>
                <select id="settings-preferred-time" class="form-control">
                  <option value="morning" ${s.preferred_study_time === 'morning' ? 'selected' : ''}>Morning</option>
                  <option value="afternoon" ${s.preferred_study_time === 'afternoon' ? 'selected' : ''}>Afternoon</option>
                  <option value="evening" ${s.preferred_study_time === 'evening' ? 'selected' : ''}>Evening</option>
                  <option value="night" ${s.preferred_study_time === 'night' ? 'selected' : ''}>Night</option>
                </select>
              </div>
            </div>

            <button class="btn btn-primary" onclick="Settings.saveProfileSettings();">
              Save Profile Preferences
            </button>
          </div>

          <!-- AI Configuration & Data Management -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">${ICONS.coach} AI Coach Integration</div>
              <span class="badge ${s.has_gemini_key ? 'badge-low' : 'badge-medium'}">
                ${s.has_gemini_key ? 'Gemini Live Configured' : 'Offline Engine Active'}
              </span>
            </div>

            <p style="font-size:0.85rem; color:var(--navy-600); margin-bottom:14px; line-height:1.4;">
              StudyPilot features a built-in pedagogical knowledge engine that works completely offline. You can also provide an optional Google Gemini API key to activate live generative AI:
            </p>

            <div class="form-group">
              <label class="form-label">Google Gemini API Key (Optional)</label>
              <input type="password" id="settings-gemini-key" class="form-control" placeholder="Enter GEMINI_API_KEY (stored securely on backend)">
              <span style="font-size:0.75rem; color:var(--navy-400); margin-top:4px; display:block;">
                API keys are never exposed in frontend code. Defaults safely to built-in knowledge engine if omitted.
              </span>
            </div>

            <button class="btn btn-secondary" style="margin-bottom:24px;" onclick="Settings.saveApiKey();">
              Update API Key
            </button>

            <!-- Reset & Danger Zone -->
            <div style="border-top:1px solid var(--border-light); padding-top:18px;">
              <div class="card-title" style="font-size:0.95rem; color:var(--navy-800); margin-bottom:8px;">
                Reset & Clear Options
              </div>
              <div style="display:flex; gap:12px;">
                <button class="btn btn-secondary" onclick="Settings.resetDemoData();">
                  ${ICONS.reset} Reset Demo Data
                </button>
                <button class="btn btn-secondary" style="color:var(--accent-rose);" onclick="Settings.clearAllData();">
                  ${ICONS.trash} Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color:var(--accent-rose);"><p>Error loading settings: ${e.message}</p></div>`;
    }
  },

  async saveProfileSettings() {
    const studentName = document.getElementById('settings-student-name').value.trim();
    const collegeMajor = document.getElementById('settings-college-major').value.trim();
    const dailyHours = document.getElementById('settings-daily-hours').value;
    const preferredTime = document.getElementById('settings-preferred-time').value;

    try {
      await API.saveSettings({
        student_name: studentName,
        college_major: collegeMajor,
        daily_study_hours: dailyHours,
        preferred_study_time: preferredTime
      });

      showToast("Profile preferences updated!", 'success');
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async saveApiKey() {
    const key = document.getElementById('settings-gemini-key').value.trim();
    try {
      await API.saveSettings({
        gemini_api_key: key
      });
      showToast("Gemini API key updated on backend!", 'success');
      await this.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async resetDemoData() {
    if (!confirm("Reset database to realistic college student demo scenario (Alex Rivera)?")) return;
    try {
      await API.resetDemoData();
      showToast("Demo scenario reseeded successfully!", 'success');
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async clearAllData() {
    if (!confirm("Are you sure you want to clear all tasks, timetable slots, and exam records?")) return;
    try {
      await API.clearAllData();
      showToast("All data cleared.", 'info');
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
