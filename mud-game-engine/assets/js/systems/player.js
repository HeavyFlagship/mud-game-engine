// ========== 玩家系统（载具模式） ==========
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
  equipment: {
    primary: null,
    secondary: null,
    armor: null
  },
  weaponCooldowns: {
    primary: 0,
    secondary: 0
  },
  inventory: [],
  skills: [],
  visitedRooms: new Set(),
  statusEffects: [],
  killCount: {},
  stats: { totalDmg:0, totalHeal:0, monstersKilled:0, deaths:0 },
  gold: 100,
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
    }
    if (vehicle && vehicle.defaultWeapons && vehicle.defaultWeapons[0]) {
      const w = WeaponDB[vehicle.defaultWeapons[0]];
      if (w) this.equipment.primary = { ...w };
    }
    if (vehicle && vehicle.defaultArmor && vehicle.defaultArmor[0]) {
      const a = ArmorDB[vehicle.defaultArmor[0]];
      if (a) this.equipment.armor = { ...a };
    }
    this.inventory.push({ id:'repair_kit_small', count:2 });
    this.inventory.push({ id:'armor_patch', count:2 });
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
 
  equipWeapon(weaponId, slot = 'primary') {
    const weapon = WeaponDB[weaponId];
    if (!weapon) return false;
    if (this.equipment[slot]) {
      this.addItem(this.equipment[slot].id);
    }
    this.removeItem(weaponId);
    this.equipment[slot] = { ...weapon };
    this.weaponCooldowns[slot] = 0;
    Msg.success(`装备了 ${weapon.name} 到${slot === 'primary' ? '主武器' : '副武器'}槽位！`);
    return true;
  },
 
  equipArmor(armorId) {
    const armor = ArmorDB[armorId];
    if (!armor) return false;
    if (this.equipment.armor) {
      this.addItem(this.equipment.armor.id);
    }
    this.removeItem(armorId);
    this.equipment.armor = { ...armor };
    this.maxArmor = armor.armorValue;
    this.armor = Math.min(this.armor, this.maxArmor);
    Msg.success(`装备了 ${armor.name}！`);
    return true;
  },
 
  takeDamage(dmg, damageType = 'kinetic') {
    let remaining = dmg;
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
    } else {
      hpDmg = remaining;
    }
    this.hp = Math.max(0, this.hp - hpDmg);
    return { total: dmg, armor: armorDmg, hp: hpDmg };
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
    const before = this.energy;
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
    return this.energy - before;
  },
 
  useEnergy(amount) {
    if (this.energy < amount) return false;
    this.energy -= amount;
    return true;
  },
 
  isDead() { return this.hp <= 0; },
 
  respawn() {
    this.hp = Math.floor(this.maxHp * 0.5);
    this.armor = Math.floor(this.maxArmor * 0.5);
    this.energy = this.maxEnergy;
    this.room = 'outpost_hub';
    this.position = [500, 500];
    this.statusEffects = [];
    this.stats.deaths++;
    this.weaponCooldowns = { primary: 0, secondary: 0 };
  }
};

