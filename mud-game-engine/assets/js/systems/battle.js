// ========== 战斗系统（时间轴模式） ==========
const Battle = {
  active: false,
  roomId: null,
  battlefield: null,
  eventQueue: [],
  currentActor: null,
  tickRate: 100,
  tickInterval: null,
  timeScale: 1,
  paused: false,
  playerAiming: null,
  playerTask: null,

  start(roomId, entryDir = 'south') {
    const room = MapSystem.getRoom(roomId);
    if (!room || !room.battlefield) {
      Msg.error('此区域无法展开战斗。');
      return false;
    }

    this.roomId = roomId;
    MapSystem.resetBattlefield(roomId);
    this.battlefield = MapSystem.initBattlefield(roomId, entryDir);

    if (this.battlefield.entryPos) {
      Player.position = [...this.battlefield.entryPos];
    }

    this.active = true;
    this.paused = false;
    this.eventQueue = [];
    this.playerAiming = null;
    this.playerTask = null;

    Msg.divider();
    Msg.warn(`⚔ 进入战斗：${room.name}`);
    Msg.info(`地形：${MapSystem.getTerrainName(this.battlefield.terrain)}`);
    Msg.info(`敌人数量：${this.battlefield.enemies.length}`);

    this.buildInitialTimeline();
    this.startTickLoop();
    BattleUI.render();
    return true;
  },

  end() {
    this.active = false;
    this.stopTickLoop();
    this.battlefield = null;
    this.roomId = null;
    this.eventQueue = [];
    this.currentActor = null;
    this.playerAiming = null;
    this.playerTask = null;
  },

  startTickLoop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      if (!this.paused) {
        this.tick();
      }
    }, this.tickRate);
  },

  stopTickLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  },

  tick() {
    if (!this.active || !this.battlefield) return;

    this.battlefield.time += this.timeScale;

    this.updateCooldowns();
    this.updateStatusEffects();
    this.regenEnergy();
    this.updateAI();

    this.checkWinLoss();

    if (this.timeScale > 0 && this.eventQueue.length > 0) {
      this.eventQueue.sort((a, b) => a.time - b.time);
      const next = this.eventQueue[0];
      if (next.time <= this.battlefield.time) {
        this.processEvent(next);
        this.eventQueue.shift();
      }
    }

    BattleUI.update();
  },

  updateCooldowns() {
    for (const slot of ['primary', 'secondary']) {
      if (Player.weaponCooldowns[slot] > 0) {
        Player.weaponCooldowns[slot] = Math.max(0, Player.weaponCooldowns[slot] - this.timeScale);
      }
    }
    for (const enemy of this.battlefield.enemies) {
      if (enemy.attackTimer > 0) {
        enemy.attackTimer = Math.max(0, enemy.attackTimer - this.timeScale);
      }
    }
  },

  updateStatusEffects() {
    const effects = [...Player.statusEffects];
    for (const eff of effects) {
      eff.duration -= this.timeScale;
      if (eff.duration <= 0) {
        Player.statusEffects = Player.statusEffects.filter(e => e !== eff);
      }
    }
    for (const enemy of this.battlefield.enemies) {
      const eEffects = [...enemy.statusEffects];
      for (const eff of eEffects) {
        eff.duration -= this.timeScale;
        if (eff.duration <= 0) {
          enemy.statusEffects = enemy.statusEffects.filter(e => e !== eff);
        }
      }
    }
  },

  regenEnergy() {
    if (Player.energy < Player.maxEnergy) {
      Player.energy = Math.min(Player.maxEnergy, Player.energy + (Player.energyRegen * this.timeScale / 10));
    }
  },

  updateAI() {
    for (const enemy of this.battlefield.enemies) {
      EnemyAI.update(enemy, this.battlefield);
    }
  },

  buildInitialTimeline() {
    this.eventQueue = [];
    this.scheduleEvent({ type: 'player_turn', actor: 'player' }, this.calculateInitiative(Player.speed));
    for (const enemy of this.battlefield.enemies) {
      this.scheduleEvent({ type: 'enemy_turn', actor: enemy.instanceId, enemyId: enemy.templateId },
        this.calculateInitiative(enemy.speed));
    }
  },

  calculateInitiative(speed) {
    const base = 100 / speed;
    return base + Utils.rand(0, 10);
  },

  scheduleEvent(event, delay) {
    event.time = this.battlefield.time + delay;
    this.eventQueue.push(event);
  },

  processEvent(event) {
    if (event.type === 'player_turn') {
      this.currentActor = 'player';
      this.onPlayerTurn();
    } else if (event.type === 'enemy_turn') {
      this.currentActor = event.actor;
      const enemy = this.battlefield.enemies.find(e => e.instanceId === event.actor);
      if (enemy) {
        this.onEnemyTurn(enemy);
      }
    } else if (event.type === 'move_complete') {
      if (event.actor === 'player') {
        this.onPlayerMoveComplete();
      } else {
        const enemy = this.battlefield.enemies.find(e => e.instanceId === event.actor);
        if (enemy) {
          this.onEnemyMoveComplete(enemy);
        }
      }
    } else if (event.type === 'attack_complete') {
      this.currentActor = null;
      if (event.actor === 'player') {
        this.scheduleNextPlayerTurn();
      } else {
        const enemy = this.battlefield.enemies.find(e => e.instanceId === event.actor);
        if (enemy) {
          this.scheduleNextEnemyTurn(enemy);
        }
      }
    }
  },

  onPlayerTurn() {
    if (Player.isDead()) return;

    if (this.playerTask) {
      this.executePlayerTask();
    } else {
      this.paused = true;
      Msg.prompt('> 等待指令（输入 move/fire/aim/use/status/retreat 等）');
    }
  },

  onEnemyTurn(enemy) {
    if (enemy.hp <= 0) return;
    EnemyAI.takeTurn(enemy, this.battlefield);
  },

  executePlayerTask() {
    if (!this.playerTask) return;

    const task = this.playerTask;
    if (task.type === 'move') {
      this.startPlayerMove(task.target);
    } else if (task.type === 'attack') {
      this.playerAttack(task.target, task.slot);
    }
  },

  startPlayerMove(targetPos) {
    const dx = targetPos[0] - Player.position[0];
    const dy = targetPos[1] - Player.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Player.currentSpeed;
    const time = dist / speed * 10;

    const clamped = this.clampToBattlefield(targetPos);
    Player.position = clamped;
    Player.facing = Math.atan2(dy, dx);

    this.scheduleEvent({ type: 'move_complete', actor: 'player' }, time);
    this.currentActor = 'player';
    Msg.info(`机体向 (${Math.round(clamped[0])}, ${Math.round(clamped[1])}) 移动中...`);
  },

  onPlayerMoveComplete() {
    this.currentActor = null;
    if (this.playerTask && this.playerTask.type === 'move') {
      this.playerTask = null;
    }
    this.scheduleNextPlayerTurn();
  },

  playerAttack(targetId, slot = 'primary') {
    const enemy = this.battlefield.enemies.find(e => e.instanceId === targetId);
    if (!enemy || enemy.hp <= 0) {
      Msg.error('目标无效或已被击毁。');
      this.paused = true;
      return;
    }

    const weapon = Player.equipment[slot];
    if (!weapon) {
      Msg.error('该武器槽为空。');
      this.paused = true;
      return;
    }

    if (Player.weaponCooldowns[slot] > 0) {
      Msg.error(`${weapon.name} 冷却中，剩余 ${Player.weaponCooldowns[slot].toFixed(1)}`);
      this.paused = true;
      return;
    }

    const dist = this.getDistance(Player.position, enemy.position);
    if (dist > weapon.range) {
      Msg.error(`目标超出射程（${dist.toFixed(0)}m / ${weapon.range}m）。`);
      this.paused = true;
      return;
    }

    if (weapon.energyCost && !Player.useEnergy(weapon.energyCost)) {
      Msg.error('能量不足！');
      this.paused = true;
      return;
    }

    const hitRate = this.calculateHitRate(Player, enemy, weapon, dist);
    const hit = Math.random() < hitRate;

    Player.weaponCooldowns[slot] = weapon.cooldown;
    Player.facing = Math.atan2(enemy.position[1] - Player.position[1], enemy.position[0] - Player.position[0]);

    let dmg = 0;
    if (hit) {
      const baseDmg = Utils.rand(weapon.damage - weapon.damageVariance, weapon.damage + weapon.damageVariance);
      const result = this.dealDamage(enemy, baseDmg, weapon.damageType);
      dmg = result.total;
      Msg.damage(`💥 ${weapon.name} 命中 ${enemy.name}[${enemy.instanceId}]！` +
        `装甲-${result.armor} 结构-${result.hp} (${dmg}总伤害)`);
      Player.stats.totalDmg += dmg;

      if (enemy.hp <= 0) {
        this.onEnemyKilled(enemy);
      }
    } else {
      Msg.miss(`❌ ${weapon.name} 未命中 ${enemy.name}[${enemy.instanceId}] (命中率 ${(hitRate*100).toFixed(0)}%)`);
    }

    this.playerTask = null;
    this.scheduleEvent({ type: 'attack_complete', actor: 'player' }, weapon.cooldown);
  },

  calculateHitRate(attacker, target, weapon, dist) {
    let hitRate = weapon.baseAccuracy;

    if (target.speed > 5) {
      hitRate *= Math.max(0.5, 1 - (target.speed - 5) * 0.03);
    }

    if (dist > weapon.optimalRange) {
      const overRange = dist - weapon.optimalRange;
      hitRate *= Math.max(0.1, 1 - overRange * 0.001);
    } else if (dist < weapon.optimalRange * 0.3) {
      hitRate = Math.min(0.99, hitRate * 1.2);
    }

    if (this.isInCover(target.position)) {
      hitRate *= 0.6;
    }

    if (weapon.spread && weapon.spread > 0) {
      hitRate *= Math.max(0.7, 1 - weapon.spread * 0.1);
    }

    return Math.max(0.01, Math.min(0.99, hitRate));
  },

  isInCover(pos) {
    if (!this.battlefield || !this.battlefield.covers) return false;
    for (const cover of this.battlefield.covers) {
      const dist = this.getDistance(pos, cover.pos);
      if (dist < (cover.radius || 30)) return true;
    }
    return false;
  },

  dealDamage(target, dmg, damageType = 'kinetic') {
    if (target.instanceId) {
      let remaining = dmg;
      let armorDmg = 0;
      let hpDmg = 0;
      if (damageType === 'kinetic') {
        armorDmg = Math.min(target.armor, remaining);
        target.armor -= armorDmg;
        remaining -= armorDmg;
        hpDmg = remaining;
      } else if (damageType === 'thermal') {
        armorDmg = Math.min(target.armor, Math.floor(remaining * 0.6));
        target.armor -= armorDmg;
        remaining = Math.max(0, remaining - armorDmg);
        hpDmg = remaining;
      } else if (damageType === 'shock') {
        armorDmg = Math.min(target.armor, Math.floor(remaining * 0.8));
        target.armor -= armorDmg;
        remaining = Math.max(0, remaining - armorDmg);
        hpDmg = remaining;
      } else if (damageType === 'corrosion') {
        hpDmg = remaining;
        if (Math.random() < 0.3) {
          target.statusEffects.push({ type: 'corrosion', value: 5, duration: 50 });
        }
      } else {
        hpDmg = remaining;
      }
      target.hp = Math.max(0, target.hp - hpDmg);
      return { total: dmg, armor: armorDmg, hp: hpDmg };
    } else {
      return Player.takeDamage(dmg, damageType);
    }
  },

  onEnemyKilled(enemy) {
    Msg.success(`🎯 击毁 ${enemy.name}[${enemy.instanceId}]！`);
    Player.stats.monstersKilled++;
    Player.killCount[enemy.templateId] = (Player.killCount[enemy.templateId] || 0) + 1;
    Player.gainExp(enemy.exp);
    if (enemy.loot) {
      for (const l of enemy.loot) {
        if (Math.random() < l.chance) {
          const count = Utils.rand(l.min || 1, l.max || 1);
          Player.addItem(l.item, count);
          const item = ItemDB[l.item];
          Msg.loot(`获得战利品：${item ? item.name : l.item} x${count}`);
        }
      }
    }
  },

  startEnemyMove(enemy, targetPos) {
    const dx = targetPos[0] - enemy.position[0];
    const dy = targetPos[1] - enemy.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const time = dist / enemy.speed * 10;

    enemy.position = this.clampToBattlefield(targetPos);
    enemy.facing = Math.atan2(dy, dx);

    this.scheduleEvent({ type: 'move_complete', actor: enemy.instanceId }, time);
  },

  onEnemyMoveComplete(enemy) {
    if (enemy.hp <= 0) return;
    this.scheduleNextEnemyTurn(enemy);
  },

  enemyAttack(enemy, targetPos) {
    const dist = this.getDistance(enemy.position, Player.position);
    if (dist > enemy.attackRange) return;

    const hitRate = this.calculateEnemyHitRate(enemy, dist);
    const hit = Math.random() < hitRate;

    enemy.attackTimer = enemy.attackCooldown;
    enemy.facing = Math.atan2(Player.position[1] - enemy.position[1], Player.position[0] - enemy.position[0]);

    if (hit) {
      const baseDmg = Utils.rand(Math.floor(enemy.damage * 0.8), Math.floor(enemy.damage * 1.2));
      const result = Player.takeDamage(baseDmg, enemy.damageType);
      Msg.damageEnemy(`💀 ${enemy.name}[${enemy.instanceId}] 攻击命中！` +
        `装甲-${result.armor} 结构-${result.hp} (${result.total}总伤害)`);

      if (Player.isDead()) {
        this.onPlayerDeath();
      }
    } else {
      Msg.missEnemy(`➖ ${enemy.name}[${enemy.instanceId}] 攻击未命中 (命中率 ${(hitRate*100).toFixed(0)}%)`);
    }

    this.scheduleEvent({ type: 'attack_complete', actor: enemy.instanceId }, enemy.attackCooldown);
  },

  calculateEnemyHitRate(enemy, dist) {
    let hitRate = 0.6;
    if (enemy.attackRange && dist > enemy.attackRange * 0.5) {
      hitRate *= Math.max(0.3, 1 - (dist - enemy.attackRange * 0.5) / (enemy.attackRange * 0.5) * 0.5);
    }
    if (this.isInCover(Player.position)) {
      hitRate *= 0.5;
    }
    if (Player.speed > 8) {
      hitRate *= Math.max(0.6, 1 - (Player.speed - 8) * 0.05);
    }
    return Math.max(0.05, Math.min(0.95, hitRate));
  },

  onPlayerDeath() {
    Msg.error('💀 机体被击毁！信号丢失...');
    this.paused = true;
    setTimeout(() => {
      this.end();
      Player.respawn();
      Game.showRoom();
    }, 1500);
  },

  scheduleNextPlayerTurn() {
    this.scheduleEvent({ type: 'player_turn', actor: 'player' }, this.calculateInitiative(Player.currentSpeed));
  },

  scheduleNextEnemyTurn(enemy) {
    this.scheduleEvent({ type: 'enemy_turn', actor: enemy.instanceId, enemyId: enemy.templateId },
      this.calculateInitiative(enemy.speed));
  },

  checkWinLoss() {
    if (!this.battlefield) return;
    const aliveEnemies = this.battlefield.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) {
      this.onBattleWin();
    }
  },

  onBattleWin() {
    Msg.divider();
    Msg.success('🏆 区域清空！所有敌人已被消灭。');
    this.paused = true;
    setTimeout(() => {
      this.end();
      Msg.info('你可以继续探索或返回基地。');
      BattleUI.remove();
      Game.showRoom();
    }, 1000);
  },

  retreat() {
    if (!this.active) return false;
    Msg.warn('撤退中...');
    this.paused = true;
    setTimeout(() => {
      this.end();
      const room = MapSystem.getRoom(Player.room);
      const dirs = Object.keys(room.exits || {});
      if (dirs.length > 0) {
        const firstDir = dirs[0];
        const prevRoom = room.exits[firstDir];
        Player.room = prevRoom;
        Player.position = [500, 500];
      }
      BattleUI.remove();
      Game.showRoom();
    }, 800);
    return true;
  },

  getDistance(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
  },

  clampToBattlefield(pos) {
    if (!this.battlefield) return pos;
    const [w, h] = this.battlefield.size;
    return [
      Math.max(10, Math.min(w - 10, pos[0])),
      Math.max(10, Math.min(h - 10, pos[1]))
    ];
  },

  setPlayerTask(task) {
    this.playerTask = task;
    if (this.paused && this.currentActor === 'player') {
      this.paused = false;
      this.executePlayerTask();
    }
  },

  resume() {
    this.paused = false;
  }
};
