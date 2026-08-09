// ========== 敌人数据库 ==========
const EnemyDB = {
  // ===== 虫族阵营（Zerg Faction） =====
  // 小型虫族
  worker_bug: {
    id: 'worker_bug',
    name: '工虫',
    faction: 'zerg',
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
    faction: 'zerg',
    category: 'bug',
    hp: 70,
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
  },

  // 远程虫族
  acid_spitter: {
    id: 'acid_spitter',
    name: '喷酸虫',
    faction: 'zerg',
    category: 'bug',
    hp: 55,
    armor: 10,
    speed: 7,
    visionRadius: 350,
    signalRadius: 2.0,
    targetRadius: 1.5,
    damage: 22,
    damageType: 'corrosion',
    attackRange: 350,
    attackCooldown: 18,
    spread: 0.06,
    exp: 30,
    loot: [
      { item: 'acid_gland', chance: 0.6, min: 1, max: 2 },
      { item: 'chitin_fragment', chance: 0.4, min: 1, max: 2 }
    ],
    aiType: 'bug_ranged',
    // Special: 攻击附带腐蚀效果（5秒，每秒5点伤害）
    desc: '能够喷射腐蚀性酸液的虫族远程单位，酸液会持续灼烧目标，对装甲造成持续伤害。'
  },

  // 飞行虫族
  flying_bug: {
    id: 'flying_bug',
    name: '飞虫',
    faction: 'zerg',
    category: 'bug',
    hp: 40,
    armor: 5,
    speed: 14,
    visionRadius: 400,
    signalRadius: 1.5,
    targetRadius: 1.0,
    damage: 12,
    damageType: 'kinetic',
    attackRange: 150,
    attackCooldown: 8,
    spread: 0.12,
    exp: 20,
    loot: [
      { item: 'bug_gel', chance: 0.4, min: 1, max: 1 },
      { item: 'chitin_fragment', chance: 0.3, min: 1, max: 1 }
    ],
    aiType: 'bug_swarm',
    // Special: 高速移动，体型小巧难以命中
    desc: '高速飞行的虫族单位，体型小巧难以命中，常用于骚扰和侦察。'
  },

  // 重型虫族
  beetle: {
    id: 'beetle',
    name: '甲壳虫',
    faction: 'zerg',
    category: 'bug',
    hp: 120,
    armor: 80,
    speed: 5,
    visionRadius: 250,
    signalRadius: 2.5,
    targetRadius: 2.0,
    damage: 15,
    damageType: 'kinetic',
    attackRange: 100,
    attackCooldown: 20,
    spread: 0.04,
    exp: 50,
    loot: [
      { item: 'carapace_plate', chance: 0.5, min: 1, max: 2 },
      { item: 'chitin_fragment', chance: 0.3, min: 1, max: 3 }
    ],
    aiType: 'bug_tank',
    // Special: 动能抗性+30%
    desc: '身披厚重甲壳的虫族重型单位，对动能攻击有天然抗性，是虫族的前线肉盾。'
  },

  // 跳跃虫族
  hopper: {
    id: 'hopper',
    name: '跳虫',
    faction: 'zerg',
    category: 'bug',
    hp: 45,
    armor: 8,
    speed: 16,
    visionRadius: 350,
    signalRadius: 2.0,
    targetRadius: 1.5,
    damage: 10,
    damageType: 'kinetic',
    attackRange: 50,
    attackCooldown: 6,
    spread: 0.10,
    exp: 25,
    loot: [
      { item: 'bug_gel', chance: 0.3, min: 1, max: 1 },
      { item: 'chitin_fragment', chance: 0.2, min: 1, max: 1 }
    ],
    aiType: 'bug_charge',
    // Special: 可跳跃靠近（瞬间接近100m），冷却15秒
    desc: '行动极为敏捷的虫族单位，能瞬间跃至敌人面前发起突袭，令人防不胜防。'
  },

  // 毒雾虫族
  toxic_bug: {
    id: 'toxic_bug',
    name: '毒雾虫',
    faction: 'zerg',
    category: 'bug',
    hp: 80,
    armor: 20,
    speed: 6,
    visionRadius: 300,
    signalRadius: 2.0,
    targetRadius: 1.8,
    damage: 5,
    damageType: 'corrosion',
    attackRange: 200,
    attackCooldown: 25,
    spread: 0.05,
    exp: 45,
    loot: [
      { item: 'acid_gland', chance: 0.5, min: 1, max: 2 },
      { item: 'chitin_fragment', chance: 0.4, min: 1, max: 2 }
    ],
    aiType: 'bug_ranged',
    // Special: 释放毒雾（半径80m，持续10秒，每秒5点腐蚀伤害）
    desc: '释放致命毒雾的虫族单位，在战场上制造危险的腐蚀区域，持续削弱敌人。'
  },

  // Boss：巨型守卫虫
  giant_guardian: {
    id: 'giant_guardian',
    name: '巨型守卫虫',
    faction: 'zerg',
    category: 'bug',
    isBoss: true,
    hp: 500,
    armor: 150,
    speed: 4,
    visionRadius: 400,
    signalRadius: 3.0,
    targetRadius: 3.0,
    damage: 45,
    damageType: 'kinetic',
    attackRange: 120,
    attackCooldown: 15,
    spread: 0.03,
    exp: 500,
    loot: [
      { item: 'carapace_plate', chance: 1.0, min: 3, max: 5 },
      { item: 'giant_acid_gland', chance: 1.0, min: 1, max: 1 },
      { item: 'repair_kit_large', chance: 0.5, min: 1, max: 2 }
    ],
    creditReward: { min: 300, max: 500 },
    aiType: 'boss_guardian',
    // Special: 震地冲击（范围200m，伤害30+减速3秒，冷却25秒）
    // Phase 2（HP<50%）：攻速+30%，伤害+20%
    desc: '虫族巢穴的守护者，体型巨大，拥有毁灭性的地震冲击能力。受伤后会进入狂暴状态。'
  },

  // ===== 机械阵营（Mech Faction） =====
  // 侦察单位
  recon_probe: {
    id: 'recon_probe',
    name: '侦察探针',
    faction: 'mech',
    category: 'mech',
    hp: 35,
    armor: 10,
    speed: 15,
    visionRadius: 500,
    signalRadius: 2.0,
    targetRadius: 1.0,
    damage: 8,
    damageType: 'thermal',
    attackRange: 400,
    attackCooldown: 10,
    spread: 0.06,
    exp: 25,
    loot: [
      { item: 'mech_parts', chance: 0.4, min: 1, max: 2 },
      { item: 'energy_core_remnant', chance: 0.2, min: 1, max: 1 }
    ],
    aiType: 'mech_scout',
    // Special: 视野范围大（500m），发现玩家后召唤附近机械
    desc: '机械阵营的侦察单位，视野极广，发现敌人后能召唤友军支援，是机械阵地的眼线。'
  },

  // 固定炮台
  defense_node: {
    id: 'defense_node',
    name: '防御节点',
    faction: 'mech',
    category: 'mech',
    hp: 150,
    armor: 60,
    speed: 0,
    visionRadius: 400,
    signalRadius: 2.5,
    targetRadius: 2.0,
    damage: 25,
    damageType: 'thermal',
    attackRange: 500,
    attackCooldown: 12,
    spread: 0.04,
    exp: 60,
    loot: [
      { item: 'mech_parts', chance: 0.6, min: 2, max: 3 },
      { item: 'alloy_fragment', chance: 0.3, min: 1, max: 2 }
    ],
    aiType: 'mech_turret',
    // Special: 不可移动，射程远，精度高
    desc: '固定式防御炮台，射程远精度高，是机械阵地的核心防线，无法移动但火力凶猛。'
  },

  // 离子哨兵
  particle_sentry: {
    id: 'particle_sentry',
    name: '粒子束哨兵',
    faction: 'mech',
    category: 'mech',
    hp: 100,
    armor: 40,
    speed: 8,
    visionRadius: 350,
    signalRadius: 2.0,
    targetRadius: 1.8,
    damage: 30,
    damageType: 'ion',
    attackRange: 350,
    attackCooldown: 14,
    spread: 0.05,
    exp: 55,
    loot: [
      { item: 'mech_parts', chance: 0.5, min: 1, max: 2 },
      { item: 'germanite_shard', chance: 0.3, min: 1, max: 1 }
    ],
    aiType: 'mech_sentry',
    // Special: 离子伤害，命中后降低目标能量恢复
    desc: '装备离子武器的机械哨兵，攻击能干扰目标的能量系统，削弱敌人的持续作战能力。'
  },

  // 自修复守卫
  self_repair_guardian: {
    id: 'self_repair_guardian',
    name: '自修复守卫',
    faction: 'mech',
    category: 'mech',
    hp: 200,
    armor: 80,
    speed: 6,
    visionRadius: 300,
    signalRadius: 3.0,
    targetRadius: 2.5,
    damage: 20,
    damageType: 'thermal',
    attackRange: 300,
    attackCooldown: 16,
    spread: 0.04,
    exp: 80,
    loot: [
      { item: 'mech_parts', chance: 0.6, min: 2, max: 4 },
      { item: 'energy_core_remnant', chance: 0.3, min: 1, max: 2 }
    ],
    aiType: 'mech_repair',
    // Special: 脱战5秒后每秒恢复5点HP
    desc: '拥有自我修复能力的机械守卫，脱离战斗后能快速恢复，需要集中火力迅速击破。'
  },

  // 重力控制器
  gravity_distorter: {
    id: 'gravity_distorter',
    name: '重力扭曲器',
    faction: 'mech',
    category: 'mech',
    hp: 130,
    armor: 50,
    speed: 7,
    visionRadius: 300,
    signalRadius: 2.5,
    targetRadius: 2.0,
    damage: 18,
    damageType: 'shock',
    attackRange: 250,
    attackCooldown: 20,
    spread: 0.05,
    exp: 70,
    loot: [
      { item: 'mech_parts', chance: 0.5, min: 1, max: 3 },
      { item: 'germanite_shard', chance: 0.2, min: 1, max: 1 }
    ],
    aiType: 'mech_controller',
    // Special: 范围减速场（半径150m，速度-30%）
    desc: '搭载重力场发生器的机械单位，能制造减速场限制敌人行动，是机械阵营的控场核心。'
  },

  // Boss：守护者巨像
  colossus_guardian: {
    id: 'colossus_guardian',
    name: '守护者巨像',
    faction: 'mech',
    category: 'mech',
    isBoss: true,
    hp: 800,
    armor: 200,
    speed: 3,
    visionRadius: 500,
    signalRadius: 4.0,
    targetRadius: 4.0,
    damage: 60,
    damageType: 'thermal',
    attackRange: 450,
    attackCooldown: 18,
    spread: 0.02,
    exp: 800,
    loot: [
      { item: 'alloy_fragment', chance: 1.0, min: 3, max: 5 },
      { item: 'ancient_core', chance: 1.0, min: 1, max: 1 },
      { item: 'energy_battery_large', chance: 0.5, min: 1, max: 2 }
    ],
    creditReward: { min: 500, max: 800 },
    aiType: 'boss_colossus',
    // Special: 护盾再生（每30秒恢复100护盾值，二阶段缩短至20秒）
    // Special: 粒子束轰炸（范围300m，伤害80，冷却30秒）
    // Phase 2（HP<50%）：激活高能模式，攻击附带离子伤害
    desc: '远古科技打造的巨型战争机器，拥有护盾再生和粒子束轰炸等毁灭性武器，是机械遗迹的终极守护者。'
  },
};