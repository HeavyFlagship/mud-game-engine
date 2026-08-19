// ========== 工业设施数据库门面（数据见 facility-db.json，由 data-loader.js 装配） ==========
var FacilityDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(FacilityDB, '_data', {});
  defineProp(FacilityDB, '_load', function (data) {
    for (var k of Object.keys(FacilityDB)) delete FacilityDB[k]; // 清旧数据键（方法不可枚举不受影响）
    FacilityDB._data = data || {};
    Object.assign(FacilityDB, FacilityDB._data); // 直接键访问（主键 facilityId）+ Object.keys/entries/values 兼容
  });
})();
