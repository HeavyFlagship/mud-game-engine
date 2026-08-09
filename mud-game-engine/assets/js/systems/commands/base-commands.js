// ========== 基地指令处理器 ==========
const BaseCommands = {
  cmdShop(args) {
    Game.shop(args[0] || 'list');
  },
  cmdTrade(args) {
    // Placeholder - will be implemented in Phase 3
    Msg.info('交易中心功能开发中...');
  },
  cmdReplenish(args) {
    // Placeholder - will be implemented in Phase 3
    Msg.info('配额补给功能开发中...');
  },
  cmdUpgrade(args) {
    Game.upgrade(args.join(' '));
  },
  cmdIndustry(args) {
    Msg.info('工业区功能开发中...');
  },
  cmdInstall(args) {
    Msg.info('设施安装功能开发中...');
  },
  cmdUseFacility(args) {
    Msg.info('设施使用功能开发中...');
  },
  cmdSchedule(args) {
    Msg.info('设施调度功能开发中...');
  },
  cmdWarehouseBase(args) {
    Game.showWarehouse();
  },
  cmdHangarBase(args) {
    Game.showHangar();
  },
  cmdQuest(args) {
    Msg.info('任务系统功能开发中...');
  },
  cmdBackup(args) {
    Msg.info('意识备份功能开发中...');
  },
};