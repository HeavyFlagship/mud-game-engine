// ========== 物品数据库 ==========
// 注：装备类数据已迁移至 EquipmentDB，此处保留消耗品、材料等非装备物品
const ItemDB = {
  potions: {
    repair_kit_small: { id:'repair_kit_small', name:'小型修复包', type:'potion', heal:50, desc:'恢复50点结构值。', price:30, weight:5 },
    armor_patch: { id:'armor_patch', name:'装甲补片', type:'potion', heal:40, desc:'恢复40点装甲值。', price:25, weight:3 },
  },
  materials: {
    chitin_fragment: { id:'chitin_fragment', name:'虫壳碎片', type:'material', desc:'异星虫子的甲壳碎片，可用于工业加工。', price:8, weight:0.5 },
    acid_gland: { id:'acid_gland', name:'酸腺', type:'material', desc:'突击虫体内的酸性腺体，含有腐蚀性液体。', price:25, weight:1.0 },
  },
  questItems: {
  },
  get(id) {
    // 优先从 EquipmentDB 查询装备
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB.get) {
      const eq = EquipmentDB.get(id);
      if (eq) return eq;
    }
    // 回退到本地分类查询
    for (const cat of Object.values(this)) {
      if (cat && typeof cat === 'object' && cat[id]) return { ...cat[id] };
    }
    return null;
  },
  getAllSellable() {
    const list = [];
    // 所有装备
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB.getAll) {
      list.push(...EquipmentDB.getAll());
    }
    // 消耗品和材料
    for (const cat of ['potions','materials']) {
      const items = this[cat];
      if (items) {
        for (const key of Object.keys(items)) {
          list.push({ ...items[key] });
        }
      }
    }
    return list;
  }
};
