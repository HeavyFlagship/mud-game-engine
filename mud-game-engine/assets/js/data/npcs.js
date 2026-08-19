// ========== NPC数据库门面（数据见 npcs.json，由 data-loader.js 装配） ==========
// 字段说明：
//   id, name, title, dialog, shopItems 同前
//   broadcastPosition: 是否广播位置
//     - true: 始终显示在场景地图上（如基地固定NPC）
//     - false/未设置: 仅在玩家视野范围内才显示
var NPCDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(NPCDB, '_data', {});
  defineProp(NPCDB, '_load', function (data) {
    for (var k of Object.keys(NPCDB)) delete NPCDB[k]; // 清旧数据键（方法不可枚举不受影响）
    NPCDB._data = data || {};
    Object.assign(NPCDB, NPCDB._data); // 直接键访问（如 NPCDB['commander']）+ Object.keys/entries/values 兼容
  });
})();
