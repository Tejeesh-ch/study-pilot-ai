/**
 * StudyPilot AI - Tasks & Subjects Controller
 */

const Tasks = {
  currentFilter: {
    status: 'all',
    subject: 'all',
    priority: 'all',
    search: ''
  },
  editingTaskId: null,

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-tasks');
    if (!container) return;

    try {
      const res = await API.getTasks(this.currentFilter);
      const tasks = res.tasks || [];

      // Extract unique subjects
      const subjectsRes = await API.getTasks();
      const allSubjects = Array.from(new Set(subjectsRes.tasks.map(t => t.subject))).filter(Boolean);

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:800; color:var(--navy-900);">Subject & Task Management</h1>
            <p style="color:var(--navy-600); font-size:0.9rem;">
              Organize topics across Java, Data Structures, Mathematics, and Computer Science.
            </p>
          </div>
          <button class="btn btn-primary" onclick="Tasks.openAddModal();">
            ${ICONS.plus} Add New Study Task
          </button>
        </div>

        <!-- Filter & Search Bar -->
        <div class="card" style="margin-bottom:24px; padding:16px 20px;">
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between;">
            <!-- Status Tabs -->
            <div style="display:flex; gap:6px; background:var(--navy-50); padding:4px; border-radius:var(--radius-md); border:1px solid var(--border-light);">
              <button class="btn btn-sm ${this.currentFilter.status === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="Tasks.setStatusFilter('all')">All</button>
              <button class="btn btn-sm ${this.currentFilter.status === 'pending' ? 'btn-primary' : 'btn-secondary'}" onclick="Tasks.setStatusFilter('pending')">Pending</button>
              <button class="btn btn-sm ${this.currentFilter.status === 'completed' ? 'btn-primary' : 'btn-secondary'}" onclick="Tasks.setStatusFilter('completed')">Completed</button>
              <button class="btn btn-sm ${this.currentFilter.status === 'missed' ? 'btn-primary' : 'btn-secondary'}" onclick="Tasks.setStatusFilter('missed')">Missed</button>
            </div>

            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
              <!-- Subject Dropdown -->
              <select class="form-control" style="width:auto; min-width:140px; padding:6px 12px; font-size:0.85rem;" onchange="Tasks.setSubjectFilter(this.value)">
                <option value="all">All Subjects</option>
                ${allSubjects.map(s => `<option value="${s}" ${this.currentFilter.subject === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>

              <!-- Priority Dropdown -->
              <select class="form-control" style="width:auto; min-width:130px; padding:6px 12px; font-size:0.85rem;" onchange="Tasks.setPriorityFilter(this.value)">
                <option value="all">All Priorities</option>
                <option value="urgent" ${this.currentFilter.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                <option value="high" ${this.currentFilter.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="medium" ${this.currentFilter.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="low" ${this.currentFilter.priority === 'low' ? 'selected' : ''}>Low</option>
              </select>

              <!-- Search Input -->
              <input type="text" class="form-control" placeholder="Search tasks..." style="width:200px; padding:6px 12px; font-size:0.85rem;" value="${this.currentFilter.search}" oninput="Tasks.setSearchFilter(this.value)">
            </div>
          </div>
        </div>

        <!-- Task Cards Grid -->
        <div id="tasks-list-grid" style="display:flex; flex-direction:column; gap:12px;">
          ${tasks.length === 0 ? `
            <div class="card" style="text-align:center; padding:48px; color:var(--navy-400);">
              <div style="margin-bottom:8px;">${ICONS.tasks}</div>
              <p style="font-weight:600; font-size:1rem; color:var(--navy-700);">No tasks found matching current filters.</p>
              <button class="btn btn-sm btn-primary" style="margin-top:14px;" onclick="Tasks.openAddModal();">
                Add Your First Task
              </button>
            </div>
          ` : tasks.map(task => this.renderTaskCard(task)).join('')}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color:var(--accent-rose);"><p>Error loading tasks: ${e.message}</p></div>`;
    }
  },

  renderTaskCard(task) {
    const isCompleted = task.status === 'completed';
    const isMissed = task.status === 'missed';

    return `
      <div class="card" style="padding:18px 24px; transition:all 0.2s ease; border-left: 4px solid ${
        task.priority.toLowerCase() === 'urgent' ? '#ef4444' :
        task.priority.toLowerCase() === 'high' ? '#f97316' :
        task.priority.toLowerCase() === 'medium' ? '#f59e0b' : '#10b981'
      };">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:flex-start; gap:16px; flex:1; min-width:280px;">
            <button onclick="Tasks.toggleTask(${task.id})" style="background:none; border:2px solid ${isCompleted ? 'var(--accent-emerald)' : 'var(--navy-400)'}; width:24px; height:24px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:${isCompleted ? 'var(--accent-emerald)' : 'transparent'}; margin-top:3px; flex-shrink:0;">
              ${ICONS.check}
            </button>

            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                <span class="badge badge-subject">${task.subject}</span>
                <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                ${formatDeadlineRelative(task.deadline)}
                ${isMissed ? '<span class="badge badge-urgent">Missed</span>' : ''}
              </div>

              <div style="font-weight:700; font-size:1.05rem; color:var(--navy-900); text-decoration:${isCompleted ? 'line-through' : 'none'}; opacity:${isCompleted ? 0.65 : 1};">
                ${task.title}
              </div>

              ${task.notes ? `
                <p style="font-size:0.82rem; color:var(--navy-600); margin-top:4px; line-height:1.4;">
                  ${task.notes}
                </p>
              ` : ''}

              <div style="display:flex; align-items:center; gap:12px; margin-top:6px; font-size:0.78rem; color:var(--navy-400);">
                <span>${ICONS.clock} Estimated: ${task.duration_mins} mins</span>
                ${task.completed_at ? `<span>Completed: ${new Date(task.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex; align-items:center; gap:8px;">
            ${!isCompleted ? `
              <button class="btn btn-sm btn-primary" onclick="Timer.startWithTask(${task.id}, '${task.title.replace(/'/g, "\\'")}', '${task.subject}', ${task.duration_mins});" title="Start Focus Sprint">
                ${ICONS.play} Focus
              </button>
            ` : ''}
            <button class="btn btn-sm btn-secondary" onclick="Tasks.openEditModal(${task.id});" title="Edit Task">
              ${ICONS.edit}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="Tasks.deleteTask(${task.id});" title="Delete Task" style="color:var(--accent-rose);">
              ${ICONS.trash}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  setStatusFilter(status) {
    this.currentFilter.status = status;
    this.render();
  },

  setSubjectFilter(subject) {
    this.currentFilter.subject = subject;
    this.render();
  },

  setPriorityFilter(priority) {
    this.currentFilter.priority = priority;
    this.render();
  },

  setSearchFilter(query) {
    this.currentFilter.search = query;
    this.render();
  },

  async toggleTask(taskId) {
    try {
      await API.toggleTask(taskId);
      showToast("Task status updated!", 'success');
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this study task?")) return;
    try {
      await API.deleteTask(taskId);
      showToast("Task removed.", 'info');
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  openAddModal() {
    this.editingTaskId = null;
    let modal = document.getElementById('modal-task');
    if (!modal) {
      this.createTaskModalDOM();
      modal = document.getElementById('modal-task');
    }
    document.getElementById('task-modal-title').textContent = 'Add New Study Task';
    document.getElementById('form-task-title').value = '';
    document.getElementById('form-task-subject').value = 'Data Structures';
    document.getElementById('form-task-duration').value = '45';
    document.getElementById('form-task-priority').value = 'High';
    
    // Set default deadline to tomorrow 20:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0] + 'T20:00';
    document.getElementById('form-task-deadline').value = tomorrowStr;
    document.getElementById('form-task-notes').value = '';

    modal.classList.add('active');
  },

  async openEditModal(taskId) {
    this.editingTaskId = taskId;
    let modal = document.getElementById('modal-task');
    if (!modal) {
      this.createTaskModalDOM();
      modal = document.getElementById('modal-task');
    }

    try {
      const res = await API.request(`/api/tasks/${taskId}`);
      const t = res.task;
      document.getElementById('task-modal-title').textContent = 'Edit Study Task';
      document.getElementById('form-task-title').value = t.title;
      document.getElementById('form-task-subject').value = t.subject;
      document.getElementById('form-task-duration').value = t.duration_mins;
      document.getElementById('form-task-priority').value = t.priority;
      document.getElementById('form-task-deadline').value = t.deadline ? t.deadline.slice(0, 16) : '';
      document.getElementById('form-task-notes').value = t.notes || '';

      modal.classList.add('active');
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  closeModal() {
    const modal = document.getElementById('modal-task');
    if (modal) modal.classList.remove('active');
  },

  createTaskModalDOM() {
    const html = `
      <div id="modal-task" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title" id="task-modal-title">Add New Study Task</div>
            <button class="modal-close-btn" onclick="Tasks.closeModal();">${ICONS.close}</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Task / Topic Title *</label>
              <input type="text" id="form-task-title" class="form-control" placeholder="e.g. Implement Dijkstra Algorithm in Java">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Subject *</label>
                <select id="form-task-subject" class="form-control">
                  <option value="Data Structures">Data Structures</option>
                  <option value="Java">Java</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Operating Systems">Operating Systems</option>
                  <option value="Database Systems">Database Systems</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Estimated Duration</label>
                <select id="form-task-duration" class="form-control">
                  <option value="25">25 Mins (Pomodoro Sprint)</option>
                  <option value="45" selected>45 Mins (Standard Study)</option>
                  <option value="60">60 Mins (Deep Work)</option>
                  <option value="90">90 Mins (Lab / Problem Set)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Priority Level *</label>
                <select id="form-task-priority" class="form-control">
                  <option value="Urgent">Urgent (Exam in < 3 days)</option>
                  <option value="High" selected>High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Deadline (Date & Time) *</label>
                <input type="datetime-local" id="form-task-deadline" class="form-control">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Study Notes & Objectives</label>
              <textarea id="form-task-notes" class="form-control" rows="2" placeholder="Key algorithms, textbook chapter, or assignment requirements..."></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Tasks.closeModal();">Cancel</button>
            <button class="btn btn-primary" onclick="Tasks.saveTask();">Save Task</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  async saveTask() {
    const title = document.getElementById('form-task-title').value.trim();
    const subject = document.getElementById('form-task-subject').value.trim();
    const duration = parseInt(document.getElementById('form-task-duration').value) || 45;
    const priority = document.getElementById('form-task-priority').value;
    const deadline = document.getElementById('form-task-deadline').value;
    const notes = document.getElementById('form-task-notes').value.trim();

    if (!title) {
      showToast("Please enter a task title.", 'warning');
      return;
    }

    try {
      const taskData = {
        title,
        subject,
        duration_mins: duration,
        priority,
        deadline,
        notes
      };

      if (this.editingTaskId) {
        await API.updateTask(this.editingTaskId, taskData);
        showToast("Task updated successfully!", 'success');
      } else {
        await API.createTask(taskData);
        showToast("Study task added!", 'success');
      }

      this.closeModal();
      await this.render();
      if (typeof Dashboard !== 'undefined') Dashboard.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
