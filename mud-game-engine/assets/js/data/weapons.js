// ========== 武器数据库（从 EquipmentDB 导出） ==========
const WeaponDB = (function() {
  if (typeof EquipmentDB === 'undefined') return {};
  const db = {};
  const weapons = EquipmentDB.getByCategory('weapon');
  for (const w of weapons) {
    db[w.id] = w;
  }
  return db;
})();
