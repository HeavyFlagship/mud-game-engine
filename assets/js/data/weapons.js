// ========== 武器数据库（EquipmentDB 派生视图，数据装配后由 data-loader.js 调用 refresh） ==========
var WeaponDB = {};

(function () {
  function refresh() {
    for (var k of Object.keys(WeaponDB)) delete WeaponDB[k]; // 清旧数据键（refresh 不可枚举不受影响）
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB._data) {
      for (var id in EquipmentDB._data) {
        var item = EquipmentDB._data[id];
        if (item && item.category === 'weapon') WeaponDB[id] = item;
      }
    }
  }
  Object.defineProperty(WeaponDB, 'refresh', { value: refresh, writable: true, configurable: true, enumerable: false });
})();
