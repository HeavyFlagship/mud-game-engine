// ========== 弹药数据库 ==========
const AmmoDB = {
  '20mm_ap': { id:'20mm_ap', name:'20mm穿甲弹', type:'ammo', weaponType:'火炮', desc:'20mm口径穿甲弹，用于自动机炮/75mm火炮。', price:2, weight:0.1, stackSize:200 },
  railgun_slug: { id:'railgun_slug', name:'轨道弹', type:'ammo', weaponType:'电磁炮', desc:'电磁轨道炮弹丸，用于电磁轨道炮。', price:8, weight:0.2, stackSize:100 },
  ion_charge: { id:'ion_charge', name:'离子电荷', type:'ammo', weaponType:'离子炮', desc:'离子投射炮弹药，用于离子投射炮。', price:5, weight:0.15, stackSize:150 },
  missile_he: { id:'missile_he', name:'高爆导弹', type:'ammo', weaponType:'导弹', desc:'小型高爆导弹，用于导弹发射器。', price:15, weight:0.5, stackSize:50 },

  get(id) {
    return this[id] ? { ...this[id] } : null;
  },

  getAll() {
    return Object.values(this).filter(v => typeof v === 'object' && v.id);
  },

  // 根据武器类型获取对应弹药
  getAmmoForWeapon(weaponSubCategory) {
    const map = {
      '火炮': '20mm_ap',
      '电磁炮': 'railgun_slug',
      '离子炮': 'ion_charge',
      '导弹': 'missile_he',
    };
    return map[weaponSubCategory] || null;
  }
};