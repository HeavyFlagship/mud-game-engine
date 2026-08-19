// ========== 载具数据库门面（数据见 vehicles.json，由 data-loader.js 装配） ==========
var VehicleDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(VehicleDB, '_data', {});
  defineProp(VehicleDB, '_load', function (data) {
    for (var k of Object.keys(VehicleDB)) delete VehicleDB[k]; // 清旧数据键（方法不可枚举不受影响）
    VehicleDB._data = data || {};
    Object.assign(VehicleDB, VehicleDB._data); // 直接键访问（如 VehicleDB.scout）+ Object.keys/entries/values 兼容
  });
})();
