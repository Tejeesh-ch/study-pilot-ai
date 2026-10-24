/**
 * StudyPilot AI - Exam Readiness & Syllabus Tracker Controller
 */

const Exams = {
  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-exams');
    if (!container) return;

    try {
      const [examsRes, analyticsRes] = await Promise.all([
        API.getExams(),
        API.getAnalytics()
      ]);

      const exams = examsRes.exams || [];
      const recommended = analyticsRes.recommended_next_topics || [];

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; color:var(--navy-900);">Exam Readiness & Syllabus Tracker</h1>
            <p style="color:var(--navy-600); font-size:0.9rem;">
              Track syllabus topics, monitor confidence scores, and pinpoint high-yield study topics.
            </p>
          </div>

          <button class="btn btn-primary" onclick="Exams.openAddModal();">
            ${ICONS.plus} Add Upcoming Exam
          </button>
        </div>

        <!-- High-Yield "What to Study Next" Recommendation Banner -->
        ${recommended.length > 0 ? `
          <div style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border:1px solid #c4b5fd; border-radius:var(--radius-lg); padding:20px; margin-bottom:28px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
              <div>
                <div style="font-weight:700; font-size:0.82rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--primary-700); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                  ${ICONS.sparkle} Recommended Next Focus Area
                </div>
                <h3 style="font-size:1.15rem; font-weight:800; color:var(--navy-900); margin-bottom:4px;">
                  ${recommended[0].topic_name} (${recommended[0].subject})
                </h3>
                <p style="font-size:0.85rem; color:var(--navy-700);">
                  Identified as your lowest confidence topic for <strong>${recommended[0].exam_title}</strong> (due in ${recommended[0].days_left} days).
                </p>
              </div>

              <button class="btn btn-primary" onclick="Exams.createTaskFromRecommendation('${recommended[0].topic_name.replace(/'/g, "\\'")}', '${recommended[0].subject}');">
                ${ICONS.plus} Create 45m Study Sprint
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Exams List -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          ${exams.length === 0 ? `
            <div class="card" style="text-align:center; padding:48px; color:var(--navy-400);">
              <div style="margin-bottom:8px;">${ICONS.exams}</div>
              <p style="font-size:1rem; font-weight:600; color:var(--navy-700);">No exams registered yet.</p>
              <button class="btn btn-sm btn-primary" style="margin-top:12px;" onclick="Exams.openAddModal();">
                Add Exam
              </button>
            </div>
          ` : exams.map(ex => this.renderExamCard(ex)).join('')}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color:var(--accent-rose);"><p>Error loading exams: ${e.message}</p></div>`;
    }
  },

  renderExamCard(exam) {
    const topics = exam.syllabus_topics || [];
    const totalTopics = topics.length;
    const revisedTopics = topics.filter(t => t.status === 'revised').length;
    const inProgTopics = topics.filter(t => t.status === 'in_progress').length;

    const score = totalTopics > 0 ? Math.round(((revisedTopics * 1.0 + inProgTopics * 0.5) / totalTopics) * 100) : 0;

    const examDate = new Date(exam.exam_date + 'T00:00:00');
    const now = new Date();
    const diffDays = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));

    let countdownBadge = `<span class="badge badge-high">In ${diffDays} days</span>`;
    if (diffDays <= 0) countdownBadge = `<span class="badge badge-urgent">Today!</span>`;
    else if (diffDays <= 3) countdownBadge = `<span class="badge badge-urgent">In ${diffDays} days</span>`;

    return `
      <div class="card">
        <div class="card-header" style="align-items:flex-start;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span class="badge badge-subject">${exam.subject}</span>
              ${countdownBadge}
              <span style="font-size:0.8rem; color:var(--navy-400);">${examDate.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
            </div>
            <h2 style="font-size:1.25rem; font-weight:800; color:var(--navy-900);">${exam.title}</h2>
            ${exam.notes ? `<p style="font-size:0.82rem; color:var(--navy-500); margin-top:4px;">${exam.notes}</p>` : ''}
          </div>

          <div style="text-align:right; min-width:140px;">
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--navy-500); margin-bottom:2px;">Readiness</div>
            <div style="font-size:1.5rem; font-weight:800; color:var(--primary-600);">${score}%</div>
            <div style="height:6px; width:100%; background:var(--navy-100); border-radius:4px; overflow:hidden; margin-top:4px;">
              <div style="height:100%; width:${score}%; background:var(--primary-600); border-radius:4px;"></div>
            </div>
          </div>
        </div>

        <!-- Topics Checklist -->
        <div style="margin-top:16px;">
          <div style="font-weight:700; font-size:0.9rem; color:var(--navy-800); margin-bottom:12px; display:flex; justify-content:space-between;">
            <span>Syllabus Breakdown (${revisedTopics} of ${totalTopics} revised)</span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:10px;">
            ${topics.map(t => `
              <div style="padding:10px 14px; border-radius:var(--radius-md); background:var(--navy-50); border:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="flex:1;">
                  <div style="font-weight:600; font-size:0.85rem; color:var(--navy-900);">${t.name}</div>
                  <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                    <span style="font-size:0.72rem; color:var(--navy-500);">Confidence:</span>
                    <span style="font-size:0.75rem; color:#f59e0b;">${'★'.repeat(t.confidence || 3)}${'☆'.repeat(5 - (t.confidence || 3))}</span>
                  </div>
                </div>

                <!-- Status Selector -->
                <select class="form-control" style="width:auto; font-size:0.75rem; padding:4px 8px;" onchange="Exams.updateTopicStatus(${exam.id}, '${t.id || t.name}', this.value)">
                  <option value="not_started" ${t.status === 'not_started' ? 'selected' : ''}>Not Started</option>
                  <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                  <option value="revised" ${t.status === 'revised' ? 'selected' : ''}>Revised</option>
                </select>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px; padding-top:12px; border-top:1px solid var(--border-light);">
          <button class="btn btn-sm btn-secondary" onclick="Exams.deleteExam(${exam.id});" style="color:var(--accent-rose);">
            ${ICONS.trash} Delete Exam
          </button>
        </div>
      </div>
    `;
  },

  async updateTopicStatus(examId, topicId, newStatus) {
    try {
      await API.updateExamTopic(examId, topicId, newStatus, null);
      showToast("Syllabus progress updated!", 'success');
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteExam(examId) {
    if (!confirm("Are you sure you want to remove this exam?")) return;
    try {
      await API.deleteExam(examId);
      showToast("Exam removed.", 'info');
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  createTaskFromRecommendation(topicName, subject) {
    App.navigate('tasks');
    Tasks.openAddModal();
    setTimeout(() => {
      document.getElementById('form-task-title').value = `Deep Study: ${topicName}`;
      document.getElementById('form-task-subject').value = subject;
      document.getElementById('form-task-priority').value = 'Urgent';
      document.getElementById('form-task-duration').value = '45';
    }, 100);
  },

  openAddModal() {
    let modal = document.getElementById('modal-add-exam');
    if (!modal) {
      this.createExamModalDOM();
      modal = document.getElementById('modal-add-exam');
    }
    document.getElementById('exam-title-input').value = '';
    document.getElementById('exam-subject-input').value = 'Data Structures';
    
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 5);
    document.getElementById('exam-date-input').value = defaultDate.toISOString().split('T')[0];
    document.getElementById('exam-topics-input').value = 'Chapter 1: Foundations\nChapter 2: Core Data Types\nChapter 3: Search & Sort\nChapter 4: Advanced Trees';
    document.getElementById('exam-notes-input').value = '';

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('modal-add-exam');
    if (modal) modal.classList.remove('active');
  },

  createExamModalDOM() {
    const html = `
      <div id="modal-add-exam" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">Add Upcoming Exam / Midterm</div>
            <button class="modal-close-btn" onclick="Exams.closeModal();">${ICONS.close}</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Exam Title *</label>
              <input type="text" id="exam-title-input" class="form-control" placeholder="e.g. Data Structures Midterm Exam">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Subject *</label>
                <select id="exam-subject-input" class="form-control">
                  <option value="Data Structures">Data Structures</option>
                  <option value="Java">Java</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Operating Systems">Operating Systems</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Exam Date *</label>
                <input type="date" id="exam-date-input" class="form-control">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Syllabus Topics (One per line)</label>
              <textarea id="exam-topics-input" class="form-control" rows="4" placeholder="Enter syllabus topics, one per line..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Exam Room & Notes</label>
              <input type="text" id="exam-notes-input" class="form-control" placeholder="e.g. Room 302, 1 cheat sheet allowed">
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Exams.closeModal();">Cancel</button>
            <button class="btn btn-primary" onclick="Exams.saveExam();">Save Exam</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  async saveExam() {
    const title = document.getElementById('exam-title-input').value.trim();
    const subject = document.getElementById('exam-subject-input').value.trim();
    const examDate = document.getElementById('exam-date-input').value;
    const rawTopics = document.getElementById('exam-topics-input').value.trim();
    const notes = document.getElementById('exam-notes-input').value.trim();

    if (!title || !examDate) {
      showToast("Please enter exam title and date.", 'warning');
      return;
    }

    const topics = rawTopics.split('\n').filter(t => t.trim().length > 0).map((name, idx) => ({
      id: `top-${idx}-${Date.now()}`,
      name: name.trim(),
      status: 'not_started',
      confidence: 3
    }));

    try {
      await API.createExam({
        title,
        subject,
        exam_date: examDate,
        syllabus_topics: topics,
        confidence_level: 3,
        notes
      });

      showToast("Exam added with syllabus tracking!", 'success');
      this.closeModal();
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
