// ========== 游戏主控 ==========
const Game = {
  commandHistory: [],
  historyIndex: -1,

  init() {
    Msg.init();
    MapSystem.init();
    Player.init();
    Player.visitedRooms.add(Player.room);
    if (typeof BattleUI !== 'undefined') BattleUI.init();

    // 输入事件
    const inputEl = document.getElementById('input');
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = inputEl.value.trim();
        if (val) {
          this.commandHistory.unshift(val);
          this.historyIndex = -1;
          CommandSystem.execute(val);
          inputEl.value = '';
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          inputEl.value = this.commandHistory[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          inputEl.value = this.commandHistory[this.historyIndex];
        } else {
          this.historyIndex = -1;
          inputEl.value = '';
        }
      }
    });

    // 开场剧情
    this.showIntro();
    this.look();
    this.updateUI();
  },

  showIntro() {
    Msg.divider();
    Msg.story('═══════════════════════════════════════');
    Msg.story('          《 幻 境 传 说 》');
    Msg.story('═══════════════════════════════════════');
    Msg.story('');
    Msg.story('在遥远的艾尔德大陆，黑暗的力量正在苏醒。');
    Msg.story('森林中的怪物日渐凶残，墓地里的不死生物蠢蠢欲动。');
    Msg.story('而那沉睡于山脉深处的远古巨龙，似乎也即将苏醒……');
    Msg.story('');
    Msg.story('你，一位初出茅庐的冒险者，踏上了拯救大陆的旅途。');
    Msg.story('村庄的村长似乎有重要的事情要告诉你。');
    Msg.story('');
    Msg.system('提示: 输入 help 查看所有可用指令');
    Msg.divider();
  },

  look() {
    const room = MapSystem.getRoom(Player.room);
    if (!room) return;
    Msg.divider();
    Msg.add(`<span class="room-name">【${room.name}】</span>`, 'info');
    Msg.info(room.desc);
    // 出口
    const exits = Object.keys(room.exits);
    if (exits.length > 0) {
      const exitStr = exits.map(e => `<span class="direction">${MapSystem.getDirectionName(e)}</span>`).join('、');
      Msg.info(`出入口: ${exitStr}`);
    }
    // NPC
    if (room.npcs && room.npcs.length > 0) {
      room.npcs.forEach(nid => {
        const npc = NPCDB[nid];
        if (npc) Msg.info(`👤 <span class="npc-name">${npc.name}</span> - ${npc.title} 在这里。`);
      });
    }
    // 地上的物品
    if (room.items && room.items.length > 0) {
      room.items.forEach((iid, idx) => {
        const item = ItemDB.get(iid);
        if (item) {
          const indexText = room.items.length > 1 ? `#${idx + 1} ` : '';
          Msg.info(`📦 地上有一件物品: ${indexText}<span class="item-tag ${item.type}">${item.name}</span>`);
        }
      });
      if (room.items.length > 1) Msg.system('提示: 可输入 pick 编号 或 pick 物品名 拾取指定物品；直接输入 pick 会拾取全部。');
    }
    // 敌人
    if (room.enemies && room.enemies.length > 0 && !Battle.active) {
      const possible = room.enemies.filter(([_, chance]) => Utils.chance(chance * 100));
      if (possible.length > 0) {
        const [eid] = Utils.pick(possible);
        Battle.start(eid);
      }
    }
    // 商店
    if (room.isShop) {
      Msg.info('🏪 这里是商店。输入 <span class="help-cmd">shop</span> 查看商品。');
    }
    // Boss
    if (room.isBossRoom) {
      Msg.warning('⚠ 这里弥漫着强大的气息……');
    }
  },

  move(direction) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.exits[direction]) {
      Msg.warning(`这个方向无法通行。`);
      return;
    }
    Player.room = room.exits[direction];
    Player.visitedRooms.add(Player.room);
    this.look();
    this.updateUI();
  },

  showBag(showDetail = false) {
    Msg.divider();
    Msg.add('🎒 背包', 'info');
    Msg.info('── 当前装备 ──');
    for (const [slot, item] of Object.entries(Player.equipment)) {
      const slotName = { weapon:'武器', armor:'护甲', accessory:'饰品' }[slot];
      if (item) {
        const stats = [];
        if (item.atk) stats.push(`攻+${item.atk}`);
        if (item.def) stats.push(`防+${item.def}`);
        if (item.hpBonus) stats.push(`生命+${item.hpBonus}`);
        if (item.mpBonus) stats.push(`法力+${item.mpBonus}`);
        const extra = stats.length ? ` [${stats.join(', ')}]` : '';
        Msg.info(`  ${slotName}: <span class="item-tag ${item.type}">${item.name}</span>${extra}`);
      } else {
        Msg.info(`  ${slotName}: <span style="color:var(--rule)">（空）</span>`);
      }
    }
    Msg.info('── 背包物品 ──');
    if (Player.inventory.length === 0) {
      Msg.system('背包是空的。');
      return;
    }
    Player.inventory.forEach(({ id, count }) => {
      const item = ItemDB.get(id);
      if (item) {
        const countStr = count > 1 ? ` x${count}` : '';
        const statsStr = [];
        if (item.atk) statsStr.push(`攻+${item.atk}`);
        if (item.def) statsStr.push(`防+${item.def}`);
        if (item.heal) statsStr.push(`回复HP${item.heal}`);
        if (item.mana) statsStr.push(`回复MP${item.mana}`);
        if (item.mpCost) statsStr.push(`消耗MP${item.mpCost}`);
        const extra = statsStr.length ? ` [${statsStr.join(', ')}]` : '';
        const desc = showDetail ? ` - ${item.desc}` : '';
        Msg.info(`  <span class="item-tag ${item.type}">${item.name}</span>${countStr}${extra}${desc}`);
      }
    });
    if (!showDetail) Msg.system('提示: 输入 bag -d 可查看物品描述详情。');
  },

  showStatus() {
    Msg.divider();
    Msg.add('📜 角色状态', 'info');
    Msg.info(`名称: ${Player.name}  等级: <span class="stat-value exp">Lv.${Player.level}</span>`);
    Msg.info(`生命: <span class="stat-value hp">${Player.hp}</span>/${Player.maxHp}  法力: <span class="stat-value mp">${Player.mp}</span>/${Player.maxMp}`);
    Msg.info(`攻击: ${Player.atk}  防御: ${Player.def}  暴击: ${Player.critRate}%`);
    Msg.info(`金币: <span class="stat-value gold">${Player.gold}</span>G`);
    Msg.info(`经验: ${Player.exp}/${Player.expToNext}`);
    // 装备
    Msg.info('── 装备 ──');
    for (const [slot, item] of Object.entries(Player.equipment)) {
      const slotName = { weapon:'武器', armor:'护甲', accessory:'饰品' }[slot];
      if (item) {
        const stats = [];
        if (item.atk) stats.push(`攻+${item.atk}`);
        if (item.def) stats.push(`防+${item.def}`);
        Msg.info(`  ${slotName}: <span class="item-tag ${item.type}">${item.name}</span> [${stats.join(',')}]`);
      } else {
        Msg.info(`  ${slotName}: <span style="color:var(--rule)">（空）</span>`);
      }
    }
    // Buff
    if (Player.buffs.length > 0) {
      const buffStr = Player.buffs.map(b => {
        const name = { berserk:'🔥狂暴', shield:'🛡护盾' }[b.type] || b.type;
        return `${name}(${b.duration}回合)`;
      }).join(' ');
      Msg.info(`增益: ${buffStr}`);
    }
  },

  showSkills() {
    Msg.divider();
    Msg.add('✨ 技能列表', 'info');
    Player.skills.forEach(sid => {
      const s = SkillDB[sid];
      if (s) {
        Msg.info(`  <span class="help-cmd">${s.name}</span> (消耗${s.mpCost}MP) - ${s.desc}`);
      }
    });
    if (Player.skills.length === 0) Msg.system('尚未习得任何技能。');
  },

  equip(itemName) {
    if (!itemName) { Msg.warning('请指定要装备的物品。'); return; }
    const item = this.findItemInBag(itemName);
    if (!item) { Msg.danger('背包中没有该物品。'); return; }
    const template = ItemDB.get(item.id);
    if (!template || (template.type !== 'weapon' && template.type !== 'armor')) {
      Msg.danger('该物品无法装备。'); return;
    }
    Player.equipItem(item.id);
  },

  unequip(slotName) {
    if (!slotName) {
      Msg.info('卸下装备用法: unequip 武器/护甲/饰品');
      return;
    }
    const slotMap = { '武器':'weapon', '护甲':'armor', '饰品':'accessory', 'weapon':'weapon', 'armor':'armor', 'accessory':'accessory' };
    const slot = slotMap[slotName];
    if (!slot) { Msg.danger('未知装备栏位。'); return; }
    Player.unequipItem(slot);
  },

  useItem(itemName) {
    if (!itemName) { Msg.warning('请指定要使用的物品。'); return; }
    const item = this.findItemInBag(itemName);
    if (!item) { Msg.danger('背包中没有该物品。'); return; }
    const template = ItemDB.get(item.id);
    if (!template) return;

    if (template.type === 'potion') {
      Player.removeItem(item.id);
      if (template.heal) {
        const amount = Player.heal(template.heal);
        Msg.success(`🧪 使用了 ${template.name}，恢复 <span class="heal">${amount}</span> 点生命！`);
      }
      if (template.mana) {
        const amount = Player.restoreMp(template.mana);
        Msg.success(`🧪 使用了 ${template.name}，恢复 <span class="magic">${amount}</span> 点法力！`);
      }
      if (template.curePoison) {
        Player.statusEffects = Player.statusEffects.filter(e => e.type !== 'poison');
        Msg.success(`🧪 使用了 ${template.name}，解除了中毒状态！`);
      }
    } else {
      Msg.warning('该物品无法直接使用。');
    }
  },

  fight(target) {
    if (Battle.active) {
      Msg.warning('你已经在战斗中了！');
      return;
    }
    // 检查当前房间是否有敌人
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.enemies || room.enemies.length === 0) {
      Msg.warning('这里没有可以攻击的目标。');
      return;
    }
    const possible = room.enemies.filter(([_, chance]) => Utils.chance(chance * 100));
    if (possible.length > 0) {
      const [eid] = Utils.pick(possible);
      Battle.start(eid);
    } else {
      Msg.info('周围一片安静，没有发现敌人。');
    }
  },

  pickItem(itemName) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.items || room.items.length === 0) {
      Msg.warning('这里没有可拾取的物品。');
      return;
    }
    if (itemName) {
      const num = parseInt(itemName, 10);
      let idx = -1;
      if (!isNaN(num) && num >= 1 && num <= room.items.length) {
        idx = num - 1;
      } else {
        idx = room.items.findIndex(id => {
          const item = ItemDB.get(id);
          return item && (item.name === itemName || id === itemName);
        });
      }
      if (idx === -1) { Msg.danger('没有找到该物品。'); return; }
      const itemId = room.items[idx];
      const item = ItemDB.get(itemId);
      Player.addItem(itemId);
      room.items.splice(idx, 1);
      MapSystem.recordChange(room.id, 'remove', itemId);
      Msg.success(`📦 拾取了 <span class="item-tag ${item.type}">${item.name}</span>`);
    } else {
      // 拾取所有
      const items = [...room.items];
      room.items = [];
      items.forEach(id => {
        const item = ItemDB.get(id);
        if (item) {
          Player.addItem(id);
          MapSystem.recordChange(room.id, 'remove', id);
          Msg.success(`📦 拾取了 <span class="item-tag ${item.type}">${item.name}</span>`);
        }
      });
    }
  },

  dropItem(itemName) {
    if (!itemName) { Msg.warning('请指定要丢弃的物品。'); return; }
    const item = this.findItemInBag(itemName);
    if (!item) { Msg.danger('背包中没有该物品。'); return; }
    const template = ItemDB.get(item.id);
    Player.removeItem(item.id);
    const room = MapSystem.getRoom(Player.room);
    if (room) {
      if (!room.items) room.items = [];
      room.items.push(item.id);
      MapSystem.recordChange(room.id, 'add', item.id);
    }
    Msg.info(`丢弃了 <span class="item-tag ${template.type}">${template.name}</span>`);
  },

  talk(npcName) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.npcs || room.npcs.length === 0) {
      Msg.warning('这里没有可以对话的人。');
      return;
    }
    const npcId = npcName ? room.npcs.find(nid => {
      const npc = NPCDB[nid];
      return npc && (npc.name.includes(npcName) || nid === npcName);
    }) : room.npcs[0];

    if (!npcId) { Msg.danger('没有找到这个人。'); return; }
    const npc = NPCDB[npcId];
    Msg.divider();
    Msg.info(`<span class="npc-name">${npc.name}</span> 说道：`);
    if (npcName === '任务' || npcName === 'quest') {
      if (npc.dialog.quest) {
        npc.dialog.quest.split('\n').forEach(line => Msg.story(`  "${line}"`));
      } else {
        Msg.story(`  "${Utils.pick(npc.dialog.default)}"`);
      }
    } else {
      const line = Utils.pick(npc.dialog.default);
      Msg.story(`  "${line}"`);
      // 如果是商店NPC，提示
      if (npc.dialog.shop === 'shop') {
        Msg.info(`  (输入 <span class="help-cmd">shop</span> 查看商品)`);
      }
    }
  },

  shop(action) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.isShop) {
      // 检查当前房间是否有商店NPC
      const hasShopNpc = room && room.npcs && room.npcs.some(nid => NPCDB[nid] && NPCDB[nid].dialog.shop === 'shop');
      if (!hasShopNpc) {
        Msg.warning('这里没有商店。');
        return;
      }
    }
    // 找到商店NPC
    let shopNpc = null;
    if (room.npcs) {
      for (const nid of room.npcs) {
        const npc = NPCDB[nid];
        if (npc && npc.shopItems) { shopNpc = npc; break; }
      }
    }
    if (!shopNpc) {
      // 如果房间有isShop标记但没有NPC，使用默认列表
      shopNpc = { shopItems: ['hp_small','hp_medium','mp_small','mp_medium'] };
    }

    if (action === 'list' || !action) {
      Msg.divider();
      Msg.add(`🏪 ${shopNpc.name || '商店'} 的商品`, 'info');
      shopNpc.shopItems.forEach((itemId, idx) => {
        const item = ItemDB.get(itemId);
        if (item) {
          const stats = [];
          if (item.atk) stats.push(`攻+${item.atk}`);
          if (item.def) stats.push(`防+${item.def}`);
          if (item.heal) stats.push(`回复HP${item.heal}`);
          if (item.mana) stats.push(`回复MP${item.mana}`);
          const extra = stats.length ? ` [${stats.join(',')}]` : '';
          Msg.info(`  ${idx+1}. <span class="item-tag ${item.type}">${item.name}</span>${extra} - ${item.price}G`);
        }
      });
      Msg.info('购买: shop/buy 物品名 或 buy 序号');
      Msg.info('出售: sell 物品名 (半价回收)');
    } else {
      // 尝试购买
      let targetItem = null;
      // 按序号
      const num = parseInt(action);
      if (!isNaN(num) && num >= 1 && num <= shopNpc.shopItems.length) {
        targetItem = ItemDB.get(shopNpc.shopItems[num - 1]);
      } else {
        // 按名称
        targetItem = ItemDB.get(shopNpc.shopItems.find(id => {
          const item = ItemDB.get(id);
          return item && (item.name === action || id === action);
        }));
      }
      if (!targetItem) { Msg.danger('商品不存在。'); return; }
      if (Player.gold < targetItem.price) { Msg.danger('金币不足！'); return; }
      Player.gold -= targetItem.price;
      Player.addItem(targetItem.id);
      Msg.success(`💰 购买了 <span class="item-tag ${targetItem.type}">${targetItem.name}</span>，花费 ${targetItem.price}G`);
    }
  },

  sell(itemName) {
    if (!itemName) { Msg.warning('请指定要出售的物品。'); return; }
    const item = this.findItemInBag(itemName);
    if (!item) { Msg.danger('背包中没有该物品。'); return; }
    const template = ItemDB.get(item.id);
    if (!template || !template.price) { Msg.danger('该物品无法出售。'); return; }
    const sellPrice = Math.max(1, Math.floor(template.price * 0.5));
    Player.removeItem(item.id);
    Player.gold += sellPrice;
    Msg.success(`💰 出售了 <span class="item-tag ${template.type}">${template.name}</span>，获得 ${sellPrice}G`);
  },

  castOutside(skillName) {
    if (!skillName) { this.showSkills(); return; }
    // 非战斗只能用heal
    let skill = null;
    for (const [id, s] of Object.entries(SkillDB)) {
      if (s.name === skillName || id === skillName) { skill = s; break; }
    }
    if (!skill || !Player.skills.includes(skill.id)) { Msg.danger('未知技能或尚未习得。'); return; }
    if (skill.type !== 'heal' && skill.type !== 'buff') {
      Msg.warning('非战斗状态下只能使用治疗和增益技能。'); return;
    }
    if (Player.mp < skill.mpCost) { Msg.danger('法力不足！'); return; }
    Player.mp -= skill.mpCost;
    if (skill.type === 'heal') {
      if (Player.hp >= Player.maxHp) { Msg.info('你的生命值已满，无需治疗。'); Player.mp += skill.mpCost; return; }
      const amount = Player.heal(Math.floor((Player.maxHp * 0.1) + Player.level * skill.mult * 5));
      Msg.magic(`💚 施放了 ${skill.name}，恢复了 <span class="heal">${amount}</span> 点生命值！`);
    } else if (skill.type === 'buff') {
      Player.buffs.push({ type: skill.effect, duration: skill.duration });
      Msg.magic(`✨ 施放了 ${skill.name}！`);
    }
  },

  showStats() {
    Msg.divider();
    Msg.add('📊 冒险统计', 'info');
    Msg.info(`总输出伤害: ${Utils.fmtNum(Player.stats.totalDmg)}`);
    Msg.info(`总治疗量: ${Utils.fmtNum(Player.stats.totalHeal)}`);
    Msg.info(`击杀怪物: ${Player.stats.monstersKilled}`);
    Msg.info(`死亡次数: ${Player.stats.deaths}`);
    Msg.info(`探索房间: ${Player.visitedRooms.size} / ${Object.keys(MapSystem.rooms).length}`);
    // 击杀明细
    if (Object.keys(Player.killCount).length > 0) {
      Msg.info('── 击杀明细 ──');
      for (const [id, count] of Object.entries(Player.killCount)) {
        const enemy = EnemyDB[id];
        if (enemy) Msg.info(`  ${enemy.name}: ${count}`);
      }
    }
  },

  showMap() {
    Msg.divider();
    Msg.add('🗺 世界地图', 'info');
    MapSystem.areas.forEach(area => {
      const visited = area.rooms.filter(r => Player.visitedRooms.has(r));
      const total = area.rooms.length;
      const status = visited.length === total ? '✅' : visited.length > 0 ? '🔧' : '❓';
      Msg.info(`  ${status} ${area.name} (${visited.length}/${total})`);
    });
    Msg.system('提示: 绿色=全部探索 黄色=部分 红色=未探索');
  },

  showHelp(topic) {
    Msg.divider();
    Msg.add('📖 指令帮助', 'info');
    const helps = {
      movement: {
        title: '🗺 移动指令',
        items: [
          ['north/south/east/west (或 n/s/e/w)', '向对应方向移动'],
          ['up/down (或 上/下)', '通过楼梯、洞口等上下通道移动'],
        ]
      },
      basic: {
        title: '📋 基础指令',
        items: [
          ['look (l)', '查看当前房间'],
          ['bag (inv/i)', '查看背包'],
          ['status (sta)', '查看角色详细状态'],
          ['skills (sk)', '查看已习得技能'],
          ['map', '查看世界地图'],
          ['score/stats', '查看冒险统计'],
          ['clear', '清空屏幕'],
        ]
      },
      combat: {
        title: '⚔ 战斗指令',
        items: [
          ['kill/fight (k)', '攻击/寻找敌人'],
          ['attack (a)', '战斗中普通攻击'],
          ['skill (s) [技能名]', '战斗中使用技能'],
          ['potion (p)', '战斗中使用药水'],
          ['flee/run', '尝试逃跑'],
          ['cast [技能名]', '非战斗施法(治疗/增益)'],
        ]
      },
      items: {
        title: '🎒 物品指令',
        items: [
          ['pick/get [物品名]', '拾取地面物品(不填=全部)'],
          ['drop [物品名]', '丢弃物品'],
          ['use/drink [物品名]', '使用物品(药水等)'],
          ['equip [物品名]', '装备武器/护甲'],
          ['unequip [武器/护甲/饰品]', '卸下装备'],
        ]
      },
      npc: {
        title: '💬 NPC互动',
        items: [
          ['talk [NPC名]', '与NPC对话'],
          ['talk 任务', '向NPC询问任务'],
          ['shop/buy', '查看/购买商品'],
          ['sell [物品名]', '出售物品(半价)'],
        ]
      },
      system: {
        title: '💾 系统',
        items: [
          ['save', '保存游戏进度'],
          ['load', '读取游戏存档'],
          ['help [分类]', '查看帮助(移动/基础/战斗/物品/NPC)'],
        ]
      }
    };

    if (topic && helps[topic]) {
      const h = helps[topic];
      Msg.add(h.title, 'info');
      h.items.forEach(([cmd, desc]) => {
        Msg.info(`  <span class="help-cmd">${cmd}</span> - <span class="help-desc">${desc}</span>`);
      });
    } else {
      Object.values(helps).forEach(h => {
        Msg.add(h.title, 'info');
        h.items.forEach(([cmd, desc]) => {
          Msg.info(`  <span class="help-cmd">${cmd}</span> - <span class="help-desc">${desc}</span>`);
        });
        Msg.info('');
      });
      Msg.system('提示: 支持方向简写(n/s/e/w)、上下移动(up/down/上/下)、指令简写(l/bag/sta等)');
      Msg.system('战斗中可使用快捷按钮或输入指令');
    }
  },

  save() {
    const data = {
      name: Player.name,
      level: Player.level,
      exp: Player.exp,
      expToNext: Player.expToNext,
      hp: Player.hp, maxHp: Player.maxHp,
      mp: Player.mp, maxMp: Player.maxMp,
      baseAtk: Player.baseAtk, baseDef: Player.baseDef,
      gold: Player.gold,
      room: Player.room,
      inventory: Player.inventory,
      equipment: Player.equipment,
      skills: Player.skills,
      visitedRooms: [...Player.visitedRooms],
      killCount: Player.killCount,
      stats: Player.stats,
      mapChanges: MapSystem.changes,
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('mud_save', JSON.stringify(data));
      Msg.success('💾 游戏已保存！');
    } catch (e) {
      Msg.danger('保存失败！');
    }
  },

  load() {
    try {
      const raw = localStorage.getItem('mud_save');
      if (!raw) { Msg.warning('没有找到存档。'); return; }
      const data = JSON.parse(raw);
      // 重新初始化地图系统，再应用增量变更
      MapSystem.init();
      if (data.mapChanges) {
        MapSystem.applyChanges(data.mapChanges);
      }
      Object.assign(Player, {
        name: data.name, level: data.level, exp: data.exp,
        expToNext: data.expToNext,
        hp: data.hp, maxHp: data.maxHp, mp: data.mp, maxMp: data.maxMp,
        baseAtk: data.baseAtk, baseDef: data.baseDef, gold: data.gold,
        room: data.room, inventory: data.inventory, equipment: data.equipment,
        skills: data.skills,
        visitedRooms: new Set(data.visitedRooms),
        killCount: data.killCount || {}, stats: data.stats || { totalDmg:0, totalHeal:0, monstersKilled:0, deaths:0 }
      });
      Battle.end();
      Msg.clear();
      Msg.success('📂 存档已读取！');
      if (data.savedAt) {
        Msg.system(`存档时间: ${new Date(data.savedAt).toLocaleString('zh-CN')}`);
      }
      this.look();
      this.updateUI();
    } catch (e) {
      Msg.danger('读档失败！');
    }
  },

  // 辅助: 在背包中查找物品
  findItemInBag(name) {
    return Player.inventory.find(i => {
      const item = ItemDB.get(i.id);
      return item && (item.name === name || i.id === name);
    });
  },

  // 更新侧边栏UI
  updateUI() {
    this.updatePlayerInfo();
    this.updateEquipInfo();
    this.updateMinimap();
    this.updateLocation();
  },

  updatePlayerInfo() {
    const el = document.getElementById('player-info');
    const hpPct = (Player.hp / Player.maxHp * 100).toFixed(1);
    const mpPct = (Player.mp / Player.maxMp * 100).toFixed(1);
    const expPct = (Player.exp / Player.expToNext * 100).toFixed(1);
    el.innerHTML = `
      <div class="stat-row"><span class="stat-label">等级</span><span class="stat-value exp">Lv.${Player.level}</span></div>
      <div class="stat-row"><span class="stat-label">HP</span><span class="stat-value hp">${Player.hp}/${Player.maxHp}</span></div>
      <div class="bar-container"><div class="bar-fill hp" style="width:${hpPct}%"></div></div>
      <div class="stat-row"><span class="stat-label">MP</span><span class="stat-value mp">${Player.mp}/${Player.maxMp}</span></div>
      <div class="bar-container"><div class="bar-fill mp" style="width:${mpPct}%"></div></div>
      <div class="stat-row"><span class="stat-label">EXP</span><span class="stat-value exp">${Player.exp}/${Player.expToNext}</span></div>
      <div class="bar-container"><div class="bar-fill exp" style="width:${expPct}%"></div></div>
      <div class="stat-row"><span class="stat-label">攻击</span><span class="stat-value">${Player.atk}</span></div>
      <div class="stat-row"><span class="stat-label">防御</span><span class="stat-value">${Player.def}</span></div>
      <div class="stat-row"><span class="stat-label">暴击</span><span class="stat-value">${Player.critRate}%</span></div>
      <div class="stat-row"><span class="stat-label">金币</span><span class="stat-value gold">${Player.gold}G</span></div>
    `;
  },

  updateEquipInfo() {
    const el = document.getElementById('equip-info');
    const slots = [
      { key:'weapon', label:'武器' },
      { key:'armor', label:'护甲' },
      { key:'accessory', label:'饰品' }
    ];
    el.innerHTML = slots.map(s => {
      const item = Player.equipment[s.key];
      const itemStr = item
        ? `<span class="equip-slot-item">${item.name}</span>`
        : '<span class="equip-slot-item empty">（空）</span>';
      return `<div class="equip-slot"><span class="equip-slot-name">${s.label}</span>${itemStr}</div>`;
    }).join('');
  },

  updateMinimap() {
    const el = document.getElementById('minimap');
    const levelEl = document.getElementById('map-level-info');
    const currentRoom = MapSystem.getRoom(Player.room);
    if (!currentRoom) return;
    const currentZ = currentRoom.z || 0;
    if (levelEl) levelEl.textContent = `当前高度：${MapSystem.getLevelName(currentZ)}`;

    // 只统计当前高度层的房间，避免地表和地下房间在小地图上重叠。
    const roomsOnLevel = Object.values(MapSystem.rooms).filter(room => (room.z || 0) === currentZ);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const room of roomsOnLevel) {
      if (room.x !== undefined) {
        minX = Math.min(minX, room.x); maxX = Math.max(maxX, room.x);
        minY = Math.min(minY, room.y); maxY = Math.max(maxY, room.y);
      }
    }

    // 生成5x5网格
    const size = 5;
    const cx = Math.floor((minX + maxX) / 2);
    const cy = Math.floor((minY + maxY) / 2);
    // 调整为能显示所有房间
    const rangeX = maxX - minX + 1;
    const rangeY = maxY - minY + 1;
    const gridSize = Math.max(rangeX, rangeY, 5);

    let html = '';
    // 使用固定坐标映射
    // 找到当前房间周围的可视范围
    const offsetX = currentRoom.x - 2;
    const offsetY = currentRoom.y - 2;
    const dirInfo = {
      north: { dx:0, dy:-1, border:'border-top-color' },
      south: { dx:0, dy:1, border:'border-bottom-color' },
      east: { dx:1, dy:0, border:'border-right-color' },
      west: { dx:-1, dy:0, border:'border-left-color' }
    };
    const roomAt = (x, y, z = currentZ) => roomsOnLevel.find(r => r.x === x && r.y === y && (r.z || 0) === z);
    const getCellStyle = (room) => {
      const borderStyles = [];
      for (const [dir, info] of Object.entries(dirInfo)) {
        const neighbor = roomAt(room.x + info.dx, room.y + info.dy, currentZ);
        const canPass = Boolean(neighbor && room.exits[dir] === neighbor.id);
        borderStyles.push(`${info.border}:${canPass ? 'var(--rule)' : 'var(--wall)'}`);
      }
      return borderStyles.join(';');
    };

    for (let dy = 0; dy < 5; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        const rx = offsetX + dx;
        const ry = offsetY + dy;
        const room = roomAt(rx, ry);
        if (room) {
          const style = getCellStyle(room);
          const label = MapSystem.getRoomLabel(room);
          const verticalClass = (room.exits.up || room.exits.down) ? ' vertical' : '';
          if (room.id === Player.room) {
            html += `<div class="map-cell current${verticalClass}" style="${style}" title="${room.name}｜${MapSystem.getLevelName(room.z || 0)}">@</div>`;
          } else if (Player.visitedRooms.has(room.id)) {
            html += `<div class="map-cell visited${verticalClass}" style="${style}" title="${room.name}｜${MapSystem.getLevelName(room.z || 0)}">${label}</div>`;
          } else {
            html += `<div class="map-cell room${verticalClass}" style="${style}" title="${room.name}｜${MapSystem.getLevelName(room.z || 0)}"></div>`;
          }
        } else {
          html += `<div class="map-cell"></div>`;
        }
      }
    }
    el.innerHTML = html;
  },

  updateLocation() {
    const room = MapSystem.getRoom(Player.room);
    const el = document.getElementById('location-info');
    if (room) {
      const exits = Object.keys(room.exits).map(d => MapSystem.getDirectionName(d)).join('、');
      el.innerHTML = `<div style="color:var(--accent);font-weight:600;margin-bottom:0.3rem">${room.name}</div><div>高度: ${MapSystem.getLevelName(room.z || 0)}</div><div>出口: ${exits}</div>`;
    }
  }
};
