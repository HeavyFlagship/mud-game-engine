// ========== 弹药数据库 ==========
const AmmoDB = {
  '20mm_ap': { id:'20mm_ap', name:'20mm穿甲弹', type:'ammo', ammoType:'20mm_ap', desc:'标准20mm穿甲弹，用于自动机炮和75mm火炮。', price:2, weight:0.1, cargoVolume:0.001 },
  railgun_slug: { id:'railgun_slug', name:'轨道弹', type:'ammo', ammoType:'railgun_slug', desc:'电磁轨道炮专用弹药，高速穿甲。', price:8, weight:0.3, cargoVolume:0.003 },
  ion_charge: { id:'ion_charge', name:'离子电荷', type:'ammo', ammoType:'ion_charge', desc:'离子投射炮专用电荷包，命中后降低目标能量恢复。', price:5, weight:0.2, cargoVolume:0.002 },
  missile_he: { id:'missile_he', name:'高爆导弹', type:'ammo', ammoType:'missile_he', desc:'小型导弹发射器专用高爆弹头，范围伤害。', price:15, weight:0.5, cargoVolume:0.005 },
  
  get(id) {
    return this[id] || null;
  }
};