// ========== 科技树节点数据库门面（数据见 tech-tree-nodes.json，由 data-loader.js 装配） ==========
var TechTreeDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(TechTreeDB, '_data', {});
  defineProp(TechTreeDB, '_load', function (data) {
    for (var k of Object.keys(TechTreeDB)) delete TechTreeDB[k]; // 清旧数据键（方法不可枚举不受影响）
    TechTreeDB._data = data || {};
    Object.assign(TechTreeDB, TechTreeDB._data); // 直接键访问（主键 nodeId）+ Object.keys/entries/values 兼容
  });
})();
