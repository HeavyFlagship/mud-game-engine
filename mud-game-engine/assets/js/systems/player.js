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
  equipment: {},

  // 核心模块（固定槽位，不占接口）
  coreComputer: null,
  corePower: null,

  // 武器冷却映射：slot_key -> cooldown
  weaponCooldowns: {},

  // 弹匣状态：slot_key -> currentMagazine
  magazines: {},

  // 机库系统：存储拥有的机体配置
  // 格式：[{ vehicleId, equipment, coreComputer, corePower, magazines }]
  hangar: [],

  // 基地仓库：存储物品
  // 格式：[{ id, count }]
  warehouse: [],

  // 玩家背包
  inventory: [],
  skills: [],
  visitedRooms: new Set(),
  statusEffects: [],
  killCount: {},
  stats: { totalDmg:0, totalHeal:0, monstersKilled:0, deaths:0 },
  gold: 100000,
  level: 1,
  exp: 0,
  expToNext: 50,

  // 弹药库存（全局储备）
  ammo: {
    '20mm_ap': 200,
    'railgun_slug': 50,
    'ion_charge': 100,
    'missile_he': 20
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

  // 预算管理
  budget: {
    powerUsed: 0,
    powerMax: 0,
    computeUsed: 0,
    computeMax: 0,
    bayUsed: 0,
    bayMax: 0
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
      this.weight = vehicle.weight;
      this.overweightCoeff = vehicle.overweightCoeff;
      this.maxEnergy = vehicle.energyCapacity;
      this.energy = vehicle.energyCapacity;
      this.energyRegen = vehicle.energyRegen;
      // 设置预算基准：功率和算力完全由核心装备提供
      this.budget.powerMax = 0;
      this.budget.computeMax = 0;
      this.budget.bayMax = vehicle.equipmentBay || 10;
    }

    // 根据载具接口生成槽位
    this.initSlots();

    // 安装默认核心模块（核心模块不占用接口和预算，而是增加预算上限）
    const defaultCompId = vehicle && vehicle.defaultCoreComputer || 'basic_core_computer';
    const defaultPowerId = vehicle && vehicle.defaultCorePower || 'basic_core_power';
    const coreComputer = EquipmentDB.get(defaultCompId);
    const corePower = EquipmentDB.get(defaultPowerId);
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

    // 初始化机库：将初始机体存入机库
    this.saveCurrentVehicleToHangar();
  },

  // ===== 机库系统 =====

  // 保存当前机体配置到机库
  saveCurrentVehicleToHangar() {
    const existing = this.hangar.find(v => v.vehicleId === this.vehicleId);
    if (existing) {
      existing.equipment = JSON.parse(JSON.stringify(this.equipment));
      existing.coreComputer = this.coreComputer ? { ...this.coreComputer } : null;
      existing.corePower = this.corePower ? { ...this.corePower } : null;
      existing.magazines = { ...this.magazines };
    } else {
      this.hangar.push({
        vehicleId: this.vehicleId,
        equipment: JSON.parse(JSON.stringify(this.equipment)),
        coreComputer: this.coreComputer ? { ...this.coreComputer } : null,
        corePower: this.corePower ? { ...this.corePower } : null,
        magazines: { ...this.magazines }
      });
    }
  },

  // 购买新机体
  buyVehicle(vehicleId) {
    const vehicle = VehicleDB[vehicleId];
    if (!vehicle) {
      Msg.error('该载具不存在。');
      return false;
    }
    if (this.hangar.some(v => v.vehicleId === vehicleId)) {
      Msg.warning('你已经拥有该机体了。');
      return false;
    }
    const price = vehicle.price || 0;
    if (this.gold < price) {
      Msg.error(`金币不足，需要 ${price} 金币。`);
      return false;
    }
    this.gold -= price;
    // 创建空白配置存入机库
    this.hangar.push({
      vehicleId,
      equipment: {},
      coreComputer: null,
      corePower: null,
      magazines: {}
    });
    Msg.success(`购买了 ${vehicle.name}，已存入机库。`);
    return true;
  },

  // 切换机体（在基地内）
  switchVehicle(vehicleId) {
    const room = MapSystem.getRoom(this.room);
    if (!room || !room.isSafeZone) {
      Msg.error('只能在基地内切换机体。');
      return false;
    }
    if (Battle.active) {
      Battle.end();
    }
    const vehicle = VehicleDB[vehicleId];
    if (!vehicle) {
      Msg.error('该载具不存在。');
      return false;
    }
    const savedConfig = this.hangar.find(v => v.vehicleId === vehicleId);
    if (!savedConfig) {
      Msg.error('机库中没有该机体。');
      return false;
    }
    if (vehicleId === this.vehicleId) {
      Msg.info('当前已在使用该机体。');
      return false;
    }

    // 保存当前机体配置
    this.saveCurrentVehicleToHangar();

    // 切换到新机体
    this.loadVehicleConfig(savedConfig);
    Msg.success(`已切换到 ${vehicle.name}。`);
    return true;
  },

  // 加载机体配置
  loadVehicleConfig(config) {
    const vehicle = VehicleDB[config.vehicleId];
    if (!vehicle) return;

    this.vehicleId = config.vehicleId;
    this.maxHp = vehicle.maxHp;
    this.hp = vehicle.maxHp;
    this.maxArmor = vehicle.maxArmor;
    this.armor = vehicle.maxArmor;
    this.speed = vehicle.maxSpeed;
    this.visionRadius = vehicle.visionRadius;
    this.signalRadius = vehicle.signalRadius;
    this.targetRadius = vehicle.targetRadius;
    this.weight = vehicle.weight;
    this.overweightCoeff = vehicle.overweightCoeff;
    this.maxEnergy = vehicle.energyCapacity;
    this.energy = vehicle.energyCapacity;
    this.energyRegen = vehicle.energyRegen;
    this.budget.powerMax = 0;
    this.budget.computeMax = 0;
    this.budget.bayMax = vehicle.equipmentBay || 10;

    // 清空并重建装备槽位
    this.equipment = {};
    this.weaponCooldowns = {};
    this.initSlots();

    // 恢复核心模块
    if (config.coreComputer) {
      this.coreComputer = { ...config.coreComputer };
      this.budget.computeMax += config.coreComputer.coreOutput || 0;
    } else {
      this.coreComputer = null;
    }
    if (config.corePower) {
      this.corePower = { ...config.corePower };
      this.budget.powerMax += config.corePower.coreOutput || 0;
    } else {
      this.corePower = null;
    }

    // 恢复装备
    for (const [slotKey, slot] of Object.entries(config.equipment || {})) {
      if (this.equipment[slotKey] && slot.equip) {
        this.equipment[slotKey].equip = { ...slot.equip };
      }
    }
    this.magazines = { ...(config.magazines || {}) };
    this.recalcBudget();
    this.recalcResources();
  },

  // ===== 仓库系统 =====

  // 存入物品到仓库
  depositToWarehouse(itemName, count = 1) {
    const num = parseInt(itemName);
    let item = null;
    if (!isNaN(num) && num >= 1) {
      item = this.inventory[num - 1];
    } else {
      item = this.inventory.find(i => {
        const template = ItemDB.get(i.id);
        return template && (template.name === itemName || i.id === itemName);
      });
    }
    if (!item) {
      Msg.error('背包中没有该物品。');
      return false;
    }
    const actualCount = Math.min(count, item.count);
    if (actualCount <= 0) {
      Msg.error('数量无效。');
      return false;
    }

    const existing = this.warehouse.find(w => w.id === item.id);
    if (existing) {
      existing.count += actualCount;
    } else {
      this.warehouse.push({ id: item.id, count: actualCount });
    }
    item.count -= actualCount;
    if (item.count <= 0) {
      this.inventory = this.inventory.filter(i => i !== item);
    }
    const template = ItemDB.get(item.id);
    Msg.success(`已将 ${template?.name || item.id} x${actualCount} 存入仓库。`);
    return true;
  },

  // 从仓库取出物品
  withdrawFromWarehouse(itemName, count = 1) {
    const num = parseInt(itemName);
    let entry = null;
    if (!isNaN(num) && num >= 1) {
      entry = this.warehouse[num - 1];
    } else {
      entry = this.warehouse.find(w => {
        const template = ItemDB.get(w.id);
        return template && (template.name === itemName || w.id === itemName);
      });
    }
    if (!entry) {
      Msg.error('仓库中没有该物品。');
      return false;
    }
    const actualCount = Math.min(count, entry.count);
    if (actualCount <= 0) {
      Msg.error('数量无效。');
      return false;
    }

    const existing = this.inventory.find(i => i.id === entry.id);
    if (existing) {
      existing.count += actualCount;
    } else {
      this.inventory.push({ id: entry.id, count: actualCount });
    }
    entry.count -= actualCount;
    if (entry.count <= 0) {
      this.warehouse = this.warehouse.filter(w => w !== entry);
    }
    const template = ItemDB.get(entry.id);
    Msg.success(`已从仓库取出 ${template?.name || entry.id} x${actualCount}。`);
    return true;
  },

  // 从仓库直接装备（仅限装备类）
  equipFromWarehouse(itemName) {
    const num = parseInt(itemName);
    let entry = null;
    if (!isNaN(num) && num >= 1) {
      entry = this.warehouse[num - 1];
    } else {
      entry = this.warehouse.find(w => {
        const template = ItemDB.get(w.id);
        return template && (template.name === itemName || w.id === itemName);
      });
    }
    if (!entry) {
      Msg.error('仓库中没有该物品。');
      return false;
    }
    const template = ItemDB.get(entry.id);
    if (!template) {
      Msg.error('物品数据错误。');
      return false;
    }
    if (template.category === 'core' || !template.interfaceReq) {
      Msg.error('该物品无法直接装备。');
      return false;
    }

    if (this.installEquipment(entry.id, undefined)) {
      entry.count--;
      if (entry.count <= 0) {
        this.warehouse = this.warehouse.filter(w => w !== entry);
      }
      return true;
    }
    return false;
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
        const reqSyms = equip.interfaceReq.map(t => this.getInterfaceSymbol(t)).join('');
        Msg.error(`没有空闲接口满足 ${equip.name} 的需求 [${reqSyms}]`);
        this.showInterfaceStatus();
        return false;
      }
    } else {
      if (!this.equipment[targetSlot]) {
        Msg.error(`槽位 ${slotKey} 不存在。`);
        return false;
      }
      if (this.equipment[targetSlot].equip) {
        this.uninstallEquipment(targetSlot, true);
      }
      if (!this.canFitSlot(equip, targetSlot)) {
        const reqSyms = equip.interfaceReq.map(t => this.getInterfaceSymbol(t)).join('');
        const haveSyms = this.equipment[targetSlot].interfaceTypes.map(t => this.getInterfaceSymbol(t)).join('');
        Msg.error(`${equip.name} 需要 [${reqSyms}]，该槽位提供 [${haveSyms}]`);
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
    // 武器冷却和弹匣初始化
    if (equip.category === 'weapon') {
      this.weaponCooldowns[targetSlot] = 0;
      // 初始化弹匣：从全局弹药池中填充
      if (equip.magazine && equip.magazine > 0) {
        const ammoType = this._getAmmoType(equip);
        if (ammoType) {
          const available = this.ammo[ammoType] || 0;
          this.magazines[targetSlot] = Math.min(equip.magazine, available);
          this.ammo[ammoType] -= this.magazines[targetSlot];
        } else {
          this.magazines[targetSlot] = 0;
        }
      } else {
        this.magazines[targetSlot] = 0;
      }
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
    // 返回弹匣中的弹药到全局池
    if (equip.category === 'weapon' && equip.magazine && equip.magazine > 0) {
      const ammoType = this._getAmmoType(equip);
      if (ammoType && this.magazines[slotKey]) {
        this.ammo[ammoType] = (this.ammo[ammoType] || 0) + this.magazines[slotKey];
        delete this.magazines[slotKey];
      }
    }
    this.recalcBudget();
    this.recalcResources();
    const slotDesc = this.getSlotDesc(slotKey);
    Msg.info(`从 ${slotDesc} 卸载了 ${equip.name}。`);
    return true;
  },

  // 接口类型 → 符号映射
  interfaceSymbols: {
    '外部': '◎',
    '内部': '◉',
    '电源': '⚡',
    '数据': '🔗',
    '界面': '📥',
    '弹药管道': '⩎',
    '离子管道': '⩎',
    '流体管道': '⩎',
    '武器管道': '⩎',
  },

  // 管道类型 → 颜色映射
  pipeColors: {
    '弹药管道': '#f84',
    '离子管道': '#8af',
    '流体管道': '#4f8',
    '武器管道': '#f48',
  },

  // 获取接口类型的符号表示
  getInterfaceSymbol(type) {
    const sym = this.interfaceSymbols[type] || '?';
    const color = this.pipeColors[type];
    if (color) {
      return `<span style="color:${color}">${sym}</span>`;
    }
    return sym;
  },

  // 获取槽位描述（符号缩写形式）
  getSlotDesc(slotKey) {
    const slot = this.equipment[slotKey];
    if (!slot) return slotKey;
    const syms = slot.interfaceTypes.map(t => this.getInterfaceSymbol(t)).join('');
    return `[${syms}]`;
  },

  // 获取接口图例文本（纯文字说明）
  getInterfaceLegend() {
    const items = [];
    const seen = new Set();
    for (const [type, sym] of Object.entries(this.interfaceSymbols)) {
      const color = this.pipeColors[type];
      const display = color ? `<span style="color:${color}">${sym}</span>` : sym;
      if (!seen.has(sym + (color || ''))) {
        items.push(`${display}=${type}`);
        seen.add(sym + (color || ''));
      }
    }
    return items.join('  ');
  },

  // 显示接口占用状态（符号形式）
  showInterfaceStatus() {
    const freeSummary = this.getFreeInterfaceSummary();
    const allSummary = this.getInterfaceSummary();
    const parts = [];
    for (const [type, total] of Object.entries(allSummary)) {
      const free = freeSummary[type] || 0;
      const sym = this.getInterfaceSymbol(type);
      parts.push(`${sym}${free}/${total}`);
    }
    Msg.info(`接口：${parts.join('  ')}`);
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
        weapons.push({ ...e, slot: key });
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
        devices.push({ ...e, slot: key });
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
        armors.push({ ...e, slot: key });
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

  _getAmmoType(weapon) {
    if (!weapon || !weapon.subCategory) return null;
    const ammoMap = {
      '火炮': '20mm_ap',
      '电磁炮': 'railgun_slug',
      '离子炮': 'ion_charge',
      '导弹': 'missile_he'
    };
    return ammoMap[weapon.subCategory] || null;
  },

  // 检查是否有足够弹药（检查指定槽位的弹匣）
  hasAmmo(weapon, slotKey) {
    if (!weapon || !weapon.ammoPerShot || weapon.ammoPerShot <= 0) return true;
    const ammoType = this._getAmmoType(weapon);
    if (!ammoType) return true;
    if (!slotKey) {
      return (this.ammo[ammoType] || 0) >= weapon.ammoPerShot;
    }
    const currentMag = this.magazines[slotKey] || 0;
    return currentMag >= weapon.ammoPerShot;
  },

  // 消耗弹药（从指定槽位的弹匣消耗）
  consumeAmmo(weapon, slotKey) {
    if (!weapon || !weapon.ammoPerShot || weapon.ammoPerShot <= 0) return true;
    const ammoType = this._getAmmoType(weapon);
    if (!ammoType) return true;
    if (!slotKey) {
      if ((this.ammo[ammoType] || 0) < weapon.ammoPerShot) return false;
      this.ammo[ammoType] -= weapon.ammoPerShot;
      return true;
    }
    const currentMag = this.magazines[slotKey] || 0;
    if (currentMag < weapon.ammoPerShot) return false;
    this.magazines[slotKey] -= weapon.ammoPerShot;
    return true;
  },

  // 重新装填弹匣（从全局弹药池填充到指定槽位）
  reload(slotKey) {
    const slot = this.equipment[slotKey];
    if (!slot || !slot.equip || slot.equip.category !== 'weapon') {
      Msg.error('指定槽位没有武器。');
      return;
    }
    const weapon = slot.equip;
    if (!weapon.magazine || weapon.magazine <= 0) {
      Msg.info(`${weapon.name} 无需装填。`);
      return;
    }
    const ammoType = this._getAmmoType(weapon);
    if (!ammoType) {
      Msg.info(`${weapon.name} 无需弹药。`);
      return;
    }
    const currentMag = this.magazines[slotKey] || 0;
    const needed = weapon.magazine - currentMag;
    if (needed <= 0) {
      Msg.info(`${weapon.name} 弹匣已满。`);
      return;
    }
    const available = this.ammo[ammoType] || 0;
    const actual = Math.min(needed, available);
    if (actual <= 0) {
      Msg.warning('没有可用的备弹。');
      return;
    }
    this.magazines[slotKey] += actual;
    this.ammo[ammoType] -= actual;
    Msg.success(`装填了 ${actual} 发弹药到 ${weapon.name}，当前弹匣: ${this.magazines[slotKey]}/${weapon.magazine}`);
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
