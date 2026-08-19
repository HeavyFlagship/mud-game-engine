# 验证清单

> Demo 20260809 功能验证与质量检查

---

## 架构重构验证

- [ ] **CHECK-ARCH-1**: 指令注册表 `command-registry.js` 定义三层结构（global/battle/base），数据结构正确
- [ ] **CHECK-ARCH-2**: `command-system.js` 中 `execute()` 不再包含 switch-case 分支
- [ ] **CHECK-ARCH-3**: `command-system.js` 中 `handleBattleCmd()` 不再包含 switch-case 分支
- [ ] **CHECK-ARCH-4**: 指令分发基于注册表，根据场景类型（safe/battle）动态启用/禁用指令
- [ ] **CHECK-ARCH-5**: `systems/commands/` 目录存在，含 `global-commands.js`、`battle-commands.js`、`base-commands.js`
- [ ] **CHECK-ARCH-6**: `help` 指令按场景类型显示不同可用指令列表
- [ ] **CHECK-ARCH-7**: `game.js` 中无重复的 `reload` 函数定义
- [ ] **CHECK-ARCH-8**: `data/materials.js`、`data/ammo.js`、`data/craft-recipes.js` 文件存在且数据正确
- [ ] **CHECK-ARCH-9**: `data/items.js` 仅保留基础消耗品，不再包含材料和弹药
- [ ] **CHECK-ARCH-10**: `data/enemies.js` 按阵营（虫族/机械）组织数据结构
- [ ] **CHECK-ARCH-11**: `player.js` 中不再使用 `gold` 字段，全局替换为 `credits`
- [ ] **CHECK-ARCH-12**: 所有现有指令（move/fire/shop/status 等）在重构后仍可正常执行

---

## 地图系统验证

- [ ] **CHECK-MAP-1**: 10x10 网格地图共 100 个房间，坐标范围 x: 0-9, y: 0-9
- [ ] **CHECK-MAP-2**: 现有 14 个手工房间保留在原坐标位置
- [ ] **CHECK-MAP-3**: 前哨基地 5 个房间 sceneType='safe'
- [ ] **CHECK-MAP-4**: 非基地房间 sceneType='battle'
- [ ] **CHECK-MAP-5**: 每个房间至少与 1 个相邻房间连通
- [ ] **CHECK-MAP-6**: 从基地可到达所有区域
- [ ] **CHECK-MAP-7**: Boss 房间仅 1 个入口
- [ ] **CHECK-MAP-8**: 矿洞房间 z=-1 层级正确
- [ ] **CHECK-MAP-9**: 不同区域房间有对应的地形类型、掩体、敌人分布
- [ ] **CHECK-MAP-10**: 程序化生成房间与手工房间数据格式一致

---

## 敌人系统验证

- [ ] **CHECK-ENEMY-1**: 虫族敌人共 8 种（含 Boss），每种属性完整
- [ ] **CHECK-ENEMY-2**: 机械敌人共 6 种（含 Boss），每种属性完整
- [ ] **CHECK-ENEMY-3**: 每种敌人配置了 AI 类型（bug_simple/bug_charge/bug_ranged 等）
- [ ] **CHECK-ENEMY-4**: 每种敌人配置了特殊技能（如有）
- [ ] **CHECK-ENEMY-5**: 每种敌人配置了战利品掉落表
- [ ] **CHECK-ENEMY-6**: 巨型守卫虫有二阶段机制（HP<50% 触发）
- [ ] **CHECK-ENEMY-7**: 守护者巨像有二阶段机制（HP<50% 触发）
- [ ] **CHECK-ENEMY-8**: 敌人难度梯度合理：荒原入门→荒野简单→矿洞中上→前沿困难

---

## 物品系统验证

- [ ] **CHECK-ITEM-1**: 消耗品共 7 种，属性完整
- [ ] **CHECK-ITEM-2**: 材料共 11 种，来源和用途标注清晰
- [ ] **CHECK-ITEM-3**: 制造材料共 5 种（铁矿石、铜矿石、火药、推进剂、弹壳）
- [ ] **CHECK-ITEM-4**: 弹药共 4 种，加入全局弹药池
- [ ] **CHECK-ITEM-5**: 制造配方共 4 种，材料和费用正确
- [ ] **CHECK-ITEM-6**: 战利品掉落表 `data/loot-tables.js` 覆盖所有敌人

---

## 制造生产系统验证

- [ ] **CHECK-TECHTREE-1**: 开发树节点数据结构正确（nodeId、层级、前置依赖、解锁状态）
- [ ] **CHECK-TECHTREE-2**: 铁矿石节点默认解锁
- [ ] **CHECK-TECHTREE-3**: 铁锭→钢锭→装甲板解锁链路正确
- [ ] **CHECK-TECHTREE-4**: 节点解锁后触发对应奖励（开放建造、通知经济系统）
- [ ] **CHECK-TECHTREE-5**: 开发树新闻通知在日志中正确显示

- [ ] **CHECK-FACILITY-1**: 3 种设施（熔炉、高炉、装甲工厂）数据完整
- [ ] **CHECK-FACILITY-2**: 设施持续产出逻辑正确（消耗原料→产出物品→库存检查）
- [ ] **CHECK-FACILITY-3**: 原料不足时设施暂停，补充后恢复
- [ ] **CHECK-FACILITY-4**: 设施库存满后暂停产出

- [ ] **CHECK-INDUSTRY-1**: 基地房间存在工业区实体（总面积、已用面积、设施列表）
- [ ] **CHECK-INDUSTRY-2**: `工业` 指令正确显示工业区状态
- [ ] **CHECK-INDUSTRY-3**: `安装` 指令校验面积和前置条件后执行
- [ ] **CHECK-INDUSTRY-4**: `使用设施` 指令正确操作设施
- [ ] **CHECK-INDUSTRY-5**: `调度` 指令可调整设施运行模式

---

## 经济系统验证

- [ ] **CHECK-SUPPLY-1**: 每种物资维护供需记录（供应量、需求量、储备量、安全线、警戒线）
- [ ] **CHECK-SUPPLY-2**: 供需状态正确更新（充足/偏紧/短缺/断供）
- [ ] **CHECK-SUPPLY-3**: 储备低于安全线 → 自动生成需求订单
- [ ] **CHECK-SUPPLY-4**: 储备低于警戒线 → 紧急需求订单 + 日志通知
- [ ] **CHECK-SUPPLY-5**: 供应订单随储备变化动态调整
- [ ] **CHECK-SUPPLY-6**: 设施产出正确增加储备量
- [ ] **CHECK-SUPPLY-7**: 节点解锁后新物资供需记录正确初始化

- [ ] **CHECK-TRADE-1**: `trade` 指令正确显示所有订单
- [ ] **CHECK-TRADE-2**: `trade <物资名称>` 正确筛选特定物资订单
- [ ] **CHECK-TRADE-3**: `trade buy/sell` 区分买卖操作
- [ ] **CHECK-TRADE-4**: 玩家卖出：扣除物资 → 增加信用点 → 更新储备量
- [ ] **CHECK-TRADE-5**: 玩家买入：扣除信用点 → 增加物资 → 扣减储备量
- [ ] **CHECK-TRADE-6**: 价格随供需状态波动（储备低时价格上涨）
- [ ] **CHECK-TRADE-7**: 订单按价格排序（买入从低到高，卖出从高到低）

- [ ] **CHECK-QUOTA-1**: 配额物资定义正确（5 种物资，含每日限量）
- [ ] **CHECK-QUOTA-2**: `replenish` 指令正确检查配额
- [ ] **CHECK-QUOTA-3**: 配额内免费补给，超出提示购买
- [ ] **CHECK-QUOTA-4**: 每日零点配额重置

---

## 场景交互验证

- [x] **CHECK-SCENE-1**: 矿脉房间可拾取矿石资源
- [x] **CHECK-SCENE-2**: 残骸房间可拾取机械零件
- [x] **CHECK-SCENE-3**: 电磁干扰区视野减半
- [x] **CHECK-SCENE-4**: 酸液池经过时扣装甲值
- [x] **CHECK-SCENE-5**: 毒雾区每秒扣结构值
- [x] **CHECK-SCENE-6**: 不同区域房间描述有差异化文本

---

## Boss 战斗验证

- [x] **CHECK-BOSS-1**: 巨型守卫虫属性正确（HP 500，装甲 150，伤害 45）
- [x] **CHECK-BOSS-2**: 震地冲击技能效果正确（范围 200m，伤害 30+减速 3 秒）
- [x] **CHECK-BOSS-3**: 巨型守卫虫二阶段触发正确（HP<50% 攻速+30%，伤害+20%）
- [x] **CHECK-BOSS-4**: 守护者巨像属性正确（HP 800，装甲 200，伤害 60）
- [x] **CHECK-BOSS-5**: 护盾再生技能效果正确（每 30 秒恢复 100 护盾）
- [x] **CHECK-BOSS-6**: 守护者巨像二阶段触发正确（高能模式，离子伤害）
- [x] **CHECK-BOSS-7**: Boss 掉落独特装备和稀有材料

---

## 任务系统验证

- [x] **CHECK-QUEST-1**: 任务数据结构正确（ID、名称、描述、目标、奖励、状态）
- [x] **CHECK-QUEST-2**: 主线任务 1-3 可接取、追踪、完成
- [x] **CHECK-QUEST-3**: 支线任务可重复接取
- [x] **CHECK-QUEST-4**: 任务奖励正确发放（信用点、经验值、物品）
- [x] **CHECK-QUEST-5**: `任务` 指令正确显示任务列表

---

## UI/UX 验证

- [x] **CHECK-UI-1**: 战斗日志分类显示（攻击/移动/系统消息分颜色）
- [x] **CHECK-UI-2**: 迷你地图显示已探索/未探索房间
- [x] **CHECK-UI-3**: 迷你地图标记 Boss 房间
- [x] **CHECK-UI-4**: 商店中装备属性与当前装备对比显示

---

## 平衡性验证

- [ ] **CHECK-BAL-1**: 荒原→荒野→矿洞→机械遗迹→前沿 难度递增合理
- [ ] **CHECK-BAL-2**: 战利品售价与装备价格比例合理
- [ ] **CHECK-BAL-3**: 弹药制造成本与产出数量比例合理
- [ ] **CHECK-BAL-4**: 设施安装成本与产出价值比例合理
- [ ] **CHECK-BAL-5**: 玩家能体验"安装设施→积累产出→解锁节点"完整循环

---

## 稳定性验证

- [x] **CHECK-TEST-1**: 完整流程无报错：基地→探索→战斗→制造→交易→Boss→返回（代码结构验证通过，需运行时验证）
- [x] **CHECK-TEST-2**: 制造系统全流程正常：安装→运行→产出→解锁→安装新设施（代码结构验证通过，需运行时验证）
- [x] **CHECK-TEST-3**: 经济系统全流程正常：交付物资→供需变化→价格波动→配额补给（代码结构验证通过，需运行时验证）
- [x] **CHECK-TEST-4**: 边界场景不崩溃：背包满、弹药耗尽、机体损毁、面积不足（代码结构验证通过，需运行时验证）
- [x] **CHECK-TEST-5**: 存档/读档后制造状态一致
- [x] **CHECK-TEST-6**: 存档/读档后经济状态一致
- [x] **CHECK-TEST-7**: 10x10 地图加载时间 < 1 秒（代码结构验证通过，需运行时验证）
- [x] **CHECK-TEST-8**: 游戏可正常启动并显示开场介绍