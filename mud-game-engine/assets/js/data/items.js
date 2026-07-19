// ========== 物品数据库 ==========
const ItemDB = {
  weapons: {
    wooden_sword:    { id:'wooden_sword',    name:'木剑',       type:'weapon', slot:'weapon', atk:5,  desc:'一把粗糙的木剑，聊胜于无。', price:10 },
    iron_sword:      { id:'iron_sword',      name:'铁剑',       type:'weapon', slot:'weapon', atk:12, desc:'锋利的铁剑，剑身寒光凛凛。', price:50 },
    steel_blade:     { id:'steel_blade',     name:'精钢长刀',   type:'weapon', slot:'weapon', atk:22, desc:'以精钢锻造的长刀，削铁如泥。', price:200 },
    flame_sword:     { id:'flame_sword',     name:'烈焰之剑',   type:'weapon', slot:'weapon', atk:38, desc:'剑身缠绕着永不熄灭的火焰。', price:800 },
    shadow_dagger:   { id:'shadow_dagger',   name:'暗影匕首',   type:'weapon', slot:'weapon', atk:28, desc:'来自暗影世界的利刃，攻击时有几率造成双倍伤害。', price:500, special:'double_strike' },
    dragon_slay:     { id:'dragon_slay',     name:'屠龙者',     type:'weapon', slot:'weapon', atk:55, desc:'传说中能斩杀巨龙的神器。', price:5000 },
  },
  armors: {
    cloth_armor:     { id:'cloth_armor',     name:'布甲',       type:'armor', slot:'armor', def:3,  desc:'简单的布质护甲。', price:8 },
    leather_armor:   { id:'leather_armor',   name:'皮甲',       type:'armor', slot:'armor', def:8,  desc:'轻便的皮革护甲，适合新冒险者。', price:40 },
    chain_mail:      { id:'chain_mail',      name:'锁子甲',     type:'armor', slot:'armor', def:16, desc:'由无数铁环编织而成的甲胄。', price:180 },
    plate_armor:     { id:'plate_armor',     name:'板甲',       type:'armor', slot:'armor', def:28, desc:'厚重的全身板甲，防御力惊人。', price:600 },
    mystic_robe:     { id:'mystic_robe',     name:'秘法长袍',   type:'armor', slot:'armor', def:15, desc:'附有魔法保护的法师长袍，额外增加最大法力值。', price:450, special:'mana_boost', mpBonus:50 },
  },
  accessories: {
    ring_hp:         { id:'ring_hp',         name:'生命之戒',   type:'armor', slot:'accessory', def:2, desc:'增加最大生命值的戒指。', price:150, hpBonus:30 },
    ring_atk:        { id:'ring_atk',        name:'力量之戒',   type:'weapon', slot:'accessory', atk:5, desc:'增加攻击力的戒指。', price:200 },
    amulet_crit:     { id:'amulet_crit',     name:'暴击护符',   type:'weapon', slot:'accessory', atk:3, desc:'提升暴击率的护符。', price:350, special:'crit_boost', critBonus:15 },
  },
  potions: {
    hp_small:   { id:'hp_small',   name:'小生命药水', type:'potion', heal:30,  desc:'恢复30点生命值。', price:5 },
    hp_medium:  { id:'hp_medium',  name:'中生命药水', type:'potion', heal:80,  desc:'恢复80点生命值。', price:15 },
    hp_large:   { id:'hp_large',   name:'大生命药水', type:'potion', heal:200, desc:'恢复200点生命值。', price:50 },
    mp_small:   { id:'mp_small',   name:'小法力药水', type:'potion', mana:30,  desc:'恢复30点法力值。', price:5 },
    mp_medium:  { id:'mp_medium',  name:'中法力药水', type:'potion', mana:80,  desc:'恢复80点法力值。', price:15 },
    antidote:   { id:'antidote',   name:'解毒剂',     type:'potion', desc:'解除中毒状态。', price:20, curePoison:true },
  },
  questItems: {
    old_key:    { id:'old_key',    name:'锈蚀的钥匙', type:'quest', desc:'一把古老生锈的钥匙，上面刻着奇异的符文。' },
    crystal:    { id:'crystal',    name:'魔法水晶',   type:'quest', desc:'散发微光的蓝色水晶，蕴含着强大的魔力。' },
    dragon_fang: { id:'dragon_fang', name:'龙牙',      type:'quest', desc:'从巨龙口中拔出的锋利獠牙。' },
    letter:     { id:'letter',     name:'神秘信件',   type:'quest', desc:'一封没有署名的信件，字迹模糊。' },
  },
  get(id) {
    for (const cat of Object.values(this)) {
      if (cat[id]) return { ...cat[id] };
    }
    return null;
  }
};
