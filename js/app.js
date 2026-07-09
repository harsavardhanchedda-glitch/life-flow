(function() {
  // Global View State
  let currentView = "dashboard";
  let activeJournalDate = "";
  let activeCalendarDate = new Date();
  let calendarViewMode = "month"; // "month" | "week" | "day" | "agenda"
  let selectedMood = "";
  let quickAddTab = "task"; // "task" | "habit" | "event"
  let currentQuoteIndex = 0;
  
  // Charts Registry to prevent duplicates
  let consistencyChart = null;
  let distributionChart = null;

  // Initialize App on DOM Loaded
  window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initQuotes();
    initNavigation();
    initDateDefaults();
    bindEvents();
    
    // Subscribe UI renders to store changes
    window.LifeFlowStore.subscribe(renderAll);
    
    // First render
    renderAll();
  });

  // --- THEME MANAGEMENT ---
  function initTheme() {
    const theme = window.LifeFlowStore.state.profile.settings.theme;
    setThemeClass(theme);
  }

  function toggleTheme() {
    const current = window.LifeFlowStore.state.profile.settings.theme;
    const next = current === "dark" ? "light" : "dark";
    window.LifeFlowStore.updateProfile({ settings: { ...window.LifeFlowStore.state.profile.settings, theme: next } });
    setThemeClass(next);
    
    // Re-render charts with new theme colors
    renderCharts();
  }

  function setThemeClass(theme) {
    const html = document.documentElement;
    const themeIcon = document.getElementById("theme-icon");
    const themeIconMobile = document.getElementById("theme-icon-mobile");
    const themeLabel = document.getElementById("profile-theme-label");

    if (theme === "dark") {
      html.classList.add("dark");
      if (themeIcon) themeIcon.setAttribute("data-lucide", "sun");
      if (themeIconMobile) themeIconMobile.setAttribute("data-lucide", "sun");
      if (themeLabel) themeLabel.innerText = "Dark Mode";
    } else {
      html.classList.remove("dark");
      if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
      if (themeIconMobile) themeIconMobile.setAttribute("data-lucide", "moon");
      if (themeLabel) themeLabel.innerText = "Light Mode";
    }
    lucide.createIcons();
  }

  // --- NAVIGATION & ROUTING ---
  function initNavigation() {
    const buttons = document.querySelectorAll("[data-view]");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        switchView(view);
      });
    });
  }

  function switchView(viewName) {
    currentView = viewName;
    
    // Update active nav button state
    document.querySelectorAll("[data-view]").forEach(btn => {
      const v = btn.getAttribute("data-view");
      if (v === viewName) {
        btn.classList.add("active");
        // Also highlight mobile buttons
        btn.classList.remove("text-slate-400");
        btn.classList.add("text-brand-500");
      } else {
        btn.classList.remove("active");
        // De-highlight mobile
        if (btn.classList.contains("nav-btn-mobile")) {
          btn.classList.remove("text-brand-500");
          btn.classList.add("text-slate-400");
        }
      }
    });

    // Hide all view panels and show the active one
    document.querySelectorAll(".view-panel").forEach(panel => {
      panel.classList.remove("active");
    });
    
    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) {
      activePanel.classList.add("active");
    }

    // Trigger specific panel setup if needed
    if (viewName === "analytics") {
      setTimeout(renderCharts, 50);
    } else if (viewName === "calendar") {
      renderCalendar();
    } else if (viewName === "habits") {
      renderHeatmap();
    }
  }

  // --- DATE HELPERS ---
  function initDateDefaults() {
    activeJournalDate = window.LifeFlowStore.getTodayDateString();
    const journalDatePicker = document.getElementById("journal-date-picker");
    if (journalDatePicker) {
      journalDatePicker.value = activeJournalDate;
      journalDatePicker.max = activeJournalDate;
    }

    const qtDate = document.getElementById("qt-date");
    if (qtDate) {
      qtDate.value = activeJournalDate;
    }

    const goalDeadline = document.getElementById("goal-deadline");
    if (goalDeadline) {
      goalDeadline.value = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]; // +30 days default
    }

    // Set header date
    const headerDate = document.getElementById("dashboard-date");
    if (headerDate) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      headerDate.innerText = new Date().toLocaleDateString("en-US", options);
    }
  }

  // --- BIND EVENT HANDLERS ---
  function bindEvents() {
    // Journal date change
    const picker = document.getElementById("journal-date-picker");
    if (picker) {
      picker.addEventListener("change", (e) => {
        activeJournalDate = e.target.value;
        loadJournalForDate(activeJournalDate);
      });
    }

    // Habit filter switches
    document.getElementById("habit-filter-all")?.addEventListener("click", () => renderHabitsList("all"));
    document.getElementById("habit-filter-daily")?.addEventListener("click", () => renderHabitsList("daily"));
    document.getElementById("habit-filter-weekly")?.addEventListener("click", () => renderHabitsList("weekly"));

    // Task Filter tabs
    document.getElementById("task-tab-today")?.addEventListener("click", () => renderTasksList("today"));
    document.getElementById("task-tab-upcoming")?.addEventListener("click", () => renderTasksList("upcoming"));
    document.getElementById("task-tab-completed")?.addEventListener("click", () => renderTasksList("completed"));
    document.getElementById("task-tab-all")?.addEventListener("click", () => renderTasksList("all"));
    document.getElementById("task-priority-filter")?.addEventListener("change", () => {
      // Re-trigger current filter tab
      const activeTab = document.querySelector(".task-tab-active")?.id || "task-tab-today";
      const filterKey = activeTab.replace("task-tab-", "");
      renderTasksList(filterKey);
    });

    // Calendar view selectors
    document.getElementById("cal-view-month")?.addEventListener("click", () => switchCalendarMode("month"));
    document.getElementById("cal-view-week")?.addEventListener("click", () => switchCalendarMode("week"));
    document.getElementById("cal-view-day")?.addEventListener("click", () => switchCalendarMode("day"));
    document.getElementById("cal-view-agenda")?.addEventListener("click", () => switchCalendarMode("agenda"));
  }

  // --- QUOTES CAROUSEL ---
  function initQuotes() {
    // Select initial random quote index
    currentQuoteIndex = Math.floor(Math.random() * window.LifeFlowQuotes.length);
  }

  function renderDashboardQuote() {
    const qText = document.getElementById("quote-text");
    const qAuthor = document.getElementById("quote-author");
    const qCat = document.getElementById("quote-category");
    const favIcon = document.getElementById("quote-fav-icon");

    if (window.LifeFlowQuotes && window.LifeFlowQuotes.length > currentQuoteIndex) {
      const q = window.LifeFlowQuotes[currentQuoteIndex];
      if (qText) qText.innerText = `"${q.text}"`;
      if (qAuthor) qAuthor.innerText = `— ${q.author}`;
      if (qCat) qCat.innerText = q.category;

      const isFav = window.LifeFlowStore.state.favoriteQuotes.some(fav => fav.text === q.text);
      if (favIcon) {
        if (isFav) {
          favIcon.classList.add("fill-current");
        } else {
          favIcon.classList.remove("fill-current");
        }
      }
    }
  }

  window.refreshDashboardQuote = function() {
    currentQuoteIndex = Math.floor(Math.random() * window.LifeFlowQuotes.length);
    renderDashboardQuote();
  };

  window.toggleFavoriteCurrentQuote = function() {
    const q = window.LifeFlowQuotes[currentQuoteIndex];
    window.LifeFlowStore.toggleFavoriteQuote(q);
    renderDashboardQuote();
  };

  window.shareCurrentQuote = function() {
    const q = window.LifeFlowQuotes[currentQuoteIndex];
    if (navigator.share) {
      navigator.share({
        title: 'LifeFlow Quote Motivation',
        text: `"${q.text}" — ${q.author}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`"${q.text}" — ${q.author}`);
      alert("Quote copied to clipboard!");
    }
  };

  // --- RENDERING HANDLERS ---
  function renderAll() {
    // Run daily resets if day rolled over
    window.LifeFlowStore.checkAndResetDailyTasks();
    const state = window.LifeFlowStore.state;
    
    // Update Sidebars/Headers Name & Streaks
    const sName = document.getElementById("sidebar-name");
    const pName = document.getElementById("profile-display-name");
    const sAvatar = document.getElementById("sidebar-avatar");
    const mAvatar = document.getElementById("mobile-avatar");
    const pAvatar = document.getElementById("profile-avatar-img");
    
    if (sName) sName.innerText = state.profile.name;
    if (pName) pName.innerText = state.profile.name;
    if (sAvatar) sAvatar.src = state.profile.avatar;
    if (mAvatar) mAvatar.src = state.profile.avatar;
    if (pAvatar) pAvatar.src = state.profile.avatar;

    const streakCounts = [
      document.getElementById("sidebar-streak-count"),
      document.getElementById("dash-streak-days"),
      document.getElementById("analytics-current-streak"),
      document.getElementById("profile-streak-count")
    ];
    streakCounts.forEach(el => {
      if (el) el.innerText = `${state.streak} ${el.id === "sidebar-streak-count" ? "" : "Days"}`;
    });

    const longestStreakCounts = [
      document.getElementById("habit-longest-streak-value"),
      document.getElementById("profile-longest-streak-count")
    ];
    longestStreakCounts.forEach(el => {
      if (el) el.innerText = state.longestStreak;
    });

    // Update productivity score display
    const score = window.LifeFlowStore.getProductivityScore();
    const dashScoreEl = document.getElementById("dash-productivity-score");
    if (dashScoreEl) dashScoreEl.innerText = `${score}%`;

    // Render Dashboard Panels
    renderDashboardQuote();
    renderDashboardLists();
    
    // Render view subcomponents
    renderHabitsList("all");
    renderTasksList("today");
    renderGoalsList();
    renderJournalArchive();
    loadJournalForDate(activeJournalDate);
    renderBadges();
    
    // Render custom elements
    renderHeatmap();
    renderCalendar();

    // Prefill Google Client ID
    const gClientIdInput = document.getElementById("setting-google-client-id");
    if (gClientIdInput) {
      gClientIdInput.value = localStorage.getItem("lf_google_client_id") || "";
    }

    // Call Lucide to swap icons
    lucide.createIcons();
  }

  // --- DASHBOARD SUBRENDA ---
  function renderDashboardLists() {
    const state = window.LifeFlowStore.state;
    const todayStr = window.LifeFlowStore.getTodayDateString();

    // 1. Dashboard Today's Habits
    const dashHabitsList = document.getElementById("dash-habits-list");
    const habitCompletionRatio = document.getElementById("dash-habit-completion-ratio");
    
    if (dashHabitsList) {
      dashHabitsList.innerHTML = "";
      const dailyHabits = state.habits.filter(h => h.frequency === "daily");
      
      const completedCount = dailyHabits.filter(h => h.completedDates[todayStr] === "done").length;
      if (habitCompletionRatio) {
        habitCompletionRatio.innerText = `${completedCount}/${dailyHabits.length}`;
      }

      if (dailyHabits.length === 0) {
        dashHabitsList.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No habits created yet.</p>`;
      } else {
        dailyHabits.forEach(h => {
          const isDone = h.completedDates[todayStr] === "done";
          const isSkipped = h.completedDates[todayStr] === "skip";
          
          let checkStyle = "border-slate-200 dark:border-slate-800 text-transparent";
          let bgStyle = "";
          if (isDone) {
            checkStyle = `bg-${h.color}-500 border-transparent text-white`;
            bgStyle = "bg-slate-50 dark:bg-slate-900/40 opacity-75";
          } else if (isSkipped) {
            checkStyle = "bg-amber-400 border-transparent text-white";
            bgStyle = "bg-slate-50 dark:bg-slate-900/20 opacity-50";
          }

          const div = document.createElement("div");
          div.className = `flex items-center justify-between p-3 rounded-2xl glass-panel hover:scale-[1.01] transition-all ${bgStyle}`;
          div.innerHTML = `
            <div class="flex items-center gap-3">
              <button onclick="toggleHabit('${h.id}', '${todayStr}', 'done')" class="w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all ${checkStyle}">
                <i data-lucide="check" class="w-4 h-4"></i>
              </button>
              <div>
                <span class="text-sm font-semibold block ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${h.name}</span>
                <span class="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <i data-lucide="${h.icon}" class="w-3 h-3 text-${h.color}-500"></i> ${h.category} • Streak: ${h.streak} 🔥
                </span>
              </div>
            </div>
            <div class="flex gap-1.5">
              <button onclick="toggleHabit('${h.id}', '${todayStr}', 'skip')" class="p-1 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-500 text-[10px] font-bold hover:bg-amber-100 transition-all">
                ${isSkipped ? 'Unskip' : 'Skip'}
              </button>
            </div>
          `;
          dashHabitsList.appendChild(div);
        });
      }
    }

    // 2. Dashboard Today's Tasks
    const dashTasksList = document.getElementById("dash-tasks-list");
    if (dashTasksList) {
      dashTasksList.innerHTML = "";
      const todayTasks = state.tasks.filter(t => t.dueDate <= todayStr);

      if (todayTasks.length === 0) {
        dashTasksList.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No tasks due today.</p>`;
      } else {
        todayTasks.forEach(t => {
          const checkStyle = t.completed ? `bg-brand-500 border-transparent text-white` : "border-slate-200 dark:border-slate-800 text-transparent";
          const bgStyle = t.completed ? "bg-slate-50 dark:bg-slate-900/40 opacity-75" : "";

          // Priority badge
          let pBadge = `<span class="text-[9px] font-bold uppercase text-slate-400">Low</span>`;
          if (t.priority === "high") {
            pBadge = `<span class="text-[9px] font-bold uppercase text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">High</span>`;
          } else if (t.priority === "medium") {
            pBadge = `<span class="text-[9px] font-bold uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">Medium</span>`;
          }

          const div = document.createElement("div");
          div.className = `flex items-center justify-between p-3 rounded-2xl glass-panel hover:scale-[1.01] transition-all ${bgStyle}`;
          div.innerHTML = `
            <div class="flex items-center gap-3 w-full">
              <button onclick="toggleTask('${t.id}')" class="w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all ${checkStyle}">
                <i data-lucide="check" class="w-4 h-4"></i>
              </button>
              <div class="flex-1 min-w-0">
                <span class="text-sm font-semibold block truncate ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${t.title}</span>
                <div class="flex items-center gap-2 mt-0.5">
                  ${pBadge}
                  <span class="text-[10px] font-medium text-slate-400">• ${t.category}</span>
                </div>
              </div>
            </div>
          `;
          dashTasksList.appendChild(div);
        });
      }
    }

    // 3. Dashboard Agenda events
    const dashAgendaList = document.getElementById("dash-agenda-list");
    if (dashAgendaList) {
      dashAgendaList.innerHTML = "";
      const todayEvents = state.events.filter(e => e.startDateTime.split("T")[0] === todayStr);

      if (todayEvents.length === 0) {
        dashAgendaList.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No events scheduled today.</p>`;
      } else {
        todayEvents.forEach(e => {
          const startTime = e.startDateTime.split("T")[1] || "All day";
          const div = document.createElement("div");
          div.className = `p-3 rounded-2xl border-l-4 border-${e.color}-500 bg-slate-50/50 dark:bg-slate-900/30 glass-panel flex flex-col gap-1`;
          div.innerHTML = `
            <div class="flex justify-between items-center">
              <span class="text-sm font-bold text-slate-800 dark:text-slate-200">${e.title}</span>
              <span class="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">${startTime}</span>
            </div>
            <p class="text-xs text-slate-400 line-clamp-1">${e.description || "No details"}</p>
          `;
          dashAgendaList.appendChild(div);
        });
      }
    }

    // 4. Update Dashboard AI Coach card advice
    const coachAdvice = document.getElementById("dash-ai-coach-advice");
    if (coachAdvice) {
      const suggestions = window.LifeFlowAI.suggestTodayPriorities(state.tasks, state.habits, state.goals);
      if (suggestions && suggestions.length > 0) {
        coachAdvice.innerHTML = `<strong>${suggestions[0].title}</strong>: ${suggestions[0].desc}`;
      }
    }
  }

  // --- HABITS VIEW RENDERING ---
  function renderHabitsList(filter = "all") {
    // Highlight correct habit filter button
    document.querySelectorAll("#view-habits [id^='habit-filter-']").forEach(btn => {
      if (btn.id === `habit-filter-${filter}`) {
        btn.classList.add("bg-brand-500", "text-white");
        btn.classList.remove("text-slate-500");
      } else {
        btn.classList.remove("bg-brand-500", "text-white");
        btn.classList.add("text-slate-500");
      }
    });

    const habitsContainer = document.getElementById("habits-list-full");
    if (!habitsContainer) return;

    habitsContainer.innerHTML = "";
    const state = window.LifeFlowStore.state;
    const todayStr = window.LifeFlowStore.getTodayDateString();

    const filteredHabits = state.habits.filter(h => {
      if (filter === "daily") return h.frequency === "daily";
      if (filter === "weekly") return h.frequency === "weekly";
      return true;
    });

    if (filteredHabits.length === 0) {
      habitsContainer.innerHTML = `<p class="text-sm text-slate-400 italic text-center py-6">No habits fit this filter.</p>`;
      return;
    }

    filteredHabits.forEach(h => {
      const isDone = h.completedDates[todayStr] === "done";
      const isSkipped = h.completedDates[todayStr] === "skip";
      const completionsCount = Object.values(h.completedDates).filter(val => val === "done").length;

      let ringColor = "text-slate-200 dark:text-slate-800";
      let ringAccent = `text-${h.color}-500`;
      
      const completionPercentage = Math.round((completionsCount / 30) * 100); // Progress relative to 30 days
      const offset = 100 - Math.min(100, completionPercentage);

      const div = document.createElement("div");
      div.className = "py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in";
      div.innerHTML = `
        <div class="flex items-center gap-4">
          <!-- 30 Days completion ring tracker -->
          <div class="relative w-14 h-14">
            <svg class="w-full h-full" viewBox="0 0 36 36">
              <path class="${ringColor}" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="${ringAccent} progress-ring-circle" stroke-width="3" stroke-linecap="round" stroke-dasharray="100, 100" stroke-dashoffset="${offset}" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center text-[9px] font-bold">${completionsCount}d</div>
          </div>

          <div>
            <h4 class="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              ${h.name}
              ${isDone ? `<span class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded text-[9px] font-bold">Done Today</span>` : ''}
              ${isSkipped ? `<span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded text-[9px] font-bold">Skipped</span>` : ''}
            </h4>
            <p class="text-xs text-slate-400 mt-0.5">${h.notes || "No notes"}</p>
            <div class="flex items-center gap-3 mt-1.5 text-[10px] font-semibold text-slate-500">
              <span class="flex items-center gap-1"><i data-lucide="tag" class="w-3.5 h-3.5"></i> ${h.category}</span>
              <span class="flex items-center gap-1"><i data-lucide="flame" class="w-3.5 h-3.5 text-orange-500"></i> Streak: ${h.streak}d</span>
              <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${h.frequency}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto justify-end">
          <button onclick="toggleHabit('${h.id}', '${todayStr}', 'done')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isDone ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : `bg-${h.color}-500 text-white hover:brightness-115`}">
            ${isDone ? 'Undo Complete' : 'Complete'}
          </button>
          <button onclick="toggleHabit('${h.id}', '${todayStr}', 'skip')" class="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-all">
            ${isSkipped ? 'Unskip' : 'Skip'}
          </button>
          <button onclick="deleteHabit('${h.id}')" class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/15 transition-all">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
      habitsContainer.appendChild(div);
    });

    // Update weekly average ring in UI
    const totalWeeklyHabits = state.habits.filter(h => h.frequency === "daily").length * 7;
    let completedWeekly = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      state.habits.forEach(h => {
        if (h.completedDates[dStr] === "done") completedWeekly++;
      });
    }

    const weeklyPercentage = totalWeeklyHabits > 0 ? Math.round((completedWeekly / totalWeeklyHabits) * 100) : 0;
    const weeklyRing = document.getElementById("habit-progress-ring-weekly");
    const weeklyPercText = document.getElementById("habit-weekly-percentage");
    const weeklyDesc = document.getElementById("habit-weekly-desc");

    if (weeklyRing) {
      const offset = 100 - Math.min(100, weeklyPercentage);
      weeklyRing.setAttribute("stroke-dashoffset", offset.toString());
    }
    if (weeklyPercText) {
      weeklyPercText.innerText = `${weeklyPercentage}%`;
    }
    if (weeklyDesc) {
      if (weeklyPercentage >= 80) weeklyDesc.innerText = "Excellent lifestyle balance!";
      else if (weeklyPercentage >= 50) weeklyDesc.innerText = "Consistent effort, keep pushing.";
      else weeklyDesc.innerText = "Focus on small, daily triggers.";
    }
  }

  window.toggleHabit = function(id, dateStr, status) {
    window.LifeFlowStore.toggleHabitStatus(id, dateStr, status);
  };

  window.deleteHabit = function(id) {
    if (confirm("Are you sure you want to delete this habit? All history will be lost.")) {
      window.LifeFlowStore.deleteHabit(id);
    }
  };

  // --- HABIT HEATMAP GENERATOR ---
  function renderHeatmap() {
    const grid = document.getElementById("heatmap-grid");
    const labels = document.getElementById("heatmap-months-labels");
    if (!grid) return;

    grid.innerHTML = "";
    if (labels) labels.innerHTML = "";

    const state = window.LifeFlowStore.state;
    const today = new Date();

    // Generate date map of activity count
    // Activity: sum of completed habits, completed tasks, and journal logs
    const activityMap = {};
    
    // Collect habits
    state.habits.forEach(h => {
      Object.keys(h.completedDates).forEach(date => {
        if (h.completedDates[date] === "done") {
          activityMap[date] = (activityMap[date] || 0) + 1;
        }
      });
    });

    // Collect completed tasks
    state.tasks.forEach(t => {
      if (t.completedDates) {
        Object.keys(t.completedDates).forEach(date => {
          activityMap[date] = (activityMap[date] || 0) + 2; // Tasks count slightly more!
        });
      }
    });

    // Collect journal writes
    Object.keys(state.journal).forEach(date => {
      if (state.journal[date].reflection || state.journal[date].gratitude) {
        activityMap[date] = (activityMap[date] || 0) + 1;
      }
    });

    // Create array of days for 53 weeks (backwards from today to fit the grid aligning with Sunday/Monday start)
    // Find current day of week to align correctly
    const dayOfWeek = today.getDay();
    const totalCells = 53 * 7;
    const datesArr = [];

    // Let's generate from the oldest day up to today
    const startDate = new Date();
    startDate.setDate(today.getDate() - totalCells + 1);

    const monthPositions = {};

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(startDate.getTime() + i * 86400000);
      const dateStr = cellDate.toISOString().split("T")[0];
      const count = activityMap[dateStr] || 0;

      // Group levels: 0, 1, 2, 3, 4
      let level = 0;
      if (count > 6) level = 4;
      else if (count > 4) level = 3;
      else if (count > 2) level = 2;
      else if (count > 0) level = 1;

      datesArr.push({
        dateStr,
        level,
        count,
        monthName: cellDate.toLocaleDateString("en-US", { month: "short" })
      });

      // Track month title column
      const colIndex = Math.floor(i / 7);
      if (cellDate.getDate() <= 7) {
        monthPositions[cellDate.toLocaleDateString("en-US", { month: "short" })] = colIndex;
      }
    }

    // Render cells
    datesArr.forEach(day => {
      const cell = document.createElement("div");
      cell.className = `w-2.5 h-2.5 rounded-sm heatmap-cell cell-level-${day.level} cursor-pointer`;
      cell.setAttribute("title", `${day.dateStr}: ${day.count} activities logged`);
      cell.addEventListener("click", () => {
        // Switch to calendar inspector date view
        activeCalendarDate = new Date(day.dateStr);
        switchView("calendar");
        renderInspectorDetails(day.dateStr);
      });
      grid.appendChild(cell);
    });

    // Render months labels
    if (labels) {
      const sortedMonths = Object.keys(monthPositions).sort((a, b) => monthPositions[a] - monthPositions[b]);
      
      // Initialize layout placeholders
      let lastCol = 0;
      sortedMonths.forEach(m => {
        const col = monthPositions[m];
        const span = document.createElement("span");
        span.innerText = m;
        // Simple spacing approximation
        const gap = Math.max(0, col - lastCol) * 12; 
        span.style.marginLeft = `${gap}px`;
        labels.appendChild(span);
        lastCol = col;
      });
    }
  }

  // --- TASKS VIEW RENDERING ---
  let activeTaskFilter = "today";
  let activeTaskLayout = "list"; // "list" | "kanban"

  function renderTasksList(filter = "today") {
    activeTaskFilter = filter;

    // Highlight correct filter tab button
    document.querySelectorAll("#view-tasks [id^='task-tab-']").forEach(btn => {
      if (btn.id === `task-tab-${filter}`) {
        btn.classList.add("bg-brand-500", "text-white", "task-tab-active");
        btn.classList.remove("text-slate-500");
      } else {
        btn.classList.remove("bg-brand-500", "text-white", "task-tab-active");
        btn.classList.add("text-slate-500");
      }
    });

    const state = window.LifeFlowStore.state;
    const todayStr = window.LifeFlowStore.getTodayDateString();
    const prioritySelect = document.getElementById("task-priority-filter");
    const priorityVal = prioritySelect ? prioritySelect.value : "all";

    // Filter rules
    const filteredTasks = state.tasks.filter(t => {
      // 1. Priority filter
      if (priorityVal !== "all" && t.priority !== priorityVal) return false;

      // 2. Status date filters
      if (filter === "today") {
        return t.dueDate <= todayStr;
      } else if (filter === "upcoming") {
        return t.dueDate > todayStr && !t.completed;
      } else if (filter === "completed") {
        return t.completed;
      }
      return true; // "all"
    });

    // Sorting by order
    filteredTasks.sort((a, b) => a.order - b.order);

    if (activeTaskLayout === "list") {
      renderListLayout(filteredTasks);
    } else {
      renderKanbanLayout(state.tasks); // Kanban maps all tasks grouped by state columns
    }
  }

  function renderListLayout(tasks) {
    const container = document.getElementById("tasks-list-container");
    if (!container) return;

    container.innerHTML = "";
    if (tasks.length === 0) {
      container.innerHTML = `<p class="text-sm text-slate-400 italic text-center py-8">No tasks logged under this category.</p>`;
      return;
    }

    tasks.forEach(t => {
      const isDone = t.completed;
      const checkStyle = isDone ? "bg-brand-500 border-transparent text-white" : "border-slate-200 dark:border-slate-800 text-transparent";
      
      let pClass = "text-slate-400 bg-slate-100 dark:bg-slate-800";
      if (t.priority === "high") pClass = "text-rose-500 bg-rose-50 dark:bg-rose-950/20";
      else if (t.priority === "medium") pClass = "text-amber-500 bg-amber-50 dark:bg-amber-950/20";

      // Subtasks math
      const totalSubs = t.subtasks.length;
      const doneSubs = t.subtasks.filter(st => st.completed).length;
      const subsProgressText = totalSubs > 0 ? `<span class="text-xs text-slate-400 block mt-1 flex items-center gap-1"><i data-lucide="check-square" class="w-3.5 h-3.5"></i> Subtasks: ${doneSubs}/${totalSubs}</span>` : "";

      const div = document.createElement("div");
      div.className = `py-4 flex flex-col gap-3 animate-fade-in ${isDone ? 'opacity-70' : ''}`;
      
      div.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex gap-3">
            <button onclick="toggleTask('${t.id}')" class="w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all mt-0.5 ${checkStyle}">
              <i data-lucide="check" class="w-4 h-4"></i>
            </button>
            <div>
              <h4 class="text-base font-bold text-slate-800 dark:text-slate-200 ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${t.title}</h4>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span class="text-[9px] font-bold uppercase ${pClass} px-1.5 py-0.5 rounded">${t.priority}</span>
                <span class="text-[10px] text-slate-400 font-semibold">• ${t.category}</span>
                <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> Due: ${t.dueDate} ${t.dueTime || ""}</span>
              </div>
              ${subsProgressText}
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="toggleTaskDetailsDropdown('${t.id}')" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <i data-lucide="chevron-down" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteTask('${t.id}')" class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/15 transition-all">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Hidden Subtasks / Detail dropdown panel -->
        <div id="task-dropdown-${t.id}" class="hidden pl-8 pr-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border dark:border-slate-800/80 space-y-4">
          <!-- Description / Notes -->
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notes</span>
            <p class="text-xs text-slate-600 dark:text-slate-300 italic">${t.notes || "No notes attached."}</p>
          </div>

          <!-- Subtasks checklist -->
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subtasks</span>
            <div class="space-y-1.5" id="subtask-list-${t.id}">
              ${t.subtasks.map(st => `
                <div class="flex items-center justify-between text-xs">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" ${st.completed ? 'checked' : ''} onclick="toggleSubtask('${t.id}', '${st.id}')" class="rounded text-brand-500 focus:ring-brand-500 w-3.5 h-3.5">
                    <span class="${st.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${st.title}</span>
                  </label>
                  <button onclick="deleteSubtask('${t.id}', '${st.id}')" class="text-slate-400 hover:text-rose-500 transition-all">
                    <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              `).join("")}
            </div>

            <!-- Add subtask inline form -->
            <div class="flex gap-2 mt-3">
              <input type="text" id="qt-new-subtask-${t.id}" placeholder="Add subtask..." class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none">
              <button onclick="addSubtask('${t.id}')" class="px-3 py-1 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 active:scale-95 transition-all">
                Add
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // Kanban view handler
  function renderKanbanLayout(allTasks) {
    const columns = {
      todo: document.getElementById("kanban-todo-list"),
      progress: document.getElementById("kanban-progress-list"),
      review: document.getElementById("kanban-review-list"),
      completed: document.getElementById("kanban-completed-list")
    };

    // Reset columns HTML
    Object.keys(columns).forEach(col => {
      if (columns[col]) columns[col].innerHTML = "";
    });

    // Helper counts
    const counts = { todo: 0, progress: 0, review: 0, completed: 0 };

    allTasks.forEach(t => {
      // Determine Kanban Status mapping
      // If task is checked completed -> mapped to completed
      // Else check if task has active progress (e.g. at least one completed subtask) -> progress
      // Else default to todo
      let status = "todo";
      if (t.completed) {
        status = "completed";
      } else if (t.subtasks.length > 0 && t.subtasks.some(st => st.completed)) {
        status = "progress";
      } else if (t.priority === "high") {
        // Let's say high priority default is todo, but we can also set status custom
        status = t.kanbanStatus || "todo";
      } else {
        status = t.kanbanStatus || "todo";
      }

      counts[status]++;

      const colContainer = columns[status];
      if (!colContainer) return;

      let pClass = "text-slate-400 bg-slate-100 dark:bg-slate-800";
      if (t.priority === "high") pClass = "text-rose-500 bg-rose-50 dark:bg-rose-950/20";
      else if (t.priority === "medium") pClass = "text-amber-500 bg-amber-50 dark:bg-amber-950/20";

      const subtaskFraction = t.subtasks.length > 0 ? `${t.subtasks.filter(s => s.completed).length}/${t.subtasks.length}` : "";

      const card = document.createElement("div");
      card.className = "glass-panel p-3.5 rounded-2xl space-y-2 cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:shadow-md transition-all";
      card.setAttribute("draggable", "true");
      card.setAttribute("id", `kanban-card-${t.id}`);
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", t.id);
      });

      card.innerHTML = `
        <div class="flex justify-between items-start gap-1">
          <span class="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">${t.title}</span>
          <button onclick="deleteTask('${t.id}')" class="text-slate-400 hover:text-rose-500 transition-all shrink-0">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>
        <div class="flex items-center justify-between pt-1 border-t dark:border-slate-800/80">
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-bold uppercase ${pClass} px-1.5 py-0.5 rounded">${t.priority}</span>
            ${subtaskFraction ? `<span class="text-[9px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">${subtaskFraction} sub</span>` : ""}
          </div>
          <span class="text-[8px] text-slate-400">${t.dueDate}</span>
        </div>
      `;
      colContainer.appendChild(card);
    });

    // Update column counters
    Object.keys(counts).forEach(col => {
      const counter = document.getElementById(`kanban-count-${col}`);
      if (counter) counter.innerText = counts[col];
    });

    lucide.createIcons();
  }

  // Kanban Drag and Drop APIs
  window.allowDrop = function(ev) {
    ev.preventDefault();
    const col = ev.currentTarget;
    col.classList.add("drag-over");
  };

  window.dropTask = function(ev) {
    ev.preventDefault();
    const col = ev.currentTarget;
    col.classList.remove("drag-over");
    
    const taskId = ev.dataTransfer.getData("text/plain");
    const destStatus = col.getAttribute("data-status");

    if (taskId) {
      if (destStatus === "completed") {
        // Mark task completed
        const state = window.LifeFlowStore.state;
        const task = state.tasks.find(t => t.id === taskId);
        if (task && !task.completed) {
          window.LifeFlowStore.toggleTaskCompletion(taskId);
        }
      } else {
        // Update custom status
        const state = window.LifeFlowStore.state;
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
          const updates = { kanbanStatus: destStatus };
          if (task.completed) {
            // Re-open task
            updates.completed = false;
            updates.completedDate = null;
          }
          window.LifeFlowStore.editTask(taskId, updates);
        }
      }
    }
  };

  // Toggle detail view dropdown for lists
  window.toggleTaskDetailsDropdown = function(id) {
    const drop = document.getElementById(`task-dropdown-${id}`);
    if (drop) {
      drop.classList.toggle("hidden");
    }
  };

  // Checkbox triggers
  window.toggleTask = function(id) {
    window.LifeFlowStore.toggleTaskCompletion(id);
  };

  window.toggleSubtask = function(taskId, subtaskId) {
    window.LifeFlowStore.toggleSubtask(taskId, subtaskId);
  };

  window.deleteSubtask = function(taskId, subtaskId) {
    window.LifeFlowStore.deleteSubtask(taskId, subtaskId);
  };

  window.addSubtask = function(taskId) {
    const input = document.getElementById(`qt-new-subtask-${taskId}`);
    if (input && input.value.trim()) {
      window.LifeFlowStore.addSubtask(taskId, input.value.trim());
      input.value = "";
    }
  };

  window.deleteTask = function(id) {
    if (confirm("Are you sure you want to delete this task?")) {
      window.LifeFlowStore.deleteTask(id);
    }
  };

  window.switchTaskLayout = function(layout) {
    activeTaskLayout = layout;
    
    const listBtn = document.getElementById("layout-toggle-list");
    const kanbanBtn = document.getElementById("layout-toggle-kanban");
    const listLayout = document.getElementById("tasks-list-layout");
    const kanbanLayout = document.getElementById("tasks-kanban-layout");

    if (layout === "list") {
      listBtn?.classList.add("bg-white", "dark:bg-slate-800", "shadow-sm");
      kanbanBtn?.classList.remove("bg-white", "dark:bg-slate-800", "shadow-sm");
      listLayout?.classList.remove("hidden");
      kanbanLayout?.classList.add("hidden");
    } else {
      kanbanBtn?.classList.add("bg-white", "dark:bg-slate-800", "shadow-sm");
      listBtn?.classList.remove("bg-white", "dark:bg-slate-800", "shadow-sm");
      kanbanLayout?.classList.remove("hidden");
      listLayout?.classList.add("hidden");
    }

    renderTasksList(activeTaskFilter);
  };

  // --- CALENDAR VIEW RENDERING ---
  function switchCalendarMode(mode) {
    calendarViewMode = mode;
    
    // Highlight selector button
    document.querySelectorAll("#view-calendar [id^='cal-view-']").forEach(btn => {
      if (btn.id === `cal-view-${mode}`) {
        btn.classList.add("bg-brand-500", "text-white");
        btn.classList.remove("text-slate-500");
      } else {
        btn.classList.remove("bg-brand-500", "text-white");
        btn.classList.add("text-slate-500");
      }
    });

    // Toggle grid boxes visibility
    document.getElementById("calendar-grid-wrapper").classList.add("hidden");
    document.getElementById("calendar-week-wrapper").classList.add("hidden");
    document.getElementById("calendar-day-wrapper").classList.add("hidden");
    document.getElementById("calendar-agenda-wrapper").classList.add("hidden");

    if (mode === "month") {
      document.getElementById("calendar-grid-wrapper").classList.remove("hidden");
    } else if (mode === "week") {
      document.getElementById("calendar-week-wrapper").classList.remove("hidden");
    } else if (mode === "day") {
      document.getElementById("calendar-day-wrapper").classList.remove("hidden");
    } else if (mode === "agenda") {
      document.getElementById("calendar-agenda-wrapper").classList.remove("hidden");
    }

    renderCalendar();
  }

  window.changeCalendarMonth = function(offset) {
    activeCalendarDate.setMonth(activeCalendarDate.getMonth() + offset);
    renderCalendar();
  };

  window.resetCalendarToToday = function() {
    activeCalendarDate = new Date();
    renderCalendar();
  };

  function renderCalendar() {
    const state = window.LifeFlowStore.state;
    const title = document.getElementById("cal-month-title");
    
    if (title) {
      title.innerText = activeCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    // Load sub views
    if (calendarViewMode === "month") {
      renderMonthGrid();
    } else if (calendarViewMode === "week") {
      renderWeekGrid();
    } else if (calendarViewMode === "day") {
      renderDayView();
    } else if (calendarViewMode === "agenda") {
      renderAgendaView();
    }

    // Default inspector details to selected active day
    renderInspectorDetails(activeCalendarDate.toISOString().split("T")[0]);
  }

  function renderMonthGrid() {
    const grid = document.getElementById("calendar-days-grid");
    if (!grid) return;

    grid.innerHTML = "";
    const state = window.LifeFlowStore.state;

    // Helper dates logic for Month Grid
    const year = activeCalendarDate.getFullYear();
    const month = activeCalendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1
    // Adjust for Monday starts
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Activities map
    const scheduledDates = {};
    state.events.forEach(e => {
      const d = e.startDateTime.split("T")[0];
      scheduledDates[d] = scheduledDates[d] || { events: [], tasks: [], habits: [] };
      scheduledDates[d].events.push(e);
    });
    state.tasks.forEach(t => {
      // Show on its scheduled start date (as a task due)
      if (t.dueDate) {
        scheduledDates[t.dueDate] = scheduledDates[t.dueDate] || { events: [], tasks: [], habits: [] };
        if (!scheduledDates[t.dueDate].tasks.includes(t)) {
          scheduledDates[t.dueDate].tasks.push(t);
        }
      }
      // Also show on all dates it was completed historically
      if (t.completedDates) {
        Object.keys(t.completedDates).forEach(d => {
          scheduledDates[d] = scheduledDates[d] || { events: [], tasks: [], habits: [] };
          if (!scheduledDates[d].tasks.includes(t)) {
            scheduledDates[d].tasks.push(t);
          }
        });
      }
    });
    state.habits.forEach(h => {
      Object.keys(h.completedDates).forEach(d => {
        if (h.completedDates[d] === "done") {
          scheduledDates[d] = scheduledDates[d] || { events: [], tasks: [], habits: [] };
          scheduledDates[d].habits.push(h);
        }
      });
    });

    // Render preceding month days
    for (let i = startOffset; i > 0; i--) {
      const cellVal = prevMonthLastDay - i + 1;
      const cell = document.createElement("div");
      cell.className = "min-h-[70px] p-1.5 bg-slate-50/10 dark:bg-slate-900/10 text-slate-400 rounded-2xl border dark:border-slate-800/40 opacity-40 text-xs text-right font-medium";
      cell.innerText = cellVal.toString();
      grid.appendChild(cell);
    }

    // Render current month days
    const todayStr = window.LifeFlowStore.getTodayDateString();
    for (let i = 1; i <= lastDay; i++) {
      const dateCell = new Date(year, month, i);
      const cellDateStr = dateCell.toISOString().split("T")[0];
      
      const dayData = scheduledDates[cellDateStr] || { events: [], tasks: [], habits: [] };
      const isToday = cellDateStr === todayStr;

      const cell = document.createElement("div");
      cell.className = `min-h-[70px] p-1.5 rounded-2xl border cursor-pointer hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 flex flex-col justify-between transition-all ${
        isToday ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800'
      }`;

      // Indicators html
      let dots = "";
      if (dayData.events.length > 0) dots += `<div class="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Event"></div>`;
      if (dayData.tasks.length > 0) dots += `<div class="w-1.5 h-1.5 rounded-full bg-brand-500" title="Task"></div>`;
      if (dayData.habits.length > 0) dots += `<div class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Habit"></div>`;

      cell.innerHTML = `
        <div class="text-right text-xs font-bold ${isToday ? 'text-brand-500' : 'text-slate-700 dark:text-slate-300'}">${i}</div>
        <div class="flex flex-wrap gap-1 mt-auto">${dots}</div>
      `;

      cell.addEventListener("click", () => {
        activeCalendarDate = dateCell;
        renderInspectorDetails(cellDateStr);
      });

      grid.appendChild(cell);
    }
  }

  function renderWeekGrid() {
    const grid = document.getElementById("calendar-week-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const state = window.LifeFlowStore.state;
    const today = new Date(activeCalendarDate);
    const day = today.getDay();
    const mondayDiff = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const weekStart = new Date(today.setDate(mondayDiff));

    // Render 7 columns representation
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      const dateStr = dayDate.toISOString().split("T")[0];

      // Grab items
      const dayEvents = state.events.filter(e => e.startDateTime.split("T")[0] === dateStr);
      const todayStr = window.LifeFlowStore.getTodayDateString();
      const dayTasks = state.tasks.filter(t => {
        const isCompletedOnDay = t.completedDates && t.completedDates[dateStr];
        const isScheduledOnDay = t.dueDate === dateStr;
        const isActiveToday = (dateStr === todayStr && t.dueDate <= dateStr);
        return isCompletedOnDay || isScheduledOnDay || isActiveToday;
      });

      const col = document.createElement("div");
      col.className = "glass-panel p-3.5 rounded-3xl min-h-[380px] flex flex-col gap-3";
      col.innerHTML = `
        <div class="text-center border-b dark:border-slate-800 pb-1.5">
          <span class="text-[10px] text-slate-400 block uppercase font-bold">${dayDate.toLocaleDateString("en-US", { weekday: "short" })}</span>
          <span class="text-base font-extrabold font-display">${dayDate.getDate()}</span>
        </div>
        <div class="flex-1 space-y-2.5 overflow-y-auto max-h-[300px]">
          ${dayEvents.map(e => `
            <div class="p-2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl text-[10px] font-bold border-l-2 border-indigo-500">
              ${e.title}
            </div>
          `).join("")}
          ${dayTasks.map(t => `
            <div class="p-2 bg-brand-50/50 dark:bg-brand-950/20 text-brand-500 rounded-xl text-[10px] font-bold border-l-2 border-brand-500 ${t.completed ? 'line-through opacity-50' : ''}">
              ${t.title}
            </div>
          `).join("")}
          ${dayEvents.length === 0 && dayTasks.length === 0 ? '<p class="text-[9px] text-slate-400 italic text-center py-6">Empty</p>' : ''}
        </div>
      `;
      grid.appendChild(col);
    }
  }

  function renderDayView() {
    const list = document.getElementById("calendar-day-list");
    const title = document.getElementById("calendar-day-title");
    if (!list) return;

    list.innerHTML = "";
    const state = window.LifeFlowStore.state;
    const dateStr = activeCalendarDate.toISOString().split("T")[0];
    
    if (title) title.innerText = activeCalendarDate.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' });

    const dayEvents = state.events.filter(e => e.startDateTime.split("T")[0] === dateStr);
    const todayStr = window.LifeFlowStore.getTodayDateString();
    const dayTasks = state.tasks.filter(t => {
      const isCompletedOnDay = t.completedDates && t.completedDates[dateStr];
      const isScheduledOnDay = t.dueDate === dateStr;
      const isActiveToday = (dateStr === todayStr && t.dueDate <= dateStr);
      return isCompletedOnDay || isScheduledOnDay || isActiveToday;
    });

    if (dayEvents.length === 0 && dayTasks.length === 0) {
      list.innerHTML = `<p class="text-sm text-slate-400 italic text-center py-10">Nothing scheduled for today.</p>`;
      return;
    }

    dayEvents.forEach(e => {
      const div = document.createElement("div");
      div.className = `p-3 rounded-2xl border-l-4 border-indigo-500 bg-indigo-500/5 glass-panel flex flex-col gap-1`;
      div.innerHTML = `
        <span class="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Event • ${e.startDateTime.split("T")[1] || ""}</span>
        <span class="text-sm font-bold text-slate-800 dark:text-slate-200">${e.title}</span>
        <p class="text-xs text-slate-400">${e.description || ""}</p>
      `;
      list.appendChild(div);
    });

    dayTasks.forEach(t => {
      const div = document.createElement("div");
      div.className = `p-3 rounded-2xl border-l-4 border-brand-500 bg-brand-500/5 glass-panel flex flex-col gap-1`;
      const isDone = t.completedDates && t.completedDates[dateStr];
      div.innerHTML = `
        <span class="text-[10px] text-brand-500 font-bold uppercase tracking-wider">Task • ${t.dueTime || "No time"}</span>
        <span class="text-sm font-bold text-slate-800 dark:text-slate-200 ${isDone ? 'line-through text-slate-400 dark:text-slate-500 opacity-60' : ''}">${t.title}</span>
        <p class="text-xs text-slate-400">Priority: ${t.priority} • Category: ${t.category}</p>
      `;
      list.appendChild(div);
    });
  }

  function renderAgendaView() {
    const list = document.getElementById("calendar-agenda-list");
    if (!list) return;

    list.innerHTML = "";
    const state = window.LifeFlowStore.state;
    const todayStr = window.LifeFlowStore.getTodayDateString();

    const upcomingEvents = state.events.filter(e => e.startDateTime.split("T")[0] >= todayStr);
    const upcomingTasks = state.tasks.filter(t => t.dueDate >= todayStr && !t.completed);

    const merged = [];
    upcomingEvents.forEach(e => merged.push({ ...e, date: e.startDateTime.split("T")[0], type: "event" }));
    upcomingTasks.forEach(t => merged.push({ ...t, date: t.dueDate, type: "task" }));

    // Sort chronologically
    merged.sort((a, b) => a.date.localeCompare(b.date));

    if (merged.length === 0) {
      list.innerHTML = `<p class="text-sm text-slate-400 italic text-center py-10">No upcoming events or items.</p>`;
      return;
    }

    merged.forEach(item => {
      const div = document.createElement("div");
      const isEv = item.type === "event";
      div.className = `p-3.5 rounded-2xl flex items-center justify-between glass-panel border-l-4 ${isEv ? 'border-indigo-500' : 'border-brand-500'}`;
      div.innerHTML = `
        <div>
          <span class="text-sm font-bold block">${item.title}</span>
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">${item.type} • ${item.category || ""}</span>
        </div>
        <span class="text-xs font-bold text-slate-500">${item.date}</span>
      `;
      list.appendChild(div);
    });
  }

  // Render Date Inspector detail cards on click
  function renderInspectorDetails(dateStr) {
    const state = window.LifeFlowStore.state;
    const title = document.getElementById("inspector-date-title");
    if (title) title.innerText = dateStr;

    // Clear and fill
    const eventsEl = document.getElementById("inspector-events");
    const tasksEl = document.getElementById("inspector-tasks");
    const habitsEl = document.getElementById("inspector-habits");
    const journalEl = document.getElementById("inspector-journal");

    // 1. Events
    const dayEvents = state.events.filter(e => e.startDateTime.split("T")[0] === dateStr);
    if (eventsEl) {
      eventsEl.innerHTML = dayEvents.length === 0 
        ? `<p class="text-xs text-slate-400 italic">No events scheduled.</p>`
        : dayEvents.map(e => `
          <div class="p-2 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 font-semibold text-xs border-l border-indigo-500">
            ${e.title}
          </div>
        `).join("");
    }

    // 2. Tasks
    const todayStr = window.LifeFlowStore.getTodayDateString();
    const dayTasks = state.tasks.filter(t => {
      const isCompletedOnDay = t.completedDates && t.completedDates[dateStr];
      const isScheduledOnDay = t.dueDate === dateStr;
      const isActiveToday = (dateStr === todayStr && t.dueDate <= dateStr);
      return isCompletedOnDay || isScheduledOnDay || isActiveToday;
    });
    
    if (tasksEl) {
      tasksEl.innerHTML = dayTasks.length === 0 
        ? `<p class="text-xs text-slate-400 italic">No tasks due.</p>`
        : dayTasks.map(t => {
          const isDone = t.completedDates && t.completedDates[dateStr];
          return `
            <div class="p-2 rounded bg-brand-50 dark:bg-brand-950/20 text-brand-500 font-semibold text-xs border-l border-brand-500 ${isDone ? 'line-through opacity-60' : ''}">
              ${t.title}
            </div>
          `;
        }).join("");
    }

    // 3. Habits completed
    const dayCompletedHabits = state.habits.filter(h => h.completedDates[dateStr] === "done");
    if (habitsEl) {
      habitsEl.innerHTML = dayCompletedHabits.length === 0
        ? `<p class="text-xs text-slate-400 italic">No habits logged.</p>`
        : dayCompletedHabits.map(h => `
          <div class="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 font-semibold text-xs border-l border-emerald-500">
            ${h.name}
          </div>
        `).join("");
    }

    // 4. Journal Summary
    const dayJournal = state.journal[dateStr];
    if (journalEl) {
      journalEl.innerHTML = (!dayJournal || (!dayJournal.reflection && !dayJournal.gratitude))
        ? `<p class="text-xs text-slate-400 italic">No journal entry.</p>`
        : `
          <div class="p-2 rounded bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs space-y-1">
            <span class="block">Mood: ${dayJournal.mood || "N/A"}</span>
            <span class="block line-clamp-2 text-[10px] text-slate-400 italic">"${dayJournal.reflection || ""}"</span>
          </div>
        `;
    }
  }

  window.triggerQuickAddInspectorDate = function() {
    const qtDate = document.getElementById("qt-date");
    if (qtDate) qtDate.value = activeCalendarDate.toISOString().split("T")[0];
    openQuickAddModal("event");
  };

  // --- DAILY JOURNAL ---
  window.selectJournalMood = function(mood) {
    selectedMood = mood;
    document.querySelectorAll(".journal-mood-btn").forEach(btn => {
      if (btn.innerText === mood) {
        btn.classList.add("border-brand-500", "bg-brand-50/20", "dark:bg-brand-950/20", "scale-105");
      } else {
        btn.classList.remove("border-brand-500", "bg-brand-50/20", "dark:bg-brand-950/20", "scale-105");
      }
    });
  };

  function loadJournalForDate(dateStr) {
    const entry = window.LifeFlowStore.state.journal[dateStr] || {};
    
    // Set fields
    const gratitude = document.getElementById("journal-gratitude");
    const wins = document.getElementById("journal-wins");
    const challenges = document.getElementById("journal-challenges");
    const reflection = document.getElementById("journal-reflection");

    if (gratitude) gratitude.value = entry.gratitude || "";
    if (wins) wins.value = entry.wins || "";
    if (challenges) challenges.value = entry.challenges || "";
    if (reflection) reflection.value = entry.reflection || "";

    if (entry.mood) {
      selectJournalMood(entry.mood);
    } else {
      selectedMood = "";
      document.querySelectorAll(".journal-mood-btn").forEach(btn => {
        btn.classList.remove("border-brand-500", "bg-brand-50/20", "dark:bg-brand-950/20", "scale-105");
      });
    }
  }

  window.saveCurrentJournal = function() {
    const data = {
      mood: selectedMood,
      gratitude: document.getElementById("journal-gratitude")?.value || "",
      wins: document.getElementById("journal-wins")?.value || "",
      challenges: document.getElementById("journal-challenges")?.value || "",
      reflection: document.getElementById("journal-reflection")?.value || ""
    };

    window.LifeFlowStore.saveJournalEntry(activeJournalDate, data);
    alert("Journal entry saved successfully!");
  };

  function renderJournalArchive() {
    const list = document.getElementById("journal-archive-list");
    if (!list) return;
    list.innerHTML = "";

    const state = window.LifeFlowStore.state;
    const sortedDates = Object.keys(state.journal).sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) {
      list.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-6">No journal history.</p>`;
      return;
    }

    sortedDates.forEach(date => {
      const j = state.journal[date];
      const div = document.createElement("button");
      div.className = "w-full text-left p-3 rounded-2xl glass-panel hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all flex items-center justify-between";
      div.innerHTML = `
        <div>
          <span class="text-xs font-bold block">${date}</span>
          <span class="text-[10px] text-slate-400 italic truncate block max-w-[140px]">${j.reflection || "No reflections notes"}</span>
        </div>
        <span class="text-lg">${j.mood || "😐"}</span>
      `;
      div.addEventListener("click", () => {
        activeJournalDate = date;
        const picker = document.getElementById("journal-date-picker");
        if (picker) picker.value = date;
        loadJournalForDate(date);
      });
      list.appendChild(div);
    });
  }

  // --- GOALS AND MILESTONES ---
  function renderGoalsList() {
    const container = document.getElementById("goals-container");
    if (!container) return;
    container.innerHTML = "";

    const state = window.LifeFlowStore.state;
    if (state.goals.length === 0) {
      container.innerHTML = `<p class="text-sm text-slate-400 italic text-center py-10 col-span-2">No active goals created yet.</p>`;
      return;
    }

    state.goals.forEach(g => {
      const milestonesPercent = g.progress;
      const isCompleted = g.completed || milestonesPercent >= 100;

      const div = document.createElement("div");
      div.className = `glass-panel rounded-3xl p-6 space-y-4 animate-fade-in ${isCompleted ? 'opacity-75' : ''}`;
      
      div.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-lg font-display flex items-center gap-2">
              ${g.title}
              ${isCompleted ? `<span class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded text-[9px] font-bold">Achieved</span>` : ''}
            </h4>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Category: ${g.category} • Deadline: ${g.targetDate}</span>
          </div>
          <button onclick="deleteGoal('${g.id}')" class="text-slate-400 hover:text-rose-500 transition-all">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Progress bar -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs font-semibold">
            <span>Milestone Progress</span>
            <span class="text-brand-500">${milestonesPercent}%</span>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div class="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full transition-all duration-300" style="width: ${milestonesPercent}%"></div>
          </div>
        </div>

        <!-- Milestones list checklist -->
        <div class="space-y-2 border-t dark:border-slate-800/80 pt-3">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Milestones</span>
          <div class="space-y-1.5">
            ${g.milestones.map(m => `
              <label class="flex items-center gap-2.5 text-xs cursor-pointer">
                <input type="checkbox" ${m.completed ? 'checked' : ''} onclick="toggleGoalMilestone('${g.id}', '${m.id}')" class="rounded text-brand-500 focus:ring-brand-500 w-3.5 h-3.5">
                <span class="${m.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${m.title}</span>
              </label>
            `).join("")}
            ${g.milestones.length === 0 ? '<p class="text-[10px] text-slate-400 italic">No milestones set.</p>' : ''}
          </div>

          <!-- Add milestone inline input -->
          <div class="flex gap-2 mt-3.5">
            <input type="text" id="qt-new-milestone-${g.id}" placeholder="Add milestone..." class="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none">
            <button onclick="addGoalMilestone('${g.id}')" class="px-3 py-1 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 active:scale-95 transition-all">
              Add
            </button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    lucide.createIcons();
  }

  window.toggleGoalMilestone = function(goalId, milestoneId) {
    window.LifeFlowStore.toggleMilestone(goalId, milestoneId);
  };

  window.addGoalMilestone = function(goalId) {
    const input = document.getElementById(`qt-new-milestone-${goalId}`);
    if (input && input.value.trim()) {
      window.LifeFlowStore.addMilestone(goalId, input.value.trim());
      input.value = "";
    }
  };

  window.deleteGoal = function(id) {
    if (confirm("Are you sure you want to delete this goal?")) {
      window.LifeFlowStore.deleteGoal(id);
    }
  };

  // --- CHARTS GENERATOR ---
  function renderCharts() {
    const state = window.LifeFlowStore.state;
    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    const textColor = isDark ? "#94a3b8" : "#475569";

    // Grab summary statistics
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const totalHabitsCompleted = state.habits.reduce((acc, h) => {
      return acc + Object.values(h.completedDates).filter(val => val === "done").length;
    }, 0);

    const tasksCountEl = document.getElementById("analytics-total-tasks");
    const habitsCountEl = document.getElementById("analytics-total-habits");
    if (tasksCountEl) tasksCountEl.innerText = completedTasks.toString();
    if (habitsCountEl) habitsCountEl.innerText = totalHabitsCompleted.toString();

    // AI Coach Summary call
    const summary = window.LifeFlowAI.summarizeWeeklyProductivity(state.tasks, state.habits);
    const bestDayEl = document.getElementById("analytics-best-day");
    if (bestDayEl) bestDayEl.innerText = summary.mostProductiveDay;

    // 1. Consistency Index Weekly chart (Canvas based ChartJS)
    const consistencyCtx = document.getElementById("chart-consistency-weekly");
    if (consistencyCtx) {
      if (consistencyChart) consistencyChart.destroy();
      
      const labels = summary.dailyData.map(d => d.date);
      const scores = summary.dailyData.map(d => d.score);

      consistencyChart = new Chart(consistencyCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Productivity Value',
            data: scores,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: gridColor }, ticks: { color: textColor } },
            x: { grid: { display: false }, ticks: { color: textColor } }
          }
        }
      });
    }

    // 2. Task Distribution Doughnut
    const distCtx = document.getElementById("chart-tasks-distribution");
    if (distCtx) {
      if (distributionChart) distributionChart.destroy();

      // Count tasks by category
      const counts = {};
      state.tasks.forEach(t => {
        if (t.completed) {
          counts[t.category] = (counts[t.category] || 0) + 1;
        }
      });

      const catLabels = Object.keys(counts);
      const catData = Object.values(counts);

      if (catLabels.length === 0) {
        catLabels.push("None completed");
        catData.push(1);
      }

      distributionChart = new Chart(distCtx, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catData,
            backgroundColor: [
              '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#64748b'
            ],
            borderWidth: isDark ? 2 : 1,
            borderColor: isDark ? '#0d1425' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, boxWidth: 10 }
            }
          }
        }
      });
    }
  }

  // --- GAMIFIED BADGES SHELF ---
  function renderBadges() {
    const shelf = document.getElementById("badges-shelf");
    if (!shelf) return;
    shelf.innerHTML = "";

    const earnedBadges = window.LifeFlowStore.getBadgesEarned();
    const earnedIds = new Set(earnedBadges.map(b => b.id));

    // Preset checklist of badges
    const allBadges = [
      { id: "b1", title: "First Step", desc: "Complete 1 task/habit", icon: "footprints", color: "sky" },
      { id: "b2", title: "Streak Starter", desc: "3-day activity streak", icon: "flame", color: "orange" },
      { id: "b3", title: "Unstoppable", desc: "7-day activity streak", icon: "zap", color: "yellow" },
      { id: "b4", title: "Habit Hero", desc: "Log 25 habits total", icon: "award", color: "emerald" },
      { id: "b5", title: "Mindful Soul", desc: "Reflect 3 times", icon: "sparkles", color: "purple" },
      { id: "b6", title: "Goal Crusher", desc: "Complete 1 target goal", icon: "trophy", color: "amber" }
    ];

    allBadges.forEach(b => {
      const active = earnedIds.has(b.id);
      const card = document.createElement("div");
      
      card.className = `p-4 rounded-3xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all ${
        active 
          ? 'glass-panel border-brand-500/20 shadow-md shadow-brand-500/5 hover:scale-105' 
          : 'bg-slate-50/40 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/40 opacity-40'
      }`;

      let glowStyle = active ? `text-${b.color}-500` : "text-slate-400";

      card.innerHTML = `
        <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center ${glowStyle}">
          <i data-lucide="${b.icon}" class="w-5.5 h-5.5"></i>
        </div>
        <span class="text-xs font-bold block ${active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}">${b.title}</span>
        <span class="text-[8px] text-slate-400 leading-tight block">${b.desc}</span>
      `;
      shelf.appendChild(card);
    });
  }

  // --- AI COACH VIEW & CONSOLE CHAT ---
  window.askCoachPreset = function(presetType) {
    const input = document.getElementById("ai-chat-input");
    let text = "";
    if (presetType === "priorities") text = "Suggest today's priorities";
    else if (presetType === "habits") text = "Recommend habit improvements";
    else if (presetType === "weekly") text = "Summarize weekly productivity";

    if (input) {
      input.value = text;
      sendCoachChatMessage();
    }
  };

  window.askCoachDecompose = function() {
    const input = document.getElementById("ai-task-decompose-input");
    const chatInput = document.getElementById("ai-chat-input");
    if (input && input.value.trim() && chatInput) {
      chatInput.value = `Break task into subtasks: "${input.value.trim()}"`;
      sendCoachChatMessage();
      input.value = "";
    }
  };

  window.sendCoachChatMessage = function() {
    const input = document.getElementById("ai-chat-input");
    const box = document.getElementById("ai-chat-box");
    if (!input || !box || !input.value.trim()) return;

    const query = input.value.trim();
    input.value = "";

    // Append User Bubble
    const userDiv = document.createElement("div");
    userDiv.className = "flex gap-3 justify-end";
    userDiv.innerHTML = `
      <div class="bg-brand-500 text-white rounded-2xl rounded-tr-none p-3.5 max-w-[80%] text-sm">
        <p class="text-[10px] font-bold text-white/70 mb-1 text-right">You</p>
        <p>${query}</p>
      </div>
    `;
    box.appendChild(userDiv);
    
    // Auto-scroll chat
    box.scrollTop = box.scrollHeight;

    // Simulate thinking delay
    setTimeout(() => {
      const response = generateCoachResponse(query);
      const coachDiv = document.createElement("div");
      coachDiv.className = "flex gap-3";
      coachDiv.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shrink-0">
          <i data-lucide="sparkles" class="w-4 h-4"></i>
        </div>
        <div class="bg-slate-100 dark:bg-slate-800/80 rounded-2xl rounded-tl-none p-3.5 max-w-[80%] text-sm">
          <p class="text-xs font-bold text-purple-500 mb-1">AI Coach</p>
          <p>${response}</p>
        </div>
      `;
      box.appendChild(coachDiv);
      lucide.createIcons();
      box.scrollTop = box.scrollHeight;
    }, 600);
  };

  function generateCoachResponse(query) {
    const qLower = query.toLowerCase();
    const state = window.LifeFlowStore.state;

    // Preset Priority Response
    if (qLower.includes("priorities") || qLower.includes("priority")) {
      const list = window.LifeFlowAI.suggestTodayPriorities(state.tasks, state.habits, state.goals);
      let res = "Here are today's smart focus priorities based on your calendar & pending checklists:<ul class='list-disc pl-5 mt-2 space-y-2'>";
      list.forEach(p => {
        res += `<li><strong>${p.title}</strong><br><span class='text-xs text-slate-400'>${p.desc}</span></li>`;
      });
      res += "</ul>";
      return res;
    }

    // Preset Habit Response
    if (qLower.includes("habit")) {
      const list = window.LifeFlowAI.recommendHabitImprovements(state.habits);
      let res = "I've analyzed your habit tracking completion rates from the past 7 days. Here's my diagnosis:<ul class='list-disc pl-5 mt-2 space-y-2.5'>";
      list.forEach(item => {
        res += `<li><strong>${item.name} (${item.rate}% consistent):</strong> ${item.tip}</li>`;
      });
      res += "</ul>";
      return res;
    }

    // Preset Weekly Summary
    if (qLower.includes("weekly") || qLower.includes("summarize")) {
      const summary = window.LifeFlowAI.summarizeWeeklyProductivity(state.tasks, state.habits);
      return `
        Here is your Weekly Productivity Summary:<br><br>
        • Completed Checklist Tasks: <strong>${summary.completedTasks}</strong><br>
        • Checked Habit Actions: <strong>${summary.completedHabits}</strong><br>
        • Peak Production Output Day: <strong>${summary.mostProductiveDay}</strong><br><br>
        <em>Insight:</em> ${summary.insight}
      `;
    }

    // Task decomposition Heuristics
    if (qLower.includes("break task") || qLower.includes("decompose") || qLower.includes("subtasks:")) {
      let taskTitle = query;
      // Extract task title from quotes or string
      const match = query.match(/"([^"]+)"/) || query.match(/'([^']+)'/);
      if (match) {
        taskTitle = match[1];
      } else {
        taskTitle = query.replace("break task into subtasks:", "").replace("break down task:", "").replace("decompose:", "").trim();
      }

      const list = window.LifeFlowAI.suggestSubtasks(taskTitle);
      let res = `I've broken down <strong>"${taskTitle}"</strong> into smaller, structured checklist items:<ul class='list-decimal pl-5 mt-2 space-y-1.5'>`;
      list.forEach(sub => {
        res += `<li>${sub}</li>`;
      });
      res += `</ul><br><button onclick="createTaskWithSubtasks('${taskTitle.replace(/'/g, "\\'")}', [${list.map(s => `'${s.replace(/'/g, "\\'")}'`).join(',')}])" class="mt-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold shadow transition-all">Add task with subtasks</button>`;
      return res;
    }

    // Custom daily message trigger
    if (qLower.includes("motivation") || qLower.includes("coaching") || qLower.includes("inspire")) {
      const jToday = state.journal[window.LifeFlowStore.getTodayDateString()] || {};
      return window.LifeFlowAI.generateMotivationalMessage(jToday.mood || "😐", state.streak);
    }

    // General fallback Q&A
    return "I hear you! Try asking me: <ul><li>• <em>'Suggest today's priorities'</em></li><li>• <em>'Recommend habit improvements'</em></li><li>• <em>'Break task: Design Slide Deck'</em></li><li>• <em>'Summarize weekly productivity'</em></li></ul>";
  }

  // AI helper: Add task dynamically directly from Chat response button click!
  window.createTaskWithSubtasks = function(title, subtasksArr) {
    const taskObj = {
      title,
      priority: "medium",
      dueDate: window.LifeFlowStore.getTodayDateString(),
      dueTime: "12:00",
      repeat: "none",
      category: "Work",
      labels: ["ai-coached"]
    };
    
    // Inject subtasks list
    const subtasks = subtasksArr.map((st, index) => ({
      id: `sub_coach_${Date.now()}_${index}`,
      title: st,
      completed: false
    }));

    window.LifeFlowStore.addTask({ ...taskObj, subtasks });
    alert(`Task "${title}" created successfully with ${subtasksArr.length} subtasks!`);
    switchView("tasks");
  };

  // --- SETTINGS PREFERENCES SYNC ---
  window.updateSettings = function() {
    const startOfWeek = parseInt(document.getElementById("setting-week-start").value);
    const fontSize = document.getElementById("setting-font-size").value;
    const language = document.getElementById("setting-lang").value;

    window.LifeFlowStore.updateProfile({
      settings: {
        ...window.LifeFlowStore.state.profile.settings,
        startOfWeek,
        fontSize,
        language
      }
    });
  };

  window.updateReminders = function() {
    const water = document.getElementById("reminder-water").value;
    const workout = document.getElementById("reminder-workout").value;
    const journal = document.getElementById("reminder-journal").value;
    const bedtime = document.getElementById("reminder-bedtime").value;

    window.LifeFlowStore.updateProfile({
      settings: {
        ...window.LifeFlowStore.state.profile.settings,
        reminders: { water, workout, journal, bedtime }
      }
    });
  };

  window.editProfileName = function() {
    const next = prompt("Enter your display name:", window.LifeFlowStore.state.profile.name);
    if (next && next.trim()) {
      window.LifeFlowStore.updateProfile({ name: next.trim() });
    }
  };

  window.changeProfileAvatar = function() {
    const next = prompt("Enter image URL for avatar:", window.LifeFlowStore.state.profile.avatar);
    if (next && next.trim()) {
      window.LifeFlowStore.updateProfile({ avatar: next.trim() });
    }
  };

  window.simulateCloudSync = function() {
    alert("Simulating secure cloud sync... Uploading local states to Firestore... Done! LifeFlow database synced successfully across devices.");
  };

  window.resetAppToDefaultSettings = function() {
    if (confirm("WARNING: This will wipe out all habits, tasks, calendar records, and journal entries. Reset to startup state?")) {
      window.LifeFlowStore.resetToDefaults();
    }
  };

  // CSV downloads
  window.exportDataCSV = function(type) {
    const csv = window.LifeFlowStore.exportToCSV(type);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `lifeflow_${type}_backup.csv`);
    a.click();
  };

  // JSON database backups
  window.downloadBackup = function() {
    const json = window.LifeFlowStore.backupData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `lifeflow_state_backup.json`);
    a.click();
  };

  window.triggerRestoreUpload = function() {
    document.getElementById("backup-file-upload")?.click();
  };

  window.uploadBackupRestore = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const content = evt.target.result;
      const success = window.LifeFlowStore.restoreData(content);
      if (success) {
        alert("LifeFlow backup data restored successfully!");
      } else {
        alert("Invalid backup file. Could not restore state.");
      }
    };
    reader.readAsText(file);
  };

  // --- DIALOG MODALS OPEN/CLOSE ---
  window.openQuickAddModal = function(defaultTab = "task") {
    quickAddTab = defaultTab;
    const modal = document.getElementById("quick-add-modal");
    if (!modal) return;

    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.querySelector(".glass-panel").classList.remove("scale-95");
    
    // Switch to default tab
    switchQuickAddTab(defaultTab);
  };

  window.closeQuickAddModal = function() {
    const modal = document.getElementById("quick-add-modal");
    if (!modal) return;

    modal.classList.add("opacity-0", "pointer-events-none");
    modal.querySelector(".glass-panel").classList.add("scale-95");
  };

  window.switchQuickAddTab = function(tab) {
    quickAddTab = tab;
    
    // Setup tab button active classes
    const btnTask = document.getElementById("quick-tab-task");
    const btnHabit = document.getElementById("quick-tab-habit");
    const btnEvent = document.getElementById("quick-tab-event");
    const formTask = document.getElementById("quick-task-form");
    const formHabit = document.getElementById("quick-habit-form");
    const formEvent = document.getElementById("quick-event-form");

    const tabs = [btnTask, btnHabit, btnEvent];
    const forms = [formTask, formHabit, formEvent];

    tabs.forEach(btn => {
      if (btn) {
        if (btn.id === `quick-tab-${tab}`) {
          btn.classList.add("bg-white", "dark:bg-slate-800", "shadow-sm", "text-slate-800", "dark:text-slate-200");
          btn.classList.remove("text-slate-400");
        } else {
          btn.classList.remove("bg-white", "dark:bg-slate-800", "shadow-sm", "text-slate-800", "dark:text-slate-200");
          btn.classList.add("text-slate-400");
        }
      }
    });

    forms.forEach(form => {
      if (form) {
        if (form.id === `quick-${tab}-form`) {
          form.classList.remove("hidden");
        } else {
          form.classList.add("hidden");
        }
      }
    });
  };

  // Submit operations
  window.submitQuickTask = function(e) {
    e.preventDefault();
    const title = document.getElementById("qt-title").value.trim();
    const priority = document.getElementById("qt-priority").value;
    const dueDate = document.getElementById("qt-date").value;

    if (title) {
      window.LifeFlowStore.addTask({ title, priority, dueDate, category: "Work" });
      document.getElementById("qt-title").value = "";
      closeQuickAddModal();
    }
  };

  window.submitQuickHabit = function(e) {
    e.preventDefault();
    const name = document.getElementById("qh-name").value.trim();
    const category = document.getElementById("qh-category").value.trim() || "Health";
    const frequency = document.getElementById("qh-frequency").value;
    const color = document.getElementById("qh-color").value;
    const icon = document.getElementById("qh-icon").value;

    if (name) {
      window.LifeFlowStore.addHabit({ name, category, frequency, color, icon });
      document.getElementById("qh-name").value = "";
      closeQuickAddModal();
    }
  };

  window.submitQuickEvent = function(e) {
    e.preventDefault();
    const title = document.getElementById("qe-title").value.trim();
    const startDateTime = document.getElementById("qe-start").value;
    const endDateTime = document.getElementById("qe-end").value;

    if (title && startDateTime && endDateTime) {
      window.LifeFlowStore.addEvent({ title, startDateTime, endDateTime, color: "indigo" });
      document.getElementById("qe-title").value = "";
      closeQuickAddModal();
    }
  };

  // 2. Goal target creation
  window.openAddGoalModal = function() {
    const modal = document.getElementById("add-goal-modal");
    if (!modal) return;
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.querySelector(".glass-panel").classList.remove("scale-95");
  };

  window.closeAddGoalModal = function() {
    const modal = document.getElementById("add-goal-modal");
    if (!modal) return;
    modal.classList.add("opacity-0", "pointer-events-none");
    modal.querySelector(".glass-panel").classList.add("scale-95");
  };

  window.submitAddGoal = function(e) {
    e.preventDefault();
    const title = document.getElementById("goal-title").value.trim();
    const category = document.getElementById("goal-category").value;
    const targetDate = document.getElementById("goal-deadline").value;

    if (title) {
      window.LifeFlowStore.addGoal({ title, category, targetDate });
      document.getElementById("goal-title").value = "";
      closeAddGoalModal();
    }
  };

  // Fallbacks modal hooks mapping to QuickAdd
  window.openAddHabitModal = function() { openQuickAddModal("habit"); };
  window.openAddTaskModal = function() { openQuickAddModal("task"); };
  window.openAddEventModal = function() { openQuickAddModal("event"); };

  // --- AUTHENTICATION & CLOUD SYNC CONTROLLERS ---
  window.openLoginModal = function() {
    const modal = document.getElementById("login-modal");
    if (!modal) return;
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.querySelector(".glass-panel").classList.remove("scale-95");
    
    // Autofill firebase config json if exists in localStorage
    const savedConfig = localStorage.getItem("lf_firebase_config");
    const jsonField = document.getElementById("firebase-config-json");
    if (savedConfig && jsonField) {
      jsonField.value = savedConfig;
    }

    // Render dynamic Google Identity Services Popup Sign In button
    if (typeof google !== 'undefined') {
      const clientId = localStorage.getItem("lf_google_client_id") || "982054238711-dsae819bml3n729d3f185oamcrptgr4v.apps.googleusercontent.com";
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: window.handleGoogleCredentialResponse,
          context: "signin",
          ux_mode: "popup"
        });

        const btnContainer = document.getElementById("gsi-button-container");
        if (btnContainer) {
          google.accounts.id.renderButton(
            btnContainer,
            { 
              theme: "outline", 
              size: "large", 
              width: btnContainer.offsetWidth || 320, 
              shape: "rectangular" 
            }
          );
        }
      } catch (err) {
        console.warn("GSI initialization failed, check Client ID format:", err);
      }
    }
  };

  window.closeLoginModal = function() {
    const modal = document.getElementById("login-modal");
    if (!modal) return;
    modal.classList.add("opacity-0", "pointer-events-none");
    modal.querySelector(".glass-panel").classList.add("scale-95");
  };

  window.switchLoginTab = function(tab) {
    const loginForm = document.getElementById("email-login-form");
    const signupForm = document.getElementById("email-signup-form");
    const loginTab = document.getElementById("login-tab-signin");
    const signupTab = document.getElementById("login-tab-signup");

    if (tab === "signin") {
      loginForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
      
      loginTab.classList.add("bg-white", "dark:bg-slate-800", "shadow-sm", "text-slate-800", "dark:text-slate-200");
      loginTab.classList.remove("text-slate-400");
      
      signupTab.classList.remove("bg-white", "dark:bg-slate-800", "shadow-sm", "text-slate-800", "dark:text-slate-200");
      signupTab.classList.add("text-slate-400");
    } else {
      loginForm.classList.add("hidden");
      signupForm.classList.remove("hidden");
      
      signupTab.classList.add("bg-white", "dark:bg-slate-800", "shadow-sm", "text-slate-800", "dark:text-slate-200");
      signupTab.classList.remove("text-slate-400");
      
      loginTab.classList.remove("bg-white", "dark:bg-slate-800", "shadow-sm", "text-slate-800", "dark:text-slate-200");
      loginTab.classList.add("text-slate-400");
    }
  };

  window.toggleFirebaseConfigSection = function() {
    const section = document.getElementById("fb-config-inputs-section");
    const chevron = document.getElementById("fb-config-chevron");
    if (!section) return;
    
    if (section.classList.contains("hidden")) {
      section.classList.remove("hidden");
      if (chevron) chevron.classList.add("rotate-90");
    } else {
      section.classList.add("hidden");
      if (chevron) chevron.classList.remove("rotate-90");
    }
  };

  window.saveFirebaseConfig = function() {
    const val = document.getElementById("firebase-config-json").value.trim();
    if (!val) {
      alert("Please paste a valid Firebase configuration JSON.");
      return;
    }
    
    if (window.LifeFlowFirebase.saveConfig(val)) {
      alert("Firebase configuration saved! Reinitializing...");
      closeLoginModal();
    }
  };

  window.clearFirebaseConfig = function() {
    if (confirm("Are you sure you want to reset and disconnect from Firebase?")) {
      window.LifeFlowFirebase.clearConfig();
    }
  };

  window.submitEmailLogin = function(e) {
    e.preventDefault();
    const email = document.getElementById("auth-email").value.trim();
    const pass = document.getElementById("auth-password").value;
    
    window.LifeFlowFirebase.signInWithEmail(email, pass)
      .then(() => {
        alert("Successfully logged in!");
        closeLoginModal();
      })
      .catch(err => {
        alert("Login failed: " + err.message);
      });
  };

  window.submitEmailSignup = function(e) {
    e.preventDefault();
    const email = document.getElementById("auth-signup-email").value.trim();
    const pass = document.getElementById("auth-signup-password").value;
    
    window.LifeFlowFirebase.signUpWithEmail(email, pass)
      .then(() => {
        alert("Account successfully created and logged in!");
        closeLoginModal();
      })
      .catch(err => {
        alert("Registration failed: " + err.message);
      });
  };

  window.signInWithGoogle = function() {
    window.LifeFlowFirebase.signInWithGoogle()
      .then(() => {
        alert("Successfully connected with Google!");
        closeLoginModal();
      })
      .catch(err => {
        alert("Google Authentication failed: " + err.message);
      });
  };

  window.signInWithFirebasePopup = function() {
    if (window.LifeFlowFirebase.isConnected()) {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then(result => {
          alert("Successfully connected via Google Pop-up!");
          closeLoginModal();
        })
        .catch(err => {
          console.error("Google Popup Authentication failed:", err);
          if (err.code === "auth/unauthorized-domain") {
            alert("Authorization Error: This domain (localhost) is not authorized in your Firebase project.\n\nTo fix this:\n1. Go to your Firebase Console (console.firebase.google.com)\n2. Navigate to Authentication -> Settings -> Authorized Domains\n3. Click 'Add Domain' and add 'localhost'\n4. Refresh the page and try logging in again!");
          } else {
            alert("Google Popup Authentication failed: " + err.message);
          }
        });
    } else {
      alert("Please configure or check your Firebase credentials configuration first.");
    }
  };

  window.signOutUser = function() {
    if (confirm("Are you sure you want to sign out? Your local changes will remain stored locally.")) {
      window.LifeFlowFirebase.signOut()
        .then(() => {
          alert("Successfully signed out.");
        });
    }
  };

  window.saveGoogleClientId = function() {
    const val = document.getElementById("setting-google-client-id").value.trim();
    if (val) {
      localStorage.setItem("lf_google_client_id", val);
      alert("Google Client ID saved! Next time you open the sign-in modal, it will use your Client ID.");
    } else {
      localStorage.removeItem("lf_google_client_id");
      alert("Google Client ID reset to default.");
    }
  };

  // Bind Auth state changes to update the UI
  if (window.LifeFlowFirebase) {
    window.LifeFlowFirebase.onAuthStateChanged(user => {
      const loggedOutEl = document.getElementById("auth-logged-out-state");
      const loggedInEl = document.getElementById("auth-logged-in-state");
      const userEmailEl = document.getElementById("auth-user-email");
      const profileTierEl = document.getElementById("profile-tier");

      if (user) {
        if (loggedOutEl) loggedOutEl.classList.add("hidden");
        if (loggedInEl) loggedInEl.classList.remove("hidden");
        if (userEmailEl) userEmailEl.innerText = user.email;
        if (profileTierEl) profileTierEl.innerText = "Productivity Level: Synchronized";
        
        // Sync layout headers
        const sName = document.getElementById("sidebar-name");
        const pName = document.getElementById("profile-display-name");
        const sAvatar = document.getElementById("sidebar-avatar");
        const mAvatar = document.getElementById("mobile-avatar");
        const pAvatar = document.getElementById("profile-avatar-img");
        
        const nameVal = user.displayName || user.email.split("@")[0];
        if (sName) sName.innerText = nameVal;
        if (pName) pName.innerText = nameVal;
        
        const avatarUrl = user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80";
        if (sAvatar) sAvatar.src = avatarUrl;
        if (mAvatar) mAvatar.src = avatarUrl;
        if (pAvatar) pAvatar.src = avatarUrl;
      } else {
        if (loggedOutEl) loggedOutEl.classList.remove("hidden");
        if (loggedInEl) loggedInEl.classList.add("hidden");
        if (profileTierEl) profileTierEl.innerText = "Productivity Level: Elite";
      }

      // Re-trigger icon updates
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  }

})();
