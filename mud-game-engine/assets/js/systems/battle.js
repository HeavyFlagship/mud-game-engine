// ========== 战斗系统（战斗状态 + 战斗逻辑） ==========
// 时间轴机制由 Timeline 负责，本模块通过注册 handler/updater 使用时间轴。
const Battle = {
  active: false,
  combatActive: false,
  roomId: null,
  battlefield: null,
  currentActor: null,
  playerAiming: null,
  playerTask: null,
  playerIdleEnd: null,
  isProcessing: false,
  playerFireHint: null,

  start(roomId, entryDir = 'south', prevPos = null) {
    const room = MapSystem.getRoom(roomId);
    if (!room || !room.battlefield) {
      this.active = false;
      this.combatActive = false;
      return false;
    }

    this.roomId = roomId;
    MapSystem.resetBattlefield(roomId);
    this.battlefield = MapSystem.initBattlefield(roomId, entryDir, prevPos);

    if (this.battlefield.entryPos) {
      Player.position = [...this.battlefield.entryPos];
    }

    this.active = true;
    this.combatActive = false;
    this.playerAiming = null;
    this.playerTask = null;
    this.playerIdleEnd = null;
    this.isProcessing = false;
    this.playerFireHint = null;

    // 启动时间轴并注册战斗系统的事件处理器与更新器
    Timeline.start(Timeline.time);
    this.registerHandlers();
    this.registerUpdaters();
    Timeline.onTickEnd = () => { BattleUI.update(); };

    this.buildInitialTimeline();
    BattleUI.render();
    Timeline.scheduleNext();
    return true;
  },

  // 注册战斗相关事件处理器
  registerHandlers() {
    Timeline.on('player_turn', () => {
      BattleUI.clearCurrentActions();
      this.currentActor = 'player';
      BattleUI.addCurrentAction('你的行动', '#0ff');
      this.onPlayerTurn();
    });
    Timeline.on('enemy_turn', (e) => {
      this.currentActor = e.actor;
      const enemy = this.battlefield.enemies.find(en => en.instanceId === e.actor);
      if (enemy) this.onEnemyTurn(enemy);
      else Timeline.scheduleNext();
    });
    Timeline.on('move_complete', (e) => {
      if (e.actor === 'player') {
        BattleUI.removeCurrentAction('移动中...');
        this.onPlayerMoveComplete();
      } else {
        const enemy = this.battlefield.enemies.find(en => en.instanceId === e.actor);
        if (enemy) {
          BattleUI.removeCurrentAction(`${enemy.name}[${enemy.instanceId}]移动中...`);
          this.onEnemyMoveComplete(enemy);
        } else {
          Timeline.scheduleNext();
        }
      }
    });
    Timeline.on('attack_complete', (e) => {
      this.currentActor = null;
      const enemy = this.battlefield.enemies.find(en => en.instanceId === e.actor);
      if (enemy) this.scheduleNextEnemyTurn(enemy);
      else Timeline.scheduleNext();
    });
    Timeline.on('npc_call', (e) => {
      BattleUI.removeCurrentAction('通信中...');
      BattleUI.addCurrentAction('通信完成', '#8cf');
      this.onNPCCall(e.npcId);
    });
    Timeline.on('player_idle_end', () => {
      this.playerIdleEnd = null;
      this.currentActor = 'player';
      BattleUI.clearCurrentActions();
      BattleUI.addCurrentAction('你的行动', '#0ff');
      this.onPlayerTurn();
    });
    Timeline.on('player_fire', (e) => {
      const weapon = Player.equipment[e.slot]?.equip;
      this.playerAttack(e.target, e.slot);
      if (weapon) {
        Timeline.scheduleEvent({ type: 'weapon_ready', actor: 'player', slot: e.slot }, weapon.cooldown);
      }
      Timeline.scheduleNext();
    });
    Timeline.on('weapon_ready', (e) => {
      const weapon = Player.equipment[e.slot]?.equip;
      const wName = weapon ? weapon.name : e.slot;
      Msg.info(`🔫 ${wName} 冷却完成，已就绪。`);
      BattleUI.update();
      const isMoving = Timeline.continuousActions.some(a => a.actor === 'player' && a.type === 'move');
      const hasIdle = !!this.playerIdleEnd;
      if (isMoving) {
        if (Timeline.paused) {
          Timeline.paused = false;
          Timeline.scheduleNext();
        }
      } else if (hasIdle) {
        this.cancelPlayerIdle();
        this.triggerPlayerDecision();
      } else {
        this.triggerPlayerDecision();
      }
    });
  },

  // 注册战斗相关时间更新器
  registerUpdaters() {
    Timeline.addUpdater('cooldowns', (delta) => this.updateCooldowns(delta));
    Timeline.addUpdater('statusEffects', (delta) => this.updateStatusEffects(delta));
    Timeline.addUpdater('energy', (delta) => this.regenEnergy(delta));
    Timeline.addUpdater('ai', (delta) => this.updateAI(delta));
    Timeline.addUpdater('winLoss', () => this.checkWinLoss());
  },

  end() {
    this.active = false;
    this.combatActive = false;
    Timeline.stop();
    Timeline.onTickEnd = null;
    this.battlefield = null;
    this.roomId = null;
    this.currentActor = null;
    this.playerAiming = null;
    this.playerTask = null;
    this.playerIdleEnd = null;
    this.isProcessing = false;
    this.playerFireHint = null;
  },

  enterCombat(reason = '') {
    if (this.combatActive) return;
    this.combatActive = true;
    Msg.warn(`⚔ 进入战斗状态！${reason}`);
    BattleUI.addHistory('系统', '#f55', `战斗开始`);

    const wasMoving = this.playerTask && this.playerTask.type === 'move';
    const wasCalling = this.playerTask && this.playerTask.type === 'call';
    const wasIdling = this.playerIdleEnd !== null;
    const needInterrupt = wasMoving || wasCalling || wasIdling;

    if (wasMoving) {
      Msg.info('⚡ 战斗中断移动，立即进入行动阶段。');
      Timeline.cancelEvents(e => e.type === 'move_complete' && e.actor === 'player');
      Timeline.removeContinuousAction('player', 'move');
      BattleUI.removeCurrentAction('移动中...');
    }
    if (wasCalling) {
      Msg.info('⚡ 战斗中断通信，立即进入行动阶段。');
      Timeline.cancelEventsByType('npc_call');
      BattleUI.removeCurrentAction('通信中...');
    }
    if (wasIdling) {
      Msg.info('⚡ 战斗中断待机，立即进入行动阶段。');
      this.cancelPlayerIdle();
    }

    this.playerTask = null;
    if (needInterrupt) {
      this.triggerPlayerDecision();
    }
  },

  cancelPlayerIdle() {
    if (this.playerIdleEnd) {
      Timeline.cancelEventsByType('player_idle_end');
      this.playerIdleEnd = null;
      return true;
    }
    return false;
  },

  interruptPlayerMove() {
    Timeline.cancelEvents(e => e.type === 'move_complete' && e.actor === 'player');
    Timeline.removeContinuousAction('player', 'move');
    if (this.playerTask && this.playerTask.type === 'move') {
      this.playerTask = null;
    }
    BattleUI.clearCurrentActions();
    this.triggerPlayerDecision();
  },

  playerIdle(seconds) {
    this.cancelPlayerIdle();
    Timeline.cancelEvents(e => e.type === 'player_turn' && e.actor === 'player');
    Timeline.scheduleEvent({ type: 'player_idle_end', actor: 'player' }, seconds);
    this.playerIdleEnd = Timeline.time + seconds;
    BattleUI.addHistory('你', '#888', `待机${seconds}秒`);
    if (Timeline.paused) {
      Timeline.paused = false;
    }
    Timeline.scheduleNext();
  },

  triggerPlayerDecision() {
    Timeline.cancelEvents(e => e.type === 'player_turn' || e.type === 'player_idle_end');
    this.playerIdleEnd = null;
    this.currentActor = 'player';
    BattleUI.clearCurrentActions();
    BattleUI.addCurrentAction('你的行动', '#0ff');
    Timeline.paused = true;
    // 移动已完成，开火提示不再适用
    this.playerFireHint = null;
    const hint = this.combatActive
      ? '> 战斗中（输入 move/fire/look/use/status/retreat 等）'
      : '> 场景中（输入 move/call/fire/status/look 等）';
    Msg.prompt(hint);
  },

  exitCombat() {
    if (!this.combatActive) return;
    this.combatActive = false;
    Msg.info('⛑ 脱离战斗状态，场景时间轴继续运行。');
  },

  updateCooldowns(delta) {
    for (const slotKey of Object.keys(Player.weaponCooldowns)) {
      if (Player.weaponCooldowns[slotKey] > 0) {
        Player.weaponCooldowns[slotKey] = Math.max(0, Player.weaponCooldowns[slotKey] - delta);
      }
    }
    for (const enemy of this.battlefield.enemies) {
      if (enemy.attackTimer > 0) {
        enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
      }
    }
  },

  updateStatusEffects(delta) {
    const effects = [...Player.statusEffects];
    for (const eff of effects) {
      eff.duration -= delta;
      if (eff.duration <= 0) {
        Player.statusEffects = Player.statusEffects.filter(e => e !== eff);
      }
    }
    for (const enemy of this.battlefield.enemies) {
      const eEffects = [...enemy.statusEffects];
      for (const eff of eEffects) {
        eff.duration -= delta;
        if (eff.duration <= 0) {
          enemy.statusEffects = enemy.statusEffects.filter(e => e !== eff);
        }
      }
    }
  },

  regenEnergy(delta) {
    if (Player.energy < Player.maxEnergy) {
      Player.energy = Math.min(Player.maxEnergy, Player.energy + (Player.energyRegen * delta));
    }
  },

  updateAI(delta) {
    for (const enemy of this.battlefield.enemies) {
      EnemyAI.update(enemy, this.battlefield, delta);
    }
  },

  buildInitialTimeline() {
    Timeline.eventQueue = [];
    Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, this.calculateInitiative(Player.speed));
    for (const enemy of this.battlefield.enemies) {
      Timeline.scheduleEvent({ type: 'enemy_turn', actor: enemy.instanceId, enemyId: enemy.templateId },
        this.calculateInitiative(enemy.speed));
    }
  },

  calculateInitiative(speed) {
    const base = 100 / speed;
    return base + Utils.rand(0, 10);
  },

  onPlayerTurn() {
    if (Player.isDead()) return;

    if (this.playerTask) {
      this.executePlayerTask();
    } else {
      Timeline.paused = true;
      // 保留的开火提示：重新询问
      if (this.playerFireHint && this.playerFireHint.pendingMove) {
        const readyNames = Player.getEquippedWeapons()
          .filter(w => (Player.weaponCooldowns[w.slot] || 0) <= 0)
          .map(w => w.name);
        if (readyNames.length > 0) {
          Msg.prompt(`武器已就绪（${readyNames.join('、')}）：输入 fire <目标> 移动开火，或 continue 跳过开火，或 continue <秒数> 延迟后重新询问。`);
          return;
        }
        // 武器已全部冷却中，清除提示
        this.playerFireHint = null;
      }
      const hint = this.combatActive
        ? '> 战斗中（输入 move/fire/look/use/status/retreat 等）'
        : '> 场景中（输入 move/call/fire/status/look 等）';
      Msg.prompt(hint);
    }
  },

  onEnemyTurn(enemy) {
    if (enemy.hp <= 0) {
      Timeline.scheduleNext();
      return;
    }
    EnemyAI.takeTurn(enemy, this.battlefield);
    Timeline.scheduleNext();
  },

  executePlayerTask() {
    if (!this.playerTask) return;

    const task = this.playerTask;
    if (task.type === 'move') {
      this._moveAutoExit = task.autoExit || null;
      this.playerTask = null;
      this.startPlayerMove(task.target);
    } else if (task.type === 'call') {
      this.playerTask = null;
      BattleUI.addHistory('你', '#8cf', '通信');
      BattleUI.addCurrentAction('通信中...', '#8cf');
      Timeline.scheduleEvent({ type: 'npc_call', actor: 'player', npcId: task.npcId }, 5);
      Timeline.scheduleNext();
    } else if (task.type === 'wait') {
      BattleUI.addHistory('你', '#888', '等待');
      this.playerTask = null;
      this.scheduleNextPlayerTurn();
    }
  },

  startPlayerMove(targetPos) {
    const startPos = [...Player.position];
    const dx = targetPos[0] - Player.position[0];
    const dy = targetPos[1] - Player.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Player.currentSpeed;
    const time = dist / speed;

    const clamped = this.clampToBattlefield(targetPos);
    Player.facing = Math.atan2(dy, dx);

    BattleUI.addHistory('你', '#8f8', '移动');
    const moveAction = Timeline.createContinuousAction('player', 'move', Timeline.time, time, {
      startPos,
      endPos: clamped
    }, (pos) => { Player.position = pos; });
    Timeline.addContinuousAction(moveAction);
    Timeline.scheduleEvent({ type: 'move_complete', actor: 'player' }, time);
    this.currentActor = 'player';
    BattleUI.addCurrentAction('移动中...', '#8f8');
    Msg.info(`机体向 (${Math.round(clamped[0])}, ${Math.round(clamped[1])}) 移动中...`);
    Timeline.scheduleNext();
  },

  onPlayerMoveComplete() {
    this.currentActor = null;
    const autoExit = this._moveAutoExit;
    this._moveAutoExit = null;
    this.playerTask = null;
    if (autoExit) {
      const room = MapSystem.getRoom(Player.room);
      if (room && room.exits && room.exits[autoExit]) {
        Msg.info(`已到达${MapSystem.getDirectionName(autoExit)}边界，切换场景...`);
        this.end();
        BattleUI.remove();
        Game.move(autoExit);
        return;
      }
      Msg.warn(`已到达边界，但${MapSystem.getDirectionName(autoExit)}方向没有出口。`);
    }
    this.triggerPlayerDecision();
  },

  playerAttack(targetId, slot = 'primary') {
    const enemy = this.battlefield.enemies.find(e => e.instanceId === targetId);
    if (!enemy || enemy.hp <= 0) {
      Msg.error('目标无效或已被击毁。');
      return false;
    }

    const weapon = Player.equipment[slot]?.equip;
    if (!weapon) {
      Msg.error('该武器槽为空。');
      return false;
    }

    if (Player.weaponCooldowns[slot] > 0) {
      Msg.error(`${weapon.name} 冷却中，剩余 ${Player.weaponCooldowns[slot].toFixed(1)}秒`);
      return false;
    }

    const dist = this.getDistance(Player.position, enemy.position);
    if (dist > weapon.range) {
      Msg.error(`目标超出射程（${dist.toFixed(0)}m / ${weapon.range}m）。`);
      return false;
    }

    if (!Player.hasAmmo(weapon, slot)) {
      Msg.error('弹药不足！');
      return false;
    }
    const energyCost = weapon.energyPerShot || weapon.energyCost || 0;
    if (energyCost > 0 && !Player.useEnergy(energyCost)) {
      Msg.error('能量不足！');
      return false;
    }

    Player.consumeAmmo(weapon, slot);

    this.enterCombat(`开火攻击 ${enemy.name}[${enemy.instanceId}]`);
    BattleUI.addHistory('你', '#fa4', '攻击');

    const ts = BattleUI.formatGameTime(Timeline.time, 'hh:mm:ss');
    const hitRate = this.calculateHitRate(Player, enemy, weapon, dist);
    const hit = Math.random() < hitRate;

    Player.weaponCooldowns[slot] = weapon.cooldown;
    Player.facing = Math.atan2(enemy.position[1] - Player.position[1], enemy.position[0] - Player.position[0]);

    let dmg = 0;
    if (hit) {
      let baseDmg = 0;
      let damageType = weapon.damageType || 'kinetic';
      if (weapon.damageTable) {
        let maxDmg = 0;
        for (const [dt, val] of Object.entries(weapon.damageTable)) {
          if (val > maxDmg) {
            maxDmg = val;
            damageType = dt;
          }
        }
        baseDmg = Utils.rand(maxDmg - (weapon.damageVariance || 0), maxDmg + (weapon.damageVariance || 0));
      } else {
        baseDmg = Utils.rand(weapon.damage - (weapon.damageVariance || 0), weapon.damage + (weapon.damageVariance || 0));
      }
      const result = this.dealDamage(enemy, baseDmg, damageType);
      dmg = result.total;
      Msg.damage(`[${ts}] 💥 ${weapon.name} 命中 ${enemy.name}[${enemy.instanceId}]！` +
        `装甲-${result.armor} 结构-${result.hp} (${dmg}总伤害)`);
      Player.stats.totalDmg += dmg;

      if (enemy.hp <= 0) {
        this.onEnemyKilled(enemy);
      }
    } else {
      Msg.miss(`[${ts}] ❌ ${weapon.name} 未命中 ${enemy.name}[${enemy.instanceId}] (命中率 ${(hitRate * 100).toFixed(0)}%)`);
    }

    BattleUI.update();
    return true;
  },

  calculateHitRate(attacker, target, weapon, dist) {
    const spreadRadius = weapon.spread * dist;
    const baseHitRate = Math.min(1, Math.pow((target.targetRadius || 2) / Math.max(spreadRadius, 0.1), 2));

    let hitRate = baseHitRate;

    const targetSpeed = target.currentSpeed || target.speed || 0;
    if (targetSpeed > 5) {
      hitRate *= Math.max(0.5, 1 - (targetSpeed - 5) * 0.03);
    }

    if (this.isInCover(target.position)) {
      hitRate *= 0.6;
    }

    if (dist > weapon.optimalRange) {
      const overRange = dist - weapon.optimalRange;
      hitRate *= Math.max(0.1, 1 - overRange * 0.001);
    } else if (dist < weapon.optimalRange * 0.3) {
      hitRate = Math.min(0.99, hitRate * 1.2);
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
      let armorDmg = 0;
      let hpDmg = 0;
      const resist = target.getResistances ? target.getResistances() : {};
      const damageResist = resist[damageType] || 0;
      const actualDmg = Math.floor(dmg * (1 - damageResist));

      if (damageType === 'kinetic') {
        armorDmg = Math.min(target.armor, actualDmg);
        target.armor -= armorDmg;
        hpDmg = actualDmg - armorDmg;
      } else if (damageType === 'thermal') {
        const burnStack = target.statusEffects.find(e => e.type === 'burn');
        const burnMultiplier = burnStack ? (1 + burnStack.stacks * 0.2) : 1;
        const thermalDmg = Math.floor(actualDmg * burnMultiplier);
        armorDmg = Math.min(target.armor, Math.floor(thermalDmg * 0.5));
        target.armor -= armorDmg;
        hpDmg = thermalDmg - armorDmg;
        const existingBurn = target.statusEffects.find(e => e.type === 'burn');
        if (existingBurn) {
          existingBurn.stacks = Math.min(10, existingBurn.stacks + 1);
          existingBurn.duration = 10;
        } else {
          target.statusEffects.push({ type: 'burn', stacks: 1, duration: 10 });
        }
      } else if (damageType === 'shock') {
        armorDmg = Math.min(target.armor, Math.floor(actualDmg * 0.8));
        target.armor -= armorDmg;
        hpDmg = Math.floor(actualDmg * 0.2);
      } else if (damageType === 'ion') {
        hpDmg = actualDmg;
        const existingIon = target.statusEffects.find(e => e.type === 'ion_disrupt');
        if (existingIon) {
          existingIon.duration = Math.min(30, existingIon.duration + 3);
        } else {
          target.statusEffects.push({ type: 'ion_disrupt', duration: 5 });
        }
      } else if (damageType === 'corrosion') {
        target.statusEffects.push({ type: 'corrosion', value: Math.floor(actualDmg / 5), duration: 30 });
      } else if (damageType === 'explosive') {
        armorDmg = Math.min(target.armor, Math.floor(actualDmg * 0.7));
        target.armor -= armorDmg;
        hpDmg = actualDmg - armorDmg;
      } else {
        hpDmg = actualDmg;
      }
      target.hp = Math.max(0, target.hp - hpDmg);
      return { total: dmg, actual: actualDmg, armor: armorDmg, hp: hpDmg };
    } else {
      return Player.takeDamage(dmg, damageType);
    }
  },

  onEnemyKilled(enemy) {
    Msg.success(`🎯 击毁 ${enemy.name}[${enemy.instanceId}]！`);
    BattleUI.addHistory(enemy.name, '#fc0', '被击毁');
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
          BattleUI.addHistory('你', '#f8f', `获得${item ? item.name : l.item}x${count}`);
        }
      }
    }
  },

  startEnemyMove(enemy, targetPos) {
    const startPos = [...enemy.position];
    const dx = targetPos[0] - enemy.position[0];
    const dy = targetPos[1] - enemy.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const time = dist / enemy.speed;

    const clamped = this.clampToBattlefield(targetPos);
    enemy.facing = Math.atan2(dy, dx);

    BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}]`, '#8f8', '移动');
    const moveAction = Timeline.createContinuousAction(enemy.instanceId, 'move', Timeline.time, time, {
      startPos,
      endPos: clamped
    }, (pos) => { enemy.position = pos; });
    Timeline.addContinuousAction(moveAction);
    BattleUI.addCurrentAction(`${enemy.name}[${enemy.instanceId}]移动中...`, '#8f8');
    Timeline.scheduleEvent({ type: 'move_complete', actor: enemy.instanceId }, time);
  },

  onEnemyMoveComplete(enemy) {
    if (enemy.hp <= 0) {
      Timeline.scheduleNext();
      return;
    }
    this.scheduleNextEnemyTurn(enemy);
  },

  enemyAttack(enemy, targetPos) {
    const dist = this.getDistance(enemy.position, Player.position);
    if (dist > enemy.attackRange) return;

    this.enterCombat(`${enemy.name}[${enemy.instanceId}] 发起攻击`);
    BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}]`, '#f66', '攻击');

    const ts = BattleUI.formatGameTime(Timeline.time, 'hh:mm:ss');
    const hitRate = this.calculateEnemyHitRate(enemy, dist);
    const hit = Math.random() < hitRate;

    enemy.attackTimer = enemy.attackCooldown;
    enemy.facing = Math.atan2(Player.position[1] - enemy.position[1], Player.position[0] - enemy.position[0]);

    if (hit) {
      const baseDmg = Utils.rand(Math.floor(enemy.damage * 0.8), Math.floor(enemy.damage * 1.2));
      const result = Player.takeDamage(baseDmg, enemy.damageType);
      Msg.damageEnemy(`[${ts}] 💀 ${enemy.name}[${enemy.instanceId}] 攻击命中！` +
        `装甲-${result.armor} 结构-${result.hp} (${result.total}总伤害)`);

      if (Player.isDead()) {
        this.onPlayerDeath();
      }
    } else {
      Msg.missEnemy(`[${ts}] ➖ ${enemy.name}[${enemy.instanceId}] 攻击未命中 (命中率 ${(hitRate * 100).toFixed(0)}%)`);
    }

    Timeline.scheduleEvent({ type: 'attack_complete', actor: enemy.instanceId }, enemy.attackCooldown);
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
    Timeline.paused = true;
    setTimeout(() => {
      this.end();
      Player.respawn();
      Game.showRoom();
    }, 1500);
  },

  scheduleNextPlayerTurn() {
    Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, this.calculateInitiative(Player.currentSpeed));
    Timeline.scheduleNext();
  },

  scheduleNextEnemyTurn(enemy) {
    Timeline.scheduleEvent({ type: 'enemy_turn', actor: enemy.instanceId, enemyId: enemy.templateId },
      this.calculateInitiative(enemy.speed));
    Timeline.scheduleNext();
  },

  checkWinLoss() {
    if (!this.battlefield) return;
    const aliveEnemies = this.battlefield.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0 && this.combatActive) {
      this.onAreaCleared();
    }
  },

  onAreaCleared() {
    Msg.divider();
    Msg.success('🏆 区域敌对信号清空！');
    this.exitCombat();
    Msg.info('场景时间轴继续运行，你可以通信、移动或前往下一区域。');
  },

  onNPCCall(npcId) {
    if (typeof Game !== 'undefined' && Game.handleCall) {
      Game.handleCall(npcId);
    }
    this.playerTask = null;
    this.triggerPlayerDecision();
  },

  retreat() {
    if (!this.active) return false;
    Msg.warn('撤退中...');
    Timeline.paused = true;
    Timeline.stopLoop();
    const self = this;
    setTimeout(() => {
      self.end();
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
    const wasIdling = this.cancelPlayerIdle();
    const wasMoving = this.playerTask && this.playerTask.type === 'move';
    this.playerTask = task;
    if (Timeline.paused && this.currentActor === 'player') {
      Timeline.paused = false;
      this.executePlayerTask();
    } else if (wasIdling) {
      Timeline.scheduleNext();
    } else if (wasMoving && task.type === 'move') {
      Timeline.cancelEvents(e => e.type === 'move_complete' && e.actor === 'player');
      Timeline.removeContinuousAction('player', 'move');
      BattleUI.removeCurrentAction('移动中...');
      this.startPlayerMove(task.target);
    } else {
      // 非决策点且无持续动作：直接启动任务（如场景中直接 move）
      this.executePlayerTask();
    }
  },

  resume() {
    Timeline.resume();
  }
};
