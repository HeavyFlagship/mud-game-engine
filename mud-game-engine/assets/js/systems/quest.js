// ========== 任务系统 ==========
const QuestSystem = {
  activeQuests: {},    // { questId: { progress, completed } }
  completedQuests: [], // list of completed quest IDs

  init() {
    this.activeQuests = {};
    this.completedQuests = [];
  },

  // Accept a quest
  acceptQuest(questId) {
    const quest = QuestDB[questId];
    if (!quest) return { ok: false, reason: '任务不存在。' };
    if (this.activeQuests[questId]) return { ok: false, reason: '已接取该任务。' };
    if (this.completedQuests.includes(questId) && !quest.repeatable) {
      return { ok: false, reason: '该任务已完成。' };
    }

    // Check prerequisites
    if (quest.prerequisites) {
      for (const prereq of quest.prerequisites) {
        if (!this.completedQuests.includes(prereq)) {
          return { ok: false, reason: '前置任务未完成，无法接取。' };
        }
      }
    }

    this.activeQuests[questId] = {
      questId,
      progress: { ...quest.objectives.reduce((acc, obj) => { acc[obj.id] = 0; return acc; }, {}) },
      completed: false
    };

    return { ok: true, quest };
  },

  // Update progress for a quest objective
  updateProgress(questId, objectiveId, amount = 1) {
    const active = this.activeQuests[questId];
    if (!active || active.completed) return;

    const quest = QuestDB[questId];
    const obj = quest.objectives.find(o => o.id === objectiveId);
    if (!obj) return;

    active.progress[objectiveId] = Math.min(obj.target, (active.progress[objectiveId] || 0) + amount);

    // Check if all objectives are complete
    const allComplete = quest.objectives.every(o => active.progress[o.id] >= o.target);
    if (allComplete) {
      active.completed = true;
      Msg.info(`✅ 任务 "${quest.name}" 目标已达成！返回基地交付任务。`);
    }
  },

  // Complete and deliver a quest
  completeQuest(questId) {
    const active = this.activeQuests[questId];
    if (!active) return { ok: false, reason: '未接取该任务。' };
    if (!active.completed) return { ok: false, reason: '任务目标尚未达成。' };

    const quest = QuestDB[questId];

    // Grant rewards
    if (quest.rewards) {
      if (quest.rewards.credits) Player.credits += quest.rewards.credits;
      if (quest.rewards.exp) Player.gainExp(quest.rewards.exp);
      if (quest.rewards.items) {
        for (const item of quest.rewards.items) {
          Player.addItem(item.id, item.count || 1);
        }
      }
    }

    // Mark as completed
    this.completedQuests.push(questId);
    delete this.activeQuests[questId];

    // If repeatable, re-add to active
    if (quest.repeatable) {
      this.acceptQuest(questId);
    }

    return { ok: true, quest };
  },

  // Get quest list for display
  getQuestList() {
    const active = Object.values(this.activeQuests).map(a => {
      const quest = QuestDB[a.questId];
      return { ...quest, progress: a.progress, completed: a.completed };
    });
    return active;
  },

  // Get state for save/load
  getState() {
    return {
      activeQuests: this.activeQuests,
      completedQuests: this.completedQuests
    };
  },

  loadState(state) {
    this.activeQuests = state.activeQuests || {};
    this.completedQuests = state.completedQuests || [];
  }
};