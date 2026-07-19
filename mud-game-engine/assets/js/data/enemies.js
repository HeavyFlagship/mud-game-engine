// ========== 敌人数据库 ==========
// 时间轴战斗系统专用格式
// loot: [{ item, chance, min, max }] - item 为物品 id，显示时从 ItemDB 取 name
const EnemyDB = {
  // ===== 原版敌人（保留，用于旧地图兼容） =====
  slime:         { id:'slime',         name:'史莱姆',       hp:30,   atk:5,  def:2,  exp:10,  gold:5,   drops:[['hp_small',0.5]], level:1 },
  bat:           { id:'bat',           name:'巨型蝙蝠',     hp:40,   atk:8,  def:3,  exp:15,  gold:8,   drops:[['hp_small',0.3]], level:1 },
  goblin:        { id:'goblin',        name:'哥布林',       hp:60,   atk:12, def:5,  exp:25,  gold:15,  drops:[['hp_small',0.4],['leather_armor',0.1]], level:2 },
  skeleton:      { id:'skeleton',      name:'骷髅战士',     hp:90,   atk:16, def:8,  exp:40,  gold:25,  drops:[['iron_sword',0.08],['hp_medium',0.3]], level:3 },
  wolf:          { id:'wolf',          name:'暗影狼',       hp:80,   atk:20, def:6,  exp:35,  gold:20,  drops:[['leather_armor',0.1]], level:3 },
  orc:           { id:'orc',           name:'兽人武士',     hp:150,  atk:25, def:14, exp:65,  gold:40,  drops:[['chain_mail',0.08],['hp_medium',0.4]], level:5 },
  dark_mage:     { id:'dark_mage',     name:'暗黑法师',     hp:100,  atk:35, def:8,  exp:80,  gold:50,  drops:[['mp_medium',0.5],['ring_atk',0.05]], level:6, canMagic:true },
  stone_golem:   { id:'stone_golem',   name:'石头傀儡',     hp:250,  atk:20, def:25, exp:100, gold:60,  drops:[['plate_armor',0.05],['hp_large',0.3]], level:7 },
  vampire:       { id:'vampire',        name:'吸血鬼',       hp:180,  atk:32, def:12, exp:120, gold:80,  drops:[['shadow_dagger',0.05],['ring_hp',0.08]], level:8, canDrain:true },
  wyvern:        { id:'wyvern',        name:'双足飞龙',     hp:300,  atk:40, def:20, exp:180, gold:120, drops:[['steel_blade',0.08],['hp_large',0.4]], level:10 },
  lich:          { id:'lich',          name:'巫妖',         hp:350,  atk:50, def:18, exp:250, gold:200, drops:[['flame_sword',0.05],['mystic_robe',0.06],['crystal',0.2]], level:12, canMagic:true },
  dragon:        { id:'dragon',        name:'远古巨龙',     hp:800,  atk:65, def:35, exp:500, gold:500, drops:[['dragon_slay',0.08],['dragon_fang',0.3]], level:15, isBoss:true },

  // ===== 时间轴战斗系统敌人 =====
  // category: bug/npc/machine - 影响 AI 行为
  // speed: 行动速度（越小越快）
  // visionRadius: 视野范围（米）
  // signalRadius: 信号范围（影响警觉传播）
  // targetRadius: 接敌距离（米）
  // damage/damageType: 攻击伤害与类型
  // attackRange: 攻击射程（米）
  // attackCooldown: 攻击冷却（tick）
  // spread: 散布精度（0=完美，越大越不准）
  // aiType: AI 行为类型
  // loot: [{ item, chance, min, max }] - 战利品
  worker_bug: {
    id: 'worker_bug',
    name: '工虫',
    category: 'bug',
    hp: 60,
    armor: 10,
    speed: 12,
    visionRadius: 300,
    signalRadius: 1.5,
    targetRadius: 1.5,
    damage: 12,
    damageType: 'kinetic',
    attackRange: 150,
    attackCooldown: 15,
    spread: 0.1,
    exp: 20,
    loot: [
      { item: 'chitin_fragment', chance: 0.7, min: 1, max: 3 }
    ],
    aiType: 'bug_worker',
    desc: '虫族的基础单位，负责巢穴维护与资源搬运，遇到威胁会发出警报并撤退。'
  },
  assault_bug: {
    id: 'assault_bug',
    name: '突击虫',
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
  acid_spitter: {
    id: 'acid_spitter',
    name: '酸液虫',
    category: 'bug',
    hp: 50,
    armor: 15,
    speed: 14,
    visionRadius: 400,
    signalRadius: 1.8,
    targetRadius: 2.0,
    damage: 22,
    damageType: 'corrosive',
    attackRange: 300,
    attackCooldown: 18,
    spread: 0.08,
    exp: 40,
    loot: [
      { item: 'acid_gland', chance: 0.6, min: 1, max: 2 },
      { item: 'chitin_fragment', chance: 0.5, min: 1, max: 2 }
    ],
    aiType: 'bug_ranged',
    desc: '远程酸液攻击单位，能在较远距离喷吐腐蚀性液体，对装甲有破坏作用。'
  },
  sentinel_drone: {
    id: 'sentinel_drone',
    name: '哨兵无人机',
    category: 'machine',
    hp: 80,
    armor: 20,
    speed: 8,
    visionRadius: 500,
    signalRadius: 3.0,
    targetRadius: 2.0,
    damage: 15,
    damageType: 'kinetic',
    attackRange: 350,
    attackCooldown: 10,
    spread: 0.03,
    exp: 50,
    loot: [
      { item: 'circuit_board', chance: 0.7, min: 1, max: 2 },
      { item: 'power_cell', chance: 0.4, min: 1, max: 1 }
    ],
    aiType: 'drone_patrol',
    desc: '自动化巡逻无人机，装备轻型自动武器，视野宽广，发现目标后会持续追击。'
  },
};
