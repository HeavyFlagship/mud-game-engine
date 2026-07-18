// ========== 技能数据库 ==========
const SkillDB = {
  slash:    { id:'slash',    name:'猛力斩',   mpCost:5,  type:'attack',  mult:1.8, desc:'集中力量的一击，造成1.8倍攻击伤害。', levelReq:1 },
  fireball: { id:'fireball', name:'火球术',   mpCost:15, type:'magic',   mult:2.2, desc:'发射灼热的火球，造成2.2倍魔法伤害。', levelReq:3, element:'fire' },
  heal:     { id:'heal',     name:'治疗术',   mpCost:10, type:'heal',    mult:1.5, desc:'用魔法治愈伤口，恢复1.5倍魔力的生命。', levelReq:1 },
  ice_lance:{ id:'ice_lance',name:'冰枪术',   mpCost:20, type:'magic',   mult:2.5, desc:'召唤冰之长枪贯穿敌人，造成2.5倍伤害。', levelReq:5, element:'ice' },
  thunder:  { id:'thunder',  name:'雷霆一击', mpCost:30, type:'magic',   mult:3.0, desc:'召唤雷霆之力，造成3.0倍伤害，有几率眩晕。', levelReq:8, element:'thunder', effect:'stun' },
  berserk:  { id:'berserk',  name:'狂暴',     mpCost:25, type:'buff',    mult:0,   desc:'进入狂暴状态，攻击力提升50%持续3回合。', levelReq:6, effect:'berserk', duration:3 },
  shield:   { id:'shield',   name:'护盾术',   mpCost:15, type:'buff',    mult:0,   desc:'生成魔法护盾，减少受到的伤害30%持续3回合。', levelReq:4, effect:'shield', duration:3 },
  poison_blade: { id:'poison_blade', name:'毒刃', mpCost:12, type:'attack', mult:1.5, desc:'淬毒的攻击，造成伤害并附加中毒效果。', levelReq:2, effect:'poison' },
  double_slash: { id:'double_slash', name:'双斩', mpCost:18, type:'attack', mult:1.2, desc:'连续两次斩击，每次造成1.2倍伤害。', levelReq:7, hits:2 },
};
