// ========== 玩家系统 ==========
const Player = {
  name: '冒险者',
  level: 1,
  exp: 0,
  expToNext: 30,
  hp: 100, maxHp: 100,
  mp: 50, maxMp: 50,
  baseAtk: 10, baseDef: 5,
  gold: 50,
  room: 'village_square',
  inventory: [],       // [{id, count}]
  equipment: { weapon:null, armor:null, accessory:null },
  skills: ['slash','heal'],
  visitedRooms: new Set(),
  buffs: [],
  statusEffects: [],
  killCount: {},
  stats: { totalDmg:0, totalHeal:0, monstersKilled:0, deaths:0 },

  get atk() {
    let a = this.baseAtk;
    for (const slot of Object.values(this.equipment)) {
      if (slot && slot.atk) a += slot.atk;
    }
    if (this.buffs.some(b => b.type === 'berserk')) a = Math.floor(a * 1.5);
    return a;
  },
  get def() {
    let d = this.baseDef;
    for (const slot of Object.values(this.equipment)) {
      if (slot && slot.def) d += slot.def;
    }
    return d;
  },
  get critRate() {
    let c = 5; // base 5%
    for (const slot of Object.values(this.equipment)) {
      if (slot && slot.special === 'crit_boost') c += slot.critBonus || 0;
    }
    return c;
  },

  init() {
    // 给新手装备
    this.inventory.push({ id:'hp_small', count:3 });
    this.inventory.push({ id:'mp_small', count:2 });
    const starter = ItemDB.get('wooden_sword');
    if (starter) this.equipment.weapon = starter;
    const starterArmor = ItemDB.get('cloth_armor');
    if (starterArmor) this.equipment.armor = starterArmor;
  },

  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.level++;
      this.expToNext = Math.floor(this.expToNext * 1.5);
      const hpUp = Utils.rand(15, 25);
      const mpUp = Utils.rand(8, 15);
      const atkUp = Utils.rand(2, 4);
      const defUp = Utils.rand(1, 3);
      this.maxHp += hpUp;
      this.maxMp += mpUp;
      this.baseAtk += atkUp;
      this.baseDef += defUp;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      Msg.divider();
      Msg.success(`🎉 升级！你现在是 Lv.${this.level}！`);
      Msg.info(`生命+${hpUp} 法力+${mpUp} 攻击+${atkUp} 防御+${defUp}`);
      // 检查新技能
      this.checkNewSkills();
    }
  },

  checkNewSkills() {
    for (const [id, skill] of Object.entries(SkillDB)) {
      if (skill.levelReq <= this.level && !this.skills.includes(id)) {
        this.skills.push(id);
        Msg.magic(`✨ 习得新技能: <span class="help-cmd">${skill.name}</span> - ${skill.desc}`);
      }
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

  equipItem(id) {
    const item = ItemDB.get(id);
    if (!item) return;
    const slot = item.slot;
    if (!slot) return;
    // 卸下当前装备
    if (this.equipment[slot]) {
      this.addItem(this.equipment[slot].id);
    }
    this.removeItem(id);
    this.equipment[slot] = item;
    // 处理特殊效果
    if (item.hpBonus) { this.maxHp += item.hpBonus; this.hp = Math.min(this.hp + item.hpBonus, this.maxHp); }
    if (item.mpBonus) { this.maxMp += item.mpBonus; this.mp = Math.min(this.mp + item.mpBonus, this.maxMp); }
    Msg.success(`装备了 ${item.name}！`);
  },

  unequipItem(slot) {
    if (!this.equipment[slot]) return;
    const item = this.equipment[slot];
    if (item.hpBonus) { this.maxHp -= item.hpBonus; this.hp = Math.min(this.hp, this.maxHp); }
    if (item.mpBonus) { this.maxMp -= item.mpBonus; this.mp = Math.min(this.mp, this.maxMp); }
    this.addItem(item.id);
    this.equipment[slot] = null;
    Msg.info(`卸下了 ${item.name}。`);
  },

  takeDamage(dmg) {
    let reduced = this.def;
    if (this.buffs.some(b => b.type === 'shield')) reduced = Math.floor(reduced * 1.3);
    let actual = Math.max(1, dmg - reduced);
    this.hp = Math.max(0, this.hp - actual);
    return actual;
  },

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.stats.totalHeal += this.hp - before;
    return this.hp - before;
  },

  restoreMp(amount) {
    const before = this.mp;
    this.mp = Math.min(this.maxMp, this.mp + amount);
    return this.mp - before;
  },

  isDead() { return this.hp <= 0; },

  respawn() {
    this.hp = Math.floor(this.maxHp * 0.5);
    this.mp = Math.floor(this.maxMp * 0.5);
    this.room = 'village_square';
    this.buffs = [];
    this.statusEffects = [];
    this.gold = Math.max(0, this.gold - 20);
    this.stats.deaths++;
  }
};
