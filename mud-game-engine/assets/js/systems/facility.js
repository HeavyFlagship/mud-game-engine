// ========== 工业设施系统 ==========
const FacilitySystem = {
  facilities: {},

  init() {
    this.facilities = {};
  },

  canInstall(facilityId, baseRoomId) {
    const def = FacilityDB[facilityId];
    if (!def) return { ok: false, reason: '设施数据不存在。' };

    // Check tech tree
    if (!TechTree.isNodeUnlocked(def.requiresNode)) {
      return { ok: false, reason: `科技树节点未解锁，需要先解锁 ${def.requiresNode}。` };
    }

    // Check industry zone area
    const room = MapSystem.getRoom(baseRoomId);
    if (!room || !room.industryZone) {
      return { ok: false, reason: '该基地没有工业区。' };
    }

    const zone = room.industryZone;
    if (zone.areaUsed + def.footprint > zone.area) {
      return { ok: false, reason: `工业区面积不足（需要 ${def.footprint}m²，剩余 ${zone.area - zone.areaUsed}m²）。` };
    }

    // Check material cost
    const cost = def.installCost || [];
    for (const c of cost) {
      const hasItem = Player.inventory.find(i => i.id === c.id && i.count >= c.count);
      if (!hasItem) {
        return { ok: false, reason: `安装物资不足，需要 ${c.name} x${c.count}。` };
      }
    }

    return { ok: true };
  },

  install(facilityId, baseRoomId) {
    const check = this.canInstall(facilityId, baseRoomId);
    if (!check.ok) {
      Msg.error(check.reason);
      return false;
    }

    const def = FacilityDB[facilityId];
    const room = MapSystem.getRoom(baseRoomId);

    // Consume materials
    for (const c of (def.installCost || [])) {
      Player.removeItem(c.id, c.count);
    }

    // Create facility instance
    const instanceId = `${facilityId}_${Date.now()}`;
    const facility = {
      ...def,
      instanceId,
      isBuilt: true,
      isRunning: true,
      isDamaged: false,
      ownership: 'player',
      location: baseRoomId,
      storage: {},
      installedAt: Timeline.time || 0
    };

    // Add to room
    if (!room.industryZone.facilities) room.industryZone.facilities = [];
    room.industryZone.facilities.push(instanceId);
    room.industryZone.areaUsed += def.footprint;

    this.facilities[instanceId] = facility;

    Msg.success(`✅ 安装完成！${def.name} 已在 ${room.name} 开始运行。`);
    if (def.newsText) {
      Msg.info(`📰 ${def.newsText}`);
    }

    return true;
  },

  // Update facility production (called every game tick)
  update(deltaTime) {
    for (const [id, facility] of Object.entries(this.facilities)) {
      if (!facility.isRunning || facility.isDamaged) continue;

      // Calculate production amount for this tick
      const hours = deltaTime / 3600;
      const outputAmount = facility.outputRate * hours;
      const inputAmount = facility.inputRate * hours;

      // Check storage limit
      const currentStorage = facility.storage[facility.outputItemId] || 0;
      if (currentStorage >= facility.storageLimit) {
        continue;
      }

      // Check input materials from warehouse
      if (facility.inputItemId) {
        const whItem = Player.warehouse.find(w => w.id === facility.inputItemId);
        if (!whItem || whItem.count < inputAmount) {
          // Not enough input, pause
          if (facility.isRunning) {
            facility.isRunning = false;
            Msg.info(`⚠ ${facility.name}：原材料不足，已暂停运行。`);
          }
          continue;
        }
        whItem.count -= inputAmount;
        if (whItem.count <= 0) {
          Player.warehouse = Player.warehouse.filter(w => w !== whItem);
        }
      }

      // Produce output
      const actualOutput = Math.min(outputAmount, facility.storageLimit - currentStorage);
      facility.storage[facility.outputItemId] = (facility.storage[facility.outputItemId] || 0) + actualOutput;

      // Auto-deposit to warehouse if outputTarget is warehouse
      if (facility.outputTarget === 'warehouse' && facility.storage[facility.outputItemId] >= 1) {
        const count = Math.floor(facility.storage[facility.outputItemId]);
        const existing = Player.warehouse.find(w => w.id === facility.outputItemId);
        if (existing) {
          existing.count += count;
        } else {
          Player.warehouse.push({ id: facility.outputItemId, count });
        }
        facility.storage[facility.outputItemId] -= count;
      }

      // Try to unlock tech tree node
      if (facility.unlocksNode) {
        TechTree.tryUnlockNode(facility.unlocksNode);
      }
    }
  },

  getState() {
    return { facilities: this.facilities };
  },

  loadState(state) {
    if (state && state.facilities) {
      this.facilities = state.facilities;
    }
  }
};