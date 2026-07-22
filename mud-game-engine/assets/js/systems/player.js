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

  // 装备槽位：动态生成，基于载具接口
  // 格式：{ slot_0: { interfaceTypes: ['外部','电源','数据','界面'], equip: null }, ... }
  equipment: {},

  // 核心模块（固定槽位，不占接口）
  coreComputer: null,
  corePower: null,

  // 武器冷却映射：slot_key -> cooldown
  weaponCooldowns: {},

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
    const weapons = this.getEquippedWeapons();
    return weapons.length > 0 ? weapons[0].damage || 0 : 0;
  },

  get def() {
    let d = 0;
    for (const key of Object.keys(this.equipment)) {
      const e = this.equipment[key].equip;
      if (e && e.armorValue) d += e.armorValue;
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

  // 根据载具接口定义生成动态槽位
  initSlots() {
    const vehicle = VehicleDB[this.vehicleId];
    if (!vehicle || !vehicle.interfaces) return;

    this.equipment = {};
    let slotIndex = 0;

    // 新格式：interfaces 是数组 [{ types: ['外部','电源',...], count: 2 }, ...]
    if (Array.isArray(vehicle.interfaces)) {
      for (const intf of vehicle.interfaces) {
        const types = intf.types || [];
        const count = intf.count || 1;
        for (let i = 0; i < count; i++) {
          const slotKey = `slot_${slotIndex}`;
          this.equipment[slotKey] = {
            interfaceTypes: [...types],
            equip: null
          };
          slotIndex++;
        }
      }
    } else {
      // 旧格式兼容：interfaces 是 { external: 4, power: 4, ... }
      const interfaceMap = {
        external: '外部', power: '电源', data: '数据',
        weapon: '武器管道', ammo_pipe: '弹药管道', ion_pipe: '离子管道',
        fluid_pipe: '流体管道', interface: '界面', internal: '内部'
      };
      for (const [intfKey, count] of Object.entries(vehicle.interfaces)) {
        const intfType = interfaceMap[intfKey] || intfKey;
        for (let i = 0; i < count; i++) {
          const slotKey = `slot_${slotIndex}`;
          this.equipment[slotKey] = {
            interfaceTypes: [intfType],
            equip: null
          };
          slotIndex++;
        }
      }
    }
  },

  // 获取载具所有接口类型的统计
  getInterfaceSummary() {
    const summary = {};
    for (const slot of Object.values(this.equipment)) {
      for (const t of slot.interfaceTypes) {
        summary[t] = (summary[t] || 0) + 1;
      }
    }
    return summary;
  },

  // 获取载具空闲接口统计
  getFreeInterfaceSummary() {
    const summary = {};
    for (const slot of Object.values(this.equipment)) {
      if (!slot.equip) {
        for (const t of slot.interfaceTypes) {
          summary[t] = (summary[t] || 0) + 1;
        }
      }
    }
    return summary;
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

    // 根据载具接口生成槽位
    this.initSlots();

    // 安装默认核心模块（核心模块不占用接口和预算，而是增加预算上限）
    const coreComputer = EquipmentDB.get('basic_core_computer');
    const corePower = EquipmentDB.get('basic_core_power');
    if (coreComputer) {
      this.coreComputer = { ...coreComputer };
      this.budget.computeMax += coreComputer.coreOutput || 0;
    }
    if (corePower) {
      this.corePower = { ...corePower };
      this.budget.powerMax += corePower.coreOutput || 0;
    }

    // 安装默认武器和装甲
    if (vehicle && vehicle.defaultWeapons && vehicle.defaultWeapons[0]) {
      this.installEquipment(vehicle.defaultWeapons[0]);
    }
    if (vehicle && vehicle.defaultArmor && vehicle.defaultArmor[0]) {
      this.installEquipment(vehicle.defaultArmor[0]);
    }

    this.inventory.push({ id:'repair_kit_small', count:2 });
    this.inventory.push({ id:'armor_patch', count:2 });
    this.recalcResources();
  },

  // ===== 装备安装系统（基于接口匹配） =====

  // 检查装备的接口需求能否被某个槽位满足
  canFitSlot(equip, slotKey) {
    const slot = this.equipment[slotKey];
    if (!slot || slot.equip) return false;
    const reqs = equip.interfaceReq || [];
    return reqs.every(req => slot.interfaceTypes.includes(req));
  },

  // 找到能安装某装备的空闲槽位
  findAvailableSlot(equip) {
    const reqs = equip.interfaceReq || [];
    if (reqs.length === 0) return null;

    // 优先找接口类型完全匹配的槽位（需求最少浪费）
    let bestSlot = null;
    let bestWaste = Infinity;

    for (const [key, slot] of Object.entries(this.equipment)) {
      if (slot.equip) continue;
      const canFit = reqs.every(req => slot.interfaceTypes.includes(req));
      if (canFit) {
        const waste = slot.interfaceTypes.length - reqs.length;
        if (waste < bestWaste) {
          bestWaste = waste;
          bestSlot = key;
        }
      }
    }
    return bestSlot;
  },

  installEquipment(equipId, slotKey) {
    const equip = EquipmentDB.get(equipId);
    if (!equip) {
      Msg.error(`装备 ${equipId} 不存在。`);
      return false;
    }

    // 核心模块特殊处理
    if (equip.category === 'core') {
      if (equip.coreType === 'computer') {
        if (this.coreComputer) {
          Msg.warning(`先卸载当前核心计算机：${this.coreComputer.name}`);
          return false;
        }
        this.coreComputer = { ...equip };
        this.budget.computeMax += equip.coreOutput || 0;
        this.recalcBudget();
        Msg.success(`安装了 ${equip.name}，算力上限+${equip.coreOutput}`);
        return true;
      } else if (equip.coreType === 'power') {
        if (this.corePower) {
          Msg.warning(`先卸载当前核心动力：${this.corePower.name}`);
          return false;
        }
        this.corePower = { ...equip };
        this.budget.powerMax += equip.coreOutput || 0;
        this.recalcBudget();
        Msg.success(`安装了 ${equip.name}，功率上限+${equip.coreOutput}`);
        return true;
      }
    }

    // 检查接口需求是否为空
    if (!equip.interfaceReq || equip.interfaceReq.length === 0) {
      Msg.error(`${equip.name} 没有接口需求定义，无法安装。`);
      return false;
    }

    // 确定安装槽位
    let targetSlot = slotKey;
    if (!targetSlot) {
      targetSlot = this.findAvailableSlot(equip);
      if (!targetSlot) {
        Msg.error(`没有空闲接口满足 ${equip.name} 的需求：${equip.interfaceReq.join('、')}`);
        // 显示当前接口占用情况
        this.showInterfaceStatus();
        return false;
      }
    } else {
      // 指定了槽位，验证是否可用
      if (!this.equipment[targetSlot]) {
        Msg.error(`槽位 ${slotKey} 不存在。`);
        return false;
      }
      if (this.equipment[targetSlot].equip) {
        // 槽位已占用，先卸载
        this.uninstallEquipment(targetSlot, true);
      }
      if (!this.canFitSlot(equip, targetSlot)) {
        Msg.error(`${equip.name} 需要接口：${equip.interfaceReq.join('、')}，该槽位提供：${this.equipment[targetSlot].interfaceTypes.join('、')}`);
        return false;
      }
    }

    // 检查预算
    const check = this.checkBudget(equip);
    if (!check.ok) {
      Msg.error(`预算不足，无法安装 ${equip.name}：${check.reason}`);
      return false;
    }

    // 安装
    this.equipment[targetSlot].equip = { ...equip };
    // 武器冷却初始化
    if (equip.category === 'weapon') {
      this.weaponCooldowns[targetSlot] = 0;
    }
    this.recalcBudget();
    this.recalcResources();
    const slotDesc = this.getSlotDesc(targetSlot);
    Msg.success(`安装了 ${equip.name} 到 ${slotDesc}！`);
    return true;
  },

  uninstallEquipment(slotKey, toInventory = true) {
    // 核心模块特殊处理
    if (slotKey === 'coreComputer' || slotKey === 'core_power') {
      const core = slotKey === 'coreComputer' ? this.coreComputer : this.corePower;
      if (!core) return false;
      if (toInventory) this.addItem(core.id);
      if (slotKey === 'coreComputer') {
        this.budget.computeMax -= core.coreOutput || 0;
        this.coreComputer = null;
      } else {
        this.budget.powerMax -= core.coreOutput || 0;
        this.corePower = null;
      }
      this.recalcBudget();
      Msg.info(`卸载了 ${core.name}。`);
      return true;
    }

    const slot = this.equipment[slotKey];
    if (!slot || !slot.equip) return false;

    const equip = slot.equip;
    if (toInventory) {
      this.addItem(equip.id);
    }
    slot.equip = null;
    delete this.weaponCooldowns[slotKey];
    this.recalcBudget();
    this.recalcResources();
    const slotDesc = this.getSlotDesc(slotKey);
    Msg.info(`从 ${slotDesc} 卸载了 ${equip.name}。`);
    return true;
  },

  // 获取槽位描述（接口类型 + 编号）
  getSlotDesc(slotKey) {
    const slot = this.equipment[slotKey];
    if (!slot) return slotKey;
    const types = slot.interfaceTypes.join('+');
    // 计算同类型槽位的序号
    let idx = 0;
    for (const [key, s] of Object.entries(this.equipment)) {
      if (key === slotKey) break;
      if (s.interfaceTypes.join('+') === types) idx++;
    }
    return `[${types}]#${idx + 1}`;
  },

  // 显示接口占用状态
  showInterfaceStatus() {
    const freeSummary = this.getFreeInterfaceSummary();
    const allSummary = this.getInterfaceSummary();
    const parts = [];
    for (const [type, total] of Object.entries(allSummary)) {
      const free = freeSummary[type] || 0;
      parts.push(`${type}:${free}/${total}`);
    }
    Msg.info(`接口状态：${parts.join('  ')}`);
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
      return { ok: false, reason: `装备舱不足（需要${equip.bayReq}m³，剩余${(this.budget.bayMax - used.bay).toFixed(2)}m³）` };
    }
    return { ok: true };
  },

  calcUsedBudget() {
    let power = 0, compute = 0, bay = 0;
    for (const slot of Object.values(this.equipment)) {
      const e = slot.equip;
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
    const vehicle = VehicleDB[this.vehicleId];
    let maxEnergy = vehicle ? vehicle.energyCapacity : 0;
    let maxIon = 0;
    let maxFuel = 0;

    // 叠加容器容量
    for (const slot of Object.values(this.equipment)) {
      const c = slot.equip;
      if (c && c.category === 'container') {
        if (c.containerType === 'energy' && c.capacity) maxEnergy += c.capacity;
        else if (c.containerType === 'ion' && c.capacity) maxIon += c.capacity;
        else if (c.containerType === 'fuel' && c.capacity) maxFuel += c.capacity;
      }
    }

    this.resources.maxEnergy = maxEnergy;
    this.resources.maxIon = maxIon;
    this.resources.maxFuel = maxFuel;

    if (this.resources.energy === 0 && this.energy > 0) {
      this.resources.energy = this.energy;
    }
    this.resources.energy = Math.min(this.resources.energy, maxEnergy);
    this.resources.ion = Math.min(this.resources.ion, maxIon);
    this.resources.fuel = Math.min(this.resources.fuel, maxFuel);

    this.maxEnergy = maxEnergy;
    this.energy = this.resources.energy;

    // 重新计算装甲上限（载具基础装甲 + 已装备装甲板的 armorValue）
    const baseArmor = vehicle ? vehicle.maxArmor : 0;
    let bonusArmor = 0;
    for (const slot of Object.values(this.equipment)) {
      const e = slot.equip;
      if (e && e.category === 'armor' && e.armorValue) {
        bonusArmor += e.armorValue;
      }
    }
    const newMaxArmor = baseArmor + bonusArmor;
    const delta = newMaxArmor - this.maxArmor;
    this.maxArmor = newMaxArmor;
    if (delta > 0) {
      // 装备装甲板：新增的装甲值直接加入当前装甲
      this.armor = Math.min(this.maxArmor, this.armor + delta);
    } else if (delta < 0) {
      // 卸下装甲板：扣除对应装甲值（不低于0）
      this.armor = Math.max(0, this.armor + delta);
    }
  },

  // 获取已装备武器列表
  getEquippedWeapons() {
    const weapons = [];
    for (const [key, slot] of Object.entries(this.equipment)) {
      const e = slot.equip;
      if (e && e.category === 'weapon') {
        weapons.push({ slot: key, ...e });
      }
    }
    return weapons;
  },

  // 获取已装备电子战设备
  getEquippedEW() {
    const devices = [];
    for (const [key, slot] of Object.entries(this.equipment)) {
      const e = slot.equip;
      if (e && e.category === 'ew') {
        devices.push({ slot: key, ...e });
      }
    }
    return devices;
  },

  // 获取已装备的装甲
  getEquippedArmor() {
    const armors = [];
    for (const [key, slot] of Object.entries(this.equipment)) {
      const e = slot.equip;
      if (e && e.category === 'armor') {
        armors.push({ slot: key, ...e });
      }
    }
    return armors;
  },

  // 获取结构抗性
  getResistances() {
    const res = { kinetic: 0, thermal: 0, shock: 0, ion: 0, explosive: 0 };
    for (const slot of Object.values(this.equipment)) {
      const armor = slot.equip;
      if (armor && armor.category === 'armor') {
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
    }
    return res;
  },

  lastDamageType: null,

  // 获取电子战加成
  getEWBonus() {
    const bonus = { vision: 0, scanRange: 0, scanAccuracy: 0, jamResist: 0 };
    for (const slot of Object.values(this.equipment)) {
      const d = slot.equip;
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

  // ===== 伤害与修复系统 =====

  takeDamage(dmg, damageType = 'kinetic') {
    this.lastDamageType = damageType;
    const res = this.getResistances();
    const resist = res[damageType] || 0;
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
    this.energy = this.resources.energy;
    return this.resources.energy - before;
  },

  useEnergy(amount) {
    if (this.resources.energy < amount) return false;
    this.resources.energy -= amount;
    this.energy = this.resources.energy;
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
    this.weaponCooldowns = {};
  }
};
