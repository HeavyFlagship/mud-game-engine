// ========== 生产设施数据库 ==========
const FacilityDB = {
  facilities: {
    // 熔炉（小型）：铁矿石→铁锭
    furnace_small: {
      facilityId: 'furnace_small',
      name: '熔炉（小型）',
      type: 'smelter',
      scale: 'small',
      footprint: 150,
      outputItemId: 'iron_ingot',
      outputRate: 2,
      storageLimit: 50,
      inputItemId: 'iron_ore',
      inputRate: 3,
      installCost: [
        { itemId: 'iron_ore', count: 20 },
        { itemId: 'mech_parts', count: 5 }
      ],
      installTime: 0,
      desc: '小型冶炼熔炉，将铁矿石冶炼为铁锭。每小时产出2单位铁锭，消耗3单位铁矿石。'
    },

    // 高炉（小型）：铁矿石→钢锭
    blast_furnace_small: {
      facilityId: 'blast_furnace_small',
      name: '高炉（小型）',
      type: 'smelter',
      scale: 'small',
      footprint: 200,
      outputItemId: 'steel_ingot',
      outputRate: 1,
      storageLimit: 30,
      inputItemId: 'iron_ore',
      inputRate: 3,
      installCost: [
        { itemId: 'iron_ingot', count: 10 },
        { itemId: 'mech_parts', count: 8 }
      ],
      installTime: 0,
      desc: '小型高炉，将铁矿石冶炼为高品质钢锭。每小时产出1单位钢锭，消耗3单位铁矿石。'
    },

    // 装甲工厂（小型）：钢锭→装甲板
    armor_factory_small: {
      facilityId: 'armor_factory_small',
      name: '装甲工厂（小型）',
      type: 'factory',
      scale: 'small',
      footprint: 300,
      outputItemId: 'armor_plate',
      outputRate: 1,
      storageLimit: 20,
      inputItemId: 'steel_ingot',
      inputRate: 2,
      installCost: [
        { itemId: 'steel_ingot', count: 5 },
        { itemId: 'alloy_fragment', count: 10 }
      ],
      installTime: 0,
      desc: '小型装甲板制造工厂，将钢锭加工为装甲板。每小时产出1单位装甲板，消耗2单位钢锭。'
    },
  },

  get(facilityId) {
    return this.facilities[facilityId] ? { ...this.facilities[facilityId] } : null;
  },

  getAll() {
    return Object.values(this.facilities).map(f => ({ ...f }));
  },
};