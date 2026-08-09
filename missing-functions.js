// ========== 从 trae-demo 分支提取的缺失函数 ==========
// 来源: trade.js, facility.js, quest.js, quota.js, base-commands.js

// 1. showTrade - 交易中心 (来源: trade.js)
showTrade(args) {
  if (!args || args.length === 0) {
    this._showAllOrders();
    return;
  }

  const action = args[0].toLowerCase();

  if (action === 'buy') {
    if (args.length < 2) {
      Msg.info('用法: trade buy <物资名称> [数量]');
      return;
    }
    const itemName = args[1];
    const count = parseInt(args[2]) || 1;
    this._buyItem(itemName, count);
  } else if (action === 'sell') {
    if (args.length < 2) {
      Msg.info('用法: trade sell <物资名称> [数量]');
      return;
    }
    const itemName = args[1];
    const count = parseInt(args[2]) || 1;
    this._sellItem(itemName, count);
  } else {
    // 查看特定物资的订单
    this._showItemOrders(args.join(' '));
  }
},

// 2. showIndustry - 工业区 (来源: facility.js)
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

// 3. showQuests - 任务面板 (来源: quest.js)
showQuests() {
  Msg.divider();
  Msg.add('📜 任务面板', 'info');

  const mainQuests = Object.values(this.quests).filter(q => q.type === 'main');
  const sideQuests = Object.values(this.quests).filter(q => q.type === 'side');

  // 主线任务
  if (mainQuests.length > 0) {
    Msg.add('── 主线任务 ──', 'info');
    for (const q of mainQuests) {
      const statusIcon = this._getStatusIcon(q.status);
      const statusText = this._getStatusText(q.status);
      Msg.info(`  ${statusIcon} ${q.name} [${statusText}]`);
      if (q.status !== 'locked') {
        Msg.info(`    ${q.desc}`);
        if (q.status === 'active') {
          const pct = this._getProgressPct(q);
          Msg.info(`    进度: ${q.progress}/${q.objective.count} (${pct}%)`);
        }
        if (q.status === 'completed') {
          Msg.info(`    奖励: ${q.reward.gold}G ${q.reward.items.map(i => `${i.id} x${i.count}`).join(', ')}`);
        }
      }
    }
  }

  // 支线任务
  if (sideQuests.length > 0) {
    Msg.add('── 支线任务 ──', 'info');
    for (const q of sideQuests) {
      const statusIcon = this._getStatusIcon(q.status);
      const repeatableTag = q.repeatable ? ' [可重复]' : '';
      Msg.info(`  ${statusIcon} ${q.name}${repeatableTag} [${this._getStatusText(q.status)}]`);
      if (q.status === 'active') {
        Msg.info(`    进度: ${q.progress}/${q.objective.count}`);
      }
    }
  }

  Msg.system('提示: 任务进度自动追踪。可重复任务完成后自动重置。');
},

// 4. replenish - 配额补给 (来源: quota.js)
replenish(args) {
  this._checkDailyReset();

  if (!args || args.length === 0) {
    this._showQuota();
    return;
  }

  const itemName = args.join(' ');
  const quota = this._findQuota(itemName);
  if (!quota) {
    Msg.info(`该物资不在配额补给范围内。`);
    this._showQuota();
    return;
  }

  if (quota.remaining <= 0) {
    Msg.warning(`${quota.name} 今日配额已用完。请在交易中心购买。`);
    return;
  }

  // 补给1单位
  const count = Math.min(1, quota.remaining);
  quota.remaining -= count;
  Player.addItem(quota.itemId, count);

  const item = (typeof AmmoDB !== 'undefined' && AmmoDB.get(quota.itemId)) ||
              (typeof ItemDB !== 'undefined' && ItemDB.get(quota.itemId));
  const displayName = item ? item.name : quota.name;
  Msg.success(`📋 配额补给: 获得 ${count} 个${displayName}。`);
  Msg.info(`  今日剩余配额: ${quota.remaining}/${quota.dailyLimit}`);
},

// 5. backup - 意识备份 (来源: base-commands.js)
// 注: trae-demo 中该函数为占位实现，尚未完成完整功能
backup() {
  Msg.info('意识备份系统尚未开放。');
},

// 6. useFacility - 使用设施 (来源: facility.js)
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

// 7. installFacility - 安装设施 (来源: facility.js)
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

// 8. scheduleFacility - 调度设施 (来源: facility.js)
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