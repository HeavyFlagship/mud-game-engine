// ========== 装甲数据库（EquipmentDB 派生视图，数据装配后由 data-loader.js 调用 refresh） ==========
var ArmorDB = {};

(function () {
  function refresh() {
    for (var k of Object.keys(ArmorDB)) delete ArmorDB[k]; // 清旧数据键（refresh 不可枚举不受影响）
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB._data) {
      for (var id in EquipmentDB._data) {
        var item = EquipmentDB._data[id];
        if (item && item.category === 'armor') ArmorDB[id] = item;
      }
    }
  }
  Object.defineProperty(ArmorDB, 'refresh', { value: refresh, writable: true, configurable: true, enumerable: false });
})();
