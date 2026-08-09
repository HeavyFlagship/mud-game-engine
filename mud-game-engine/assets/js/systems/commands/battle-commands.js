// ========== 战斗/探索层指令处理 ==========
// 这些指令仅在战场场景（非安全区）可用
const BattleCommands = {
  cmdMove(context) {
    // 委托给 command-system 的已有实现
    CommandSystem.cmdBattleMove(context.args);
  },

  cmdFire(context) {
    CommandSystem.cmdBattleFire(context.args);
  },

  cmdCall(context) {
    CommandSystem.cmdBattleCall(context.args);
  },

  cmdRetreat() {
    Battle.retreat();
  },

  cmdTimeline() {
    CommandSystem.cmdTimeline();
  },

  cmdWait() {
    Battle.setPlayerTask({ type: 'wait' });
  },

  cmdIdle(context) {
    CommandSystem.cmdBattleIdle(context.args);
  },

  cmdEnter(context) {
    CommandSystem.cmdBattleEnter(context.args);
  },

  cmdTalk(context) {
    Game.talk(context.args.join(' '));
  },
};