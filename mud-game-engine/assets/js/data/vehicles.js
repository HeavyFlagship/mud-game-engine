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
    // 接口定义：每个接口提供一组属性，装备的 interfaceReq 必须全部被某个空闲接口覆盖
    // 每个接口键值对表示"该类型的接口有几个"
    // 接口属性说明：
    //   外部 - 暴露在环境中，可安装炮台、装甲板等
    //   内部 - 载具内部空间，可安装内衬装甲、容器等
    //   电源 - 提供功率输出
    //   数据 - 提供数据通信
    //   弹药管道 - 提供弹药输送
    //   离子管道 - 提供离子输送
    //   流体管道 - 提供燃料等流体输送
    //   界面 - 装备体积适配接口
    interfaces: [
      // 4个外部+电源+数据+弹药管道+界面接口（适合火炮、电磁炮等武器）
      { types: ['外部','电源','数据','弹药管道','界面'], count: 2 },
      // 2个外部+电源+数据+界面接口（适合激光炮、近战武器、装甲板等）
      { types: ['外部','电源','数据','界面'], count: 2 },
      // 2个外部+电源+数据+离子管道+界面接口（适合离子炮等）
      { types: ['外部','电源','数据','离子管道','界面'], count: 1 },
      // 2个内部+电源+数据+界面接口（适合内衬装甲、容器、修复器等）
      { types: ['内部','电源','数据','界面'], count: 2 },
      // 1个外部+数据+界面接口（适合电子战设备、雷达等低功耗设备）
      { types: ['外部','数据','界面'], count: 1 },
    ],
    equipmentBay: 300,
    cargo: 200,
    defaultWeapons: ['auto_cannon_mk1'],
    defaultArmor: ['light_alloy_plate'],
    energyCapacity: 200,
    energyRegen: 5,
    desc: '标准型先遣侦察机体，双足结构，机动性良好，适合复杂地形作业。'
  }
};
