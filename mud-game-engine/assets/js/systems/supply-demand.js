// ========== 供需子系统 ==========
// 对应设计文档：经济系统设计书 §2.2
const SupplyDemand = {
  // 物资供需记录
  records: {},

  init() {
    this.records = {};
    this._initDefaultRecords();
  },

  _initDefaultRecords() {
    // 基础物资（初始即存在）
    this._ensureRecord('iron_ore', '铁矿石', 'mineral', 500, 400, 200);
    this._ensureRecord('copper_ore', '铜矿石', 'mineral', 300, 250, 100);
    this._ensureRecord('gunpowder', '火药', 'crafting', 200, 150, 80);
    this._ensureRecord('propellant', '推进剂', 'crafting', 150, 120, 60);
    this._ensureRecord('shell_casing', '弹壳', 'crafting', 300, 250, 120);
    this._ensureRecord('chitin_fragment', '虫壳碎片', 'material', 200, 150, 80);
    this._ensureRecord('mech_parts', '机械零件', 'material', 150, 120, 60);
    this._ensureRecord('alloy_fragment', '合金碎片', 'material', 100, 80, 40);
    this._ensureRecord('repair_kit_small', '小型修复包', 'consumable', 100, 80, 40);
    this._ensureRecord('armor_patch', '装甲补片', 'consumable', 80, 60, 30);

    // 弹药（初始可用）
    this._ensureRecord('20mm_ap', '20mm穿甲弹', 'ammo', 500, 400, 200);
    this._ensureRecord('railgun_slug', '轨道弹', 'ammo', 200, 150, 80);
    this._ensureRecord('ion_charge', '离子电荷', 'ammo', 150, 120, 60);
    this._ensureRecord('missile_he', '高爆导弹', 'ammo', 100, 80, 40);
  },

  _ensureRecord(itemId, name, category, initialReserve, safetyLine, warningLine) {
    if (!this.records[itemId]) {
      this.records[itemId] = {
        itemId, itemName: name, category,
        dailySupply: initialReserve * 0.2,
        supplyBreakdown: { facilityOutput: 0, logistics: 0, npcCollection: Math.floor(initialReserve * 0.1), playerDeliveryAvg: 0 },
        dailyDemand: initialReserve * 0.15,
        demandBreakdown: { quotaConsumption: Math.floor(initialReserve * 0.02), constructionPlan: 0, developmentSpecial: 0, npcConsumption: Math.floor(initialReserve * 0.08), strategicReserve: Math.floor(initialReserve * 0.05) },
        currentReserve: initialReserve,
        safetyLine, warningLine,
        status: 'sufficient',
        isEmergency: false,
      };
    }
    return this.records[itemId];
  },

  getRecord(itemId) {
    return this.records[itemId] || null;
  },

  // 更新供需状态
  updateStatus(itemId) {
    const rec = this.records[itemId];
    if (!rec) return;

    if (rec.currentReserve >= rec.safetyLine) {
      rec.status = 'sufficient';
      rec.isEmergency = false;
    } else if (rec.currentReserve >= rec.warningLine) {
      rec.status = 'tight';
      rec.isEmergency = false;
    } else if (rec.currentReserve > 0) {
      rec.status = 'shortage';
      rec.isEmergency = true;
    } else {
      rec.status = 'outage';
      rec.isEmergency = true;
    }
  },

  // 增加储备量
  addReserve(itemId, amount) {
    const rec = this._ensureRecord(itemId, itemId, 'unknown', 0, 0, 0);
    rec.currentReserve += amount;
    this.updateStatus(itemId);
  },

  // 减少储备量
  deductReserve(itemId, amount) {
    const rec = this.records[itemId];
    if (!rec) return false;
    rec.currentReserve = Math.max(0, rec.currentReserve - amount);
    this.updateStatus(itemId);
    return true;
  },

  // 开发树节点解锁时通知
  onNodeUnlocked(itemId) {
    const rec = this._ensureRecord(itemId, itemId, 'industrial', 0, 50, 20);
    Msg.system(`📊 经济系统: ${rec.itemName} 已纳入供需追踪。`);
    // 初始给予一些储备
    rec.currentReserve += 10;
    this.updateStatus(itemId);
  },

  // 获取价格修正系数
  getPriceModifier(itemId, basePrice) {
    const rec = this.records[itemId];
    if (!rec) return 1.0;

    // 储备安全系数
    let modifier = 1.0;
    if (rec.status === 'shortage') modifier = 1.5;
    else if (rec.status === 'outage') modifier = 2.0;
    else if (rec.status === 'tight') modifier = 1.2;
    else if (rec.currentReserve > rec.safetyLine * 2) modifier = 0.8;

    return modifier;
  },

  // 获取状态文本
  getStatusText(itemId) {
    const rec = this.records[itemId];
    if (!rec) return '未知';
    const map = {
      sufficient: '供应充足',
      tight: '供需偏紧',
      shortage: '供应短缺',
      outage: '断供',
    };
    return map[rec.status] || '未知';
  },

  // 序列化
  getState() {
    return JSON.parse(JSON.stringify(this.records));
  },

  // 恢复状态
  applyState(state) {
    if (!state) return;
    this.records = state;
  },
};