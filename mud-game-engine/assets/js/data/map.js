// ========== 地图数据 ==========
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
const MapDB = {
  _roomsGenerated: false,

  rooms: {
      // ===== 前哨基地 =====
      outpost_hub: {
        id:'outpost_hub', name:'前哨基地·中央大厅', label:'基', x:2, y:1,
        desc:'先遣队在织女-7建立的小型前哨基地。穹顶形的建筑内，维护设备嗡嗡运转，空气中飘着臭氧的气味。北面是指挥室，东面是装备库，西面是维修站。',
        exits:{ north:'outpost_command', east:'outpost_arsenal', west:'outpost_repair', south:'outpost_gate' },
        npcs:['commander'],
        sceneType: 'safe',
        isSafeZone: true,
        enemies:[],
        battlefield: {
          terrain: 'metal_floor',
          terrainPenalty: { biped: 1.0, wheel: 0.9 },
          covers: [
            { id:'c1', pos:[300,400], size:[80,60], height:2, durability:200 }
          ],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [],
          lootPoints: []
        }
      },
      outpost_command: {
        id:'outpost_command', name:'指挥室', label:'指', x:2, y:0,
        desc:'基地的指挥中心，墙上挂满了星球地图和监测数据。指挥官的全息投影终端位于正中央。',
        exits:{ south:'outpost_hub' },
        npcs:['commander'],
        sceneType: 'safe',
        isSafeZone: true,
        enemies:[],
        battlefield: {
          terrain: 'metal_floor',
          terrainPenalty: { biped: 1.0, wheel: 0.9 },
          covers: [],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [],
          lootPoints: []
        }
      },
      outpost_arsenal: {
        id:'outpost_arsenal', name:'装备库', label:'库', x:3, y:1,
        desc:'武器和装备的存储区。成排的机架上停放着各型号的载具，墙上挂满了模块化武器。军械士正在调试一门脉冲激光炮。',
        exits:{ west:'outpost_hub' },
        npcs:['quartermaster'],
        enemies:[],
        sceneType: 'safe',
        isSafeZone: true,
        isShop:true,
        battlefield: {
          terrain: 'metal_floor',
          terrainPenalty: { biped: 1.0, wheel: 0.9 },
          covers: [],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [],
          lootPoints: []
        }
      },
      outpost_repair: {
        id:'outpost_repair', name:'维修站', label:'修', x:1, y:1,
        desc:'装备维修和改装车间。机械臂和焊接设备整齐排列，空气中弥漫着金属热加工的气味。维修师正在检查一台受损的侦察机体。',
        exits:{ east:'outpost_hub' },
        npcs:['engineer'],
        enemies:[],
        sceneType: 'safe',
        isSafeZone: true,
        isShop:true,
        battlefield: {
          terrain: 'metal_floor',
          terrainPenalty: { biped: 1.0, wheel: 0.9 },
          covers: [],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [],
          lootPoints: []
        }
      },
      outpost_gate: {
        id:'outpost_gate', name:'基地南门', label:'门', x:2, y:2,
        desc:'基地的气闸门，厚重的合金门外就是赤褐色的荒原。门口的守卫机体正在例行巡逻。门外是一条通往南部荒原的小路。',
        exits:{ north:'outpost_hub', south:'wasteland_north' },
        npcs:[],
        enemies:[],
        sceneType: 'safe',
        isSafeZone: true,
        battlefield: {
          terrain: 'metal_floor',
          terrainPenalty: { biped: 1.0, wheel: 0.9 },
          covers: [],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [],
          lootPoints: []
        }
      },
 
      // ===== 荒原区域 =====
      wasteland_north: {
        id:'wasteland_north', name:'荒原北部', label:'原', x:2, y:3,
        desc:'赤褐色的荒原一望无际，地表覆盖着风化的岩屑和沙尘。远处的地平线上隐约可见矿脉的轮廓。空气干燥，带着硫化物的刺鼻气味。',
        exits:{ north:'outpost_gate', south:'wasteland_south', east:'wasteland_east' },
        npcs:[],
        sceneType: 'battle',
        enemies:[],
        battlefield: {
          terrain: 'rocky',
          terrainPenalty: { biped: 0.9, wheel: 0.7 },
          covers: [
            { id:'r1', pos:[300,300], size:[100,80], height:3, durability:400, label:'岩石堆' },
            { id:'r2', pos:[700,600], size:[120,90], height:4, durability:500, label:'巨型岩' }
          ],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'worker_bug', pos:[650,400], pattern:'guard' },
            { enemyId:'worker_bug', pos:[400,700], pattern:'patrol', path:[[400,700],[600,700],[600,550],[400,550]] }
          ],
          lootPoints: [
            { pos:[200,300], itemId:'chitin_fragment', count:2 }
          ]
        }
      },
      wasteland_east: {
        id:'wasteland_east', name:'荒原东部', label:'东', x:3, y:3,
        desc:'荒原东部，地表散布着发光的结晶矿脉，空气中有微弱的电磁干扰。越往东走，矿脉越密集，虫子的活动迹象也越多。',
        exits:{ west:'wasteland_north', south:'crystal_valley' },
        npcs:[],
        sceneType: 'battle',
        enemies:[],
        battlefield: {
          terrain: 'crystal',
          terrainPenalty: { biped: 0.9, wheel: 0.6 },
          covers: [
            { id:'c1', pos:[200,500], size:[80,100], height:5, durability:600, label:'结晶柱' }
          ],
          hazards: [
            { type:'em_interference', pos:[700,400], radius:120, effect:'reduce_vision', value:0.5, label:'电磁干扰区' }
          ],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'worker_bug', pos:[500,300], pattern:'guard' },
            { enemyId:'assault_bug', pos:[750,600], pattern:'patrol', path:[[750,600],[850,400],[700,300]] },
            { enemyId:'worker_bug', pos:[300,750], pattern:'guard' }
          ],
          lootPoints: []
        }
      },
      wasteland_south: {
        id:'wasteland_south', name:'荒原南部', label:'南', x:2, y:4,
        desc:'荒原南部，地表逐渐向下倾斜，通向一条深邃的峡谷。峡谷入口处有虫群活动的痕迹，地面布满了黏液和爬行轨迹。',
        exits:{ north:'wasteland_north', south:'canyon_entrance' },
        npcs:[],
        sceneType: 'battle',
        enemies:[],
        battlefield: {
          terrain: 'sandy',
          terrainPenalty: { biped: 0.85, wheel: 0.6 },
          covers: [
            { id:'d1', pos:[600,400], size:[90,70], height:2, durability:300, label:'沙丘' }
          ],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'assault_bug', pos:[450,600], pattern:'guard' },
            { enemyId:'worker_bug', pos:[700,300], pattern:'guard' },
            { enemyId:'worker_bug', pos:[300,500], pattern:'guard' }
          ],
          lootPoints: []
        }
      },
      crystal_valley: {
        id:'crystal_valley', name:'结晶峡谷', label:'谷', x:3, y:4,
        desc:'一片被发光结晶矿脉覆盖的峡谷。辉锗矿的光芒在暗处闪烁，如同星河倒悬。这里是虫子的主要栖息地，空气中弥漫着危险的气息。',
        exits:{ north:'wasteland_east' },
        npcs:[],
        sceneType: 'battle',
        isBossRoom:true,
        battlefield: {
          terrain: 'crystal',
          terrainPenalty: { biped: 0.85, wheel: 0.5 },
          covers: [
            { id:'cr1', pos:[250,300], size:[100,120], height:6, durability:800, label:'巨晶柱' },
            { id:'cr2', pos:[700,650], size:[110,100], height:5, durability:700, label:'结晶岩' }
          ],
          hazards: [
            { type:'em_interference', pos:[500,500], radius:200, effect:'reduce_vision', value:0.4, label:'强电磁区' }
          ],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'assault_bug', pos:[400,500], pattern:'guard' },
            { enemyId:'assault_bug', pos:[600,500], pattern:'guard' },
            { enemyId:'worker_bug', pos:[300,700], pattern:'guard' },
            { enemyId:'worker_bug', pos:[700,700], pattern:'guard' }
          ],
          lootPoints: []
        }
      },
      canyon_entrance: {
        id:'canyon_entrance', name:'峡谷入口', label:'峡', x:2, y:5,
        desc:'向下通往地下矿洞的峡谷入口。两侧岩壁陡峭，底部有一个巨大的洞穴，里面似乎有虫群的嗡鸣声。',
        exits:{ north:'wasteland_south', down:'mine_entrance' },
        npcs:[],
        sceneType: 'battle',
        enemies:[],
        battlefield: {
          terrain: 'rocky',
          terrainPenalty: { biped: 0.9, wheel: 0.65 },
          covers: [
            { id:'w1', pos:[300,600], size:[80,150], height:8, durability:1000, label:'峡谷岩壁' }
          ],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'assault_bug', pos:[500,700], pattern:'guard' }
          ],
          lootPoints: []
        }
      },
 
      // ===== 地下矿洞 =====
      mine_entrance: {
        id:'mine_entrance', name:'矿洞入口', label:'洞', x:2, y:6, z:-1,
        desc:'地下矿洞的入口处，洞顶滴落着含矿的水珠。岩壁上镶嵌着稀疏的辉锗矿结晶，散发着微弱的蓝光。通道深处传来虫群的爬动声。',
        exits:{ up:'canyon_entrance', south:'mine_tunnel' },
        npcs:[],
        sceneType: 'battle',
        enemies:[],
        battlefield: {
          terrain: 'cave',
          terrainPenalty: { biped: 0.9, wheel: 0.7 },
          covers: [
            { id:'p1', pos:[300,400], size:[100,80], height:3, durability:500, label:'矿柱' }
          ],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'worker_bug', pos:[600,500], pattern:'guard' }
          ],
          lootPoints: []
        }
      },
      mine_tunnel: {
        id:'mine_tunnel', name:'矿洞隧道', label:'隧', x:2, y:7, z:-1,
        desc:'狭长的地下隧道，两侧是开凿的痕迹。辉锗矿结晶越来越密集，几乎照亮了整个通道。',
        exits:{ north:'mine_entrance', south:'mine_chamber', east:'mine_side' },
        npcs:[],
        sceneType: 'battle',
        enemies:[],
        battlefield: {
          terrain: 'cave',
          terrainPenalty: { biped: 0.85, wheel: 0.6 },
          covers: [
            { id:'p2', pos:[700,300], size:[90,70], height:3, durability:450, label:'矿石堆' }
          ],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'worker_bug', pos:[400,600], pattern:'guard' },
            { enemyId:'assault_bug', pos:[700,500], pattern:'guard' }
          ],
          lootPoints: []
        }
      },
      mine_side: {
        id:'mine_side', name:'矿洞侧室', label:'侧', x:3, y:7, z:-1,
        desc:'一个小型的矿洞侧室，似乎是先遣队早期的采矿点。角落里散落着废弃的采矿设备和包装箱。',
        exits:{ west:'mine_tunnel' },
        npcs:[],
        sceneType: 'battle',
        enemies:[],
        items:['repair_kit_small'],
        battlefield: {
          terrain: 'cave',
          terrainPenalty: { biped: 0.9, wheel: 0.7 },
          covers: [
            { id:'b1', pos:[600,500], size:[100,80], height:2, durability:300, label:'设备箱' }
          ],
          hazards: [],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'worker_bug', pos:[400,400], pattern:'guard' }
          ],
          lootPoints: []
        }
      },
      mine_chamber: {
        id:'mine_chamber', name:'矿石大厅', label:'厅', x:2, y:8, z:-1,
        desc:'巨大的地下洞窟，洞顶镶嵌着大量的辉锗矿结晶，将整个大厅照得幽蓝通明。大厅中央有一座由虫胶和矿石构筑的巢穴，里面似乎有什么东西在蠕动。',
        exits:{ north:'mine_tunnel' },
        npcs:[],
        sceneType: 'battle',
        isBossRoom:true,
        battlefield: {
          terrain: 'cave',
          terrainPenalty: { biped: 0.85, wheel: 0.55 },
          covers: [
            { id:'cp1', pos:[250,400], size:[120,100], height:4, durability:700, label:'巨矿石' },
            { id:'cp2', pos:[750,400], size:[120,100], height:4, durability:700, label:'巨矿石' }
          ],
          hazards: [
            { type:'acid_pool', pos:[500,700], radius:80, effect:'corrosion', dps:5, label:'酸液池' }
          ],
          entryPoints: { north:[500,50], south:[500,950], east:[950,500], west:[50,500] },
          enemies: [
            { enemyId:'assault_bug', pos:[350,600], pattern:'guard' },
            { enemyId:'assault_bug', pos:[650,600], pattern:'guard' },
            { enemyId:'worker_bug', pos:[500,800], pattern:'guard' }
          ],
          lootPoints: []
        }
      }
    },

  // ===== 10x10 网格布局 =====
  // 图例: B=Base, A=Arid, W=Wild, C=Cave, T=Transition, M=Mechanical, S=Special, F=Frontier
  _grid: [
    ['M','M','A','A','A','W','W','W','W','S'],
    ['M','M','B','B','A','W','W','W','S','S'],
    ['A','B','B','B','A','W','W','S','S','F'],
    ['A','A','A','T','T','C','C','F','F','F'],
    ['W','W','W','T','T','C','C','F','F','F'],
    ['W','W','W','C','C','C','C','F','F','F'],
    ['W','W','W','C','C','C','C','F','F','F'],
    ['W','W','C','C','C','C','F','F','F','F'],
    ['W','C','C','C','F','F','F','F','F','F'],
    ['C','C','C','C','F','F','F','F','F','F']
  ],

  // 各区域类型配置
  _zoneConfig: {
    B: {
      prefix: 'base',
      label: '基',
      zoneName: '前哨周边',
      terrains: ['metal_floor'],
      terrainPenalty: { biped: 1.0, wheel: 0.9 },
      enemyPool: [],
      enemyCount: [0, 0],
      coverType: 'metal',
      coverCount: [0, 1],
      lootChance: 0,
      lootTable: [],
      hazardChance: 0,
      hazards: [],
      desc: '前哨基地的外围区域，平整的金属地面延伸至基地边缘，防御哨戒炮在远处静静值守。',
      isSafe: true
    },
    A: {
      prefix: 'arid',
      label: '原',
      zoneName: '荒原',
      terrains: ['rocky', 'sandy'],
      terrainPenalty: { biped: 0.9, wheel: 0.7 },
      enemyPool: [['worker_bug',60], ['assault_bug',30], ['hopper',10]],
      enemyCount: [1, 2],
      coverType: 'rock',
      coverCount: [1, 3],
      lootChance: 0.1,
      lootTable: [['iron_ore',[1,2]], ['copper_ore',[1,1]]],
      hazardChance: 0,
      hazards: [],
      desc: '赤褐色的荒原一望无际，风化岩屑在脚下沙沙作响。'
    },
    W: {
      prefix: 'wild',
      label: '野',
      zoneName: '荒野',
      terrains: ['rocky', 'sandy', 'crystal'],
      terrainPenalty: { biped: 0.85, wheel: 0.65 },
      enemyPool: [['worker_bug',40], ['assault_bug',30], ['acid_spitter',15], ['flying_bug',10], ['beetle',5]],
      enemyCount: [2, 3],
      coverType: 'rock',
      coverCount: [1, 2],
      lootChance: 0,
      lootTable: [],
      hazardChance: 0.05,
      hazards: [{ type:'toxic_fog', effect:'poison', dps:5, radius:80, label:'毒雾区' }],
      desc: '荒野地带，地表覆盖着风化的岩屑和稀疏的结晶矿脉。'
    },
    C: {
      prefix: 'cave',
      label: '矿',
      zoneName: '矿洞',
      terrains: ['cave'],
      terrainPenalty: { biped: 0.9, wheel: 0.7 },
      enemyPool: [['worker_bug',20], ['assault_bug',30], ['beetle',20], ['toxic_bug',15], ['acid_spitter',15]],
      enemyCount: [2, 4],
      coverType: 'pillar',
      coverCount: [1, 2],
      lootChance: 0.3,
      lootTable: [['iron_ore',[2,4]], ['copper_ore',[1,2]], ['germanite_shard',[1,1]]],
      hazardChance: 0.1,
      hazards: [{ type:'acid_pool', effect:'corrosion', dps:5, radius:80, label:'酸液池' }],
      desc: '地下矿洞，洞壁镶嵌着发光的辉锗矿结晶，虫群的爬动声在黑暗中回荡。',
      z: -1
    },
    M: {
      prefix: 'mech',
      label: '械',
      zoneName: '机械遗迹',
      terrains: ['metal_floor', 'crystal'],
      terrainPenalty: { biped: 0.9, wheel: 0.7 },
      enemyPool: [['recon_probe',40], ['defense_node',30], ['particle_sentry',20], ['self_repair_guardian',10]],
      enemyCount: [1, 3],
      coverType: 'metal',
      coverCount: [1, 2],
      lootChance: 0,
      lootTable: [],
      hazardChance: 0.15,
      hazards: [{ type:'em_interference', effect:'reduce_vision', value:0.5, radius:120, label:'电磁干扰区' }],
      desc: '远古机械文明的遗迹，金属地面上覆盖着锈蚀的装甲板，空气中弥漫着电磁干扰。'
    },
    T: {
      prefix: 'trans',
      label: '渡',
      zoneName: '过渡区',
      terrains: ['rocky'],
      terrainPenalty: { biped: 0.9, wheel: 0.7 },
      enemyPool: [['worker_bug',60], ['assault_bug',40]],
      enemyCount: [0, 2],
      coverType: 'rock',
      coverCount: [0, 1],
      lootChance: 0,
      lootTable: [],
      hazardChance: 0,
      hazards: [],
      desc: '连接不同区域的过渡地带，地形逐渐发生变化。'
    },
    S: {
      prefix: 'spec',
      label: '奇',
      zoneName: '奇异地形',
      terrains: ['rocky', 'sandy', 'crystal', 'cave'],
      terrainPenalty: { biped: 0.9, wheel: 0.7 },
      enemyPool: [['worker_bug',20], ['assault_bug',20], ['hopper',15], ['recon_probe',15], ['defense_node',15], ['acid_spitter',15]],
      enemyCount: [1, 3],
      coverType: 'rock',
      coverCount: [1, 3],
      lootChance: 0.15,
      lootTable: [['iron_ore',[1,2]], ['copper_ore',[1,1]], ['germanite_shard',[1,1]]],
      hazardChance: 0.05,
      hazards: [
        { type:'toxic_fog', effect:'poison', dps:5, radius:80, label:'毒雾区' },
        { type:'em_interference', effect:'reduce_vision', value:0.5, radius:120, label:'电磁干扰区' }
      ],
      desc: '一片奇异的区域，地表呈现出不自然的色彩和纹理。',
      npcChance: 0.15
    },
    F: {
      prefix: 'front',
      label: '前',
      zoneName: '前沿区域',
      terrains: ['crystal', 'cave'],
      terrainPenalty: { biped: 0.8, wheel: 0.55 },
      enemyPool: [['assault_bug',20], ['beetle',15], ['acid_spitter',15], ['recon_probe',15], ['defense_node',15], ['particle_sentry',10], ['self_repair_guardian',10]],
      enemyCount: [2, 4],
      coverType: 'rock',
      coverCount: [1, 3],
      lootChance: 0.25,
      lootTable: [['iron_ore',[2,4]], ['copper_ore',[1,3]], ['germanite_shard',[1,2]]],
      hazardChance: 0.2,
      hazards: [
        { type:'em_interference', effect:'reduce_vision', value:0.5, radius:120, label:'电磁干扰区' },
        { type:'acid_pool', effect:'corrosion', dps:5, radius:80, label:'酸液池' }
      ],
      desc: '前沿区域，这里是虫族和机械敌人最活跃的地带，危险重重。'
    }
  },

  // 伪随机数生成器（基于种子的确定性随机）
  _seededRandom: function(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  },

  // 加权随机选择
  _weightedPick: function(items, seed) {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this._seededRandom(seed) * total;
    for (const [item, w] of items) {
      r -= w;
      if (r <= 0) return item;
    }
    return items[items.length - 1][0];
  },

  // 范围内随机整数
  _randInt: function(min, max, seed) {
    return Math.floor(this._seededRandom(seed) * (max - min + 1)) + min;
  },

  // 生成掩体
  _genCover: function(type, idx, seed) {
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
  },

  // 生成敌人
  _genEnemies: function(config, x, y, seed) {
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
  },

  // 生成战利品
  _genLoot: function(config, x, y, seed) {
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
  },

  // 生成环境危害
  _genHazards: function(config, x, y, seed) {
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
  },

  // ===== 房间生成主函数 =====
  generateRooms: function() {
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
  },

  // 设置出口连通性
  _setupExits: function() {
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
  },

  // 更新 areas 数组
  _updateAreas: function() {
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
  },

  areas: [
    { name:'🛰 前哨基地', rooms:['outpost_hub','outpost_command','outpost_arsenal','outpost_repair','outpost_gate'] },
    { name:'🏜 荒原区域', rooms:[] },
    { name:'🌵 荒野区域', rooms:[] },
    { name:'⛏ 地下矿洞', rooms:[] },
    { name:'⚙ 机械遗迹', rooms:[] },
    { name:'🔄 过渡区域', rooms:[] },
    { name:'✨ 奇异地形', rooms:[] },
    { name:'⚔ 前沿区域', rooms:[] }
  ]
};