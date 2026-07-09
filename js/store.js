(function() {
  const DEFAULT_PROFILE = {
    name: "Alex Mercer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    productivityLevel: "Elite",
    settings: {
      theme: "dark",
      startOfWeek: 1, // 1 = Monday, 0 = Sunday
      fontSize: "normal",
      language: "en",
      reminders: {
        water: "10:00",
        workout: "17:00",
        journal: "21:30",
        bedtime: "22:30"
      }
    }
  };

  const DEFAULT_HABITS = [
    {
      id: "h1",
      name: "Drink 3L Water",
      category: "Health",
      icon: "droplet",
      color: "sky",
      frequency: "daily",
      notes: "Hydrate continuously through the day.",
      completedDates: {}, // "YYYY-MM-DD": "done" | "skipped"
      streak: 0,
      maxStreak: 0,
      reminders: ["09:00", "14:00", "19:00"]
    },
    {
      id: "h2",
      name: "30 Min Exercise",
      category: "Fitness",
      icon: "activity",
      color: "emerald",
      frequency: "daily",
      notes: "Yoga, gym, or running.",
      completedDates: {},
      streak: 0,
      maxStreak: 0,
      reminders: ["17:30"]
    },
    {
      id: "h3",
      name: "Read 10 Pages",
      category: "Study",
      icon: "book-open",
      color: "indigo",
      frequency: "daily",
      notes: "Non-fiction or professional skill books.",
      completedDates: {},
      streak: 0,
      maxStreak: 0,
      reminders: ["21:00"]
    },
    {
      id: "h4",
      name: "Budget Check",
      category: "Finance",
      icon: "dollar-sign",
      color: "amber",
      frequency: "weekly",
      notes: "Log transactions and update budgets.",
      completedDates: {},
      streak: 0,
      maxStreak: 0,
      reminders: ["18:00"]
    }
  ];

  const DEFAULT_TASKS = [
    {
      id: "t1",
      title: "Plan weekly goals and review streaks",
      priority: "high",
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "09:00",
      repeat: "daily",
      category: "Personal",
      labels: ["planning"],
      notes: "Review consistency index and set milestone targets.",
      completed: false,
      completedDate: null,
      completedDates: {},
      subtasks: [
        { id: "ts1_1", title: "Complete Sunday weekly reflection", completed: false },
        { id: "ts1_2", title: "Set priorities in LifeFlow dashboard", completed: false }
      ],
      order: 0
    },
    {
      id: "t2",
      title: "HIIT Workout Session",
      priority: "medium",
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "18:00",
      repeat: "daily",
      category: "Fitness",
      labels: ["cardio"],
      notes: "Full body workout 25 minutes + stretching.",
      completed: false,
      completedDate: null,
      completedDates: {},
      subtasks: [],
      order: 1
    },
    {
      id: "t3",
      title: "Build presentation deck for team meeting",
      priority: "high",
      dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
      dueTime: "11:00",
      repeat: "daily",
      category: "Work",
      labels: ["slide-deck", "design"],
      notes: "Include Q2 progress chart and draft goals.",
      completed: false,
      completedDate: null,
      completedDates: {},
      subtasks: [
        { id: "ts3_1", title: "Gather Q2 analytics reports", completed: false },
        { id: "ts3_2", title: "Design clean mockup slides", completed: false },
        { id: "ts3_3", title: "Write speech scripts", completed: false }
      ],
      order: 2
    }
  ];

  const DEFAULT_GOALS = [
    {
      id: "g1",
      title: "Run a Half Marathon",
      category: "Fitness",
      targetDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0], // 90 days from now
      progress: 40,
      notes: "Target completion under 2 hours.",
      completed: false,
      milestones: [
        { id: "gm1_1", title: "Complete 5k run", completed: true },
        { id: "gm1_2", title: "Complete 10k run", completed: true },
        { id: "gm1_3", title: "Run 15k continuously", completed: false },
        { id: "gm1_4", title: "Official race day execution", completed: false }
      ]
    },
    {
      id: "g2",
      title: "Master TypeScript & System Design",
      category: "Study",
      targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
      progress: 25,
      notes: "Watch advanced courses and read clean code standards.",
      completed: false,
      milestones: [
        { id: "gm2_1", title: "Finish TypeScript compiler architecture study", completed: true },
        { id: "gm2_2", title: "Build 3 modular frontend widgets", completed: false },
        { id: "gm2_3", title: "Read Clean Architecture book", completed: false }
      ]
    }
  ];

  const DEFAULT_EVENTS = [
    {
      id: "e1",
      title: "Project Design Sync",
      startDateTime: new Date().toISOString().split("T")[0] + "T10:00",
      endDateTime: new Date().toISOString().split("T")[0] + "T11:00",
      color: "indigo",
      description: "Discussing the UI wireframes and visual tokens.",
      reminders: ["15m before"]
    },
    {
      id: "e2",
      title: "Dentist Appointment",
      startDateTime: new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T14:30",
      endDateTime: new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T15:30",
      color: "emerald",
      description: "Routine cleanup and dental wellness check.",
      reminders: ["1h before"]
    }
  ];

  class Store {
    constructor() {
      this.listeners = [];
      this.load();
      this.initFirebaseSync();
    }

    load() {
      try {
        this.state = {
          profile: JSON.parse(localStorage.getItem("lf_profile")) || DEFAULT_PROFILE,
          habits: JSON.parse(localStorage.getItem("lf_habits")) || DEFAULT_HABITS,
          tasks: JSON.parse(localStorage.getItem("lf_tasks")) || DEFAULT_TASKS,
          goals: JSON.parse(localStorage.getItem("lf_goals")) || DEFAULT_GOALS,
          events: JSON.parse(localStorage.getItem("lf_events")) || DEFAULT_EVENTS,
          journal: JSON.parse(localStorage.getItem("lf_journal")) || {}, // Key: YYYY-MM-DD
          favoriteQuotes: JSON.parse(localStorage.getItem("lf_favorite_quotes")) || [],
          streak: parseInt(localStorage.getItem("lf_streak")) || 0,
          longestStreak: parseInt(localStorage.getItem("lf_longest_streak")) || 0
        };

        this.checkAndResetDailyTasks();
        this.recalculateStreaks();
      } catch (e) {
        console.error("Failed to load local storage state, initializing defaults", e);
        this.resetToDefaults();
      }
    }

    save() {
      try {
        localStorage.setItem("lf_profile", JSON.stringify(this.state.profile));
        localStorage.setItem("lf_habits", JSON.stringify(this.state.habits));
        localStorage.setItem("lf_tasks", JSON.stringify(this.state.tasks));
        localStorage.setItem("lf_goals", JSON.stringify(this.state.goals));
        localStorage.setItem("lf_events", JSON.stringify(this.state.events));
        localStorage.setItem("lf_journal", JSON.stringify(this.state.journal));
        localStorage.setItem("lf_favorite_quotes", JSON.stringify(this.state.favoriteQuotes));
        localStorage.setItem("lf_streak", this.state.streak.toString());
        localStorage.setItem("lf_longest_streak", this.state.longestStreak.toString());
        
        // Save to Firebase Cloud Sync if active
        if (window.LifeFlowFirebase) {
          window.LifeFlowFirebase.syncData(this.state);
        }

        this.notify();
      } catch (e) {
        console.error("Local storage save error", e);
      }
    }

    resetToDefaults() {
      this.state = {
        profile: JSON.parse(JSON.stringify(DEFAULT_PROFILE)),
        habits: JSON.parse(JSON.stringify(DEFAULT_HABITS)),
        tasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
        goals: JSON.parse(JSON.stringify(DEFAULT_GOALS)),
        events: JSON.parse(JSON.stringify(DEFAULT_EVENTS)),
        journal: {},
        favoriteQuotes: [],
        streak: 0,
        longestStreak: 0
      };
      this.save();
    }

    checkAndResetDailyTasks() {
      const todayStr = this.getTodayDateString();
      let changed = false;

      // Initialize completedDates if missing (for legacy or raw objects)
      this.state.tasks.forEach(t => {
        if (!t.completedDates) {
          t.completedDates = {};
          if (t.completed && t.completedDate) {
            t.completedDates[t.completedDate] = true;
          }
          changed = true;
        }
        
        // Sync the main task properties for today
        const wasCompleted = t.completed;
        const wasDate = t.completedDate;
        t.completed = !!t.completedDates[todayStr];
        t.completedDate = t.completed ? todayStr : null;

        if (wasCompleted !== t.completed || wasDate !== t.completedDate) {
          changed = true;
        }
      });

      // Check if the day rolled over since last active day to reset subtasks
      const lastActiveDay = localStorage.getItem("lf_last_active_day") || todayStr;
      if (lastActiveDay < todayStr) {
        this.state.tasks.forEach(t => {
          if (t.subtasks) {
            t.subtasks.forEach(st => st.completed = false);
          }
          // Reset kanban status of open tasks to todo
          if (!t.completedDates[todayStr]) {
            t.kanbanStatus = "todo";
          }
        });
        localStorage.setItem("lf_last_active_day", todayStr);
        changed = true;
      }

      if (changed) {
        this.save();
      }
    }

    initFirebaseSync() {
      if (!window.LifeFlowFirebase) return;

      window.LifeFlowFirebase.onAuthStateChanged(user => {
        if (user) {
          console.log("Store: Auth state changed - User Logged In:", user.email);
          this.state.profile.name = user.displayName || user.email.split("@")[0];
          if (user.photoURL) {
            this.state.profile.avatar = user.photoURL;
          }
          
          window.LifeFlowFirebase.fetchData().then(cloudData => {
            if (cloudData) {
              console.log("Store: Merging cloud database data...");
              this.state = {
                ...this.state,
                ...cloudData,
                profile: {
                  ...this.state.profile,
                  ...cloudData.profile,
                  name: user.displayName || user.email.split("@")[0],
                  avatar: user.photoURL || cloudData.profile?.avatar || this.state.profile.avatar
                }
              };
              localStorage.setItem("lf_profile", JSON.stringify(this.state.profile));
              localStorage.setItem("lf_habits", JSON.stringify(this.state.habits));
              localStorage.setItem("lf_tasks", JSON.stringify(this.state.tasks));
              localStorage.setItem("lf_goals", JSON.stringify(this.state.goals));
              localStorage.setItem("lf_events", JSON.stringify(this.state.events));
              localStorage.setItem("lf_journal", JSON.stringify(this.state.journal));
              localStorage.setItem("lf_favorite_quotes", JSON.stringify(this.state.favoriteQuotes));
              
              this.recalculateStreaks();
              this.notify();
            } else {
              window.LifeFlowFirebase.syncData(this.state);
            }
          });
        } else {
          console.log("Store: Auth state changed - Logged Out");
        }
      });
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      this.listeners.forEach(listener => listener(this.state));
    }

    // --- PRODUCTIVITY CALCULATIONS ---
    getTodayDateString() {
      // Use local timezone format YYYY-MM-DD
      const date = new Date();
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset*60*1000));
      return localDate.toISOString().split("T")[0];
    }

    recalculateStreaks() {
      // Habit/Task streak: consecutive days with at least one completed habit or task
      // We look back from today
      const todayStr = this.getTodayDateString();
      const datesLogged = new Set();

      // Collect dates from habits
      this.state.habits.forEach(h => {
        Object.keys(h.completedDates).forEach(date => {
          if (h.completedDates[date] === "done") {
            datesLogged.add(date);
          }
        });
      });

      // Collect dates from tasks
      this.state.tasks.forEach(t => {
        if (t.completedDates) {
          Object.keys(t.completedDates).forEach(d => {
            datesLogged.add(d);
          });
        }
      });

      // Collect dates from journal entries (writing in journal counts as a productive day!)
      Object.keys(this.state.journal).forEach(date => {
        if (this.state.journal[date].reflection || this.state.journal[date].gratitude) {
          datesLogged.add(date);
        }
      });

      let currentStreak = 0;
      let checkDate = new Date(); // Start checking from today
      let todayLogged = datesLogged.has(checkDate.toISOString().split("T")[0]);

      // If nothing today, let's check yesterday to see if the streak is still active
      if (!todayLogged) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const checkDateStr = checkDate.toISOString().split("T")[0];
        if (datesLogged.has(checkDateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break; // Streak broken
        }
      }

      this.state.streak = todayLogged && currentStreak === 0 ? 1 : currentStreak;
      if (this.state.streak > this.state.longestStreak) {
        this.state.longestStreak = this.state.streak;
      }

      // Re-calculate individual habit streaks
      this.state.habits.forEach(h => {
        let hStreak = 0;
        let hMax = h.maxStreak || 0;
        let cDate = new Date();
        let hTodayDone = h.completedDates[cDate.toISOString().split("T")[0]] === "done";
        let hTodaySkipped = h.completedDates[cDate.toISOString().split("T")[0]] === "skip";

        if (!hTodayDone && !hTodaySkipped) {
          cDate.setDate(cDate.getDate() - 1);
        }

        let maxLookback = 365; // Avoid infinite loops
        while (maxLookback > 0) {
          const cDateStr = cDate.toISOString().split("T")[0];
          const status = h.completedDates[cDateStr];
          
          if (status === "done") {
            hStreak++;
            cDate.setDate(cDate.getDate() - 1);
          } else if (status === "skip") {
            // Skips do not break streak, we just go to previous day
            cDate.setDate(cDate.getDate() - 1);
          } else {
            break; // Streak broken
          }
          maxLookback--;
        }

        h.streak = hStreak;
        if (hStreak > hMax) {
          h.maxStreak = hStreak;
        }
      });
    }

    getDailyCompletionPercentage(dateStr = this.getTodayDateString()) {
      const todayHabits = this.state.habits.filter(h => h.frequency === "daily");
      if (todayHabits.length === 0) return 0;
      
      const completedToday = todayHabits.filter(h => h.completedDates[dateStr] === "done");
      const skippedToday = todayHabits.filter(h => h.completedDates[dateStr] === "skip");
      
      const totalEligible = todayHabits.length - skippedToday.length;
      if (totalEligible <= 0) return 100; // All skipped/none

      return Math.round((completedToday.length / totalEligible) * 100);
    }

    getProductivityScore() {
      // Metric combining: Today's habit completion (40%) and Today's task completion (60%)
      const todayStr = this.getTodayDateString();
      const habitCompletion = this.getDailyCompletionPercentage(todayStr);

      const tasksDueToday = this.state.tasks.filter(t => t.dueDate === todayStr);
      let taskCompletion = 100;
      if (tasksDueToday.length > 0) {
        const completedTasks = tasksDueToday.filter(t => t.completed);
        taskCompletion = Math.round((completedTasks.length / tasksDueToday.length) * 100);
      } else {
        // If no tasks due today, check if any task was completed today
        const completedTodayAny = this.state.tasks.filter(t => t.completed && t.completedDate === todayStr);
        if (completedTodayAny.length > 0) {
          taskCompletion = 100;
        } else {
          taskCompletion = 0; // Default to 0 task score if nothing was completed or scheduled
        }
      }

      // Weights: habits 40, tasks 60
      if (tasksDueToday.length === 0 && this.state.tasks.filter(t => t.completed && t.completedDate === todayStr).length === 0) {
        // If zero tasks active today, evaluate entirely on habits
        return habitCompletion;
      }

      return Math.round((habitCompletion * 0.4) + (taskCompletion * 0.6));
    }

    getBadgesEarned() {
      const badges = [];
      const totalTasksCompleted = this.state.tasks.reduce((acc, t) => {
        return acc + (t.completedDates ? Object.keys(t.completedDates).length : 0);
      }, 0);
      const totalHabitsCompleted = this.state.habits.reduce((acc, h) => {
        return acc + Object.values(h.completedDates).filter(val => val === "done").length;
      }, 0);
      const journalCount = Object.values(this.state.journal).filter(j => j.reflection || j.gratitude).length;
      const completedGoals = this.state.goals.filter(g => g.completed || g.progress === 100).length;

      if (totalTasksCompleted > 0 || totalHabitsCompleted > 0) {
        badges.push({ id: "b1", title: "First Step", desc: "Completed your first task or habit", icon: "footprints", color: "sky" });
      }
      if (this.state.longestStreak >= 3) {
        badges.push({ id: "b2", title: "Streak Starter", desc: "Achieved a 3-day streak", icon: "flame", color: "orange" });
      }
      if (this.state.longestStreak >= 7) {
        badges.push({ id: "b3", title: "Unstoppable Force", desc: "Achieved a 7-day streak", icon: "zap", color: "yellow" });
      }
      if (totalHabitsCompleted >= 25) {
        badges.push({ id: "b4", title: "Habit Hero", desc: "Completed 25 habits overall", icon: "award", color: "emerald" });
      }
      if (journalCount >= 3) {
        badges.push({ id: "b5", title: "Mindful Soul", desc: "Logged 3 daily journal entries", icon: "sparkles", color: "purple" });
      }
      if (completedGoals >= 1) {
        badges.push({ id: "b6", title: "Goal Crusher", desc: "Achieved a high-level goal", icon: "trophy", color: "amber" });
      }
      return badges;
    }

    // --- CRUD OPERATIONS ---

    // 1. Profile / Settings
    updateProfile(updatedFields) {
      this.state.profile = { ...this.state.profile, ...updatedFields };
      this.save();
    }

    // 2. Habits
    addHabit(habit) {
      const newHabit = {
        id: "hab_" + Date.now(),
        completedDates: {},
        streak: 0,
        maxStreak: 0,
        ...habit
      };
      this.state.habits.push(newHabit);
      this.save();
    }

    editHabit(id, updatedFields) {
      this.state.habits = this.state.habits.map(h => 
        h.id === id ? { ...h, ...updatedFields } : h
      );
      this.save();
    }

    deleteHabit(id) {
      this.state.habits = this.state.habits.filter(h => h.id !== id);
      this.save();
    }

    toggleHabitStatus(id, dateStr, status = "done") {
      this.state.habits = this.state.habits.map(h => {
        if (h.id === id) {
          const currentStatus = h.completedDates[dateStr];
          let updatedDates = { ...h.completedDates };
          
          if (currentStatus === status) {
            delete updatedDates[dateStr]; // Untoggle
          } else {
            updatedDates[dateStr] = status; // Set to done or skip
          }
          
          return { ...h, completedDates: updatedDates };
        }
        return h;
      });

      this.recalculateStreaks();
      this.save();
    }

    // 3. Tasks
    addTask(task) {
      const newTask = {
        id: "task_" + Date.now(),
        completed: false,
        completedDate: null,
        completedDates: {},
        subtasks: [],
        order: this.state.tasks.length,
        repeat: "daily",
        ...task
      };
      this.state.tasks.push(newTask);
      this.save();
    }

    editTask(id, updatedFields) {
      this.state.tasks = this.state.tasks.map(t => 
        t.id === id ? { ...t, ...updatedFields } : t
      );
      this.save();
    }

    deleteTask(id) {
      this.state.tasks = this.state.tasks.filter(t => t.id !== id);
      this.save();
    }

    toggleTaskCompletion(id) {
      const todayStr = this.getTodayDateString();
      this.state.tasks = this.state.tasks.map(t => {
        if (t.id === id) {
          const completedDates = t.completedDates || {};
          const isCurrentlyDone = !!completedDates[todayStr];
          const nextCompletedDates = { ...completedDates };
          
          if (isCurrentlyDone) {
            delete nextCompletedDates[todayStr];
          } else {
            nextCompletedDates[todayStr] = true;
          }
          
          const nextCompleted = !isCurrentlyDone;
          
          return {
            ...t,
            completedDates: nextCompletedDates,
            completed: nextCompleted,
            completedDate: nextCompleted ? todayStr : null
          };
        }
        return t;
      });
      
      this.recalculateStreaks();
      this.save();
    }

    toggleSubtask(taskId, subtaskId) {
      this.state.tasks = this.state.tasks.map(t => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      });
      this.save();
    }

    addSubtask(taskId, title) {
      const newSub = {
        id: "sub_" + Date.now(),
        title,
        completed: false
      };
      this.state.tasks = this.state.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, subtasks: [...t.subtasks, newSub] };
        }
        return t;
      });
      this.save();
    }

    deleteSubtask(taskId, subtaskId) {
      this.state.tasks = this.state.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, subtasks: t.subtasks.filter(st => st.id !== subtaskId) };
        }
        return t;
      });
      this.save();
    }

    updateTaskOrder(orderedIds) {
      const idMap = {};
      orderedIds.forEach((id, index) => {
        idMap[id] = index;
      });
      this.state.tasks = this.state.tasks.map(t => {
        if (idMap[t.id] !== undefined) {
          return { ...t, order: idMap[t.id] };
        }
        return t;
      });
      this.save();
    }

    // 4. Events
    addEvent(event) {
      const newEvent = {
        id: "evt_" + Date.now(),
        ...event
      };
      this.state.events.push(newEvent);
      this.save();
    }

    editEvent(id, updatedFields) {
      this.state.events = this.state.events.map(e => 
        e.id === id ? { ...e, ...updatedFields } : e
      );
      this.save();
    }

    deleteEvent(id) {
      this.state.events = this.state.events.filter(e => e.id !== id);
      this.save();
    }

    // 5. Goals
    addGoal(goal) {
      const newGoal = {
        id: "goal_" + Date.now(),
        progress: 0,
        completed: false,
        milestones: [],
        ...goal
      };
      this.state.goals.push(newGoal);
      this.save();
    }

    editGoal(id, updatedFields) {
      this.state.goals = this.state.goals.map(g => {
        if (g.id === id) {
          const next = { ...g, ...updatedFields };
          // Auto-calculate completion if progress becomes 100%
          if (next.progress >= 100) next.completed = true;
          return next;
        }
        return g;
      });
      this.save();
    }

    deleteGoal(id) {
      this.state.goals = this.state.goals.filter(g => g.id !== id);
      this.save();
    }

    toggleMilestone(goalId, milestoneId) {
      this.state.goals = this.state.goals.map(g => {
        if (g.id === goalId) {
          const updatedMilestones = g.milestones.map(m => 
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          );
          
          // Re-calculate goal progress automatically based on milestone completion percentage
          const completedCount = updatedMilestones.filter(m => m.completed).length;
          const progress = updatedMilestones.length > 0 
            ? Math.round((completedCount / updatedMilestones.length) * 100)
            : g.progress;

          return { 
            ...g, 
            milestones: updatedMilestones,
            progress,
            completed: progress >= 100
          };
        }
        return g;
      });
      this.save();
    }

    addMilestone(goalId, title) {
      const newMilestone = {
        id: "ms_" + Date.now(),
        title,
        completed: false
      };
      this.state.goals = this.state.goals.map(g => {
        if (g.id === goalId) {
          const updatedMilestones = [...g.milestones, newMilestone];
          const completedCount = updatedMilestones.filter(m => m.completed).length;
          const progress = Math.round((completedCount / updatedMilestones.length) * 100);
          return { 
            ...g, 
            milestones: updatedMilestones, 
            progress,
            completed: progress >= 100 
          };
        }
        return g;
      });
      this.save();
    }

    deleteMilestone(goalId, milestoneId) {
      this.state.goals = this.state.goals.map(g => {
        if (g.id === goalId) {
          const updatedMilestones = g.milestones.filter(m => m.id !== milestoneId);
          let progress = g.progress;
          if (updatedMilestones.length > 0) {
            const completedCount = updatedMilestones.filter(m => m.completed).length;
            progress = Math.round((completedCount / updatedMilestones.length) * 100);
          }
          return {
            ...g,
            milestones: updatedMilestones,
            progress,
            completed: progress >= 100
          };
        }
        return g;
      });
      this.save();
    }

    // 6. Journal
    saveJournalEntry(dateStr, data) {
      this.state.journal[dateStr] = {
        ...this.state.journal[dateStr],
        ...data
      };
      this.recalculateStreaks();
      this.save();
    }

    // 7. Favorite Quotes
    toggleFavoriteQuote(quote) {
      const exists = this.state.favoriteQuotes.some(q => q.text === quote.text);
      if (exists) {
        this.state.favoriteQuotes = this.state.favoriteQuotes.filter(q => q.text !== quote.text);
      } else {
        this.state.favoriteQuotes.push(quote);
      }
      this.save();
    }

    // --- DATA SYNC & EXPORT ---
    exportToCSV(type) {
      let csvContent = "";
      if (type === "tasks") {
        csvContent = "ID,Title,Priority,DueDate,Completed,CompletedDate,Notes\n";
        this.state.tasks.forEach(t => {
          csvContent += `"${t.id}","${t.title.replace(/"/g, '""')}","${t.priority}","${t.dueDate}","${t.completed}","${t.completedDate || ""}","${(t.notes || "").replace(/"/g, '""')}"\n`;
        });
      } else if (type === "habits") {
        csvContent = "ID,Name,Category,Frequency,Streak,MaxStreak,Notes\n";
        this.state.habits.forEach(h => {
          csvContent += `"${h.id}","${h.name.replace(/"/g, '""')}","${h.category}","${h.frequency}",${h.streak},${h.maxStreak},"${(h.notes || "").replace(/"/g, '""')}"\n`;
        });
      } else if (type === "journal") {
        csvContent = "Date,Mood,Gratitude,Reflection,Wins,Challenges\n";
        Object.keys(this.state.journal).forEach(date => {
          const j = this.state.journal[date];
          csvContent += `"${date}","${j.mood || ""}","${(j.gratitude || "").replace(/"/g, '""')}","${(j.reflection || "").replace(/"/g, '""')}","${(j.wins || "").replace(/"/g, '""')}","${(j.challenges || "").replace(/"/g, '""')}"\n`;
        });
      }
      return csvContent;
    }

    backupData() {
      // Returns state object as JSON string for backup download
      return JSON.stringify(this.state, null, 2);
    }

    restoreData(jsonString) {
      try {
        const restored = JSON.parse(jsonString);
        if (restored && typeof restored === "object" && restored.profile && restored.habits) {
          this.state = {
            ...this.state,
            ...restored
          };
          this.save();
          return true;
        }
      } catch (e) {
        console.error("Failed to parse restored data", e);
      }
      return false;
    }
  }

  // Export to global window namespace
  window.LifeFlowStore = new Store();
})();
