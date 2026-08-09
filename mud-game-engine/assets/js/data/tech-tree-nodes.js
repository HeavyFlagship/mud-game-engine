// ========== 开发树节点数据（最小闭环：铁矿石→铁锭→钢锭→装甲板） ==========
const TechTreeDB = {
  nodes: {
    // 第1层：原材料（默认已解锁，代表初始工业基础）
    iron_ore_node: {
      nodeId: 'iron_ore_node',
      name: '铁矿石开采',
      layer: 1,
      type: 'raw_material',
      prerequisites: [],
      isUnlocked: true,
      unlockMethod: 'default',
      unlockRewards: [
        { type: 'allow_build', target: 'furnace_small' },
        { type: 'notify_economy', target: 'iron_ore' }
      ],
      newsText: '🏭 基地工业公告：铁矿石供应已就绪，可建造熔炉开始冶炼。'
    },

    copper_ore_node: {
      nodeId: 'copper_ore_node',
      name: '铜矿石开采',
      layer: 1,
      type: 'raw_material',
      prerequisites: [],
      isUnlocked: true,
      unlockMethod: 'default',
      unlockRewards: [
        { type: 'notify_economy', target: 'copper_ore' }
      ],
      newsText: '🏭 基地工业公告：铜矿石矿脉已探明，可用于弹药制造。'
    },

    // 第2层：工业品
    iron_ingot_node: {
      nodeId: 'iron_ingot_node',
      name: '铁锭冶炼',
      layer: 2,
      type: 'industrial',
      prerequisites: ['iron_ore_node'],
      preconditionsMet: false,
      unlockMethod: 'player',
      isUnlocked: false,
      requiredItem: 'iron_ingot',
      requiredCount: 5,
      unlockRewards: [
        { type: 'allow_build', target: 'blast_furnace_small' },
        { type: 'notify_economy', target: 'iron_ingot' }
      ],
      newsText: '🏭 基地工业公告：铁锭冶炼技术已突破，可建造高炉生产钢锭。'
    },

    steel_ingot_node: {
      nodeId: 'steel_ingot_node',
      name: '钢锭冶炼',
      layer: 2,
      type: 'industrial',
      prerequisites: ['iron_ingot_node'],
      preconditionsMet: false,
      unlockMethod: 'player',
      isUnlocked: false,
      requiredItem: 'steel_ingot',
      requiredCount: 3,
      unlockRewards: [
        { type: 'allow_build', target: 'armor_factory_small' },
        { type: 'notify_economy', target: 'steel_ingot' }
      ],
      newsText: '🏭 基地工业公告：钢锭冶炼技术已突破，可建造装甲工厂生产装甲板。'
    },

    // 第3层：终端工业品
    armor_plate_node: {
      nodeId: 'armor_plate_node',
      name: '装甲板制造',
      layer: 3,
      type: 'finished_product',
      prerequisites: ['steel_ingot_node'],
      preconditionsMet: false,
      unlockMethod: 'player',
      isUnlocked: false,
      requiredItem: 'armor_plate',
      requiredCount: 2,
      unlockRewards: [
        { type: 'notify_economy', target: 'armor_plate' }
      ],
      newsText: '🏭 基地工业公告：装甲板自主制造已实现，工业链闭环完成！'
    }
  },

  get(nodeId) {
    return this.nodes[nodeId] ? { ...this.nodes[nodeId] } : null;
  },

  getAll() {
    return Object.values(this.nodes).map(n => ({ ...n }));
  },

  // 获取已解锁节点
  getUnlocked() {
    return Object.values(this.nodes).filter(n => n.isUnlocked);
  },

  // 获取可解锁节点（前置条件满足但未解锁）
  getUnlockable() {
    const unlocked = new Set(this.getUnlocked().map(n => n.nodeId));
    return Object.values(this.nodes).filter(n => {
      if (n.isUnlocked) return false;
      return n.prerequisites.every(pre => unlocked.has(pre));
    });
  },

  // 不可变状态（序列化用）
  getState() {
    const state = {};
    for (const [id, node] of Object.entries(this.nodes)) {
      state[id] = { isUnlocked: node.isUnlocked, preconditionsMet: node.preconditionsMet };
    }
    return state;
  },

  // 恢复状态
  applyState(state) {
    if (!state) return;
    for (const [id, saved] of Object.entries(state)) {
      if (this.nodes[id]) {
        this.nodes[id].isUnlocked = saved.isUnlocked || false;
        this.nodes[id].preconditionsMet = saved.preconditionsMet || false;
      }
    }
  },
};