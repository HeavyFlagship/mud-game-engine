// ========== 生产设施系统 ==========
// 对应设计文档：制造生产系统设计书 §3
const FacilitySystem = {
  // 已安装设施：{ facilityId, instanceId, isRunning, storage, installedAt }
  installations: [],

  // 基地工业区
  industryArea: {
    totalArea: 2000,   // 总面积 m²
    usedArea: 0,       // 已用面积
    location: 'outpost_hub',
  },

  init() {
    this.installations = [];
    this.industryArea = {
      totalArea: 2000,
      usedArea: 0,
      location: 'outpost_hub',
    };
  },

  // 获取设施定义
  getFacilityDef(facilityId) {
    return typeof FacilityDB !== 'undefined' ? FacilityDB.get(facilityId) : null;
  },

  // 查找已安装设施
  findInstallation(facilityId) {
    return this.installations.find(f => f.facilityId === facilityId);
  },

  // 检查是否可以安装
  canInstall(facilityId) {
    const def = this.getFacilityDef(facilityId);
    if (!def) {
      Msg.error(`未知设施类型: ${facilityId}`);
      return false;
    }

    // 检查开发树节点是否解锁
    const nodeId = this._getRequiredNode(facilityId);
    if (nodeId && typeof TechTree !== 'undefined' && !TechTree.isUnlocked(nodeId)) {
      Msg.error(`需要先解锁开发树节点才能建造此设施。`);
      return false;
    }

    // 检查工业区面积
    if (this.industryArea.usedArea + def.footprint > this.industryArea.totalArea) {
      Msg.error(`工业区面积不足！需要 ${def.footprint}m²，剩余 ${this.industryArea.totalArea - this.industryArea.usedArea}m²。`);
      return false;
    }

    // 检查安装物资
    if (def.installCost) {
      for (const cost of def.installCost) {
        const item = Player.inventory.find(i => i.id === cost.itemId);
        const available = item ? item.count : 0;
        // 也检查仓库
        const wh = Player.warehouse ? Player.warehouse.find(w => w.id === cost.itemId) : null;
        const whCount = wh ? wh.count : 0;
        if (available + whCount < cost.count) {
          const itemName = (typeof MaterialDB !== 'undefined' && MaterialDB.get(cost.itemId)) ? MaterialDB.get(cost.itemId).name : cost.itemId;
          Msg.error(`安装物资不足：需要 ${cost.count} 个${itemName}，当前拥有 ${available + whCount} 个。`);
          return false;
        }
      }
    }

    return true;
  },

  // 安装设施
  installFacility(args) {
    if (!args || args.length === 0) {
      this.showInstallable();
      return;
    }

    const facilityId = args[0];
    const def = this.getFacilityDef(facilityId);
    if (!def) {
      Msg.error(`未知设施类型: ${facilityId}。输入 安装 查看可安装设施列表。`);
      return;
    }

    // 检查是否已安装
    if (this.findInstallation(facilityId)) {
      Msg.warning(`已安装过 ${def.name}。`);
      return;
    }

    // 检查是否可以安装
    if (!this.canInstall(facilityId)) return;

    // 消耗安装物资
    if (def.installCost) {
      for (const cost of def.installCost) {
        this._consumeItem(cost.itemId, cost.count);
      }
    }

    // 创建设施实例
    const instance = {
      facilityId: def.facilityId,
      instanceId: `fac_${def.facilityId}_${Date.now()}`,
      isRunning: true,
      storage: 0,          // 当前产出库存
      storageLimit: def.storageLimit,
      installedAt: Date.now(),
      lastProducedAt: Date.now(),
    };

    this.installations.push(instance);
    this.industryArea.usedArea += def.footprint;

    Msg.success(`🏭 成功安装 ${def.name}！`);
    Msg.system(`  → 占地面积: ${def.footprint}m²`);
    Msg.system(`  → 工业区剩余面积: ${this.industryArea.totalArea - this.industryArea.usedArea}m²`);
    Msg.system(`  → 设施已开始运行，输入 ${def.inputItemId} → ${def.outputItemId}`);
    Msg.system(`  → 输入 工业 查看当前工业区状态`);
  },

  // 显示可安装设施列表
  showInstallable() {
    const allFacilities = typeof FacilityDB !== 'undefined' ? FacilityDB.getAll() : [];
    if (allFacilities.length === 0) {
      Msg.info('没有可安装的设施。');
      return;
    }

    Msg.divider();
    Msg.add('🏭 可安装设施', 'info');
    Msg.info(`工业区面积: ${this.industryArea.usedArea}/${this.industryArea.totalArea}m² (剩余 ${this.industryArea.totalArea - this.industryArea.usedArea}m²)`);

    for (const def of allFacilities) {
      const installed = this.findInstallation(def.facilityId);
      const nodeId = this._getRequiredNode(def.facilityId);
      const nodeUnlocked = !nodeId || (typeof TechTree !== 'undefined' && TechTree.isUnlocked(nodeId));
      const hasSpace = this.industryArea.usedArea + def.footprint <= this.industryArea.totalArea;

      let status = '';
      if (installed) {
        status = ' ✅已安装';
      } else if (!nodeUnlocked) {
        status = ' 🔒需解锁开发树';
      } else if (!hasSpace) {
        status = ' ⚠面积不足';
      }

      const costStr = def.installCost ? def.installCost.map(c => `${c.itemId} x${c.count}`).join(', ') : '无';
      Msg.info(`  <span class="help-cmd">${def.facilityId}</span> - ${def.name}${status}`);
      Msg.info(`    占地: ${def.footprint}m² | 产出: ${def.outputItemId}(${def.outputRate}/h) | 消耗: ${def.inputItemId}(${def.inputRate}/h)`);
      Msg.info(`    安装成本: ${costStr}`);
    }
    Msg.system('输入 安装 <设施ID> 安装设施');
  },

  // 显示工业区状态
  showIndustry() {
    Msg.divider();
    Msg.add('🏭 工业区状态', 'info');
    Msg.info(`基地: 赤穹中枢`);
    Msg.info(`工业区面积: ${this.industryArea.usedArea}/${this.industryArea.totalArea}m² (${((this.industryArea.usedArea / this.industryArea.totalArea) * 100).toFixed(1)}%)`);

    if (this.installations.length === 0) {
      Msg.system('当前无已安装设施。输入 安装 查看可安装设施列表。');
    } else {
      Msg.info(`已安装设施: ${this.installations.length} 个`);
      for (const inst of this.installations) {
        const def = this.getFacilityDef(inst.facilityId);
        if (!def) continue;
        const status = inst.isRunning ? '🟢 运行中' : '🔴 已暂停';
        const storageStr = def.storageLimit > 0 ? `${inst.storage}/${def.storageLimit}` : `${inst.storage}`;
        Msg.info(`  ${def.name} [${status}]`);
        Msg.info(`    占地: ${def.footprint}m² | 产出: ${def.outputItemId}(${def.outputRate}/h) | 库存: ${storageStr}`);
        Msg.info(`    消耗: ${def.inputItemId}(${def.inputRate}/h)`);
      }
    }
  },

  // 使用设施
  useFacility(args) {
    if (!args || args.length === 0) {
      this.showIndustry();
      return;
    }

    const facilityId = args[0];
    const inst = this.findInstallation(facilityId);
    if (!inst) {
      Msg.error(`未找到设施: ${facilityId}。输入 工业 查看已安装设施。`);
      return;
    }

    const def = this.getFacilityDef(facilityId);
    if (!def) return;

    // 取出产出
    if (inst.storage > 0) {
      const outputItem = (typeof MaterialDB !== 'undefined') ? MaterialDB.get(def.outputItemId) : null;
      const itemName = outputItem ? outputItem.name : def.outputItemId;
      const count = inst.storage;
      inst.storage = 0;
      Player.addItem(def.outputItemId, count);
      Msg.success(`从 ${def.name} 取出了 ${count} 个${itemName}。`);
    } else {
      Msg.info(`${def.name} 暂无产出库存。`);
    }

    // 尝试解锁开发树节点（如果产出物品满足条件）
    this._checkTechTreeUnlock(def.outputItemId);
  },

  // 调度设施
  scheduleFacility(args) {
    if (!args || args.length === 0) {
      this.showIndustry();
      Msg.system('输入 调度 <设施ID> [start/stop] 控制设施运行。');
      return;
    }

    const facilityId = args[0];
    const action = args[1] || 'status';

    const inst = this.findInstallation(facilityId);
    if (!inst) {
      Msg.error(`未找到设施: ${facilityId}`);
      return;
    }

    const def = this.getFacilityDef(facilityId);
    if (!def) return;

    if (action === 'start') {
      if (inst.isRunning) {
        Msg.info(`${def.name} 已在运行中。`);
      } else {
        inst.isRunning = true;
        Msg.success(`${def.name} 已恢复运行。`);
      }
    } else if (action === 'stop') {
      if (!inst.isRunning) {
        Msg.info(`${def.name} 已处于暂停状态。`);
      } else {
        inst.isRunning = false;
        Msg.info(`${def.name} 已暂停运行。`);
      }
    } else {
      const status = inst.isRunning ? '运行中' : '已暂停';
      Msg.info(`${def.name}: ${status}`);
      Msg.info(`  产出库存: ${inst.storage}/${def.storageLimit}`);
    }
  },

  // 每秒更新（游戏时间推进）
  update(deltaSeconds) {
    for (const inst of this.installations) {
      if (!inst.isRunning) continue;

      const def = this.getFacilityDef(inst.facilityId);
      if (!def) continue;

      // 检查库存是否已满
      if (inst.storage >= def.storageLimit) continue;

      // 检查原材料
      const inputAvailable = this._getInputAvailability(def.inputItemId);
      if (inputAvailable <= 0) {
        // 原材料不足，自动暂停
        if (inst.isRunning) {
          Msg.warn(`${def.name} 原材料不足，已自动暂停。`);
          inst.isRunning = false;
        }
        continue;
      }

      // 计算产出量（按小时速率换算为秒）
      const hourlyFraction = deltaSeconds / 3600;
      const productionAmount = Math.min(
        def.outputRate * hourlyFraction,
        (def.storageLimit - inst.storage) / def.outputRate * def.outputRate,
        inputAvailable * (def.outputRate / def.inputRate)
      );

      if (productionAmount < 0.001) continue;

      // 消耗原材料
      const inputConsumed = productionAmount * (def.inputRate / def.outputRate);
      this._consumeInput(def.inputItemId, inputConsumed);

      // 增加产出
      inst.storage += productionAmount;
      inst.lastProducedAt = Date.now();
    }
  },

  // 获取原材料可用量
  _getInputAvailability(itemId) {
    let total = 0;
    // 检查背包
    const bagItem = Player.inventory.find(i => i.id === itemId);
    if (bagItem) total += bagItem.count;
    // 检查仓库
    const whItem = Player.warehouse ? Player.warehouse.find(w => w.id === itemId) : null;
    if (whItem) total += whItem.count;
    return total;
  },

  // 消耗原材料（优先从仓库，再背包）
  _consumeInput(itemId, amount) {
    let remaining = amount;
    // 先从仓库消耗
    if (Player.warehouse) {
      const whItem = Player.warehouse.find(w => w.id === itemId);
      if (whItem) {
        const consumed = Math.min(remaining, whItem.count);
        whItem.count -= consumed;
        remaining -= consumed;
        if (whItem.count <= 0) {
          const idx = Player.warehouse.indexOf(whItem);
          Player.warehouse.splice(idx, 1);
        }
      }
    }
    // 再从背包消耗
    if (remaining > 0) {
      const bagItem = Player.inventory.find(i => i.id === itemId);
      if (bagItem) {
        bagItem.count -= Math.ceil(remaining);
        if (bagItem.count <= 0) {
          const idx = Player.inventory.indexOf(bagItem);
          Player.inventory.splice(idx, 1);
        }
      }
    }
  },

  // 消耗物品（安装用）
  _consumeItem(itemId, count) {
    let remaining = count;
    // 先从背包消耗
    for (let i = Player.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      const item = Player.inventory[i];
      if (item.id === itemId) {
        const consumed = Math.min(remaining, item.count);
        item.count -= consumed;
        remaining -= consumed;
        if (item.count <= 0) {
          Player.inventory.splice(i, 1);
        }
      }
    }
    // 再从仓库消耗
    if (remaining > 0 && Player.warehouse) {
      for (let i = Player.warehouse.length - 1; i >= 0 && remaining > 0; i--) {
        const item = Player.warehouse[i];
        if (item.id === itemId) {
          const consumed = Math.min(remaining, item.count);
          item.count -= consumed;
          remaining -= consumed;
          if (item.count <= 0) {
            Player.warehouse.splice(i, 1);
          }
        }
      }
    }
  },

  // 检查开发树解锁
  _checkTechTreeUnlock(outputItemId) {
    if (typeof TechTree === 'undefined') return;
    // 检查所有节点
    for (const nodeId of Object.keys(TechTree.nodes)) {
      const node = TechTree.nodes[nodeId];
      if (!node || node.isUnlocked) continue;
      if (node.requiredItem === outputItemId && TechTree.checkPlayerUnlock(nodeId)) {
        Msg.system(`🔓 开发树节点 "${node.name}" 解锁条件已满足！输入 工业 查看详情。`);
      }
    }
  },

  // 获取设施所需开发树节点
  _getRequiredNode(facilityId) {
    const map = {
      'furnace_small': 'iron_ore_node',
      'blast_furnace_small': 'iron_ingot_node',
      'armor_factory_small': 'steel_ingot_node',
    };
    return map[facilityId] || null;
  },

  // 序列化
  getState() {
    return {
      installations: JSON.parse(JSON.stringify(this.installations)),
      industryArea: { ...this.industryArea },
    };
  },

  // 恢复状态
  applyState(state) {
    if (!state) return;
    this.installations = state.installations || [];
    this.industryArea = state.industryArea || { totalArea: 2000, usedArea: 0, location: 'outpost_hub' };
  },
};