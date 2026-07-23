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
  rooms: {
      // ===== 前哨基地 =====
      outpost_hub: {
        id:'outpost_hub', name:'前哨基地·中央大厅', label:'基', x:2, y:2,
        desc:'先遣队在织女-7建立的小型前哨基地。穹顶形的建筑内，维护设备嗡嗡运转，空气中飘着臭氧的气味。北面是指挥室，东面是装备库，西面是维修站。',
        exits:{ north:'outpost_command', east:'outpost_arsenal', west:'outpost_repair', south:'outpost_gate' },
        npcs:['commander'],
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
        id:'outpost_command', name:'指挥室', label:'指', x:2, y:1,
        desc:'基地的指挥中心，墙上挂满了星球地图和监测数据。指挥官的全息投影终端位于正中央。',
        exits:{ south:'outpost_hub' },
        npcs:['commander'],
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
        id:'outpost_arsenal', name:'装备库', label:'库', x:3, y:2,
        desc:'武器和装备的存储区。成排的机架上停放着各型号的载具，墙上挂满了模块化武器。军械士正在调试一门脉冲激光炮。',
        exits:{ west:'outpost_hub' },
        npcs:['quartermaster'],
        enemies:[],
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
        id:'outpost_repair', name:'维修站', label:'修', x:1, y:2,
        desc:'装备维修和改装车间。机械臂和焊接设备整齐排列，空气中弥漫着金属热加工的气味。维修师正在检查一台受损的侦察机体。',
        exits:{ east:'outpost_hub' },
        npcs:['engineer'],
        enemies:[],
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
        id:'outpost_gate', name:'基地南门', label:'门', x:2, y:3,
        desc:'基地的气闸门，厚重的合金门外就是赤褐色的荒原。门口的守卫机体正在例行巡逻。门外是一条通往南部荒原的小路。',
        exits:{ north:'outpost_hub', south:'wasteland_north' },
        npcs:[],
        enemies:[],
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
        id:'wasteland_north', name:'荒原北部', label:'原', x:2, y:4,
        desc:'赤褐色的荒原一望无际，地表覆盖着风化的岩屑和沙尘。远处的地平线上隐约可见矿脉的轮廓。空气干燥，带着硫化物的刺鼻气味。',
        exits:{ north:'outpost_gate', south:'wasteland_south', east:'wasteland_east' },
        npcs:[],
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
        id:'wasteland_east', name:'荒原东部', label:'东', x:3, y:4,
        desc:'荒原东部，地表散布着发光的结晶矿脉，空气中有微弱的电磁干扰。越往东走，矿脉越密集，虫子的活动迹象也越多。',
        exits:{ west:'wasteland_north', south:'crystal_valley' },
        npcs:[],
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
        id:'wasteland_south', name:'荒原南部', label:'南', x:2, y:5,
        desc:'荒原南部，地表逐渐向下倾斜，通向一条深邃的峡谷。峡谷入口处有虫群活动的痕迹，地面布满了黏液和爬行轨迹。',
        exits:{ north:'wasteland_north', south:'canyon_entrance' },
        npcs:[],
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
        id:'crystal_valley', name:'结晶峡谷', label:'谷', x:3, y:5,
        desc:'一片被发光结晶矿脉覆盖的峡谷。辉锗矿的光芒在暗处闪烁，如同星河倒悬。这里是虫子的主要栖息地，空气中弥漫着危险的气息。',
        exits:{ north:'wasteland_east' },
        npcs:[],
        enemies:[],
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
        id:'canyon_entrance', name:'峡谷入口', label:'峡', x:2, y:6,
        desc:'向下通往地下矿洞的峡谷入口。两侧岩壁陡峭，底部有一个巨大的洞穴，里面似乎有虫群的嗡鸣声。',
        exits:{ north:'wasteland_south', down:'mine_entrance' },
        npcs:[],
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
        id:'mine_entrance', name:'矿洞入口', label:'洞', x:2, y:7, z:-1,
        desc:'地下矿洞的入口处，洞顶滴落着含矿的水珠。岩壁上镶嵌着稀疏的辉锗矿结晶，散发着微弱的蓝光。通道深处传来虫群的爬动声。',
        exits:{ up:'canyon_entrance', south:'mine_tunnel' },
        npcs:[],
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
        id:'mine_tunnel', name:'矿洞隧道', label:'隧', x:2, y:8, z:-1,
        desc:'狭长的地下隧道，两侧是开凿的痕迹。辉锗矿结晶越来越密集，几乎照亮了整个通道。',
        exits:{ north:'mine_entrance', south:'mine_chamber', east:'mine_side' },
        npcs:[],
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
        id:'mine_side', name:'矿洞侧室', label:'侧', x:3, y:8, z:-1,
        desc:'一个小型的矿洞侧室，似乎是先遣队早期的采矿点。角落里散落着废弃的采矿设备和包装箱。',
        exits:{ west:'mine_tunnel' },
        npcs:[],
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
        id:'mine_chamber', name:'矿石大厅', label:'厅', x:2, y:9, z:-1,
        desc:'巨大的地下洞窟，洞顶镶嵌着大量的辉锗矿结晶，将整个大厅照得幽蓝通明。大厅中央有一座由虫胶和矿石构筑的巢穴，里面似乎有什么东西在蠕动。',
        exits:{ north:'mine_tunnel' },
        npcs:[],
        enemies:[],
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
 
  areas: [
    { name:'🛰 前哨基地', rooms:['outpost_hub','outpost_command','outpost_arsenal','outpost_repair','outpost_gate'] },
    { name:'🏜 荒原区域', rooms:['wasteland_north','wasteland_east','wasteland_south','crystal_valley','canyon_entrance'] },
    { name:'⛏ 地下矿洞', rooms:['mine_entrance','mine_tunnel','mine_side','mine_chamber'] },
  ]
};
