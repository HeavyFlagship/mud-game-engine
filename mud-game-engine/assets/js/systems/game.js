// ========== 游戏主控 ==========
const Game = {
  commandHistory: [],
  historyIndex: -1,
 
  init() {
    Msg.init();
    MapSystem.init();
    Player.init();
    Player.visitedRooms.add(Player.room);
    BattleUI.init();
 
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
 
    this.showIntro();
    this.look();
    this.updateUI();
  },
 
  showIntro() {
    Msg.divider();
    Msg.story('═══════════════════════════════════════');
    Msg.story('        《 织 女 -7 前 哨 》');
    Msg.story('═══════════════════════════════════════');
    Msg.story('');
    Msg.story('织女座-7号行星，辉锗矿储量排名星系前三。');
    Msg.story('人类联邦在此建立了前哨基地，开采这一战略资源。');
    Msg.story('然而，地底的原生物种——虫族，对入侵者展开了猛烈反击。');
    Msg.story('');
    Msg.story('你，一名先遣队员，驾驶最新型侦察机体抵达此地。');
    Msg.story('你的任务是清除虫群威胁，保护基地的安全。');
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
 
    const exits = Object.keys(room.exits || {});
    if (exits.length > 0) {
      const exitStr = exits.map(e => `<span class="direction">${MapSystem.getDirectionName(e)}</span>`).join('、');
      Msg.info(`出入口: ${exitStr}`);
    }
 
    if (room.npcs && room.npcs.length > 0) {
      room.npcs.forEach(nid => {
        const npc = NPCDB[nid];
        if (npc) Msg.info(`👤 <span class="npc-name">${npc.name}</span> - ${npc.title} 在这里。`);
      });
    }
 
    if (room.items && room.items.length > 0) {
      room.items.forEach((iid, idx) => {
        const item = ItemDB[iid];
        if (item) {
          const indexText = room.items.length > 1 ? `#${idx + 1} ` : '';
          Msg.info(`📦 地上有一件物品: ${indexText}<span class="item-tag ${item.type}">${item.name}</span>`);
        }
      });
      if (room.items.length > 1) Msg.system('提示: 可输入 pick 编号 或 pick 物品名 拾取指定物品；直接输入 pick 会拾取全部。');
    }
 
    if (room.battlefield && room.battlefield.enemies && room.battlefield.enemies.length > 0) {
      const bf = MapSystem.initBattlefield(room.id);
      const alive = bf.enemies.filter(e => e.hp > 0).length;
      if (alive > 0) {
        Msg.warn(`⚠ 探测到 ${alive} 个敌对单位信号。`);
      } else {
        Msg.info('区域内已无敌对信号。');
      }
    }
 
    if (room.isShop) {
      Msg.info('🏪 这里是装备库。输入 <span class="help-cmd">shop</span> 查看商品。');
    }
  },
 
  move(direction) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.exits || !room.exits[direction]) {
      Msg.warning('这个方向无法通行。');
      return;
    }
    if (Battle.active) {
      Battle.end();
      BattleUI.remove();
    }
    const nextRoomId = room.exits[direction];
    Player.room = nextRoomId;
    Player.visitedRooms.add(Player.room);
    Player.position = [500, 500];

    const nextRoom = MapSystem.getRoom(nextRoomId);
    if (nextRoom && nextRoom.battlefield) {
      this.look();
      this.updateUI();
      Battle.start(nextRoomId, MapSystem.getOppositeDirection(direction));
      return;
    }

    this.look();
    this.updateUI();
  },
 
  showBag(showDetail = false) {
    Msg.divider();
    Msg.add('🎒 背包', 'info');
    Msg.info('── 当前装备 ──');
    const slots = [
      { key: 'primary', name: '主武器' },
      { key: 'secondary', name: '副武器' },
      { key: 'armor', name: '装甲' }
    ];
    for (const slot of slots) {
      const item = Player.equipment[slot.key];
      if (item) {
        const stats = [];
        if (item.damage) stats.push(`伤害${item.damage}`);
        if (item.armorValue) stats.push(`装甲${item.armorValue}`);
        if (item.range) stats.push(`射程${item.range}m`);
        const extra = stats.length ? ` [${stats.join(', ')}]` : '';
        Msg.info(`  ${slot.name}: <span class="item-tag weapon">${item.name}</span>${extra}`);
      } else {
        Msg.info(`  ${slot.name}: <span style="color:var(--rule)">（空）</span>`);
      }
    }
    Msg.info('── 背包物品 ──');
    if (Player.inventory.length === 0) {
      Msg.system('背包是空的。');
      return;
    }
    Player.inventory.forEach(({ id, count }) => {
      const item = ItemDB[id];
      if (item) {
        const countStr = count > 1 ? ` x${count}` : '';
        const statsStr = [];
        if (item.damage) statsStr.push(`伤害${item.damage}`);
        if (item.armorValue) statsStr.push(`装甲${item.armorValue}`);
        if (item.healHp) statsStr.push(`修复结构${item.healHp}`);
        if (item.healArmor) statsStr.push(`修复装甲${item.healArmor}`);
        const extra = statsStr.length ? ` [${statsStr.join(', ')}]` : '';
        const desc = showDetail ? ` - ${item.desc}` : '';
        Msg.info(`  <span class="item-tag ${item.type}">${item.name}</span>${countStr}${extra}${desc}`);
      }
    });
    if (!showDetail) Msg.system('提示: 输入 bag -d 可查看物品描述详情。');
  },
 
  showStatus() {
    Msg.divider();
    Msg.add('📜 机体状态', 'info');
    Msg.info(`驾驶员: ${Player.name}  等级: <span class="stat-value exp">Lv.${Player.level}</span>`);
    Msg.info(`机体: ${VehicleDB[Player.vehicleId]?.name || Player.vehicleId}`);
    Msg.info(`结构值: <span class="stat-value hp">${Player.hp}</span>/${Player.maxHp}  装甲: <span class="stat-value">${Player.armor}</span>/${Player.maxArmor}`);
    Msg.info(`能量: <span class="stat-value mp">${Math.floor(Player.energy)}</span>/${Player.maxEnergy} (恢复+${Player.energyRegen}/s)`);
    Msg.info(`速度: ${Player.currentSpeed.toFixed(1)}m/s  视野: ${Player.visionRadius}m`);
    Msg.info(`动力: ${Player.power}kW  算力: ${Player.compute}TFLOPS  重量: ${Player.weight}kg`);
    Msg.info(`经验: ${Player.exp}/${Player.expToNext}`);
    Msg.info('── 武器 ──');
    for (const slot of ['primary', 'secondary']) {
      const w = Player.equipment[slot];
      const slotName = slot === 'primary' ? '主武器' : '副武器';
      if (w) {
        Msg.info(`  ${slotName}: ${w.name} [伤害${w.damage} 射程${w.range}m 冷却${w.cooldown}秒]`);
      } else {
        Msg.info(`  ${slotName}: （空）`);
      }
    }
    if (Player.statusEffects.length > 0) {
      const effStr = Player.statusEffects.map(e => {
        const names = { slow:'减速', poison:'中毒', burn:'灼烧', shock:'电击', corrosion:'腐蚀', stun:'眩晕' };
        return `${names[e.type] || e.type}(${e.duration.toFixed(0)}秒)`;
      }).join(' ');
      Msg.info(`状态效果: ${effStr}`);
    }
  },
 
  showSkills() {
    Msg.divider();
    Msg.add('✨ 技能列表', 'info');
    if (Player.skills.length === 0) {
      Msg.system('尚未习得任何技能。');
    } else {
      Player.skills.forEach(sid => {
        const s = SkillDB[sid];
        if (s) {
          Msg.info(`  <span class="help-cmd">${s.name}</span> - ${s.desc}`);
        }
      });
    }
  },
 
  equip(itemName) {
    if (!itemName) { Msg.warning('请指定要装备的物品。'); return; }
    const item = this.findItemInBag(itemName);
    if (!item) { Msg.danger('背包中没有该物品。'); return; }
    const template = ItemDB[item.id];
    if (!template) return;
 
    if (template.type === 'weapon') {
      Player.equipWeapon(item.id, 'primary');
    } else if (template.type === 'armor') {
      Player.equipArmor(item.id);
    } else {
      Msg.danger('该物品无法装备。');
    }
  },
 
  unequip(slotName) {
    if (!slotName) {
      Msg.info('卸下装备用法: unequip 主武器/副武器/装甲');
      return;
    }
    const slotMap = {
      '主武器':'primary', '副武器':'secondary', '装甲':'armor',
      'primary':'primary', 'secondary':'secondary', 'armor':'armor'
    };
    const slot = slotMap[slotName];
    if (!slot) { Msg.danger('未知装备栏位。'); return; }
    const item = Player.equipment[slot];
    if (!item) { Msg.info('该栏位为空。'); return; }
    Player.addItem(item.id);
    Player.equipment[slot] = null;
    Msg.success(`已卸下 ${item.name}。`);
  },
 
  useItem(itemName) {
    if (!itemName) { Msg.warning('请指定要使用的物品。'); return; }
    const item = this.findItemInBag(itemName);
    if (!item) { Msg.danger('背包中没有该物品。'); return; }
    const template = ItemDB[item.id];
    if (!template) return;
 
    if (template.type === 'consumable') {
      Player.removeItem(item.id);
      if (template.healHp) {
        const amount = Player.heal(template.healHp);
        Msg.success(`🔧 使用了 ${template.name}，修复 <span class="heal">${amount}</span> 点结构值！`);
      }
      if (template.healArmor) {
        const amount = Player.repairArmor(template.healArmor);
        Msg.success(`🛡 使用了 ${template.name}，修复 <span class="stat-value">${amount}</span> 点装甲！`);
      }
      if (template.energy) {
        const amount = Player.restoreEnergy(template.energy);
        Msg.success(`⚡ 使用了 ${template.name}，恢复 <span class="stat-value mp">${amount}</span> 点能量！`);
      }
    } else {
      Msg.warning('该物品无法直接使用。');
    }
  },
 
  callNPC(npcName) {
    if (Battle.active && Battle.battlefield) {
      return;
    }
    this.talk(npcName);
  },

  handleCall(npcId) {
    const npc = NPCDB[npcId];
    if (!npc) {
      Msg.error('未知的通信目标。');
      return;
    }
    Msg.divider();
    Msg.info(`📡 与 <span class="npc-name">${npc.name}</span> 建立通信连接...`);
    setTimeout(() => {
      Msg.info(`<span class="npc-name">${npc.name}</span> 说道：`);
      const line = Utils.pick(npc.dialog.default);
      Msg.story(`  "${line}"`);
      if (npc.dialog.shop === 'shop') {
        Msg.info(`  (输入 <span class="help-cmd">shop</span> 查看装备)`);
      }
    }, 300);
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
          const item = ItemDB[id];
          return item && (item.name === itemName || id === itemName);
        });
      }
      if (idx === -1) { Msg.danger('没有找到该物品。'); return; }
      const itemId = room.items[idx];
      const item = ItemDB[itemId];
      Player.addItem(itemId);
      room.items.splice(idx, 1);
      MapSystem.recordChange(room.id, 'remove', itemId);
      Msg.success(`📦 拾取了 <span class="item-tag ${item.type}">${item.name}</span>`);
    } else {
      const items = [...room.items];
      room.items = [];
      items.forEach(id => {
        const item = ItemDB[id];
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
    const template = ItemDB[item.id];
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
      if (npc.dialog.shop === 'shop') {
        Msg.info(`  (输入 <span class="help-cmd">shop</span> 查看装备)`);
      }
    }
  },
 
  shop(action) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.isShop) {
      const hasShopNpc = room && room.npcs && room.npcs.some(nid => NPCDB[nid] && NPCDB[nid].dialog.shop === 'shop');
      if (!hasShopNpc) {
        Msg.warning('这里没有商店。');
        return;
      }
    }
    let shopNpc = null;
    if (room.npcs) {
      for (const nid of room.npcs) {
        const npc = NPCDB[nid];
        if (npc && npc.shopItems) { shopNpc = npc; break; }
      }
    }
    if (!shopNpc) {
      shopNpc = { shopItems: ['repair_kit_small','armor_patch','auto_cannon_mk1','light_alloy_plate'] };
    }
 
    if (action === 'list' || !action) {
      Msg.divider();
      Msg.add(`🏪 ${shopNpc.name || '装备库'} 的商品`, 'info');
      shopNpc.shopItems.forEach((itemId, idx) => {
        const item = ItemDB[itemId];
        if (item) {
          const stats = [];
          if (item.damage) stats.push(`伤害${item.damage}`);
          if (item.armorValue) stats.push(`装甲${item.armorValue}`);
          if (item.healHp) stats.push(`修复结构${item.healHp}`);
          if (item.healArmor) stats.push(`修复装甲${item.healArmor}`);
          if (item.range) stats.push(`射程${item.range}m`);
          const extra = stats.length ? ` [${stats.join(',')}]` : '';
          Msg.info(`  ${idx+1}. <span class="item-tag ${item.type}">${item.name}</span>${extra} - ${item.price}G`);
        }
      });
      Msg.info('购买: shop/buy 物品名 或 buy 序号');
      Msg.info('出售: sell 物品名 (半价回收)');
    } else {
      let targetItem = null;
      const num = parseInt(action);
      if (!isNaN(num) && num >= 1 && num <= shopNpc.shopItems.length) {
        targetItem = ItemDB[shopNpc.shopItems[num - 1]];
      } else {
        targetItem = ItemDB[shopNpc.shopItems.find(id => {
          const item = ItemDB[id];
          return item && (item.name === action || id === action);
        })];
      }
      if (!targetItem) { Msg.danger('商品不存在。'); return; }
      if (Player.gold < targetItem.price) { Msg.danger('资金不足！'); return; }
      Player.gold -= targetItem.price;
      Player.addItem(targetItem.id);
      Msg.success(`💰 购买了 <span class="item-tag ${targetItem.type}">${targetItem.name}</span>，花费 ${targetItem.price}G`);
    }
  },
 
  sell(itemName) {
    if (!itemName) { Msg.warning('请指定要出售的物品。'); return; }
    const item = this.findItemInBag(itemName);
    if (!item) { Msg.danger('背包中没有该物品。'); return; }
    const template = ItemDB[item.id];
    if (!template || !template.price) { Msg.danger('该物品无法出售。'); return; }
    const sellPrice = Math.max(1, Math.floor(template.price * 0.5));
    Player.removeItem(item.id);
    Player.gold += sellPrice;
    Msg.success(`💰 出售了 <span class="item-tag ${template.type}">${template.name}</span>，获得 ${sellPrice}G`);
  },
 
  castOutside(skillName) {
    if (!skillName) { this.showSkills(); return; }
    let skill = null;
    for (const [id, s] of Object.entries(SkillDB)) {
      if (s.name === skillName || id === skillName) { skill = s; break; }
    }
    if (!skill || !Player.skills.includes(skill.id)) { Msg.danger('未知技能或尚未习得。'); return; }
    Msg.info('技能系统待完善。');
  },
 
  showStats() {
    Msg.divider();
    Msg.add('📊 任务统计', 'info');
    Msg.info(`总输出伤害: ${Utils.fmtNum(Player.stats.totalDmg)}`);
    Msg.info(`总修复量: ${Utils.fmtNum(Player.stats.totalHeal)}`);
    Msg.info(`击毁敌人: ${Player.stats.monstersKilled}`);
    Msg.info(`机体损毁: ${Player.stats.deaths}`);
    Msg.info(`探索区域: ${Player.visitedRooms.size} / ${Object.keys(MapSystem.rooms).length}`);
    if (Object.keys(Player.killCount).length > 0) {
      Msg.info('── 击毁明细 ──');
      for (const [id, count] of Object.entries(Player.killCount)) {
        const enemy = EnemyDB[id];
        if (enemy) Msg.info(`  ${enemy.name}: ${count}`);
      }
    }
  },
 
  showMap() {
    Msg.divider();
    Msg.add('🗺 区域地图', 'info');
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
          ['up/down (或 上/下)', '通过通道上下移动'],
        ]
      },
      basic: {
        title: '📋 基础指令',
        items: [
          ['look (l)', '查看当前区域'],
          ['bag (inv/i)', '查看背包'],
          ['status (sta)', '查看机体状态'],
          ['skills (sk)', '查看已习得技能'],
          ['map', '查看区域地图'],
          ['score/stats', '查看任务统计'],
          ['clear', '清空屏幕'],
        ]
      },
      combat: {
        title: '⚔ 战斗指令',
        items: [
          ['move <方向/坐标>', '移动机体'],
          ['fire <目标>', '攻击敌人（开火后进入战斗状态）'],
          ['aim <目标>', '瞄准并查看目标'],
          ['call <目标>', '与 NPC 通信（需接近）'],
          ['timeline', '查看时间轴'],
          ['wait', '等待'],
          ['retreat', '撤退'],
        ]
      },
      items: {
        title: '🎒 物品指令',
        items: [
          ['pick/get [物品名]', '拾取地面物品(不填=全部)'],
          ['drop [物品名]', '丢弃物品'],
          ['use [物品名]', '使用物品'],
          ['equip [物品名]', '装备武器/装甲'],
          ['unequip [栏位]', '卸下装备'],
        ]
      },
      npc: {
        title: '💬 NPC互动',
        items: [
          ['call [NPC名]', '与NPC通信（需接近）'],
          ['shop/buy', '查看/购买装备'],
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
      Msg.system('提示: 进入战场场景自动开启时间轴，开火或被攻击后进入战斗状态');
    }
  },
 
  save() {
    const data = {
      name: Player.name,
      vehicleId: Player.vehicleId,
      level: Player.level,
      exp: Player.exp,
      expToNext: Player.expToNext,
      hp: Player.hp, maxHp: Player.maxHp,
      armor: Player.armor, maxArmor: Player.maxArmor,
      energy: Player.energy, maxEnergy: Player.maxEnergy,
      gold: Player.gold,
      room: Player.room,
      position: Player.position,
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
      MapSystem.init();
      if (data.mapChanges) {
        MapSystem.applyChanges(data.mapChanges);
      }
      Object.assign(Player, {
        name: data.name, vehicleId: data.vehicleId || 'scout',
        level: data.level, exp: data.exp, expToNext: data.expToNext,
        hp: data.hp, maxHp: data.maxHp,
        armor: data.armor, maxArmor: data.maxArmor,
        energy: data.energy, maxEnergy: data.maxEnergy,
        gold: data.gold, room: data.room,
        position: data.position || [500, 500],
        inventory: data.inventory, equipment: data.equipment,
        skills: data.skills,
        visitedRooms: new Set(data.visitedRooms),
        killCount: data.killCount || {},
        stats: data.stats || { totalDmg:0, totalHeal:0, monstersKilled:0, deaths:0 }
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
      console.error(e);
    }
  },
 
  findItemInBag(name) {
    return Player.inventory.find(i => {
      const item = ItemDB[i.id];
      return item && (item.name === name || i.id === name);
    });
  },
 
  showRoom() {
    this.look();
    this.updateUI();
  },
 
  updateUI() {
    this.updatePlayerInfo();
    this.updateEquipInfo();
    this.updateMinimap();
    this.updateLocation();
  },
 
  updatePlayerInfo() {
    const el = document.getElementById('player-info');
    if (!el) return;
    const hpPct = (Player.hp / Player.maxHp * 100).toFixed(1);
    const arPct = Player.maxArmor > 0 ? (Player.armor / Player.maxArmor * 100).toFixed(1) : 0;
    const enPct = (Player.energy / Player.maxEnergy * 100).toFixed(1);
    const expPct = (Player.exp / Player.expToNext * 100).toFixed(1);
    el.innerHTML = `
      <div class="stat-row"><span class="stat-label">等级</span><span class="stat-value exp">Lv.${Player.level}</span></div>
      <div class="stat-row"><span class="stat-label">结构</span><span class="stat-value hp">${Player.hp}/${Player.maxHp}</span></div>
      <div class="bar-container"><div class="bar-fill hp" style="width:${hpPct}%"></div></div>
      <div class="stat-row"><span class="stat-label">装甲</span><span class="stat-value">${Player.armor}/${Player.maxArmor}</span></div>
      <div class="bar-container"><div class="bar-fill mp" style="width:${arPct}%"></div></div>
      <div class="stat-row"><span class="stat-label">能量</span><span class="stat-value mp">${Math.floor(Player.energy)}/${Player.maxEnergy}</span></div>
      <div class="bar-container"><div class="bar-fill mp" style="width:${enPct}%"></div></div>
      <div class="stat-row"><span class="stat-label">EXP</span><span class="stat-value exp">${Player.exp}/${Player.expToNext}</span></div>
      <div class="bar-container"><div class="bar-fill exp" style="width:${expPct}%"></div></div>
      <div class="stat-row"><span class="stat-label">速度</span><span class="stat-value">${Player.currentSpeed.toFixed(1)}</span></div>
      <div class="stat-row"><span class="stat-label">视野</span><span class="stat-value">${Player.visionRadius}m</span></div>
      <div class="stat-row"><span class="stat-label">资金</span><span class="stat-value gold">${Player.gold}G</span></div>
    `;
  },
 
  updateEquipInfo() {
    const el = document.getElementById('equip-info');
    if (!el) return;
    const slots = [
      { key:'primary', label:'主武器' },
      { key:'secondary', label:'副武器' },
      { key:'armor', label:'装甲' }
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
    if (!el) return;
    const levelEl = document.getElementById('map-level-info');
    const currentRoom = MapSystem.getRoom(Player.room);
    if (!currentRoom) return;
    const currentZ = currentRoom.z || 0;
    if (levelEl) levelEl.textContent = `当前高度：${MapSystem.getLevelName(currentZ)}`;
 
    const roomsOnLevel = Object.values(MapSystem.rooms).filter(room => (room.z || 0) === currentZ);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const room of roomsOnLevel) {
      if (room.x !== undefined) {
        minX = Math.min(minX, room.x); maxX = Math.max(maxX, room.x);
        minY = Math.min(minY, room.y); maxY = Math.max(maxY, room.y);
      }
    }
 
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
 
    let html = '';
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
    if (room && el) {
      const exits = Object.keys(room.exits || {}).map(d => MapSystem.getDirectionName(d)).join('、');
      el.innerHTML = `<div style="color:var(--accent);font-weight:600;margin-bottom:0.3rem">${room.name}</div><div>高度: ${MapSystem.getLevelName(room.z || 0)}</div><div>出口: ${exits}</div>`;
    }
  }
};
