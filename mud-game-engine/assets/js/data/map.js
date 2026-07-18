// ========== 地图数据 ==========
// 房间字段说明：
// id: 房间唯一标识
// name: 房间名称
// label: 迷你地图单字标注
// x/y/z: 三维地图坐标，z=0 为地表，z<0 为地下
// exits: 可通行出口，键为方向，值为目标房间 id
const MapDB = {
  rooms: {
      // ===== 新手村 =====
      village_square: {
        id:'village_square', name:'村庄广场', label:'广', x:2, y:2,
        desc:'阳光洒在青石板铺就的广场上，中央有一座古老的喷泉。四周是低矮的石屋，村民们来来往往。北方是村庄大厅，东面通往杂货铺，西面是铁匠铺。',
        exits:{ north:'village_hall', east:'shop', west:'blacksmith', south:'village_south' },
        npcs:['elder'],
        enemies:[]
      },
      village_hall: {
        id:'village_hall', name:'村庄大厅', label:'厅', x:2, y:1,
        desc:'宽敞的大厅内，木质长桌排列整齐。墙上挂着历代村长的画像。一位老者坐在高台上，似乎在等待什么人。',
        exits:{ south:'village_square' },
        npcs:['elder'],
        enemies:[]
      },
      shop: {
        id:'shop', name:'杂货铺', label:'杂', x:3, y:2,
        desc:'铺子里摆满了各种商品，从药水到日用品应有尽有。柜台后面的店主热情地招呼着每一位客人。',
        exits:{ west:'village_square' },
        npcs:['merchant'],
        enemies:[],
        isShop:true
      },
      blacksmith: {
        id:'blacksmith', name:'铁匠铺', label:'铁', x:1, y:2,
        desc:'炉火熊熊燃烧，铁锤敲击的声音此起彼伏。一位肌肉虬结的铁匠正在锻造武器。',
        exits:{ east:'village_square' },
        npcs:['smith'],
        enemies:[],
        isShop:true
      },
      village_south: {
        id:'village_south', name:'村庄南门', label:'门', x:2, y:3,
        desc:'村庄的南门，门外是一条通往幽暗森林的小路。守卫警惕地注视着远方。',
        exits:{ north:'village_square', south:'forest_entrance' },
        npcs:[],
        enemies:[]
      },

      // ===== 幽暗森林 =====
      forest_entrance: {
        id:'forest_entrance', name:'森林入口', label:'林', x:2, y:4,
        desc:'高大的古树遮天蔽日，阳光几乎无法穿透茂密的树冠。空气中弥漫着泥土和落叶的气息。一条蜿蜒的小路延伸向北方和东方。',
        exits:{ north:'village_south', east:'forest_path', south:'forest_deep' },
        npcs:[],
        enemies:[['slime',0.6],['bat',0.4]]
      },
      forest_path: {
        id:'forest_path', name:'林间小径', label:'径', x:3, y:4,
        desc:'狭窄的小径两旁，灌木丛中不时传来窸窣声。地上有兽类的脚印。你注意到一截枯木旁似乎有什么东西在闪光。',
        exits:{ west:'forest_entrance', east:'forest_clearing', south:'wolf_den' },
        npcs:[],
        enemies:[['goblin',0.5],['bat',0.4]],
        items:['hp_small']
      },
      forest_clearing: {
        id:'forest_clearing', name:'林间空地', label:'空', x:4, y:4,
        desc:'一片开阔的空地，中间有一堆篝火的余烬。看来有旅人在此扎过营。空地边缘有一个向下延伸的漆黑洞口，似乎通往地底矿洞。',
        exits:{ west:'forest_path', down:'cave_entrance' },
        npcs:[],
        enemies:[['goblin',0.6],['wolf',0.4]]
      },
      forest_deep: {
        id:'forest_deep', name:'幽暗深处', label:'幽', x:2, y:5,
        desc:'森林的最深处，光线几乎完全消失了。不时有诡异的眼睛在黑暗中闪烁。空气中飘来腐烂的气味。',
        exits:{ north:'forest_entrance', south:'graveyard_entrance' },
        npcs:[],
        enemies:[['wolf',0.5],['skeleton',0.5]]
      },
      wolf_den: {
        id:'wolf_den', name:'狼穴', label:'狼', x:3, y:5,
        desc:'一个散落着骨头的洞穴，恶臭扑鼻。这里显然是某种野兽的巢穴。洞穴深处传来低沉的咆哮声。',
        exits:{ north:'forest_path' },
        npcs:[],
        enemies:[['wolf',0.8]],
        items:['leather_armor']
      },

      // ===== 矿洞 =====
      cave_entrance: {
        id:'cave_entrance', name:'矿洞入口', label:'洞', x:4, y:3, z:-1,
        desc:'你站在地底矿洞的入口处，头顶的洞口透下一缕微光。深处传来滴水的回声，洞壁上插着几支快要燃尽的火把，说明最近有人来过。',
        exits:{ up:'forest_clearing', north:'cave_tunnel' },
        npcs:[],
        enemies:[['bat',0.5],['skeleton',0.3]]
      },
      cave_tunnel: {
        id:'cave_tunnel', name:'矿洞隧道', label:'矿', x:4, y:2, z:-1,
        desc:'狭窄的隧道向深处延伸，两侧的岩壁上闪烁着矿石的光芒。脚下的铁轨已经锈蚀不堪。',
        exits:{ south:'cave_entrance', north:'cave_chamber', west:'cave_side' },
        npcs:[],
        enemies:[['skeleton',0.5],['goblin',0.4]],
        items:['iron_sword']
      },
      cave_side: {
        id:'cave_side', name:'矿洞侧室', label:'储', x:3, y:2, z:-1,
        desc:'一间被遗弃的储藏室，角落里堆放着生锈的矿镐和破旧的木箱。一个木箱似乎还能打开。',
        exits:{ east:'cave_tunnel' },
        npcs:[],
        enemies:[['goblin',0.3]],
        items:['hp_medium','old_key']
      },
      cave_chamber: {
        id:'cave_chamber', name:'矿石大厅', label:'厅', x:4, y:1, z:-1,
        desc:'一个巨大的天然洞窟，洞顶镶嵌着发光的矿石，照亮了整个空间。中央有一座石台，上面放着一把光芒四射的宝剑。但守护石台的石头傀儡似乎不太欢迎来客。',
        exits:{ south:'cave_tunnel' },
        npcs:[],
        enemies:[['stone_golem',0.9]],
        items:['steel_blade']
      },

      // ===== 墓地 =====
      graveyard_entrance: {
        id:'graveyard_entrance', name:'墓地入口', label:'墓', x:2, y:6,
        desc:'破败的铁门半掩着，门上的铭牌已经锈蚀得无法辨认。墓碑歪歪斜斜地排列着，空气中弥漫着阴冷的气息。',
        exits:{ north:'forest_deep', south:'graveyard_path' },
        npcs:[],
        enemies:[['skeleton',0.6]]
      },
      graveyard_path: {
        id:'graveyard_path', name:'墓地小径', label:'径', x:2, y:7,
        desc:'碎石铺成的小路两旁是年代久远的坟墓。夜风吹过，枯树枝发出怪异的声响。你隐约看到前方有一座较大的建筑。',
        exits:{ north:'graveyard_entrance', south:'crypt_entrance', east:'graveyard_tomb' },
        npcs:[],
        enemies:[['skeleton',0.5],['dark_mage',0.3]]
      },
      graveyard_tomb: {
        id:'graveyard_tomb', name:'古墓', label:'古', x:3, y:7,
        desc:'一座古老的陵墓，门上的封印已经松动。墓室内部阴暗潮湿，墙壁上刻满了古老的咒文。角落里有一个骷髅正缓缓站起。',
        exits:{ west:'graveyard_path' },
        npcs:[],
        enemies:[['skeleton',0.4],['dark_mage',0.4]],
        items:['ring_hp','mp_medium']
      },
      crypt_entrance: {
        id:'crypt_entrance', name:'地下墓穴入口', label:'穴', x:2, y:8,
        desc:'通往地下墓穴的石阶被青苔覆盖。从下面传来若有若无的低语声。空气中弥漫着令人不安的魔法气息。',
        exits:{ north:'graveyard_path', south:'crypt_hall' },
        npcs:[],
        enemies:[['dark_mage',0.5]]
      },
      crypt_hall: {
        id:'crypt_hall', name:'墓穴大厅', label:'王', x:2, y:9,
        desc:'宏大的地下大厅，巨大的石柱支撑着穹顶。大厅中央，一具身着华服的不死生物端坐在骷髅王座上——那是传说中统治此地的巫妖。',
        exits:{ north:'crypt_entrance' },
        npcs:[],
        enemies:[['lich',1.0]],
        items:['flame_sword','mystic_robe','crystal'],
        isBossRoom:true
      },

      // ===== 龙之山脉 =====
      mountain_base: {
        id:'mountain_base', name:'山脉脚下', label:'山', x:0, y:2,
        desc:'巍峨的山脉耸立在前方，山体被冰雪覆盖。狂风呼啸，空气中弥漫着硫磺的味道。一条险峻的山路蜿蜒向上。',
        exits:{ east:'blacksmith', north:'mountain_trail' },
        npcs:[],
        enemies:[['orc',0.4]]
      },
      mountain_trail: {
        id:'mountain_trail', name:'山路', label:'路', x:0, y:1,
        desc:'陡峭的山路，一侧是悬崖峭壁，另一侧是岩壁。碎石不时从上方滚落。你看到远处山顶有一座巨大的洞穴。',
        exits:{ south:'mountain_base', north:'mountain_camp' },
        npcs:[],
        enemies:[['orc',0.5],['wyvern',0.3]]
      },
      mountain_camp: {
        id:'mountain_camp', name:'废弃营地', label:'营', x:0, y:0,
        desc:'一个被遗弃的冒险者营地，散落着破败的帐篷和熄灭的篝火。从残留的物资来看，这里曾经是一支讨伐巨龙的队伍。',
        exits:{ south:'mountain_trail', north:'dragon_lair' },
        npcs:[],
        enemies:[['orc',0.4],['vampire',0.3]],
        items:['hp_large','plate_armor','amulet_crit']
      },
      dragon_lair: {
        id:'dragon_lair', name:'龙巢', label:'龙', x:0, y:-1,
        desc:'巨大的洞穴中堆满了金币和财宝。灼热的气息扑面而来，洞窟深处传来震耳欲聋的呼吸声。一头远古巨龙正蜷伏在宝藏之上，金色的竖瞳死死盯着你。',
        exits:{ south:'mountain_camp' },
        npcs:[],
        enemies:[['dragon',1.0]],
        items:['dragon_slay'],
        isBossRoom:true
      }
    },

  areas: [
    { name:'🟢 新手村', rooms:['village_square','village_hall','shop','blacksmith','village_south'] },
    { name:'🌲 幽暗森林', rooms:['forest_entrance','forest_path','forest_clearing','forest_deep','wolf_den'] },
    { name:'⛏ 矿洞', rooms:['cave_entrance','cave_tunnel','cave_side','cave_chamber'] },
    { name:'⚰ 墓地', rooms:['graveyard_entrance','graveyard_path','graveyard_tomb','crypt_entrance','crypt_hall'] },
    { name:'🏔 龙之山脉', rooms:['mountain_base','mountain_trail','mountain_camp','dragon_lair'] },
  ]
};
