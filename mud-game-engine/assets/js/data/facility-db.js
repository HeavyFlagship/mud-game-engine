// ========== 工业设施数据库 ==========
const FacilityDB = {
  furnace_small: {
    facilityId: 'furnace_small',
    name: '熔炉（小型）',
    type: 'smelter',
    scale: 'small',
    footprint: 150,
    requiresNode: 'iron_ingot',
    unlocksNode: 'iron_ingot',
    outputItemId: 'iron_ingot',
    outputRate: 2, // per hour
    storageLimit: 50,
    inputItemId: 'iron_ore',
    inputRate: 3, // per hour
    inputSource: 'warehouse',
    outputTarget: 'warehouse',
    installCost: [
      { id: 'iron_ore', name: '铁矿石', count: 20 },
      { id: 'mech_parts', name: '机械零件', count: 5 }
    ],
    newsText: '🏭 熔炉投产！铁矿石→铁锭生产线已启动。'
  },
  blast_furnace_small: {
    facilityId: 'blast_furnace_small',
    name: '高炉（小型）',
    type: 'furnace',
    scale: 'small',
    footprint: 200,
    requiresNode: 'steel_ingot',
    unlocksNode: 'steel_ingot',
    outputItemId: 'steel_ingot',
    outputRate: 1,
    storageLimit: 30,
    inputItemId: 'iron_ore',
    inputRate: 2,
    inputSource: 'warehouse',
    outputTarget: 'warehouse',
    installCost: [
      { id: 'iron_ingot', name: '铁锭', count: 10 },
      { id: 'mech_parts', name: '机械零件', count: 8 }
    ],
    newsText: '🏭 高炉投产！铁矿石→钢锭生产线已启动。'
  },
  armor_factory_small: {
    facilityId: 'armor_factory_small',
    name: '装甲工厂（小型）',
    type: 'factory',
    scale: 'small',
    footprint: 300,
    requiresNode: 'armor_plate',
    unlocksNode: 'armor_plate',
    outputItemId: 'armor_plate',
    outputRate: 1,
    storageLimit: 20,
    inputItemId: 'steel_ingot',
    inputRate: 2,
    inputSource: 'warehouse',
    outputTarget: 'warehouse',
    installCost: [
      { id: 'steel_ingot', name: '钢锭', count: 5 },
      { id: 'mech_parts', name: '机械零件', count: 10 }
    ],
    newsText: '🏭 装甲工厂投产！钢锭→装甲板生产线已启动。'
  }
};