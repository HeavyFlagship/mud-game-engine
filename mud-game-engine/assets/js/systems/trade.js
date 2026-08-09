// ========== 交易中心 ==========
// 对应设计文档：经济系统设计书 §4
const TradeSystem = {
  // 供需订单（组织订单）
  orders: [],

  init() {
    this.orders = [];
    this._generateDefaultOrders();
  },

  _generateDefaultOrders() {
    // 生成组织需求订单（收购物资）
    this._addOrgDemandOrder('iron_ore', '铁矿石', 500, 5, 8, 'normal');
    this._addOrgDemandOrder('copper_ore', '铜矿石', 300, 6, 10, 'normal');
    this._addOrgDemandOrder('chitin_fragment', '虫壳碎片', 200, 6, 10, 'normal');
    this._addOrgDemandOrder('mech_parts', '机械零件', 150, 15, 25, 'normal');
    this._addOrgDemandOrder('alloy_fragment', '合金碎片', 100, 25, 40, 'normal');
    this._addOrgDemandOrder('germanite_shard', '辉锗矿碎片', 50, 50, 80, 'priority');

    // 生成组织供应订单（出售物资）
    this._addOrgSupplyOrder('repair_kit_small', '小型修复包', 50, 30, 25, null);
    this._addOrgSupplyOrder('armor_patch', '装甲补片', 30, 25, 20, null);
    this._addOrgSupplyOrder('20mm_ap', '20mm穿甲弹', 200, 2, 2, 50);
    this._addOrgSupplyOrder('gunpowder', '火药', 100, 10, 8, null);
    this._addOrgSupplyOrder('propellant', '推进剂', 80, 15, 12, null);
    this._addOrgSupplyOrder('shell_casing', '弹壳', 150, 3, 2, null);
  },

  _addOrgDemandOrder(itemId, itemName, quantity, basePrice, currentPrice, priority) {
    const orderId = `org_demand_${itemId}_001`;
    this.orders.push({
      orderId, type: 'demand', source: 'organization', sourceName: '赤穹中枢',
      itemId, itemName, quantity, unitPrice: currentPrice, basePrice,
      priceFluctuation: `+${((currentPrice / basePrice - 1) * 100).toFixed(0)}%`,
      priority, purchaseLimit: null, advancesDevelopment: true,
    });
  },

  _addOrgSupplyOrder(itemId, itemName, quantity, basePrice, currentPrice, purchaseLimit) {
    const orderId = `org_supply_${itemId}_001`;
    this.orders.push({
      orderId, type: 'supply', source: 'organization', sourceName: '赤穹中枢',
      itemId, itemName, quantity, unitPrice: currentPrice, basePrice,
      priceFluctuation: `${((currentPrice / basePrice - 1) * 100).toFixed(0)}%`,
      priority: 'normal', purchaseLimit,
    });
  },

  // 显示交易中心
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

  _showAllOrders() {
    Msg.divider();
    Msg.add('🏪 交易中心 - 赤穹中枢', 'info');

    // 按物资分组
    const grouped = {};
    for (const order of this.orders) {
      if (!grouped[order.itemId]) grouped[order.itemId] = { demand: [], supply: [] };
      grouped[order.itemId][order.type].push(order);
    }

    for (const [itemId, orders] of Object.entries(grouped)) {
      const item = orders.demand[0] || orders.supply[0];
      const statusText = typeof SupplyDemand !== 'undefined' ? SupplyDemand.getStatusText(itemId) : '';
      Msg.info(`── ${item.itemName} ${statusText ? `[${statusText}]` : ''} ──`);

      // 需求订单（收购）
      for (const o of orders.demand) {
        const priorityTag = o.priority === 'urgent' ? ' 🔴紧急' : (o.priority === 'priority' ? ' 🟡优先' : '');
        Msg.info(`  收购: ${o.sourceName} | 数量:${o.quantity} | 单价:${o.unitPrice}G | ${o.priceFluctuation}${priorityTag}`);
      }

      // 供应订单（出售）
      for (const o of orders.supply) {
        const limitStr = o.purchaseLimit ? ` 限购${o.purchaseLimit}` : '';
        Msg.info(`  出售: ${o.sourceName} | 数量:${o.quantity} | 单价:${o.unitPrice}G | ${o.priceFluctuation}${limitStr}`);
      }
    }

    Msg.system('提示: trade buy <物资名称> [数量] 购买, trade sell <物资名称> [数量] 出售');
  },

  _showItemOrders(itemName) {
    const orders = this.orders.filter(o => o.itemName === itemName || o.itemId === itemName);
    if (orders.length === 0) {
      Msg.info(`没有找到物资 "${itemName}" 的交易订单。`);
      return;
    }

    Msg.divider();
    Msg.add(`📋 ${orders[0].itemName} 交易订单`, 'info');

    const statusText = typeof SupplyDemand !== 'undefined' ? SupplyDemand.getStatusText(orders[0].itemId) : '';
    if (statusText) Msg.info(`供需状态: ${statusText}`);

    for (const o of orders) {
      const typeLabel = o.type === 'demand' ? '📥 收购' : '📤 出售';
      const limitStr = o.purchaseLimit ? ` 限购${o.purchaseLimit}` : '';
      Msg.info(`  ${typeLabel}: ${o.sourceName} | 数量:${o.quantity} | 单价:${o.unitPrice}G${limitStr}`);
    }
  },

  _buyItem(itemName, count) {
    const order = this.orders.find(o => o.type === 'supply' && (o.itemName === itemName || o.itemId === itemName));
    if (!order) {
      Msg.error(`交易中心没有出售 "${itemName}"。`);
      return;
    }

    if (order.purchaseLimit && count > order.purchaseLimit) {
      Msg.warning(`单次限购 ${order.purchaseLimit} 个。`);
      count = order.purchaseLimit;
    }

    const totalCost = order.unitPrice * count;
    if (Player.gold < totalCost) {
      Msg.error(`资金不足！需要 ${totalCost}G，当前 ${Player.gold}G。`);
      return;
    }

    Player.gold -= totalCost;
    Player.addItem(order.itemId, count);
    order.quantity -= count;

    // 减少储备量
    if (typeof SupplyDemand !== 'undefined') {
      SupplyDemand.deductReserve(order.itemId, count);
    }

    Msg.success(`💰 购买了 ${count} 个${order.itemName}，花费 ${totalCost}G。`);
    if (order.quantity <= 0) {
      Msg.system(`⚠ ${order.itemName} 暂时售罄。`);
    }
  },

  _sellItem(itemName, count) {
    const order = this.orders.find(o => o.type === 'demand' && (o.itemName === itemName || o.itemId === itemName));
    if (!order) {
      Msg.error(`交易中心没有收购 "${itemName}" 的订单。`);
      return;
    }

    // 检查玩家背包
    const bagItem = Player.inventory.find(i => i.id === order.itemId);
    const available = bagItem ? bagItem.count : 0;
    if (available < count) {
      Msg.error(`背包中 ${order.itemName} 不足！需要 ${count} 个，当前 ${available} 个。`);
      return;
    }

    // 扣除背包物品
    bagItem.count -= count;
    if (bagItem.count <= 0) {
      const idx = Player.inventory.indexOf(bagItem);
      Player.inventory.splice(idx, 1);
    }

    const totalEarned = order.unitPrice * count;
    Player.gold += totalEarned;
    order.quantity -= count;

    // 增加储备量
    if (typeof SupplyDemand !== 'undefined') {
      SupplyDemand.addReserve(order.itemId, count);
    }

    Msg.success(`💰 出售了 ${count} 个${order.itemName}，获得 ${totalEarned}G。`);
  },

  // 更新订单价格（基于供需状态）
  updatePrices() {
    if (typeof SupplyDemand === 'undefined') return;
    for (const order of this.orders) {
      const modifier = SupplyDemand.getPriceModifier(order.itemId);
      order.unitPrice = Math.round(order.basePrice * modifier);
      const pct = ((modifier - 1) * 100).toFixed(0);
      order.priceFluctuation = (pct >= 0 ? '+' : '') + pct + '%';
    }
  },

  // 序列化
  getState() {
    return JSON.parse(JSON.stringify(this.orders));
  },

  // 恢复状态
  applyState(state) {
    if (!state) return;
    this.orders = state;
  },
};