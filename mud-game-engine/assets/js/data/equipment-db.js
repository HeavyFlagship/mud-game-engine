// ========== 装备数据库（按设计文档定义） ==========
const EquipmentDB = {
  // ===== 武器类 =====
  '75mm_cannon': {
    id: '75mm_cannon', name: '75mm火炮', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '火炮',
    weight: 800, cargoVolume: 0.5, price: 5000,
    interfaceReq: ['外部', '弹药管道', '数据', '电源', '界面'],
    equipVolume: 1.2, powerReq: 10, computeReq: 5, bayReq: 0.5,
    startupReq: null, cooldown: 8, potential: 2,
    // 兼容旧系统
    damage: 120, damageType: 'kinetic', damageVariance: 10,
    range: 600, optimalRange: 200, minRange: 0, spread: 0.003,
    baseAccuracy: 0.85, armorPen: 0.6, energyCost: 0,
    // 新功能属性
    damageTable: { kinetic: 120, thermal: 10 }, damageRange: 0,
    magazine: 30, ammoPerShot: 1, energyPerShot: 0,
    desc: '中程动能武器，弹药消耗稳定，单发伤害高。'
  },
  'railgun_mk1': {
    id: 'railgun_mk1', name: '电磁轨道炮', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '电磁炮',
    weight: 1200, cargoVolume: 0.8, price: 12000,
    interfaceReq: ['外部', '弹药管道', '数据', '电源', '界面'],
    equipVolume: 1.8, powerReq: 25, computeReq: 15, bayReq: 0.8,
    startupReq: { type: '能量', amount: 30 }, cooldown: 12, potential: 3,
    damage: 200, damageType: 'kinetic', damageVariance: 20,
    range: 800, optimalRange: 300, minRange: 0, spread: 0.001,
    baseAccuracy: 0.9, armorPen: 0.8, energyCost: 30,
    damageTable: { kinetic: 200, thermal: 20 }, damageRange: 0,
    magazine: 20, ammoPerShot: 1, energyPerShot: 30,
    desc: '磁轨加速弹丸，弹速极高，远距离精度衰减小。'
  },
  'ion_projector': {
    id: 'ion_projector', name: '离子投射炮', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '离子炮',
    weight: 600, cargoVolume: 0.4, price: 8000,
    interfaceReq: ['外部', '离子管道', '数据', '电源', '界面'],
    equipVolume: 1.0, powerReq: 8, computeReq: 8, bayReq: 0.4,
    startupReq: { type: '离子', amount: 15 }, cooldown: 6, potential: 2,
    damage: 80, damageType: 'ion', damageVariance: 8,
    range: 400, optimalRange: 150, minRange: 0, spread: 0.002,
    baseAccuracy: 0.88, armorPen: 0.3, energyCost: 0,
    damageTable: { ion: 80 }, damageRange: 0,
    magazine: 0, ammoPerShot: 0, energyPerShot: 0,
    desc: '发射带电粒子束，对高电子化目标效果显著。'
  },
  'pulse_laser_mk2': {
    id: 'pulse_laser_mk2', name: '脉冲激光炮', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '激光炮',
    weight: 500, cargoVolume: 0.3, price: 15000,
    interfaceReq: ['外部', '电源', '数据', '界面'],
    equipVolume: 0.8, powerReq: 40, computeReq: 10, bayReq: 0.3,
    startupReq: { type: '能量', amount: 60 }, cooldown: 15, potential: 3,
    damage: 150, damageType: 'thermal', damageVariance: 15,
    range: 1000, optimalRange: 400, minRange: 0, spread: 0,
    baseAccuracy: 0.95, armorPen: 0.4, energyCost: 60,
    damageTable: { thermal: 150 }, damageRange: 0,
    magazine: 0, ammoPerShot: 0, energyPerShot: 60,
    desc: '定向能量束，即时命中无需预判，射程极远。'
  },
  'missile_pod_small': {
    id: 'missile_pod_small', name: '小型导弹发射器', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '导弹',
    weight: 400, cargoVolume: 0.4, price: 10000,
    interfaceReq: ['外部', '弹药管道', '数据', '界面'],
    equipVolume: 1.0, powerReq: 5, computeReq: 10, bayReq: 0.4,
    startupReq: null, cooldown: 20, potential: 2,
    damage: 180, damageType: 'explosive', damageVariance: 20,
    range: 1000, optimalRange: 0, minRange: 30, spread: 0,
    baseAccuracy: 0.92, armorPen: 0.5, energyCost: 0,
    damageTable: { explosive: 180 }, damageRange: 15,
    magazine: 0, ammoPerShot: 1, energyPerShot: 0,
    flightSpeed: 200, flightTime: 5, launchBay: 8, launchCount: 1,
    desc: '自推进战斗部，追踪能力命中率高，范围爆炸适合集群目标。'
  },
  'melee_cutter': {
    id: 'melee_cutter', name: '机械臂切割器', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '近战',
    weight: 300, cargoVolume: 0.2, price: 3000,
    interfaceReq: ['外部', '电源', '数据', '界面'],
    equipVolume: 0.6, powerReq: 3, computeReq: 2, bayReq: 0.2,
    startupReq: { type: '能量', amount: 5 }, cooldown: 3, potential: 1,
    damage: 80, damageType: 'kinetic', damageVariance: 8,
    range: 15, optimalRange: 0, minRange: 0, spread: 0,
    baseAccuracy: 0.98, armorPen: 0.3, energyCost: 5,
    damageTable: { kinetic: 80 }, damageRange: 0,
    magazine: 0, ammoPerShot: 0, energyPerShot: 5,
    desc: '改装的机械臂切割工具，攻速快，对装甲破坏显著。'
  },

  // ===== 电子战设备类 =====
  'battle_scan_radar': {
    id: 'battle_scan_radar', name: '战场扫描雷达', type: 'ew', slot: 'ew',
    category: 'ew', subCategory: '雷达',
    weight: 200, cargoVolume: 0.2, price: 4000,
    interfaceReq: ['外部', '数据', '电源', '界面'],
    equipVolume: 0.5, powerReq: 5, computeReq: 15, bayReq: 0.2,
    startupReq: null, cycle: '持续', potential: 2,
    scanRange: 500, scanAccuracy: 0.1, jamResist: 0.2,
    desc: '扫描半径500m，提供目标方向标记。'
  },
  'vision_enhancer': {
    id: 'vision_enhancer', name: '视觉增强模块', type: 'ew', slot: 'ew',
    category: 'ew', subCategory: '视觉增强',
    weight: 50, cargoVolume: 0.05, price: 2000,
    interfaceReq: ['外部', '数据', '电源', '界面'],
    equipVolume: 0.2, powerReq: 2, computeReq: 3, bayReq: 0.05,
    startupReq: null, cycle: '持续', potential: 1,
    visionBonus: 200,
    desc: '增加视野范围200m，可显示敌人确切目标。'
  },
  'fire_control_radar': {
    id: 'fire_control_radar', name: '火控雷达系统', type: 'ew', slot: 'ew',
    category: 'ew', subCategory: '火控雷达',
    weight: 300, cargoVolume: 0.3, price: 6000,
    interfaceReq: ['外部', '数据', '电源', '界面'],
    equipVolume: 0.6, powerReq: 8, computeReq: 20, bayReq: 0.3,
    startupReq: { type: '能量', amount: 20 }, cycle: '持续', potential: 2,
    scanRange: 800, scanAccuracy: 1.0, jamResist: 0.3, trackDuration: 5,
    desc: '提供视距外引导，可为火炮提供视距外引导。'
  },
  'radar_jammer': {
    id: 'radar_jammer', name: '雷达干扰器', type: 'ew', slot: 'ew',
    category: 'ew', subCategory: '干扰器',
    weight: 250, cargoVolume: 0.25, price: 5000,
    interfaceReq: ['外部', '数据', '电源', '界面'],
    equipVolume: 0.5, powerReq: 15, computeReq: 10, bayReq: 0.25,
    startupReq: { type: '能量', amount: 30 }, cycle: '持续', potential: 2,
    jamRange: 300, jamStrength: 2.0,
    desc: '干扰半径300m，降低敌方雷达精度。'
  },
  'flash_device': {
    id: 'flash_device', name: '强光闪光器', type: 'ew', slot: 'ew',
    category: 'ew', subCategory: '闪光器',
    weight: 100, cargoVolume: 0.1, price: 2500,
    interfaceReq: ['外部', '数据', '电源', '界面'],
    equipVolume: 0.3, powerReq: 3, computeReq: 2, bayReq: 0.1,
    startupReq: { type: '能量', amount: 15 }, cycle: 5, potential: 1,
    effectRange: 100, effectDuration: 3,
    desc: '闪光半径100m，致盲敌方视觉增强设备。'
  },

  // ===== 装甲类 =====
  'standard_armor_plate': {
    id: 'standard_armor_plate', name: '标准装甲板', type: 'armor', slot: 'armor',
    category: 'armor', subCategory: '装甲板',
    weight: 600, cargoVolume: 0.4, price: 2000,
    interfaceReq: ['外部', '界面'],
    equipVolume: 2.0, powerReq: 0, computeReq: 0, bayReq: 0.4,
    startupReq: null, cycle: '持续', potential: 2,
    armorValue: 200, kinResist: 0, thermResist: 0, shockResist: 0,
    desc: '基础防护，提供装甲值200。'
  },
  'kin_liner_armor': {
    id: 'kin_liner_armor', name: '动能内衬装甲', type: 'armor', slot: 'armor',
    category: 'armor', subCategory: '内衬装甲',
    weight: 400, cargoVolume: 0.3, price: 3500,
    interfaceReq: ['内部', '界面'],
    equipVolume: 1.5, powerReq: 0, computeReq: 0, bayReq: 0.3,
    startupReq: null, cycle: '持续', potential: 1,
    armorValue: 0, kinResist: 0.15, thermResist: 0, shockResist: 0,
    desc: '不增加装甲值，但降低动能伤害15%。'
  },
  'energy_liner_armor': {
    id: 'energy_liner_armor', name: '能量内衬装甲', type: 'armor', slot: 'armor',
    category: 'armor', subCategory: '内衬装甲',
    weight: 350, cargoVolume: 0.25, price: 3000,
    interfaceReq: ['内部', '界面'],
    equipVolume: 1.2, powerReq: 0, computeReq: 0, bayReq: 0.25,
    startupReq: null, cycle: '持续', potential: 1,
    armorValue: 0, kinResist: 0, thermResist: 0.15, shockResist: 0,
    desc: '不增加装甲值，但降低热能伤害15%。'
  },
  'adaptive_armor': {
    id: 'adaptive_armor', name: '自适应装甲', type: 'armor', slot: 'armor',
    category: 'armor', subCategory: '自适应装甲',
    weight: 800, cargoVolume: 0.6, price: 15000,
    interfaceReq: ['外部', '数据', '电源', '界面'],
    equipVolume: 2.5, powerReq: 10, computeReq: 5, bayReq: 0.6,
    startupReq: { type: '能量', amount: 20 }, cycle: '持续', potential: 3,
    armorValue: 150, kinResist: 0, thermResist: 0, shockResist: 0,
    dynamicResist: 0.5,
    desc: '动态分配50%伤害减免，切换延迟1s。'
  },
  'self_repair_armor': {
    id: 'self_repair_armor', name: '自修复装甲', type: 'armor', slot: 'armor',
    category: 'armor', subCategory: '自修复装甲',
    weight: 700, cargoVolume: 0.5, price: 10000,
    interfaceReq: ['内部', '电源', '数据', '界面'],
    equipVolume: 2.0, powerReq: 5, computeReq: 3, bayReq: 0.5,
    startupReq: { type: '能量', amount: 10 }, cycle: 5, potential: 2,
    armorValue: 100, kinResist: 0, thermResist: 0, shockResist: 0,
    repairAmount: 10,
    desc: '脱战状态每秒恢复装甲值10点。'
  },

  // ===== 生成器类 =====
  'ion_generator': {
    id: 'ion_generator', name: '离子发生器', type: 'generator', slot: 'generator',
    category: 'generator', subCategory: '离子',
    weight: 500, cargoVolume: 0.4, price: 8000,
    interfaceReq: ['离子管道', '电源', '数据', '界面'],
    equipVolume: 1.0, powerReq: 15, computeReq: 5, bayReq: 0.4,
    startupReq: null, cycle: 5, potential: 2,
    generateAmount: 2, materialBay: 500, materialCost: 0.1,
    desc: '每秒产生离子2点。'
  },

  // ===== 容器类 =====
  'standard_capacitor': {
    id: 'standard_capacitor', name: '标准电容器', type: 'container', slot: 'container',
    category: 'container', subCategory: '电容器',
    weight: 300, cargoVolume: 0.2, price: 4000,
    interfaceReq: ['内部', '电源', '界面'],
    equipVolume: 0.6, powerReq: 5, computeReq: 2, bayReq: 0.2,
    startupReq: null, cycle: '持续', potential: 2,
    capacity: 40, chargeCoeff: 0.2, containerType: 'energy',
    desc: '能量容量40MJ，充能系数0.2。'
  },
  'large_capacitor': {
    id: 'large_capacitor', name: '大型电容器', type: 'container', slot: 'container',
    category: 'container', subCategory: '电容器',
    weight: 600, cargoVolume: 0.4, price: 8000,
    interfaceReq: ['内部', '电源', '界面'],
    equipVolume: 1.0, powerReq: 10, computeReq: 3, bayReq: 0.4,
    startupReq: null, cycle: '持续', potential: 3,
    capacity: 80, chargeCoeff: 0.25, containerType: 'energy',
    desc: '能量容量80MJ，充能系数0.25。'
  },
  'ion_container': {
    id: 'ion_container', name: '离子容器', type: 'container', slot: 'container',
    category: 'container', subCategory: '离子',
    weight: 400, cargoVolume: 0.3, price: 5000,
    interfaceReq: ['内部', '离子管道', '电源', '数据', '界面'],
    equipVolume: 0.8, powerReq: 3, computeReq: 2, bayReq: 0.3,
    startupReq: null, cycle: '持续', potential: 2,
    capacity: 150, containerType: 'ion',
    desc: '离子容量150克。'
  },
  'standard_fuel_tank': {
    id: 'standard_fuel_tank', name: '标准油箱', type: 'container', slot: 'container',
    category: 'container', subCategory: '燃料',
    weight: 500, cargoVolume: 0.5, price: 2000,
    interfaceReq: ['内部', '流体管道', '界面'],
    equipVolume: 0.6, powerReq: 0, computeReq: 0, bayReq: 0.5,
    startupReq: null, cycle: '持续', potential: 1,
    capacity: 300, containerType: 'fuel',
    desc: '燃料容量300升。'
  },

  // ===== 修复器类 =====
  'armor_repairer': {
    id: 'armor_repairer', name: '装甲修复器', type: 'repairer', slot: 'repairer',
    category: 'repairer', subCategory: '装甲修复器',
    weight: 400, cargoVolume: 0.3, price: 6000,
    interfaceReq: ['内部', '电源', '数据', '界面'],
    equipVolume: 1.0, powerReq: 8, computeReq: 5, bayReq: 0.3,
    startupReq: { type: '能量', amount: 10 }, cycle: 5, potential: 2,
    repairTarget: 'armor', repairAmount: 10,
    repairMaterial: '通用装甲熔铸剂', repairMaterialCost: 1,
    energyPerCycle: 5, inCombat: true,
    desc: '战斗中每秒恢复装甲值10点，消耗金属资源1单位/周期+能量5。'
  },
  'structure_repairer': {
    id: 'structure_repairer', name: '结构修复器', type: 'repairer', slot: 'repairer',
    category: 'repairer', subCategory: '结构修复器',
    weight: 600, cargoVolume: 0.5, price: 12000,
    interfaceReq: ['内部', '电源', '数据', '界面'],
    equipVolume: 1.5, powerReq: 15, computeReq: 8, bayReq: 0.5,
    startupReq: { type: '能量', amount: 20 }, cycle: 10, potential: 2,
    repairTarget: 'structure', repairAmount: 2,
    repairMaterial: '结构纳米修复剂', repairMaterialCost: 2,
    energyPerCycle: 10, inCombat: false,
    desc: '脱战状态每秒恢复结构值2点，战斗中不可用。'
  },

  // ===== 载具核心模块 =====
  'basic_core_computer': {
    id: 'basic_core_computer', name: '基础核心计算机', type: 'core', slot: 'coreComputer',
    category: 'core', subCategory: '计算机',
    weight: 100, cargoVolume: 0.1, price: 10000,
    interfaceReq: ['数据', '界面'],
    equipVolume: 0.3, powerReq: 0, computeReq: 0, bayReq: 0.1,
    startupReq: null, cycle: '持续', potential: 1,
    coreType: 'computer', coreOutput: 50,
    desc: '提供算力50 MFlops。'
  },
  'standard_core_computer': {
    id: 'standard_core_computer', name: '标准核心计算机', type: 'core', slot: 'coreComputer',
    category: 'core', subCategory: '计算机',
    weight: 150, cargoVolume: 0.15, price: 20000,
    interfaceReq: ['数据', '界面'],
    equipVolume: 0.4, powerReq: 0, computeReq: 0, bayReq: 0.15,
    startupReq: null, cycle: '持续', potential: 2,
    coreType: 'computer', coreOutput: 100,
    desc: '提供算力100 MFlops。'
  },
  'basic_core_power': {
    id: 'basic_core_power', name: '基础核心动力', type: 'core', slot: 'corePower',
    category: 'core', subCategory: '动力',
    weight: 200, cargoVolume: 0.2, price: 8000,
    interfaceReq: ['电源', '界面'],
    equipVolume: 0.5, powerReq: 0, computeReq: 0, bayReq: 0.2,
    startupReq: null, cycle: '持续', potential: 1,
    coreType: 'power', coreOutput: 50,
    desc: '提供功率50 kW。'
  },
  'standard_core_power': {
    id: 'standard_core_power', name: '标准核心动力', type: 'core', slot: 'corePower',
    category: 'core', subCategory: '动力',
    weight: 350, cargoVolume: 0.3, price: 15000,
    interfaceReq: ['电源', '界面'],
    equipVolume: 0.8, powerReq: 0, computeReq: 0, bayReq: 0.3,
    startupReq: null, cycle: '持续', potential: 2,
    coreType: 'power', coreOutput: 100,
    desc: '提供功率100 kW。'
  },
  'advanced_core_computer': {
    id: 'advanced_core_computer', name: '高级核心计算机', type: 'core', slot: 'coreComputer',
    category: 'core', subCategory: '计算机',
    weight: 200, cargoVolume: 0.2, price: 40000,
    interfaceReq: ['数据', '界面'],
    equipVolume: 0.6, powerReq: 0, computeReq: 0, bayReq: 0.25,
    startupReq: null, cycle: '持续', potential: 3,
    coreType: 'computer', coreOutput: 150,
    desc: '提供算力150 MFlops。'
  },
  'elite_core_computer': {
    id: 'elite_core_computer', name: '顶级核心计算机', type: 'core', slot: 'coreComputer',
    category: 'core', subCategory: '计算机',
    weight: 300, cargoVolume: 0.3, price: 80000,
    interfaceReq: ['数据', '界面'],
    equipVolume: 0.8, powerReq: 0, computeReq: 0, bayReq: 0.4,
    startupReq: null, cycle: '持续', potential: 4,
    coreType: 'computer', coreOutput: 250,
    desc: '提供算力250 MFlops。'
  },
  'advanced_core_power': {
    id: 'advanced_core_power', name: '高级核心动力', type: 'core', slot: 'corePower',
    category: 'core', subCategory: '动力',
    weight: 500, cargoVolume: 0.4, price: 30000,
    interfaceReq: ['电源', '界面'],
    equipVolume: 1.0, powerReq: 0, computeReq: 0, bayReq: 0.45,
    startupReq: null, cycle: '持续', potential: 3,
    coreType: 'power', coreOutput: 150,
    desc: '提供功率150 kW。'
  },
  'elite_core_power': {
    id: 'elite_core_power', name: '顶级核心动力', type: 'core', slot: 'corePower',
    category: 'core', subCategory: '动力',
    weight: 700, cargoVolume: 0.5, price: 60000,
    interfaceReq: ['电源', '界面'],
    equipVolume: 1.2, powerReq: 0, computeReq: 0, bayReq: 0.6,
    startupReq: null, cycle: '持续', potential: 4,
    coreType: 'power', coreOutput: 250,
    desc: '提供功率250 kW。'
  },

  // ===== 旧版兼容装备 =====
  'auto_cannon_mk1': {
    id: 'auto_cannon_mk1', name: 'MK-I 自动机炮', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '火炮',
    weight: 60, cargoVolume: 0.3, price: 200,
    interfaceReq: ['外部', '弹药管道', '数据', '电源', '界面'],
    equipVolume: 0.8, powerReq: 8, computeReq: 3, bayReq: 0.3,
    startupReq: null, cooldown: 10, potential: 1,
    damage: 18, damageType: 'kinetic', damageVariance: 4,
    range: 400, optimalRange: 200, minRange: 0, spread: 0.02,
    baseAccuracy: 0.82, armorPen: 0, energyCost: 0,
    damageTable: { kinetic: 18 }, damageRange: 0,
    magazine: 50, ammoPerShot: 1, energyPerShot: 0,
    desc: '20mm口径自动机炮，动能武器，射速稳定。'
  },
  'pulse_laser_mk1': {
    id: 'pulse_laser_mk1', name: 'MK-I 脉冲激光', type: 'weapon', slot: 'weapon',
    category: 'weapon', subCategory: '激光炮',
    weight: 45, cargoVolume: 0.2, price: 350,
    interfaceReq: ['外部', '电源', '数据', '界面'],
    equipVolume: 0.5, powerReq: 12, computeReq: 5, bayReq: 0.2,
    startupReq: { type: '能量', amount: 15 }, cooldown: 12, potential: 1,
    damage: 12, damageType: 'thermal', damageVariance: 2,
    range: 600, optimalRange: 350, minRange: 0, spread: 0.008,
    baseAccuracy: 0.9, armorPen: 0.4, energyCost: 15,
    damageTable: { thermal: 12 }, damageRange: 0,
    magazine: 0, ammoPerShot: 0, energyPerShot: 15,
    desc: '低功率脉冲激光武器，能量消耗较高，但精度好。'
  },
  'light_alloy_plate': {
    id: 'light_alloy_plate', name: '轻型合金装甲板', type: 'armor', slot: 'armor',
    category: 'armor', subCategory: '装甲板',
    weight: 80, cargoVolume: 0.3, price: 150,
    interfaceReq: ['外部', '界面'],
    equipVolume: 1.2, powerReq: 0, computeReq: 0, bayReq: 0.3,
    startupReq: null, cycle: '持续', potential: 1,
    armorValue: 80, kinResist: 0, thermResist: 0, shockResist: 0,
    desc: '标准型轻质合金装甲板，提供基础防护。'
  },

  // ===== 查询方法 =====
  get(id) {
    return this[id] ? { ...this[id] } : null;
  },

  getByCategory(category) {
    const result = [];
    for (const key of Object.keys(this)) {
      const item = this[key];
      if (item && typeof item === 'object' && item.category === category) {
        result.push({ ...item });
      }
    }
    return result;
  },

  getAll() {
    const result = [];
    for (const key of Object.keys(this)) {
      const item = this[key];
      if (item && typeof item === 'object' && item.id) {
        result.push({ ...item });
      }
    }
    return result;
  },

  findByName(name) {
    for (const key of Object.keys(this)) {
      const item = this[key];
      if (item && typeof item === 'object' && item.id && item.name === name) {
        return { ...item };
      }
    }
    return null;
  }
};
