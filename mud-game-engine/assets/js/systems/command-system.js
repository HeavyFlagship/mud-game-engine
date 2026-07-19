// ========== 指令系统 ==========
const CommandSystem = {
  aliases: {
    n:'north', s:'south', e:'east', w:'west', up:'up', down:'down', 上:'up', 下:'down',
    l:'look', '?':'help', h:'help',
    inv:'bag', i:'bag',
    sta:'status',
    k:'kill', atk:'kill',
    u:'use', dr:'drink',
    eq:'equip', wp:'equip',
    ue:'unequip', rm:'unequip',
    sk:'skills',
    sh:'shop', buy:'shop',
    tl:'talk', sp:'talk',
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
      case 'kill': case '攻击': case 'fight':
        Game.fight(parsed.args.join(' ')); break;
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
      case 'fire': case 'shoot': case 'attack': case '攻击':
        this.cmdBattleFire(parsed.args); break;
      case 'aim': case '瞄准':
        this.cmdBattleAim(parsed.args); break;
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
        if (Battle.paused && Battle.currentActor === 'player') Battle.resume();
        break;
      case 'look': case '查看':
        this.cmdBattleLook(); break;
      case 'help': case '帮助':
        this.runQuery(parsed, '战斗指令帮助', () => this.showBattleHelp()); break;
      case 'wait': case '等待':
        Battle.setPlayerTask({ type: 'wait' });
        Battle.paused = false;
        break;
      default:
        Msg.warning('战斗中可用指令：move/fire/aim/status/use/look/retreat/help/wait');
    }
  },

  cmdBattleMove(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (args.length < 2) {
      Msg.info('用法：move <x> <y>  或  move <方向> <距离>');
      Msg.info('方向：n/s/e/w/ne/nw/se/sw');
      return;
    }
    let targetX, targetY;
    if (/^\d+$/.test(args[0]) && /^\d+$/.test(args[1])) {
      targetX = parseInt(args[0]);
      targetY = parseInt(args[1]);
    } else {
      const dir = args[0];
      const dist = parseInt(args[1]) || 50;
      const dirMap = {
        n:[0,-1], s:[0,1], e:[1,0], w:[-1,0],
        ne:[0.7,-0.7], nw:[-0.7,-0.7], se:[0.7,0.7], sw:[-0.7,0.7]
      };
      const d = dirMap[dir];
      if (!d) {
        Msg.error('方向无效。使用 n/s/e/w/ne/nw/se/sw');
        return;
      }
      targetX = Player.position[0] + d[0] * dist;
      targetY = Player.position[1] + d[1] * dist;
    }
    Battle.setPlayerTask({ type: 'move', target: [targetX, targetY] });
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
    Battle.setPlayerTask({ type: 'attack', target: targetId, slot });
  },

  cmdBattleAim(args) {
    if (!Battle.active || !Battle.battlefield) return;
    if (args.length < 1) {
      Msg.info('用法：aim <目标编号>');
      return;
    }
    const targetId = args[0].toUpperCase();
    const enemy = Battle.battlefield.enemies.find(e => e.instanceId === targetId);
    if (!enemy) {
      Msg.error(`未找到目标 ${targetId}`);
      return;
    }
    const dist = Battle.getDistance(Player.position, enemy.position);
    const weapon = Player.equipment.primary;
    let info = `瞄准目标：${enemy.name}[${enemy.instanceId}]\n`;
    info += `距离：${dist.toFixed(0)}m\n`;
    info += `HP：${enemy.hp}/${enemy.maxHp}  装甲：${enemy.armor}/${enemy.maxArmor}\n`;
    info += `状态：${this.getStateName(enemy.state)}\n`;
    if (weapon) {
      const hitRate = Battle.calculateHitRate(Player, enemy, weapon, dist);
      info += `使用 ${weapon.name} 预计命中率：${(hitRate*100).toFixed(1)}%\n`;
      info += `射程：${weapon.range}m ${dist > weapon.range ? '(超出射程)' : '(射程内)'}`;
    }
    Msg.info(info);
  },

  cmdBattleLook() {
    if (!Battle.active || !Battle.battlefield) return;
    const bf = Battle.battlefield;
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
      info += `  +${offset}t - ${label}\n`;
    }
    Msg.info(info);
  },

  showBattleHelp() {
    const help = `战斗指令：
  move <x> <y>     - 移动到指定坐标
  move <方向> <距离> - 向方向移动 (n/s/e/w/ne/nw/se/sw)
  fire <目标> [槽] - 攻击目标 (目标如A1，槽:primary/secondary)
  aim <目标>       - 瞄准并查看目标信息
  use <物品>       - 使用物品
  status / bag     - 查看状态/背包
  look             - 查看战场
  timeline         - 查看时间轴
  wait             - 等待一回合
  retreat          - 撤退
  help             - 查看帮助`;
    Msg.info(help);
  }
};
