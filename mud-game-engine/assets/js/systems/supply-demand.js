// ========== 供需系统 ==========
const SupplyDemand = {
  records: {},
  
  init() {
    this.records = {};
    // 初始化所有可交易物资的供需记录
    const items = [
      { id: 'iron_ore', name: '铁矿石', category: 'mineral', safetyLine: 400, warningLine: 200, initReserve: 500 },
      { id: 'iron_ingot', name: '铁锭', category: 'industrial', safetyLine: 200, warningLine: 100, initReserve: 0 },
      { id: 'steel_ingot', name: '钢锭', category: 'industrial', safetyLine: 100, warningLine: 50, initReserve: 0 },
      { id: 'armor_plate', name: '装甲板', category: 'equipment', safetyLine: 50, warningLine: 20, initReserve: 0 },
      { id: 'copper_ore', name: '铜矿石', category: 'mineral', safetyLine: 300, warningLine: 150, initReserve: 400 },
      { id: 'gunpowder', name: '火药', category: 'material', safetyLine: 200, warningLine: 100, initReserve: 300 },
      { id: 'propellant', name: '推进剂', category: 'material', safetyLine: 150, warningLine: 75, initReserve: 200 },
      { id: 'shell_casing', name: '弹壳', category: 'material', safetyLine: 500, warningLine: 250, initReserve: 600 },
      { id: 'chitin_fragment', name: '虫壳碎片', category: 'material', safetyLine: 300, warningLine: 150, initReserve: 100 },
      { id: 'mech_parts', name: '机械零件', category: 'material', safetyLine: 200, warningLine: 100, initReserve: 100 },
      { id: 'alloy_fragment', name: '合金碎片', category: 'material', safetyLine: 100, warningLine: 50, initReserve: 50 },
      { id: 'germanite_shard', name: '辉锗矿碎片', category: 'mineral', safetyLine: 50, warningLine: 25, initReserve: 30 },
    ];
    
    for (const item of items) {
      this.records[item.id] = {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        dailySupply: 0,
        dailyDemand: 0,
        currentReserve: item.initReserve,
        safetyLine: item.safetyLine,
        warningLine: item.warningLine,
        status: this.getStatus(item.initReserve, item.safetyLine, item.warningLine),
        isEmergency: false,
        isUnlocked: item.id === 'iron_ore' || item.id === 'copper_ore' || item.id === 'gunpowder' || item.id === 'propellant' || item.id === 'shell_casing'
      };
    }
  },
  
  getStatus(reserve, safetyLine, warningLine) {
    if (reserve >= safetyLine) return 'sufficient';
    if (reserve >= warningLine) return 'tight';
    if (reserve > 0) return 'shortage';
    return 'outage';
  },
  
  getStatusText(status) {
    const map = {
      sufficient: '供应充足',
      tight: '供需平衡偏紧',
      shortage: '供应短缺',
      outage: '断供'
    };
    return map[status] || status;
  },
  
  onProduction(itemId, amount) {
    const record = this.records[itemId];
    if (!record || !record.isUnlocked) return;
    record.currentReserve += amount;
    record.dailySupply += amount;
    this.updateStatus(itemId);
  },
  
  onConsumption(itemId, amount) {
    const record = this.records[itemId];
    if (!record || !record.isUnlocked) return;
    record.currentReserve = Math.max(0, record.currentReserve - amount);
    record.dailyDemand += amount;
    this.updateStatus(itemId);
  },
  
  onNodeUnlocked(itemId) {
    if (this.records[itemId]) {
      this.records[itemId].isUnlocked = true;
    } else {
      // 创建新记录
      const item = typeof ItemDB !== 'undefined' ? (ItemDB.get(itemId) || (typeof MaterialDB !== 'undefined' ? MaterialDB.get(itemId) : null)) : null;
      if (item) {
        this.records[itemId] = {
          itemId,
          itemName: item.name,
          category: item.type || 'material',
          dailySupply: 0,
          dailyDemand: 0,
          currentReserve: 0,
          safetyLine: 100,
          warningLine: 50,
          status: 'outage',
          isEmergency: false,
          isUnlocked: true
        };
      }
    }
  },
  
  updateStatus(itemId) {
    const record = this.records[itemId];
    if (!record) return;
    const oldStatus = record.status;
    record.status = this.getStatus(record.currentReserve, record.safetyLine, record.warningLine);
    
    // 储备下降时生成收购订单
    if (record.status === 'shortage' && oldStatus !== 'shortage') {
      record.isEmergency = true;
      Msg.info(`⚠ 紧急：${record.itemName} 供应短缺！收购价大幅上浮。`);
    }
    if (record.status === 'sufficient' && record.isEmergency) {
      record.isEmergency = false;
      Msg.info(`✅ ${record.itemName} 供应已恢复正常。`);
    }
  },
  
  getDemandOrders() {
    const orders = [];
    for (const [id, record] of Object.entries(this.records)) {
      if (!record.isUnlocked) continue;
      if (record.status === 'shortage' || record.status === 'outage') {
        const basePrice = ((typeof ItemDB !== 'undefined' ? ItemDB.get(id) : null) || (typeof MaterialDB !== 'undefined' ? MaterialDB.get(id) : null))?.price || 10;
        const priceMultiplier = record.isEmergency ? 2.0 : 1.5;
        orders.push({
          orderId: `demand_${id}`,
          type: 'demand',
          source: 'organization',
          sourceName: '赤穹中枢',
          itemId: id,
          itemName: record.itemName,
          quantity: record.safetyLine - record.currentReserve,
          unitPrice: Math.floor(basePrice * priceMultiplier),
          basePrice,
          priority: record.isEmergency ? 'urgent' : 'priority',
          advancesDevelopment: true
        });
      }
    }
    return orders;
  },
  
  getSupplyOrders() {
    const orders = [];
    for (const [id, record] of Object.entries(this.records)) {
      if (!record.isUnlocked) continue;
      if (record.currentReserve > 0) {
        const basePrice = ((typeof ItemDB !== 'undefined' ? ItemDB.get(id) : null) || (typeof MaterialDB !== 'undefined' ? MaterialDB.get(id) : null))?.price || 10;
        let priceMultiplier = 1.0;
        let purchaseLimit = null;
        
        if (record.status === 'shortage') {
          priceMultiplier = 1.5;
          purchaseLimit = Math.floor(record.currentReserve * 0.3);
        }
        
        orders.push({
          orderId: `supply_${id}`,
          type: 'supply',
          source: 'organization',
          sourceName: '赤穹中枢',
          itemId: id,
          itemName: record.itemName,
          unitPrice: Math.floor(basePrice * priceMultiplier),
          basePrice,
          purchaseLimit,
          advancesDevelopment: false
        });
      }
    }
    return orders;
  },
  
  // 玩家出售给组织
  playerSell(itemId, count) {
    const record = this.records[itemId];
    if (!record || !record.isUnlocked) {
      return { ok: false, reason: '该物资暂未开放交易。' };
    }
    
    const item = (typeof ItemDB !== 'undefined' ? ItemDB.get(itemId) : null) || (typeof MaterialDB !== 'undefined' ? MaterialDB.get(itemId) : null);
    if (!item) return { ok: false, reason: '物品数据不存在。' };
    
    const basePrice = item.price || 10;
    let priceMultiplier = 1.0;
    
    if (record.status === 'shortage') priceMultiplier = 1.5;
    if (record.isEmergency) priceMultiplier = 2.0;
    
    const unitPrice = Math.floor(basePrice * priceMultiplier);
    const totalPrice = unitPrice * count;
    
    // 从玩家背包移除
    Player.removeItem(itemId, count);
    
    // 加入储备
    record.currentReserve += count;
    record.dailySupply += count;
    this.updateStatus(itemId);
    
    // 增加信用点
    Player.credits += totalPrice;
    
    return { ok: true, unitPrice, totalPrice, itemName: item.name };
  },
  
  // 玩家从组织购买
  playerBuy(itemId, count) {
    const record = this.records[itemId];
    if (!record || !record.isUnlocked) {
      return { ok: false, reason: '该物资暂未开放交易。' };
    }
    
    const item = (typeof ItemDB !== 'undefined' ? ItemDB.get(itemId) : null) || (typeof MaterialDB !== 'undefined' ? MaterialDB.get(itemId) : null);
    if (!item) return { ok: false, reason: '物品数据不存在。' };
    
    const basePrice = item.price || 10;
    let priceMultiplier = 1.0;
    
    if (record.status === 'shortage') priceMultiplier = 1.5;
    if (record.status === 'tight') priceMultiplier = 1.2;
    
    const unitPrice = Math.floor(basePrice * priceMultiplier);
    const totalPrice = unitPrice * count;
    
    if (Player.credits < totalPrice) {
      return { ok: false, reason: `信用点不足，需要 ${totalPrice}，当前 ${Player.credits}。` };
    }
    
    if (record.currentReserve < count) {
      return { ok: false, reason: `组织储备不足，当前仅 ${Math.floor(record.currentReserve)} 单位。` };
    }
    
    // 扣除信用点
    Player.credits -= totalPrice;
    
    // 扣除储备
    record.currentReserve -= count;
    record.dailyDemand += count;
    this.updateStatus(itemId);
    
    // 加入玩家背包
    Player.addItem(itemId, count);
    
    return { ok: true, unitPrice, totalPrice, itemName: item.name };
  },
  
  getState() {
    return { records: this.records };
  },
  
  loadState(state) {
    if (state && state.records) {
      this.records = state.records;
    }
  }
};