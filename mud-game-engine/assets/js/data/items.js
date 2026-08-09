// ========== 物品数据库 ==========
// 注：装备类数据已迁移至 EquipmentDB，此处保留消耗品、材料等非装备物品
// 材料类数据已迁移至 MaterialDB，弹药类数据已迁移至 AmmoDB
const ItemDB = {
  consumables: {
    repair_kit_small: { id:'repair_kit_small', name:'小型修复包', type:'consumable', healHp:50, desc:'恢复50点结构值。', price:30, weight:5 },
    repair_kit_medium: { id:'repair_kit_medium', name:'中型修复包', type:'consumable', healHp:120, desc:'恢复120点结构值。', price:80, weight:8 },
    repair_kit_large: { id:'repair_kit_large', name:'大型修复包', type:'consumable', healHp:250, desc:'恢复250点结构值。', price:200, weight:12 },
    armor_patch: { id:'armor_patch', name:'装甲补片', type:'consumable', healArmor:40, desc:'恢复40点装甲值。', price:25, weight:3 },
    armor_patch_medium: { id:'armor_patch_medium', name:'中型装甲补片', type:'consumable', healArmor:100, desc:'恢复100点装甲值。', price:70, weight:5 },
    energy_cell: { id:'energy_cell', name:'能量电池', type:'consumable', energy:80, desc:'恢复80点能量。', price:40, weight:3 },
    energy_cell_large: { id:'energy_cell_large', name:'大型能量电池', type:'consumable', energy:200, desc:'恢复200点能量。', price:100, weight:6 },
  },
  questItems: {
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
    // 查询材料数据库
    if (typeof MaterialDB !== 'undefined' && MaterialDB.get) {
      const mat = MaterialDB.get(id);
      if (mat) return mat;
    }
    // 查询弹药数据库
    if (typeof AmmoDB !== 'undefined' && AmmoDB.get) {
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
    // 所有装备
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB.getAll) {
      list.push(...EquipmentDB.getAll());
    }
    // 消耗品
    const consumables = this.consumables;
    if (consumables) {
      for (const key of Object.keys(consumables)) {
        list.push({ ...consumables[key] });
      }
    }
    // 材料
    if (typeof MaterialDB !== 'undefined') {
      for (const key of Object.keys(MaterialDB)) {
        if (typeof MaterialDB[key] === 'object' && MaterialDB[key].id) {
          list.push({ ...MaterialDB[key] });
        }
      }
    }
    return list;
  }
};