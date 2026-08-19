// ========== 技能数据库门面（数据见 skills.json，由 data-loader.js 装配） ==========
var SkillDB = {};

(function () {
  function defineProp(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: false });
  }

  defineProp(SkillDB, '_data', {});
  defineProp(SkillDB, '_load', function (data) {
    for (var k of Object.keys(SkillDB)) delete SkillDB[k]; // 清旧数据键（方法不可枚举不受影响）
    SkillDB._data = data || {};
    Object.assign(SkillDB, SkillDB._data); // 直接键访问 + Object.keys/entries/values 兼容
  });
})();
