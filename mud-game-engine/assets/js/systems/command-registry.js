// ========== 三层指令注册表 ==========
const CommandRegistry = {
  global: {
    help: { cmd: 'help', handler: 'cmdHelp', desc: '查看帮助', args: '[分类]' },
    save: { cmd: 'save', handler: 'cmdSave', desc: '保存游戏' },
    load: { cmd: 'load', handler: 'cmdLoad', desc: '读取存档' },
    status: { cmd: 'status', handler: 'cmdStatus', desc: '查看状态' },
    bag: { cmd: 'bag', handler: 'cmdBag', desc: '查看背包', args: '[-d]' },
    equip: { cmd: 'equip', handler: 'cmdEquip', desc: '装备物品', args: '<编号|物品名>' },
    unequip: { cmd: 'unequip', handler: 'cmdUnequip', desc: '卸下装备', args: '<接口编号>' },
    look: { cmd: 'look', handler: 'cmdLook', desc: '查看当前场景', args: '[目标]' },
    use: { cmd: 'use', handler: 'cmdUse', desc: '使用物品', args: '<物品名>' },
    skills: { cmd: 'skills', handler: 'cmdSkills', desc: '查看技能' },
    map: { cmd: 'map', handler: 'cmdMap', desc: '查看地图' },
    clear: { cmd: 'clear', handler: 'cmdClear', desc: '清屏' },
    talk: { cmd: 'talk', handler: 'cmdTalk', desc: '对话', args: '[NPC名]' },
    score: { cmd: 'score', handler: 'cmdScore', desc: '查看统计' },
    pick: { cmd: 'pick', handler: 'cmdPick', desc: '拾取物品', args: '[物品名]' },
    drop: { cmd: 'drop', handler: 'cmdDrop', desc: '丢弃物品', args: '<物品名>' },
    cast: { cmd: 'cast', handler: 'cmdCast', desc: '施法', args: '<技能名>' },
    sell: { cmd: 'sell', handler: 'cmdSell', desc: '出售物品', args: '<物品名>' },
    reload: { cmd: 'reload', handler: 'cmdReload', desc: '装填弹药', args: '<接口编号>' },
    hangar: { cmd: 'hangar', handler: 'cmdHangar', desc: '查看机库' },
    机库: { cmd: '机库', handler: 'cmdHangar', desc: '查看机库' },
    switch: { cmd: 'switch', handler: 'cmdSwitch', desc: '切换载具', args: '<编号>' },
    warehouse: { cmd: 'warehouse', handler: 'cmdWarehouse', desc: '查看仓库' },
    仓库: { cmd: '仓库', handler: 'cmdWarehouse', desc: '查看仓库' },
    deposit: { cmd: 'deposit', handler: 'cmdDeposit', desc: '存入仓库', args: '<编号> [数量]' },
    withdraw: { cmd: 'withdraw', handler: 'cmdWithdraw', desc: '取出仓库', args: '<编号> [数量]' },
    wequip: { cmd: 'wequip', handler: 'cmdWequip', desc: '从仓库装备', args: '<编号>' },
    move: { cmd: 'move', handler: 'cmdMove', desc: '移动', args: '<方向>' },
    gather: { cmd: 'gather', handler: 'cmdGather', desc: '采集资源点' },
    采集: { cmd: '采集', handler: 'cmdGather', desc: '采集资源点' },
    call: { cmd: 'call', handler: 'cmdBattleCall', desc: '与NPC通信', args: '[目标]' },
  },
  battle: {
    fire: { cmd: 'fire', handler: 'cmdBattleFire', desc: '攻击目标', args: '<目标编号> [武器槽]' },
    retreat: { cmd: 'retreat', handler: 'cmdBattleRetreat', desc: '撤退' },
    timeline: { cmd: 'timeline', handler: 'cmdTimeline', desc: '查看时间轴' },
    wait: { cmd: 'wait', handler: 'cmdBattleWait', desc: '等待', args: '[秒数]' },
    idle: { cmd: 'idle', handler: 'cmdBattleIdle', desc: '待机' },
    enter: { cmd: 'enter', handler: 'cmdBattleEnter', desc: '切换场景', args: '<方向>' },
    continue: { cmd: 'continue', handler: 'cmdBattleContinue', desc: '继续', args: '[秒数]' },
    movepredict: { cmd: 'movepredict', handler: 'cmdBattleMovePredict', desc: '预测移动时间', args: '<坐标>' },
  },
  base: {
    shop: { cmd: 'shop', handler: 'cmdShop', desc: '商店（装备库）', args: '[物品名]' },
    trade: { cmd: 'trade', handler: 'cmdTrade', desc: '交易中心', args: '[物资名称]' },
    replenish: { cmd: 'replenish', handler: 'cmdReplenish', desc: '基础配额补给', args: '[物资名称]' },
    upgrade: { cmd: 'upgrade', handler: 'cmdUpgrade', desc: '改装核心模块', args: '[类型] [编号]' },
    // Placeholder handlers for future base commands
    工业: { cmd: '工业', handler: 'cmdIndustry', desc: '查看工业区' },
    industry: { cmd: 'industry', handler: 'cmdIndustry', desc: '查看工业区' },
    安装: { cmd: '安装', handler: 'cmdInstall', desc: '安装工业设施', args: '<设施ID>' },
    install: { cmd: 'install', handler: 'cmdInstall', desc: '安装工业设施', args: '<设施ID>' },
    使用设施: { cmd: '使用设施', handler: 'cmdUseFacility', desc: '使用设施', args: '<设施ID>' },
    调度: { cmd: '调度', handler: 'cmdSchedule', desc: '调度设施', args: '<设施ID> [模式]' },
    schedule: { cmd: 'schedule', handler: 'cmdSchedule', desc: '调度设施', args: '<设施ID> [模式]' },
    任务: { cmd: '任务', handler: 'cmdQuest', desc: '任务接取/交付', aliases: ['quest'] },
    备份: { cmd: '备份', handler: 'cmdBackup', desc: '意识备份/恢复' },
  },
  
  getAvailableCommands(sceneType) {
    const cmds = { ...this.global };
    if (sceneType === 'battle') {
      Object.assign(cmds, this.battle);
    } else if (sceneType === 'safe') {
      Object.assign(cmds, this.base);
    }
    return cmds;
  },
  
  getCommandHelp(sceneType) {
    const available = this.getAvailableCommands(sceneType);
    // Group by layer
    const groups = [];
    const globalCmds = [];
    const battleCmds = [];
    const baseCmds = [];

    const mergeByHandler = (entries) => {
      const map = new Map();
      for (const entry of entries) {
        if (map.has(entry.handler)) {
          map.get(entry.handler).aliases.push(entry.cmd);
        } else {
          map.set(entry.handler, { ...entry, aliases: entry.aliases ? [...entry.aliases] : [] });
        }
      }
      return [...map.values()];
    };

    for (const [key, entry] of Object.entries(available)) {
      if (this.global[key]) globalCmds.push(entry);
      else if (this.battle[key]) battleCmds.push(entry);
      else if (this.base[key]) baseCmds.push(entry);
    }

    return {
      global: mergeByHandler(globalCmds),
      battle: battleCmds,
      base: mergeByHandler(baseCmds)
    };
  },
  
  findCommand(cmd) {
    if (this.global[cmd]) return { entry: this.global[cmd], layer: 'global' };
    if (this.battle[cmd]) return { entry: this.battle[cmd], layer: 'battle' };
    if (this.base[cmd]) return { entry: this.base[cmd], layer: 'base' };
    return null;
  }
};