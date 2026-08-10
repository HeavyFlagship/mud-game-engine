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
    if (typeof TechTree !== 'undefined') TechTree.init();
    if (typeof FacilitySystem !== 'undefined') FacilitySystem.init();
    if (typeof SupplyDemand !== 'undefined') SupplyDemand.init();
    if (typeof QuotaSystem !== 'undefined') QuotaSystem.init();
    if (typeof QuestSystem !== 'undefined') QuestSystem.init();
 
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

    // 丰富描述
    const enriched = this.getRoomDescription(room);
    if (enriched) {
      Msg.info(enriched);
    }

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
    if (room.id === 'outpost_repair') {
      Msg.info('🔧 维修站提供改装服务。输入 <span class="help-cmd">upgrade</span> 升级核心计算机或核心动力。');
    }

    // 显示可采集资源点
    const resourcePoints = MapSystem.getResourcePoints(room.id);
    if (resourcePoints.length > 0) {
      const nameList = resourcePoints.map(r => r.name).join('、');
      Msg.info(`🔍 可采集资源: ${nameList}`);
      Msg.system('提示: 输入 <span class="help-cmd">gather</span> 采集所有资源点。');
    }
  },

  getRoomDescription(room) {
    if (!room) return '';
    const parts = [];
    const id = room.id.toLowerCase();

    // 地形描述
    if (room.battlefield && room.battlefield.terrain) {
      const terrainDescs = {
        flat: '地表平坦坚实，适合快速行进。',
        rocky: '地表由碎石覆盖，行走困难。',
        sandy: '松软的沙地使每一步都陷入其中。',
        crystal: '地面覆盖着闪烁的结晶矿脉，踩上去发出清脆的声响。',
        cave: '洞穴地面凹凸不平，洞壁上镶嵌着发光的矿脉。',
        metal_floor: '金属地板在脚下发出沉闷的回响。'
      };
      const desc = terrainDescs[room.battlefield.terrain];
      if (desc) parts.push(desc);
    }

    // 区域类型描述
    if (id.startsWith('wasteland_') || id.startsWith('arid_')) {
      parts.push('赤褐色的荒原向远方延伸，空气中弥漫着干燥的硫化物气味。');
    } else if (id.startsWith('wild_')) {
      parts.push('荒野地带，风化的岩屑和稀疏的结晶矿脉散布四周。');
    } else if (id.startsWith('cave_') || id.startsWith('mine_')) {
      parts.push('矿洞的黑暗被辉锗矿的幽蓝光芒照亮，虫群的活动痕迹随处可见。');
    } else if (id.startsWith('mech_')) {
      parts.push('远古机械的遗迹中，锈蚀的金属结构在昏暗的光线中若隐若现。');
    } else if (id.startsWith('front_')) {
      parts.push('前沿区域危机四伏，空气中弥漫着紧张的气息。');
    } else if (id.startsWith('spec_')) {
      parts.push('奇异的自然地貌让人不禁驻足，地表呈现出不自然的色彩和纹理。');
    } else if (id.startsWith('trans_')) {
      parts.push('地形逐渐发生变化，过渡地带连接着两个截然不同的区域。');
    }

    // 危险信息
    if (room.battlefield && room.battlefield.hazards && room.battlefield.hazards.length > 0) {
      const hazardDescs = room.battlefield.hazards.map(h => {
        if (h.type === 'acid_pool' || h.type === 'emi' || h.type === 'em_interference' || h.type === 'toxic_fog') {
          const names = { acid_pool: '酸性雾气弥漫在空气中', emi: '空气中充满了电磁干扰的嗡嗡声', em_interference: '空气中充满了电磁干扰的嗡嗡声', toxic_fog: '有毒的雾气在地面低洼处聚集' };
          return names[h.type] || '';
        }
        return '';
      }).filter(Boolean);
      if (hazardDescs.length > 0) {
        parts.push(hazardDescs.join('；') + '。');
      }
    }

    // 资源信息
    const resourcePoints = MapSystem.getResourcePoints(room.id);
    if (resourcePoints.length > 0) {
      const hasIron = resourcePoints.some(r => r.itemId === 'iron_ore');
      const hasCopper = resourcePoints.some(r => r.itemId === 'copper_ore');
      const hasGermanite = resourcePoints.some(r => r.itemId === 'germanite_shard');
      const hasMechParts = resourcePoints.some(r => r.itemId === 'mech_parts');
      const hasAlloy = resourcePoints.some(r => r.itemId === 'alloy_fragment');

      if (hasGermanite) {
        parts.push('岩壁上闪烁着辉锗矿的幽蓝光泽，仿佛星辰落入凡间。');
      } else if (hasIron || hasCopper) {
        parts.push('岩壁上闪烁着矿石的光泽，隐约可见矿脉的轮廓。');
      } else if (hasMechParts || hasAlloy) {
        parts.push('残骸中散落着可用的机械零件，金属碎片在光线下反射着微光。');
      }
    }

    // 敌人信息
    if (room.battlefield && room.battlefield.enemies && room.battlefield.enemies.length > 0) {
      const bf = MapSystem.getBattlefield(room.id);
      if (bf) {
        const alive = bf.enemies.filter(e => e.hp > 0).length;
        if (alive > 0) {
          parts.push(`雷达探测到${alive}个敌对信号，保持警惕。`);
        }
      } else {
        parts.push(`雷达探测到${room.battlefield.enemies.length}个敌对信号。`);
      }
    }

    return parts.join(' ');
  },
 
  move(direction) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.exits || !room.exits[direction]) {
      Msg.warning('这个方向无法通行。');
      return;
    }
    if (Battle.active) {
      Battle.end();
    }
    const nextRoomId = room.exits[direction];
    const prevPos = [...Player.position];
    Player.room = nextRoomId;
    Player.visitedRooms.add(Player.room);

    const nextRoom = MapSystem.getRoom(nextRoomId);
    if (nextRoom && nextRoom.battlefield) {
      Battle.start(nextRoomId, MapSystem.getOppositeDirection(direction), prevPos);
    } else {
      const entryDir = MapSystem.getOppositeDirection(direction);
      const margin = 50;
      const nextSize = [1000, 1000];
      let entryPos = [500, 500];
      if (entryDir === 'north') {
        entryPos = [Utils.clamp(prevPos[0], margin, nextSize[0] - margin), margin];
      } else if (entryDir === 'south') {
        entryPos = [Utils.clamp(prevPos[0], margin, nextSize[0] - margin), nextSize[1] - margin];
      } else if (entryDir === 'east') {
        entryPos = [nextSize[0] - margin, Utils.clamp(prevPos[1], margin, nextSize[1] - margin)];
      } else if (entryDir === 'west') {
        entryPos = [margin, Utils.clamp(prevPos[1], margin, nextSize[1] - margin)];
      }
      Player.position = entryPos;
      BattleUI.remove();
    }
    // Update quest explore objectives
    if (typeof QuestSystem !== 'undefined') {
      for (const [questId, active] of Object.entries(QuestSystem.activeQuests)) {
        if (active.completed) continue;
        const quest = QuestDB[questId];
        if (!quest) continue;
        for (const obj of quest.objectives) {
          if (obj.type === 'explore') {
            QuestSystem.updateProgress(questId, obj.id, 1);
          }
        }
      }
    }
    this.look();
    this.updateUI();
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
    
    // 检查是否在指定资源点采集
    const resourcePoints = MapSystem.getResourcePoints(room.id);
    const hasResources = resourcePoints.length > 0;
    
    if ((!room || !room.items || room.items.length === 0) && !hasResources) {
      Msg.warning('这里没有可拾取的物品。');
      return;
    }
    
    if (itemName) {
      // 先尝试匹配资源点
      const resourceMatch = resourcePoints.find(r => r.name === itemName || r.itemId === itemName);
      if (resourceMatch) {
        const count = resourceMatch.rarity === 'rare' ? Utils.rand(1, 2) : Utils.rand(1, 3);
        Player.addItem(resourceMatch.itemId, count);
        Msg.success(`⛏ 采集了 <span class="item-tag material">${resourceMatch.name}</span> x${count}`);
        return;
      }
      
      if (!room || !room.items || room.items.length === 0) {
        Msg.warning('没有找到该物品。');
        return;
      }
      
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
      const items = room.items ? [...room.items] : [];
      if (room.items) room.items = [];
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
 
  compareEquipment(shopItem, equippedItem) {
    const stats = [
      { key: 'damage',       label: '伤害',   unit: '' },
      { key: 'armorValue',   label: '装甲',   unit: '' },
      { key: 'range',        label: '射程',   unit: 'm' },
      { key: 'cooldown',     label: '冷却',   unit: 's' },
      { key: 'powerReq',     label: '功率',   unit: 'kW' },
      { key: 'computeReq',   label: '算力',   unit: '' }
    ];
    const results = [];
    for (const stat of stats) {
      const shopVal = shopItem[stat.key] || 0;
      const equipVal = equippedItem[stat.key] || 0;
      if (shopVal === 0 && equipVal === 0) continue;
      const diff = shopVal - equipVal;
      if (diff === 0) continue;
      const better = (stat.key === 'cooldown' || stat.key === 'powerReq' || stat.key === 'computeReq')
        ? (diff < 0) : (diff > 0);
      const arrow = better ? '▲' : '▼';
      const sign = diff > 0 ? '+' : '';
      results.push({ stat: stat.label, key: stat.key, diff, better, arrow, sign, unit: stat.unit });
    }
    return results;
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

            // 装备对比：仅对武器/装甲类装备显示
            if (item.slot && (item.category === 'weapon' || item.category === 'armor' || item.type === 'weapon' || item.type === 'armor')) {
              let equippedItem = null;
              let equippedSlotName = '';
              for (const [slotKey, slot] of Object.entries(Player.equipment)) {
                const eq = slot.equip;
                if (eq && eq.slot === item.slot) {
                  equippedItem = eq;
                  equippedSlotName = Player.getSlotDesc(slotKey);
                  break;
                }
              }
              if (equippedItem) {
                const comp = this.compareEquipment(item, equippedItem);
                if (comp.length > 0) {
                  const compStr = comp.map(c => `${c.stat} ${item[c.key] || 0}${c.unit} ${c.arrow}${c.sign}${c.diff}${c.unit}`).join(' | ');
                  Msg.info(`    <span style="color:#888;font-size:0.85em;">对比 ${equippedSlotName}: ${compStr}</span>`);
                } else {
                  Msg.info(`    <span style="color:#888;font-size:0.85em;">对比 ${equippedSlotName}: ${equippedItem.name} (属性相同)</span>`);
                }
              }
            }
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
        if (Player.credits < (vehicle.price || 0)) {
          Msg.danger('资金不足！');
          return;
        }
        Player.credits -= vehicle.price || 0;
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
        if (Player.credits < targetItem.price) { Msg.danger('资金不足！'); return; }
        Player.credits -= targetItem.price;
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
    Player.credits += sellPrice;
    Msg.success(`💰 出售了 <span class="item-tag ${template.type}">${template.name}</span>，获得 ${sellPrice}G`);
  },

  upgrade(action) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || room.id !== 'outpost_repair') {
      Msg.warning('改装服务仅在维修站可用。');
      return;
    }

    const vehicle = VehicleDB[Player.vehicleId];
    const vehicleName = vehicle ? vehicle.name : '未知机体';

    let compatibleComputers = [];
    let compatiblePowers = [];
    let allComputers = [];
    let allPowers = [];

    if (typeof EquipmentDB !== 'undefined') {
      for (const equip of EquipmentDB.getAll()) {
        if (equip.coreType === 'computer') {
          allComputers.push(equip);
        } else if (equip.coreType === 'power') {
          allPowers.push(equip);
        }
      }
    }

    if (vehicle && vehicle.compatibleComputers) {
      compatibleComputers = vehicle.compatibleComputers
        .map(id => EquipmentDB.get(id))
        .filter(Boolean);
    } else {
      compatibleComputers = allComputers;
    }

    if (vehicle && vehicle.compatiblePowers) {
      compatiblePowers = vehicle.compatiblePowers
        .map(id => EquipmentDB.get(id))
        .filter(Boolean);
    } else {
      compatiblePowers = allPowers;
    }

    const currentComputer = Player.coreComputer;
    const currentPower = Player.corePower;

    if (!action) {
      Msg.divider();
      Msg.add(`🔧 ${vehicleName} 改装服务`, 'info');
      Msg.info(`当前资金：${Player.credits}G`);
      Msg.divider();
      Msg.add('💻 核心计算机', 'info');
      if (currentComputer) {
        Msg.info(`  当前：<span class="item-tag core">${currentComputer.name}</span>（算力+${currentComputer.coreOutput} MFlops）`);
      } else {
        Msg.info('  当前：未安装');
      }
      if (compatibleComputers.length > 0) {
        compatibleComputers.forEach((comp, idx) => {
          const owned = currentComputer && currentComputer.id === comp.id;
          const upgradeTag = owned ? ' ✅已装备' : '';
          const canAfford = Player.credits >= comp.price ? '' : ' 🔒';
          Msg.info(`  ${idx+1}. <span class="item-tag core">${comp.name}</span> - 算力+${comp.coreOutput} MFlops - ${comp.price}G${upgradeTag}${canAfford}`);
        });
      } else {
        Msg.info('  暂无可用升级选项');
      }
      Msg.divider();
      Msg.add('⚡ 核心动力', 'info');
      if (currentPower) {
        Msg.info(`  当前：<span class="item-tag core">${currentPower.name}</span>（功率+${currentPower.coreOutput} kW）`);
      } else {
        Msg.info('  当前：未安装');
      }
      if (compatiblePowers.length > 0) {
        compatiblePowers.forEach((power, idx) => {
          const owned = currentPower && currentPower.id === power.id;
          const upgradeTag = owned ? ' ✅已装备' : '';
          const canAfford = Player.credits >= power.price ? '' : ' 🔒';
          Msg.info(`  ${idx+1}. <span class="item-tag core">${power.name}</span> - 功率+${power.coreOutput} kW - ${power.price}G${upgradeTag}${canAfford}`);
        });
      } else {
        Msg.info('  暂无可用升级选项');
      }
      Msg.divider();
      Msg.info('使用方法：upgrade computer <编号> 或 upgrade power <编号>');
      Msg.info('示例：upgrade computer 2 （升级到第2个计算机）');
      return;
    }

    const parts = action.split(' ');
    const type = parts[0];
    const num = parseInt(parts[1]);

    if (type === 'computer' || type === '计算机') {
      if (isNaN(num) || num < 1 || num > compatibleComputers.length) {
        Msg.error('无效的编号。输入 upgrade 查看可用选项。');
        return;
      }
      const target = compatibleComputers[num - 1];
      if (currentComputer && currentComputer.id === target.id) {
        Msg.warning('已经装备了该核心计算机。');
        return;
      }
      if (Player.credits < target.price) {
        Msg.danger(`资金不足！需要 ${target.price}G，当前 ${Player.credits}G`);
        return;
      }
      if (currentComputer) {
        Player.budget.computeMax -= currentComputer.coreOutput || 0;
      }
      Player.credits -= target.price;
      Player.coreComputer = { ...target };
      Player.budget.computeMax += target.coreOutput || 0;
      Msg.success(`💰 改装完成！安装了 <span class="item-tag core">${target.name}</span>，算力+${target.coreOutput} MFlops，花费 ${target.price}G`);
      Msg.info(`当前算力上限：${Player.budget.computeMax} MFlops`);
    } else if (type === 'power' || type === '动力') {
      if (isNaN(num) || num < 1 || num > compatiblePowers.length) {
        Msg.error('无效的编号。输入 upgrade 查看可用选项。');
        return;
      }
      const target = compatiblePowers[num - 1];
      if (currentPower && currentPower.id === target.id) {
        Msg.warning('已经装备了该核心动力。');
        return;
      }
      if (Player.credits < target.price) {
        Msg.danger(`资金不足！需要 ${target.price}G，当前 ${Player.credits}G`);
        return;
      }
      if (currentPower) {
        Player.budget.powerMax -= currentPower.coreOutput || 0;
      }
      Player.credits -= target.price;
      Player.corePower = { ...target };
      Player.budget.powerMax += target.coreOutput || 0;
      Msg.success(`💰 改装完成！安装了 <span class="item-tag core">${target.name}</span>，功率+${target.coreOutput} kW，花费 ${target.price}G`);
      Msg.info(`当前功率上限：${Player.budget.powerMax} kW`);
    } else {
      Msg.error('无效的改装类型。使用 upgrade computer 或 upgrade power。');
    }
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
    const timeStr = Timeline.time >= 3600
      ? `${Math.floor(Timeline.time / 3600)}小时${Math.floor((Timeline.time % 3600) / 60)}分${Math.floor(Timeline.time % 60)}秒`
      : `${Math.floor(Timeline.time / 60)}分${Math.floor(Timeline.time % 60)}秒`;
    Msg.add(`🗺 区域地图 <span style="color:var(--muted);font-weight:normal;font-size:0.8em;">[世界时间: ${timeStr}]</span>`, 'info');
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
          ['gather (采集)', '采集当前区域的资源点'],
          ['pick [物品名]', '拾取物品/资源'],
          ['score/stats', '查看任务统计'],
          ['clear', '清空屏幕'],
        ]
      },
      combat: {
        title: '⚔ 战斗指令',
        items: [
          ['move <方向/坐标>', '移动机体'],
          ['movepredict <x> <y>', '预测移动时间（mp）'],
          ['fire <目标> [槽]', '攻击目标（槽:#1/#2/all，默认all）'],
          ['reload <槽>', '手动装填弹药'],
          ['use <物品>', '使用物品（如修复装甲）'],
          ['wait [秒数]', '打断行动等待；无参数等待至下一事件'],
          ['cont/continue', '不打断动作等待冷却完成；移动中跳过开火'],
          ['look [目标]', '查看战场或指定目标'],
          ['call <目标>', '与 NPC 通信（需距离≤100m）'],
          ['timeline', '查看时间轴'],
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
          ['upgrade', '改装核心计算机/核心动力（维修站）'],
          ['工业 (industry)', '查看工业区与科技树'],
          ['安装 <设施ID> (install)', '安装工业设施'],
          ['使用设施 <设施ID>', '收集设施产出'],
          ['调度 <设施ID> [start|stop]', '调度设施运行状态'],
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
      credits: Player.credits,
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
    if (typeof TechTree !== 'undefined') data.techTree = TechTree.getState();
    if (typeof FacilitySystem !== 'undefined') data.facilities = FacilitySystem.getState();
    if (typeof SupplyDemand !== 'undefined') data.supplyDemand = SupplyDemand.getState();
    if (typeof QuotaSystem !== 'undefined') data.quota = QuotaSystem.getState();
    if (typeof QuestSystem !== 'undefined') data.quests = QuestSystem.getState();
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
        credits: data.credits || data.gold || 0, room: data.room,
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
      if (data.techTree && typeof TechTree !== 'undefined') TechTree.loadState(data.techTree);
      if (data.facilities && typeof FacilitySystem !== 'undefined') FacilitySystem.loadState(data.facilities);
      if (data.supplyDemand && typeof SupplyDemand !== 'undefined') SupplyDemand.loadState(data.supplyDemand);
      if (data.quota && typeof QuotaSystem !== 'undefined') QuotaSystem.loadState(data.quota);
      if (data.quests && typeof QuestSystem !== 'undefined') QuestSystem.loadState(data.quests);
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
    this.updateRegionMap();
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
      <div class="stat-row"><span class="stat-label">信用点</span><span class="stat-value gold">${Player.credits}G</span></div>
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
 
  updateRegionMap() {
    const canvas = document.getElementById('region-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellSize = 40;
    const gridSize = 11;
    const levelEl = document.getElementById('map-level-info');
    const legendEl = document.getElementById('minimap-legend');
    const currentRoom = MapSystem.getRoom(Player.room);
    if (!currentRoom) return;
    const currentZ = currentRoom.z || 0;
    if (levelEl) levelEl.textContent = `当前高度：${MapSystem.getLevelName(currentZ)}`;

    const roomsOnLevel = Object.values(MapSystem.rooms).filter(room => (room.z || 0) === currentZ);

    const roomAt = (x, y, z = currentZ) => roomsOnLevel.find(r => r.x === x && r.y === y && (r.z || 0) === z);

    // 地形颜色表
    const terrainColors = {
      metal_floor: '#2a3a4a',
      cave: '#2a2a2a',
      crystal: '#1a3a5a',
      sandy: '#4a3a2a',
      rocky: '#3a3a3a',
      default: '#1a2a1a'
    };

    // 获取房间特征图标
    const getRoomIcon = (room) => {
      if (room.isBossRoom) return '💀';
      if (room.isSafeZone) return '🏠';
      if (room.battlefield && room.battlefield.hazards && room.battlefield.hazards.length > 0) return '⚠';
      if (room.battlefield && room.battlefield.lootPoints && room.battlefield.lootPoints.length > 0) return '⛏';
      if (room.battlefield && room.battlefield.npcs && room.battlefield.npcs.length > 0) return '👤';
      return '';
    };

    // 检查房间是否有出口连接
    const hasExitTo = (room, dir) => {
      const deltas = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
      const [dx, dy] = deltas[dir];
      const neighbor = roomAt(room.x + dx, room.y + dy, currentZ);
      return Boolean(neighbor && room.exits[dir] === neighbor.id);
    };

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算当前层世界边界，用于将视口钳制在地图范围内（边缘紧贴画面边缘）
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const room of roomsOnLevel) {
      if (room.x !== undefined) {
        minX = Math.min(minX, room.x); maxX = Math.max(maxX, room.x);
        minY = Math.min(minY, room.y); maxY = Math.max(maxY, room.y);
      }
    }
    if (minX === Infinity) { minX = 0; maxX = gridSize - 1; minY = 0; maxY = gridSize - 1; }

    const half = Math.floor(gridSize / 2);
    // 视口左上角：以玩家为中心，但钳制到世界边界内，使地图边缘贴紧画面边缘
    const startX = Math.max(minX, Math.min(currentRoom.x - half, maxX - gridSize + 1));
    const startY = Math.max(minY, Math.min(currentRoom.y - half, maxY - gridSize + 1));

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const rx = startX + gx;
        const ry = startY + gy;
        const room = roomAt(rx, ry);
        const px = gx * cellSize;
        const py = gy * cellSize;

        if (room) {
          const visited = Player.visitedRooms.has(room.id);
          const terrain = room.terrain || 'default';
          const bgColor = terrainColors[terrain] || terrainColors.default;

          if (visited) {
            ctx.fillStyle = bgColor;
          } else {
            // 未探索：暗色
            ctx.fillStyle = '#0a0f0a';
          }
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // 当前房间高亮边框
          if (room.id === Player.room) {
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.lineWidth = 1;
          } else if (visited) {
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          }

          // 未探索房间不显示图标
          if (!visited) continue;

          // 绘制出口方向指示线
          const exitDirs = ['north', 'south', 'east', 'west'];
          const dirAngles = { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 };
          for (const dir of exitDirs) {
            if (hasExitTo(room, dir)) {
              const angle = dirAngles[dir];
              const edgeX = px + cellSize / 2 + Math.sin(angle) * (cellSize / 2 - 2);
              const edgeY = py + cellSize / 2 - Math.cos(angle) * (cellSize / 2 - 2);
              ctx.fillStyle = 'rgba(0,255,136,0.5)';
              ctx.beginPath();
              ctx.arc(edgeX, edgeY, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // 特征图标
          const icon = getRoomIcon(room);
          if (icon) {
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, px + cellSize / 2, py + cellSize / 2);
          }

          // 玩家位置标记
          if (room.id === Player.room) {
            const time = Date.now() / 1000;
            const alpha = 0.5 + 0.5 * Math.sin(time * 3);
            ctx.fillStyle = `rgba(0, 255, 204, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // 无房间的格子：深色
          ctx.fillStyle = '#050508';
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    // 图例
    if (legendEl) {
      legendEl.innerHTML = `@ 当前位置 | <span style="color:#00ffcc;">青色</span> 已探索 | <span style="color:#888;">暗色</span> 未探索 | 💀 Boss | 🏠 安全区 | ⚠ 危害 | ⛏ 资源`;
    }
  },
 
  updateLocation() {
    const room = MapSystem.getRoom(Player.room);
    const el = document.getElementById('location-info');
    if (room && el) {
      const exits = Object.keys(room.exits || {}).map(d => MapSystem.getDirectionName(d)).join('、');
      el.innerHTML = `<div style="color:var(--accent);font-weight:600;margin-bottom:0.3rem">${room.name}</div><div>高度: ${MapSystem.getLevelName(room.z || 0)}</div><div>位置: (${Math.round(Player.position[0])}, ${Math.round(Player.position[1])})</div><div>出口: ${exits}</div>`;
    }
  }
};
