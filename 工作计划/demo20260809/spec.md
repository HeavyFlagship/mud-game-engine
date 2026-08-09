# 《织女-7前哨》Demo 规格说明

> 创建时间：2026-08-09
> 关联计划：demo20260809-plan.md
> 代码库：/workspace/mud-game-engine/

---

## Why

当前 MUD 机甲战斗游戏《织女-7前哨》仅有 14 个手工房间、2 种敌人、4 种物品，且指令系统使用 switch-case 模式难以扩展。需要制作一个核心循环完整可玩的 Demo，验证制造生产、经济交易、场景指令分类等核心机制。

## What Changes

### 架构重构（**重构**）
- **BREAKING**: 指令系统从 switch-case 重构为注册表模式（三层架构：global/battle/base）
- **BREAKING**: 指令处理函数从 `command-system.js` 解耦至独立模块（`systems/commands/`）
- **重构**: 删除 `game.js` 中重复的 `reload` 函数（BUG-1）
- **重构**: `ItemDB` 拆分：`items.js` → `items.js` + `materials.js` + `ammo.js` + `craft-recipes.js`
- **重构**: `EnemyDB` 按阵营拆分数据结构（虫族/机械）
- **重构**: `player.js` 中 `gold` 字段重命名为 `credits`

### 新增功能
- 10x10 网格地图（100 房间），程序化生成 + 手工关键房间
- 敌人扩展至 15 种（虫族 8 种 + 机械 6 种 + Boss 1 种）
- 物品扩展至 40+ 种（消耗品、材料、制造材料、弹药、配方）
- 制造生产系统：开发树（最小闭环）+ 生产设施安装与运行 + 工业区面积管理
- 经济系统：供需子系统 + 交易中心 + 基础配额制
- 任务系统（简易主线 + 支线）
- 场景交互增强（资源点、环境危害、Boss 战）
- UI/UX 优化（战斗日志分类、迷你地图、装备对比）

## Impact

- Affected specs: 指令系统、地图系统、战斗系统、经济系统、制造系统、物品系统
- Affected code:
  - **修改**: `systems/command-system.js`, `systems/game.js`, `systems/player.js`, `data/enemies.js`, `data/items.js`, `data/map.js`, `data/npcs.js`
  - **新增**: `systems/command-registry.js`, `systems/commands/`, `systems/tech-tree.js`, `systems/facility.js`, `systems/supply-demand.js`, `systems/trade.js`, `systems/quota.js`, `systems/quest.js`, `data/tech-tree-nodes.js`, `data/facility-db.js`, `data/materials.js`, `data/ammo.js`, `data/craft-recipes.js`, `data/quests.js`, `data/loot-tables.js`

---

## ADDED Requirements

### Requirement: 场景指令注册表架构
系统 SHALL 提供三层指令注册表（global/battle/base），替代现有 switch-case 模式，根据场景类型（safe/battle）动态启用/禁用指令。

#### Scenario: 安全区指令可用性
- **WHEN** 玩家处于安全区场景（sceneType: 'safe'）
- **THEN** global + base 层指令可用，battle 层指令不可用

#### Scenario: 战场指令可用性
- **WHEN** 玩家处于战场场景（sceneType: 'battle'）
- **THEN** global + battle 层指令可用，base 层指令不可用

#### Scenario: help 指令按场景显示
- **WHEN** 玩家执行 `help` 指令
- **THEN** 仅显示当前场景可用的指令列表

### Requirement: 10x10 网格地图
系统 SHALL 提供 10x10 网格地图（100 房间），包含 7 个区域类型（基地/荒原/荒野/矿洞/过渡区/机械遗迹/奇异地形/前沿区域），确保从基地出发可到达所有区域。

#### Scenario: 地图生成
- **WHEN** 游戏启动
- **THEN** 生成 100 个房间，保留现有 14 个手工房间的位置和属性，其余按区域规则程序化生成

#### Scenario: 房间连通性
- **WHEN** 地图生成完成
- **THEN** 每个房间至少与 1 个相邻房间连通，Boss 房间仅 1 个入口

### Requirement: 15 种敌人
系统 SHALL 提供 15 种敌人配置，包括 8 种虫族、6 种机械敌人、1 种 Boss（巨型守卫虫），每种敌人含完整属性、AI 类型、特殊技能、战利品掉落表。

#### Scenario: 虫族敌人 AI 行为
- **WHEN** 遭遇虫族敌人
- **THEN** 虫族采用集群冲锋 AI（bug_charge/bug_simple/bug_swarm），机械采用远程保持距离 AI（mech_scout/mech_turret/mech_sentry）

#### Scenario: Boss 二阶段
- **WHEN** Boss HP 低于 50%
- **THEN** 激活二阶段：攻速+30%、伤害+20%（巨型守卫虫）

### Requirement: 制造生产系统（开发树最小闭环）
系统 SHALL 实现铁矿石→铁锭→钢锭→装甲板的开发树最小闭环，支持玩家直接生产路径解锁节点。

#### Scenario: 开发树节点解锁
- **WHEN** 玩家满足前置条件（前置节点已解锁 + 原材料充足）
- **THEN** 可生产并解锁下游节点，开放建造对应生产设施

#### Scenario: 设施安装
- **WHEN** 玩家在基地执行 `安装` 指令
- **THEN** 检查前置条件（节点解锁 + 工业区面积 + 物资），通过后消耗物资完成安装，设施开始运行

#### Scenario: 设施持续产出
- **WHEN** 设施安装完成并运行
- **THEN** 按产出速率持续生产，消耗仓库原料，产出存入设施库存，库存满后暂停

### Requirement: 经济系统（供需 + 交易 + 配额）
系统 SHALL 实现单基地供需子系统、交易中心（供需订单+市场订单）、基础配额制。

#### Scenario: 供需状态变化
- **WHEN** 储备量 ≥ 安全线
- **THEN** 状态为"供应充足"
- **WHEN** 储备量 < 警戒线
- **THEN** 状态为"供应短缺"，自动生成紧急需求订单

#### Scenario: 交易中心买卖
- **WHEN** 玩家在基地执行 `trade` 指令
- **THEN** 查看当前基地所有订单，可按物资筛选，执行买卖操作

#### Scenario: 配额补给
- **WHEN** 玩家在维修站执行 `replenish` 指令
- **THEN** 检查当日剩余配额，配额内免费补给，超出提示购买

### Requirement: 任务系统
系统 SHALL 提供简易任务系统，包含 3 条主线任务和可重复支线任务。

#### Scenario: 任务追踪
- **WHEN** 玩家接取任务
- **THEN** 任务进度可追踪，完成后获得奖励（信用点、经验值、物品）

### Requirement: 场景交互增强
系统 SHALL 提供资源点拾取、环境危害、Boss 战斗等场景交互。

#### Scenario: 环境危害触发
- **WHEN** 玩家进入有害环境房间（毒雾区/酸液池/电磁干扰区）
- **THEN** 触发对应负面效果（扣血/减速/视野减半）

---

## MODIFIED Requirements

### Requirement: 指令系统（**重构**）
**原实现**: `command-system.js` 使用两层 switch-case 分发指令（`execute()` 和 `handleBattleCmd()`）
**新实现**: 基于注册表模式的三层指令系统，指令处理函数解耦至独立模块

#### Scenario: 指令注册
- **WHEN** 新增一个指令（如 `trade`）
- **THEN** 只需在注册表中添加条目并实现对应 handler，无需修改分发逻辑

### Requirement: 物品数据（**重构**）
**原实现**: 所有物品集中在 `items.js` 的单一 `ItemDB` 中
**新实现**: 按类别拆分为 `items.js`（基础物品）、`materials.js`（材料）、`ammo.js`（弹药）、`craft-recipes.js`（制造配方）

### Requirement: 敌人数据（**重构**）
**原实现**: 所有敌人集中在 `enemies.js` 的单一 `EnemyDB` 中
**新实现**: 按阵营拆分数据结构（虫族阵营/机械阵营），保留统一 `EnemyDB` 导出

### Requirement: 玩家货币（**重构**）
**原实现**: `player.js` 使用 `gold` 字段表示货币
**新实现**: 重命名为 `credits`（信用点），语义更准确

---

## REMOVED Requirements

### Requirement: switch-case 指令分发（**重构**）
**Reason**: 不可扩展，每新增指令需修改 switch-case 分支，场景不感知
**Migration**: 迁移至注册表模式，旧指令处理函数逐批迁移至 `systems/commands/` 模块