// ========== 时间轴回合制战斗系统 ==========
// 基于时间轴的行动队列：所有单位按时间顺序行动，行动消耗时间推进时间轴
// 战场为 1000x1000 坐标系，单位在其中移动、瞄准、射击

const Battle = {
  active: false,
  paused: true,
  currentActor: null,
  battlefield: null,
  eventQueue: [],
  onEnd: null,
  tickInterval: null,
  enemyCounter: 0,

  // ===== 战斗启动 =====
  start(enemyId) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.enemies || room.enemies.length === 0) {
      Msg.warning('这里没有可以攻击的目标。');
      return;
    }

    // 重置战场状态，避免缓存导致敌人血量为 0
    this.battlefield = {
      width: 1000,
      height: 1000,
      time: 0,
      enemies: [],
      playerTask: null,
    };
    this.eventQueue = [];
    this.enemyCounter = 0;
    this.paused = true;
    this.currentActor = 'player';

    // 玩家位置
    Player.position = [500, 950];

    // 生成敌人
    const possible = room.enemies.filter(([_, chance]) => Utils.chance(chance * 100));
    if (possible.length === 0) {
      Msg.info('周围一片安静，没有发现敌人。');
      this.battlefield = null;
      return;
    }

    for (const [eid, _] of possible) {
      const template = EnemyDB[eid];
      if (!template) continue;
      this.enemyCounter++;
      const instanceId = eid.substring(0, 3).toUpperCase() + this.enemyCounter;
      const enemy = {
        ...template,
        // 时间轴战斗系统属性（为旧版敌人提供默认值）
        armor: template.armor || template.def || 0,
        speed: template.speed || 10,
        visionRadius: template.visionRadius || 350,
        signalRadius: template.signalRadius || 1.5,
        targetRadius: template.targetRadius || 1.5,
        damage: template.damage || template.atk || 10,
        damageType: template.damageType || 'kinetic',
        attackRange: template.attackRange || 200,
        attackCooldown: template.attackCooldown || 12,
        spread: template.spread || 0.1,
        aiType: template.aiType || 'default',
        loot: template.loot || null,
        // 实例属性
        instanceId,
        templateId: eid,
        maxHp: template.hp,
        maxArmor: template.armor || template.def || 0,
        position: [
          Utils.rand(300, 700),
          Utils.rand(100, 400)
        ],
        state: 'idle',
        lastAttackTime: -999,
        target: null,
      };
      this.battlefield.enemies.push(enemy);
    }

    this.active = true;
    document.getElementById('battle-bar').classList.add('active');
    document.getElementById('battle-enemy-name').textContent = `${this.battlefield.enemies.length} 个敌人`;

    Msg.divider();
    Msg.add(`⚔ 遭遇 <span class="enemy-name">${this.battlefield.enemies.length}</span> 个敌人！`, 'combat-title');
    this.battlefield.enemies.forEach(e => {
      Msg.info(`  ${e.instanceId} ${e.name} (HP:${e.hp} 装甲:${e.armor})`);
    });
    Msg.info('输入 fire 敌人编号 进行攻击，或使用战斗按钮。');

    // 初始化事件队列：玩家先行动
    this.scheduleEvent({ type: 'player_turn', time: 0, actor: 'player' });
    // 敌人行动
    this.battlefield.enemies.forEach(e => {
      this.scheduleEvent({ type: 'enemy_turn', time: e.speed, actor: e.instanceId });
    });

    if (typeof BattleUI !== 'undefined') BattleUI.render();
    Game.updateUI();
  },

  // ===== 事件队列管理 =====
  scheduleEvent(evt) {
    this.eventQueue.push(evt);
  },

  removeEventsByActor(actor) {
    this.eventQueue = this.eventQueue.filter(e => e.actor !== actor);
  },

  getNextEvent() {
    if (this.eventQueue.length === 0) return null;
    return this.eventQueue.reduce((min, e) => e.time < min.time ? e : min);
  },

  advanceTime() {
    const next = this.getNextEvent();
    if (!next) return;

    const dt = next.time - this.battlefield.time;
    this.battlefield.time = next.time;

    // 移除该事件
    const idx = this.eventQueue.indexOf(next);
    if (idx !== -1) this.eventQueue.splice(idx, 1);

    return next;
  },

  // ===== 玩家行动 =====
  setPlayerTask(task) {
    this.battlefield.playerTask = task;
    this.processPlayerAction(task);
  },

  processPlayerAction(task) {
    if (task.type === 'attack' || task.type === 'fire') {
      const enemy = this.battlefield.enemies.find(e => e.instanceId === task.target);
      if (!enemy || enemy.hp <= 0) {
        Msg.warning('目标无效或已死亡。');
        this.paused = true;
        return;
      }
      this.playerAttack(enemy);
    } else if (task.type === 'move') {
      this.playerMove(task.target);
    } else if (task.type === 'skill') {
      this.playerSkill(task.skill);
    } else if (task.type === 'potion') {
      this.playerPotion(task.potion);
    } else if (task.type === 'flee') {
      this.playerFlee();
      return;
    }

    // 安排下一次玩家行动
    const weapon = Player.equipment.primary;
    const attackTime = weapon && weapon.attackTime ? weapon.attackTime : 10;
    this.scheduleEvent({ type: 'player_turn', time: this.battlefield.time + attackTime, actor: 'player' });
  },

  playerAttack(enemy) {
    const dist = this.getDistance(Player.position, enemy.position);
    const weapon = Player.equipment.primary;

    // 命中率计算
    let hitRate = 0.9; // 基础命中率 90%
    if (weapon && weapon.range) {
      const rangeRatio = dist / weapon.range;
      if (rangeRatio > 1) {
        hitRate *= 0.3; // 超出射程大幅降低命中率
      } else if (rangeRatio > 0.7) {
        hitRate *= 0.7;
      }
    }
    // 目标移动修正
    if (enemy.state === 'pursue') hitRate *= 0.85;

    const hit = Utils.chance(hitRate * 100);

    if (!hit) {
      Msg.warning(`❌ 你攻击 ${enemy.name}[${enemy.instanceId}] 未命中！`);
      if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`你攻击 ${enemy.name}[${enemy.instanceId}] 未命中`, '#888');
      return;
    }

    // 伤害计算
    let dmg = Player.atk;
    // 暴击
    const isCrit = Utils.chance(Player.critRate);
    if (isCrit) dmg = Math.floor(dmg * 1.8);

    // 装甲减免
    const armorReduction = enemy.armor / (enemy.armor + 50);
    dmg = Math.floor(dmg * (1 - armorReduction));
    dmg = Utils.rand(Math.floor(dmg * 0.9), Math.floor(dmg * 1.1));
    dmg = Math.max(1, dmg);

    enemy.hp -= dmg;
    Player.stats.totalDmg += dmg;

    const critText = isCrit ? ' <span class="damage">暴击！</span>' : '';
    Msg.info(`🔫 你攻击 ${enemy.name}[${enemy.instanceId}] 命中 <span class="damage">${dmg}</span> 伤害${critText}`);
    if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`你攻击 ${enemy.name}[${enemy.instanceId}] 命中 ${dmg}伤害`, '#4f4');

    // 检查敌人是否死亡
    if (enemy.hp <= 0) {
      this.onEnemyKilled(enemy);
    } else {
      // 敌人警觉
      if (enemy.state === 'idle') {
        enemy.state = 'alert';
      }
    }
  },

  playerMove(targetPos) {
    const dx = targetPos[0] - Player.position[0];
    const dy = targetPos[1] - Player.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = 100; // 每tick移动100米
    const moveTime = Math.ceil(dist / moveSpeed);

    // 简化：直接移动到目标位置
    Player.position = [...targetPos];
    Msg.info(`🏃 移动到 (${targetPos[0].toFixed(0)}, ${targetPos[1].toFixed(0)})，耗时 ${moveTime}t`);
    if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`移动到 (${targetPos[0].toFixed(0)}, ${targetPos[1].toFixed(0)})`, '#8f8');

    this.scheduleEvent({ type: 'move_complete', time: this.battlefield.time + moveTime, actor: 'player' });
  },

  playerSkill(skillId) {
    let skill = null;
    for (const [id, s] of Object.entries(SkillDB)) {
      if (s.name === skillId || id === skillId) { skill = s; break; }
    }
    if (!skill || !Player.skills.includes(skill.id)) {
      Msg.danger('未知技能或尚未习得。');
      return;
    }
    if (Player.mp < skill.mpCost) {
      Msg.danger('法力不足！');
      return;
    }
    Player.mp -= skill.mpCost;

    if (skill.type === 'attack') {
      const target = this.battlefield.enemies.find(e => e.hp > 0);
      if (target) {
        let dmg = Math.floor(Player.atk * skill.mult);
        dmg = Math.max(1, dmg - Math.floor(target.armor * 0.3));
        target.hp -= dmg;
        Player.stats.totalDmg += dmg;
        Msg.magic(`✨ ${skill.name}！对 ${target.name} 造成 <span class="damage">${dmg}</span> 点伤害！`);
        if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`${skill.name} 命中 ${target.name} ${dmg}伤害`, '#f8f');
        if (target.hp <= 0) this.onEnemyKilled(target);
      }
    } else if (skill.type === 'heal') {
      const amount = Player.heal(Math.floor(Player.maxHp * 0.3 + Player.level * skill.mult * 5));
      Msg.magic(`💚 ${skill.name}！恢复了 <span class="heal">${amount}</span> 点生命值！`);
      if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`${skill.name} 恢复 ${amount}HP`, '#8f8');
    }
  },

  playerPotion(potionId) {
    const potions = Player.inventory.filter(i => {
      const item = ItemDB.get(i.id);
      return item && item.type === 'potion';
    });
    if (potions.length === 0) {
      Msg.danger('没有药水了！');
      return;
    }
    let target = null;
    if (potionId) {
      target = potions.find(p => {
        const item = ItemDB.get(p.id);
        return item && (item.id === potionId || item.name === potionId);
      });
    }
    if (!target) target = potions[0];
    if (!target) return;

    const item = ItemDB.get(target.id);
    Player.removeItem(target.id);
    if (item.heal) {
      const amount = Player.heal(item.heal);
      Msg.success(`🧪 使用了 ${item.name}，恢复 <span class="heal">${amount}</span> 点生命！`);
      if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`使用 ${item.name} 恢复 ${amount}HP`, '#8f8');
    }
    if (item.mana) {
      const amount = Player.restoreMp(item.mana);
      Msg.success(`🧪 使用了 ${item.name}，恢复 <span class="magic">${amount}</span> 点法力！`);
    }
  },

  playerFlee() {
    const success = Utils.chance(50);
    if (success) {
      Msg.info('🏃 你成功逃离了战斗！');
      this.end();
    } else {
      Msg.warning('逃跑失败！');
      if (typeof BattleUI !== 'undefined') BattleUI.addHistory('逃跑失败', '#888');
    }
  },

  // ===== 敌人 AI =====
  enemyTurn(enemy) {
    if (enemy.hp <= 0) return;

    const dist = this.getDistance(Player.position, enemy.position);

    // AI 状态机
    if (enemy.aiType === 'bug_charge' || enemy.aiType === 'bug_worker') {
      if (dist <= enemy.attackRange) {
        // 在攻击范围内，攻击
        this.enemyAttack(enemy, dist);
        this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.attackCooldown, actor: enemy.instanceId });
      } else {
        // 移动接近玩家
        this.enemyMoveToward(enemy, Player.position);
        enemy.state = 'pursue';
        this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.speed, actor: enemy.instanceId });
      }
    } else if (enemy.aiType === 'bug_ranged') {
      if (dist <= enemy.attackRange) {
        this.enemyAttack(enemy, dist);
        this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.attackCooldown, actor: enemy.instanceId });
      } else {
        this.enemyMoveToward(enemy, Player.position);
        enemy.state = 'pursue';
        this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.speed, actor: enemy.instanceId });
      }
    } else if (enemy.aiType === 'drone_patrol') {
      if (dist <= enemy.visionRadius) {
        enemy.state = 'pursue';
        if (dist <= enemy.attackRange) {
          this.enemyAttack(enemy, dist);
          this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.attackCooldown, actor: enemy.instanceId });
        } else {
          this.enemyMoveToward(enemy, Player.position);
          this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.speed, actor: enemy.instanceId });
        }
      } else {
        // 巡逻
        enemy.state = 'idle';
        this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.speed, actor: enemy.instanceId });
      }
    } else {
      // 默认 AI
      if (dist <= enemy.attackRange) {
        this.enemyAttack(enemy, dist);
        this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.attackCooldown, actor: enemy.instanceId });
      } else {
        this.enemyMoveToward(enemy, Player.position);
        this.scheduleEvent({ type: 'enemy_turn', time: this.battlefield.time + enemy.speed, actor: enemy.instanceId });
      }
    }
  },

  enemyMoveToward(enemy, targetPos) {
    const dx = targetPos[0] - enemy.position[0];
    const dy = targetPos[1] - enemy.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = 80; // 敌人移动速度
    if (dist <= moveSpeed) {
      enemy.position = [...targetPos];
    } else {
      enemy.position[0] += (dx / dist) * moveSpeed;
      enemy.position[1] += (dy / dist) * moveSpeed;
    }
  },

  enemyAttack(enemy, dist) {
    // 命中率
    let hitRate = 1.0 - enemy.spread;
    if (dist > enemy.attackRange * 0.7) hitRate *= 0.8;

    const hit = Utils.chance(hitRate * 100);
    if (!hit) {
      Msg.info(`💨 ${enemy.name}[${enemy.instanceId}] 的攻击落空了！`);
      if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}] 攻击落空`, '#888');
      return;
    }

    // 伤害计算
    let dmg = enemy.damage;
    const armorReduction = Player.def / (Player.def + 50);
    dmg = Math.floor(dmg * (1 - armorReduction));
    dmg = Utils.rand(Math.floor(dmg * 0.9), Math.floor(dmg * 1.1));
    dmg = Math.max(1, dmg);

    Player.hp = Math.max(0, Player.hp - dmg);
    Msg.danger(`👊 ${enemy.name}[${enemy.instanceId}] 攻击了你，造成 <span class="damage">${dmg}</span> 点伤害！`);
    if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}] 攻击你 ${dmg}伤害`, '#f44');

    if (Player.isDead()) {
      this.defeat();
    }
  },

  // ===== 敌人死亡 =====
  onEnemyKilled(enemy) {
    enemy.hp = 0;
    Msg.success(`🎯 击毁 ${enemy.name}[${enemy.instanceId}]！`);
    if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`击毁 ${enemy.name}[${enemy.instanceId}]`, '#fc0');
    Player.stats.monstersKilled++;
    Player.killCount[enemy.templateId] = (Player.killCount[enemy.templateId] || 0) + 1;
    Player.gainExp(enemy.exp);

    // 战利品
    if (enemy.loot) {
      for (const l of enemy.loot) {
        if (Math.random() < l.chance) {
          const count = Utils.rand(l.min || 1, l.max || 1);
          Player.addItem(l.item, count);
          const item = ItemDB.get(l.item);
          Msg.loot(`获得战利品：${item ? item.name : l.item} x${count}`);
          if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`获得 ${item ? item.name : l.item} x${count}`, '#f8f');
        }
      }
    } else if (enemy.drops) {
      // 兼容旧版 drops 格式
      enemy.drops.forEach(([itemId, chance]) => {
        if (Utils.chance(chance * 100)) {
          const item = ItemDB.get(itemId);
          if (item) {
            Player.addItem(itemId);
            Msg.loot(`🎁 获得: <span class="item-tag ${item.type}">${item.name}</span>`);
            if (typeof BattleUI !== 'undefined') BattleUI.addHistory(`获得 ${item.name}`, '#f8f');
          }
        }
      });
    }

    // 移除该敌人的所有事件
    this.removeEventsByActor(enemy.instanceId);

    // 检查是否所有敌人都已死亡
    const alive = this.battlefield.enemies.filter(e => e.hp > 0);
    if (alive.length === 0) {
      this.victory();
    }
  },

  // ===== 战斗结束 =====
  victory() {
    Msg.divider();
    Msg.success('🎉 战斗胜利！');
    const totalExp = this.battlefield.enemies.reduce((s, e) => s + e.exp, 0);
    Msg.info(`获得 ${totalExp} 经验`);
    this.end();
  },

  defeat() {
    Msg.divider();
    Msg.danger('💀 你被击败了……');
    Msg.warning('你在昏迷中被传送回了村庄。');
    Player.respawn();
    this.end();
    Game.look();
  },

  end() {
    this.active = false;
    this.paused = true;
    this.battlefield = null;
    this.eventQueue = [];
    this.currentActor = null;
    document.getElementById('battle-bar').classList.remove('active');
    if (typeof BattleUI !== 'undefined') BattleUI.remove();
    Game.updateUI();
  },

  // ===== 工具方法 =====
  getDistance(pos1, pos2) {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];
    return Math.sqrt(dx * dx + dy * dy);
  },

  // ===== 兼容旧版接口 =====
  action(type, param) {
    if (!this.active) return;
    if (type === 'attack') {
      // 找第一个活着的敌人
      const target = this.battlefield.enemies.find(e => e.hp > 0);
      if (target) {
        this.setPlayerTask({ type: 'attack', target: target.instanceId });
      }
    } else if (type === 'skill') {
      this.setPlayerTask({ type: 'skill', skill: param });
    } else if (type === 'potion') {
      this.setPlayerTask({ type: 'potion', potion: param });
    } else if (type === 'flee') {
      this.setPlayerTask({ type: 'flee' });
    }
  },

  toggleSkillMenu() {
    if (!this.active) return;
    const menu = document.getElementById('battle-skill-menu');
    if (menu) menu.classList.toggle('active');
  },

  togglePotionMenu() {
    if (!this.active) return;
    const menu = document.getElementById('battle-potion-menu');
    if (menu) menu.classList.toggle('active');
  },

  hideMenus() {
    ['battle-skill-menu', 'battle-potion-menu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
  },

  renderBattleMenus() {
    // 兼容旧版
  },

  updateBattleUI() {
    // 兼容旧版
  },
};
