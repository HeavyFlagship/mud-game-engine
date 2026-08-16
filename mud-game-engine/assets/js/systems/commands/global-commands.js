// ========== 全局指令处理器 ==========
const GlobalCommands = {
  cmdHelp(args) {
    const room = MapSystem.getRoom(Player.room);
    const sceneType = (room && room.sceneType === 'safe') ? 'safe' : 'battle';
    const help = CommandRegistry.getCommandHelp(sceneType);

    const formatEntry = (entry) => {
      const args = entry.args ? ` ${entry.args}` : '';
      const aliasHtml = entry.aliases && entry.aliases.length > 0 ? ` <span class="help-alias">(${entry.aliases.join(' / ')})</span>` : '';
      return `  <span class="help-cmd">${entry.cmd}</span>${aliasHtml}${args} - <span class="help-desc">${entry.desc}</span>`;
    };

    Msg.divider();
    Msg.add('📖 指令帮助', 'info');

    // 全局指令
    if (help.global.length > 0) {
      Msg.add('📋 全局指令', 'info');
      for (const entry of help.global) {
        Msg.info(formatEntry(entry));
      }
      Msg.info('');
    }

    // 场景指令
    if (sceneType === 'battle' && help.battle.length > 0) {
      Msg.add('⚔ 战场指令', 'info');
      for (const entry of help.battle) {
        Msg.info(formatEntry(entry));
      }
      Msg.info('');
    }

    if (sceneType === 'safe' && help.base.length > 0) {
      Msg.add('🏭 基地指令', 'info');
      for (const entry of help.base) {
        Msg.info(formatEntry(entry));
      }
      Msg.info('');
    }

    Msg.system('提示: 进入战场场景自动开启时间轴，开火或被攻击后进入战斗状态');
  },
  cmdSave() { Game.save(); },
  cmdLoad() { Game.load(); },
  cmdStatus() { Game.showStatus(); },
  cmdBag(args) { Game.showBag(args.includes('-d')); },
  cmdEquip(args) { Game.equip(args.join(' ')); },
  cmdUnequip(args) { Game.unequip(args[0] || ''); },
  cmdLook(args) { 
    if (Battle.active && Battle.battlefield) {
      CommandSystem.cmdBattleLook(args);
    } else {
      Game.look(); 
    }
  },
  cmdUse(args) { Game.useItem(args.join(' ')); },
  cmdSkills() { Game.showSkills(); },
  cmdMap() { Game.showMap(); },
  cmdClear() { Msg.clear(); },
  cmdTalk(args) { Game.talk(args.join(' ')); },
  cmdBattleCall(args) { CommandSystem.cmdBattleCall(args); },
  cmdScore() { Game.showStats(); },
  cmdPick(args) { Game.pickItem(args.join(' ')); },
  cmdDrop(args) { Game.dropItem(args.join(' ')); },
  cmdCast(args) { Game.castOutside(args.join(' ')); },
  cmdSell(args) { Game.sell(args.join(' ')); },
  cmdReload(args) { Game.reload(args[0] || ''); },
  cmdHangar() { Game.showHangar(); },
  cmdSwitch(args) { Game.switchVehicle(args[0] || ''); },
  cmdWarehouse(args) { Game.showWarehouse(); },
  cmdDeposit(args) { Game.depositToWarehouse(args[0] || '', parseInt(args[1]) || 1); },
  cmdWithdraw(args) { Game.withdrawFromWarehouse(args[0] || '', parseInt(args[1]) || 1); },
  cmdWequip(args) { Game.equipFromWarehouse(args[0] || ''); },
  cmdMove(args) {
    const room = MapSystem.getRoom(Player.room);
    const isSafe = room && room.sceneType === 'safe';
    const first = (args[0] || '').toLowerCase();
    const dirMap = { n:'north', s:'south', e:'east', w:'west', up:'up', down:'down' };
    const direction = dirMap[first] || first;
    const isDirection = ['north','south','east','west','up','down'].includes(direction);

    if (isSafe) {
      // 安全区：复用战场移动逻辑——主方向先移动到边缘（移动动画）再切换场景，与战斗区一致；
      // 仅当尚未进入战场（无 battlefield）时才退化为直接切换房间
      if (Battle.active && Battle.battlefield) {
        CommandSystem.cmdBattleMove(args);
        return;
      }
      if (isDirection) {
        Game.move(direction);
        return;
      }
      Msg.info('用法：move <方向> (north/south/east/west) 或 move <x> <y>');
      return;
    }
    // 战场：委托给战场移动逻辑（支持方向/坐标/目标）
    if (Battle.active && Battle.battlefield) {
      CommandSystem.cmdBattleMove(args);
      return;
    }
    if (isDirection) {
      Game.move(direction);
      return;
    }
    Msg.info('用法：move <方向> (north/south/east/west/up/down)');
  },
  cmdGather() {
    const room = MapSystem.getRoom(Player.room);
    const resourcePoints = MapSystem.getResourcePoints(room.id);
    if (resourcePoints.length === 0) {
      Msg.warning('这里没有可采集的资源。');
      return;
    }
    let totalCollected = 0;
    for (const rp of resourcePoints) {
      const count = rp.rarity === 'rare' ? Utils.rand(10, 20) : Utils.rand(10, 30);
      Player.addItem(rp.itemId, count);
      Msg.success(`⛏ 采集了 <span class="item-tag material">${rp.name}</span> x${count}`);
      totalCollected++;
    }
    MapSystem.markHarvested(room.id);
    if (totalCollected > 0) {
      Msg.info('资源点已枯竭，该区域无法再采集。');
    }
  },
};