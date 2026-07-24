// ========== 地图系统 ==========
const MapSystem = {
  rooms: {},
  areas: [],
  changes: {},
  battlefieldState: {},
 
  init() {
    this.rooms = JSON.parse(JSON.stringify(MapDB.rooms));
    this.areas = JSON.parse(JSON.stringify(MapDB.areas));
    for (const room of Object.values(this.rooms)) {
      if (room.z === undefined) room.z = 0;
      if (!room.label) room.label = room.name.slice(0, 1);
      if (room.battlefield) {
        room.battlefield.size = room.battlefield.size || [1000, 1000];
        room.battlefield.terrain = room.battlefield.terrain || 'flat';
        room.battlefield.covers = room.battlefield.covers || [];
        room.battlefield.hazards = room.battlefield.hazards || [];
        room.battlefield.enemies = room.battlefield.enemies || [];
        room.battlefield.lootPoints = room.battlefield.lootPoints || [];
        if (!room.battlefield.entryPoints) {
          room.battlefield.entryPoints = {
            north: [500, 50], south: [500, 950],
            east: [950, 500], west: [50, 500]
          };
        }
      }
    }
    this.battlefieldState = {};
  },
 
  applyChanges(savedChanges) {
    if (!savedChanges) return;
    this.changes = JSON.parse(JSON.stringify(savedChanges));
    for (const [roomId, change] of Object.entries(this.changes)) {
      const room = this.rooms[roomId];
      if (!room) continue;
      if (change.removedItems && room.items) {
        for (const itemId of change.removedItems) {
          const idx = room.items.indexOf(itemId);
          if (idx !== -1) room.items.splice(idx, 1);
        }
      }
      if (change.addedItems) {
        if (!room.items) room.items = [];
        for (const itemId of change.addedItems) {
          room.items.push(itemId);
        }
      }
      if (change.killedEnemies && this.battlefieldState[roomId]) {
        for (const eid of change.killedEnemies) {
          const state = this.battlefieldState[roomId];
          state.enemies = state.enemies.filter(e => e.instanceId !== eid);
        }
      }
    }
  },
 
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
  },
 
  getOppositeDirection(dir) {
    const map = { north:'south', south:'north', east:'west', west:'east', up:'down', down:'up' };
    return map[dir] || 'south';
  },
 
  initBattlefield(roomId, entryDir, prevPos = null) {
    const room = this.getRoom(roomId);
    if (!room || !room.battlefield) return null;

    if (this.battlefieldState[roomId]) {
      return this.battlefieldState[roomId];
    }

    const bf = room.battlefield;
    const [bw, bh] = bf.size || [1000, 1000];
    const state = {
      roomId,
      size: [bw, bh],
      terrain: bf.terrain,
      terrainPenalty: bf.terrainPenalty || {},
      covers: JSON.parse(JSON.stringify(bf.covers || [])),
      hazards: JSON.parse(JSON.stringify(bf.hazards || [])),
      lootPoints: JSON.parse(JSON.stringify(bf.lootPoints || [])),
      enemies: [],
      npcs: [],
      patrolTimers: [],
      time: 0
    };

    let entryPos = [500, 500];
    if (prevPos && entryDir) {
      const margin = 50;
      if (entryDir === 'north') {
        entryPos = [Utils.clamp(prevPos[0], margin, bw - margin), margin];
      } else if (entryDir === 'south') {
        entryPos = [Utils.clamp(prevPos[0], margin, bw - margin), bh - margin];
      } else if (entryDir === 'east') {
        entryPos = [bw - margin, Utils.clamp(prevPos[1], margin, bh - margin)];
      } else if (entryDir === 'west') {
        entryPos = [margin, Utils.clamp(prevPos[1], margin, bh - margin)];
      }
    } else if (entryDir && bf.entryPoints && bf.entryPoints[entryDir]) {
      entryPos = [...bf.entryPoints[entryDir]];
    }
    state.entryPos = entryPos;

    if (room.npcs && room.npcs.length > 0) {
      const npcCount = room.npcs.length;
      const spacing = Math.min(200, Math.floor(800 / (npcCount + 1)));
      const startX = 500 - ((npcCount - 1) * spacing) / 2;
      room.npcs.forEach((nid, idx) => {
        const npc = NPCDB[nid];
        if (!npc) return;
        state.npcs.push({
          instanceId: 'N' + (idx + 1),
          npcId: nid,
          name: npc.name,
          position: [startX + idx * spacing, 500],
          facing: 0
        });
      });
    }
 
    let instanceIdCounter = 0;
    const categoryLabels = {};
    const categoryCounts = {};
 
    if (bf.enemies && bf.enemies.length > 0) {
      bf.enemies.forEach((spawn, idx) => {
        const template = EnemyDB[spawn.enemyId];
        if (!template) return;
        const cat = template.category || 'unknown';
        if (!categoryLabels[cat]) {
          categoryLabels[cat] = String.fromCharCode(65 + Object.keys(categoryLabels).length);
        }
        const label = categoryLabels[cat];
        categoryCounts[label] = (categoryCounts[label] || 0) + 1;
        const id = label + categoryCounts[label];
        const enemy = {
          instanceId: id,
          templateId: spawn.enemyId,
          name: template.name,
          category: template.category,
          hp: template.hp,
          maxHp: template.hp,
          armor: template.armor,
          maxArmor: template.armor,
          speed: template.speed,
          visionRadius: template.visionRadius,
          signalRadius: template.signalRadius,
          targetRadius: template.targetRadius,
          damage: template.damage,
          damageType: template.damageType,
          attackRange: template.attackRange,
          attackCooldown: template.attackCooldown,
          spread: template.spread,
          exp: template.exp,
          loot: template.loot || [],
          aiType: template.aiType || 'bug_simple',
          position: [...spawn.pos],
          facing: 0,
          state: 'idle',
          attackTimer: 0,
          moveTarget: null,
          patrolPattern: spawn.pattern || 'guard',
          patrolPath: spawn.path || null,
          patrolIndex: 0,
          statusEffects: []
        };
        state.enemies.push(enemy);
        instanceIdCounter++;
      });
    }
 
    this.battlefieldState[roomId] = state;
    return state;
  },
 
  getBattlefield(roomId) {
    return this.battlefieldState[roomId] || null;
  },
 
  resetBattlefield(roomId) {
    delete this.battlefieldState[roomId];
  },
 
  getTerrainName(terrainType) {
    const names = {
      flat: '平坦地面',
      rocky: '碎石地面',
      sandy: '沙地',
      crystal: '结晶地表',
      cave: '洞穴地面',
      metal_floor: '金属地板'
    };
    return names[terrainType] || terrainType;
  }
};
