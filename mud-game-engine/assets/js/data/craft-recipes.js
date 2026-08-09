// ========== 制造配方数据库 ==========
// 包含弹药制造配方、工业品制造配方
const CraftRecipeDB = {
  // ===== 弹药制造配方（维修站手动制造） =====
  ammo: {
    craft_20mm_ap: {
      id: 'craft_20mm_ap',
      name: '制造20mm穿甲弹',
      category: 'ammo',
      output: { itemId: '20mm_ap', count: 20 },
      inputs: [
        { itemId: 'copper_ore', count: 2 },
        { itemId: 'gunpowder', count: 1 },
        { itemId: 'shell_casing', count: 1 },
      ],
      time: 5,  // 制造耗时（秒）
      desc: '使用铜矿石、火药和弹壳制造20mm穿甲弹（20发）',
    },
    craft_railgun_slug: {
      id: 'craft_railgun_slug',
      name: '制造轨道弹',
      category: 'ammo',
      output: { itemId: 'railgun_slug', count: 10 },
      inputs: [
        { itemId: 'iron_ore', count: 3 },
        { itemId: 'propellant', count: 1 },
        { itemId: 'alloy_fragment', count: 1 },
      ],
      time: 8,
      desc: '使用铁矿石、推进剂和合金碎片制造轨道弹（10发）',
    },
    craft_ion_charge: {
      id: 'craft_ion_charge',
      name: '制造离子电荷',
      category: 'ammo',
      output: { itemId: 'ion_charge', count: 15 },
      inputs: [
        { itemId: 'copper_ore', count: 2 },
        { itemId: 'germanite_shard', count: 1 },
        { itemId: 'shell_casing', count: 1 },
      ],
      time: 10,
      desc: '使用铜矿石、辉锗矿碎片和弹壳制造离子电荷（15发）',
    },
    craft_missile_he: {
      id: 'craft_missile_he',
      name: '制造高爆导弹',
      category: 'ammo',
      output: { itemId: 'missile_he', count: 5 },
      inputs: [
        { itemId: 'iron_ore', count: 2 },
        { itemId: 'gunpowder', count: 2 },
        { itemId: 'propellant', count: 1 },
        { itemId: 'shell_casing', count: 2 },
      ],
      time: 12,
      desc: '使用铁矿石、火药、推进剂和弹壳制造高爆导弹（5发）',
    },
  },

  // ===== 工业品制造配方（设施自动化生产） =====
  industrial: {
    smelt_iron_ingot: {
      id: 'smelt_iron_ingot',
      name: '冶炼铁锭',
      category: 'industrial',
      output: { itemId: 'iron_ingot', count: 1 },
      inputs: [
        { itemId: 'iron_ore', count: 2 },
      ],
      time: 3600,  // 1小时（设施自动生产）
      facility: 'furnace_small',
      desc: '在熔炉中冶炼铁矿石，产出铁锭',
    },
    smelt_steel_ingot: {
      id: 'smelt_steel_ingot',
      name: '冶炼钢锭',
      category: 'industrial',
      output: { itemId: 'steel_ingot', count: 1 },
      inputs: [
        { itemId: 'iron_ore', count: 3 },
      ],
      time: 3600,
      facility: 'blast_furnace_small',
      desc: '在高炉中冶炼铁矿石，产出钢锭',
    },
    forge_armor_plate: {
      id: 'forge_armor_plate',
      name: '锻造装甲板',
      category: 'industrial',
      output: { itemId: 'armor_plate', count: 1 },
      inputs: [
        { itemId: 'steel_ingot', count: 2 },
      ],
      time: 3600,
      facility: 'armor_factory_small',
      desc: '在装甲工厂中加工钢锭，产出装甲板',
    },
  },

  get(id) {
    for (const cat of Object.values(this)) {
      if (cat && typeof cat === 'object' && cat[id]) return { ...cat[id] };
    }
    return null;
  },

  getAll() {
    const list = [];
    for (const cat of ['ammo', 'industrial']) {
      const items = this[cat];
      if (items) {
        for (const key of Object.keys(items)) {
          list.push({ ...items[key] });
        }
      }
    }
    return list;
  },

  // 获取指定设施可用的配方
  getRecipesForFacility(facilityId) {
    const recipes = [];
    for (const cat of Object.values(this)) {
      if (cat && typeof cat === 'object') {
        for (const recipe of Object.values(cat)) {
          if (recipe.facility === facilityId) {
            recipes.push(recipe);
          }
        }
      }
    }
    return recipes;
  }
};