// ========== 基地服务层指令处理 ==========
// 这些指令仅在安全区场景可用
const BaseCommands = {
  cmdShop(context) {
    Game.shop(context.args[0] || 'list');
  },

  cmdSell(context) {
    Game.sell(context.args.join(' '));
  },

  cmdTrade(context) {
    if (typeof TradeSystem !== 'undefined') {
      TradeSystem.showTrade(context.args);
    } else {
      Msg.info('交易中心尚未开放。');
    }
  },

  cmdIndustry() {
    Msg.divider();
    // 先显示开发树状态
    if (typeof TechTree !== 'undefined') {
      Msg.add('🔬 开发树', 'info');
      const unlocked = TechTree.getUnlocked();
      const unlockable = TechTree.getUnlockable();
      Msg.info(`已解锁: ${unlocked.map(n => n.name).join(' → ') || '无'}`);
      if (unlockable.length > 0) {
        Msg.info(`可解锁: ${unlockable.map(n => {
          const cond = n.requiredItem ? `（需拥有${n.requiredCount}个${n.requiredItem}）` : '';
          return n.name + cond;
        }).join(', ')}`);
      }
    }
    // 再显示工业区
    if (typeof FacilitySystem !== 'undefined') {
      FacilitySystem.showIndustry();
    } else {
      Msg.info('工业区尚未开放。');
    }
  },

  cmdUseFacility(context) {
    if (typeof FacilitySystem !== 'undefined') {
      FacilitySystem.useFacility(context.args);
    } else {
      Msg.info('设施系统尚未开放。');
    }
  },

  cmdInstall(context) {
    if (typeof FacilitySystem !== 'undefined') {
      FacilitySystem.installFacility(context.args);
    } else {
      Msg.info('设施安装系统尚未开放。');
    }
  },

  cmdSchedule(context) {
    if (typeof FacilitySystem !== 'undefined') {
      FacilitySystem.scheduleFacility(context.args);
    } else {
      Msg.info('设施调度系统尚未开放。');
    }
  },

  cmdReplenish(context) {
    if (typeof QuotaSystem !== 'undefined') {
      QuotaSystem.replenish(context.args);
    } else {
      Msg.info('配额补给系统尚未开放。');
    }
  },

  cmdWarehouse() {
    Game.showWarehouse();
  },

  cmdHangar() {
    Game.showHangar();
  },

  cmdQuest() {
    if (typeof QuestSystem !== 'undefined') {
      QuestSystem.showQuests();
    } else {
      Msg.info('任务系统尚未开放。');
    }
  },

  cmdBackup() {
    Msg.info('意识备份系统尚未开放。');
  },

  cmdSwitch(context) {
    Game.switchVehicle(context.args[0] || '');
  },

  cmdDeposit(context) {
    Game.depositToWarehouse(context.args[0] || '', parseInt(context.args[1]) || 1);
  },

  cmdWithdraw(context) {
    Game.withdrawFromWarehouse(context.args[0] || '', parseInt(context.args[1]) || 1);
  },

  cmdWequip(context) {
    Game.equipFromWarehouse(context.args[0] || '');
  },
};