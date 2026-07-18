// ========== 地图系统 ==========
const MapSystem = {
  rooms: {},
  areas: [],
  // 增量变更记录：只保存对原始地图数据的修改，避免存整个地图。
  // 格式: { roomId: { removedItems: [itemId, ...], addedItems: [itemId, ...] } }
  changes: {},

  init() {
    // 使用深拷贝，避免拾取物品等运行时改动污染原始地图数据。
    this.rooms = JSON.parse(JSON.stringify(MapDB.rooms));
    this.areas = JSON.parse(JSON.stringify(MapDB.areas));
    for (const room of Object.values(this.rooms)) {
      if (room.z === undefined) room.z = 0;
      if (!room.label) room.label = room.name.slice(0, 1);
    }
  },

  // 应用增量变更到当前运行时地图。读档时调用。
  applyChanges(savedChanges) {
    if (!savedChanges) return;
    this.changes = JSON.parse(JSON.stringify(savedChanges));
    for (const [roomId, change] of Object.entries(this.changes)) {
      const room = this.rooms[roomId];
      if (!room) continue;
      // 移除已拾取的物品
      if (change.removedItems && room.items) {
        for (const itemId of change.removedItems) {
          const idx = room.items.indexOf(itemId);
          if (idx !== -1) room.items.splice(idx, 1);
        }
      }
      // 添加丢弃的物品
      if (change.addedItems) {
        if (!room.items) room.items = [];
        for (const itemId of change.addedItems) {
          room.items.push(itemId);
        }
      }
    }
  },

  // 记录地图增量变更。type: 'remove' | 'add'
  recordChange(roomId, type, itemId) {
    if (!this.changes[roomId]) this.changes[roomId] = { removedItems: [], addedItems: [] };
    if (type === 'remove') {
      this.changes[roomId].removedItems.push(itemId);
    } else if (type === 'add') {
      this.changes[roomId].addedItems.push(itemId);
    }
  },

  getRoom(id) {
    const room = this.rooms[id];
    if (room && room.z === undefined) room.z = 0;
    return room;
  },

  getRoomLabel(room) {
    return room.label || room.name.slice(0, 1);
  },

  getDirectionName(dir) {
    const names = { north:'北方', south:'南方', east:'东方', west:'西方', up:'上方', down:'下方' };
    return names[dir] || dir;
  },

  getLevelName(z) {
    if (z === 0) return '地表';
    if (z < 0) return `地下 ${Math.abs(z)} 层`;
    return `高处 ${z} 层`;
  }
};
