// ========== 配额系统 ==========
const QuotaSystem = {
  quotas: {
    '20mm_ap': { daily: 30, used: 0 },
    'railgun_slug': { daily: 20, used: 0 },
    'missile_he': { daily: 5, used: 0 },
    'repair_kit_small': { daily: 5, used: 0 },
    'repair_kit_medium': { daily: 3, used: 0 },
    'armor_patch': { daily: 3, used: 0 }
  },
  lastResetDay: 0,
  
  init() {
    this.quotas = {
      '20mm_ap': { daily: 30, used: 0 },
      'railgun_slug': { daily: 20, used: 0 },
      'missile_he': { daily: 5, used: 0 },
      'repair_kit_small': { daily: 5, used: 0 },
      'repair_kit_medium': { daily: 3, used: 0 },
      'armor_patch': { daily: 3, used: 0 }
    };
    this.lastResetDay = 0;
  },
  
  // 根据游戏时间检查和重置每日配额
  checkReset() {
    const currentDay = Math.floor((Timeline.time || 0) / 86400);
    if (currentDay > this.lastResetDay) {
      for (const key of Object.keys(this.quotas)) {
        this.quotas[key].used = 0;
      }
      this.lastResetDay = currentDay;
      Msg.info('📋 每日配额已重置。');
    }
  },
  
  getRemaining(itemId) {
    const quota = this.quotas[itemId];
    if (!quota) return -1; // 非配额物品
    return quota.daily - quota.used;
  },
  
  replenish(itemName) {
    this.checkReset();
    
    const room = MapSystem.getRoom(Player.room);
    if (!room || room.id !== 'outpost_repair') {
      Msg.warning('配额补给仅在维修站可用。');
      return;
    }
    
    if (!itemName) {
      // 显示所有配额状态
      Msg.divider();
      Msg.add('📋 基础配额补给', 'info');
      for (const [itemId, quota] of Object.entries(this.quotas)) {
        const item = (typeof ItemDB !== 'undefined' ? ItemDB.get(itemId) : null) || (typeof AmmoDB !== 'undefined' ? AmmoDB.get(itemId) : null);
        const name = item ? item.name : itemId;
        const remaining = quota.daily - quota.used;
        Msg.info(`  ${name}: ${remaining}/${quota.daily} (剩余/每日)`);
      }
      Msg.system('提示: replenish <物资名称> 领取配额补给');
      return;
    }
    
    // 按名称查找物品
    let itemId = null;
    const lower = itemName.toLowerCase();
    for (const [id, quota] of Object.entries(this.quotas)) {
      const item = (typeof ItemDB !== 'undefined' ? ItemDB.get(id) : null) || (typeof AmmoDB !== 'undefined' ? AmmoDB.get(id) : null);
      if (item && (item.name.toLowerCase().includes(lower) || id === lower)) {
        itemId = id;
        break;
      }
    }
    
    if (!itemId) {
      Msg.error('该物资不在配额列表中。');
      return;
    }
    
    const remaining = this.getRemaining(itemId);
    if (remaining <= 0) {
      Msg.warning(`今日 ${itemName} 配额已用完，超出部分需在交易中心购买。`);
      return;
    }
    
    const item = (typeof ItemDB !== 'undefined' ? ItemDB.get(itemId) : null) || (typeof AmmoDB !== 'undefined' ? AmmoDB.get(itemId) : null);
    
    if (item && item.type === 'ammo') {
      // 加入弹药池
      Player.ammo[itemId] = (Player.ammo[itemId] || 0) + remaining;
      Msg.success(`📋 领取了 ${item.name} x${remaining}（配额补给），已加入弹药池。`);
    } else {
      // 加入背包
      Player.addItem(itemId, remaining);
      Msg.success(`📋 领取了 ${item ? item.name : itemId} x${remaining}（配额补给），已放入背包。`);
    }
    
    this.quotas[itemId].used += remaining;
  },
  
  getState() {
    return { quotas: this.quotas, lastResetDay: this.lastResetDay };
  },
  
  loadState(state) {
    if (state) {
      this.quotas = state.quotas || this.quotas;
      this.lastResetDay = state.lastResetDay || 0;
    }
  }
};