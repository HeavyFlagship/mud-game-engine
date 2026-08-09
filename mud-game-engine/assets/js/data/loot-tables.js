// ========== 战利品掉落表 ==========
const LootTable = {
  // 虫族掉落
  bug: {
    common: [
      { itemId: 'chitin_fragment', weight: 60, min: 1, max: 3 },
      { itemId: 'bug_gel', weight: 30, min: 1, max: 1 },
    ],
    uncommon: [
      { itemId: 'acid_gland', weight: 20, min: 1, max: 1 },
      { itemId: 'iron_ore', weight: 15, min: 1, max: 2 },
    ],
    rare: [
      { itemId: 'carapace_plate', weight: 5, min: 1, max: 1 },
      { itemId: 'copper_ore', weight: 8, min: 1, max: 1 },
    ],
  },

  // 机械掉落
  mech: {
    common: [
      { itemId: 'mech_parts', weight: 50, min: 1, max: 2 },
      { itemId: 'alloy_fragment', weight: 25, min: 1, max: 1 },
    ],
    uncommon: [
      { itemId: 'energy_core_remnant', weight: 15, min: 1, max: 1 },
      { itemId: 'germanite_shard', weight: 10, min: 1, max: 1 },
    ],
    rare: [
      { itemId: 'propellant', weight: 5, min: 1, max: 2 },
      { itemId: 'gunpowder', weight: 8, min: 1, max: 2 },
    ],
  },

  // Boss掉落
  boss: {
    bug: [
      { itemId: 'carapace_plate', weight: 100, min: 3, max: 5 },
      { itemId: 'giant_acid_gland', weight: 100, min: 1, max: 1 },
      { itemId: 'repair_kit_large', weight: 50, min: 1, max: 2 },
    ],
    mech: [
      { itemId: 'alloy_fragment', weight: 100, min: 3, max: 5 },
      { itemId: 'ancient_core', weight: 100, min: 1, max: 1 },
      { itemId: 'energy_cell_large', weight: 50, min: 1, max: 2 },
    ],
  },

  // 根据敌人类型生成掉落
  generate(enemy) {
    const drops = [];
    if (!enemy) return drops;

    const category = enemy.category || 'bug';
    const isBoss = enemy.isBoss || false;

    // Boss固定掉落
    if (isBoss && this.boss[category]) {
      for (const entry of this.boss[category]) {
        if (Math.random() * 100 < entry.weight) {
          const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
          drops.push({ itemId: entry.itemId, count });
        }
      }
    }

    // 普通掉落
    const lootTable = this[category];
    if (lootTable) {
      this._rollTable(lootTable.common, drops, 0.8);
      this._rollTable(lootTable.uncommon, drops, 0.4);
      this._rollTable(lootTable.rare, drops, 0.15);
    }

    // 合并同类物品
    const merged = {};
    for (const drop of drops) {
      if (!merged[drop.itemId]) merged[drop.itemId] = 0;
      merged[drop.itemId] += drop.count;
    }
    return Object.entries(merged).map(([itemId, count]) => ({ itemId, count }));
  },

  _rollTable(table, drops, baseChance) {
    for (const entry of table) {
      if (Math.random() * 100 < entry.weight * baseChance) {
        const count = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
        drops.push({ itemId: entry.itemId, count });
      }
    }
  },
};