// ========== 物品数据库 ==========
const ItemDB = {
  weapons: {
    auto_cannon_mk1: { id:'auto_cannon_mk1', name:'MK-I 自动机炮', type:'weapon', slot:'weapon', damage:18, desc:'20mm口径自动机炮，动能武器。', price:200, weight:60 },
    pulse_laser_mk1: { id:'pulse_laser_mk1', name:'MK-I 脉冲激光', type:'weapon', slot:'weapon', damage:12, desc:'低功率脉冲激光武器，能量消耗较高。', price:350, weight:45 },
  },
  armors: {
    light_alloy_plate: { id:'light_alloy_plate', name:'轻型合金装甲板', type:'armor', slot:'armor', armor:80, desc:'标准型轻质合金装甲板。', price:150, weight:80 },
  },
  accessories: {
  },
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
    for (const cat of Object.values(this)) {
      if (cat && typeof cat === 'object' && cat[id]) return { ...cat[id] };
    }
    return null;
  }
};
