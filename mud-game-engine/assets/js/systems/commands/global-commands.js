// ========== 全局指令处理器 ==========
const GlobalCommands = {
  cmdHelp(args) {
    const room = MapSystem.getRoom(Player.room);
    const sceneType = (room && room.sceneType === 'safe') ? 'safe' : 'battle';
    const help = CommandRegistry.getCommandHelp(sceneType);
    
    Msg.divider();
    Msg.add('📖 指令帮助', 'info');
    
    // 全局指令
    if (help.global.length > 0) {
      Msg.add('📋 全局指令', 'info');
      for (const entry of help.global) {
        const args = entry.args ? ` ${entry.args}` : '';
        Msg.info(`  <span class="help-cmd">${entry.cmd}${args}</span> - <span class="help-desc">${entry.desc}</span>`);
      }
      Msg.info('');
    }
    
    // 场景指令
    if (sceneType === 'battle' && help.battle.length > 0) {
      Msg.add('⚔ 战场指令', 'info');
      for (const entry of help.battle) {
        const args = entry.args ? ` ${entry.args}` : '';
        Msg.info(`  <span class="help-cmd">${entry.cmd}${args}</span> - <span class="help-desc">${entry.desc}</span>`);
      }
      Msg.info('');
    }
    
    if (sceneType === 'safe' && help.base.length > 0) {
      Msg.add('🏭 基地指令', 'info');
      for (const entry of help.base) {
        const args = entry.args ? ` ${entry.args}` : '';
        Msg.info(`  <span class="help-cmd">${entry.cmd}${args}</span> - <span class="help-desc">${entry.desc}</span>`);
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
    // 方向移动指令：查看当前场景类型，如果在战场则委托给战场移动
    if (Battle.active && Battle.battlefield) {
      // 在战场场景中，方向移动指令由 battle 层处理
      // 但如果在安全区，方向移动就是基本移动
      Game.move(args);
    } else {
      Game.move(args);
    }
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
      const count = rp.rarity === 'rare' ? Utils.rand(1, 2) : Utils.rand(1, 3);
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