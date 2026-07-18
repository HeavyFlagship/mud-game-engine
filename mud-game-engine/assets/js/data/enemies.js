// ========== 敌人数据库 ==========
const EnemyDB = {
  slime:         { id:'slime',         name:'史莱姆',       hp:30,   atk:5,  def:2,  exp:10,  gold:5,   drops:[['hp_small',0.5]], level:1 },
  bat:           { id:'bat',           name:'巨型蝙蝠',     hp:40,   atk:8,  def:3,  exp:15,  gold:8,   drops:[['hp_small',0.3]], level:1 },
  goblin:        { id:'goblin',        name:'哥布林',       hp:60,   atk:12, def:5,  exp:25,  gold:15,  drops:[['hp_small',0.4],['leather_armor',0.1]], level:2 },
  skeleton:      { id:'skeleton',      name:'骷髅战士',     hp:90,   atk:16, def:8,  exp:40,  gold:25,  drops:[['iron_sword',0.08],['hp_medium',0.3]], level:3 },
  wolf:          { id:'wolf',          name:'暗影狼',       hp:80,   atk:20, def:6,  exp:35,  gold:20,  drops:[['leather_armor',0.1]], level:3 },
  orc:           { id:'orc',           name:'兽人武士',     hp:150,  atk:25, def:14, exp:65,  gold:40,  drops:[['chain_mail',0.08],['hp_medium',0.4]], level:5 },
  dark_mage:     { id:'dark_mage',     name:'暗黑法师',     hp:100,  atk:35, def:8,  exp:80,  gold:50,  drops:[['mp_medium',0.5],['ring_atk',0.05]], level:6, canMagic:true },
  stone_golem:   { id:'stone_golem',   name:'石头傀儡',     hp:250,  atk:20, def:25, exp:100, gold:60,  drops:[['plate_armor',0.05],['hp_large',0.3]], level:7 },
  vampire:       { id:'vampire',       name:'吸血鬼',       hp:180,  atk:32, def:12, exp:120, gold:80,  drops:[['shadow_dagger',0.05],['ring_hp',0.08]], level:8, canDrain:true },
  wyvern:        { id:'wyvern',        name:'双足飞龙',     hp:300,  atk:40, def:20, exp:180, gold:120, drops:[['steel_blade',0.08],['hp_large',0.4]], level:10 },
  lich:          { id:'lich',          name:'巫妖',         hp:350,  atk:50, def:18, exp:250, gold:200, drops:[['flame_sword',0.05],['mystic_robe',0.06],['crystal',0.2]], level:12, canMagic:true },
  dragon:        { id:'dragon',        name:'远古巨龙',     hp:800,  atk:65, def:35, exp:500, gold:500, drops:[['dragon_slay',0.08],['dragon_fang',0.3]], level:15, isBoss:true },
};
