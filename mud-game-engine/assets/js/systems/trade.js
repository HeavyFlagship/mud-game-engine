// ========== 交易系统 ==========
const TradeSystem = {
  showOrders(args) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || room.sceneType !== 'safe') {
      Msg.warning('交易中心仅在安全区可用。');
      return;
    }
    
    const filterItem = args[0] || null;
    const action = args[1] || null;
    
    const demandOrders = SupplyDemand.getDemandOrders();
    const supplyOrders = SupplyDemand.getSupplyOrders();
    
    if (filterItem) {
      // 按物品名称过滤
      const filterLower = filterItem.toLowerCase();
      const filteredDemand = demandOrders.filter(o => o.itemName.includes(filterItem) || o.itemId.includes(filterLower));
      const filteredSupply = supplyOrders.filter(o => o.itemName.includes(filterItem) || o.itemId.includes(filterLower));
      
      if (action === 'buy') {
        this._displayOrders('购买订单（组织出售）', filteredSupply, 'supply');
      } else if (action === 'sell') {
        this._displayOrders('收购订单（组织收购）', filteredDemand, 'demand');
      } else {
        Msg.divider();
        Msg.add(`🏪 交易中心 - ${filterItem}`, 'info');
        if (filteredSupply.length > 0) {
          Msg.add('── 购买订单（组织出售）──', 'info');
          this._displayOrderLines(filteredSupply, 'supply');
        }
        if (filteredDemand.length > 0) {
          Msg.add('── 收购订单（组织收购）──', 'info');
          this._displayOrderLines(filteredDemand, 'demand');
        }
        if (filteredSupply.length === 0 && filteredDemand.length === 0) {
          Msg.info('该物资暂无交易订单。');
        }
      }
    } else {
      Msg.divider();
      Msg.add('🏪 交易中心 - 赤穹中枢', 'info');
      
      // 按物品分组
      const allItems = new Set();
      for (const o of [...demandOrders, ...supplyOrders]) {
        allItems.add(o.itemId);
      }
      
      if (allItems.size === 0) {
        Msg.info('当前暂无交易订单。');
      } else {
        for (const itemId of allItems) {
          const itemDemand = demandOrders.find(o => o.itemId === itemId);
          const itemSupply = supplyOrders.find(o => o.itemId === itemId);
          const record = SupplyDemand.records[itemId];
          const statusText = record ? SupplyDemand.getStatusText(record.status) : '';
          
          let line = `  ${record?.itemName || itemId} [${statusText}]`;
          if (itemSupply) line += ` | 出售: ${itemSupply.unitPrice}G`;
          if (itemDemand) line += ` | 收购: ${itemDemand.unitPrice}G`;
          Msg.info(line);
        }
      }
      Msg.system('提示: trade <物资名称> 查看详情，trade buy/sell <物资> 交易');
    }
  },
  
  _displayOrders(title, orders, type) {
    Msg.divider();
    Msg.add(title, 'info');
    this._displayOrderLines(orders, type);
  },
  
  _displayOrderLines(orders, type) {
    // 排序：购买订单从低到高，出售订单从高到低
    const sorted = [...orders].sort((a, b) => {
      return type === 'supply' ? a.unitPrice - b.unitPrice : b.unitPrice - a.unitPrice;
    });
    
    for (const o of sorted) {
      const typeLabel = type === 'supply' ? '出售' : '收购';
      const priorityTag = o.priority === 'urgent' ? ' 🔴紧急' : (o.priority === 'priority' ? ' 🟡优先' : '');
      const limitTag = o.purchaseLimit ? ` (限购${o.purchaseLimit})` : '';
      Msg.info(`  ${o.sourceName} ${typeLabel} ${o.itemName} x${o.quantity} @${o.unitPrice}G${priorityTag}${limitTag}`);
    }
  },
  
  playerBuy(itemName, count = 1) {
    const item = this._findItem(itemName);
    if (!item) {
      Msg.error('未找到该物资。');
      return;
    }
    const result = SupplyDemand.playerBuy(item.id, count);
    if (result.ok) {
      Msg.success(`💰 购买了 ${result.itemName} x${count}，单价 ${result.unitPrice}G，共 ${result.totalPrice}G`);
    } else {
      Msg.error(result.reason);
    }
  },
  
  playerSell(itemName, count = 1) {
    const item = this._findItemInBag(itemName);
    if (!item) {
      Msg.error('背包中没有该物资。');
      return;
    }
    const actualCount = Math.min(count, item.count);
    const result = SupplyDemand.playerSell(item.id, actualCount);
    if (result.ok) {
      Msg.success(`💰 出售了 ${result.itemName} x${actualCount}，单价 ${result.unitPrice}G，共 ${result.totalPrice}G`);
    } else {
      Msg.error(result.reason);
    }
  },
  
  _findItem(itemName) {
    const lower = itemName.toLowerCase();
    let item = (typeof ItemDB !== 'undefined' ? ItemDB.get(lower) : null) || (typeof MaterialDB !== 'undefined' ? MaterialDB.get(lower) : null) || (typeof AmmoDB !== 'undefined' ? AmmoDB.get(lower) : null);
    if (item) return item;
    // 按名称搜索
    const dbs = [];
    if (typeof ItemDB !== 'undefined') dbs.push(ItemDB);
    if (typeof MaterialDB !== 'undefined') dbs.push(MaterialDB);
    if (typeof AmmoDB !== 'undefined') dbs.push(AmmoDB);
    for (const db of dbs) {
      for (const [id, entry] of Object.entries(db)) {
        if (typeof entry === 'object' && entry.name && entry.name.toLowerCase().includes(lower)) {
          return entry;
        }
      }
    }
    return null;
  },
  
  _findItemInBag(itemName) {
    const lower = itemName.toLowerCase();
    return Player.inventory.find(i => {
      const item = (typeof ItemDB !== 'undefined' ? ItemDB.get(i.id) : null) || (typeof MaterialDB !== 'undefined' ? MaterialDB.get(i.id) : null) || (typeof AmmoDB !== 'undefined' ? AmmoDB.get(i.id) : null);
      if (!item) return false;
      return item.name.toLowerCase().includes(lower) || i.id.toLowerCase() === lower;
    });
  }
};