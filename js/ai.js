(function() {
  const SUBTASK_DATABASE = {
    "presentation": [
      "Define the core presentation slide structures",
      "Draft presentation bullet points and copy",
      "Design key diagrams or charts for visuals",
      "Run a timed vocal walkthrough of slides",
      "Gather participant feedback questions"
    ],
    "meeting": [
      "Prepare meeting agenda points",
      "Book room or generate online link",
      "Read reference background materials",
      "Document key action items and decisions"
    ],
    "workout": [
      "5-minute dynamic joint warm-up",
      "Main training sequence (cardio/strength)",
      "5-minute static cool-down stretch",
      "Rehydrate with electrolytes and log stats"
    ],
    "study": [
      "Identify the core learning objectives",
      "Review study material and write highlights",
      "Complete 2 active-recall practice questions",
      "Create high-yield summary cheat-sheet"
    ],
    "learn": [
      "Read documentation for 15 minutes",
      "Write a minimal sandbox code example",
      "Debug initial syntax and logical errors",
      "Write a short summary card of the concepts"
    ],
    "write": [
      "Brainstorm a bullet-point outline",
      "Write draft section introduction",
      "Develop main content paragraphs",
      "Edit grammar, flow, and formatting"
    ],
    "clean": [
      "De-clutter physical desk and surface areas",
      "Organize drawers and filing items",
      "Dust surfaces and clean laptop screen",
      "Empty trash bins and vacuum space"
    ],
    "plan": [
      "Brainstorm 3 monthly milestones",
      "Break down milestones into weekly lists",
      "Schedule tasks on the calendar views",
      "Identify potential blockers and buffers"
    ],
    "budget": [
      "Download bank statement logs",
      "Categorize all transactions for the week",
      "Compare actual spend to category caps",
      "Adjust next week's savings goal profile"
    ],
    "code": [
      "Draft architectural flow diagrams",
      "Write unit tests representing success criteria",
      "Implement core code logic functions",
      "Run linting rules and verify build bundle",
      "Refactor and clean redundant declarations"
    ]
  };

  const AI_COACH = {
    // 1. Break tasks down into actionable subtasks
    suggestSubtasks: function(taskTitle) {
      const titleLower = taskTitle.toLowerCase();
      let matchedKey = null;

      // Find keyword match in database
      const keys = Object.keys(SUBTASK_DATABASE);
      for (let i = 0; i < keys.length; i++) {
        if (titleLower.includes(keys[i])) {
          matchedKey = keys[i];
          break;
        }
      }

      if (matchedKey && SUBTASK_DATABASE[matchedKey]) {
        return [...SUBTASK_DATABASE[matchedKey]];
      }

      // Default breakdown if no keywords match
      return [
        "Clearly define the single success outcome",
        "Block 25 minutes of deep focus in calendar",
        "Set up environment (close browser tabs/phone)",
        "Write initial draft or draft skeleton notes",
        "Perform final review and mark complete"
      ];
    },

    // 2. Suggest today's priorities
    suggestTodayPriorities: function(tasks, habits, goals) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayTasks = tasks.filter(t => t.dueDate === todayStr && !t.completed);
      const highPriorityTasks = tasks.filter(t => t.priority === "high" && !t.completed);
      
      const suggestions = [];

      // Priority 1: High priority task or today's task
      if (todayTasks.some(t => t.priority === "high")) {
        const topTask = todayTasks.find(t => t.priority === "high");
        suggestions.push({
          title: `Focus on: ${topTask.title}`,
          desc: "This is scheduled for today and flagged as High Priority. Tackle this first during your peak energy hours.",
          type: "task",
          refId: topTask.id
        });
      } else if (highPriorityTasks.length > 0) {
        suggestions.push({
          title: `Catch up: ${highPriorityTasks[0].title}`,
          desc: "This high-priority task is pending. Completing it will lift a significant mental weight.",
          type: "task",
          refId: highPriorityTasks[0].id
        });
      } else if (todayTasks.length > 0) {
        suggestions.push({
          title: `Tackle: ${todayTasks[0].title}`,
          desc: "Due today. Getting this out of the way early creates momentum for the rest of your list.",
          type: "task",
          refId: todayTasks[0].id
        });
      }

      // Priority 2: Habit consistency check
      const habitsDoneCount = habits.filter(h => h.completedDates[todayStr] === "done").length;
      const totalDailyHabits = habits.filter(h => h.frequency === "daily").length;
      
      if (totalDailyHabits > 0 && habitsDoneCount < totalDailyHabits) {
        const pendingHabit = habits.find(h => h.frequency === "daily" && !h.completedDates[todayStr]);
        if (pendingHabit) {
          suggestions.push({
            title: `Anchor habit: ${pendingHabit.name}`,
            desc: `Keep your streak alive! Completing your habits regularly reinforces your identity as a productive person.`,
            type: "habit",
            refId: pendingHabit.id
          });
        }
      }

      // Priority 3: Align with high-level Goals
      const activeGoals = goals.filter(g => !g.completed);
      if (activeGoals.length > 0) {
        const goal = activeGoals[0];
        const pendingMilestone = goal.milestones.find(m => !m.completed);
        const milestoneText = pendingMilestone ? `"${pendingMilestone.title}"` : "a step";
        
        suggestions.push({
          title: `Advance goal: ${goal.title}`,
          desc: `Invest 15 minutes today working on ${milestoneText}. Small, compounded efforts are how mountains are moved.`,
          type: "goal",
          refId: goal.id
        });
      }

      // Fill in generic advice if suggestions are empty
      if (suggestions.length === 0) {
        suggestions.push({
          title: "Optimize your environment",
          desc: "All scheduled tasks and habits are completed! Use this time to declutter your space, read a book, or plan tomorrow's highlights.",
          type: "tip"
        });
      }

      return suggestions;
    },

    // 3. Suggest habit improvements based on completion history
    recommendHabitImprovements: function(habits) {
      const recommendations = [];
      const today = new Date();

      habits.forEach(h => {
        // Calculate completion rate over the last 7 days
        let completedDays = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dStr = d.toISOString().split("T")[0];
          if (h.completedDates[dStr] === "done") {
            completedDays++;
          }
        }
        
        const rate = Math.round((completedDays / 7) * 100);

        if (rate < 50) {
          let tip = "";
          if (h.name.toLowerCase().includes("water")) {
            tip = "Place a premium reusable water bottle directly on your desk every morning. Visual cues trigger action.";
          } else if (h.name.toLowerCase().includes("exercise") || h.name.toLowerCase().includes("workout")) {
            tip = "Scale down the effort. Tell yourself you will work out for just 5 minutes. Getting started is the hardest barrier.";
          } else if (h.name.toLowerCase().includes("read")) {
            tip = "Leave your book open on your pillow when you make the bed in the morning, making it the easiest choice before sleep.";
          } else {
            tip = "Establish a pre-habit routine. Link this habit immediately after a solid morning routine (like brushing teeth).";
          }

          recommendations.push({
            habitId: h.id,
            name: h.name,
            rate: rate,
            tip: tip
          });
        }
      });

      // Default recommendation if everyone is doing great!
      if (recommendations.length === 0) {
        recommendations.push({
          habitId: null,
          name: "All Habits",
          rate: 100,
          tip: "Fantastic consistency! To level up, consider increasing the intensity slightly (e.g. read 15 pages instead of 10)."
        });
      }

      return recommendations;
    },

    // 4. Generate coaching motivation
    generateMotivationalMessage: function(mood, streak) {
      let greeting = "Keep moving forward.";
      
      switch (mood) {
        case "😊":
        case "😄":
          greeting = "You're in a great state of mind today! Capitalize on this positive energy to tackle your most intellectually challenging tasks.";
          break;
        case "😐":
          greeting = "A calm, neutral mind is perfect for routine maintenance and organization. Power through administrative logs and clear clutter.";
          break;
        case "😔":
        case "😢":
          greeting = "It is completely okay to have low-energy days. Don't force yourself. Scale your tasks down, do a 5-minute stretch, and congratulate yourself for showing up.";
          break;
        case "😡":
          greeting = "Channel that intense energy into physical exercise or focused deep work. Channeling friction is an excellent productivity lever.";
          break;
        default:
          greeting = "Every day is an opportunity to structure your space, build habits, and move closer to your long-term milestones.";
      }

      if (streak > 2) {
        greeting += ` You are on a solid ${streak}-day productivity streak! Protect the streak today, even if you only complete a single small task.`;
      }

      return greeting;
    },

    // 5. Generate Weekly Productivity Summary
    summarizeWeeklyProductivity: function(tasks, habits) {
      const today = new Date();
      let completedTasksCount = 0;
      let completedHabitsCount = 0;
      const dailyCompletions = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dStr = d.toISOString().split("T")[0];

        // Count tasks completed on this day
        const dayTasks = tasks.filter(t => t.completed && t.completedDate === dStr).length;
        completedTasksCount += dayTasks;

        // Count habits completed on this day
        let dayHabits = 0;
        habits.forEach(h => {
          if (h.completedDates[dStr] === "done") dayHabits++;
        });
        completedHabitsCount += dayHabits;

        dailyCompletions.unshift({
          date: d.toLocaleDateString("en-US", { weekday: "short" }),
          tasks: dayTasks,
          habits: dayHabits,
          score: dayTasks * 10 + dayHabits * 5
        });
      }

      // Find the most productive day
      let bestDay = dailyCompletions[0];
      dailyCompletions.forEach(c => {
        if (c.score > bestDay.score) bestDay = c;
      });

      const totalItems = completedTasksCount + completedHabitsCount;
      let insight = "";
      if (totalItems > 15) {
        insight = "Excellent output! Your momentum is strong. Be sure to schedule active rest days to avoid burnout.";
      } else if (totalItems > 5) {
        insight = "Good, steady progress. Focus on building consistency by ensuring habits are logged at the exact same hour every day.";
      } else {
        insight = "Start small. Pick just 1 habit and 1 task tomorrow. Focus on the simple act of checking them off to build routine.";
      }

      return {
        completedTasks: completedTasksCount,
        completedHabits: completedHabitsCount,
        mostProductiveDay: bestDay ? bestDay.date : "N/A",
        insight: insight,
        dailyData: dailyCompletions
      };
    }
  };

  // Export to global window namespace
  window.LifeFlowAI = AI_COACH;
})();
