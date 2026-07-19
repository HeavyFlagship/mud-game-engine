// ========== 载具数据库 ==========
const VehicleDB = {
  scout: {
    id: 'scout',
    name: '侦察机体 MK-I',
    type: '机体',
    chassis: 'biped',
    maxHp: 200,
    maxArmor: 80,
    maxSpeed: 12,
    weight: 1200,
    overweightCoeff: 1.5,
    visionRadius: 200,
    signalRadius: 2.5,
    targetRadius: 2.0,
    power: 150,
    compute: 80,
    interfaces: {
      external: 4,
      power: 4,
      data: 3,
      weapon: 2
    },
    equipmentBay: 300,
    cargo: 200,
    defaultWeapons: ['auto_cannon_mk1'],
    defaultArmor: ['light_alloy_plate'],
    energyCapacity: 200,
    energyRegen: 5,
    desc: '标准型先遣侦察机体，双足结构，机动性良好，适合复杂地形作业。'
  }
};
