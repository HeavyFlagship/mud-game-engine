// ========== 科技树节点数据库 ==========
const TechTreeDB = {
  iron_ore: {
    nodeId: 'iron_ore',
    name: '铁矿石',
    layer: 1,
    type: 'raw_material',
    prerequisites: [],
    isUnlocked: true,
    unlockRewards: [
      { type: 'notify_economy', target: 'iron_ore' }
    ],
    newsText: '🏭 赤穹中枢工业部报告：铁矿石开采已就绪，可建造熔炉进行冶炼。'
  },
  iron_ingot: {
    nodeId: 'iron_ingot',
    name: '铁锭',
    layer: 2,
    type: 'industrial',
    prerequisites: ['iron_ore'],
    isUnlocked: false,
    unlockRewards: [
      { type: 'allow_build', target: 'furnace_small' },
      { type: 'notify_economy', target: 'iron_ingot' }
    ],
    newsText: '🏭 基地宣布：铁锭供应已就绪，可建造熔炉生产或申请配额。'
  },
  steel_ingot: {
    nodeId: 'steel_ingot',
    name: '钢锭',
    layer: 2,
    type: 'industrial',
    prerequisites: ['iron_ingot'],
    isUnlocked: false,
    unlockRewards: [
      { type: 'allow_build', target: 'blast_furnace_small' },
      { type: 'notify_economy', target: 'steel_ingot' }
    ],
    newsText: '🏭 基地宣布：钢锭冶炼技术已突破，可建造高炉进行生产。'
  },
  armor_plate: {
    nodeId: 'armor_plate',
    name: '装甲板',
    layer: 3,
    type: 'equipment',
    prerequisites: ['steel_ingot'],
    isUnlocked: false,
    unlockRewards: [
      { type: 'allow_build', target: 'armor_factory_small' },
      { type: 'notify_economy', target: 'armor_plate' }
    ],
    newsText: '🏭 基地宣布：装甲板生产线已就绪，可建造装甲工厂量产。'
  }
};