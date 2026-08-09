// ========== 任务系统 ==========
const QuestSystem = {
  quests: {},

  init() {
    this.quests = {};
    this._initQuests();
  },

  _initQuests() {
    // 主线任务1
    this.quests.main_1 = {
      id: 'main_1',
      name: '清除荒原虫群',
      type: 'main',
      desc: '荒原北部的虫群威胁着基地的补给线。清除荒原区域的3只虫子。',
      objective: { type: 'kill', target: 'bug', count: 3 },
      progress: 0,
      reward: { gold: 200, items: [{ id: 'repair_kit_medium', count: 2 }] },
      status: 'available', // available / active / completed
      completedText: '荒原北部的虫群已被清除，补给线恢复安全。',
    };

    // 主线任务2
    this.quests.main_2 = {
      id: 'main_2',
      name: '调查结晶峡谷',
      type: 'main',
      desc: '结晶峡谷检测到异常能量读数。探索并清除该区域的敌人。',
      objective: { type: 'clear', target: 'crystal_valley', count: 1 },
      progress: 0,
      reward: { gold: 500, items: [{ id: 'auto_cannon_mk1', count: 1 }] },
      status: 'locked',
      prerequisite: 'main_1',
      completedText: '结晶峡谷的能量异常已消除，通讯恢复。',
    };

    // 主线任务3（Boss任务）
    this.quests.main_3 = {
      id: 'main_3',
      name: '摧毁虫巢',
      type: 'main',
      desc: '矿石大厅深处检测到巨型虫群信号。前往摧毁虫巢之主。',
      objective: { type: 'boss', target: 'giant_guardian', count: 1 },
      progress: 0,
      reward: { gold: 1000, items: [{ id: 'particle_cannon', count: 1 }] },
      status: 'locked',
      prerequisite: 'main_2',
      completedText: '巨型守卫虫已被摧毁，虫巢崩解。基地获得宝贵的喘息时间。',
    };

    // 支线任务：收集材料
    this.quests.side_collect = {
      id: 'side_collect',
      name: '收集虫壳碎片',
      type: 'side',
      desc: '研究室需要虫壳碎片进行研究。交付5个虫壳碎片。',
      objective: { type: 'collect', target: 'chitin_fragment', count: 5 },
      progress: 0,
      reward: { gold: 100, items: [] },
      status: 'available',
      repeatable: true,
      completedText: '材料已交付，基地研究进度推进。',
    };

    // 支线任务：收集机械零件
    this.quests.side_mech_parts = {
      id: 'side_mech_parts',
      name: '回收机械零件',
      type: 'side',
      desc: '工程部需要机械零件进行维护。交付3个机械零件。',
      objective: { type: 'collect', target: 'mech_parts', count: 3 },
      progress: 0,
      reward: { gold: 150, items: [] },
      status: 'available',
      repeatable: true,
      completedText: '机械零件已交付，工程部感谢你的协助。',
    };
  },

  showQuests() {
    Msg.divider();
    Msg.add('📜 任务面板', 'info');

    const mainQuests = Object.values(this.quests).filter(q => q.type === 'main');
    const sideQuests = Object.values(this.quests).filter(q => q.type === 'side');

    // 主线任务
    if (mainQuests.length > 0) {
      Msg.add('── 主线任务 ──', 'info');
      for (const q of mainQuests) {
        const statusIcon = this._getStatusIcon(q.status);
        const statusText = this._getStatusText(q.status);
        Msg.info(`  ${statusIcon} ${q.name} [${statusText}]`);
        if (q.status !== 'locked') {
          Msg.info(`    ${q.desc}`);
          if (q.status === 'active') {
            const pct = this._getProgressPct(q);
            Msg.info(`    进度: ${q.progress}/${q.objective.count} (${pct}%)`);
          }
          if (q.status === 'completed') {
            Msg.info(`    奖励: ${q.reward.gold}G ${q.reward.items.map(i => `${i.id} x${i.count}`).join(', ')}`);
          }
        }
      }
    }

    // 支线任务
    if (sideQuests.length > 0) {
      Msg.add('── 支线任务 ──', 'info');
      for (const q of sideQuests) {
        const statusIcon = this._getStatusIcon(q.status);
        const repeatableTag = q.repeatable ? ' [可重复]' : '';
        Msg.info(`  ${statusIcon} ${q.name}${repeatableTag} [${this._getStatusText(q.status)}]`);
        if (q.status === 'active') {
          Msg.info(`    进度: ${q.progress}/${q.objective.count}`);
        }
      }
    }

    Msg.system('提示: 任务进度自动追踪。可重复任务完成后自动重置。');
  },

  // 接受任务
  acceptQuest(questId) {
    const q = this.quests[questId];
    if (!q) return false;
    if (q.status !== 'available') return false;
    q.status = 'active';
    q.progress = 0;
    Msg.success(`📜 接取任务: ${q.name}`);
    Msg.info(`  ${q.desc}`);
    return true;
  },

  // 更新任务进度
  updateProgress(eventType, target) {
    for (const q of Object.values(this.quests)) {
      if (q.status !== 'active') {
        // 自动接取可用的主线任务
        if (q.status === 'available' && q.type === 'main') {
          q.status = 'active';
          q.progress = 0;
        } else {
          continue;
        }
      }
      if (q.status !== 'active') continue;

      if (q.objective.type === 'kill' && eventType === 'kill') {
        if (q.objective.target === 'bug' && target && target.category === 'bug') {
          q.progress++;
        }
      } else if (q.objective.type === 'collect' && eventType === 'collect') {
        if (q.objective.target === target) {
          q.progress++;
        }
      }

      // 检查完成
      if (q.progress >= q.objective.count) {
        this._completeQuest(q);
      }
    }
  },

  // 完成Boss击杀
  onBossKilled(bossId) {
    for (const q of Object.values(this.quests)) {
      if (q.status !== 'active') continue;
      if (q.objective.type === 'boss' && q.objective.target === bossId) {
        q.progress = q.objective.count;
        this._completeQuest(q);
      }
    }
  },

  _completeQuest(q) {
    q.status = 'completed';
    Msg.divider();
    Msg.success(`🎉 任务完成: ${q.name}`);
    if (q.completedText) Msg.story(q.completedText);

    // 发放奖励
    Player.gold += q.reward.gold;
    Msg.success(`💰 获得 ${q.reward.gold}G`);
    for (const item of q.reward.items) {
      Player.addItem(item.id, item.count);
      const itemDef = ItemDB.get(item.id);
      Msg.success(`📦 获得 ${itemDef ? itemDef.name : item.id} x${item.count}`);
    }

    // 解锁后续任务
    if (q.type === 'main') {
      for (const other of Object.values(this.quests)) {
        if (other.prerequisite === q.id && other.status === 'locked') {
          other.status = 'available';
          Msg.system(`📜 新任务可用: ${other.name}`);
        }
      }
    }

    // 可重复任务重置
    if (q.repeatable) {
      setTimeout(() => {
        q.status = 'available';
        q.progress = 0;
      }, 1000);
    }
  },

  _getStatusIcon(status) {
    const icons = { locked: '🔒', available: '📋', active: '▶', completed: '✅' };
    return icons[status] || '❓';
  },

  _getStatusText(status) {
    const texts = { locked: '未解锁', available: '可接取', active: '进行中', completed: '已完成' };
    return texts[status] || '未知';
  },

  _getProgressPct(q) {
    if (q.objective.count <= 0) return 0;
    return Math.min(100, (q.progress / q.objective.count * 100).toFixed(0));
  },

  // 序列化
  getState() {
    return JSON.parse(JSON.stringify(this.quests));
  },

  // 恢复状态
  applyState(state) {
    if (!state) return;
    this.quests = state;
  },
};