// ========== 敌人数据库门面（数据见 enemies.json，由 data-loader.js 装配） ==========
var EnemyDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(EnemyDB, '_data', {});
  defineProp(EnemyDB, '_load', function (data) {
    for (var k of Object.keys(EnemyDB)) delete EnemyDB[k]; // 清旧数据键（方法不可枚举不受影响）
    EnemyDB._data = data || {};
    Object.assign(EnemyDB, EnemyDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });
})();
