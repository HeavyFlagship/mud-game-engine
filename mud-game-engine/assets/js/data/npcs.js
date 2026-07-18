// ========== NPC数据库 ==========
const NPCDB = {
  elder: {
    id:'elder', name:'村长·陈伯', title:'村庄长老',
    dialog: {
      default: [
        '年轻人，这片土地正被黑暗侵蚀。森林里的怪物越来越凶残，墓地里传来了不死生物的低语……',
        '传说在山脉深处蛰伏着一头远古巨龙。只有集齐三件神器——烈焰之剑、魔法水晶、龙牙，才能与之一战。',
        '去森林深处探索吧，那里或许能找到魔法水晶的线索。祝你好运，冒险者。'
      ],
      quest: '黑暗笼罩大地，勇者啊，你需要做以下几件事：\n1. 前往【矿石大厅】击败石头傀儡，获取精钢长刀\n2. 深入【墓穴大厅】击败巫妖，获取魔法水晶\n3. 攀登【龙巢】斩杀远古巨龙\n愿光明指引你的道路！'
    }
  },
  merchant: {
    id:'merchant', name:'杂货商·王二', title:'杂货铺老板',
    dialog: {
      default: ['欢迎光临！我这里有最好的药水和补给品，看看有什么需要的吧。'],
      shop: 'shop'
    },
    shopItems: ['hp_small','hp_medium','hp_large','mp_small','mp_medium','antidote']
  },
  smith: {
    id:'smith', name:'铁匠·赵铁柱', title:'铁匠铺大师',
    dialog: {
      default: ['哼，想要好武器？先拿素材来！我打的东西，方圆百里无人不晓。'],
      shop: 'shop'
    },
    shopItems: ['wooden_sword','iron_sword','cloth_armor','leather_armor','chain_mail']
  }
};
