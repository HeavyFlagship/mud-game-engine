// ========== 物品数据库门面（数据见 items.json，由 data-loader.js 装配） ==========
// 注：装备类数据在 EquipmentDB，材料在 MaterialDB，弹药在 AmmoDB；
// 此处为消耗品等非装备物品（原 consumables/questItems 嵌套已平铺为 {id: 记录}）
var ItemDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(ItemDB, '_data', {});
  defineProp(ItemDB, '_load', function (data) {
    for (var k of Object.keys(ItemDB)) delete ItemDB[k]; // 清旧数据键（方法不可枚举不受影响）
    ItemDB._data = data || {};
    Object.assign(ItemDB, ItemDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });

  defineProp(ItemDB, 'get', function (id) {
    // 优先从 EquipmentDB 查询装备
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB.get) {
      const eq = EquipmentDB.get(id);
      if (eq) return eq;
    }
    // 查询载具
    if (typeof VehicleDB !== 'undefined' && VehicleDB[id]) {
      const v = VehicleDB[id];
      return { id: v.id, name: v.name, type: 'vehicle', category: 'vehicle', price: v.price || 0, desc: v.desc };
    }
    // 查询材料数据库
    if (typeof MaterialDB !== 'undefined' && MaterialDB.get) {
      const mat = MaterialDB.get(id);
      if (mat) return mat;
    }
    // 查询弹药数据库
    if (typeof AmmoDB !== 'undefined' && AmmoDB.get) {
      const ammo = AmmoDB.get(id);
      if (ammo) return ammo;
    }
    // 回退到本地记录（原 consumables/questItems 平铺）
    if (this._data[id]) return { ...this._data[id] };
    return null;
  });

  defineProp(ItemDB, 'getAllSellable', function () {
    const list = [];
    // 所有装备
    if (typeof EquipmentDB !== 'undefined' && EquipmentDB.getAll) {
      list.push(...EquipmentDB.getAll());
    }
    // 本地物品（消耗品等，平铺于 _data）
    for (const key of Object.keys(this._data)) {
      list.push({ ...this._data[key] });
    }
    // 材料
    if (typeof MaterialDB !== 'undefined') {
      for (const key of Object.keys(MaterialDB)) {
        if (typeof MaterialDB[key] === 'object' && MaterialDB[key].id) {
          list.push({ ...MaterialDB[key] });
        }
      }
    }
    return list;
  });
})();
