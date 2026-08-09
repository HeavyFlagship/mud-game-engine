// ========== 敌人数据库（15种：虫族8种 + 机械6种 + Boss 2种） ==========
const EnemyDB = {
  // ===== 虫族 =====
  worker_bug: {
    id: 'worker_bug',
    name: '工虫',
    category: 'bug',
    hp: 60, armor: 15, speed: 6,
    visionRadius: 300, signalRadius: 1.5, targetRadius: 1.2,
    damage: 8, damageType: 'kinetic',
    attackRange: 250, attackCooldown: 15, spread: 0.08,
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
    hp: 70, armor: 30, speed: 10,
    visionRadius: 350, signalRadius: 2.0, targetRadius: 1.8,
    damage: 18, damageType: 'kinetic',
    attackRange: 200, attackCooldown: 12, spread: 0.05,
    exp: 35,
    loot: [
      { item: 'chitin_fragment', chance: 0.8, min: 2, max: 5 },
      { item: 'acid_gland', chance: 0.3, min: 1, max: 1 }
    ],
    aiType: 'bug_charge',
    desc: '中型战斗虫，前肢特化为锋利的切割器官，冲锋速度快，对轻型装甲威胁较大。'
  },

  acid_spitter: {
    id: 'acid_spitter',
    name: '喷酸虫',
    category: 'bug',
    hp: 55, armor: 10, speed: 7,
    visionRadius: 350, signalRadius: 2.0, targetRadius: 1.5,
    damage: 22, damageType: 'corrosion',
    attackRange: 350, attackCooldown: 18, spread: 0.04,
    exp: 40,
    loot: [
      { item: 'acid_gland', chance: 0.6, min: 1, max: 2 },
      { item: 'chitin_fragment', chance: 0.4, min: 1, max: 2 }
    ],
    aiType: 'bug_ranged',
    desc: '远程攻击虫族，从腹部喷射强腐蚀性酸液，对装甲有持续损伤效果。'
  },

  flying_bug: {
    id: 'flying_bug',
    name: '飞虫',
    category: 'bug',
    hp: 40, armor: 5, speed: 14,
    visionRadius: 400, signalRadius: 1.0, targetRadius: 0.8,
    damage: 12, damageType: 'kinetic',
    attackRange: 150, attackCooldown: 8, spread: 0.06,
    exp: 20,
    loot: [
      { item: 'bug_gel', chance: 0.4, min: 1, max: 1 },
      { item: 'chitin_fragment', chance: 0.3, min: 1, max: 1 }
    ],
    aiType: 'bug_swarm',
    desc: '高速飞行虫族，体型小难以命中，常成群出现进行骚扰攻击。'
  },

  beetle: {
    id: 'beetle',
    name: '甲壳虫',
    category: 'bug',
    hp: 120, armor: 80, speed: 5,
    visionRadius: 250, signalRadius: 2.5, targetRadius: 2.5,
    damage: 15, damageType: 'kinetic',
    attackRange: 100, attackCooldown: 20, spread: 0.03,
    exp: 45,
    loot: [
      { item: 'carapace_plate', chance: 0.5, min: 1, max: 2 },
      { item: 'chitin_fragment', chance: 0.3, min: 1, max: 3 }
    ],
    aiType: 'bug_tank',
    desc: '大型装甲虫族，厚重的甲壳能抵御大量动能伤害，是虫群的前线肉盾。'
  },

  hopper: {
    id: 'hopper',
    name: '跳虫',
    category: 'bug',
    hp: 45, armor: 8, speed: 16,
    visionRadius: 300, signalRadius: 1.8, targetRadius: 1.2,
    damage: 10, damageType: 'kinetic',
    attackRange: 50, attackCooldown: 6, spread: 0.02,
    exp: 25,
    loot: [
      { item: 'bug_gel', chance: 0.3, min: 1, max: 1 },
      { item: 'chitin_fragment', chance: 0.2, min: 1, max: 1 }
    ],
    aiType: 'bug_charge',
    desc: '敏捷型虫族，后肢强健可瞬间跳跃接近目标，攻速极快。'
  },

  toxic_bug: {
    id: 'toxic_bug',
    name: '毒雾虫',
    category: 'bug',
    hp: 80, armor: 20, speed: 6,
    visionRadius: 280, signalRadius: 2.0, targetRadius: 2.0,
    damage: 5, damageType: 'corrosion',
    attackRange: 200, attackCooldown: 25, spread: 0.01,
    exp: 50,
    loot: [
      { item: 'acid_gland', chance: 0.5, min: 1, max: 2 },
      { item: 'chitin_fragment', chance: 0.4, min: 1, max: 2 }
    ],
    aiType: 'bug_ranged',
    desc: '能释放毒雾云团的虫族，在其范围区域内造成持续腐蚀伤害。'
  },

  giant_guardian: {
    id: 'giant_guardian',
    name: '巨型守卫虫',
    category: 'bug',
    hp: 500, armor: 150, speed: 4,
    visionRadius: 400, signalRadius: 4.0, targetRadius: 4.0,
    damage: 45, damageType: 'kinetic',
    attackRange: 120, attackCooldown: 15, spread: 0.02,
    exp: 500,
    loot: [
      { item: 'carapace_plate', chance: 1.0, min: 3, max: 5 },
      { item: 'giant_acid_gland', chance: 1.0, min: 1, max: 1 },
      { item: '75mm_cannon', chance: 0.2, min: 1, max: 1 }
    ],
    aiType: 'boss_guardian',
    isBoss: true,
    desc: '矿石大厅的虫群守护者，体型巨大，甲壳几乎无法被轻武器穿透。HP低于50%时进入狂暴状态。'
  },

  // ===== 机械阵营 =====
  recon_probe: {
    id: 'recon_probe',
    name: '侦察探针',
    category: 'mech',
    hp: 35, armor: 10, speed: 15,
    visionRadius: 500, signalRadius: 1.2, targetRadius: 0.8,
    damage: 8, damageType: 'thermal',
    attackRange: 400, attackCooldown: 10, spread: 0.03,
    exp: 25,
    loot: [
      { item: 'mech_parts', chance: 0.4, min: 1, max: 2 },
      { item: 'energy_core_remnant', chance: 0.2, min: 1, max: 1 }
    ],
    aiType: 'mech_scout',
    desc: '小型侦察无人机，视野范围极大，发现目标后会召唤附近的机械单位。'
  },

  defense_node: {
    id: 'defense_node',
    name: '防御节点',
    category: 'mech',
    hp: 150, armor: 60, speed: 0,
    visionRadius: 500, signalRadius: 2.5, targetRadius: 2.0,
    damage: 25, damageType: 'thermal',
    attackRange: 500, attackCooldown: 12, spread: 0.01,
    exp: 45,
    loot: [
      { item: 'mech_parts', chance: 0.6, min: 2, max: 3 },
      { item: 'alloy_fragment', chance: 0.3, min: 1, max: 2 }
    ],
    aiType: 'mech_turret',
    desc: '固定式防御炮台，不可移动但射程远、精度高，是机械遗迹的标准防御设施。'
  },

  particle_sentry: {
    id: 'particle_sentry',
    name: '粒子束哨兵',
    category: 'mech',
    hp: 100, armor: 40, speed: 8,
    visionRadius: 350, signalRadius: 2.0, targetRadius: 1.8,
    damage: 30, damageType: 'ion',
    attackRange: 350, attackCooldown: 14, spread: 0.02,
    exp: 55,
    loot: [
      { item: 'mech_parts', chance: 0.5, min: 1, max: 2 },
      { item: 'germanite_shard', chance: 0.3, min: 1, max: 1 }
    ],
    aiType: 'mech_sentry',
    desc: '装备粒子束武器的巡逻机械哨兵，离子伤害可干扰目标的电子系统。'
  },

  self_repair_guardian: {
    id: 'self_repair_guardian',
    name: '自修复守卫',
    category: 'mech',
    hp: 200, armor: 80, speed: 6,
    visionRadius: 320, signalRadius: 2.5, targetRadius: 2.2,
    damage: 20, damageType: 'thermal',
    attackRange: 300, attackCooldown: 16, spread: 0.03,
    exp: 70,
    loot: [
      { item: 'mech_parts', chance: 0.6, min: 2, max: 4 },
      { item: 'energy_core_remnant', chance: 0.3, min: 1, max: 2 }
    ],
    aiType: 'mech_repair',
    desc: '具备自修复能力的重型机械守卫，脱离战斗后会逐渐恢复结构值。'
  },

  gravity_distorter: {
    id: 'gravity_distorter',
    name: '重力扭曲器',
    category: 'mech',
    hp: 130, armor: 50, speed: 7,
    visionRadius: 300, signalRadius: 2.0, targetRadius: 2.0,
    damage: 18, damageType: 'shock',
    attackRange: 250, attackCooldown: 20, spread: 0.04,
    exp: 65,
    loot: [
      { item: 'mech_parts', chance: 0.5, min: 1, max: 3 },
      { item: 'germanite_shard', chance: 0.2, min: 1, max: 1 }
    ],
    aiType: 'mech_controller',
    desc: '能产生局部重力扭曲场的先进机械，范围内的目标移动速度大幅降低。'
  },

  colossus_guardian: {
    id: 'colossus_guardian',
    name: '守护者巨像',
    category: 'mech',
    hp: 800, armor: 200, speed: 3,
    visionRadius: 500, signalRadius: 5.0, targetRadius: 5.0,
    damage: 60, damageType: 'thermal',
    attackRange: 450, attackCooldown: 18, spread: 0.01,
    exp: 1000,
    loot: [
      { item: 'alloy_fragment', chance: 1.0, min: 3, max: 5 },
      { item: 'ancient_core', chance: 1.0, min: 1, max: 1 },
      { item: 'railgun_mk1', chance: 0.3, min: 1, max: 1 }
    ],
    aiType: 'boss_colossus',
    isBoss: true,
    desc: '机械遗迹最深处的远古守护者，装备粒子束武器和能量护盾。HP低于50%时激活高能模式。'
  }
};