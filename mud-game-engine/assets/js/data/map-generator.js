// ========== 10x10 地图生成器 ==========
// 生成100个房间的网格地图，保留现有14个手工房间，自动生成其余86个
const MapGenerator = {
  // 区域定义（10x10网格，坐标0-9）
  regionDefs: [
    // 前哨基地（手工房间，不生成）
    { name: '前哨基地', x: [1,3], y: [1,3], z:0, terrain: 'metal_floor', sceneType: 'safe', isBase: true },
    // 荒原北部
    { name: '荒原北部', x: [4,7], y: [0,1], z:0, terrain: 'rocky', sceneType: 'battle', enemies: ['worker_bug','hopper'], density: 0.5 },
    // 荒原西部
    { name: '荒原西部', x: [0,1], y: [0,4], z:0, terrain: 'rocky', sceneType: 'battle', enemies: ['worker_bug','assault_bug'], density: 0.6 },
    // 荒原中部
    { name: '荒原中部', x: [3,4], y: [3,4], z:0, terrain: 'rocky', sceneType: 'battle', enemies: ['worker_bug','assault_bug','hopper'], density: 0.7 },
    // 荒原东部
    { name: '荒原东部', x: [5,7], y: [2,3], z:0, terrain: 'crystal', sceneType: 'battle', enemies: ['worker_bug','assault_bug','flying_bug'], density: 0.7,
      hazards: [{ type:'em_interference', chance: 0.3 }] },
    // 荒原南部
    { name: '荒原南部', x: [0,3], y: [5,6], z:0, terrain: 'sandy', sceneType: 'battle', enemies: ['assault_bug','acid_spitter'], density: 0.8 },
    // 结晶峡谷
    { name: '结晶峡谷', x: [4,6], y: [4,6], z:0, terrain: 'crystal', sceneType: 'battle', enemies: ['assault_bug','flying_bug','beetle','toxic_bug'], density: 0.9,
      hazards: [{ type:'em_interference', chance: 0.5 }] },
    // 峡谷深处
    { name: '峡谷深处', x: [0,2], y: [7,9], z:0, terrain: 'cave', sceneType: 'battle', enemies: ['assault_bug','acid_spitter','hopper'], density: 0.8 },
    // 矿洞深层（z=-1）
    { name: '地下矿洞', x: [0,3], y: [7,9], z:-1, terrain: 'cave', sceneType: 'battle', enemies: ['worker_bug','assault_bug','beetle'], density: 0.9,
      hazards: [{ type:'acid_pool', chance: 0.2 }] },
    // 机械遗迹西部
    { name: '机械遗迹西部', x: [5,7], y: [5,6], z:0, terrain: 'metal_floor', sceneType: 'battle', enemies: ['recon_probe','defense_node','particle_sentry'], density: 0.8 },
    // 机械遗迹东部
    { name: '机械遗迹东部', x: [7,9], y: [5,7], z:0, terrain: 'metal_floor', sceneType: 'battle', enemies: ['particle_sentry','self_repair_guardian','gravity_distorter'], density: 0.9 },
    // 机械遗迹核心
    { name: '机械遗迹核心', x: [8,9], y: [8,9], z:0, terrain: 'metal_floor', sceneType: 'battle', enemies: ['self_repair_guardian','gravity_distorter','colossus_guardian'], density: 1.0 },
    // 前沿区域
    { name: '前沿区域', x: [7,9], y: [0,2], z:0, terrain: 'rocky', sceneType: 'battle', enemies: ['assault_bug','beetle','recon_probe'], density: 0.8 },
    // 偏远区域
    { name: '偏远区域', x: [0,1], y: [0,0], z:0, terrain: 'sandy', sceneType: 'battle', enemies: ['worker_bug'], density: 0.3 },
  ],

  // 已存在的房间坐标（手工设计的房间，不覆盖）
  reservedCoords: new Set([
    // 前哨基地
    '2,2,0', '2,1,0', '3,2,0', '1,2,0', '2,3,0',
    // 荒原
    '2,4,0', '3,4,0', '2,5,0',
    // 结晶峡谷
    '3,5,0',
    // 峡谷入口
    '2,6,0',
    // 矿洞
    '2,7,-1', '2,8,-1', '3,8,-1', '2,9,-1',
  ]),

  // 房间描述模板
  descTemplates: {
    rocky: [
      '赤褐色的岩石地貌延展开来，地表覆盖着风化的岩屑和碎石。远处偶尔能看到虫群移动的踪迹。',
      '一片起伏的岩石地带，巨大的岩块散落其间，为战斗提供了天然的掩体。',
      '岩石遍布的荒凉地带，地表裂缝中透出微弱的热气。',
      '崎岖的岩石地形，尖锐的岩片从地面突起，如同天然的路障。',
    ],
    sandy: [
      '细密的沙尘覆盖着这片区域，踩上去松软无声。远处的沙丘在风中缓缓移动。',
      '一片沙质荒原，稀疏的耐旱植物在沙地中顽强生长。',
      '风化的沙地延展至天边，偶尔能看到被风沙半掩的虫族遗骸。',
    ],
    crystal: [
      '发光结晶矿脉覆盖着这片区域，辉锗矿的蓝光在空气中闪烁，形成梦幻般的景象。',
      '密集的结晶柱从地面突起，晶体的光芒映照出周围扭曲的影子。',
      '结晶矿脉在这里特别密集，地面覆盖着细碎的晶片，踩上去发出清脆的碎裂声。',
    ],
    cave: [
      '地下洞穴的通道蜿蜒向前，洞顶滴落着含矿的水珠，在岩壁上留下斑驳的痕迹。',
      '一个宽敞的地下洞室，辉锗矿结晶镶嵌在穹顶上，如同地下星空。',
      '狭窄的矿道向深处延伸，两侧的岩壁上布满了开凿的痕迹。',
      '洞穴中弥漫着潮湿的矿物气息，微弱的光线从晶簇中透出。',
    ],
    metal_floor: [
      '金属地板在脚下发出沉闷的回响，墙上的古老管线已经锈蚀不堪。',
      '废弃的机械设施内部，残留的控制台偶尔还会闪烁微弱的指示灯。',
      '金属构造的通道，墙上镶嵌着未知用途的仪表盘，散发着陈旧的气息。',
    ],
  },

  // 生成单个房间
  generateRoom(x, y, z) {
    const coordKey = `${x},${y},${z}`;
    if (this.reservedCoords.has(coordKey)) return null;

    const region = this.findRegion(x, y, z);
    if (!region) return null;

    const roomId = `room_${x}_${y}_${z < 0 ? 'd' : ''}`;
    const terrain = region.terrain || 'rocky';
    const sceneType = region.sceneType || 'battle';
    const isBossRoom = region.enemies && region.enemies.includes('colossus_guardian') && x === 9 && y === 9;

    // 生成房间名称
    const name = this.generateRoomName(region, x, y, z);

    // 生成描述
    const desc = this.generateDesc(terrain, region, x, y);

    // 生成出口
    const exits = this.generateExits(x, y, z);

    // 生成战场
    const battlefield = this.generateBattlefield(region, terrain, sceneType, isBossRoom);

    const label = this.getRoomLabel(region, terrain, isBossRoom);

    return {
      id: roomId, name, label, x, y, z: z || 0,
      desc, exits,
      npcs: [],
      enemies: [],
      isSafeZone: sceneType === 'safe',
      isBossRoom: isBossRoom || false,
      battlefield
    };
  },

  // 查找区域
  findRegion(x, y, z) {
    for (const region of this.regionDefs) {
      const rz = region.z || 0;
      if (z !== rz) continue;
      if (x >= region.x[0] && x <= region.x[1] && y >= region.y[0] && y <= region.y[1]) {
        return region;
      }
    }
    return null;
  },

  // 生成房间名称
  generateRoomName(region, x, y, z) {
    const suffixes = ['北部', '南部', '东部', '西部', '东北', '西北', '东南', '西南', '中部', '外围'];
    const idx = (x * 7 + y * 13) % suffixes.length;
    return `${region.name}${suffixes[idx]}`;
  },

  // 生成描述
  generateDesc(terrain, region, x, y) {
    const templates = this.descTemplates[terrain] || this.descTemplates.rocky;
    const idx = (x * 3 + y * 7) % templates.length;
    return templates[idx];
  },

  // 生成出口（确保连通性，包括垂直方向）
  generateExits(x, y, z) {
    const exits = {};
    const dirs = [
      { dir: 'north', dx: 0, dy: -1 },
      { dir: 'south', dx: 0, dy: 1 },
      { dir: 'east', dx: 1, dy: 0 },
      { dir: 'west', dx: -1, dy: 0 },
    ];

    for (const { dir, dx, dy } of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      // 在10x10范围内
      if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
        const targetId = this.getRoomId(nx, ny, z);
        exits[dir] = targetId;
      }
    }

    // 垂直方向：检查上下层是否有房间
    // 地下矿洞区域 (x=0-3, y=7-9) 有 z=-1 层
    if (z === 0 && x >= 0 && x <= 3 && y >= 7 && y <= 9) {
      const belowId = this.getRoomId(x, y, -1);
      exits['down'] = belowId;
    }
    if (z === -1) {
      const aboveId = this.getRoomId(x, y, 0);
      exits['up'] = aboveId;
    }

    return exits;
  },

  // 获取房间ID
  getRoomId(x, y, z) {
    // 检查是否是手工房间
    const coordKey = `${x},${y},${z}`;
    const manualMap = {
      '2,2,0': 'outpost_hub', '2,1,0': 'outpost_command', '3,2,0': 'outpost_arsenal',
      '1,2,0': 'outpost_repair', '2,3,0': 'outpost_gate',
      '2,4,0': 'wasteland_north', '3,4,0': 'wasteland_east', '2,5,0': 'wasteland_south',
      '3,5,0': 'crystal_valley', '2,6,0': 'canyon_entrance',
      '2,7,-1': 'mine_entrance', '2,8,-1': 'mine_tunnel', '3,8,-1': 'mine_side', '2,9,-1': 'mine_chamber',
    };
    if (manualMap[coordKey]) return manualMap[coordKey];
    return `room_${x}_${y}_${z < 0 ? 'd' : ''}`;
  },

  // 生成战场配置
  generateBattlefield(region, terrain, sceneType, isBossRoom) {
    const bf = {
      terrain,
      terrainPenalty: this.getTerrainPenalty(terrain),
      covers: [],
      hazards: [],
      entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
      enemies: [],
      lootPoints: [],
    };

    // 生成掩体
    if (sceneType !== 'safe') {
      const coverCount = Math.floor(Math.random() * 3) + 1; // 1-3个掩体
      for (let i = 0; i < coverCount; i++) {
        const posX = 100 + Math.random() * 800;
        const posY = 100 + Math.random() * 800;
        const size = 40 + Math.random() * 80;
        bf.covers.push({
          id: `c${i + 1}`, pos: [Math.round(posX), Math.round(posY)],
          size: [Math.round(size), Math.round(size * 0.8)], height: 1 + Math.floor(Math.random() * 3),
          durability: 200 + Math.floor(Math.random() * 400),
          label: terrain === 'cave' ? '矿柱' : (terrain === 'crystal' ? '结晶柱' : '岩石堆')
        });
      }
    }

    // 生成环境危害
    if (region.hazards && region.hazards.length > 0) {
      for (const hazDef of region.hazards) {
        if (Math.random() < hazDef.chance) {
          const posX = 200 + Math.random() * 600;
          const posY = 200 + Math.random() * 600;
          if (hazDef.type === 'em_interference') {
            bf.hazards.push({
              type: 'em_interference', pos: [Math.round(posX), Math.round(posY)],
              radius: 80 + Math.random() * 120, effect: 'reduce_vision', value: 0.3 + Math.random() * 0.3,
              label: '电磁干扰区'
            });
          } else if (hazDef.type === 'acid_pool') {
            bf.hazards.push({
              type: 'acid_pool', pos: [Math.round(posX), Math.round(posY)],
              radius: 40 + Math.random() * 60, effect: 'corrosion', dps: 3 + Math.floor(Math.random() * 5),
              label: '酸液池'
            });
          }
        }
      }
    }

    // 生成敌人
    if (region.enemies && region.enemies.length > 0 && sceneType !== 'safe') {
      const density = region.density || 0.5;
      const enemyCount = isBossRoom ? 3 : Math.max(1, Math.floor(density * 4));
      const usedPositions = [];
      for (let i = 0; i < enemyCount; i++) {
        const enemyId = region.enemies[Math.floor(Math.random() * region.enemies.length)];
        let posX, posY;
        let attempts = 0;
        do {
          posX = 200 + Math.random() * 600;
          posY = 200 + Math.random() * 600;
          attempts++;
        } while (attempts < 20 && usedPositions.some(p => Math.abs(p[0] - posX) < 80 && Math.abs(p[1] - posY) < 80));
        usedPositions.push([Math.round(posX), Math.round(posY)]);
        const pattern = Math.random() < 0.4 ? 'patrol' : 'guard';
        const patrolPath = pattern === 'patrol' ? this.generatePatrolPath(posX, posY) : null;
        const enemy = { enemyId, pos: [Math.round(posX), Math.round(posY)], pattern };
        if (patrolPath) enemy.path = patrolPath;
        bf.enemies.push(enemy);
      }
    }

    // 生成资源点
    if (sceneType !== 'safe') {
      const lootTypes = this.getLootTypes(region);
      if (lootTypes.length > 0) {
        const lootCount = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < lootCount; i++) {
          const lootType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
          const posX = 100 + Math.random() * 800;
          const posY = 100 + Math.random() * 800;
          bf.lootPoints.push({
            pos: [Math.round(posX), Math.round(posY)],
            itemId: lootType, count: 1 + Math.floor(Math.random() * 3)
          });
        }
      }
    }

    return bf;
  },

  // 生成巡逻路径
  generatePatrolPath(cx, cy) {
    const points = [];
    const numPoints = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 100 + Math.random() * 150;
      points.push([Math.round(cx + Math.cos(angle) * dist), Math.round(cy + Math.sin(angle) * dist)]);
    }
    return points;
  },

  // 获取地形惩罚
  getTerrainPenalty(terrain) {
    const penalties = {
      rocky: { biped: 0.9, wheel: 0.7 },
      sandy: { biped: 0.85, wheel: 0.6 },
      crystal: { biped: 0.9, wheel: 0.6 },
      cave: { biped: 0.9, wheel: 0.7 },
      metal_floor: { biped: 1.0, wheel: 0.9 },
    };
    return penalties[terrain] || { biped: 0.9, wheel: 0.7 };
  },

  // 获取资源类型
  getLootTypes(region) {
    const types = [];
    if (region.name.includes('矿洞') || region.name.includes('结晶')) {
      types.push('iron_ore', 'iron_ore', 'copper_ore', 'germanite_shard');
    }
    if (region.name.includes('机械遗迹')) {
      types.push('mech_parts', 'alloy_fragment', 'energy_core_remnant');
    }
    if (region.name.includes('荒原') || region.name.includes('峡谷') || region.name.includes('偏远')) {
      types.push('chitin_fragment', 'iron_ore');
    }
    if (region.name.includes('前沿')) {
      types.push('iron_ore', 'copper_ore', 'mech_parts');
    }
    return types;
  },

  // 获取房间标签
  getRoomLabel(region, terrain, isBossRoom) {
    if (isBossRoom) return '王';
    if (region.isBase) return '基';
    const labels = {
      rocky: '岩', sandy: '沙', crystal: '晶', cave: '洞', metal_floor: '械',
    };
    return labels[terrain] || '·';
  },

  // 生成所有房间
  generateAllRooms() {
    const rooms = {};
    // 先生成所有房间（手工房间保留）
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        // 地表层
        const room = this.generateRoom(x, y, 0);
        if (room) rooms[room.id] = room;
        // 地下层（仅矿洞区域 y=7-9, x=0-3）
        if (x >= 0 && x <= 3 && y >= 7 && y <= 9) {
          const dRoom = this.generateRoom(x, y, -1);
          if (dRoom) rooms[dRoom.id] = dRoom;
        }
      }
    }
    return rooms;
  },

  // 更新区域列表
  generateAreas() {
    return [
      { name:'🛰 前哨基地', rooms:['outpost_hub','outpost_command','outpost_arsenal','outpost_repair','outpost_gate'] },
      { name:'🏜 荒原区域', rooms:['wasteland_north','wasteland_east','wasteland_south'] },
      { name:'💎 结晶峡谷', rooms:['crystal_valley'] },
      { name:'🕳 峡谷深处', rooms:['canyon_entrance'] },
      { name:'⛏ 地下矿洞', rooms:['mine_entrance','mine_tunnel','mine_side','mine_chamber'] },
    ];
  }
};