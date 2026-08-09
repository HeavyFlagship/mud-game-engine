# 任务列表

> Demo 20260809 实施任务
> 关联：spec.md / demo20260809-plan.md

---

## 阶段零：架构重构

- [x] **TASK-ARCH-1**: 创建指令注册表 `systems/command-registry.js`（**重构**）
  - [x] 定义三层指令注册表数据结构（global/battle/base）
  - [x] 实现 `getAvailableCommands(sceneType)` 方法
  - [x] 实现 `getCommandHelp(sceneType)` 方法
  - [x] 实现指令查找（含别名支持）

- [x] **TASK-ARCH-2**: 重构 `systems/command-system.js`（**重构**）
  - [x] 移除 `execute()` 中的 switch-case，改为基于注册表的动态分发
  - [x] 移除 `handleBattleCmd()` 中的 switch-case
  - [x] 新增场景类型感知：根据当前房间 sceneType 决定可用指令集
  - [x] 保留旧代码作为注释（回退参考）

- [x] **TASK-ARCH-3**: 创建指令处理模块 `systems/commands/`（**重构**）
  - [x] 创建 `systems/commands/global-commands.js`（help, save, load, status, bag, equip, unequip, look 等）
  - [x] 创建 `systems/commands/base-commands.js`（shop, trade, 工业, 使用设施, 安装, 调度, replenish, 仓库, 机库, 任务, 备份 等）
  - [x] 战场指令保留在 command-system.js 中（battle-commands 方法已在 command-system 内）

- [x] **TASK-ARCH-4**: 在 `data/map.js` 房间数据中增加 `sceneType` 字段
  - [x] 现有 14 个房间：基地房间 sceneType='safe'，其余 sceneType='battle'

- [x] **TASK-ARCH-5**: `help` 指令按场景类型动态显示可用指令列表

- [x] **TASK-ARCH-6**: 修复 BUG-1：删除 `game.js` 中重复的 `reload` 函数（**重构**）— 确认无重复定义

- [x] **TASK-ARCH-7**: 拆分物品数据（**重构**）
  - [x] 创建 `data/materials.js`（材料：虫壳碎片、酸腺等 15 种）
  - [x] 创建 `data/ammo.js`（弹药：20mm 穿甲弹、轨道弹等 4 种）
  - [x] 创建 `data/craft-recipes.js`（制造配方：4 种弹药配方）
  - [x] `data/items.js` 仅保留基础消耗品

- [x] **TASK-ARCH-8**: 重构敌人数据按阵营拆分（**重构**）
  - [x] `data/enemies.js` 中按虫族/机械阵营组织数据结构
  - [x] 保留统一 `EnemyDB` 导出

- [x] **TASK-ARCH-9**: 重命名 `player.js` 中 `gold` 为 `credits`（**重构**）
  - [x] 全局搜索所有 `gold` 引用并替换为 `credits`

---

## 阶段一：基础设施与数据完善

- [x] **TASK-MAP-1**: 实现 10x10 网格地图生成器
  - [x] 在 `data/map.js` 中实现程序化生成逻辑
  - [x] 保留现有 14 个手工房间的坐标和属性
  - [x] 其余 86 个房间按区域类型规则生成（荒原/荒野/矿洞/机械遗迹/过渡/奇异/前沿）
  - [x] 每个房间自动生成：地形类型、掩体、敌人生成点、战利品点、sceneType
  - [x] 房间间自动连接（exits），确保地图连通性

- [x] **TASK-MAP-2**: 区域生成器参数化
  - [x] 不同区域配置不同的敌人分布、掩体密度、环境危害概率

- [x] **TASK-MAP-3**: 新增 sceneType 标记
  - [x] 前哨基地 5 个房间 sceneType='safe'，其余 sceneType='battle'

- [x] **TASK-ENEMY-1**: 扩展虫族敌人（8 种）
  - [x] 保留：工虫(worker_bug)、突击虫(assault_bug)
  - [x] 新增：喷酸虫(acid_spitter)、飞虫(flying_bug)、甲壳虫(beetle)、跳虫(hopper)、毒雾虫(toxic_bug)
  - [x] Boss：巨型守卫虫(giant_guardian)
  - [x] 每种敌人配置完整属性、AI 类型、特殊技能、战利品掉落表、战斗描述文本

- [x] **TASK-ENEMY-2**: 扩展机械敌人（6 种）
  - [x] 侦察探针(recon_probe)、防御节点(defense_node)、粒子束哨兵(particle_sentry)
  - [x] 自修复守卫(self_repair_guardian)、重力扭曲器(gravity_distorter)
  - [x] Boss：守护者巨像(colossus_guardian)

- [x] **TASK-ITEM-1**: 扩展消耗品（7 种）
  - [x] 小型/中型/大型修复包、装甲补片/中型装甲补片、能量电池/大型能量电池

- [x] **TASK-ITEM-2**: 扩展材料（11 种）
  - [x] 虫族掉落：虫壳碎片、酸腺、虫胶碎块、甲壳板、巨型酸腺
  - [x] 机械掉落：机械零件、合金碎片、辉锗矿碎片、能量核心残片、远古核心

- [x] **TASK-ITEM-3**: 新增制造材料（5 种）
  - [x] 铁矿石、铜矿石、火药、推进剂、弹壳

- [x] **TASK-ITEM-4**: 新增弹药（4 种）
  - [x] 20mm_ap（穿甲弹）、railgun_slug（轨道弹）、ion_charge（离子电荷）、missile_he（高爆导弹）

- [x] **TASK-ITEM-5**: 新增制造配方（4 种）
  - [x] 20mm 穿甲弹 x20、轨道弹 x10、离子电荷 x15、高爆导弹 x5

---

## 阶段二：制造生产系统

- [x] **TASK-TECHTREE-1**: 创建 `systems/tech-tree.js`（开发树核心逻辑）
  - [x] 定义节点数据结构（nodeId、名称、层级、类型、前置依赖、解锁状态、解锁奖励）
  - [x] 实现解锁判定逻辑（前置条件满足即可生产解锁）
  - [x] 实现解锁效果（开放下游节点、允许建造设施、通知经济系统）

- [x] **TASK-TECHTREE-2**: 创建 `data/tech-tree-nodes.js`（Demo 节点数据）
  - [x] 第 1 层：铁矿石（默认已解锁）
  - [x] 第 2 层：铁锭、钢锭
  - [x] 第 3 层：装甲板

- [x] **TASK-TECHTREE-3**: 开发树新闻通知
  - [x] 设施投产、节点解锁时在日志中显示新闻

- [x] **TASK-FACILITY-1**: 创建 `systems/facility.js`（生产设施核心逻辑）
  - [x] 定义设施数据结构（ID、名称、类型、规模、占地面积、归属、产出/消耗物资、速率、库存上限）
  - [x] 实现设施运行机制：持续产出、原材料检查、库存检查、中断/恢复

- [x] **TASK-FACILITY-2**: 创建 `data/facility-db.js`（Demo 设施数据）
  - [x] 熔炉（小型）：铁矿石→铁锭，2 单位/小时，150m²
  - [x] 高炉（小型）：铁矿石→钢锭，1 单位/小时，200m²
  - [x] 装甲工厂（小型）：钢锭→装甲板，1 单位/小时，300m²

- [x] **TASK-FACILITY-3**: 设施安装流程
  - [x] 安装指令：检查前置条件（节点解锁 + 面积 + 物资）→ 消耗物资 → 完成安装

- [x] **TASK-INDUSTRY-1**: 基地房间增加工业区实体
  - [x] 字段：总面积(area)、已用面积(areaUsed)、已安装设施列表(facilities)

- [x] **TASK-INDUSTRY-2**: 实现 `工业` 指令
  - [x] 查看当前基地工业区面积、设施数量与运行状态

- [x] **TASK-INDUSTRY-3**: 实现 `安装` 指令
  - [x] 申请安装工业设施，校验面积后执行

- [x] **TASK-INDUSTRY-4**: 实现 `使用设施` 指令
  - [x] 使用当前基地的设施（归属自己的直接使用）

- [x] **TASK-INDUSTRY-5**: 实现 `调度` 指令
  - [x] 调整设施运行模式（输入/输出/配方），Demo 仅实现基础模式

---

## 阶段三：经济系统

- [x] **TASK-SUPPLY-1**: 创建 `systems/supply-demand.js`（供需子系统）
  - [x] 定义物资供需记录数据结构（供应量、需求量、储备量、安全线、警戒线、状态标签）
  - [x] 实现供需状态更新（充足/偏紧/短缺/断供）

- [x] **TASK-SUPPLY-2**: 需求订单动态生成
  - [x] 储备低于安全线 → 自动生成需求订单（收购价上浮）
  - [x] 储备低于警戒线 → 紧急需求订单（大幅上浮 + 日志通知）
  - [x] 储备远高于安全线 → 移除需求订单

- [x] **TASK-SUPPLY-3**: 供应订单动态生成
  - [x] 已解锁且储备非零 → 始终可出售
  - [x] 储备低于警戒线 → 售价上浮、限购
  - [x] 断供 → 临时移除供应订单

- [x] **TASK-SUPPLY-4**: 与制造系统联动
  - [x] 设施产出入库 → 增加储备量
  - [x] 开发树节点解锁 → 开放新物资供需记录
  - [x] 玩家交付物资 → 增加储备量

- [x] **TASK-SUPPLY-5**: 创建 `data/loot-tables.js`（战利品掉落表）
  - [x] 每种敌人配置掉落表，定义掉落物品、概率、数量范围

- [x] **TASK-TRADE-1**: 创建 `systems/trade.js`（交易中心）
  - [x] 实现 `trade` 指令：查看订单、按物资筛选、买卖操作
  - [x] 实现订单展示格式（按物资分组，按价格排序）

- [x] **TASK-TRADE-2**: 交易结算
  - [x] 玩家卖出：扣除物资 → 增加信用点 → 更新储备量
  - [x] 玩家买入：扣除信用点 → 增加物资 → 扣减储备量
  - [x] 更新供需状态

- [x] **TASK-TRADE-3**: 价格波动（Demo 简化版）
  - [x] 供需状态修正：储备安全系数
  - [x] 开发进度修正：节点解锁后价格下调

- [x] **TASK-QUOTA-1**: 创建 `systems/quota.js`（配额制）
  - [x] 定义配额物资：75mm 炮弹(30 发/日)、105mm 炮弹(20 发/日)、小型修复包(5 个/日)、中型修复包(3 个/日)、装甲补片(3 个/日)

- [x] **TASK-QUOTA-2**: 实现 `replenish` 指令
  - [x] 检查当日剩余配额 → 配额充足则免费补给
  - [x] 超出提示需购买
  - [x] 每日零点重置配额

---

## 阶段四：场景交互与沉浸感

- [x] **TASK-SCENE-1**: 资源点拾取
  - [x] 矿脉房间：可拾取铁矿石、铜矿石、辉锗矿碎片
  - [x] 残骸房间：可拾取机械零件、合金碎片
  - [x] 新增 `gather`/`采集` 指令，支持按资源名采集，随机数量生成

- [x] **TASK-SCENE-2**: 环境危害
  - [x] 电磁干扰区：视野减半，离开后自动恢复
  - [x] 酸液池：经过时持续扣装甲值
  - [x] 毒雾区：每秒扣结构值
  - [x] 注册 `updateHazards` 为时间轴更新器，进入房间时显示危险警告

- [x] **TASK-SCENE-3**: 房间描述丰富化
  - [x] 不同区域有独特的房间描述模板（荒原/矿洞/机械遗迹等）
  - [x] 根据房间内容（地形、危险、资源、敌人）动态生成描述
  - [x] 新增 `getRoomDescription()` 辅助方法

- [x] **TASK-BOSS-1**: 矿石大厅 Boss：巨型守卫虫
  - [x] HP 500，装甲 150，伤害 45，近战攻击
  - [x] 特殊技能：震地冲击（范围 200m，伤害 30 穿甲+减速 3 秒，冷却 25 秒）
  - [x] 二阶段（HP<50%）：攻速+30%，伤害+20%，显示狂暴提示
  - [x] AI 类型：`boss_guardian`，`bossGuardianTurn()` 处理逻辑

- [x] **TASK-BOSS-2**: 机械遗迹 Boss：守护者巨像
  - [x] HP 800，装甲 200，伤害 60，远程粒子束
  - [x] 特殊技能：护盾再生（每 30 秒恢复 100 护盾）、粒子束轰炸（范围 300m，伤害 80）
  - [x] 二阶段（HP<50%）：高能模式，攻击附带离子伤害，护盾冷却缩短至 20 秒
  - [x] AI 类型：`boss_colossus`，`bossColossusTurn()` 处理逻辑，保持距离行为

- [x] **TASK-BOSS-3**: Boss 掉落配置
  - [x] 巨型守卫虫：repair_kit_large（50%）、信用点 300-500
  - [x] 守护者巨像：energy_battery_large（50%）、信用点 500-800
  - [x] Boss 击杀显示 "🏆 Boss击败！" 特殊消息

- [x] **TASK-QUEST-1**: 创建 `systems/quest.js`（任务系统）
  - [x] 定义任务数据结构（ID、名称、描述、目标、奖励、状态）
  - [x] 实现任务接取、进度追踪、完成交付、前置任务检查
  - [x] 支持可重复任务自动重新接取

- [x] **TASK-QUEST-2**: 创建 `data/quests.js`（Demo 任务数据）
  - [x] 主线任务 1：清除荒原北部的虫群（击杀 3 只虫族）
  - [x] 主线任务 2：调查结晶峡谷（探索 + 击杀 5 个敌人）
  - [x] 主线任务 3：摧毁矿石大厅的虫巢（击败巨型守卫虫）
  - [x] 支线任务：收集材料（可重复，收集铁矿石+虫壳碎片）

- [x] **TASK-QUEST-3**: 实现 `任务` 指令
  - [x] 查看任务列表（进度条显示）、接取/交付任务
  - [x] 集成到 `Game.init()`、`save()`/`load()`、`move()` 探索进度、`onEnemyKilled()` 击杀进度

- [x] **TASK-COMBAT-1**: 武器命中/未命中差异化描述文本
  - [x] 根据武器伤害类型（动能/热能/离子/爆炸等）随机命中描述
  - [x] 根据敌人阵营（虫族/机械）区分攻击和未命中描述

- [x] **TASK-COMBAT-2**: 敌人 AI 差异化
  - [x] 虫族：冲锋/远程/集群包抄/坦克推进 + 低血量狂暴化
  - [x] 机械：侦察/炮台/哨兵/自修复/控场 + 保持距离/撤退
  - [x] `mech_repair` 在掩护状态每秒恢复 2 HP
  - [x] `bug_swarm` 侧翼包抄机制

- [x] **TASK-COMBAT-3**: 状态效果在 UI 面板显示
  - [x] 敌人卡片显示状态标签（🔥灼烧 🔌EMP 🐌减速等）
  - [x] 左侧栏显示玩家当前状态效果（名称、剩余时间、描述）
  - [x] 颜色编码按效果类型区分

- [x] **TASK-UI-1**: 战斗日志分类显示（攻击/移动/系统消息/战利品分颜色）
  - [x] 新增 `addHistory()` category 参数，时间轴历史记录显示彩色圆点
  - [x] 新增过滤按钮（全部/攻击/移动/系统/战利品）
  - [x] 更新所有 41 处 `addHistory()` 调用添加分类

- [x] **TASK-UI-2**: 迷你地图显示已探索/未探索房间、Boss 房间标记
  - [x] Boss 房间 💀 标记，危险等级颜色边框（safe/moderate/danger/boss）
  - [x] 已探索/未探索 tooltip，新增小地图图例

- [x] **TASK-UI-3**: 商店中装备属性与当前装备对比
  - [x] 新增 `compareEquipment()` 方法，对比伤害/装甲/射程/冷却/功率/算力
  - [x] 用 ▲/▼ 标记属性提升/下降

---

## 阶段五：测试与打磨

- [ ] **TASK-BAL-1**: 敌人难度曲线调整
  - [ ] 荒原→荒野→矿洞→机械遗迹→前沿 难度递增

- [ ] **TASK-BAL-2**: 经济平衡调整
  - [ ] 战利品售价、装备价格、弹药制造成本、设施安装成本

- [ ] **TASK-BAL-3**: 制造节奏调整
  - [ ] 确保 Demo 流程中玩家能体验"安装设施→积累产出→解锁节点"的循环

- [ ] **TASK-TEST-1**: 完整流程测试
  - [ ] 基地→探索→战斗→制造→交易→Boss→返回

- [ ] **TASK-TEST-2**: 制造系统测试
  - [ ] 安装设施→运行→产出→解锁节点→安装新设施

- [ ] **TASK-TEST-3**: 经济系统测试
  - [ ] 交付物资→供需变化→价格波动→配额补给

- [ ] **TASK-TEST-4**: 边界测试
  - [ ] 背包满、弹药耗尽、机体损毁、工业区面积不足

- [ ] **TASK-TEST-5**: 存档兼容性测试
  - [ ] 保存/加载后制造状态、经济状态一致

---

# 任务依赖

- **TASK-ARCH-2** 依赖 **TASK-ARCH-1**（注册表创建后重构分发逻辑）
- **TASK-ARCH-3** 依赖 **TASK-ARCH-2**（重构完成后解耦指令处理函数）
- **TASK-ARCH-5** 依赖 **TASK-ARCH-4**（help 需要 sceneType 字段）
- **TASK-MAP-1** 依赖 **TASK-ARCH-4**（地图生成器需要 sceneType 定义）
- **TASK-ENEMY-1, TASK-ENEMY-2** 可与 **TASK-MAP-1** 并行
- **TASK-ITEM-1~5** 可与 **TASK-ENEMY-1** 并行
- **TASK-TECHTREE-1** 依赖 **TASK-ARCH-9**（credits 重命名）
- **TASK-SUPPLY-1** 依赖 **TASK-ITEM-1~5**（物品数据完成后定义供需）
- **TASK-TRADE-1** 依赖 **TASK-SUPPLY-1**（供需子系统完成后实现交易）
- **TASK-QUOTA-1** 依赖 **TASK-SUPPLY-1**
- **TASK-BOSS-1, TASK-BOSS-2** 依赖 **TASK-ENEMY-1, TASK-ENEMY-2**
- **TASK-QUEST-1** 依赖 **TASK-ENEMY-1, TASK-MAP-1**
- **TASK-TEST-1~5** 依赖所有前置任务完成