// ========== 数据装配器：拉取 data/*.json 并装配到各数据库门面 ==========
// 门面改造过渡期：旧门面无 _load 方法时自动跳过，不报错
var DataLoader = {
  registry: [
    { json: 'equipment-db.json', db: 'EquipmentDB' },
    { json: 'materials.json', db: 'MaterialDB' },
    { json: 'ammo.json', db: 'AmmoDB' },
    { json: 'items.json', db: 'ItemDB' },
    { json: 'skills.json', db: 'SkillDB' },
    { json: 'quests.json', db: 'QuestDB' },
    { json: 'vehicles.json', db: 'VehicleDB' },
    { json: 'enemies.json', db: 'EnemyDB' },
    { json: 'npcs.json', db: 'NPCDB' },
    { json: 'facility-db.json', db: 'FacilityDB' },
    { json: 'tech-tree-nodes.json', db: 'TechTreeDB' },
    { json: 'craft-recipes.json', db: 'CraftRecipeDB' },
    { json: 'loot-tables.json', db: 'LootTableDB' },
    { json: 'map.json', db: 'MapDB' }
  ],

  async loadAll() {
    var failures = [];
    await Promise.all(this.registry.map(function (entry) {
      return fetch('assets/js/data/' + entry.json)
        .then(function (resp) {
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          return resp.json();
        })
        .then(function (data) {
          var db = window[entry.db];
          if (db && typeof db._load === 'function') {
            db._load(data); // 过渡期旧门面（无 _load）自动跳过
          }
        })
        .catch(function (e) {
          failures.push(entry.json + '（' + (e && e.message ? e.message : e) + '）');
        });
    }));
    // 全部装配完成后刷新派生视图
    if (typeof WeaponDB !== 'undefined' && typeof WeaponDB.refresh === 'function') WeaponDB.refresh();
    if (typeof ArmorDB !== 'undefined' && typeof ArmorDB.refresh === 'function') ArmorDB.refresh();
    if (failures.length > 0) {
      throw new Error('以下数据文件加载失败：' + failures.join('；'));
    }
  }
};
