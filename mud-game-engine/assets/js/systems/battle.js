// ========== 战斗系统 ==========
// TODO: 未来大修战斗、任务与属性系统：
// 1. 统一角色属性模型（力量/敏捷/体质/精神/速度/抗性等）；
// 2. 重构战斗流程为可扩展的行动队列、状态效果、技能效果管线；
// 3. 接入任务系统，让击杀、收集、对话、探索等目标可追踪并触发奖励。
const Battle = {
  active: false,
  enemy: null,       // 当前战斗的敌人实例
  enemyMaxHp: 0,
  round: 0,
  onEnd: null,

  start(enemyId) {
    const template = EnemyDB[enemyId];
    if (!template) return;
    this.active = true;
    this.enemy = { ...template, currentHp: template.hp };
    this.enemyMaxHp = template.hp;
    this.round = 0;
    document.getElementById('battle-bar').classList.add('active');
    document.getElementById('battle-enemy-name').textContent = template.name;
    Msg.divider();
    Msg.add(`⚔ 遭遇 <span class="enemy-name">${template.name}</span> (Lv.${template.level})！`, 'combat-title');
    Msg.info(`${template.name} 出现了！准备战斗！`);
    this.updateBattleUI();
    this.renderBattleMenus();
  },

  toggleSkillMenu() {
    if (!this.active) return;
    this.renderBattleMenus();
    this.toggleMenu('battle-skill-menu');
  },

  togglePotionMenu() {
    if (!this.active) return;
    this.renderBattleMenus();
    this.toggleMenu('battle-potion-menu');
  },

  toggleMenu(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const shouldOpen = !target.classList.contains('active');
    this.hideMenus();
    if (shouldOpen) target.classList.add('active');
  },

  hideMenus() {
    ['battle-skill-menu', 'battle-potion-menu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
  },

  renderBattleMenus() {
    const skillMenu = document.getElementById('battle-skill-menu');
    const potionMenu = document.getElementById('battle-potion-menu');

    if (skillMenu) {
      const skillButtons = Player.skills.map(sid => {
        const skill = SkillDB[sid];
        if (!skill) return '';
        const disabled = Player.mp < skill.mpCost ? ' disabled' : '';
        const title = `${skill.desc} 消耗${skill.mpCost}MP`;
        return `<button class="battle-choice skill" onclick="Battle.action('skill','${skill.id}')" title="${title}"${disabled}>${skill.name} · ${skill.mpCost}MP</button>`;
      }).join('');
      skillMenu.innerHTML = skillButtons || '<span class="battle-menu-empty">尚未习得技能</span>';
    }

    if (potionMenu) {
      const potionButtons = Player.inventory
        .filter(entry => {
          const item = ItemDB.get(entry.id);
          return item && item.type === 'potion';
        })
        .map(entry => {
          const item = ItemDB.get(entry.id);
          return `<button class="battle-choice potion" onclick="Battle.action('potion','${item.id}')" title="${item.desc}">${item.name} ×${entry.count}</button>`;
        }).join('');
      potionMenu.innerHTML = potionButtons || '<span class="battle-menu-empty">没有可用药水</span>';
    }
  },

  action(type, param) {
    if (!this.active) return;
    if (param) this.hideMenus();
    let playerActed = false;
    switch (type) {
      case 'attack': playerActed = this.playerAttack(); break;
      case 'skill': playerActed = this.playerSkill(param); break;
      case 'potion': playerActed = this.playerPotion(param); break;
      case 'flee':
        this.round++;
        document.getElementById('battle-round').textContent = `第 ${this.round} 回合`;
        this.playerFlee();
        Game.updateUI();
        return;
    }

    if (!playerActed) {
      this.updateBattleUI();
      this.renderBattleMenus();
      Game.updateUI();
      return;
    }

    this.round++;
    document.getElementById('battle-round').textContent = `第 ${this.round} 回合`;

    if (this.enemy.currentHp <= 0) { this.victory(); return; }
    if (Player.isDead()) { this.defeat(); return; }
    Game.updateUI();

    // 敌人行动
    setTimeout(() => {
      this.enemyAction();
      Game.updateUI();
      if (Player.isDead()) { this.defeat(); return; }
      // 处理持续效果
      this.processEffects();
      this.updateBattleUI();
      this.renderBattleMenus();
      Game.updateUI();
    }, 300);
  },

  playerAttack() {
    let dmg = Player.atk;
    let isCrit = Utils.chance(Player.critRate);
    if (isCrit) dmg = Math.floor(dmg * 1.8);
    // 暗影匕首双倍
    const weapon = Player.equipment.weapon;
    if (weapon && weapon.special === 'double_strike' && Utils.chance(25)) {
      dmg *= 2;
      Msg.warning(`🗡 暗影匕首触发了双倍伤害！`);
    }
    dmg = Math.max(1, dmg - Math.floor(this.enemy.def * 0.5));
    dmg = Utils.rand(Math.floor(dmg * 0.9), Math.floor(dmg * 1.1));
    this.enemy.currentHp -= dmg;
    Player.stats.totalDmg += dmg;
    const critText = isCrit ? ' <span class="damage">暴击！</span>' : '';
    Msg.info(`⚔ 你对 ${this.enemy.name} 造成了 <span class="damage">${dmg}</span> 点伤害！${critText}`);
    return true;
  },

  playerSkill(skillId) {
    if (!skillId) {
      // 列出可用技能
      Msg.info('可用技能：');
      Player.skills.forEach(sid => {
        const s = SkillDB[sid];
        if (s) Msg.info(`  <span class="help-cmd">${s.name}</span> - ${s.desc} (消耗${s.mpCost}MP)`);
      });
      Msg.info('使用方法: 技能 技能名');
      return false;
    }
    // 模糊匹配
    let skill = null;
    for (const [id, s] of Object.entries(SkillDB)) {
      if (s.name === skillId || id === skillId) { skill = s; break; }
    }
    if (!skill || !Player.skills.includes(skill.id)) {
      Msg.danger('未知技能或尚未习得。');
      return false;
    }
    if (Player.mp < skill.mpCost) {
      Msg.danger('法力不足！');
      return false;
    }
    Player.mp -= skill.mpCost;

    if (skill.type === 'attack') {
      const hits = skill.hits || 1;
      let totalDmg = 0;
      for (let i = 0; i < hits; i++) {
        let dmg = Math.floor(Player.atk * skill.mult);
        dmg = Math.max(1, dmg - Math.floor(this.enemy.def * 0.3));
        dmg = Utils.rand(Math.floor(dmg * 0.9), Math.floor(dmg * 1.1));
        this.enemy.currentHp -= dmg;
        totalDmg += dmg;
        if (hits > 1) Msg.info(`  第${i+1}击: <span class="damage">${dmg}</span> 点伤害`);
      }
      Player.stats.totalDmg += totalDmg;
      if (hits > 1) Msg.magic(`✨ ${skill.name} 共造成 <span class="damage">${totalDmg}</span> 点伤害！`);
      else Msg.magic(`✨ ${skill.name}！对 ${this.enemy.name} 造成 <span class="damage">${totalDmg}</span> 点伤害！`);
      if (skill.effect === 'poison' && Utils.chance(60)) {
        Player.statusEffects.push({ type:'poison', damage: Math.floor(Player.atk * 0.3), duration:3 });
        Msg.warning('🐍 敌人中毒了！');
      }
    } else if (skill.type === 'magic') {
      let dmg = Math.floor((Player.atk + Player.level * 3) * skill.mult);
      dmg = Math.max(1, dmg - Math.floor(this.enemy.def * 0.2));
      dmg = Utils.rand(Math.floor(dmg * 0.9), Math.floor(dmg * 1.1));
      this.enemy.currentHp -= dmg;
      Player.stats.totalDmg += dmg;
      const elemText = skill.element === 'fire' ? '🔥' : skill.element === 'ice' ? '❄' : '⚡';
      Msg.magic(`${elemText} ${skill.name}！对 ${this.enemy.name} 造成 <span class="damage">${dmg}</span> 点${skill.element === 'fire' ? '火焰' : skill.element === 'ice' ? '冰霜' : '雷电'}伤害！`);
      if (skill.effect === 'stun' && Utils.chance(30)) {
        this.enemy.stunned = true;
        Msg.warning('💫 敌人被眩晕了！');
      }
    } else if (skill.type === 'heal') {
      const amount = Player.heal(Math.floor((Player.maxHp * 0.1) + Player.level * skill.mult * 5));
      Msg.magic(`💚 ${skill.name}！恢复了 <span class="heal">${amount}</span> 点生命值！`);
    } else if (skill.type === 'buff') {
      Player.buffs.push({ type: skill.effect, duration: skill.duration });
      if (skill.effect === 'berserk') Msg.warning(`🔥 ${skill.name}！攻击力提升50%，持续${skill.duration}回合！`);
      if (skill.effect === 'shield') Msg.info(`🛡 ${skill.name}！防御力提升30%，持续${skill.duration}回合！`);
    }
    return true;
  },

  playerPotion(potionId) {
    const potions = Player.inventory.filter(i => {
      const item = ItemDB.get(i.id);
      return item && item.type === 'potion';
    });
    if (potions.length === 0) {
      Msg.danger('没有药水了！');
      return false;
    }
    let target = null;
    if (potionId) {
      target = potions.find(p => {
        const item = ItemDB.get(p.id);
        return item && (item.id === potionId || item.name === potionId);
      });
      if (!target) {
        Msg.danger('没有找到指定药水。');
        return false;
      }
    } else {
      // 命令行未指定药水时，保留原有自动选择逻辑。
      target = potions.find(p => { const it = ItemDB.get(p.id); return it.heal && Player.hp < Player.maxHp; });
      if (!target) target = potions.find(p => { const it = ItemDB.get(p.id); return it.mana && Player.mp < Player.maxMp; });
      if (!target) target = potions[0];
    }

    const item = ItemDB.get(target.id);
    Player.removeItem(target.id);
    if (item.heal) {
      const amount = Player.heal(item.heal);
      Msg.success(`🧪 使用了 ${item.name}，恢复 <span class="heal">${amount}</span> 点生命！`);
    }
    if (item.mana) {
      const amount = Player.restoreMp(item.mana);
      Msg.success(`🧪 使用了 ${item.name}，恢复 <span class="magic">${amount}</span> 点法力！`);
    }
    return true;
  },

  playerFlee() {
    const chance = 40 + (Player.level - this.enemy.level) * 10;
    if (Utils.chance(chance)) {
      Msg.info('🏃 你成功逃离了战斗！');
      this.end();
    } else {
      Msg.warning('逃跑失败！');
      this.enemyAction();
      Game.updateUI();
      if (Player.isDead()) this.defeat();
    }
  },

  enemyAction() {
    if (this.enemy.stunned) {
      Msg.info(`${this.enemy.name} 处于眩晕状态，无法行动！`);
      this.enemy.stunned = false;
      return;
    }
    let dmg = Utils.rand(Math.floor(this.enemy.atk * 0.8), this.enemy.atk);
    // 吸血鬼
    if (this.enemy.canDrain) {
      const drain = Math.floor(dmg * 0.3);
      this.enemy.currentHp = Math.min(this.enemyMaxHp, this.enemy.currentHp + drain);
    }
    // 暗黑法师魔法攻击
    if (this.enemy.canMagic && Utils.chance(40)) {
      dmg = Math.floor(dmg * 1.5);
      Msg.danger(`🔮 ${this.enemy.name} 释放了暗黑魔法！`);
    }
    const actual = Player.takeDamage(dmg);
    if (this.enemy.canDrain) Msg.danger(`🧛 ${this.enemy.name} 攻击了你，造成 <span class="damage">${actual}</span> 点伤害并恢复了生命！`);
    else Msg.danger(`👊 ${this.enemy.name} 攻击了你，造成 <span class="damage">${actual}</span> 点伤害！`);
  },

  processEffects() {
    // 玩家buff倒计时
    Player.buffs = Player.buffs.filter(b => {
      b.duration--;
      return b.duration > 0;
    });
    // 玩家中毒
    Player.statusEffects = Player.statusEffects.filter(e => {
      if (e.type === 'poison') {
        // 这是给敌人的效果，在敌人回合处理
      }
      e.duration--;
      return e.duration > 0;
    });
    // 敌人中毒伤害
    if (this.enemy.currentHp > 0) {
      // 简化：检查有没有对敌人的毒
      // (毒效果实际需要更复杂的系统，这里简化处理)
    }
  },

  victory() {
    const e = this.enemy;
    Msg.divider();
    Msg.success(`🎉 你击败了 <span class="enemy-name">${e.name}</span>！`);
    Player.gainExp(e.exp);
    Player.gold += e.gold;
    Msg.loot(`💰 获得 ${e.exp} 经验、${e.gold} 金币`);
    Player.stats.monstersKilled++;
    Player.killCount[e.id] = (Player.killCount[e.id] || 0) + 1;

    // 掉落物品
    if (e.drops) {
      e.drops.forEach(([itemId, chance]) => {
        if (Utils.chance(chance * 100)) {
          const item = ItemDB.get(itemId);
          if (item) {
            Player.addItem(itemId);
            Msg.loot(`🎁 获得: <span class="item-tag ${item.type}">${item.name}</span>`);
          }
        }
      });
    }
    this.end();
  },

  defeat() {
    Msg.divider();
    Msg.danger(`💀 你被 <span class="enemy-name">${this.enemy.name}</span> 击败了……`);
    Msg.warning('你在昏迷中被传送回了村庄。');
    Player.respawn();
    this.end();
    Game.look();
    Game.updateUI();
  },

  end() {
    this.active = false;
    this.enemy = null;
    this.hideMenus();
    document.getElementById('battle-bar').classList.remove('active');
    Game.updateUI();
  },

  updateBattleUI() {
    if (!this.enemy) return;
    // 不做额外UI，信息通过消息流展示
  }
};
