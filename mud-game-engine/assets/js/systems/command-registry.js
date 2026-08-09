// ========== 指令注册表（三层架构） ==========
// 对应设计文档：世界场景设计书 §4.7 场景指令分类
const CommandRegistry = {
  // 全局指令：任何场景下均可执行
  global: {
    help: { cmd: 'help', aliases: ['帮助', '?', 'h'], handler: 'cmdHelp', desc: '查看帮助', args: '[分类]', isQuery: true },
    save: { cmd: 'save', aliases: ['存档'], handler: 'cmdSave', desc: '保存游戏进度' },
    load: { cmd: 'load', aliases: ['读档'], handler: 'cmdLoad', desc: '读取游戏存档' },
    status: { cmd: 'status', aliases: ['状态', 'sta', 'sc', 'score', 'stats', 'st', '统计'], handler: 'cmdStatus', desc: '查看机体状态/任务统计', isQuery: true },
    bag: { cmd: 'bag', aliases: ['背包', 'inv', 'i'], handler: 'cmdBag', desc: '查看背包', args: '[-d]', isQuery: true },
    equip: { cmd: 'equip', aliases: ['装备', 'eq', 'wp'], handler: 'cmdEquip', desc: '装备物品', args: '<编号|物品名>' },
    unequip: { cmd: 'unequip', aliases: ['卸下', 'ue', 'rm'], handler: 'cmdUnequip', desc: '卸下装备', args: '<接口编号>' },
    look: { cmd: 'look', aliases: ['查看', 'l'], handler: 'cmdLook', desc: '查看当前场景/目标', args: '[目标]' },
    use: { cmd: 'use', aliases: ['使用', 'u', 'drink', 'dr', '喝'], handler: 'cmdUse', desc: '使用物品', args: '<物品名>' },
    skills: { cmd: 'skills', aliases: ['技能', 'sk'], handler: 'cmdSkills', desc: '查看技能列表', isQuery: true },
    pick: { cmd: 'pick', aliases: ['拾取', 'p', 'get', 'g'], handler: 'cmdPick', desc: '拾取物品', args: '[物品名]' },
    drop: { cmd: 'drop', aliases: ['丢弃', 'd'], handler: 'cmdDrop', desc: '丢弃物品', args: '<物品名>' },
    reload: { cmd: 'reload', aliases: ['装填', 'rl'], handler: 'cmdReload', desc: '装填弹药', args: '<接口编号>' },
    clear: { cmd: 'clear', aliases: ['清屏'], handler: 'cmdClear', desc: '清空屏幕' },
    map: { cmd: 'map', aliases: ['地图'], handler: 'cmdMap', desc: '查看区域地图', isQuery: true },
    cast: { cmd: 'cast', aliases: ['施法'], handler: 'cmdCast', desc: '使用技能', args: '<技能名>' },
  },

  // 战斗/探索层指令：仅在战场场景(非安全区)可用
  battle: {
    move: { cmd: 'move', aliases: ['mv', 'go'], handler: 'cmdMove', desc: '移动', args: '<方向/坐标/目标>' },
    fire: { cmd: 'fire', aliases: ['攻击', 'shoot', 'atk', 'fi', 'attack', 'k', 'kill'], handler: 'cmdFire', desc: '攻击目标', args: '<目标> [武器槽]' },
    call: { cmd: 'call', aliases: ['通信', 'hailing'], handler: 'cmdCall', desc: '与NPC通信', args: '<目标>' },
    retreat: { cmd: 'retreat', aliases: ['撤退', 're', 'rt', 'flee'], handler: 'cmdRetreat', desc: '撤退' },
    timeline: { cmd: 'timeline', aliases: ['tm', 'tl_b'], handler: 'cmdTimeline', desc: '查看时间轴' },
    wait: { cmd: 'wait', aliases: ['等待'], handler: 'cmdWait', desc: '等待一回合' },
    idle: { cmd: 'idle', aliases: ['待机'], handler: 'cmdIdle', desc: '待机指定秒数', args: '<秒数>' },
    enter: { cmd: 'enter', aliases: ['进入', 'ent'], handler: 'cmdEnter', desc: '切换场景', args: '<方向>' },
    talk: { cmd: 'talk', aliases: ['对话'], handler: 'cmdTalk', desc: '与NPC对话', args: '[NPC名]' },
  },

  // 基地服务层指令：仅在安全区场景可用
  base: {
    shop: { cmd: 'shop', aliases: ['商店', 'buy', '购买'], handler: 'cmdShop', desc: '商店（装备库）', args: '[物品名|all]', isQuery: true },
    sell: { cmd: 'sell', aliases: ['出售'], handler: 'cmdSell', desc: '出售物品', args: '<物品名>' },
    trade: { cmd: 'trade', aliases: ['交易'], handler: 'cmdTrade', desc: '交易中心（供需/市场订单）', args: '[物资名称]', isQuery: true },
    '工业': { cmd: '工业', aliases: ['industry'], handler: 'cmdIndustry', desc: '查看工业区/设施', isQuery: true },
    '使用设施': { cmd: '使用设施', aliases: ['use_facility'], handler: 'cmdUseFacility', desc: '使用/申请设施' },
    '安装': { cmd: '安装', aliases: ['install'], handler: 'cmdInstall', desc: '安装工业设施', args: '<设施类型>' },
    '调度': { cmd: '调度', aliases: ['schedule'], handler: 'cmdSchedule', desc: '调度设施运行模式', args: '<设施名> [模式]' },
    replenish: { cmd: 'replenish', aliases: ['补给'], handler: 'cmdReplenish', desc: '基础配额补给', args: '[物资名称]' },
    '仓库': { cmd: '仓库', aliases: ['warehouse', 'wh'], handler: 'cmdWarehouse', desc: '仓库管理', isQuery: true },
    '机库': { cmd: '机库', aliases: ['hangar', 'hg'], handler: 'cmdHangar', desc: '机库/载具管理', isQuery: true },
    '任务': { cmd: '任务', aliases: ['quest'], handler: 'cmdQuest', desc: '任务接取/交付', isQuery: true },
    '备份': { cmd: '备份', aliases: ['backup'], handler: 'cmdBackup', desc: '意识备份/恢复' },
    switch: { cmd: 'switch', aliases: ['切换'], handler: 'cmdSwitch', desc: '切换机体', args: '<编号>' },
    deposit: { cmd: 'deposit', aliases: ['存入', '存仓', 'export'], handler: 'cmdDeposit', desc: '存入仓库', args: '<编号> [数量]' },
    withdraw: { cmd: 'withdraw', aliases: ['取出', '取回', 'import'], handler: 'cmdWithdraw', desc: '从仓库取出', args: '<编号> [数量]' },
    wequip: { cmd: 'wequip', aliases: ['仓装'], handler: 'cmdWequip', desc: '从仓库直接装备', args: '<编号>' },
  },

  // 查找指令定义（按指令名或别名）
  find(cmdName) {
    for (const layer of ['global', 'battle', 'base']) {
      for (const entry of Object.values(this[layer])) {
        if (entry.cmd === cmdName || (entry.aliases && entry.aliases.includes(cmdName))) {
          return { layer, ...entry };
        }
      }
    }
    return null;
  },

  // 获取当前场景可用的指令列表
  getAvailableCommands(sceneType) {
    const cmds = [];
    // 全局指令始终可用
    for (const entry of Object.values(this.global)) {
      cmds.push(entry);
    }
    // 根据场景类型添加层指令
    if (sceneType === 'safe') {
      for (const entry of Object.values(this.base)) {
        cmds.push(entry);
      }
    }
    if (sceneType === 'battle') {
      for (const entry of Object.values(this.battle)) {
        cmds.push(entry);
      }
    }
    return cmds;
  },

  // 判断指令在指定场景是否可用
  isCommandAvailable(cmdName, sceneType) {
    const def = this.find(cmdName);
    if (!def) return false;
    if (def.layer === 'global') return true;
    if (def.layer === 'battle' && sceneType === 'battle') return true;
    if (def.layer === 'base' && sceneType === 'safe') return true;
    return false;
  },

  // 获取当前场景类型
  getSceneType() {
    if (Battle.active) return 'battle';
    const room = MapSystem.getRoom(Player.room);
    if (room && room.isSafeZone) return 'safe';
    return 'battle';
  }
};