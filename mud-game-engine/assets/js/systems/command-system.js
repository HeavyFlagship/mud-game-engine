// ========== 指令系统（注册表模式） ==========
const CommandSystem = {
  aliases: {
    n:'north', s:'south', e:'east', w:'west', up:'up', down:'down', 上:'up', 下:'down',
    l:'look', '?':'help', h:'help',
    inv:'bag', i:'bag',
    sta:'status',
    k:'kill', atk:'fire',
    u:'use', dr:'drink',
    eq:'equip', wp:'equip',
    ue:'unequip', rm:'unequip',
    sk:'skills',
    sh:'shop', buy:'shop',
    call:'call', 通信:'call', hailing:'call',
    对话:'talk',
    p:'pick', g:'get',
    d:'drop',
    sc:'score', st:'stats',
    mv:'move', go:'move',
    fi:'fire', shoot:'fire', atk:'fire',
    ent:'enter', 进入:'enter',
    tm:'timeline', tl_b:'timeline',
    re:'retreat', rt:'retreat',
    rl:'reload',
    hg:'hangar', wh:'warehouse'
  },

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

    // 方向移动指令特殊处理（需要查询房间出口，优先于注册表查找）
    if (['north','south','east','west','up','down','上','下'].includes(parsed.cmd)) {
      Game.move(parsed.cmd);
      Game.updateUI();
      return;
    }

    // 使用注册表查找指令定义
    const def = CommandRegistry.find(parsed.cmd);
    if (!def) {
      Msg.warning(`未知指令: ${parsed.cmd}。输入 <span class="help-cmd">help</span> 查看帮助。`);
      return;
    }

    // 检查指令在当前场景是否可用
    const sceneType = CommandRegistry.getSceneType();
    if (!CommandRegistry.isCommandAvailable(parsed.cmd, sceneType)) {
      const sceneName = sceneType === 'safe' ? '安全区' : '战场';
      Msg.warning(`指令 "${parsed.cmd}" 在${sceneName}场景中不可用。`);
      if (sceneType === 'safe') {
        Msg.system('提示：离开基地进入战场后可使用战斗指令（move/fire/call/retreat 等）。');
      } else {
        Msg.system('提示：返回基地安全区后可使用基地服务指令（shop/trade/工业/安装 等）。');
      }
      return;
    }

    // 通过注册表分发到对应指令处理模块
    const context = { cmd: parsed.cmd, args: parsed.args, parsed };
    const handlerName = def.handler;
    const isQuery = def.isQuery === true;

    // 执行指令处理函数的包装
    const executeHandler = () => {
      let handled = false;
      const modules = [GlobalCommands, BattleCommands, BaseCommands];
      for (const mod of modules) {
        if (mod && typeof mod[handlerName] === 'function') {
          mod[handlerName](context);
          handled = true;
          break;
        }
      }
      if (!handled) {
        if (typeof Game !== 'undefined' && typeof Game[handlerName] === 'function') {
          Game[handlerName](parsed.args);
        } else {
          Msg.system(`指令 "${parsed.cmd}" 已注册但处理函数尚未实现。`);
        }
      }
    };

    // 查询类指令路由到查询面板
    if (isQuery) {
      const title = def.desc || '查询';
      Msg.withQuery(title, parsed.raw, executeHandler);
    } else {
      executeHandler();
    }

    // 设施系统更新（根据实际时间流逝）
    if (typeof FacilitySystem !== 'undefined' && typeof Game !== 'undefined') {
      const now = Date.now();
      if (!Game._lastFacilityUpdate) Game._lastFacilityUpdate = now;
      const delta = (now - Game._lastFacilityUpdate) / 1000;
      if (delta >= 1) {
        FacilitySystem.update(delta);
        Game._lastFacilityUpdate = now;
      }
    }

    Game.updateUI();
  },

  // ===== 以下为战斗场景指令的底层实现（供 BattleCommands 模块调用） =====

  cmdBattleIdle(args) {
    if (!Battle.active || !Battle.battlefield) return;
    let seconds = parseInt(args[0]);
    if (!seconds || seconds < 1) {
      Msg.info('用法：idle <秒数>  - 待机指定秒数，期间时间轴继续推进');
      Msg.info('示例：idle 10  - 等待10秒后再次决策；期间被攻击将立即进入行动阶段');
      return;
    }
    if (seconds > 300) {
      Msg.warning('待机时间过长，已限制为300秒。');
      seconds = 300;
    }
    Battle.playerFireHint = null;
    Battle.playerIdle(seconds);
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
        const dist = parseInt(args[1]);
        if (isNaN(dist) || dist <= 0) {
          Msg.error('距离必须是正整数。');
          return;
        }
        targetX = Player.position[0] + d[0] * dist;
        targetY = Player.position[1] + d[1] * dist;
      } else if (/^[nsew]$/.test(dir)) {
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

    const syncFire = args.includes('-s');
    const hasReadyWeapon = Player.getEquippedWeapons().some(w => (Player.weaponCooldowns[w.slot] || 0) <= 0);
    const shouldPromptFire = Battle.combatActive
      ? (hasReadyWeapon && !Battle.playerFireHint)
      : (syncFire && hasReadyWeapon && !Battle.playerFireHint);

    if (shouldPromptFire) {
      if (isMoving) {
        Battle.interruptPlayerMove();
      }
      Battle.playerFireHint = { pendingMove: [targetX, targetY], autoExit };
      const readyNames = Player.getEquippedWeapons()
        .filter(w => (Player.weaponCooldowns[w.slot] || 0) <= 0)
        .map(w => w.name);
      Msg.prompt(`武器已就绪（${readyNames.join('、')}）：输入 fire <目标> 移动开火（开火与移动并行），或再次输入 move 仅移动跳过开火。`);
      return;
    }

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
    const overX = tx < 0 ? -1 : (tx > bw ? 1 : 0);
    const overY = ty < 0 ? -1 : (ty > bh ? 1 : 0);
    if (overX === -1 && overY === 0) return 'west';
    if (overX === 1 && overY === 0) return 'east';
    if (overX === 0 && overY === -1) return 'north';
    if (overX === 0 && overY === 1) return 'south';
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

    let slots = [];
    if (slotArg === 'all') {
      for (const w of Player.getEquippedWeapons()) {
        slots.push(w.slot);
      }
    } else {
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

    const readySlots = slots.filter(s => (Player.weaponCooldowns[s] || 0) <= 0);
    if (readySlots.length === 0) {
      const cdInfo = slots.map(s => {
        const w = Player.equipment[s]?.equip;
        return `${w ? w.name : s}:${(Player.weaponCooldowns[s]||0).toFixed(1)}s`;
      }).join(', ');
      Msg.warn(`所有指定武器都在冷却中（${cdInfo}）。`);
      return;
    }

    const hint = Battle.playerFireHint;
    const pendingMove = hint ? hint.pendingMove : null;
    const autoExit = hint ? hint.autoExit : null;
    Battle.playerFireHint = null;

    const fireDelay = 0.3;
    for (let i = 0; i < readySlots.length; i++) {
      const s = readySlots[i];
      const weapon = Player.equipment[s]?.equip;
      const delay = fireDelay * (i + 1);
      Timeline.scheduleEvent({ type: 'player_fire', actor: 'player', target: targetId, slot: s, label: `攻击 ${targetId}` }, delay);
    }

    if (pendingMove) {
      Msg.info(`移动开火：攻击 ${targetId} (${readySlots.map(s => Player.equipment[s]?.equip?.name).join('/')})，同时继续移动`);
      Battle.setPlayerTask({ type: 'move', target: [...pendingMove], autoExit });
    } else {
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
    let help = '场景指令：\n';
    const sceneType = CommandRegistry.getSceneType();
    const available = CommandRegistry.getAvailableCommands(sceneType);
    for (const entry of available) {
      const argsStr = entry.args ? ` ${entry.args}` : '';
      help += `  <span class="help-cmd">${entry.cmd}${argsStr}</span> - ${entry.desc}\n`;
    }
    Msg.info(help);
  }
};