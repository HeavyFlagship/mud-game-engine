// ========== 全局指令处理 ==========
// 这些指令在任何场景类型下均可使用
const GlobalCommands = {
  cmdHelp(context) {
    const args = context.args;
    const sceneType = CommandRegistry.getSceneType();
    Msg.divider();
    Msg.add('📖 指令帮助', 'info');

    const categories = {
      global: { title: '📋 全局指令', items: [] },
      battle: { title: '⚔ 战斗/探索指令', items: [] },
      base: { title: '🏛 基地服务指令', items: [] },
    };

    for (const entry of Object.values(CommandRegistry.global)) {
      const argsStr = entry.args ? ` ${entry.args}` : '';
      categories.global.items.push([entry.cmd + argsStr, entry.desc]);
    }

    if (sceneType === 'battle') {
      for (const entry of Object.values(CommandRegistry.battle)) {
        const argsStr = entry.args ? ` ${entry.args}` : '';
        categories.battle.items.push([entry.cmd + argsStr, entry.desc]);
      }
    }

    if (sceneType === 'safe') {
      for (const entry of Object.values(CommandRegistry.base)) {
        const argsStr = entry.args ? ` ${entry.args}` : '';
        categories.base.items.push([entry.cmd + argsStr, entry.desc]);
      }
    }

    const topic = args[0];
    if (topic && categories[topic]) {
      const cat = categories[topic];
      Msg.add(cat.title, 'info');
      cat.items.forEach(([cmd, desc]) => {
        Msg.info(`  <span class="help-cmd">${cmd}</span> - <span class="help-desc">${desc}</span>`);
      });
    } else {
      for (const cat of Object.values(categories)) {
        if (cat.items.length === 0) continue;
        Msg.add(cat.title, 'info');
        cat.items.forEach(([cmd, desc]) => {
          Msg.info(`  <span class="help-cmd">${cmd}</span> - <span class="help-desc">${desc}</span>`);
        });
        Msg.info('');
      }
      Msg.system('提示: 输入 help 分类名 查看特定分类（global/battle/base）');
    }
  },

  cmdSave() {
    Game.save();
  },

  cmdLoad() {
    Game.load();
  },

  cmdStatus(context) {
    if (context.args.length > 0) {
      Game.showStats();
      return;
    }
    Game.showStatus();
  },

  cmdBag(context) {
    const showDetail = context.args.includes('-d');
    Game.showBag(showDetail);
  },

  cmdEquip(context) {
    Game.equip(context.args.join(' '));
  },

  cmdUnequip(context) {
    Game.unequip(context.args[0] || '');
  },

  cmdLook(context) {
    if (Battle.active && Battle.battlefield) {
      CommandSystem.cmdBattleLook(context.args);
    } else {
      Game.look();
    }
  },

  cmdUse(context) {
    Game.useItem(context.args.join(' '));
  },

  cmdSkills() {
    Game.showSkills();
  },

  cmdPick(context) {
    Game.pickItem(context.args.join(' '));
  },

  cmdDrop(context) {
    Game.dropItem(context.args.join(' '));
  },

  cmdReload(context) {
    Game.reload(context.args[0] || '');
  },

  cmdClear() {
    Msg.clear();
  },

  cmdMap() {
    Game.showMap();
  },

  cmdCast(context) {
    Game.castOutside(context.args.join(' '));
  },
};