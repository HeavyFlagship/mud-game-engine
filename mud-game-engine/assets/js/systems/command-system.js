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
    sc:'score', st:'stats'
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
      // 移动
      case 'north': case 'south': case 'east': case 'west':
      case 'up': case 'down': case '上': case '下':
        Game.move(parsed.cmd); break;
      // 查看
      case 'look': case '查看':
        Game.look(); break;
      // 背包
      case 'bag': case '背包':
        this.runQuery(parsed, '背包', () => Game.showBag(parsed.args.includes('-d'))); break;
      // 状态
      case 'status': case '状态':
        this.runQuery(parsed, '角色状态', () => Game.showStatus()); break;
      // 装备
      case 'equip': case '装备':
        Game.equip(parsed.args.join(' ')); break;
      // 卸下
      case 'unequip': case '卸下':
        Game.unequip(parsed.args.join(' ')); break;
      // 使用
      case 'use': case '使用': case 'drink': case '喝':
        Game.useItem(parsed.args.join(' ')); break;
      // 技能
      case 'skills': case '技能':
        this.runQuery(parsed, '技能列表', () => Game.showSkills()); break;
      // 攻击
      case 'kill': case '攻击': case 'fight':
        Game.fight(parsed.args.join(' ')); break;
      // 拾取
      case 'pick': case 'get': case '拾取':
        Game.pickItem(parsed.args.join(' ')); break;
      // 丢弃
      case 'drop': case '丢弃':
        Game.dropItem(parsed.args.join(' ')); break;
      // 谈话
      case 'talk': case '对话':
        Game.talk(parsed.args.join(' ')); break;
      // 商店
      case 'shop': case '商店': case 'buy': case '购买':
        Game.shop(parsed.args[0] || 'list'); break;
      // 出售
      case 'sell': case '出售':
        Game.sell(parsed.args.join(' ')); break;
      // 统计
      case 'score': case 'stats': case '统计':
        this.runQuery(parsed, '冒险统计', () => Game.showStats()); break;
      // 帮助
      case 'help': case '帮助':
        this.runQuery(parsed, '指令帮助', () => Game.showHelp(parsed.args[0])); break;
      // 地图
      case 'map': case '地图':
        this.runQuery(parsed, '世界地图', () => Game.showMap()); break;
      // 存档
      case 'save': case '存档':
        Game.save(); break;
      // 读档
      case 'load': case '读档':
        Game.load(); break;
      // 清屏
      case 'clear': case '清屏':
        Msg.clear(); break;
      // 技能使用(非战斗中回复用)
      case 'cast': case '施法':
        Game.castOutside(parsed.args.join(' ')); break;
      default:
        Msg.warning(`未知指令: ${parsed.cmd}。输入 <span class="help-cmd">help</span> 查看帮助。`);
    }
    Game.updateUI();
  },

  handleBattleCmd(parsed) {
    switch (parsed.cmd) {
      case 'attack': case '攻击': case 'a':
        Battle.action('attack'); break;
      case 'fire': case '射击': case 'f':
        if (parsed.args[0]) {
          Battle.setPlayerTask({ type: 'attack', target: parsed.args[0].toUpperCase() });
        } else {
          Battle.action('attack');
        }
        break;
      case 'skill': case '技能': case 's':
        Battle.action('skill', parsed.args.join(' ')); break;
      case 'potion': case '药水': case 'p':
        Battle.action('potion', parsed.args.join(' ')); break;
      case 'flee': case '逃跑': case 'run':
        Battle.action('flee'); break;
      case 'look': case 'status': case 'bag': case 'skills': case 'help': case 'map': case 'stats': case 'score':
        // 允许查看
        if (parsed.cmd === 'look') Game.look();
        else if (parsed.cmd === 'status') this.runQuery(parsed, '角色状态', () => Game.showStatus());
        else if (parsed.cmd === 'bag') this.runQuery(parsed, '背包', () => Game.showBag(parsed.args.includes('-d')));
        else if (parsed.cmd === 'skills') this.runQuery(parsed, '技能列表', () => Game.showSkills());
        else if (parsed.cmd === 'help') this.runQuery(parsed, '指令帮助', () => Game.showHelp(parsed.args[0]));
        else if (parsed.cmd === 'map') this.runQuery(parsed, '世界地图', () => Game.showMap());
        else if (parsed.cmd === 'stats' || parsed.cmd === 'score') this.runQuery(parsed, '冒险统计', () => Game.showStats());
        break;
      default:
        Msg.warning('战斗中只能使用: 攻击/技能/药水/逃跑');
    }
  }
};
