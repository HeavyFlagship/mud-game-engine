// ========== 战斗系统（场景时间轴 + 战斗状态标记） ==========
const Battle = {
  active: false,
  combatActive: false,
  roomId: null,
  battlefield: null,
  eventQueue: [],
  currentActor: null,
  actionDelay: 500,
  actionTimeout: null,
  paused: false,
  playerAiming: null,
  playerTask: null,
  playerIdleEnd: null,
  isProcessing: false,
  continuousActions: [],
  playerFireHint: null,

  start(roomId, entryDir = 'south') {
    const room = MapSystem.getRoom(roomId);
    if (!room || !room.battlefield) {
      this.active = false;
      this.combatActive = false;
      return false;
    }

    this.roomId = roomId;
    MapSystem.resetBattlefield(roomId);
    this.battlefield = MapSystem.initBattlefield(roomId, entryDir);

    if (this.battlefield.entryPos) {
      Player.position = [...this.battlefield.entryPos];
    }

    this.active = true;
    this.combatActive = false;
    this.paused = false;
    this.eventQueue = [];
    this.playerAiming = null;
    this.playerTask = null;
    this.playerIdleEnd = null;
    this.isProcessing = false;
    this.continuousActions = [];
    this.playerFireHint = null;

    // 场景信息由 Game.look() 统一显示，这里不再重复输出
    this.buildInitialTimeline();
    BattleUI.render();
    this.advanceTimeline();
    return true;
  },

  end() {
    this.active = false;
    this.combatActive = false;
    this.stopActionLoop();
    this.battlefield = null;
    this.roomId = null;
    this.eventQueue = [];
    this.currentActor = null;
    this.playerAiming = null;
    this.playerTask = null;
    this.playerIdleEnd = null;
    this.paused = false;
    this.isProcessing = false;
    this.continuousActions = [];
  },

  enterCombat(reason = '') {
    if (this.combatActive) return;
    this.combatActive = true;
    Msg.warn(`⚔ 进入战斗状态！${reason}`);
    BattleUI.addHistory('系统', '#f55', `战斗开始`);

    // 战斗中断：仅在玩家正在执行持续任务（移动/通信）或 idle 时中断
    const wasMoving = this.playerTask && this.playerTask.type === 'move';
    const wasCalling = this.playerTask && this.playerTask.type === 'call';
    const wasIdling = this.playerIdleEnd !== null;
    const needInterrupt = wasMoving || wasCalling || wasIdling;

    if (wasMoving) {
      Msg.info('⚡ 战斗中断移动，立即进入行动阶段。');
      this.eventQueue = this.eventQueue.filter(e => !(e.type === 'move_complete' && e.actor === 'player'));
      this.removeContinuousAction('player', 'move');
      BattleUI.removeCurrentAction('移动中...');
    }
    if (wasCalling) {
      Msg.info('⚡ 战斗中断通信，立即进入行动阶段。');
      this.eventQueue = this.eventQueue.filter(e => e.type === 'npc_call');
      BattleUI.removeCurrentAction('通信中...');
    }
    if (wasIdling) {
      Msg.info('⚡ 战斗中断待机，立即进入行动阶段。');
      this.cancelPlayerIdle();
    }

    this.playerTask = null;
    // 仅在需要中断持续任务时触发决策点；否则不打断当前执行流程
    if (needInterrupt) {
      this.triggerPlayerDecision();
    }
  },

  cancelPlayerIdle() {
    if (this.playerIdleEnd) {
      this.eventQueue = this.eventQueue.filter(e => e.type !== 'player_idle_end');
      this.playerIdleEnd = null;
      return true;
    }
    return false;
  },

  interruptPlayerMove() {
    this.eventQueue = this.eventQueue.filter(e => !(e.type === 'move_complete' && e.actor === 'player'));
    this.removeContinuousAction('player', 'move');
    if (this.playerTask && this.playerTask.type === 'move') {
      this.playerTask = null;
    }
    BattleUI.clearCurrentActions();
    this.triggerPlayerDecision();
  },

  playerIdle(seconds) {
    this.cancelPlayerIdle();
    // 取消未触发的 player_turn 事件（避免重复）
    this.eventQueue = this.eventQueue.filter(e => !(e.type === 'player_turn' && e.actor === 'player'));
    this.scheduleEvent({ type: 'player_idle_end', actor: 'player' }, seconds);
    this.playerIdleEnd = this.battlefield.time + seconds;
    BattleUI.addHistory('你', '#888', `待机${seconds}秒`);
    // 如果当前 paused（玩家决策点），解除让时间轴推进
    if (this.paused) {
      this.paused = false;
    }
    this.scheduleNext();
  },

  triggerPlayerDecision() {
    // 取消玩家相关事件
    this.eventQueue = this.eventQueue.filter(e => e.type !== 'player_turn' && e.type !== 'player_idle_end');
    this.playerIdleEnd = null;
    this.currentActor = 'player';
    BattleUI.clearCurrentActions();
    BattleUI.addCurrentAction('你的行动', '#0ff');
    this.paused = true;
    const hint = this.combatActive
      ? '> 战斗中（输入 move/fire/look/use/status/retreat 等）'
      : '> 场景中（输入 move/call/fire/status/look 等）';
    Msg.prompt(hint);
  },

  createContinuousAction(actor, type, startTime, duration, data) {
    return {
      actor,
      type,
      startTime,
      endTime: startTime + duration,
      duration,
      data,
      getPosition: (currentTime) => {
        if (type !== 'move') return null;
        const elapsed = currentTime - startTime;
        const ratio = Math.min(1, elapsed / duration);
        return [
          data.startPos[0] + (data.endPos[0] - data.startPos[0]) * ratio,
          data.startPos[1] + (data.endPos[1] - data.startPos[1]) * ratio
        ];
      },
      isActive: (currentTime) => currentTime >= startTime && currentTime <= startTime + duration
    };
  },

  addContinuousAction(action) {
    this.continuousActions.push(action);
  },

  removeContinuousAction(actor, type) {
    this.continuousActions = this.continuousActions.filter(
      a => !(a.actor === actor && a.type === type)
    );
  },

  exitCombat() {
    if (!this.combatActive) return;
    this.combatActive = false;
    Msg.info('⛑ 脱离战斗状态，场景时间轴继续运行。');
  },

  stopActionLoop() {
    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
      this.actionTimeout = null;
    }
  },

  advanceTimeline() {
    if (!this.active || !this.battlefield || this.paused) return;
    if (this.eventQueue.length === 0) return;

    this.eventQueue.sort((a, b) => a.time - b.time);
    const next = this.eventQueue[0];
    const delta = next.time - this.battlefield.time;

    if (delta > 0) {
      this.advanceTime(delta);
    }

    this.eventQueue.shift();
    this.processEvent(next);
    BattleUI.update();
  },

  advanceTime(delta) {
    if (delta <= 0) return;
    this.battlefield.time += delta;
    const currentTime = this.battlefield.time;

    for (const action of this.continuousActions) {
      if (action.isActive(currentTime)) {
        const pos = action.getPosition(currentTime);
        if (pos) {
          if (action.actor === 'player') {
            Player.position = pos;
          } else {
            const enemy = this.battlefield.enemies.find(e => e.instanceId === action.actor);
            if (enemy) enemy.position = pos;
          }
        }
      }
    }

    this.continuousActions = this.continuousActions.filter(a => a.isActive(currentTime));

    this.updateCooldowns(delta);
    this.updateStatusEffects(delta);
    this.regenEnergy(delta);
    this.updateAI(delta);
    this.checkWinLoss();
  },

  scheduleNext() {
    if (!this.active || this.paused) return;
    this.stopActionLoop();
    this.actionTimeout = setTimeout(() => {
      this.advanceTimeline();
    }, this.actionDelay);
  },

  updateCooldowns(delta) {
    for (const slot of ['primary', 'secondary']) {
      if (Player.weaponCooldowns[slot] > 0) {
        Player.weaponCooldowns[slot] = Math.max(0, Player.weaponCooldowns[slot] - delta);
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
      Player.energy = Math.min(Player.maxEnergy, Player.energy + (Player.energyRegen * delta / 10));
    }
  },

  updateAI(delta) {
    for (const enemy of this.battlefield.enemies) {
      EnemyAI.update(enemy, this.battlefield, delta);
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
      BattleUI.clearCurrentActions();
      this.currentActor = 'player';
      BattleUI.addCurrentAction('你的行动', '#0ff');
      this.onPlayerTurn();
    } else if (event.type === 'enemy_turn') {
      this.currentActor = event.actor;
      const enemy = this.battlefield.enemies.find(e => e.instanceId === event.actor);
      if (enemy) {
        this.onEnemyTurn(enemy);
      } else {
        this.scheduleNext();
      }
    } else if (event.type === 'move_complete') {
      if (event.actor === 'player') {
        BattleUI.removeCurrentAction('移动中...');
        this.onPlayerMoveComplete();
      } else {
        const enemy = this.battlefield.enemies.find(e => e.instanceId === event.actor);
        if (enemy) {
          BattleUI.removeCurrentAction(`${enemy.name}[${enemy.instanceId}]移动中...`);
          this.onEnemyMoveComplete(enemy);
        } else {
          this.scheduleNext();
        }
      }
    } else if (event.type === 'attack_complete') {
      this.currentActor = null;
      const enemy = this.battlefield.enemies.find(e => e.instanceId === event.actor);
      if (enemy) {
        this.scheduleNextEnemyTurn(enemy);
      } else {
        this.scheduleNext();
      }
    } else if (event.type === 'npc_call') {
      BattleUI.removeCurrentAction('通信中...');
      BattleUI.addCurrentAction('通信完成', '#8cf');
      this.onNPCCall(event.npcId);
    } else if (event.type === 'player_idle_end') {
      // 待机结束，进入玩家决策点
      this.playerIdleEnd = null;
      this.currentActor = 'player';
      BattleUI.clearCurrentActions();
      BattleUI.addCurrentAction('你的行动', '#0ff');
      this.onPlayerTurn();
    } else if (event.type === 'player_fire') {
      // 执行玩家开火
      const weapon = Player.equipment[event.slot];
      this.playerAttack(event.target, event.slot);
      // 调度 weapon_ready 事件（冷却结束时触发）
      if (weapon) {
        this.scheduleEvent({ type: 'weapon_ready', actor: 'player', slot: event.slot }, weapon.cooldown);
      }
      this.scheduleNext();
    } else if (event.type === 'weapon_ready') {
      // 武器冷却完成，进入就绪列表
      const weapon = Player.equipment[event.slot];
      const wName = weapon ? weapon.name : event.slot;
      Msg.info(`🔫 ${wName} 冷却完成，已就绪。`);
      BattleUI.update();
      // 检查玩家是否在持续行动中
      const isMoving = this.continuousActions.some(a => a.actor === 'player' && a.type === 'move');
      const hasIdle = !!this.playerIdleEnd;
      if (isMoving) {
        // 移动中武器就绪：中断移动，触发决策点
        this.interruptPlayerMove();
      } else if (hasIdle) {
        // idle 中武器就绪：取消 idle，触发决策点
        this.cancelPlayerIdle();
        this.triggerPlayerDecision();
      } else {
        // 玩家空闲，直接触发决策点
        this.triggerPlayerDecision();
      }
    }
  },

  onPlayerTurn() {
    if (Player.isDead()) return;

    if (this.playerTask) {
      this.executePlayerTask();
    } else {
      this.paused = true;
      const hint = this.combatActive
        ? '> 战斗中（输入 move/fire/look/use/status/retreat 等）'
        : '> 场景中（输入 move/call/fire/status/look 等）';
      Msg.prompt(hint);
    }
  },

  onEnemyTurn(enemy) {
    if (enemy.hp <= 0) {
      this.scheduleNext();
      return;
    }
    EnemyAI.takeTurn(enemy, this.battlefield);
    this.scheduleNext();
  },

  executePlayerTask() {
    if (!this.playerTask) return;

    const task = this.playerTask;
    if (task.type === 'move') {
      this.startPlayerMove(task.target);
    } else if (task.type === 'call') {
      BattleUI.addHistory('你', '#8cf', '通信');
      BattleUI.addCurrentAction('通信中...', '#8cf');
      this.scheduleEvent({ type: 'npc_call', actor: 'player', npcId: task.npcId }, 5);
      this.scheduleNext();
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
    const time = dist / speed * 10;

    const clamped = this.clampToBattlefield(targetPos);
    Player.facing = Math.atan2(dy, dx);

    BattleUI.addHistory('你', '#8f8', '移动');
    const moveAction = this.createContinuousAction('player', 'move', this.battlefield.time, time, {
      startPos,
      endPos: clamped
    });
    this.addContinuousAction(moveAction);
    this.scheduleEvent({ type: 'move_complete', actor: 'player' }, time);
    this.currentActor = 'player';
    BattleUI.addCurrentAction('移动中...', '#8f8');
    Msg.info(`机体向 (${Math.round(clamped[0])}, ${Math.round(clamped[1])}) 移动中...`);
    this.scheduleNext();
  },

  onPlayerMoveComplete() {
    this.currentActor = null;
    const autoExit = this.playerTask && this.playerTask.autoExit;
    if (this.playerTask && this.playerTask.type === 'move') {
      this.playerTask = null;
    }
    // 移动到达边界，自动切换场景
    if (autoExit && !this.combatActive) {
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

    const weapon = Player.equipment[slot];
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

    if (weapon.energyCost && !Player.useEnergy(weapon.energyCost)) {
      Msg.error('能量不足！');
      return false;
    }

    this.enterCombat(`开火攻击 ${enemy.name}[${enemy.instanceId}]`);
    BattleUI.addHistory('你', '#fa4', '攻击');

    const ts = BattleUI.formatGameTime(this.battlefield.time, 'hh:mm:ss');
    const hitRate = this.calculateHitRate(Player, enemy, weapon, dist);
    const hit = Math.random() < hitRate;

    Player.weaponCooldowns[slot] = weapon.cooldown;
    Player.facing = Math.atan2(enemy.position[1] - Player.position[1], enemy.position[0] - Player.position[0]);

    let dmg = 0;
    if (hit) {
      const baseDmg = Utils.rand(weapon.damage - weapon.damageVariance, weapon.damage + weapon.damageVariance);
      const result = this.dealDamage(enemy, baseDmg, weapon.damageType);
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
    const time = dist / enemy.speed * 10;

    const clamped = this.clampToBattlefield(targetPos);
    enemy.facing = Math.atan2(dy, dx);

    BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}]`, '#8f8', '移动');
    const moveAction = this.createContinuousAction(enemy.instanceId, 'move', this.battlefield.time, time, {
      startPos,
      endPos: clamped
    });
    this.addContinuousAction(moveAction);
    BattleUI.addCurrentAction(`${enemy.name}[${enemy.instanceId}]移动中...`, '#8f8');
    this.scheduleEvent({ type: 'move_complete', actor: enemy.instanceId }, time);
  },

  onEnemyMoveComplete(enemy) {
    if (enemy.hp <= 0) {
      this.scheduleNext();
      return;
    }
    this.scheduleNextEnemyTurn(enemy);
  },

  enemyAttack(enemy, targetPos) {
    const dist = this.getDistance(enemy.position, Player.position);
    if (dist > enemy.attackRange) return;

    this.enterCombat(`${enemy.name}[${enemy.instanceId}] 发起攻击`);
    BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}]`, '#f66', '攻击');

    const ts = BattleUI.formatGameTime(this.battlefield.time, 'hh:mm:ss');
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
    this.scheduleNext();
  },

  scheduleNextEnemyTurn(enemy) {
    this.scheduleEvent({ type: 'enemy_turn', actor: enemy.instanceId, enemyId: enemy.templateId },
      this.calculateInitiative(enemy.speed));
    this.scheduleNext();
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
    this.paused = true;
    this.stopActionLoop();
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
    // 设置新任务时取消 idle 待机
    const wasIdling = this.cancelPlayerIdle();
    const wasMoving = this.playerTask && this.playerTask.type === 'move';
    this.playerTask = task;
    if (this.paused && this.currentActor === 'player') {
      // 玩家决策点设置任务：解除 paused 执行
      this.paused = false;
      this.executePlayerTask();
    } else if (wasIdling) {
      // idle 中被新任务打断，立即推进时间轴
      this.scheduleNext();
    } else if (wasMoving && task.type === 'move') {
      // 移动中重新设置移动目标：取消旧 move_complete，移除旧连续动作，启动新移动
      this.eventQueue = this.eventQueue.filter(e => !(e.type === 'move_complete' && e.actor === 'player'));
      this.removeContinuousAction('player', 'move');
      BattleUI.removeCurrentAction('移动中...');
      this.startPlayerMove(task.target);
    }
  },

  resume() {
    this.paused = false;
    this.advanceTimeline();
  }
};
