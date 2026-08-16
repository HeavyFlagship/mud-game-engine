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
  // 操作阶段状态：{ active, chassis: {action,target,targetLabel}, weapons: {slot:{action,target}} }
  playerActionState: null,
  // 锁定目标：敌人 instanceId 或 null
  lockedTarget: null,

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
    this.playerActionState = null;
    this.lockedTarget = null;
    this.lastActions = null;

    // 显示环境危险警告
    if (this.battlefield.hazards && this.battlefield.hazards.length > 0) {
      const hazardDescs = this.battlefield.hazards.map(h => h.label || this.getHazardName(h.type));
      Msg.warn(`⚠ 警告: 检测到危险环境 - ${hazardDescs.join('、')}`);
    }

    // 启动时间轴并注册战斗系统的事件处理器与更新器
    Timeline.start(Timeline.time);
    this.registerHandlers();
    this.registerUpdaters();
    // 每帧动态刷新（冷却条/战斗时间/时间轴图形）；静态 UI 由事件/指令触发全量刷新
    Timeline.onTickEnd = () => { BattleUI.updateDynamic(); };

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
      Timeline.scheduleNext();
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
      Msg.hint(`${wName} 冷却完成，已就绪（可在装备面板选择开火/待命）。`);
      BattleUI.update();
      const isMoving = Timeline.continuousActions.some(a => a.actor === 'player' && a.type === 'move');
      const hasIdle = !!this.playerIdleEnd;
      if (isMoving) {
        // 移动中：武器就绪仅更新 UI；无论是否暂停都需继续推进时间轴，否则循环中断
        if (Timeline.paused) {
          Timeline.paused = false;
        }
        Timeline.scheduleNext();
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
    Timeline.addUpdater('hazards', (delta) => this.updateHazards(delta));
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
    this.playerActionState = null;
    this.lockedTarget = null;
    this.lastActions = null;
    // 恢复视野（EMI区域效果清除）
    if (Player._originalVisionRadius) {
      Player.visionRadius = Player._originalVisionRadius;
      Player._originalVisionRadius = null;
    }
  },

  enterCombat(reason = '') {
    if (this.combatActive) return;
    this.combatActive = true;
    Msg.warn(`⚔ 进入战斗状态！${reason}`);
    BattleUI.addHistory('系统', '#f55', `战斗开始`, 'system');

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
    BattleUI.addHistory('你', '#888', `待机${seconds}秒`, 'system');
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
    // 进入操作阶段：初始化操作序列（机体 + 就绪武器），装备 UI 高亮可操作项
    this.beginActionPhase();
    const hint = this.combatActive
      ? '> 战斗中（输入 move/fire/lock/hold/execute 等）'
      : '> 场景中（输入 move/call/fire/status/look 等）';
    Msg.prompt(hint);
  },

  exitCombat() {
    if (!this.combatActive) return;
    this.combatActive = false;
    BattleUI.addHistory('系统', '#8af', '战斗结束', 'system');
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
        if (eff.type === 'slow') {
          Player.currentSpeed = Player.speed;
        }
      }
    }
    for (const enemy of this.battlefield.enemies) {
      const eEffects = [...enemy.statusEffects];
      for (const eff of eEffects) {
        eff.duration -= delta;
        if (eff.duration <= 0) {
          enemy.statusEffects = enemy.statusEffects.filter(e => e !== eff);
          if (eff.type === 'slow') {
            enemy.currentSpeed = enemy.speed;
          }
        }
      }
    }
  },

  regenEnergy(delta) {
    if (Player.energy < Player.maxEnergy) {
      Player.energy = Math.min(Player.maxEnergy, Player.energy + (Player.energyRegen * delta));
    }
  },

  updateHazards(delta) {
    if (!this.battlefield || !this.battlefield.hazards || this.battlefield.hazards.length === 0) return;

    const playerPos = Player.position;
    let inEmiZone = false;
    const hazardNames = { acid_pool: '酸液池', emi: '电磁干扰区', em_interference: '电磁干扰区', toxic_fog: '毒雾区' };
    const hazardEffects = { acid_pool: '装甲持续受损', emi: '视野减半', em_interference: '视野减半', toxic_fog: '结构值持续下降' };

    if (!Player._hazardStatus) Player._hazardStatus = new Set();

    for (const hazard of this.battlefield.hazards) {
      const dist = this.getDistance(playerPos, hazard.pos);
      const radius = hazard.radius || 100;

      if (dist <= radius) {
        // 进入危害区提示
        if (!Player._hazardStatus.has(hazard.type)) {
          Player._hazardStatus.add(hazard.type);
          const name = hazardNames[hazard.type] || hazard.type;
          const effect = hazardEffects[hazard.type] || '';
          Msg.warn(`⚠ 进入${name}${effect ? '——' + effect : ''}`);
        }
        // 电磁干扰区
        if (hazard.type === 'emi' || hazard.type === 'em_interference') {
          inEmiZone = true;
        }
        // 酸液池：装甲损伤
        if (hazard.type === 'acid_pool') {
          const dps = hazard.dps || 5;
          const armorDmg = dps * delta;
          if (Player.armor > 0) {
            Player.armor = Math.max(0, Player.armor - armorDmg);
          }
        }
        // 毒雾区：HP损伤
        if (hazard.type === 'toxic_fog') {
          const dps = hazard.dps || 5;
          const hpDmg = dps * delta;
          Player.hp = Math.max(1, Player.hp - hpDmg);
        }
      }
    }

    // 离开危害区提示
    const toRemove = [];
    for (const hType of Player._hazardStatus) {
      const stillInside = this.battlefield.hazards.some(h => {
        const dist = this.getDistance(playerPos, h.pos);
        return dist <= (h.radius || 100) && h.type === hType;
      });
      if (!stillInside) toRemove.push(hType);
    }
    for (const hType of toRemove) {
      const name = hazardNames[hType] || hType;
      Msg.info(`已离开${name}`);
      Player._hazardStatus.delete(hType);
    }

    // EMI 区域：视野减半
    if (inEmiZone) {
      if (!Player._originalVisionRadius) {
        Player._originalVisionRadius = Player.visionRadius;
        Player.visionRadius = Math.floor(Player.visionRadius / 2);
      }
    } else {
      if (Player._originalVisionRadius) {
        Player.visionRadius = Player._originalVisionRadius;
        Player._originalVisionRadius = null;
      }
    }
  },

  updateAI(delta) {
    for (const enemy of this.battlefield.enemies) {
      EnemyAI.update(enemy, this.battlefield, delta);
    }
  },

  buildInitialTimeline() {
    Timeline.eventQueue = [];
    // 进入场景立即轮到玩家（0 延迟），时间轴暂停等待玩家输入，避免开场空等约一次行动间隔
    Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, 0);
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
      // 移动中开火提示（continue <秒数> 延迟重询等）：进入操作阶段，移动保持“继续移动”
      if (this.playerFireHint && this.playerFireHint.pendingMove) {
        this.beginActionPhase();
        return;
      }
      // 保留的开火提示字段：无待处理意图时清除
      this.playerFireHint = null;
      this.beginActionPhase();
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
      BattleUI.addHistory('你', '#8cf', '通信', 'system');
      BattleUI.addCurrentAction('通信中...', '#8cf');
      Timeline.scheduleEvent({ type: 'npc_call', actor: 'player', npcId: task.npcId }, 5);
      Timeline.scheduleNext();
    } else if (task.type === 'wait') {
      BattleUI.addHistory('你', '#888', '等待', 'system');
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

    BattleUI.addHistory('你', '#8f8', '移动', 'move');
    const moveAction = Timeline.createContinuousAction('player', 'move', Timeline.time, time, {
      startPos,
      endPos: clamped
    }, (pos) => { Player.position = pos; if (Game.updatePlayerPos) Game.updatePlayerPos(); });
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
    BattleUI.addHistory('你', '#fa4', '攻击', 'attack');

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
      const hitDesc = this.getHitDescription(weapon);
      Msg.damage(`[${ts}] 💥 ${weapon.name} ${hitDesc} → ${enemy.name}[${enemy.instanceId}]` +
        `装甲-${result.armor} 结构-${result.hp} (${dmg}总伤害)`);
      Player.stats.totalDmg += dmg;

      if (enemy.hp <= 0) {
        this.onEnemyKilled(enemy);
      }
    } else {
      const missDesc = this.getMissDescription(enemy);
      Msg.miss(`[${ts}] ❌ ${weapon.name} ${missDesc} (${enemy.name}[${enemy.instanceId}] 命中率 ${(hitRate * 100).toFixed(0)}%)`);
    }

    BattleUI.update();
    return true;
  },

  getHitDescription(weapon) {
    const damageType = weapon.damageType || 'kinetic';
    const pools = {
      kinetic: ['精确命中！', '弹丸穿透装甲！', '直接命中目标核心！', '动能弹头击穿防御！'],
      thermal: ['激光烧穿装甲！', '热能射线命中！', '高温灼烧目标！', '等离子束贯穿！'],
      ion: ['离子束击穿护盾！', '电磁脉冲命中！', '离子流瘫痪电子系统！', '高能粒子束命中！'],
      explosive: ['导弹精准命中！', '爆炸冲击波席卷目标！', '高爆弹头直接命中！', '爆炸撕裂装甲！'],
      shock: ['冲击波命中！', '震荡攻击击中目标！', '震波穿透装甲！'],
      corrosion: ['酸液命中机体！', '腐蚀性物质附着目标！', '强酸侵蚀装甲！']
    };
    const pool = pools[damageType] || pools.kinetic;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  getMissDescription(enemy) {
    const reasons = [
      '弹道偏离目标',
      '目标机动规避',
      '射程边缘散布过大',
      '目标信号干扰',
      '弹道受环境因素偏移',
      '目标突然变向'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  },

  getEnemyHitDescription(enemy) {
    const category = enemy.category || 'bug';
    const attackRange = enemy.attackRange || 0;
    const isMelee = attackRange <= 150;
    if (category === 'bug') {
      const melee = ['利爪撕裂装甲！', '前肢猛烈撞击！', '獠牙刺穿防护层！', '巨颚咬合碾压！'];
      const ranged = ['酸液命中机体！', '毒刺穿透装甲！', '腐蚀性黏液喷溅！', '尖锐骨刺飞射！'];
      return isMelee ? melee[Math.floor(Math.random() * melee.length)] : ranged[Math.floor(Math.random() * ranged.length)];
    } else {
      const melee = ['机械臂重击！', '液压钳猛砸！', '切割锯撕裂装甲！'];
      const ranged = ['能量束击中！', '等离子炮命中！', '高能激光贯穿！', '电磁脉冲命中！', '粒子束扫射！'];
      return isMelee ? melee[Math.floor(Math.random() * melee.length)] : ranged[Math.floor(Math.random() * ranged.length)];
    }
  },

  getEnemyMissDescription(enemy) {
    const category = enemy.category || 'bug';
    if (category === 'bug') {
      const pool = ['攻击被装甲弹开', '攻击落空', '扑击被闪避', '攻击角度偏差'];
      return pool[Math.floor(Math.random() * pool.length)];
    } else {
      const pool = ['攻击被装甲弹开', '攻击落空', '弹道被干扰', '瞄准系统误差'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  },

  /**
   * 计算武器命中率（散布机制）。
   *
   * 规则：
   * 1. 散布半径 = 武器散布系数 spread × 距离，散布范围随距离线性扩大；
   * 2. 基准命中率 = (目标截面半径 targetRadius / 散布半径)²，
   *    即目标截面在散布圆内的面积占比，未做 1 的上限约束（留到最终输出前统一钳制）；
   * 3. 掩体修正：目标处于掩体附近时命中率 ×0.6；
   * 4. 射程修正：距敌距离在 最佳射程 optimalRange 到 最大射程 range 之间时，
   *    命中率从最优（1.0）线性插值衰减到 0；超过最大射程 range 直接无法命中（返回 0）；
   *    处于最佳射程内则不受射程惩罚；
   * 5. 最终命中率钳制在 [1%, 99%]。
   */
  calculateHitRate(attacker, target, weapon, dist) {
    // 超出最大射程无法命中
    if (dist > weapon.range) return 0;

    const spreadRadius = weapon.spread * dist;
    const baseHitRate = Math.pow((target.targetRadius || 2) / Math.max(spreadRadius, 0.1), 2);

    let hitRate = baseHitRate;

    if (this.isInCover(target.position)) {
      hitRate *= 0.6;
    }

    // 射程修正：仅在 optimalRange → range 区间做线性插值
    if (dist > weapon.optimalRange) {
      const denom = weapon.range - weapon.optimalRange;
      hitRate *= denom > 0 ? Math.max(0, (weapon.range - dist) / denom) : 0;
    }

    // 最终输出前统一钳制
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

  dealDamage(target, dmg, damageType = 'kinetic', options = {}) {
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
      if (options.armorPierce) {
        const pierceAmount = Math.floor(dmg * options.armorPierce);
        const normalAmount = dmg - pierceAmount;
        const normalResult = Player.takeDamage(normalAmount, damageType);
        Player.hp = Math.max(0, Player.hp - pierceAmount);
        return { total: dmg, armor: normalResult.armor, hp: normalResult.hp + pierceAmount };
      }
      return Player.takeDamage(dmg, damageType);
    }
  },

  applySlowEffect(target, duration, slowAmount) {
    // Remove existing slow effects
    target.statusEffects = target.statusEffects.filter(e => e.type !== 'slow');
    target.statusEffects.push({ type: 'slow', duration, slowAmount });
    // Apply speed reduction
    if (target === Player || !target.instanceId) {
      Player.currentSpeed = Player.speed * (1 - slowAmount);
    } else {
      target.currentSpeed = target.speed * (1 - slowAmount);
    }
  },

  onEnemyKilled(enemy) {
    Msg.success(`🎯 击毁 ${enemy.name}[${enemy.instanceId}]！`);
    BattleUI.addHistory(enemy.name, '#fc0', '被击毁', 'loot');

    // Boss kill handling
    if (enemy.isBoss) {
      Msg.success('🏆 Boss击败！');
      BattleUI.addHistory('系统', '#fc0', '🏆 Boss击败！', 'system');
      if (enemy.creditReward) {
        const credits = Utils.rand(enemy.creditReward.min, enemy.creditReward.max);
        Player.credits += credits;
        Msg.loot(`获得信用点：${credits}G`);
        BattleUI.addHistory('你', '#f8f', `获得${credits}G`, 'loot');
      }
    }

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
          BattleUI.addHistory('你', '#f8f', `获得${item ? item.name : l.item}x${count}`, 'loot');
        }
      }
    }
    // Update quest kill objectives
    if (typeof QuestSystem !== 'undefined') {
      for (const [questId, active] of Object.entries(QuestSystem.activeQuests)) {
        if (active.completed) continue;
        const quest = QuestDB[questId];
        if (!quest) continue;
        for (const obj of quest.objectives) {
          if (obj.type === 'kill') {
            QuestSystem.updateProgress(questId, obj.id, 1);
          }
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

    BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}]`, '#8f8', '移动', 'move');
    const moveAction = Timeline.createContinuousAction(enemy.instanceId, 'move', Timeline.time, time, {
      startPos,
      endPos: clamped
    }, (pos) => { enemy.position = pos; });
    Timeline.addContinuousAction(moveAction);
    BattleUI.addCurrentAction(`${enemy.name}[${enemy.instanceId}]移动中...`, '#8f8');
    Timeline.scheduleEvent({ type: 'move_complete', actor: enemy.instanceId }, time);
    // 移动一开始就生成下一次行动间隔（移动时长 + initiative），
    // 让敌人轨道在移动期间就始终有可见的下次行动点，而非等移动完成后才生成。
    Timeline.scheduleEvent({ type: 'enemy_turn', actor: enemy.instanceId, enemyId: enemy.templateId },
      time + this.calculateInitiative(enemy.speed));
  },

  onEnemyMoveComplete(enemy) {
    // 下一次 enemy_turn 已在 startEnemyMove 中预先调度（time + initiative），
    // 这里若再次 scheduleNextEnemyTurn 会产生重复的 enemy_turn，导致怪物连续行动两次。
    if (enemy.hp <= 0) {
      Timeline.scheduleNext();
      return;
    }
    Timeline.scheduleNext();
    // 敌人位置已更新，刷新敌人列表距离/状态
    BattleUI.update();
  },

  enemyAttack(enemy, targetPos) {
    const dist = this.getDistance(enemy.position, Player.position);
    if (dist > enemy.attackRange) return;

    this.enterCombat(`${enemy.name}[${enemy.instanceId}] 发起攻击`);
    BattleUI.addHistory(`${enemy.name}[${enemy.instanceId}]`, '#f66', '攻击', 'attack');

    const ts = BattleUI.formatGameTime(Timeline.time, 'hh:mm:ss');
    const hitRate = this.calculateEnemyHitRate(enemy, dist);
    const hit = Math.random() < hitRate;

    enemy.attackTimer = enemy.attackCooldown;
    enemy.facing = Math.atan2(Player.position[1] - enemy.position[1], Player.position[0] - enemy.position[0]);

    if (hit) {
      const baseDmg = Utils.rand(Math.floor(enemy.damage * 0.8), Math.floor(enemy.damage * 1.2));
      const result = Player.takeDamage(baseDmg, enemy.damageType);
      const hitDesc = this.getEnemyHitDescription(enemy);
      Msg.damageEnemy(`[${ts}] 💀 ${enemy.name}[${enemy.instanceId}] ${hitDesc}` +
        `装甲-${result.armor} 结构-${result.hp} (${result.total}总伤害)`);

      if (Player.isDead()) {
        this.onPlayerDeath();
      }
    } else {
      const missDesc = this.getEnemyMissDescription(enemy);
      Msg.missEnemy(`[${ts}] ➖ ${enemy.name}[${enemy.instanceId}] ${missDesc} (命中率 ${(hitRate * 100).toFixed(0)}%)`);
    }

    Timeline.scheduleEvent({ type: 'attack_complete', actor: enemy.instanceId }, enemy.attackCooldown);
    // 攻击后立即按 initiative 调度下一次行动，而非等 attackCooldown 结束
    this.scheduleNextEnemyTurn(enemy);
    // 玩家结构/装甲/状态可能变化，触发全量 UI 刷新
    BattleUI.update();
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
    const d = this.calculateInitiative(enemy.speed);
    Timeline.scheduleEvent({ type: 'enemy_turn', actor: enemy.instanceId, enemyId: enemy.templateId }, d);
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
    BattleUI.addHistory('系统', '#8af', '区域清空', 'system');
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

  getHazardName(type) {
    const names = {
      emi: '电磁干扰区',
      em_interference: '电磁干扰区',
      acid_pool: '酸液池',
      toxic_fog: '毒雾区'
    };
    return names[type] || type;
  },

  clampToBattlefield(pos) {
    if (!this.battlefield) return pos;
    const [w, h] = this.battlefield.size;
    return [
      Math.max(10, Math.min(w - 10, pos[0])),
      Math.max(10, Math.min(h - 10, pos[1]))
    ];
  },

  /** 操作阶段相关方法 ===== */

  /** 战场中是否存在存活敌人（安全区/无敌人时不进入操作阶段） */
  hasLiveEnemies() {
    return !!(this.battlefield && this.battlefield.enemies && this.battlefield.enemies.some(e => e.hp > 0));
  },

  /** 是否处于玩家操作阶段 */
  isPlayerActionPhase() {
    return this.active && Timeline.paused && this.currentActor === 'player' && this.hasLiveEnemies();
  },

  /** 初始化操作阶段：构建 playerActionState（机体项 + 就绪武器项） */
  beginActionPhase() {
    // 安全区/无存活敌人：不进入操作阶段，避免装备操作 UI 干扰场景移动
    if (!this.hasLiveEnemies()) return;
    this.playerActionState = {
      active: true,
      chassis: { action: null, target: null, targetLabel: null, holdFor: 0, autoExit: null },
      weapons: {}
    };

    // 遍历武器槽，为每个就绪或冷却中的武器创建项
    const slotKeys = Object.keys(Player.equipment);
    for (let i = 0; i < slotKeys.length; i++) {
      const key = slotKeys[i];
      const slot = Player.equipment[key];
      const item = slot.equip;
      if (!item) continue;
      if (item.category === 'weapon') {
        const cd = Player.weaponCooldowns[key] || 0;
        this.playerActionState.weapons[key] = {
          action: null,
          target: null,
          holdFor: 0,
          ready: cd <= 0
        };
      }
    }

    Msg.hint('操作阶段：请在装备面板选择机体/武器操作（开火需先锁定目标），完成后点击「执行」。');
    // 同步 UI：显示执行栏、装备卡片高亮
    BattleUI.update();
  },

  /** 机体状态文本 */
  getChassisState() {
    if (!this.active) return { text: '离线', cls: 'abnormal' };
    if (Timeline.continuousActions.some(a => a.actor === 'player' && a.type === 'move')) {
      return { text: '移动中', cls: 'moving' };
    }
    const hasNegative = Player.statusEffects.some(e => ['slow','stun','poison','corrosion','ion_disrupt'].includes(e.type));
    if (hasNegative) {
      return { text: '异常', cls: 'abnormal' };
    }
    if (this.isPlayerActionPhase()) {
      if (this.playerActionState && this.playerActionState.chassis.action) {
        if (this.playerActionState.chassis.action === 'hold') return { text: '待命', cls: 'hold' };
        if (this.playerActionState.chassis.action === 'move') return { text: '待移动', cls: 'idle' };
      }
      return { text: '就绪', cls: 'idle' };
    }
    return { text: '待命', cls: 'idle' };
  },

  /** 武器状态文本 */
  getWeaponState(slotKey) {
    const cd = Player.weaponCooldowns[slotKey] || 0;
    if (cd > 0) return { text: `冷却 ${cd.toFixed(1)}s`, cls: 'cooling' };

    if (this.isPlayerActionPhase() && this.playerActionState) {
      const w = this.playerActionState.weapons[slotKey];
      if (w) {
        if (w.action === 'hold') return { text: '待命', cls: 'hold' };
        if (w.action === 'fire') return { text: '待开火', cls: 'ready' };
      }
    }
    return { text: '就绪', cls: 'ready' };
  },

  /** 记录机体操作意图 */
  setChassisAction(action, target, targetLabel, holdFor = 0, autoExit = null) {
    if (!this.isPlayerActionPhase() || !this.playerActionState) return;
    this.playerActionState.chassis.action = action;
    this.playerActionState.chassis.target = target || null;
    this.playerActionState.chassis.targetLabel = targetLabel || null;
    this.playerActionState.chassis.holdFor = holdFor > 0 ? holdFor : 0;
    this.playerActionState.chassis.autoExit = autoExit || null;
    BattleUI.update();
  },

  /** 记录武器操作意图 */
  setWeaponAction(slot, action, target, holdFor = 0) {
    if (!this.isPlayerActionPhase() || !this.playerActionState) return;
    if (!this.playerActionState.weapons[slot]) return;
    this.playerActionState.weapons[slot].action = action;
    this.playerActionState.weapons[slot].target = target || null;
    this.playerActionState.weapons[slot].holdFor = holdFor > 0 ? holdFor : 0;
    BattleUI.update();
  },

  /** UI 辅助：机体向锁定目标靠近 */
  setChassisMoveToEnemy(targetId) {
    const enemy = this.battlefield.enemies.find(e => e.instanceId === targetId);
    if (!enemy || enemy.hp <= 0) {
      Msg.hint('目标无效或已被击毁。');
      return false;
    }
    const dist = this.getDistance(Player.position, enemy.position);
    const weapon = Player.getEquippedWeapons()[0];
    const approachDist = weapon ? Math.min(dist - 10, weapon.range * 0.9) : Math.max(dist - 20, 50);
    const ratio = approachDist / dist;
    const targetX = Player.position[0] + (enemy.position[0] - Player.position[0]) * ratio;
    const targetY = Player.position[1] + (enemy.position[1] - Player.position[1]) * ratio;
    this.setChassisAction('move', [targetX, targetY], `靠近 ${enemy.name}[${enemy.instanceId}]`);
    return true;
  },

  /** UI 辅助：把待命指令置入命令行输入框，由玩家编辑秒数后回车提交 */
  fillHoldCommand(target, seconds = 5) {
    const inp = document.getElementById('input');
    if (!inp) return;
    inp.value = `hold ${target} ${seconds}`;
    inp.focus();
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  },

  /** 切换锁定目标 */
  setLockedTarget(id) {
    if (this.lockedTarget === id) {
      this.lockedTarget = null;
    } else {
      // 验证目标存在
      const enemy = this.battlefield.enemies.find(e => e.instanceId === id);
      if (!enemy || enemy.hp <= 0) {
        this.lockedTarget = null;
        return;
      }
      this.lockedTarget = id;
    }
    BattleUI.update();
  },

  /** 获取锁定目标的敌人对象 */
  getLockedEnemy() {
    if (!this.lockedTarget || !this.battlefield) return null;
    return this.battlefield.enemies.find(e => e.instanceId === this.lockedTarget && e.hp > 0);
  },

  /** 执行操作序列：提交所有操作并推进时间轴 */
  executeActions() {
    if (!this.isPlayerActionPhase() || !this.playerActionState) {
      Msg.hint('当前没有待执行的操作。');
      return;
    }

    // 检查是否有未指定操作的项
    const pendingHints = [];
    const chassis = this.playerActionState.chassis;
    if (!chassis.action) {
      pendingHints.push('机体（请选择移动或待命）');
    }
    for (const [slot, w] of Object.entries(this.playerActionState.weapons)) {
      if (w.ready && !w.action) {
        const weapon = Player.equipment[slot]?.equip;
        pendingHints.push(`${weapon ? weapon.name : slot}（请选择开火或待命）`);
      }
    }

    if (pendingHints.length > 0) {
      Msg.hint(`未指定操作：${pendingHints.join('、')}`);
      return;
    }

    // 记录本次提交的操作序列，供「上次指令」快速重放
    this.lastActions = {
      chassis: { ...this.playerActionState.chassis },
      weapons: {}
    };
    for (const [slot, w] of Object.entries(this.playerActionState.weapons)) {
      this.lastActions.weapons[slot] = {
        action: w.action,
        target: w.target,
        holdFor: w.holdFor,
        ready: w.ready
      };
    }

    // 记录操作阶段结束
    this.playerFireHint = null;
    this.playerActionState.active = false;
    const state = this.playerActionState;
    this.playerActionState = null;
    // 清除操作阶段提示（后续「待命X秒」「超出射程」等提示会重新显示）
    Msg.hintClose();

    // 收集所有「待命X秒」的最大延迟：执行后 N 秒重新询问玩家
    const baseTime = Timeline.time;
    let maxHoldFor = 0;
    if (state.chassis.action === 'hold' && state.chassis.holdFor > 0) {
      maxHoldFor = Math.max(maxHoldFor, state.chassis.holdFor);
    }
    for (const [slot, w] of Object.entries(state.weapons)) {
      if (w.action === 'hold' && w.holdFor > 0) {
        maxHoldFor = Math.max(maxHoldFor, w.holdFor);
      }
    }

    // 提交机体移动（若设置了移动；setPlayerTask 会解除暂停并启动移动）
    let hasMove = false;
    if (state.chassis.action === 'move' && state.chassis.target) {
      hasMove = true;
      Timeline.cancelEvents(e => e.type === 'move_complete' && e.actor === 'player');
      Timeline.removeContinuousAction('player', 'move');
      BattleUI.removeCurrentAction('移动中...');
      this.setPlayerTask({ type: 'move', target: state.chassis.target, autoExit: state.chassis.autoExit || null });
    }

    // 提交武器开火（调度 player_fire 事件，与移动并行）
    let hasFire = false;
    for (const [slot, w] of Object.entries(state.weapons)) {
      if (w.action === 'fire' && w.target) {
        hasFire = true;
        const weapon = Player.equipment[slot]?.equip;
        if (!weapon) continue;
        if (Player.weaponCooldowns[slot] > 0) continue;
        // 验证目标
        const enemy = this.battlefield.enemies.find(e => e.instanceId === w.target);
        if (!enemy || enemy.hp <= 0) continue;
        const dist = this.getDistance(Player.position, enemy.position);
        if (dist > weapon.range) {
          Msg.hint(`${weapon.name} 目标 ${enemy.name} 超出射程。`);
          continue;
        }
        // 调度开火事件
        Timeline.scheduleEvent({ type: 'player_fire', actor: 'player', target: w.target, slot, label: `攻击 ${w.target}` }, 0.3);
      }
    }

    // 调度「待命X秒」的重询问事件（需在 baseTime 基础上计算，避免被移动/开火推进的时间带偏）
    // 若全部待命且无待命X秒：按 initiative 重新调度玩家回合，保证玩家仍能获得决策权
    const scheduleReask = () => {
      if (maxHoldFor <= 0) {
        Timeline.cancelEvents(e => e.type === 'player_turn' && e.actor === 'player');
        Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, this.calculateInitiative(Player.currentSpeed));
        return;
      }
      const delay = Math.max(0, (baseTime + maxHoldFor) - Timeline.time);
      Timeline.cancelEvents(e => e.type === 'player_turn' && e.actor === 'player');
      Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, delay);
      Msg.hint(`${maxHoldFor} 秒后重新进入操作阶段。`);
    };

    // 全部待命：等价 continue（跳到下一事件；若有待命X秒则等待指定秒数）
    if (!hasMove && !hasFire) {
      scheduleReask();
      BattleUI.clearCurrentActions();
      this.currentActor = null;
      Timeline.paused = false;
      Timeline.scheduleNext();
      BattleUI.update();
      return;
    }

    // 无移动但有开火：解除暂停推进时间轴
    if (!hasMove && hasFire) {
      scheduleReask();
      if (Timeline.paused) Timeline.paused = false;
      this.currentActor = null;
      BattleUI.clearCurrentActions();
      Timeline.scheduleNext();
    }
    // 有移动时 setPlayerTask 已解除暂停并推进时间轴；移动完成后会自然回到操作阶段
    BattleUI.update();
  },

  /** 从 targetLabel 解析被靠近的敌人编号（如「靠近 工虫[A1]」→ A1） */
  _extractApproachTargetId(label) {
    if (!label || !label.startsWith('靠近 ')) return null;
    const m = label.match(/\[(.+)\]$/);
    return m ? m[1] : null;
  },

  /** UI 辅助：把上次指令重放设置到装备面板，监测条件变化并提示 */
  replayLastActions() {
    if (!this.isPlayerActionPhase() || !this.playerActionState) {
      Msg.hint('当前不在操作阶段，无法重放上次指令。');
      return false;
    }
    if (!this.lastActions) {
      Msg.hint('还没有可重放的上次指令。');
      return false;
    }
    const notes = [];
    const la = this.lastActions;
    const st = this.playerActionState;

    // 先清空当前操作意图，再按上次指令重放（保证结果与上次指令一致）
    st.chassis.action = null;
    st.chassis.target = null;
    st.chassis.targetLabel = null;
    st.chassis.holdFor = 0;
    st.chassis.autoExit = null;
    for (const slot of Object.keys(st.weapons)) {
      st.weapons[slot].action = null;
      st.weapons[slot].target = null;
      st.weapons[slot].holdFor = 0;
    }

    // 机体
    const ch = la.chassis;
    if (ch && ch.action === 'move') {
      const targetId = this._extractApproachTargetId(ch.targetLabel);
      if (targetId) {
        const enemy = this.battlefield.enemies.find(e => e.instanceId === targetId && e.hp > 0);
        if (!enemy) {
          notes.push('上次靠近目标已丢失，机体移动已跳过');
        } else {
          this.setChassisMoveToEnemy(targetId);
        }
      } else if (ch.target) {
        st.chassis.action = 'move';
        st.chassis.target = ch.target;
        st.chassis.targetLabel = ch.targetLabel;
        st.chassis.holdFor = ch.holdFor;
        st.chassis.autoExit = ch.autoExit;
      }
    } else if (ch && ch.action === 'hold') {
      st.chassis.action = 'hold';
      st.chassis.holdFor = ch.holdFor;
    }

    // 武器
    for (const [slot, w] of Object.entries(la.weapons)) {
      const cur = st.weapons[slot];
      if (!cur) continue;
      const weapon = Player.equipment[slot]?.equip;
      if (w.action === 'fire') {
        const enemy = w.target ? this.battlefield.enemies.find(e => e.instanceId === w.target) : null;
        if (!enemy || enemy.hp <= 0) {
          notes.push(`上次开火目标 ${w.target || '?'} 已丢失，${weapon ? weapon.name : slot} 已跳过`);
          continue;
        }
        if (!cur.ready) {
          notes.push(`${weapon ? weapon.name : slot} 仍在冷却，已跳过`);
          continue;
        }
        const dist = this.getDistance(Player.position, enemy.position);
        if (dist > weapon.range) {
          notes.push(`${weapon.name} 目标 ${enemy.name} 已超出射程，已跳过`);
          continue;
        }
        cur.action = 'fire';
        cur.target = w.target;
        cur.holdFor = w.holdFor;
      } else if (w.action === 'hold') {
        cur.action = 'hold';
        cur.holdFor = w.holdFor;
      }
    }

    if (notes.length > 0) {
      Msg.hint(`上次指令重放完成，但条件有变化：${notes.join('；')}`);
    } else {
      Msg.hint('已按上次指令设置装备，点击「执行」提交。');
    }
    BattleUI.update();
    return true;
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
