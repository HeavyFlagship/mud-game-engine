// ========== 材料数据库 ==========
// 包含虫族掉落、机械掉落、矿脉材料、制造材料
const MaterialDB = {
  // ===== 虫族掉落材料 =====
  bug_drops: {
    chitin_fragment: { id:'chitin_fragment', name:'虫壳碎片', type:'material', category:'bug_drop', desc:'异星虫子的甲壳碎片，可用于工业加工。', price:8, weight:0.5 },
    acid_gland: { id:'acid_gland', name:'酸腺', type:'material', category:'bug_drop', desc:'虫族体内的酸性腺体，含有腐蚀性液体。', price:25, weight:1.0 },
    bug_gel: { id:'bug_gel', name:'虫胶碎块', type:'material', category:'bug_drop', desc:'飞虫和跳虫的胶状分泌物，有粘合特性。', price:15, weight:0.8 },
    carapace_plate: { id:'carapace_plate', name:'甲壳板', type:'material', category:'bug_drop', desc:'甲壳虫的厚重甲壳板，制造高级装备的优质材料。', price:80, weight:3.0 },
    giant_acid_gland: { id:'giant_acid_gland', name:'巨型酸腺', type:'material', category:'bug_drop', desc:'巨型守卫虫的巨型酸腺，极其稀有。', price:200, weight:5.0 },
  },

  // ===== 机械掉落材料 =====
  mech_drops: {
    mech_parts: { id:'mech_parts', name:'机械零件', type:'material', category:'mech_drop', desc:'机械敌人掉落的可回收零件。', price:20, weight:1.0 },
    alloy_fragment: { id:'alloy_fragment', name:'合金碎片', type:'material', category:'mech_drop', desc:'机械敌人装甲碎片，可用于制造弹药。', price:35, weight:1.5 },
    germanite_shard: { id:'germanite_shard', name:'辉锗矿碎片', type:'material', category:'mech_drop', desc:'织女-7特有的辉锗矿碎片，高级制造原料。', price:60, weight:2.0 },
    energy_core_remnant: { id:'energy_core_remnant', name:'能量核心残片', type:'material', category:'mech_drop', desc:'机械敌人能量核心的残片，可用于制造能量物品。', price:100, weight:3.0 },
    ancient_core: { id:'ancient_core', name:'远古核心', type:'material', category:'mech_drop', desc:'守护者巨像的核心，蕴含远古科技能量。', price:500, weight:10.0 },
  },

  // ===== 矿脉材料 =====
  minerals: {
    iron_ore: { id:'iron_ore', name:'铁矿石', type:'material', category:'mineral', desc:'从矿脉采集的铁矿石，基础制造原料。', price:5, weight:1.0 },
    copper_ore: { id:'copper_ore', name:'铜矿石', type:'material', category:'mineral', desc:'从矿脉采集的铜矿石，弹药制造原料。', price:8, weight:1.0 },
  },

  // ===== 制造原料 =====
  crafting: {
    gunpowder: { id:'gunpowder', name:'火药', type:'material', category:'crafting', desc:'基础爆炸物原料，弹药制造所需。', price:10, weight:0.5 },
    propellant: { id:'propellant', name:'推进剂', type:'material', category:'crafting', desc:'高能推进剂，轨道弹和导弹制造所需。', price:15, weight:0.5 },
    shell_casing: { id:'shell_casing', name:'弹壳', type:'material', category:'crafting', desc:'标准弹壳，弹药制造基础材料。', price:3, weight:0.2 },
  },

  // ===== 工业品（制造产出） =====
  industrial: {
    iron_ingot: { id:'iron_ingot', name:'铁锭', type:'material', category:'industrial', desc:'由铁矿石冶炼而成的工业品。', price:25, weight:2.0 },
    steel_ingot: { id:'steel_ingot', name:'钢锭', type:'material', category:'industrial', desc:'高品质钢锭，高级制造原料。', price:50, weight:2.0 },
    armor_plate: { id:'armor_plate', name:'装甲板', type:'material', category:'industrial', desc:'由钢锭加工而成的终端工业品。', price:120, weight:4.0 },
  },

  get(id) {
    for (const cat of Object.values(this)) {
      if (cat && typeof cat === 'object' && cat[id]) return { ...cat[id] };
    }
    return null;
  },

  getAll() {
    const list = [];
    for (const cat of ['bug_drops', 'mech_drops', 'minerals', 'crafting', 'industrial']) {
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