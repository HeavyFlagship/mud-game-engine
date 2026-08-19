// ========== 战利品掉落表门面（数据见 loot-tables.json，由 data-loader.js 装配） ==========
var LootTableDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(LootTableDB, '_data', {});
  defineProp(LootTableDB, '_load', function (data) {
    for (var k of Object.keys(LootTableDB)) delete LootTableDB[k]; // 清旧数据键（方法不可枚举不受影响）
    LootTableDB._data = data || {};
    Object.assign(LootTableDB, LootTableDB._data); // 直接键访问（如 LootTableDB['worker_bug']）+ Object.keys/entries/values 兼容
  });

  defineProp(LootTableDB, 'getLoot', function (enemyId) {
    const table = this._data[enemyId];
    if (!table) return [];
    const loot = [];
    for (const entry of table) {
      if (Math.random() < entry.chance) {
        const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
        loot.push({ id: entry.item, count });
      }
    }
    return loot;
  });
})();
