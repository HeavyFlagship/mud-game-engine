// ========== 材料数据库门面（数据见 materials.json，由 data-loader.js 装配） ==========
var MaterialDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(MaterialDB, '_data', {});
  defineProp(MaterialDB, '_load', function (data) {
    for (var k of Object.keys(MaterialDB)) delete MaterialDB[k]; // 清旧数据键（方法不可枚举不受影响）
    MaterialDB._data = data || {};
    Object.assign(MaterialDB, MaterialDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });

  defineProp(MaterialDB, 'get', function (id) {
    return this._data[id] || null;
  });
})();
