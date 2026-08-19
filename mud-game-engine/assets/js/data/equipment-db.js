// ========== 装备数据库门面（数据见 equipment-db.json，由 data-loader.js 装配） ==========
var EquipmentDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(EquipmentDB, '_data', {});
  defineProp(EquipmentDB, '_load', function (data) {
    for (var k of Object.keys(EquipmentDB)) delete EquipmentDB[k]; // 清旧数据键（方法不可枚举不受影响）
    EquipmentDB._data = data || {};
    Object.assign(EquipmentDB, EquipmentDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });

  defineProp(EquipmentDB, 'get', function (id) {
    var item = this._data[id];
    return item ? { ...item } : null;
  });

  defineProp(EquipmentDB, 'getByCategory', function (category) {
    const result = [];
    for (const key of Object.keys(this._data)) {
      const item = this._data[key];
      if (item && typeof item === 'object' && item.category === category) {
        result.push({ ...item });
      }
    }
    return result;
  });

  defineProp(EquipmentDB, 'getAll', function () {
    const result = [];
    for (const key of Object.keys(this._data)) {
      const item = this._data[key];
      if (item && typeof item === 'object' && item.id) {
        result.push({ ...item });
      }
    }
    return result;
  });

  defineProp(EquipmentDB, 'findByName', function (name) {
    for (const key of Object.keys(this._data)) {
      const item = this._data[key];
      if (item && typeof item === 'object' && item.id && item.name === name) {
        return { ...item };
      }
    }
    return null;
  });
})();
