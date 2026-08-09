// ========== 物品数据库（消耗品 + 任务物品） ==========
// 材料 → materials.js (MaterialDB)
// 弹药 → ammo.js (AmmoDB)
// 制造配方 → craft-recipes.js (CraftRecipeDB)
const ItemDB = {
  // ===== 消耗品 =====
  potions: {
    repair_kit_small: { id:'repair_kit_small', name:'小型修复包', type:'consumable', healHp:50, desc:'恢复50点结构值。', price:30, weight:5 },
    repair_kit_medium: { id:'repair_kit_medium', name:'中型修复包', type:'consumable', healHp:120, desc:'恢复120点结构值。', price:80, weight:8 },
    repair_kit_large: { id:'repair_kit_large', name:'大型修复包', type:'consumable', healHp:250, desc:'恢复250点结构值。', price:180, weight:12 },
    armor_patch: { id:'armor_patch', name:'装甲补片', type:'consumable', healArmor:40, desc:'恢复40点装甲值。', price:25, weight:3 },
    armor_patch_medium: { id:'armor_patch_medium', name:'中型装甲补片', type:'consumable', healArmor:100, desc:'恢复100点装甲值。', price:70, weight:5 },
    energy_cell: { id:'energy_cell', name:'能量电池', type:'consumable', energy:80, desc:'恢复80点能量。', price:40, weight:3 },
    energy_cell_large: { id:'energy_cell_large', name:'大型能量电池', type:'consumable', energy:200, desc:'恢复200点能量。', price:100, weight:6 },
  },

  // ===== 任务物品 =====
  questItems: {
    command_report: { id:'command_report', name:'指挥报告', type:'quest', desc:'基地指挥官签发的任务报告。', price:0, weight:0 },
    bug_sample: { id:'bug_sample', name:'虫群样本', type:'quest', desc:'从虫族身上采集的生物样本，用于研究。', price:0, weight:1.0 },
    mech_data_core: { id:'mech_data_core', name:'机械数据核心', type:'quest', desc:'从Boss级机械敌人获得的数据核心，包含远古科技信息。', price:0, weight:2.0 },
  },

  get(id) {
    // 优先从 EquipmentDB 查询装备
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB.get) {
      const eq = EquipmentDB.get(id);
      if (eq) return eq;
    }
    // 查询载具
    if (typeof VehicleDB !== 'undefined' && VehicleDB[id]) {
      const v = VehicleDB[id];
      return { id: v.id, name: v.name, type: 'vehicle', category: 'vehicle', price: v.price || 0, desc: v.desc };
    }
    // 查询材料
    if (typeof MaterialDB !== 'undefined') {
      const mat = MaterialDB.get(id);
      if (mat) return mat;
    }
    // 查询弹药
    if (typeof AmmoDB !== 'undefined') {
      const ammo = AmmoDB.get(id);
      if (ammo) return ammo;
    }
    // 回退到本地分类查询
    for (const cat of Object.values(this)) {
      if (cat && typeof cat === 'object' && cat[id]) return { ...cat[id] };
    }
    return null;
  },

  getAllSellable() {
    const list = [];
    // 装备
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB.getAll) {
      list.push(...EquipmentDB.getAll());
    }
    // 消耗品
    const items = this.potions;
    if (items) {
      for (const key of Object.keys(items)) {
        list.push({ ...items[key] });
      }
    }
    // 材料
    if (typeof MaterialDB !== 'undefined' && MaterialDB.getAll) {
      list.push(...MaterialDB.getAll());
    }
    // 弹药
    if (typeof AmmoDB !== 'undefined' && AmmoDB.getAll) {
      list.push(...AmmoDB.getAll());
    }
    return list;
  }
};