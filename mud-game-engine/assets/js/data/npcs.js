// ========== NPC数据库 ==========
// 字段说明：
//   id, name, title, dialog, shopItems 同前
//   broadcastPosition: 是否广播位置
//     - true: 始终显示在场景地图上（如基地固定NPC）
//     - false/未设置: 仅在玩家视野范围内才显示
const NPCDB = {
  commander: {
    id:'commander', name:'指挥官·李远', title:'前哨基地指挥官',
    broadcastPosition: true,
    dialog: {
      default: [
        '先遣队员，欢迎来到织女-7。这颗星球的开发优先级是最高的——辉锗矿的战略价值不可估量。',
        '荒原和矿洞里的虫子越来越多了，我们的采矿作业受到了严重威胁。',
        '你的任务是清除周边区域的虫群威胁，保护基地的安全。有任何装备需求，去找装备库的军械士。'
      ],
      quest: '任务简报：\n1. 前往【荒原北部】，清除该区域的虫群威胁\n2. 探索【结晶峡谷】，调查辉锗矿富集区的虫群活动\n3. 深入【矿石大厅】，摧毁虫群巢穴\n注意：随时保持警惕，虫子的领地意识很强。'
    }
  },
  quartermaster: {
    id:'quartermaster', name:'军械士·张薇', title:'装备库管理员',
    broadcastPosition: true,
    dialog: {
      default: ['装备库的物资还算充足，需要什么尽管说。记住，弹药和能量是你的生命线。', '需要新机体？看看机库里的存货。'],
      shop: 'shop'
    },
    shopItems: ['assault','striker','stealth','auto_cannon_mk1','pulse_laser_mk1','light_alloy_plate','repair_kit_small','armor_patch']
  },
  engineer: {
    id:'engineer', name:'维修师·王磊', title:'维修站技师',
    broadcastPosition: true,
    dialog: {
      default: ['机体有损伤？拿来我看看。战场上记得随时保持装甲完整，虫子的酸液可不是闹着命的。'],
      shop: 'shop'
    },
    shopItems: ['repair_kit_small','armor_patch','light_alloy_plate']
  }
};
