// ========== 指令系统 ==========
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
    p:'pick', g:'get',
    d:'drop',
    sc:'score', st:'stats',
    mv:'move', go:'move',
    fi:'fire', shoot:'fire', atk:'fire',
    tm:'timeline', tl_b:'timeline',
    re:'retreat', rt:'retreat'
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
 
    if (Battle.active) {
      this.handleBattleCmd(parsed);
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
        Game.unequip(parsed.args.join(' ')); break;
      case 'use': case '使用': case 'drink': case '喝':
        Game.useItem(parsed.args.join(' ')); break;
      case 'skills': case '技能':
        this.runQuery(parsed, '技能列表', () => Game.showSkills()); break;
      case 'pick': case 'get': case '拾取':
        Game.pickItem(parsed.args.join(' ')); break;
      case 'drop': case '丢弃':
        Game.dropItem(parsed.args.join(' ')); break;
      case 'talk': case '对话': case 'call': case '通信':
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
      case 'fire': case 'shoot': case 'attack': case '攻击':
        this.cmdBattleFire(parsed.args); break;
      case 'call': case 'talk': case '对话': case '通信':
        this.cmdBattleCall(parsed.args); break;
      case 'retreat': case 'flee': case '撤退':
        Battle.retreat(); break;
      case 'timeline':
        this.cmdTimeline(); break;
      case 'status': case '状态':
        this.runQuery(parsed, '机体状态', () => Game.showStatus()); break;
      case 'bag': case '背包':
        this.runQuery(parsed, '背包', () => Game.showBag(parsed.args.includes('-d'))); break;
      case 'use': case '使用':
        Game.useItem(parsed.args.join(' '));
        break;
      case 'look': case '查看':
        this.cmdBattleLook(parsed.args); break;
      case 'help': case '帮助':
        this.runQuery(parsed, '战斗指令帮助', () => this.showBattleHelp()); break;
      case 'wait': case '等待':
        Battle.setPlayerTask({ type: 'wait' });
        break;
      case 'idle': case '待机':
        this.cmdBattleIdle(parsed.args); break;
      default:
        Msg.warning('场景中可用指令：move/fire/call/idle/status/use/look/retreat/help/wait');
    }
  },

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
      Msg.info('  move <敌人编号>  - 移动到敌人附近');
      Msg.info('  move <NPC编号>   - 移动到NPC附近');
      Msg.info('方向：n/s/e/w/ne/nw/se/sw');
      Msg.info('坐标超出战场边界且该方向有出口时，非战斗状态可前往相邻场景');
      return;
    }

    let targetX, targetY;
    const first = args[0];

    if (/^\d+$/.test(first) && args.length >= 2 && /^\d+$/.test(args[1])) {
      targetX = parseInt(first);
      targetY = parseInt(args[1]);
    } else if (/^[nsew]$/.test(first.toLowerCase()) || /^(ne|nw|se|sw)$/.test(first.toLowerCase())) {
      const dir = first.toLowerCase();
      const dist = args.length >= 2 ? parseInt(args[1]) : 50;
      const dirMap = {
        n:[0,-1], s:[0,1], e:[1,0], w:[-1,0],
        ne:[0.707,-0.707], nw:[-0.707,-0.707], se:[0.707,0.707], sw:[-0.707,0.707]
      };
      const d = dirMap[dir];
      if (!d) {
        Msg.error('方向无效。使用 n/s/e/w/ne/nw/se/sw');
        return;
      }
      targetX = Player.position[0] + d[0] * dist;
      targetY = Player.position[1] + d[1] * dist;
    } else {
      const targetId = first.toUpperCase();
      const enemy = Battle.battlefield.enemies.find(e => e.instanceId === targetId);
      const npcList = Battle.battlefield.npcs || [];
      const npc = npcList.find(n => n.instanceId === targetId);

      if (enemy) {
        const dist = Battle.getDistance(Player.position, enemy.position);
        const weapon = Player.equipment.primary;
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
        Msg.error(`未找到目标 ${first}。用法：move <x> <y> 或 move <方向> <距离> 或 move <目标编号>`);
        return;
      }
    }

    const [bw, bh] = Battle.battlefield.size;
    if (targetX < 0 || targetX > bw || targetY < 0 || targetY > bh) {
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
      Battle.end();
      BattleUI.remove();
      Game.move(exitDir);
      return;
    }

    const isMoving = Battle.continuousActions.some(a => a.actor === 'player' && a.type === 'move');
    if (isMoving) {
      Battle.addPlayerAction({ type: 'move', target: [targetX, targetY], label: `移动到(${Math.round(targetX)}, ${Math.round(targetY)})` });
      Msg.info(`行动已加入就绪列表：移动到(${Math.round(targetX)}, ${Math.round(targetY)})`);
    } else {
      Battle.setPlayerTask({ type: 'move', target: [targetX, targetY] });
    }
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
        const inRange = Player.equipment.primary && dist <= Player.equipment.primary.range;
        info += `  ${e.instanceId} - ${e.name} (距离${dist.toFixed(0)}m) ${inRange ? '[射程内]' : '[超射程]'}\n`;
      }
      info += '用法：fire <目标编号> [武器槽]  武器槽: primary/secondary (默认primary)';
      Msg.info(info);
      return;
    }
    const targetId = args[0].toUpperCase();
    const slot = args[1] || 'primary';
    const enemy = Battle.battlefield.enemies.find(e => e.instanceId === targetId);
    if (!enemy) {
      Msg.error(`未找到目标 ${targetId}`);
      return;
    }
    if (enemy.hp <= 0) {
      Msg.error('该目标已被击毁。');
      return;
    }
    const weapon = Player.equipment[slot];
    const isOnCooldown = weapon && Player.weaponCooldowns[slot] > 0;
    const isMoving = Battle.continuousActions.some(a => a.actor === 'player' && a.type === 'move');

    if (isOnCooldown || isMoving || Battle.combatActive) {
      Battle.addPlayerAction({ type: 'fire', target: targetId, slot, label: `攻击 ${targetId}` });
      Msg.info(`行动已加入就绪列表：攻击 ${targetId}`);
      return;
    }

    const fired = Battle.playerAttack(targetId, slot);
    // 开火成功后：消耗一个决策点，推进时间轴
    if (fired) {
      if (Battle.paused && Battle.currentActor === 'player') {
        // 玩家决策点开火：解除 paused，让敌人有机会行动
        Battle.paused = false;
        // 取消未触发的 player_turn，调度新的（玩家行动消耗时间）
        Battle.eventQueue = Battle.eventQueue.filter(e => !(e.type === 'player_turn' && e.actor === 'player'));
        Battle.scheduleNextPlayerTurn();
      } else if (Battle.playerIdleEnd) {
        // idle 中开火：取消 idle，让时间轴继续推进
        Battle.cancelPlayerIdle();
      }
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
        const weapon = Player.equipment.primary;
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

    // 无参数：查看战场全貌
    let info = `战场：${MapSystem.getRoom(Battle.roomId)?.name || '未知区域'}\n`;
    info += `地形：${MapSystem.getTerrainName(bf.terrain)}\n`;
    info += `你的位置：(${Math.round(Player.position[0])}, ${Math.round(Player.position[1])})\n`;
    info += `敌人 (${bf.enemies.filter(e=>e.hp>0).length}/${bf.enemies.length})：\n`;
    for (const e of bf.enemies) {
      if (e.hp <= 0) continue;
      const dist = Battle.getDistance(Player.position, e.position);
      if (dist <= Player.visionRadius) {
        const state = this.getStateName(e.state);
        info += `  ${e.instanceId} ${e.name} - ${dist.toFixed(0)}m - HP${e.hp}/${e.maxHp} - ${state}\n`;
      }
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
    if (!Battle.active || !Battle.eventQueue) return;
    const sorted = [...Battle.eventQueue].sort((a,b) => a.time - b.time).slice(0, 10);
    let info = '时间轴（接下来10个事件）：\n';
    for (const evt of sorted) {
      const offset = (evt.time - Battle.battlefield.time).toFixed(0);
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
    const help = `场景指令：
  move <x> <y>     - 移动到指定坐标
  move <方向> <距离> - 向方向移动 (n/s/e/w/ne/nw/se/sw)
  move <目标编号>   - 移动到敌人/NPC附近
  fire <目标> [槽] - 攻击目标 (目标如A1，槽:primary/secondary)
  call <目标>      - 与 NPC 通信（需距离 ≤ 100m）
  idle <秒数>      - 待机指定秒数（期间时间轴推进，被攻击立即行动）
  use <物品>       - 使用物品
  status / bag     - 查看状态/背包
  look [目标]      - 查看战场或指定目标（如 look N1）
  timeline         - 查看时间轴
  wait             - 等待一回合
  retreat          - 撤退
  help             - 查看帮助`;
    Msg.info(help);
  }
};
