// ========== 制造配方数据库门面（数据见 craft-recipes.json，由 data-loader.js 装配） ==========
var CraftRecipeDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(CraftRecipeDB, '_data', {});
  defineProp(CraftRecipeDB, '_load', function (data) {
    for (var k of Object.keys(CraftRecipeDB)) delete CraftRecipeDB[k]; // 清旧数据键（方法不可枚举不受影响）
    CraftRecipeDB._data = data || {};
    Object.assign(CraftRecipeDB, CraftRecipeDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });

  defineProp(CraftRecipeDB, 'get', function (id) { return this._data[id] || null; });
  defineProp(CraftRecipeDB, 'getAll', function () { return Object.values(this._data).filter(r => r.id); });
})();
