// ========== 敌人数据库 ==========
const EnemyDB = {
  worker_bug: {
    id: 'worker_bug',
    name: '工虫',
    category: 'bug',
    hp: 60,
    armor: 15,
    speed: 6,
    visionRadius: 300,
    signalRadius: 1.5,
    targetRadius: 1.2,
    damage: 8,
    damageType: 'kinetic',
    attackRange: 250,
    attackCooldown: 15,
    spread: 0.08,
    exp: 15,
    loot: [
      { item: 'chitin_fragment', chance: 0.6, min: 1, max: 3 }
    ],
    aiType: 'bug_simple',
    desc: '小型节肢类异星生物，以矿脉中的微量元素为食，攻击力弱但数量众多。'
  },
  assault_bug: {
    id: 'assault_bug',
    name: '突击虫',
    category: 'bug',
    hp: 120,
    armor: 30,
    speed: 10,
    visionRadius: 350,
    signalRadius: 2.0,
    targetRadius: 1.8,
    damage: 18,
    damageType: 'kinetic',
    attackRange: 200,
    attackCooldown: 12,
    spread: 0.05,
    exp: 35,
    loot: [
      { item: 'chitin_fragment', chance: 0.8, min: 2, max: 5 },
      { item: 'acid_gland', chance: 0.3, min: 1, max: 1 }
    ],
    aiType: 'bug_charge',
    desc: '中型战斗虫，前肢特化为锋利的切割器官，冲锋速度快，对轻型装甲威胁较大。'
  }
};
