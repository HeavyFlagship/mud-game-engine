// ========== 弹药数据库门面（数据见 ammo.json，由 data-loader.js 装配） ==========
var AmmoDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(AmmoDB, '_data', {});
  defineProp(AmmoDB, '_load', function (data) {
    for (var k of Object.keys(AmmoDB)) delete AmmoDB[k]; // 清旧数据键（方法不可枚举不受影响）
    AmmoDB._data = data || {};
    Object.assign(AmmoDB, AmmoDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });

  defineProp(AmmoDB, 'get', function (id) {
    return this._data[id] || null;
  });
})();
