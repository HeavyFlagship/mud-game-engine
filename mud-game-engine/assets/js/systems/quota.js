// ========== 配额制系统 ==========
// 对应设计文档：经济系统设计书 §5
const QuotaSystem = {
  // 配额物资定义
  quotas: {
    '20mm_ap': { itemId: '20mm_ap', name: '20mm穿甲弹', dailyLimit: 30, remaining: 30 },
    railgun_slug: { itemId: 'railgun_slug', name: '轨道弹', dailyLimit: 20, remaining: 20 },
    ion_charge: { itemId: 'ion_charge', name: '离子电荷', dailyLimit: 20, remaining: 20 },
    missile_he: { itemId: 'missile_he', name: '高爆导弹', dailyLimit: 10, remaining: 10 },
    repair_kit_small: { itemId: 'repair_kit_small', name: '小型修复包', dailyLimit: 5, remaining: 5 },
    repair_kit_medium: { itemId: 'repair_kit_medium', name: '中型修复包', dailyLimit: 3, remaining: 3 },
    armor_patch: { itemId: 'armor_patch', name: '装甲补片', dailyLimit: 3, remaining: 3 },
  },

  lastResetDay: 0,

  init() {
    this.lastResetDay = new Date().getDate();
    for (const key of Object.keys(this.quotas)) {
      this.quotas[key].remaining = this.quotas[key].dailyLimit;
    }
  },

  // 每日重置配额
  _checkDailyReset() {
    const today = new Date().getDate();
    if (today !== this.lastResetDay) {
      this.lastResetDay = today;
      for (const key of Object.keys(this.quotas)) {
        this.quotas[key].remaining = this.quotas[key].dailyLimit;
      }
      Msg.system('📋 每日配额已重置。');
    }
  },

  // 补给指令
  replenish(args) {
    this._checkDailyReset();

    if (!args || args.length === 0) {
      this._showQuota();
      return;
    }

    const itemName = args.join(' ');
    const quota = this._findQuota(itemName);
    if (!quota) {
      Msg.info(`该物资不在配额补给范围内。`);
      this._showQuota();
      return;
    }

    if (quota.remaining <= 0) {
      Msg.warning(`${quota.name} 今日配额已用完。请在交易中心购买。`);
      return;
    }

    // 补给1单位
    const count = Math.min(1, quota.remaining);
    quota.remaining -= count;
    Player.addItem(quota.itemId, count);

    const item = (typeof AmmoDB !== 'undefined' && AmmoDB.get(quota.itemId)) ||
                (typeof ItemDB !== 'undefined' && ItemDB.get(quota.itemId));
    const displayName = item ? item.name : quota.name;
    Msg.success(`📋 配额补给: 获得 ${count} 个${displayName}。`);
    Msg.info(`  今日剩余配额: ${quota.remaining}/${quota.dailyLimit}`);
  },

  _showQuota() {
    this._checkDailyReset();

    Msg.divider();
    Msg.add('📋 基础配额补给', 'info');
    Msg.info('每日免费配额，在基地维修站使用 replenish <物资名称> 领取。');

    for (const [id, quota] of Object.entries(this.quotas)) {
      const pct = (quota.remaining / quota.dailyLimit * 100).toFixed(0);
      const status = quota.remaining > 0 ? `剩余 ${quota.remaining}/${quota.dailyLimit}` : '已用完';
      Msg.info(`  ${quota.name}: ${status} (${pct}%)`);
    }

    Msg.system('提示: replenish <物资名称> 领取补给，超出配额部分需在交易中心购买。');
  },

  _findQuota(itemName) {
    const lower = itemName.toLowerCase();
    for (const [id, quota] of Object.entries(this.quotas)) {
      if (id === itemName || quota.name.includes(itemName) || quota.name === itemName) {
        return quota;
      }
    }
    return null;
  },

  // 序列化
  getState() {
    return {
      quotas: JSON.parse(JSON.stringify(this.quotas)),
      lastResetDay: this.lastResetDay,
    };
  },

  // 恢复状态
  applyState(state) {
    if (!state) return;
    this.quotas = state.quotas || this.quotas;
    this.lastResetDay = state.lastResetDay || 0;
  },
};