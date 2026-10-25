/**
 * StudyPilot AI - Main Application Router & State Coordinator
 */

const App = {
  currentView: 'dashboard',

  async init() {
    this.setupNavigation();
    this.startLiveClock();

    // Default to dashboard or read hash
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'tasks', 'timetable', 'coach', 'timer', 'exams', 'analytics', 'settings'].includes(hash)) {
      this.navigate(hash);
    } else {
      this.navigate('dashboard');
    }
  },

  setupNavigation() {
    // Nav button click handlers
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = el.getAttribute('data-view');
        this.navigate(targetView);

        // Close mobile sidebar if open
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });

    // Mobile menu toggle
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Hash change listener
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (h && h !== this.currentView) {
        this.navigate(h, false);
      }
    });
  },

  navigate(viewName, updateHash = true) {
    this.currentView = viewName;
    if (updateHash) {
      window.location.hash = viewName;
    }

    // Update active nav class
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Toggle view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) {
      activeSec.classList.add('active');
    }

    // Initialize controller for view
    switch (viewName) {
      case 'dashboard':
        if (typeof Dashboard !== 'undefined') Dashboard.init();
        break;
      case 'tasks':
        if (typeof Tasks !== 'undefined') Tasks.init();
        break;
      case 'timetable':
        if (typeof Timetable !== 'undefined') Timetable.init();
        break;
      case 'coach':
        if (typeof Coach !== 'undefined') Coach.init();
        break;
      case 'timer':
        if (typeof Timer !== 'undefined') Timer.init();
        break;
      case 'exams':
        if (typeof Exams !== 'undefined') Exams.init();
        break;
      case 'analytics':
        if (typeof Analytics !== 'undefined') Analytics.init();
        break;
      case 'settings':
        if (typeof Settings !== 'undefined') Settings.init();
        break;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  startLiveClock() {
    const clockEl = document.getElementById('topbar-live-clock');
    if (!clockEl) return;

    const updateClock = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    updateClock();
    setInterval(updateClock, 1000);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
