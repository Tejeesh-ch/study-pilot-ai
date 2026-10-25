/**
 * StudyPilot AI - Frontend REST API Client
 */

const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Tasks
  async getTasks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const endpoint = `/api/tasks${qs ? `?${qs}` : ''}`;
    return this.request(endpoint);
  },

  async createTask(taskData) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  async updateTask(taskId, taskData) {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  async deleteTask(taskId) {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    });
  },

  async toggleTask(taskId) {
    return this.request(`/api/tasks/${taskId}/toggle`, {
      method: 'PATCH'
    });
  },

  // Timetable
  async getTimetable(dateStr = '') {
    const endpoint = `/api/timetable${dateStr ? `?date=${dateStr}` : ''}`;
    return this.request(endpoint);
  },

  async generateTimetable(config) {
    return this.request('/api/timetable/generate', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async updateSlotStatus(slotId, status) {
    return this.request(`/api/timetable/slot/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Rescue My Day
  async runRescue(rescueParams) {
    return this.request('/api/rescue', {
      method: 'POST',
      body: JSON.stringify(rescueParams)
    });
  },

  async acceptRescuePlan(revisedPlan) {
    return this.request('/api/rescue/accept', {
      method: 'POST',
      body: JSON.stringify({ revised_plan: revisedPlan })
    });
  },

  // AI Study Coach
  async queryCoach(prompt, history = []) {
    return this.request('/api/ai/coach', {
      method: 'POST',
      body: JSON.stringify({ prompt, history })
    });
  },

  // Exams & Readiness
  async getExams() {
    return this.request('/api/exams');
  },

  async createExam(examData) {
    return this.request('/api/exams', {
      method: 'POST',
      body: JSON.stringify(examData)
    });
  },

  async updateExamTopic(examId, topicId, status, confidence) {
    return this.request(`/api/exams/${examId}/topic`, {
      method: 'PATCH',
      body: JSON.stringify({ topic_id: topicId, status, confidence })
    });
  },

  async deleteExam(examId) {
    return this.request(`/api/exams/${examId}`, {
      method: 'DELETE'
    });
  },

  // Focus Sessions
  async logFocusSession(sessionData) {
    return this.request('/api/focus-sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  // Analytics
  async getAnalytics() {
    return this.request('/api/analytics');
  },

  // Settings & Demo
  async getSettings() {
    return this.request('/api/settings');
  },

  async saveSettings(settingsData) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settingsData)
    });
  },

  async resetDemoData() {
    return this.request('/api/reset-demo', {
      method: 'POST'
    });
  },

  async clearAllData() {
    return this.request('/api/clear-all', {
      method: 'POST'
    });
  }
};
