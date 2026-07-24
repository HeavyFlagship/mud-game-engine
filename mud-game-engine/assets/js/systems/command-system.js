// ========== 指令系统 ==========
const CommandSystem = {
  aliases: {
    n:'north', s:'south', e:'east', w:'west', up:'up', down:'down', 上:'up', 下:'down',
    l:'look', '?':'help', h:'help',
    inv:'bag', i:'bag',
    sta:'status',
    k:'fire', atk:'fire',
    u:'use',
    eq:'equip', wp:'equip',
    ue:'unequip', rm:'unequip',
    sh:'shop', buy:'shop',
    call:'call', 通信:'call', hailing:'call',
    sc:'score', st:'stats',
    mv:'move', go:'move',
    fi:'fire', shoot:'fire',
    ent:'enter', 进入:'enter',
    tm:'timeline', tl_b:'timeline',
    re:'retreat', rt:'retreat',
    rl:'reload',
    hg:'hangar', wh:'warehouse'
  },

  // 战场专用指令（仅当 Battle.active 时由 handleBattleCmd 处理）
  battleOnlyCmds: ['move','go','enter','进入','fire','shoot','attack','攻击',
                   'retreat','flee','撤退','timeline','wait','等待','idle','待机',
                   'call','通信','hailing','look','查看','movepredict','mp','continue','cont'],
 
  parse(input) {
    input = input.trim().toLowerCase();
    if (!input) return null;
    const parts = input.split(/\s+/);
    const cmd = this.aliases[parts[0]] || parts[0];
    const args = parts.slice(1);
    return { cmd, args, raw: input };
  },
 
  runQuery(parsed, title, callback) {
    Msg.withQuery(title, parsed.raw, callback);
  },
 
  execute(input) {
    const parsed = this.parse(input);
    if (!parsed) return;
    Msg.cmd(`> ${parsed.raw}`);

    // 战场专用指令：仅当 Battle.active 时由 handleBattleCmd 处理
    // 其余指令（shop/equip/unequip/talk/方向移动等）在任何状态下均可使用
    if (Battle.active && this.battleOnlyCmds.includes(parsed.cmd)) {
      this.handleBattleCmd(parsed);
      Game.updateUI();
      return;
    }

    switch (parsed.cmd) {
      case 'north': case 'south': case 'east': case 'west':
      case 'up': case 'down': case '上': case '下':
        Game.move(parsed.cmd); break;
      case 'look': case '查看':
        Game.look(); break;
      case 'bag': case '背包':
        this.runQuery(parsed, '背包', () => Game.showBag(parsed.args.includes('-d'))); break;
      case 'status': case '状态':
        this.runQuery(parsed, '机体状态', () => Game.showStatus()); break;
      case 'equip': case '装备':
        Game.equip(parsed.args.join(' ')); break;
      case 'unequip': case '卸下':
        Game.unequip(parsed.args[0] || ''); break;
      case 'reload': case '装填':
        Game.reload(parsed.args[0] || ''); break;
      case 'hangar': case '机库':
        Game.showHangar(); break;
      case 'switch': case '切换':
        Game.switchVehicle(parsed.args[0] || ''); break;
      case 'warehouse': case '仓库':
        Game.showWarehouse(); break;
      case 'deposit': case 'export': case '存入': case '存仓':
        Game.depositToWarehouse(parsed.args[0] || '', parseInt(parsed.args[1]) || 1); break;
      case 'withdraw': case 'import': case '取出': case '取回':
        Game.withdrawFromWarehouse(parsed.args[0] || '', parseInt(parsed.args[1]) || 1); break;
      case 'wequip': case '仓装':
        Game.equipFromWarehouse(parsed.args[0] || ''); break;
      case 'use': case '使用': case 'drink': case '喝':
        Game.useItem(parsed.args.join(' ')); break;
      case 'skills': case '技能':
        this.runQuery(parsed, '技能列表', () => Game.showSkills()); break;
      case 'pick': case 'get': case '拾取':
        Game.pickItem(parsed.args.join(' ')); break;
      case 'drop': case '丢弃':
        Game.dropItem(parsed.args.join(' ')); break;
      case 'talk': case '对话':
        Game.talk(parsed.args.join(' ')); break;
      case 'shop': case '商店': case 'buy': case '购买':
        Game.shop(parsed.args[0] || 'list'); break;
      case 'sell': case '出售':
        Game.sell(parsed.args.join(' ')); break;
      case 'score': case 'stats': case '统计':
        this.runQuery(parsed, '任务统计', () => Game.showStats()); break;
      case 'help': case '帮助':
        this.runQuery(parsed, '指令帮助', () => Game.showHelp(parsed.args[0])); break;
      case 'map': case '地图':
        this.runQuery(parsed, '区域地图', () => Game.showMap()); break;
      case 'save': case '存档':
        Game.save(); break;
      case 'load': case '读档':
        Game.load(); break;
      case 'clear': case '清屏':
        Msg.clear(); break;
      case 'cast': case '施法':
        Game.castOutside(parsed.args.join(' ')); break;
      default:
        Msg.warning(`未知指令: ${parsed.cmd}。输入 <span class="help-cmd">help</span> 查看帮助。`);
    }
    Game.updateUI();
  },
 
  handleBattleCmd(parsed) {
    switch (parsed.cmd) {
      case 'move': case 'go':
        this.cmdBattleMove(parsed.args); break;
      case 'movepredict': case 'mp':
        this.cmdBattleMovePredict(parsed.args); break;
      case 'enter': case '进入':
        this.cmdBattleEnter(parsed.args); break;
      case 'fire': case 'shoot': case 'attack': case '攻击':
        this.cmdBattleFire(parsed.args); break;
      case 'call': case '通信': case 'hailing':
        this.cmdBattleCall(parsed.args); break;
      case 'retreat': case 'flee': case '撤退':
        Battle.retreat(); break;
      case 'timeline':
        this.cmdTimeline(); break;
      case 'look': case '查看':
        this.cmdBattleLook(parsed.args); break;
      case 'wait': case '等待':
        this.cmdBattleWait(parsed.args); break;
      case 'idle': case '待机':
        this.cmdBattleIdle(parsed.args); break;
      case 'continue': case 'cont':
        this.cmdBattleContinue(parsed.args); break;
      case 'use': case '使用':
        Game.useItem(parsed.args); break;
      default:
        Msg.warning('场景中可用指令：move/fire/call/wait/continue/look/retreat/timeline/use');
    }
  },

  cmdBattleIdle(args) {
    Msg.warning('idle 指令已暂时禁用，将在队友系统上线后重新设计。');
  },

  cmdBattleWait(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (!Timeline.paused || Battle.currentActor !== 'player') {
      Msg.warning('当前没有需要等待的行动阶段。');
      return;
    }

    // 清除开火提示
    Battle.playerFireHint = null;
    // 中断当前移动
    if (Timeline.continuousActions.some(a => a.actor === 'player' && a.type === 'move')) {
      Battle.interruptPlayerMove();
    }

    // 取消当前玩家回合事件
    Timeline.cancelEvents(e => e.type === 'player_turn' && e.actor === 'player');
    Timeline.cancelEventsByType('player_idle_end');
    Battle.playerIdleEnd = null;
    Battle.playerTask = null;
    BattleUI.clearCurrentActions();

    let waitTime;
    if (args.length >= 1) {
      waitTime = parseInt(args[0]);
      if (isNaN(waitTime) || waitTime <= 0) {
        Msg.error('等待时间必须是正整数秒。');
        return;
      }
      if (waitTime > 300) {
        Msg.warning('等待时间过长，已限制为300秒。');
        waitTime = 300;
      }
      Msg.info(`打断所有行动，等待 ${waitTime} 秒...`);
    } else {
      // 无参数：等待到下一个即将到来的事件
      const nextEvent = [...Timeline.eventQueue]
        .sort((a, b) => a.time - b.time)[0];
      if (!nextEvent) {
        Msg.warning('事件队列为空，无法自动等待。');
        return;
      }
      waitTime = Math.max(0.1, nextEvent.time - Timeline.time);
      let label = '事件';
      if (nextEvent.type === 'weapon_ready') {
        const weapon = Player.equipment[nextEvent.slot]?.equip;
        label = weapon ? `${weapon.name}冷却完成` : '武器冷却完成';
      } else if (nextEvent.type === 'enemy_turn') {
        const enemy = Battle.battlefield ? Battle.battlefield.enemies.find(e => e.instanceId === nextEvent.actor) : null;
        label = enemy ? `${enemy.name}[${nextEvent.actor}]行动` : '敌人行动';
      } else if (nextEvent.type === 'move_complete') {
        label = nextEvent.actor === 'player' ? '移动完成' : `${nextEvent.actor}移动完成`;
      }
      Msg.info(`打断所有行动，等待至 [${label}]（约${waitTime.toFixed(1)}秒后）...`);
    }

    Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, waitTime);
    Timeline.paused = false;
    Timeline.scheduleNext();
  },

  cmdBattleContinue(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (!Timeline.paused || Battle.currentActor !== 'player') {
      Msg.warning('当前没有需要跳过的行动阶段。');
      return;
    }

    let waitTime;

    // 移动中开火提示
    if (Battle.playerFireHint && Battle.playerFireHint.pendingMove) {
      if (args.length >= 1) {
        // continue <秒数>：保留开火提示，等待指定秒数后重新询问
        waitTime = parseInt(args[0]);
        if (isNaN(waitTime) || waitTime <= 0) {
          Msg.error('等待时间必须是正整数秒。');
          return;
        }
        if (waitTime > 300) {
          Msg.warning('等待时间过长，已限制为300秒。');
          waitTime = 300;
        }
        // 取消当前回合，保留 playerFireHint 以便下次回合重新询问
        Timeline.cancelEvents(e => e.type === 'player_turn' && e.actor === 'player');
        Battle.playerTask = null;
        BattleUI.clearCurrentActions();
        Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, waitTime);
        Timeline.paused = false;
        Timeline.scheduleNext();
        Msg.info(`等待 ${waitTime} 秒后重新询问开火...`);
        return;
      }
      // continue 无参数：跳过开火，仅执行移动
      const hint = Battle.playerFireHint;
      Battle.playerFireHint = null;
      Battle.setPlayerTask({ type: 'move', target: hint.pendingMove, autoExit: hint.autoExit });
      return;
    }

    // 带秒数参数：不打断持续操作，等待指定秒数
    if (args.length >= 1) {
      waitTime = parseInt(args[0]);
      if (isNaN(waitTime) || waitTime <= 0) {
        Msg.error('等待时间必须是正整数秒。');
        return;
      }
      if (waitTime > 300) {
        Msg.warning('等待时间过长，已限制为300秒。');
        waitTime = 300;
      }
      Timeline.cancelEvents(e => e.type === 'player_turn' && e.actor === 'player');
      Battle.playerTask = null;
      Battle.playerFireHint = null;
      BattleUI.clearCurrentActions();
      Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, waitTime);
      Timeline.paused = false;
      Timeline.scheduleNext();
      Msg.info(`时间轴推进 ${waitTime} 秒，不打断当前动作。`);
      return;
    }

    // 无参数：等待下一个武器冷却完成
    const nextWeaponReady = [...Timeline.eventQueue]
      .filter(e => e.type === 'weapon_ready')
      .sort((a, b) => a.time - b.time)[0];

    if (!nextWeaponReady) {
      Msg.warning('没有正在冷却的武器，continue 指令无效。');
      return;
    }

    Timeline.cancelEvents(e => e.type === 'player_turn' && e.actor === 'player');
    Battle.playerTask = null;
    Battle.playerFireHint = null;
    BattleUI.clearCurrentActions();

    waitTime = Math.max(0.1, nextWeaponReady.time - Timeline.time);
    const weapon = Player.equipment[nextWeaponReady.slot]?.equip;
    const wName = weapon ? weapon.name : nextWeaponReady.slot;
    Timeline.scheduleEvent({ type: 'player_turn', actor: 'player' }, waitTime);
    Timeline.paused = false;
    Timeline.scheduleNext();
    Msg.info(`时间轴推进至 ${wName} 冷却完成（约${waitTime.toFixed(1)}秒后），不打断当前动作。`);
  },
 
  cmdBattleCall(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (!args[0]) {
      const npcs = Battle.battlefield.npcs || [];
      if (npcs.length === 0) {
        Msg.info('本场景没有可通信的 NPC。');
        return;
      }
      let info = '可通信 NPC：\n';
      for (const n of npcs) {
        const dist = Battle.getDistance(Player.position, n.position);
        const inRange = dist <= 100;
        info += `  ${n.instanceId} - ${n.name} (距离${dist.toFixed(0)}m) ${inRange ? '[通信可达]' : '[需接近]'}\n`;
      }
      info += '用法：call <编号或名字>  (需距离 ≤ 100m)';
      Msg.info(info);
      return;
    }
    const target = args[0].toUpperCase();
    const npcs = Battle.battlefield.npcs || [];
    const npc = npcs.find(n => n.instanceId === target || n.name === args[0]);
    if (!npc) {
      Msg.error(`未找到目标 ${args[0]}`);
      return;
    }
    const dist = Battle.getDistance(Player.position, npc.position);
    if (dist > 100) {
      Msg.error(`距离 ${npc.name} 太远（${dist.toFixed(0)}m），需接近至 100m 以内才能通信。`);
      return;
    }
    Battle.setPlayerTask({ type: 'call', npcId: npc.npcId });
  },

  cmdBattleMovePredict(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (args.length < 1) {
      Msg.info('用法：');
      Msg.info('  movepredict <x> <y>  - 预测移动到指定坐标的时间');
      Msg.info('  movepredict <方向> <距离> - 预测向指定方向移动的时间');
      Msg.info('方向：n/s/e/w/ne/nw/se/sw');
      return;
    }

    let targetX, targetY;
    const first = args[0];

    if (/^\d+$/.test(first) && args.length >= 2 && /^\d+$/.test(args[1])) {
      targetX = parseInt(first);
      targetY = parseInt(args[1]);
    } else if (/^[nsew]$/.test(first.toLowerCase()) || /^(ne|nw|se|sw)$/.test(first.toLowerCase())) {
      const dir = first.toLowerCase();
      const dirMap = {
        n:[0,-1], s:[0,1], e:[1,0], w:[-1,0],
        ne:[0.707,-0.707], nw:[-0.707,-0.707], se:[0.707,0.707], sw:[-0.707,0.707]
      };
      const d = dirMap[dir];
      if (!d) {
        Msg.error('方向无效。使用 n/s/e/w/ne/nw/se/sw');
        return;
      }
      if (args.length >= 2) {
        const dist = parseInt(args[1]);
        if (isNaN(dist) || dist <= 0) {
          Msg.error('距离必须是正整数。');
          return;
        }
        targetX = Player.position[0] + d[0] * dist;
        targetY = Player.position[1] + d[1] * dist;
      } else {
        const dist = 50;
        targetX = Player.position[0] + d[0] * dist;
        targetY = Player.position[1] + d[1] * dist;
      }
    } else {
      Msg.error('用法：movepredict <x> <y> 或 movepredict <方向> <距离>');
      return;
    }

    const [bw, bh] = Battle.battlefield.size;
    targetX = Math.max(10, Math.min(bw - 10, targetX));
    targetY = Math.max(10, Math.min(bh - 10, targetY));

    const dx = targetX - Player.position[0];
    const dy = targetY - Player.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Player.currentSpeed;
    const time = dist / speed;

    const terrainName = MapSystem.getTerrainName(Battle.battlefield.terrain);
    const terrainPenalty = Battle.battlefield.terrainPenalty || {};
    const chassis = Player.getChassisType();
    const penalty = terrainPenalty[chassis] !== undefined ? terrainPenalty[chassis] : 1.0;

    Msg.info(`📍 预测移动到 (${Math.round(targetX)}, ${Math.round(targetY)})`);
    Msg.info(`   距离: ${dist.toFixed(0)}m`);
    Msg.info(`   当前速度: ${speed.toFixed(1)}m/s (基础${Player.speed}m/s × 地形${penalty.toFixed(2)})`);
    Msg.info(`   地形: ${terrainName}`);
    Msg.info(`   ⏱ 预估时间: ${time.toFixed(1)}秒`);
  },

  cmdBattleMove(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (args.length < 1) {
      Msg.info('用法：');
      Msg.info('  move <x> <y>  - 移动到指定坐标');
      Msg.info('  move <方向> <距离> - 向指定方向移动距离(米)');
      Msg.info('  move <方向>  - 主方向(n/s/e/w)：移动到该方向边界并切换场景');
      Msg.info('  move <敌人编号>  - 移动到敌人附近');
      Msg.info('  move <NPC编号>   - 移动到NPC附近');
      Msg.info('方向：n/s/e/w/ne/nw/se/sw');
      return;
    }

    let targetX, targetY, autoExit = null;
    const first = args[0];

    if (/^\d+$/.test(first) && args.length >= 2 && /^\d+$/.test(args[1])) {
      targetX = parseInt(first);
      targetY = parseInt(args[1]);
    } else if (/^[nsew]$/.test(first.toLowerCase()) || /^(ne|nw|se|sw)$/.test(first.toLowerCase())) {
      const dir = first.toLowerCase();
      const dirMap = {
        n:[0,-1], s:[0,1], e:[1,0], w:[-1,0],
        ne:[0.707,-0.707], nw:[-0.707,-0.707], se:[0.707,0.707], sw:[-0.707,0.707]
      };
      const d = dirMap[dir];
      if (!d) {
        Msg.error('方向无效。使用 n/s/e/w/ne/nw/se/sw');
        return;
      }
      if (args.length >= 2) {
        // 指定距离：按指定距离移动
        const dist = parseInt(args[1]);
        if (isNaN(dist) || dist <= 0) {
          Msg.error('距离必须是正整数。');
          return;
        }
        targetX = Player.position[0] + d[0] * dist;
        targetY = Player.position[1] + d[1] * dist;
      } else if (/^[nsew]$/.test(dir)) {
        // 主方向无距离：移动到该方向边界点（距边界5m），到达后自动切换场景
        const [bw, bh] = Battle.battlefield.size;
        const margin = 5;
        switch (dir) {
          case 'n': targetX = Player.position[0]; targetY = margin; autoExit = 'north'; break;
          case 's': targetX = Player.position[0]; targetY = bh - margin; autoExit = 'south'; break;
          case 'e': targetX = bw - margin; targetY = Player.position[1]; autoExit = 'east'; break;
          case 'w': targetX = margin; targetY = Player.position[1]; autoExit = 'west'; break;
        }
        Msg.info(`向${MapSystem.getDirectionName(autoExit)}边界移动，到达后自动切换场景...`);
      } else {
        // 对角线无距离：默认移动 50m
        const dist = 50;
        targetX = Player.position[0] + d[0] * dist;
        targetY = Player.position[1] + d[1] * dist;
      }
    } else {
      const targetId = first.toUpperCase();
      const enemy = Battle.battlefield.enemies.find(e => e.instanceId === targetId);
      const npcList = Battle.battlefield.npcs || [];
      const npc = npcList.find(n => n.instanceId === targetId);

      if (enemy) {
        const dist = Battle.getDistance(Player.position, enemy.position);
        const weapon = Player.getEquippedWeapons()[0];
        const approachDist = weapon ? Math.min(dist - 10, weapon.range * 0.9) : Math.max(dist - 20, 50);
        const ratio = approachDist / dist;
        targetX = Player.position[0] + (enemy.position[0] - Player.position[0]) * ratio;
        targetY = Player.position[1] + (enemy.position[1] - Player.position[1]) * ratio;
        Msg.info(`向 ${enemy.name}[${enemy.instanceId}] 移动，接近到 ${approachDist.toFixed(0)}m`);
      } else if (npc) {
        const dx = npc.position[0] - Player.position[0];
        const dy = npc.position[1] - Player.position[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const stopDist = 30;
        if (dist <= stopDist) {
          Msg.info('已经在通信范围内。');
          return;
        }
        const ratio = (dist - stopDist) / dist;
        targetX = Player.position[0] + dx * ratio;
        targetY = Player.position[1] + dy * ratio;
        Msg.info(`向 ${npc.name}[${npc.instanceId}] 移动...`);
      } else {
        Msg.error(`未找到目标 ${first}。用法：move <x> <y> 或 move <方向> [距离] 或 move <目标编号>`);
        return;
      }
    }

    // 仅当目标超出边界（非 autoExit 模式）才尝试立即切换场景
    const [bw, bh] = Battle.battlefield.size;
    if (!autoExit && (targetX < 0 || targetX > bw || targetY < 0 || targetY > bh)) {
      if (Battle.combatActive) {
        Msg.warn('战斗中无法离开当前场景！');
        return;
      }
      const room = MapSystem.getRoom(Player.room);
      if (!room || !room.exits) {
        Msg.warning('这个方向无法通行。');
        return;
      }
      const exitDir = this._getExitDirection(targetX, targetY, bw, bh);
      if (!exitDir || !room.exits[exitDir]) {
        Msg.warning('这个方向没有出口。');
        return;
      }
      Msg.warn('提示：使用 enter <方向> 或 move <方向>（无距离）可正式切换场景。');
      return;
    }

    const isMoving = Timeline.continuousActions.some(a => a.actor === 'player' && a.type === 'move');

    // 解析 -s 标志（非战斗状态同步开火）
    const syncFire = args.includes('-s');
    // 检查是否有就绪武器
    const hasReadyWeapon = Player.getEquippedWeapons().some(w => (Player.weaponCooldowns[w.slot] || 0) <= 0);
    // 战斗状态：默认提示移动开火（保留原行为）
    // 非战斗状态：仅当显式 -s 时询问，否则直接移动忽略就绪武器
    const shouldPromptFire = Battle.combatActive
      ? (hasReadyWeapon && !Battle.playerFireHint)
      : (syncFire && hasReadyWeapon && !Battle.playerFireHint);

    if (shouldPromptFire) {
      // 移动中切换移动目标：先中断当前移动，再询问是否开火
      if (isMoving) {
        Battle.interruptPlayerMove();
      }
      Battle.playerFireHint = { pendingMove: [targetX, targetY], autoExit };
      const readyNames = Player.getEquippedWeapons()
        .filter(w => (Player.weaponCooldowns[w.slot] || 0) <= 0)
        .map(w => w.name);
      Msg.prompt(`武器已就绪（${readyNames.join('、')}）：输入 fire <目标> 移动开火（开火与移动并行），或 continue 跳过开火，或 continue <秒数> 延迟后重新询问。`);
      return;
    }

    // 已提示过或无就绪武器或非战斗无 -s：清除提示，执行移动
    Battle.playerFireHint = null;
    if (isMoving) {
      Battle.interruptPlayerMove();
    }
    Battle.setPlayerTask({ type: 'move', target: [targetX, targetY], autoExit });
  },

  cmdBattleEnter(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (args.length < 1) {
      Msg.info('用法：enter <方向>');
      Msg.info('  专用于切换相邻场景，需位于当前场景该方向边界 10m 内');
      Msg.info('  方向：n/s/e/w 或 north/south/east/west');
      return;
    }
    const dirMap = { n:'north', s:'south', e:'east', w:'west' };
    const dir = dirMap[args[0].toLowerCase()] || args[0].toLowerCase();
    if (!['north','south','east','west'].includes(dir)) {
      Msg.error('方向无效。使用 n/s/e/w 或 north/south/east/west');
      return;
    }
    if (Battle.combatActive) {
      Msg.warn('战斗中无法切换场景！');
      return;
    }
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.exits || !room.exits[dir]) {
      Msg.warning('这个方向没有出口。');
      return;
    }
    const [bw, bh] = Battle.battlefield.size;
    const margin = 10;
    const px = Player.position[0], py = Player.position[1];
    let atBoundary = false, distToBoundary = 0;
    if (dir === 'north') { atBoundary = py <= margin; distToBoundary = py; }
    else if (dir === 'south') { atBoundary = py >= bh - margin; distToBoundary = bh - py; }
    else if (dir === 'east') { atBoundary = px >= bw - margin; distToBoundary = bw - px; }
    else if (dir === 'west') { atBoundary = px <= margin; distToBoundary = px; }
    if (!atBoundary) {
      Msg.warn(`距离${MapSystem.getDirectionName(dir)}边界还有 ${distToBoundary.toFixed(0)}m，需先移动到边界 ${margin}m 内（可用 move ${args[0]}）。`);
      return;
    }
    Msg.info(`通过${MapSystem.getDirectionName(dir)}出口切换场景...`);
    Battle.end();
    BattleUI.remove();
    Game.move(dir);
  },

  _getExitDirection(tx, ty, bw, bh) {
    // 根据目标坐标超出边界的方向判断出口方向
    const overX = tx < 0 ? -1 : (tx > bw ? 1 : 0);
    const overY = ty < 0 ? -1 : (ty > bh ? 1 : 0);
    if (overX === -1 && overY === 0) return 'west';
    if (overX === 1 && overY === 0) return 'east';
    if (overX === 0 && overY === -1) return 'north';
    if (overX === 0 && overY === 1) return 'south';
    // 对角线时优先取主方向（偏移量更大的轴）
    if (Math.abs(overX) >= Math.abs(overY)) {
      return overX === -1 ? 'west' : 'east';
    }
    return overY === -1 ? 'north' : 'south';
  },
 
  cmdBattleFire(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (args.length < 1) {
      const enemies = Battle.battlefield.enemies.filter(e => e.hp > 0);
      if (enemies.length === 0) {
        Msg.info('附近没有敌人。');
        return;
      }
      let info = '可用目标：\n';
      for (const e of enemies) {
        const dist = Battle.getDistance(Player.position, e.position);
        const primaryWeapon = Player.getEquippedWeapons()[0];
        const inRange = primaryWeapon && dist <= primaryWeapon.range;
        info += `  ${e.instanceId} - ${e.name} (距离${dist.toFixed(0)}m) ${inRange ? '[射程内]' : '[超射程]'}\n`;
      }
      info += '用法：fire <目标编号> [武器槽]\n';
      info += '  武器槽: all(默认) 或接口编号（见 bag），默认所有就绪武器开火';
      Msg.info(info);
      return;
    }
    const targetId = args[0].toUpperCase();
    const slotArg = args[1] || 'all';
    const enemy = Battle.battlefield.enemies.find(e => e.instanceId === targetId);
    if (!enemy) {
      Msg.error(`未找到目标 ${targetId}`);
      return;
    }
    if (enemy.hp <= 0) {
      Msg.error('该目标已被击毁。');
      return;
    }

    // 确定要开火的武器槽列表
    let slots = [];
    if (slotArg === 'all') {
      for (const w of Player.getEquippedWeapons()) {
        slots.push(w.slot);
      }
    } else {
      // 支持数字编号（1-based）或 slot_key
      let slotKey = slotArg;
      const num = parseInt(slotArg);
      if (!isNaN(num) && num >= 1) {
        const keys = Object.keys(Player.equipment);
        slotKey = keys[num - 1];
      }
      const w = Player.equipment[slotKey]?.equip;
      if (!w) {
        Msg.error(`武器槽 ${slotArg} 为空或无效。可用: all 或接口编号（见 bag）`);
        return;
      }
      slots.push(slotKey);
    }

    if (slots.length === 0) {
      Msg.error('没有可用的武器。');
      return;
    }

    // 筛选就绪武器
    const readySlots = slots.filter(s => (Player.weaponCooldowns[s] || 0) <= 0);
    if (readySlots.length === 0) {
      const cdInfo = slots.map(s => {
        const w = Player.equipment[s]?.equip;
        return `${w ? w.name : s}:${(Player.weaponCooldowns[s]||0).toFixed(1)}s`;
      }).join(', ');
      Msg.warn(`所有指定武器都在冷却中（${cdInfo}）。`);
      return;
    }

    // 保存待执行的移动意图（来自 move 指令的开火提示）
    const hint = Battle.playerFireHint;
    const pendingMove = hint ? hint.pendingMove : null;
    const autoExit = hint ? hint.autoExit : null;
    Battle.playerFireHint = null;

    // 调度每个就绪武器的 player_fire 事件（前摇 0.3 秒，依次错开）
    const fireDelay = 0.3;
    for (let i = 0; i < readySlots.length; i++) {
      const s = readySlots[i];
      const weapon = Player.equipment[s]?.equip;
      const delay = fireDelay * (i + 1);
      Timeline.scheduleEvent({ type: 'player_fire', actor: 'player', target: targetId, slot: s, label: `攻击 ${targetId}` }, delay);
    }

    if (pendingMove) {
      // 移动开火：fire 由 move 触发，开火与移动并行执行
      Msg.info(`移动开火：攻击 ${targetId} (${readySlots.map(s => Player.equipment[s]?.equip?.name).join('/')})，同时继续移动`);
      Battle.setPlayerTask({ type: 'move', target: [...pendingMove], autoExit });
    } else {
      // 普通开火：解除 paused 让时间轴推进
      Msg.info(`开火指令已下达：攻击 ${targetId} (${readySlots.map(s => Player.equipment[s]?.equip?.name).join('/')})`);
      if (Timeline.paused && Battle.currentActor === 'player') {
        Timeline.paused = false;
      }
      Timeline.scheduleNext();
    }
  },
 
  cmdBattleLook(args) {
    if (!Battle.active || !Battle.battlefield) return;
    const bf = Battle.battlefield;

    // 带参数：查看指定单位（敌人或NPC）
    if (args && args.length >= 1) {
      const targetId = args[0].toUpperCase();
      const enemy = bf.enemies.find(e => e.instanceId === targetId);
      const npcList = bf.npcs || [];
      const npcUnit = npcList.find(n => n.instanceId === targetId);

      if (enemy) {
        const dist = Battle.getDistance(Player.position, enemy.position);
        const weapon = Player.getEquippedWeapons()[0];
        let info = `观察目标：${enemy.name}[${enemy.instanceId}]\n`;
        info += `距离：${dist.toFixed(0)}m\n`;
        info += `结构：${enemy.hp}/${enemy.maxHp}  装甲：${enemy.armor}/${enemy.maxArmor}\n`;
        info += `状态：${this.getStateName(enemy.state)}\n`;
        if (weapon) {
          const hitRate = Battle.calculateHitRate(Player, enemy, weapon, dist);
          info += `使用 ${weapon.name} 预计命中率：${(hitRate*100).toFixed(1)}%\n`;
          info += `射程：${weapon.range}m ${dist > weapon.range ? '(超出射程)' : '(射程内)'}`;
        }
        Msg.info(info);
        return;
      }

      if (npcUnit) {
        const npcDef = NPCDB[npcUnit.npcId];
        if (!npcDef) {
          Msg.error(`未找到目标 ${targetId}`);
          return;
        }
        const dist = Battle.getDistance(Player.position, npcUnit.position);
        let info = `观察目标：${npcDef.name}[${npcUnit.instanceId}]\n`;
        info += `头衔：${npcDef.title || '未知'}\n`;
        info += `距离：${dist.toFixed(0)}m\n`;
        info += `通信范围：${dist <= 100 ? '📞 可通信' : '📏 超出范围'}\n`;
        if (npcDef.shopItems) info += '服务：🛒 商店\n';
        if (npcDef.dialog) info += '（可使用 call 指令发起对话）';
        Msg.info(info);
        return;
      }

      Msg.error(`未找到目标 ${targetId}`);
      return;
    }

    // 无参数：先显示房间信息，再附加战场全貌
    Game.look();
    let info = `\n战场：${MapSystem.getRoom(Battle.roomId)?.name || '未知区域'}\n`;
    info += `地形：${MapSystem.getTerrainName(bf.terrain)}\n`;
    info += `你的位置：(${Math.round(Player.position[0])}, ${Math.round(Player.position[1])})\n`;
    const aliveEnemies = bf.enemies.filter(e=>e.hp>0);
    info += `敌人 (${aliveEnemies.length}/${bf.enemies.length})：\n`;
    for (const e of bf.enemies) {
      if (e.hp <= 0) continue;
      const dist = Battle.getDistance(Player.position, e.position);
      if (dist <= Player.visionRadius) {
        const state = this.getStateName(e.state);
        info += `  ${e.instanceId} ${e.name} - ${dist.toFixed(0)}m - HP${e.hp}/${e.maxHp} - ${state}\n`;
      }
    }
    if (aliveEnemies.length === 0) {
      info += '  （无敌对信号）\n';
    }
    if (bf.covers && bf.covers.length > 0) {
      info += `掩体：${bf.covers.length}处\n`;
    }
    if (bf.hazards && bf.hazards.length > 0) {
      info += `环境危险：${bf.hazards.length}处`;
    }
    Msg.info(info);
  },
 
  getStateName(state) {
    const names = {
      idle:'待机', alert:'警戒', pursue:'追击',
      attack:'攻击', search:'搜索', cover:'掩护',
      retreat:'撤退', berserk:'狂暴'
    };
    return names[state] || state;
  },
 
  cmdTimeline() {
    if (!Timeline.eventQueue || Timeline.eventQueue.length === 0) {
      Msg.info('时间轴当前为空。');
      return;
    }
    const sorted = [...Timeline.eventQueue].sort((a,b) => a.time - b.time).slice(0, 10);
    let info = '时间轴（接下来10个事件）：\n';
    for (const evt of sorted) {
      const offset = (evt.time - (Timeline.time || 0)).toFixed(0);
      let label = '';
      if (evt.type === 'player_turn') label = '你的行动';
      else if (evt.type === 'enemy_turn') label = `${evt.actor}行动`;
      else if (evt.type === 'move_complete') label = `${evt.actor}移动完成`;
      else if (evt.type === 'attack_complete') label = `${evt.actor}攻击完成`;
      info += `  +${offset}秒 - ${label}\n`;
    }
    Msg.info(info);
  },
 
  showBattleHelp() {
    const help = `🚀 战场指令帮助：
move <x> <y>     - 移动到指定坐标（点击雷达图自动填充）
move <方向> <距离> - 向方向移动指定距离 (n/s/e/w/ne/nw/se/sw)
move <方向>      - 主方向(n/s/e/w)：移动到边界并切换场景
move <目标编号>   - 移动到敌人/NPC附近
enter <方向>     - 切换相邻场景（需位于该方向边界 10m 内）
fire <目标> [槽] - 攻击目标 (目标如A1，槽:#1/#2/all，默认all所有就绪武器)
call <目标>      - 与 NPC 通信（需距离 ≤ 100m）
wait [秒数]      - 打断所有行动，等待指定秒数；无参数则等待至下一个事件
continue/cont    - 不打断当前动作，等待N秒或下一个武器冷却；移动中跳过开火
use <物品>       - 使用物品（如修复装甲）
reload <槽>      - 手动装填弹药（槽:#1/#2，见bag）
look [目标]      - 查看战场或指定目标（如 look N1）
timeline         - 查看时间轴
retreat          - 撤退
status / bag     - 查看状态/背包
help             - 查看帮助
movepredict/mp   - 预测移动时间`;
    Msg.info(help);
  }
};
