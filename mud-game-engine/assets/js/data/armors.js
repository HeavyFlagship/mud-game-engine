// ========== 装甲数据库（从 EquipmentDB 导出） ==========
const ArmorDB = (function() {
  if (typeof EquipmentDB === 'undefined') return {};
  const db = {};
  const armors = EquipmentDB.getByCategory('armor');
  for (const a of armors) {
    db[a.id] = a;
  }
  return db;
})();
