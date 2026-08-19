// ========== 任务数据库门面（数据见 quests.json，由 data-loader.js 装配） ==========
var QuestDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(QuestDB, '_data', {});
  defineProp(QuestDB, '_load', function (data) {
    for (var k of Object.keys(QuestDB)) delete QuestDB[k]; // 清旧数据键（方法不可枚举不受影响）
    QuestDB._data = data || {};
    Object.assign(QuestDB, QuestDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });
})();
