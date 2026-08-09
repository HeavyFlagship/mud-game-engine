// ========== 任务数据 ==========
const QuestDB = {
  // Main quest 1: Clear bugs in northern wasteland
  quest_main_1: {
    id: 'quest_main_1',
    name: '清除荒原虫群',
    type: 'main',
    desc: '荒原北部出现了大量虫族活动，前往该区域清除至少3只虫族。',
    giver: 'commander',
    objectives: [
      { id: 'kill_bugs', type: 'kill', target: 3, desc: '击杀虫族敌人' }
    ],
    rewards: {
      credits: 200,
      exp: 100,
      items: [{ id: 'repair_kit_small', count: 2 }]
    },
    repeatable: false
  },

  // Main quest 2: Investigate Crystal Canyon
  quest_main_2: {
    id: 'quest_main_2',
    name: '调查结晶峡谷',
    type: 'main',
    desc: '探索结晶峡谷区域，清除该区域的敌对单位。',
    giver: 'commander',
    prerequisites: ['quest_main_1'],
    objectives: [
      { id: 'explore_crystal', type: 'explore', target: 1, desc: '探索结晶峡谷' },
      { id: 'clear_crystal', type: 'kill', target: 5, desc: '清除结晶峡谷敌人' }
    ],
    rewards: {
      credits: 500,
      exp: 300,
      items: [{ id: 'armor_patch', count: 3 }]
    },
    repeatable: false
  },

  // Main quest 3: Destroy the hive
  quest_main_3: {
    id: 'quest_main_3',
    name: '摧毁矿石大厅虫巢',
    type: 'main',
    desc: '深入矿石大厅，击败巨型守卫虫，摧毁虫族巢穴。',
    giver: 'commander',
    prerequisites: ['quest_main_2'],
    objectives: [
      { id: 'kill_boss', type: 'kill', target: 1, desc: '击败巨型守卫虫' }
    ],
    rewards: {
      credits: 2000,
      exp: 1000,
      items: [
        { id: 'repair_kit_large', count: 2 },
        { id: 'energy_battery_large', count: 1 }
      ]
    },
    repeatable: false
  },

  // Side quest: Collect materials (repeatable)
  quest_side_collect: {
    id: 'quest_side_collect',
    name: '收集战略物资',
    type: 'side',
    desc: '基地需要战略物资补给，收集指定材料并交付。',
    giver: 'quartermaster',
    objectives: [
      { id: 'collect_iron_ore', type: 'collect', target: 5, desc: '收集铁矿石 x5' },
      { id: 'collect_chitin', type: 'collect', target: 5, desc: '收集虫壳碎片 x5' }
    ],
    rewards: {
      credits: 150,
      exp: 80
    },
    repeatable: true
  }
};