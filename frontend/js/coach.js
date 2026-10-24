/**
 * StudyPilot AI - AI Study Coach Controller
 */

const Coach = {
  chatHistory: [
    {
      role: 'model',
      content: "👋 Hello! I'm your **StudyPilot AI Academic Coach**.\n\nI can help you break down difficult college concepts into simple explanations, generate practice questions with step-by-step solutions, or devise active revision strategies for upcoming midterms.\n\n*What topic or subject would you like to master today?*"
    }
  ],
  isGenerating: false,

  async init() {
    await this.render();
  },

  async render() {
    const container = document.getElementById('view-coach');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
        <div>
          <h1 style="font-size:1.6rem; font-weight:800; color:var(--navy-900);">AI Study Coach</h1>
          <p style="color:var(--navy-600); font-size:0.9rem;">
            Beginner-friendly concept breakdowns, exam revision strategies, and practice problems.
          </p>
        </div>

        <div id="coach-provider-badge">
          <span class="badge" style="background:#ede9fe; color:#6d28d9; border:1px solid #c4b5fd; font-size:0.8rem; padding:6px 12px;">
            ${ICONS.sparkle} StudyPilot Pedagogical AI
          </span>
        </div>
      </div>

      <!-- Quick Prompt Suggestion Chips -->
      <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:12px; margin-bottom:12px;">
        <button class="btn btn-sm btn-secondary" style="white-space:nowrap; border-radius:var(--radius-full);" onclick="Coach.askSuggestion('Explain Binary Search Trees at a beginner level with simple ASCII diagrams')">
          🌳 Explain Binary Search Trees
        </button>
        <button class="btn btn-sm btn-secondary" style="white-space:nowrap; border-radius:var(--radius-full);" onclick="Coach.askSuggestion('Generate 5 high-yield practice questions on Java OOP concepts with answers')">
          ☕ Java OOP Practice Questions
        </button>
        <button class="btn btn-sm btn-secondary" style="white-space:nowrap; border-radius:var(--radius-full);" onclick="Coach.askSuggestion('Give me a 3-day revision strategy for Discrete Mathematics Induction and Graphs')">
          📐 3-Day Discrete Math Strategy
        </button>
        <button class="btn btn-sm btn-secondary" style="white-space:nowrap; border-radius:var(--radius-full);" onclick="Coach.askSuggestion('How do I beat procrastination when studying Data Structures?')">
          ⚡ Overcoming Procrastination
        </button>
      </div>

      <!-- Main Chat Interface -->
      <div class="chat-container">
        <div class="chat-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:50%; background:var(--primary-600); color:#ffffff; display:flex; align-items:center; justify-content:center;">
              ${ICONS.coach}
            </div>
            <div>
              <div style="font-weight:700; font-size:0.95rem; color:var(--navy-900);">StudyPilot AI Coach</div>
              <div style="font-size:0.75rem; color:var(--accent-emerald); font-weight:600;">● Ready to assist</div>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="Coach.clearChat();">Clear Chat</button>
        </div>

        <div class="chat-messages" id="coach-messages-list">
          ${this.chatHistory.map(msg => this.renderMessage(msg)).join('')}
        </div>

        <div class="chat-input-bar">
          <input type="text" id="coach-input" class="form-control" placeholder="Ask anything: e.g. 'Explain Graph BFS vs DFS' or 'Quiz me on Java OOP'..." onkeydown="if(event.key === 'Enter') Coach.sendMessage();">
          <button class="btn btn-primary" id="coach-send-btn" onclick="Coach.sendMessage();">
            Send
          </button>
        </div>
      </div>
    `;

    this.scrollToBottom();
  },

  renderMessage(msg) {
    const isUser = msg.role === 'user';
    return `
      <div class="chat-bubble ${isUser ? 'user' : 'ai'}">
        ${!isUser && msg.provider ? `
          <div style="font-size:0.72rem; font-weight:700; color:var(--primary-600); margin-bottom:6px; display:flex; align-items:center; gap:4px;">
            ${ICONS.sparkle} ${msg.provider}
          </div>
        ` : ''}
        <div>${isUser ? msg.content : renderMarkdown(msg.content)}</div>
      </div>
    `;
  },

  scrollToBottom() {
    const msgList = document.getElementById('coach-messages-list');
    if (msgList) {
      msgList.scrollTop = msgList.scrollHeight;
    }
  },

  askSuggestion(prompt) {
    const input = document.getElementById('coach-input');
    if (input) {
      input.value = prompt;
      this.sendMessage();
    }
  },

  async sendMessage() {
    const input = document.getElementById('coach-input');
    if (!input || this.isGenerating) return;

    const userText = input.value.trim();
    if (!userText) return;

    // Add user message to history
    this.chatHistory.push({ role: 'user', content: userText });
    input.value = '';
    this.isGenerating = true;

    // Render user message and typing indicator
    const msgList = document.getElementById('coach-messages-list');
    if (msgList) {
      msgList.innerHTML = this.chatHistory.map(m => this.renderMessage(m)).join('') + `
        <div class="chat-bubble ai" id="coach-typing-indicator" style="display:flex; align-items:center; gap:6px; color:var(--navy-500); font-size:0.85rem;">
          <span style="animation: pulse 1s infinite;">🧠 AI is analyzing and formulating explanation...</span>
        </div>
      `;
      this.scrollToBottom();
    }

    try {
      const res = await API.queryCoach(userText, this.chatHistory.slice(0, -1));
      
      // Update provider badge
      const badgeContainer = document.getElementById('coach-provider-badge');
      if (badgeContainer && res.provider) {
        badgeContainer.innerHTML = `
          <span class="badge" style="background:#ede9fe; color:#6d28d9; border:1px solid #c4b5fd; font-size:0.8rem; padding:6px 12px;">
            ${ICONS.sparkle} ${res.provider}
          </span>
        `;
      }

      this.chatHistory.push({
        role: 'model',
        content: res.response,
        provider: res.provider
      });
    } catch (e) {
      this.chatHistory.push({
        role: 'model',
        content: `⚠️ Sorry, I encountered an error: ${e.message}. Please check your connection and try again.`
      });
    } finally {
      this.isGenerating = false;
      const indicator = document.getElementById('coach-typing-indicator');
      if (indicator) indicator.remove();
      if (msgList) {
        msgList.innerHTML = this.chatHistory.map(m => this.renderMessage(m)).join('');
        this.scrollToBottom();
      }
    }
  },

  clearChat() {
    this.chatHistory = [
      {
        role: 'model',
        content: "Chat cleared. What concept or problem set would you like help with now?"
      }
    ];
    this.render();
  }
};
