// ========== 游戏主控 ==========
const Game = {
  commandHistory: [],
  historyIndex: -1,
 
  init() {
    Msg.init();
    MapSystem.init();
    Player.init();
    Player.visitedRooms.add(Player.room);
    Timeline.init();
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

    const startRoom = MapSystem.getRoom(Player.room);
    if (startRoom && startRoom.battlefield) {
      Battle.start(Player.room, 'south');
    }
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
        Msg.warn(`⚠ 探测到 ${alive} 个敌对单位信号（开火或被攻击后进入战斗状态）。`);
      } else {
        Msg.info('区域内已无敌对信号。');
      }
      if (bf.terrain !== undefined) {
        Msg.info(`🗺 地形：${MapSystem.getTerrainName(bf.terrain)}`);
      }
      if (bf.npcs && bf.npcs.length > 0) {
        Msg.info(`📡 检测到 ${bf.npcs.length} 个友好信号，使用 <span class="help-cmd">call</span> 通信（需先接近）。`);
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
    if (Battle.combatActive) {
      Msg.warn('战斗中无法切换场景！请先撤退（retreat）。');
      return;
    }
    if (Battle.active) {
      Battle.end();
    }
    const nextRoomId = room.exits[direction];
    Player.room = nextRoomId;
    Player.visitedRooms.add(Player.room);
    Player.position = [500, 500];

    const nextRoom = MapSystem.getRoom(nextRoomId);
    this.look();
    this.updateUI();
    if (nextRoom && nextRoom.battlefield) {
      Battle.start(nextRoomId, MapSystem.getOppositeDirection(direction));
    } else {
      BattleUI.remove();
    }
  },
 
  showBag(showDetail = false) {
    Msg.divider();
    Msg.add('🎒 背包', 'info');

    // 预算信息
    Msg.info(`功率: ${Player.budget.powerUsed.toFixed(1)}/${Player.budget.powerMax}kW  算力: ${Player.budget.computeUsed.toFixed(1)}/${Player.budget.computeMax}MFlops  装备舱: ${Player.budget.bayUsed.toFixed(2)}/${Player.budget.bayMax}m³`);

    // 接口状态
    Player.showInterfaceStatus();
    // 接口图例
    Msg.info(`图例：${Player.getInterfaceLegend()}`);

    // 核心模块
    Msg.info('── 核心模块 ──');
    if (Player.coreComputer) {
      Msg.info(`  核心计算机: <span class="item-tag core">${Player.coreComputer.name}</span> [算力+${Player.coreComputer.coreOutput}]`);
    } else {
      Msg.info('  核心计算机: (未安装)');
    }
    if (Player.corePower) {
      Msg.info(`  核心动力: <span class="item-tag core">${Player.corePower.name}</span> [功率+${Player.corePower.coreOutput}]`);
    } else {
      Msg.info('  核心动力: (未安装)');
    }

    // 当前装备（接口槽位）
    Msg.info('── 接口装备 ──');
    let hasEquip = false;
    let slotNum = 0;
    for (const [key, slot] of Object.entries(Player.equipment)) {
      slotNum++;
      const desc = Player.getSlotDesc(key);
      const equip = slot.equip;
      if (equip) {
        hasEquip = true;
        const stats = [];
        if (equip.damage) stats.push(`伤害${equip.damage}`);
        if (equip.armorValue) stats.push(`装甲${equip.armorValue}`);
        if (equip.range) stats.push(`射程${equip.range}m`);
        if (equip.cooldown) stats.push(`冷却${equip.cooldown}s`);
        if (equip.capacity) stats.push(`容量${equip.capacity}`);
        const extra = stats.length ? ` [${stats.join(', ')}]` : '';
        Msg.info(`  #${slotNum} ${desc}: <span class="item-tag ${equip.type}">${equip.name}</span>${extra}`);
      } else {
        Msg.info(`  #${slotNum} ${desc}: (空闲)`);
      }
    }
    if (!hasEquip) {
      Msg.system('（接口无装备）');
    }

    // 资源信息
    const res = Player.resources;
    if (res.maxIon > 0 || res.maxFuel > 0) {
      const resStr = [];
      resStr.push(`能量${Math.floor(res.energy)}/${res.maxEnergy}MJ`);
      if (res.maxIon > 0) resStr.push(`离子${Math.floor(res.ion)}/${res.maxIon}g`);
      if (res.maxFuel > 0) resStr.push(`燃料${Math.floor(res.fuel)}/${res.maxFuel}L`);
      Msg.info(`资源: ${resStr.join(' · ')}`);
    }

    Msg.info('── 背包物品 ──');
    if (Player.inventory.length === 0) {
      Msg.system('背包是空的。');
    } else {
      Player.inventory.forEach(({ id, count }, idx) => {
        const item = ItemDB.get(id);
        if (item) {
          const countStr = count > 1 ? ` x${count}` : '';
          const statsStr = [];
          if (item.damage) statsStr.push(`伤害${item.damage}`);
          if (item.armorValue) statsStr.push(`装甲${item.armorValue}`);
          if (item.healHp) statsStr.push(`修复结构${item.healHp}`);
          if (item.healArmor) statsStr.push(`修复装甲${item.healArmor}`);
          if (item.range) statsStr.push(`射程${item.range}m`);
          if (item.powerReq) statsStr.push(`功率${item.powerReq}kW`);
          if (item.computeReq) statsStr.push(`算力${item.computeReq}`);
          if (item.interfaceReq) {
            const syms = item.interfaceReq.map(t => Player.getInterfaceSymbol(t)).join('');
            statsStr.push(`[${syms}]`);
          }
          const extra = statsStr.length ? ` [${statsStr.join(', ')}]` : '';
          const desc = showDetail ? ` - ${item.desc}` : '';
          Msg.info(`  #${idx + 1} <span class="item-tag ${item.type}">${item.name}</span>${countStr}${extra}${desc}`);
        }
      });
    }
    if (!showDetail) Msg.system('提示: 输入 bag -d 可查看物品描述详情。装备: equip <编号|物品名>，卸下: unequip <接口编号>');
  },
 
  showStatus() {
    Msg.divider();
    Msg.add('📜 机体状态', 'info');
    Msg.info(`驾驶员: ${Player.name}  等级: <span class="stat-value exp">Lv.${Player.level}</span>`);
    Msg.info(`机体: ${VehicleDB[Player.vehicleId]?.name || Player.vehicleId}`);
    Msg.info(`结构值: <span class="stat-value hp">${Player.hp}</span>/${Player.maxHp}  装甲: <span class="stat-value">${Player.armor}</span>/${Player.maxArmor}`);
    Msg.info(`能量: <span class="stat-value mp">${Math.floor(Player.energy)}</span>/${Player.maxEnergy} (恢复+${Player.energyRegen}/s)`);
    Msg.info(`速度: ${Player.currentSpeed.toFixed(1)}m/s  视野: ${Player.visionRadius}m`);
    Msg.info(`功率: ${Player.budget.powerUsed}/${Player.budget.powerMax}kW  算力: ${Player.budget.computeUsed}/${Player.budget.computeMax}MFlops  装备舱: ${Player.budget.bayUsed}/${Player.budget.bayMax}m³`);
    Msg.info(`经验: ${Player.exp}/${Player.expToNext}`);

    // 显示核心模块
    if (Player.coreComputer) {
      Msg.info(`  核心计算机: ${Player.coreComputer.name} [算力+${Player.coreComputer.coreOutput}]`);
    }
    if (Player.corePower) {
      Msg.info(`  核心动力: ${Player.corePower.name} [功率+${Player.corePower.coreOutput}]`);
    }

    // 显示接口装备
    let statusSlotNum = 0;
    for (const [key, slot] of Object.entries(Player.equipment)) {
      statusSlotNum++;
      const desc = Player.getSlotDesc(key);
      const e = slot.equip;
      if (e) {
        const stats = [];
        if (e.damage) stats.push(`伤害${e.damage}`);
        if (e.armorValue) stats.push(`装甲${e.armorValue}`);
        if (e.range) stats.push(`射程${e.range}m`);
        if (e.cooldown) stats.push(`冷却${e.cooldown}s`);
        if (e.capacity) stats.push(`容量${e.capacity}`);
        const extra = stats.length ? ` [${stats.join(' ')}]` : '';
        Msg.info(`  #${statusSlotNum} ${desc}: ${e.name}${extra}`);
      }
    }

    // 资源
    const res = Player.resources;
    if (res.maxIon > 0 || res.maxFuel > 0) {
      const resStr = [];
      resStr.push(`能量${Math.floor(res.energy)}/${res.maxEnergy}MJ`);
      if (res.maxIon > 0) resStr.push(`离子${Math.floor(res.ion)}/${res.maxIon}g`);
      if (res.maxFuel > 0) resStr.push(`燃料${Math.floor(res.fuel)}/${res.maxFuel}L`);
      Msg.info(`资源: ${resStr.join(' · ')}`);
    }

    // 结构抗性
    const resist = Player.getResistances();
    const resArr = [];
    if (resist.kinetic > 0) resArr.push(`动能+${(resist.kinetic*100).toFixed(0)}%`);
    if (resist.thermal > 0) resArr.push(`热能+${(resist.thermal*100).toFixed(0)}%`);
    if (resist.shock > 0) resArr.push(`震荡+${(resist.shock*100).toFixed(0)}%`);
    if (resist.ion > 0) resArr.push(`离子+${(resist.ion*100).toFixed(0)}%`);
    if (resArr.length > 0) Msg.info(`结构抗性: ${resArr.join(' · ')}`);

    if (Player.statusEffects.length > 0) {
      const effStr = Player.statusEffects.map(e => {
        const names = { slow:'减速', poison:'中毒', burn:'灼烧', shock:'电击', corrosion:'腐蚀', stun:'眩晕', ion_disrupt:'EMP干扰' };
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
 
  equip(arg) {
    if (!arg) { Msg.warning('请指定要装备的物品：equip <编号|物品名>。'); return; }
    let item = null;
    const num = parseInt(arg);
    if (!isNaN(num) && num >= 1) {
      item = Player.inventory[num - 1];
      if (!item) { Msg.danger(`背包中没有第 ${num} 件物品。`); return; }
    } else {
      item = this.findItemInBag(arg);
      if (!item) { Msg.danger('背包中没有该物品。'); return; }
    }
    const template = ItemDB.get(item.id);
    if (!template) return;

    if (Player.installEquipment(item.id, undefined)) {
      Player.removeItem(item.id);
    }
  },

  unequip(arg) {
    if (!arg) {
      Msg.info('卸下装备用法: unequip <接口编号>（如 unequip 1，编号见 bag）');
      Player.showInterfaceStatus();
      return;
    }
    // 支持数字编号（1-based）或 slot_key
    let slotKey = arg;
    const num = parseInt(arg);
    if (!isNaN(num) && num >= 1) {
      const keys = Object.keys(Player.equipment);
      slotKey = keys[num - 1];
      if (!slotKey) { Msg.danger(`没有第 ${num} 个接口。`); return; }
    }
    Player.uninstallEquipment(slotKey, true);
  },

  reload(arg) {
    if (!arg) {
      Msg.info('装填弹药用法: reload <接口编号>（如 reload 1，编号见 bag）');
      Player.showInterfaceStatus();
      return;
    }
    let slotKey = arg;
    const num = parseInt(arg);
    if (!isNaN(num) && num >= 1) {
      const keys = Object.keys(Player.equipment);
      slotKey = keys[num - 1];
      if (!slotKey) { Msg.danger(`没有第 ${num} 个接口。`); return; }
    }
    Player.reload(slotKey);
  },

  showHangar() {
    Msg.divider();
    Msg.add('🏭 机库', 'info');
    if (Player.hangar.length === 0) {
      Msg.system('机库是空的。');
      return;
    }
    Player.hangar.forEach((v, idx) => {
      const vehicle = VehicleDB[v.vehicleId];
      const isCurrent = v.vehicleId === Player.vehicleId;
      const status = isCurrent ? ' ✅[当前使用]' : '';
      if (vehicle) {
        const equipCount = Object.values(v.equipment || {}).filter(s => s && s.equip).length;
        Msg.info(`  #${idx + 1} <span class="item-tag core">${vehicle.name}</span> - HP${vehicle.maxHp} 装甲${vehicle.maxArmor} 接口${equipCount}装备${status}`);
      } else {
        Msg.info(`  #${idx + 1} ${v.vehicleId}${status}`);
      }
    });
    Msg.system('提示: 在基地内输入 switch <编号> 切换机体');
  },

  switchVehicle(arg) {
    if (!arg) {
      Msg.info('切换机体用法: switch <编号>（如 switch 1，编号见 hangar）');
      return;
    }
    const num = parseInt(arg);
    if (isNaN(num) || num < 1) {
      Msg.error('请输入有效的编号。');
      return;
    }
    const entry = Player.hangar[num - 1];
    if (!entry) {
      Msg.error(`没有第 ${num} 号机体。`);
      return;
    }
    Player.switchVehicle(entry.vehicleId);
  },

  showWarehouse() {
    Msg.divider();
    Msg.add('📦 基地仓库', 'info');
    if (Player.warehouse.length === 0) {
      Msg.system('仓库是空的。');
      return;
    }
    Player.warehouse.forEach((entry, idx) => {
      const item = ItemDB.get(entry.id);
      if (item) {
        const countStr = entry.count > 1 ? ` x${entry.count}` : '';
        const typeTag = item.type ? `class="item-tag ${item.type}"` : '';
        Msg.info(`  #${idx + 1} <span ${typeTag}>${item.name}</span>${countStr}`);
      }
    });
    Msg.system('提示: export <背包编号> [数量] 存入仓库, import <仓库编号> [数量] 取回, wequip <编号> 直接装备');
  },

  depositToWarehouse(itemName, count = 1) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.isSafeZone) {
      Msg.error('只能在基地内存取物品。');
      return;
    }
    Player.depositToWarehouse(itemName, count);
  },

  withdrawFromWarehouse(itemName, count = 1) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.isSafeZone) {
      Msg.error('只能在基地内存取物品。');
      return;
    }
    Player.withdrawFromWarehouse(itemName, count);
  },

  equipFromWarehouse(itemName) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.isSafeZone) {
      Msg.error('只能在基地内装备物品。');
      return;
    }
    Player.equipFromWarehouse(itemName);
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

    const showAll = action === 'all';
    let itemList = [];

    if (showAll) {
      if (typeof EquipmentDB !== 'undefined') {
        itemList = EquipmentDB.getAll();
      }
    } else {
      itemList = shopNpc.shopItems.map(id => ItemDB.get(id)).filter(Boolean);
    }

    if (action === 'list' || !action || showAll) {
      Msg.divider();
      Msg.add(`🏪 ${shopNpc.name || '装备库'} 的商品${showAll ? '（全部装备）' : ''}`, 'info');
      if (itemList.length === 0) {
        Msg.system('暂无商品。');
      } else {
        itemList.forEach((item, idx) => {
          // 检查是否是载具
          if (item.category === 'vehicle' || VehicleDB[item.id]) {
            const vehicle = VehicleDB[item.id];
            if (vehicle) {
              const stats = [];
              if (vehicle.maxHp) stats.push(`HP${vehicle.maxHp}`);
              if (vehicle.maxArmor) stats.push(`装甲${vehicle.maxArmor}`);
              if (vehicle.maxSpeed) stats.push(`速度${vehicle.maxSpeed}`);
              const extra = stats.length ? ` [${stats.join(',')}]` : '';
              const owned = Player.hangar.some(v => v.vehicleId === item.id);
              const ownTag = owned ? ' ✅已拥有' : '';
              Msg.info(`  ${idx+1}. [机体] <span class="item-tag core">${vehicle.name}</span>${extra} - ${vehicle.price || 0}G${ownTag}`);
            }
          } else {
            const stats = [];
            if (item.damage) stats.push(`伤害${item.damage}`);
            if (item.armorValue) stats.push(`装甲${item.armorValue}`);
            if (item.healHp) stats.push(`修复结构${item.healHp}`);
            if (item.healArmor) stats.push(`修复装甲${item.healArmor}`);
            if (item.range) stats.push(`射程${item.range}m`);
            if (item.powerReq) stats.push(`功率${item.powerReq}kW`);
            if (item.computeReq) stats.push(`算力${item.computeReq}`);
            const extra = stats.length ? ` [${stats.join(',')}]` : '';
            const catTag = item.category ? `[${item.category}] ` : '';
            Msg.info(`  ${idx+1}. ${catTag}<span class="item-tag ${item.type}">${item.name}</span>${extra} - ${item.price}G`);
          }
        });
      }
      Msg.info('购买: shop/buy 物品名 或 buy 序号');
      Msg.info('出售: sell 物品名 (半价回收)');
      Msg.info('查看全部: shop all');
    } else {
      let targetItem = null;
      const num = parseInt(action);
      if (!isNaN(num) && num >= 1 && num <= itemList.length) {
        targetItem = itemList[num - 1];
      } else {
        targetItem = itemList.find(it => it.name === action || it.id === action);
      }
      if (!targetItem) {
        Msg.danger('商品不存在。');
        Msg.info('输入 shop all 查看全部装备。');
        return;
      }
      // 检查是否是载具
      if (targetItem.category === 'vehicle' || VehicleDB[targetItem.id]) {
        const vehicle = VehicleDB[targetItem.id];
        if (!vehicle) {
          Msg.danger('载具数据错误。');
          return;
        }
        if (Player.hangar.some(v => v.vehicleId === targetItem.id)) {
          Msg.warning('你已经拥有该机体了。');
          return;
        }
        if (Player.gold < (vehicle.price || 0)) {
          Msg.danger('资金不足！');
          return;
        }
        Player.gold -= vehicle.price || 0;
        Player.hangar.push({
          vehicleId: targetItem.id,
          equipment: {},
          coreComputer: null,
          corePower: null,
          magazines: {}
        });
        Msg.success(`💰 购买了机体 <span class="item-tag core">${vehicle.name}</span>，花费 ${vehicle.price || 0}G`);
        Msg.info('输入 hangar 查看机库，switch <编号> 切换机体。');
      } else {
        if (Player.gold < targetItem.price) { Msg.danger('资金不足！'); return; }
        Player.gold -= targetItem.price;
        Player.addItem(targetItem.id);
        Msg.success(`💰 购买了 <span class="item-tag ${targetItem.type}">${targetItem.name}</span>，花费 ${targetItem.price}G`);
      }
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
          ['move <x> <y>', '移动到指定坐标'],
          ['move <方向> [距离]', '向方向移动(n/s/e/w/ne/nw/se/sw)'],
          ['move <方向>', '主方向移动到边界并切换场景'],
          ['enter <方向>', '切换相邻场景'],
          ['north/south/east/west (或 n/s/e/w)', '向对应方向移动'],
          ['up/down (或 上/下)', '通过通道上下移动'],
        ]
      },
      basic: {
        title: '📋 基础指令',
        items: [
          ['look (l)', '查看当前区域'],
          ['bag (inv/i)', '查看背包和装备'],
          ['status (sta)', '查看机体状态'],
          ['map', '查看区域地图'],
          ['score/stats', '查看任务统计'],
          ['clear', '清空屏幕'],
        ]
      },
      combat: {
        title: '⚔ 战斗指令',
        items: [
          ['move <方向/坐标>', '移动机体'],
          ['fire <目标> [槽]', '攻击目标（槽:#1/#2/all，默认all）'],
          ['reload <槽>', '手动装填弹药'],
          ['use <物品>', '使用物品（如修复装甲）'],
          ['idle <秒数>', '待机指定秒数'],
          ['look [目标]', '查看战场或指定目标'],
          ['call <目标>', '与 NPC 通信（需距离≤100m）'],
          ['timeline', '查看时间轴'],
          ['wait', '等待一回合'],
          ['retreat', '撤退'],
          ['status / bag', '查看状态/背包'],
        ]
      },
      items: {
        title: '🎒 物品指令',
        items: [
          ['use [物品名]', '使用物品'],
          ['equip [物品名] [槽]', '装备武器/装甲'],
          ['unequip [槽]', '卸下装备'],
          ['reload [槽]', '手动装填弹药'],
          ['sell [物品名]', '出售物品(半价)'],
        ]
      },
      base: {
        title: '🏭 基地指令',
        items: [
          ['hangar (hg)', '查看机库'],
          ['switch <编号>', '切换载具（需在安全区）'],
          ['warehouse (wh)', '查看仓库'],
          ['export [物品]', '存入仓库'],
          ['import [物品]', '取出仓库'],
          ['wequip [物品]', '从仓库直接装备'],
        ]
      },
      npc: {
        title: '💬 NPC互动',
        items: [
          ['call [NPC名]', '与NPC通信（需接近）'],
          ['shop/buy', '查看/购买装备'],
        ]
      },
      system: {
        title: '💾 系统',
        items: [
          ['save', '保存游戏进度'],
          ['load', '读取游戏存档'],
          ['help [分类]', '查看帮助(movement/basic/combat/items/base/npc)'],
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
      hangar: Player.hangar,
      warehouse: Player.warehouse,
      magazines: Player.magazines,
      coreComputer: Player.coreComputer,
      corePower: Player.corePower,
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
        inventory: data.inventory || [],
        equipment: data.equipment || {},
        hangar: data.hangar || [],
        warehouse: data.warehouse || [],
        magazines: data.magazines || {},
        coreComputer: data.coreComputer || null,
        corePower: data.corePower || null,
        skills: data.skills || [],
        visitedRooms: new Set(data.visitedRooms || []),
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
    const lower = String(name).toLowerCase();
    return Player.inventory.find(i => {
      const item = ItemDB.get(i.id);
      if (!item) return false;
      return item.name.toLowerCase() === lower ||
             i.id.toLowerCase() === lower ||
             item.name.toLowerCase().includes(lower);
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

    let html = '';

    // 显示当前载具型号
    const vehicle = VehicleDB[Player.vehicleId];
    if (vehicle) {
      html += `<div class="equip-item" style="border-bottom: 1px solid var(--border);padding-bottom:0.5rem;margin-bottom:0.5rem;">`;
      html += `<div class="equip-slot">`;
      html += `<span class="equip-slot-name">机体</span>`;
      html += `<span class="equip-slot-item" style="color:var(--accent);font-weight:bold;">${vehicle.name}</span>`;
      html += `</div></div>`;
    }

    // 接口装备
    const slotKeys = Object.keys(Player.equipment);
    for (let i = 0; i < slotKeys.length; i++) {
      const key = slotKeys[i];
      const slot = Player.equipment[key];
      const item = slot.equip;
      if (!item) continue;

      const slotNum = i + 1;
      let extraHtml = '';

      if (item.category === 'weapon') {
        const ammoMap = {
          '火炮': { type: '20mm_ap', name: '20mm弹' },
          '电磁炮': { type: 'railgun_slug', name: '轨道弹' },
          '离子炮': { type: 'ion_charge', name: '离子' },
          '导弹': { type: 'missile_he', name: '导弹' },
          '激光炮': null,
          '近战': null
        };
        const ammoInfo = ammoMap[item.subCategory];
        if (ammoInfo) {
          const magCurrent = Player.magazines[key] || 0;
          const magMax = item.magazine || 0;
          const reserve = Player.ammo[ammoInfo.type] || 0;
          const pct = magMax > 0 ? (magCurrent / magMax * 100) : (reserve > 0 ? 100 : 0);
          const magDisplay = magMax > 0 ? `${magCurrent}/${magMax}` : `${magCurrent}`;
          extraHtml += `
            <div class="weapon-ammo">
              <div class="weapon-ammo-bar"><div class="weapon-ammo-fill" style="width:${Math.min(100, pct)}%"></div></div>
              <div class="weapon-ammo-text">${ammoInfo.name}: ${magDisplay}${reserve > 0 ? ` (+${reserve}备弹)` : ''}</div>
            </div>`;
        }

        const cd = Player.weaponCooldowns[key] || 0;
        const maxCd = item.cooldown || 1;
        const isReady = cd <= 0;
        const pct = isReady ? 100 : Math.max(0, Math.min(100, (1 - cd / maxCd) * 100));
        const statusText = isReady ? '就绪' : `冷却 ${cd.toFixed(1)}s`;
        const fillClass = isReady ? 'ready' : 'cooling';
        const statusClass = isReady ? 'ready' : 'cooling';
        extraHtml += `
          <div class="weapon-cooldown">
            <div class="weapon-cooldown-bar"><div class="weapon-cooldown-fill ${fillClass}" style="width:${pct}%"></div></div>
            <div class="weapon-cooldown-status ${statusClass}">${statusText}</div>
          </div>`;
      }

      html += `<div class="equip-item">`;
      html += `<div class="equip-slot">`;
      html += `<span class="equip-slot-name">#${slotNum}</span>`;
      html += `<span class="equip-slot-item">${item.name}</span>`;
      html += `</div>`;
      html += `${extraHtml}`;
      html += `</div>`;
    }

    if (html === '') {
      html = `<div style="font-size:var(--font-hint);color:var(--muted);text-align:center;padding:0.5rem;">（未装备）</div>`;
    }

    el.innerHTML = html;
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
 
    const offsetX = currentRoom.x - 5;
    const offsetY = currentRoom.y - 5;
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
    for (let dy = 0; dy < 10; dy++) {
      for (let dx = 0; dx < 10; dx++) {
        const rx = offsetX + dx;
        const ry = offsetY + dy;
        const room = roomAt(rx, ry);
        if (room) {
          const style = getCellStyle(room);
          const label = MapSystem.getRoomLabel(room);
          const verticalClass = (room.exits.up || room.exits.down) ? ' vertical' : '';
          const hasExit = Object.keys(room.exits || {}).length > 0;
          const exitClass = hasExit ? ' has-exit' : '';
          if (room.id === Player.room) {
            html += `<div class="map-cell current${verticalClass}" style="${style}" title="${room.name}｜${MapSystem.getLevelName(room.z || 0)}">@</div>`;
          } else if (Player.visitedRooms.has(room.id)) {
            html += `<div class="map-cell visited${verticalClass}" style="${style}" title="${room.name}｜${MapSystem.getLevelName(room.z || 0)}">${label}</div>`;
          } else {
            html += `<div class="map-cell room${verticalClass}${exitClass}" style="${style}" title="${room.name}｜${MapSystem.getLevelName(room.z || 0)}">${hasExit ? label : ''}</div>`;
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
