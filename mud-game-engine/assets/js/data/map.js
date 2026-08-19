// ========== 地图数据门面（数据见 map.json，由 data-loader.js 装配） ==========
// 房间字段说明：
// id: 房间唯一标识
// name: 房间名称
// label: 迷你地图单字标注
// x/y/z: 三维地图坐标，z=0 为地表，z<0 为地下
// exits: 可通行出口，键为方向，值为目标房间 id
// battlefield: 战场配置（1000m x 1000m 展开）
//   - terrain: 地形类型
//   - terrainPenalty: 地形速度惩罚 { biped: 0.9, wheel: 0.7 } 等
//   - covers: 掩体列表
//   - hazards: 环境危害列表
//   - entryPoints: 各方向入口坐标 { north:[500,50], south:[500,950], east:[950,500], west:[50,500] }
//   - enemies: 敌人生成点 [{ enemyId, pos:[x,y], pattern:'guard/patrol', path:[[x,y],...] }]
//   - lootPoints: 战利品/资源点
//   - isSafeZone: 安全区，不会自动进入战斗模式，可以购物/对话/正常移动
//
// map.json 结构：{ rooms, _grid, _zoneConfig, areas } 四部分
//   - rooms: 手写房间表（generateRooms 会往里追加生成房间）
//   - _grid: 10x10 网格布局
//     图例: B=Base, A=Arid, W=Wild, C=Cave, T=Transition, M=Mechanical, S=Special, F=Frontier
//   - _zoneConfig: 各区域类型配置
//   - areas: 区域分组（generateRooms 执行后由 _updateAreas 填充）
var MapDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  // 数据容器（由 _load 装配；rooms/areas 为可变容器，generateRooms/_updateAreas 会写入）
  MapDB.rooms = {};
  MapDB._grid = [];
  MapDB._zoneConfig = {};
  MapDB.areas = [];

  defineProp(MapDB, '_roomsGenerated', false);

  defineProp(MapDB, '_load', function (data) {
    data = data || {};
    this.rooms = data.rooms || {}; // 可变容器：generateRooms 会往里追加
    this._grid = data._grid || [];
    this._zoneConfig = data._zoneConfig || {};
    this.areas = data.areas || [];
    this._roomsGenerated = false;
  });

  // 伪随机数生成器（基于种子的确定性随机）
  defineProp(MapDB, '_seededRandom', function (seed) {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  });

  // 加权随机选择
  defineProp(MapDB, '_weightedPick', function (items, seed) {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this._seededRandom(seed) * total;
    for (const [item, w] of items) {
      r -= w;
      if (r <= 0) return item;
    }
    return items[items.length - 1][0];
  });

  // 范围内随机整数
  defineProp(MapDB, '_randInt', function (min, max, seed) {
    return Math.floor(this._seededRandom(seed) * (max - min + 1)) + min;
  });

  // 生成掩体
  defineProp(MapDB, '_genCover', function (type, idx, seed) {
    const rng = function(s) { return MapDB._seededRandom(seed + s); };
    const x = Math.floor(rng(100 + idx * 7) * 800) + 100;
    const y = Math.floor(rng(200 + idx * 7) * 800) + 100;
    const w = Math.floor(rng(300 + idx * 7) * 60) + 60;
    const h = Math.floor(rng(400 + idx * 7) * 60) + 60;
    const dur = Math.floor(rng(500 + idx * 7) * 200) + 300;

    const labels = { rock: '岩石堆', pillar: '矿柱', metal: '金属结构' };
    const heights = { rock: 3, pillar: 3, metal: 4 };

    return {
      id: 'g' + type[0] + idx,
      pos: [x, y],
      size: [w, h],
      height: heights[type] || 3,
      durability: dur,
      label: labels[type] || '掩体'
    };
  });

  // 生成敌人
  defineProp(MapDB, '_genEnemies', function (config, x, y, seed) {
    const enemies = [];
    const countRange = config.enemyCount;
    const count = this._randInt(countRange[0], countRange[1], seed + 1000);

    if (count <= 0) return enemies;

    for (let i = 0; i < count; i++) {
      const enemyId = this._weightedPick(config.enemyPool, seed + 2000 + i * 13);
      const ex = Math.floor(this._seededRandom(seed + 3000 + i * 17) * 700) + 150;
      const ey = Math.floor(this._seededRandom(seed + 4000 + i * 19) * 700) + 150;

      const pattern = this._seededRandom(seed + 5000 + i * 23) > 0.5 ? 'patrol' : 'guard';
      let path = null;
      if (pattern === 'patrol') {
        const px = Math.floor(this._seededRandom(seed + 6000 + i * 29) * 400) + 300;
        const py = Math.floor(this._seededRandom(seed + 7000 + i * 31) * 400) + 300;
        path = [[ex, ey], [px, py], [ex, py], [px, ey]];
      }

      enemies.push({
        enemyId: enemyId,
        pos: [ex, ey],
        pattern: pattern,
        path: path
      });
    }

    return enemies;
  });

  // 生成战利品
  defineProp(MapDB, '_genLoot', function (config, x, y, seed) {
    const loot = [];
    if (config.lootChance <= 0 || config.lootTable.length === 0) return loot;

    if (this._seededRandom(seed + 8000) > config.lootChance) return loot;

    const lootEntry = this._weightedPick(config.lootTable, seed + 9000);
    const [itemId, range] = lootEntry;
    const count = this._randInt(range[0], range[1], seed + 10000);

    const lx = Math.floor(this._seededRandom(seed + 11000) * 700) + 150;
    const ly = Math.floor(this._seededRandom(seed + 12000) * 700) + 150;

    loot.push({ pos: [lx, ly], itemId: itemId, count: count });
    return loot;
  });

  // 生成环境危害
  defineProp(MapDB, '_genHazards', function (config, x, y, seed) {
    const hazards = [];
    if (config.hazardChance <= 0 || config.hazards.length === 0) return hazards;

    if (this._seededRandom(seed + 13000) > config.hazardChance) return hazards;

    const hazardTemplate = config.hazards[Math.floor(this._seededRandom(seed + 14000) * config.hazards.length)];
    const hx = Math.floor(this._seededRandom(seed + 15000) * 600) + 200;
    const hy = Math.floor(this._seededRandom(seed + 16000) * 600) + 200;

    hazards.push({
      type: hazardTemplate.type,
      pos: [hx, hy],
      radius: hazardTemplate.radius,
      effect: hazardTemplate.effect,
      dps: hazardTemplate.dps,
      value: hazardTemplate.value,
      label: hazardTemplate.label
    });

    return hazards;
  });

  // ===== 房间生成主函数 =====
  defineProp(MapDB, 'generateRooms', function () {
    if (this._roomsGenerated) return;
    this._roomsGenerated = true;

    // 记录已有房间占用的格子（含同(x,y)不同z的情况）
    const occupied = {};
    const xyOccupied = new Set();
    for (const [id, room] of Object.entries(this.rooms)) {
      const key = room.x + ',' + room.y + ',' + (room.z || 0);
      occupied[key] = id;
      xyOccupied.add(room.x + ',' + room.y);
    }

    // 遍历网格生成新房间
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const zone = this._grid[y][x];
        const config = this._zoneConfig[zone];
        if (!config) continue;

        const z = config.z || 0;
        const key = x + ',' + y + ',' + z;

        if (occupied[key]) continue; // 已有房间，跳过
        if (xyOccupied.has(x + ',' + y)) continue; // 同(x,y)已有其他z层房间

        // 生成房间 ID
        const suffix = z === -1 ? '_d1' : '';
        const roomId = config.prefix + '_' + x + '_' + y + suffix;

        // 生成基础种子
        const seed = x * 1000 + y * 37 + (z === -1 ? 50000 : 0);

        // 地形
        const terrain = config.terrains[Math.floor(this._seededRandom(seed) * config.terrains.length)];

        // 掩体
        const coverCount = this._randInt(config.coverCount[0], config.coverCount[1], seed + 100);
        const covers = [];
        for (let i = 0; i < coverCount; i++) {
          covers.push(this._genCover(config.coverType, i, seed + 200 + i * 11));
        }

        // 敌人
        const enemies = this._genEnemies(config, x, y, seed);

        // 战利品
        const lootPoints = this._genLoot(config, x, y, seed);

        // 环境危害
        const hazards = this._genHazards(config, x, y, seed);

        // 构建房间
        const room = {
          id: roomId,
          name: config.zoneName + ' (' + x + ',' + y + (z === -1 ? ',地下' : '') + ')',
          label: config.label,
          x: x,
          y: y,
          z: z,
          desc: config.desc,
          exits: {},
          npcs: [],
          sceneType: config.isSafe ? 'safe' : 'battle',
          enemies: [],
          battlefield: {
            terrain: terrain,
            terrainPenalty: JSON.parse(JSON.stringify(config.terrainPenalty)),
            covers: covers,
            hazards: hazards,
            entryPoints: { north: [500, 50], south: [500, 950], east: [950, 500], west: [50, 500] },
            enemies: enemies,
            lootPoints: lootPoints
          }
        };

        // 安全区标记
        if (config.isSafe) {
          room.isSafeZone = true;
        }

        // Boss 房间
        if ((x === 9 && y === 1 && z === 0) || (x === 8 && y === 9 && z === -1)) {
          room.isBossRoom = true;
          if (x === 9 && y === 1) {
            room.name = '守护者巨像·圣殿';
            room.label = '圣';
            room.desc = '远古机械文明的最高杰作——守护者巨像的休眠之地。巨大的金属身躯在昏暗的光线中若隐若现，空气中充满了高压电流的噼啪声。';
            room.battlefield.enemies.push({
              enemyId: 'colossus_guardian', pos: [500, 500], pattern: 'guard'
            });
            room.battlefield.enemies.push({
              enemyId: 'defense_node', pos: [300, 700], pattern: 'guard'
            });
            room.battlefield.enemies.push({
              enemyId: 'defense_node', pos: [700, 700], pattern: 'guard'
            });
          } else if (x === 8 && y === 9 && z === -1) {
            room.name = '巨型守卫虫·巢穴';
            room.label = '巢';
            room.desc = '矿洞最深处，虫族母巢的核心。巨型守卫虫盘踞在此，周围布满了虫胶和卵囊。空气中弥漫着腐败的酸臭味。';
            room.battlefield.enemies.push({
              enemyId: 'giant_guardian', pos: [500, 500], pattern: 'guard'
            });
            room.battlefield.enemies.push({
              enemyId: 'assault_bug', pos: [300, 600], pattern: 'guard'
            });
            room.battlefield.enemies.push({
              enemyId: 'assault_bug', pos: [700, 600], pattern: 'guard'
            });
            room.battlefield.enemies.push({
              enemyId: 'toxic_bug', pos: [500, 800], pattern: 'guard'
            });
          }
        }

        // 奇异地形 NPC 概率
        if (zone === 'S' && config.npcChance && this._seededRandom(seed + 17000) < config.npcChance) {
          room.npcs.push('wanderer');
        }

        this.rooms[roomId] = room;
      }
    }

    // 设置出口连通
    this._setupExits();

    // 更新 areas 数组
    this._updateAreas();
  });

  // 设置出口连通性
  defineProp(MapDB, '_setupExits', function () {
    const allRooms = Object.values(this.rooms);

    // 构建快速查找表: key = "x,y,z" -> room
    const lookup = {};
    for (const room of allRooms) {
      const key = room.x + ',' + room.y + ',' + (room.z || 0);
      lookup[key] = room;
    }

    // 定义方向偏移
    const dirs = [
      { dx: 0, dy: -1, dir: 'north', opp: 'south' },
      { dx: 0, dy: 1, dir: 'south', opp: 'north' },
      { dx: 1, dy: 0, dir: 'east', opp: 'west' },
      { dx: -1, dy: 0, dir: 'west', opp: 'east' }
    ];

    // Boss 房间 ID 列表（只能有1个入口）
    const bossRoomIds = new Set(['crystal_valley', 'mine_chamber', 'spec_9_1', 'cave_8_9_d1']);

    // 为每个房间设置同层水平出口
    for (const room of allRooms) {
      const z = room.z || 0;

      for (const { dx, dy, dir, opp } of dirs) {
        const nx = room.x + dx;
        const ny = room.y + dy;
        const neighborKey = nx + ',' + ny + ',' + z;
        const neighbor = lookup[neighborKey];

        if (!neighbor) continue;

        // 如果是 Boss 房间，只允许已有出口（不新增）
        if (bossRoomIds.has(room.id)) {
          // Boss 房间已有出口保持不变
          if (!room.exits[dir]) continue;
        }

        if (bossRoomIds.has(neighbor.id)) {
          // 邻居是 Boss 房间，检查是否已有入口
          const hasEntrance = Object.values(neighbor.exits).includes(room.id);
          if (!hasEntrance && Object.keys(neighbor.exits).length > 0) {
            // Boss 房间已有至少一个入口，不再添加新入口
            continue;
          }
        }

        // 添加双向出口
        if (!room.exits[dir]) {
          room.exits[dir] = neighbor.id;
        }
        if (!neighbor.exits[opp]) {
          neighbor.exits[opp] = room.id;
        }
      }
    }

    // 处理地表↔地下连接 (up/down)
    for (const room of allRooms) {
      const z = room.z || 0;

      // Boss 房间不添加新的 up/down 出口
      if (bossRoomIds.has(room.id)) continue;

      if (z === 0) {
        // 地表房间：检查正下方是否有矿洞
        const belowKey = room.x + ',' + room.y + ',-1';
        const below = lookup[belowKey];
        if (below && !room.exits['down'] && !bossRoomIds.has(below.id)) {
          room.exits['down'] = below.id;
        }
        if (below && !below.exits['up'] && !bossRoomIds.has(below.id)) {
          below.exits['up'] = room.id;
        }
      }

      // 地表房间：检查相邻格子是否有矿洞（水平过渡）
      if (z === 0) {
        for (const { dx, dy, dir, opp } of dirs) {
          const nx = room.x + dx;
          const ny = room.y + dy;
          const caveKey = nx + ',' + ny + ',-1';
          const caveRoom = lookup[caveKey];

          if (caveRoom && !room.exits['down'] && !room.exits[dir] && !bossRoomIds.has(caveRoom.id)) {
            // 地表房间可以向下进入相邻的矿洞
            room.exits['down'] = caveRoom.id;
          }
          if (caveRoom && !caveRoom.exits['up'] && !bossRoomIds.has(caveRoom.id)) {
            caveRoom.exits['up'] = room.id;
          }
        }
      }
    }
  });

  // 更新 areas 数组
  defineProp(MapDB, '_updateAreas', function () {
    const allRooms = Object.values(this.rooms);

    // 收集各区域房间
    const baseRooms = ['outpost_hub', 'outpost_command', 'outpost_arsenal', 'outpost_repair', 'outpost_gate'];

    const zonePrefixes = {
      '🏜 荒原区域': 'arid',
      '🌵 荒野区域': 'wild',
      '⛏ 地下矿洞': 'cave',
      '⚙ 机械遗迹': 'mech',
      '🔄 过渡区域': 'trans',
      '✨ 奇异地形': 'spec',
      '⚔ 前沿区域': 'front'
    };

    const areaMap = {};
    for (const [name, prefix] of Object.entries(zonePrefixes)) {
      areaMap[name] = [];
    }

    for (const room of allRooms) {
      for (const [name, prefix] of Object.entries(zonePrefixes)) {
        if (room.id.startsWith(prefix + '_')) {
          areaMap[name].push(room.id);
          break;
        }
      }
    }

    // 收集生成的基地周边房间
    const generatedBaseRooms = [];
    for (const room of allRooms) {
      if (room.id.startsWith('base_')) {
        generatedBaseRooms.push(room.id);
      }
    }

    // 现有矿洞房间
    const existingCaveRooms = ['mine_entrance', 'mine_tunnel', 'mine_side', 'mine_chamber'];
    for (const id of existingCaveRooms) {
      if (!areaMap['⛏ 地下矿洞'].includes(id)) {
        areaMap['⛏ 地下矿洞'].push(id);
      }
    }

    // 现有荒原房间
    const existingAridRooms = ['wasteland_north', 'wasteland_east', 'wasteland_south', 'crystal_valley'];
    for (const id of existingAridRooms) {
      if (!areaMap['🏜 荒原区域'].includes(id)) {
        areaMap['🏜 荒原区域'].push(id);
      }
    }

    // 现有过渡房间
    if (!areaMap['🔄 过渡区域'].includes('canyon_entrance')) {
      areaMap['🔄 过渡区域'].push('canyon_entrance');
    }

    // 构建 areas 数组
    this.areas = [
      { name: '🛰 前哨基地', rooms: [...baseRooms, ...generatedBaseRooms].sort() }
    ];

    for (const [name, rooms] of Object.entries(areaMap)) {
      if (rooms.length > 0) {
        this.areas.push({ name: name, rooms: rooms.sort() });
      }
    }
  });
})();
