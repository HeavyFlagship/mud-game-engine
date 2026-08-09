// ========== 制造配方数据库 ==========
const CraftRecipeDB = {
  recipe_20mm_ap: {
    id: 'recipe_20mm_ap',
    name: '20mm穿甲弹制造',
    output: { id: '20mm_ap', name: '20mm穿甲弹', count: 20 },
    materials: [
      { id: 'iron_ore', name: '铁矿石', count: 2 },
      { id: 'gunpowder', name: '火药', count: 1 }
    ],
    cost: 10,
    facility: 'repair_station',
    desc: '消耗铁矿石和火药，在维修站制造20mm穿甲弹。'
  },
  recipe_railgun_slug: {
    id: 'recipe_railgun_slug',
    name: '轨道弹制造',
    output: { id: 'railgun_slug', name: '轨道弹', count: 10 },
    materials: [
      { id: 'copper_ore', name: '铜矿石', count: 3 },
      { id: 'propellant', name: '推进剂', count: 1 }
    ],
    cost: 20,
    facility: 'repair_station',
    desc: '消耗铜矿石和推进剂，在维修站制造轨道弹。'
  },
  recipe_ion_charge: {
    id: 'recipe_ion_charge',
    name: '离子电荷制造',
    output: { id: 'ion_charge', name: '离子电荷', count: 15 },
    materials: [
      { id: 'germanite_shard', name: '辉锗矿碎片', count: 1 },
      { id: 'energy_core_remnant', name: '能量核心残片', count: 1 }
    ],
    cost: 10,
    facility: 'repair_station',
    desc: '消耗辉锗矿碎片和能量核心残片，在维修站制造离子电荷。'
  },
  recipe_missile_he: {
    id: 'recipe_missile_he',
    name: '高爆导弹制造',
    output: { id: 'missile_he', name: '高爆导弹', count: 5 },
    materials: [
      { id: 'gunpowder', name: '火药', count: 1 },
      { id: 'propellant', name: '推进剂', count: 1 }
    ],
    cost: 10,
    facility: 'repair_station',
    desc: '消耗火药和推进剂，在维修站制造高爆导弹。'
  },
  
  get(id) { return this[id] || null; },
  getAll() { return Object.values(this).filter(r => r.id); }
};