// ========== 材料数据库 ==========
const MaterialDB = {
  chitin_fragment: { id:'chitin_fragment', name:'虫壳碎片', type:'material', desc:'异星虫子的甲壳碎片，可用于工业加工。', price:8, weight:0.5 },
  acid_gland: { id:'acid_gland', name:'酸腺', type:'material', desc:'突击虫体内的酸性腺体，含有腐蚀性液体。', price:25, weight:1.0 },
  bug_gel: { id:'bug_gel', name:'虫胶碎块', type:'material', desc:'飞虫体内的胶状物质，可用于制造粘合剂。', price:15, weight:0.8 },
  carapace_plate: { id:'carapace_plate', name:'甲壳板', type:'material', desc:'甲壳虫的厚重甲壳，可用于制造高级装甲。', price:80, weight:3.0 },
  giant_acid_gland: { id:'giant_acid_gland', name:'巨型酸腺', type:'material', desc:'巨型守卫虫的酸腺，极为稀有。', price:200, weight:5.0 },
  mech_parts: { id:'mech_parts', name:'机械零件', type:'material', desc:'机械敌人的精密零件，可用于制造和维修。', price:20, weight:1.0 },
  alloy_fragment: { id:'alloy_fragment', name:'合金碎片', type:'material', desc:'机械敌人的合金装甲碎片，硬度极高。', price:35, weight:1.5 },
  germanite_shard: { id:'germanite_shard', name:'辉锗矿碎片', type:'material', desc:'织女-7行星特有的辉锗矿结晶碎片，具有高能量密度。', price:60, weight:2.0 },
  energy_core_remnant: { id:'energy_core_remnant', name:'能量核心残片', type:'material', desc:'机械敌人能量核心的残留物，蕴含微弱能量。', price:100, weight:3.0 },
  ancient_core: { id:'ancient_core', name:'远古核心', type:'material', desc:'守护者巨像的核心，散发远古科技的光芒。', price:500, weight:10.0 },
  // Manufacturing materials
  iron_ore: { id:'iron_ore', name:'铁矿石', type:'material', desc:'从矿脉中开采的铁矿石，可用于冶炼铁锭。', price:5, weight:1.0 },
  copper_ore: { id:'copper_ore', name:'铜矿石', type:'material', desc:'从矿脉中开采的铜矿石，可用于制造弹药。', price:8, weight:1.0 },
  gunpowder: { id:'gunpowder', name:'火药', type:'material', desc:'基础火药原料，用于制造弹药。', price:10, weight:0.5 },
  propellant: { id:'propellant', name:'推进剂', type:'material', desc:'高能推进剂，用于制造轨道弹和导弹。', price:15, weight:0.5 },
  shell_casing: { id:'shell_casing', name:'弹壳', type:'material', desc:'标准弹壳，用于制造弹药。', price:3, weight:0.2 },
  
  get(id) {
    return this[id] || null;
  }
};