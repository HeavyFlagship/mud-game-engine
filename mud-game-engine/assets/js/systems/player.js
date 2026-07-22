// ========== 玩家系统（载具模式 + 装备系统） ==========
const Player = {
  name: '先遣队员',
  vehicleId: 'scout',
  room: 'outpost_hub',
  position: [500, 500],
  facing: 0,
  hp: 200,
  maxHp: 200,
  armor: 80,
  maxArmor: 80,
  speed: 12,
  energy: 200,
  maxEnergy: 200,
  energyRegen: 5,
  visionRadius: 200,
  signalRadius: 2.5,
  targetRadius: 2.0,
  power: 150,
  compute: 80,
  weight: 1200,
  overweightCoeff: 1.5,

  // 装备槽位（兼容旧系统：primary/secondary/armor）
  equipment: {
    primary: null,
    secondary: null,
    armor: null,
    ew1: null,
    ew2: null,
    generator: null,
    container1: null,
    container2: null,
    repairer: null,
    coreComputer: null,
    corePower: null
  },

  weaponCooldowns: {
    primary: 0,
    secondary: 0
  },

  // 资源管理
  resources: {
    energy: 0,
    maxEnergy: 0,
    ion: 0,
    maxIon: 0,
    fuel: 0,
    maxFuel: 0
  },

  // 预算管理（功率/算力/装备舱）
  budget: {
    powerUsed: 0,
    powerMax: 0,
    computeUsed: 0,
    computeMax: 0,
    bayUsed: 0,
    bayMax: 0
  },

  // 弹药库存
  ammo: {
    '20mm_ap': 200,
    'railgun_slug': 50,
    'ion_charge': 100,
    'missile_he': 20
  },

  inventory: [],
  skills: [],
  visitedRooms: new Set(),
  statusEffects: [],
  killCount: {},
  stats: { totalDmg:0, totalHeal:0, monstersKilled:0, deaths:0 },
  gold: 10000,
  level: 1,
  exp: 0,
  expToNext: 50,

  get atk() {
    let base = 0;
    if (this.equipment.primary && this.equipment.primary.damage) {
      base = this.equipment.primary.damage;
    }
    return base;
  },

  get def() {
    let d = 0;
    if (this.equipment.armor && this.equipment.armor.armorValue) {
      d += this.equipment.armor.armorValue;
    }
    return d;
  },

  get currentSpeed() {
    const room = MapSystem.getRoom(this.room);
    let penalty = 1.0;
    if (room && room.battlefield && room.battlefield.terrainPenalty) {
      const chassis = this.getChassisType();
      if (room.battlefield.terrainPenalty[chassis] !== undefined) {
        penalty = room.battlefield.terrainPenalty[chassis];
      }
    }
    let speed = this.speed * penalty;
    for (const eff of this.statusEffects) {
      if (eff.type === 'slow') speed *= (1 - eff.value);
    }
    return Math.max(0.5, speed);
  },

  getChassisType() {
    const v = VehicleDB[this.vehicleId];
    return v ? v.chassis : 'biped';
  },

  init() {
    const vehicle = VehicleDB.scout;
    if (vehicle) {
      this.vehicleId = vehicle.id;
      this.maxHp = vehicle.maxHp;
      this.hp = vehicle.maxHp;
      this.maxArmor = vehicle.maxArmor;
      this.armor = vehicle.maxArmor;
      this.speed = vehicle.maxSpeed;
      this.visionRadius = vehicle.visionRadius;
      this.signalRadius = vehicle.signalRadius;
      this.targetRadius = vehicle.targetRadius;
      this.power = vehicle.power;
      this.compute = vehicle.compute;
      this.weight = vehicle.weight;
      this.overweightCoeff = vehicle.overweightCoeff;
      this.maxEnergy = vehicle.energyCapacity;
      this.energy = vehicle.energyCapacity;
      this.energyRegen = vehicle.energyRegen;
      // 设置预算基准
      this.budget.powerMax = vehicle.power;
      this.budget.computeMax = vehicle.compute;
      this.budget.bayMax = vehicle.equipmentBay || 10;
    }

    // 安装默认核心模块（核心模块不占用预算，而是增加预算上限）
    const coreComputer = EquipmentDB.get('basic_core_computer');
    const corePower = EquipmentDB.get('basic_core_power');
    if (coreComputer) {
      this.equipment.coreComputer = { ...coreComputer };
      this.budget.computeMax += coreComputer.coreOutput || 0;
      Msg.success(`安装了 ${coreComputer.name}，算力上限+${coreComputer.coreOutput}`);
    }
    if (corePower) {
      this.equipment.corePower = { ...corePower };
      this.budget.powerMax += corePower.coreOutput || 0;
      Msg.success(`安装了 ${corePower.name}，功率上限+${corePower.coreOutput}`);
    }

    // 安装默认武器和装甲
    if (vehicle && vehicle.defaultWeapons && vehicle.defaultWeapons[0]) {
      this.installEquipment(vehicle.defaultWeapons[0], 'primary');
    }
    if (vehicle && vehicle.defaultArmor && vehicle.defaultArmor[0]) {
      this.installEquipment(vehicle.defaultArmor[0], 'armor');
    }

    this.inventory.push({ id:'repair_kit_small', count:2 });
    this.inventory.push({ id:'armor_patch', count:2 });
    this.recalcResources();
  },

  // ===== 装备安装系统 =====

  // 槽位与装备类型的映射
  slotTypeMap: {
    primary: 'weapon',
    secondary: 'weapon',
    armor: 'armor',
    ew1: 'ew',
    ew2: 'ew',
    generator: 'generator',
    container1: 'container',
    container2: 'container',
    repairer: 'repairer',
    coreComputer: 'core',
    corePower: 'core'
  },

  installEquipment(equipId, slot) {
    const equip = EquipmentDB.get(equipId);
    if (!equip) {
      Msg.error(`装备 ${equipId} 不存在。`);
      return false;
    }

    // 检查槽位类型匹配
    const expectedType = this.slotTypeMap[slot];
    if (!expectedType || equip.category !== expectedType) {
      if (!(slot === 'primary' || slot === 'secondary') || equip.category !== 'weapon') {
        Msg.error(`${equip.name} 不能安装到 ${slot} 槽位。`);
        return false;
      }
    }

    // 如果槽位已有装备，先卸载
    if (this.equipment[slot]) {
      this.uninstallEquipment(slot, false);
    }

    // 检查预算
    const check = this.checkBudget(equip);
    if (!check.ok) {
      Msg.error(`预算不足，无法安装 ${equip.name}：${check.reason}`);
      return false;
    }

    // 安装
    this.equipment[slot] = { ...equip };
    if (slot === 'primary' || slot === 'secondary') {
      this.weaponCooldowns[slot] = 0;
    }
    this.recalcBudget();
    this.recalcResources();
    Msg.success(`安装了 ${equip.name} 到 ${this.getSlotName(slot)} 槽位！`);
    return true;
  },

  uninstallEquipment(slot, toInventory = true) {
    const equip = this.equipment[slot];
    if (!equip) return false;

    if (toInventory) {
      this.addItem(equip.id);
    }
    this.equipment[slot] = null;
    this.recalcBudget();
    this.recalcResources();
    Msg.info(`从 ${this.getSlotName(slot)} 槽位卸载了 ${equip.name}。`);
    return true;
  },

  getSlotName(slot) {
    const names = {
      primary: '主武器', secondary: '副武器', armor: '装甲',
      ew1: '电子战1', ew2: '电子战2',
      generator: '生成器', container1: '容器1', container2: '容器2',
      repairer: '修复器', coreComputer: '核心计算机', corePower: '核心动力'
    };
    return names[slot] || slot;
  },

  checkBudget(equip) {
    const used = this.calcUsedBudget();
    const newPower = used.power + (equip.powerReq || 0);
    const newCompute = used.compute + (equip.computeReq || 0);
    const newBay = used.bay + (equip.bayReq || 0);

    if (newPower > this.budget.powerMax) {
      return { ok: false, reason: `功率不足（需要${equip.powerReq}kW，剩余${this.budget.powerMax - used.power}kW）` };
    }
    if (newCompute > this.budget.computeMax) {
      return { ok: false, reason: `算力不足（需要${equip.computeReq}MFlops，剩余${this.budget.computeMax - used.compute}MFlops）` };
    }
    if (newBay > this.budget.bayMax) {
      return { ok: false, reason: `装备舱不足（需要${equip.bayReq}m³，剩余${this.budget.bayMax - used.bay}m³）` };
    }
    return { ok: true };
  },

  calcUsedBudget() {
    let power = 0, compute = 0, bay = 0;
    for (const key of Object.keys(this.equipment)) {
      const e = this.equipment[key];
      if (e) {
        power += e.powerReq || 0;
        compute += e.computeReq || 0;
        bay += e.bayReq || 0;
      }
    }
    return { power, compute, bay };
  },

  recalcBudget() {
    const used = this.calcUsedBudget();
    this.budget.powerUsed = used.power;
    this.budget.computeUsed = used.compute;
    this.budget.bayUsed = used.bay;
  },

  recalcResources() {
    // 从载具基础值开始
    const vehicle = VehicleDB[this.vehicleId];
    let maxEnergy = vehicle ? vehicle.energyCapacity : 0;
    let maxIon = 0;
    let maxFuel = 0;

    // 叠加容器容量
    for (const key of ['container1', 'container2']) {
      const c = this.equipment[key];
      if (c && c.category === 'container') {
        if (c.containerType === 'energy' && c.capacity) {
          maxEnergy += c.capacity;
        } else if (c.containerType === 'ion' && c.capacity) {
          maxIon += c.capacity;
        } else if (c.containerType === 'fuel' && c.capacity) {
          maxFuel += c.capacity;
        }
      }
    }

    this.resources.maxEnergy = maxEnergy;
    this.resources.maxIon = maxIon;
    this.resources.maxFuel = maxFuel;

    // 确保当前值不超过最大值
    // 如果 resources.energy 为0但 this.energy 有值，使用 this.energy（兼容旧系统初始化）
    if (this.resources.energy === 0 && this.energy > 0) {
      this.resources.energy = this.energy;
    }
    this.resources.energy = Math.min(this.resources.energy, maxEnergy);
    this.resources.ion = Math.min(this.resources.ion, maxIon);
    this.resources.fuel = Math.min(this.resources.fuel, maxFuel);

    // 更新Player的energy字段（兼容旧系统）
    this.maxEnergy = maxEnergy;
    this.energy = this.resources.energy;
  },

  // 获取已装备武器列表
  getEquippedWeapons() {
    const weapons = [];
    for (const slot of ['primary', 'secondary']) {
      const w = this.equipment[slot];
      if (w && w.category === 'weapon') {
        weapons.push({ slot, ...w });
      }
    }
    return weapons;
  },

  // 获取已装备电子战设备
  getEquippedEW() {
    const devices = [];
    for (const slot of ['ew1', 'ew2']) {
      const d = this.equipment[slot];
      if (d && d.category === 'ew') {
        devices.push({ slot, ...d });
      }
    }
    return devices;
  },

  // 获取结构抗性
  getResistances() {
    const res = { kinetic: 0, thermal: 0, shock: 0, ion: 0, explosive: 0 };
    const armor = this.equipment.armor;
    if (armor) {
      if (armor.kinResist) res.kinetic += armor.kinResist;
      if (armor.thermResist) res.thermal += armor.thermResist;
      if (armor.shockResist) res.shock += armor.shockResist;
      if (armor.dynamicResist) {
        const lastDamageType = this.lastDamageType;
        if (lastDamageType && res[lastDamageType] !== undefined) {
          res[lastDamageType] += armor.dynamicResist;
        }
      }
    }
    return res;
  },

  lastDamageType: null,

  // 获取电子战加成
  getEWBonus() {
    const bonus = { vision: 0, scanRange: 0, scanAccuracy: 0, jamResist: 0 };
    for (const slot of ['ew1', 'ew2']) {
      const d = this.equipment[slot];
      if (!d || d.category !== 'ew') continue;
      if (d.visionBonus) bonus.vision += d.visionBonus;
      if (d.scanRange) bonus.scanRange += d.scanRange;
      if (d.scanAccuracy) bonus.scanAccuracy += d.scanAccuracy;
      if (d.jamResist) bonus.jamResist += d.jamResist;
    }
    return bonus;
  },

  // 检查是否有足够弹药
  hasAmmo(weapon) {
    if (!weapon || !weapon.ammoPerShot || weapon.ammoPerShot <= 0) return true;
    // 简化：根据武器子类别映射弹药类型
    const ammoMap = {
      '火炮': '20mm_ap',
      '电磁炮': 'railgun_slug',
      '离子炮': 'ion_charge',
      '导弹': 'missile_he'
    };
    const ammoType = ammoMap[weapon.subCategory];
    if (!ammoType) return true;
    return (this.ammo[ammoType] || 0) >= weapon.ammoPerShot;
  },

  // 消耗弹药
  consumeAmmo(weapon) {
    if (!weapon || !weapon.ammoPerShot || weapon.ammoPerShot <= 0) return true;
    const ammoMap = {
      '火炮': '20mm_ap',
      '电磁炮': 'railgun_slug',
      '离子炮': 'ion_charge',
      '导弹': 'missile_he'
    };
    const ammoType = ammoMap[weapon.subCategory];
    if (!ammoType) return true;
    if ((this.ammo[ammoType] || 0) < weapon.ammoPerShot) return false;
    this.ammo[ammoType] -= weapon.ammoPerShot;
    return true;
  },

  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.level++;
      this.expToNext = Math.floor(this.expToNext * 1.5);
      const hpUp = Utils.rand(15, 25);
      this.maxHp += hpUp;
      this.hp = this.maxHp;
      this.armor = this.maxArmor;
      Msg.divider();
      Msg.success(`🎉 升级！你现在是 Lv.${this.level}！`);
      Msg.info(`结构值+${hpUp}`);
    }
  },

  addItem(id, count = 1) {
    const existing = this.inventory.find(i => i.id === id);
    if (existing) {
      existing.count += count;
    } else {
      this.inventory.push({ id, count });
    }
  },

  removeItem(id, count = 1) {
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx === -1) return false;
    if (this.inventory[idx].count < count) return false;
    this.inventory[idx].count -= count;
    if (this.inventory[idx].count <= 0) this.inventory.splice(idx, 1);
    return true;
  },

  hasItem(id) {
    return this.inventory.some(i => i.id === id && i.count > 0);
  },

  // 兼容旧接口
  equipWeapon(weaponId, slot = 'primary') {
    return this.installEquipment(weaponId, slot);
  },

  equipArmor(armorId) {
    return this.installEquipment(armorId, 'armor');
  },

  // ===== 伤害与修复系统 =====

  takeDamage(dmg, damageType = 'kinetic') {
    this.lastDamageType = damageType;
    const res = this.getResistances();
    const resist = res[damageType] || 0;
    // 应用结构抗性减免
    let actualDmg = Math.floor(dmg * (1 - resist));
    actualDmg = Math.max(1, actualDmg);

    let remaining = actualDmg;
    let armorDmg = 0;
    let hpDmg = 0;

    if (damageType === 'kinetic') {
      armorDmg = Math.min(this.armor, remaining);
      this.armor -= armorDmg;
      remaining -= armorDmg;
      hpDmg = remaining;
    } else if (damageType === 'thermal') {
      armorDmg = Math.min(this.armor, Math.floor(remaining * 0.6));
      this.armor -= armorDmg;
      remaining = Math.max(0, remaining - armorDmg);
      hpDmg = remaining;
    } else if (damageType === 'shock') {
      armorDmg = Math.min(this.armor, Math.floor(remaining * 0.8));
      this.armor -= armorDmg;
      remaining = Math.max(0, remaining - armorDmg);
      hpDmg = remaining;
    } else if (damageType === 'ion') {
      // 离子伤害穿透装甲直接打击结构
      hpDmg = remaining;
    } else if (damageType === 'explosive') {
      armorDmg = Math.min(this.armor, Math.floor(remaining * 0.7));
      this.armor -= armorDmg;
      remaining = Math.max(0, remaining - armorDmg);
      hpDmg = remaining;
    } else {
      hpDmg = remaining;
    }
    this.hp = Math.max(0, this.hp - hpDmg);
    return { total: dmg, actual: actualDmg, armor: armorDmg, hp: hpDmg };
  },

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.stats.totalHeal += this.hp - before;
    return this.hp - before;
  },

  repairArmor(amount) {
    const before = this.armor;
    this.armor = Math.min(this.maxArmor, this.armor + amount);
    return this.armor - before;
  },

  restoreEnergy(amount) {
    const before = this.resources.energy;
    this.resources.energy = Math.min(this.resources.maxEnergy, this.resources.energy + amount);
    this.energy = this.resources.energy; // 兼容旧系统
    return this.resources.energy - before;
  },

  useEnergy(amount) {
    if (this.resources.energy < amount) return false;
    this.resources.energy -= amount;
    this.energy = this.resources.energy; // 兼容旧系统
    return true;
  },

  isDead() { return this.hp <= 0; },

  respawn() {
    this.hp = Math.floor(this.maxHp * 0.5);
    this.armor = Math.floor(this.maxArmor * 0.5);
    this.resources.energy = this.resources.maxEnergy;
    this.energy = this.resources.energy;
    this.room = 'outpost_hub';
    this.position = [500, 500];
    this.statusEffects = [];
    this.stats.deaths++;
    this.weaponCooldowns = { primary: 0, secondary: 0 };
  }
};
