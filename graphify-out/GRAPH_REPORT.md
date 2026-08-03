# Graph Report - /workspace  (2026-08-03)

## Corpus Check
- Corpus is ~38,645 words - fits in a single context window. You may not need a graph.

## Summary
- 432 nodes · 410 edges · 98 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Structure Signals
- Entity graph basis: 410 non-file, non-concept node(s)
- Weakly connected components: 4
- Singleton components: 1
- Isolated nodes: 1
- Largest component: 390 node(s) (95% of the entity graph basis)
- Low-cohesion communities: 3
- Largest low-cohesion community: 24 node(s) (cohesion 0.08)

## Workspace Bridges
1. `装备系统设计书` - connects `1`, `1 \(3\)`, `10`, `11`, `14`, `2`, `2 — Cr`, `2 \(10\)`, `2 \(3\)`, `2 \(6\)`, `2 \(8\)`, `2 15`, `3`, `3 — 10`, `3 \(10\)`, `3 \(3\)`, `3 \(5\)`, `3 \(8\)`, `3 13`, `3 Min`, `4`, `4 — Ascii`, `4 \(4\)`, `4 \(6\)`, `4 1 UI`, `4 12`, `4 API`, `5`, `5 — Scan`, `5 — Tick`, `5 \(11\)`, `5 \(13\)`, `5 \(4\)`, `5 \(6\)`, `5 \(8\)`, `6`, `6 \(3\)`, `6 \(5\)`, `6 1`, `7`, `7 \(3\)`, `7 1`, `8`, `9 UI`; home: `10 Amm`; degree 67; score 507
  source files: `/workspace/设计文档/世界场景设计书.md`, `/workspace/设计文档/世界观设定.md`, `/workspace/设计文档/制造建造系统设计书.md`, `/workspace/设计文档/战斗系统设计书.md`, `/workspace/设计文档/敌人设计书.md`, `/workspace/设计文档/时间轴系统设计书.md`, `/workspace/设计文档/物品设计书.md`, `/workspace/设计文档/经济系统设计书.md`, `/workspace/设计文档/装备系统设计书.md`
2. `4 交易中心详细设计` - connects `10 Amm`, `4 2 \(3\)`, `4 3 Trade`, `4 4 \(5\)`, `4 5`, `4 6 Npc`, `4 7`; home: `4 \(4\)`; degree 9; score 93
  source files: `/workspace/设计文档/经济系统设计书.md`, `/workspace/设计文档/装备系统设计书.md`
3. `2 战斗系统` - connects `10 Amm`, `2 1`, `2 4`, `2 6 Ai`, `2 7`, `2 8 Mud`; home: `2 \(6\)`; degree 9; score 82
  source files: `/workspace/设计文档/战斗系统设计书.md`, `/workspace/设计文档/装备系统设计书.md`
4. `1 概述` - connects `1 3`, `10 Amm`, `Community 44`, `Community 72`; home: `1`; degree 14; score 63.5
  source files: `/workspace/设计文档/制造建造系统设计书.md`, `/workspace/设计文档/战斗系统设计书.md`, `/workspace/设计文档/时间轴系统设计书.md`, `/workspace/设计文档/物品设计书.md`, `/workspace/设计文档/装备系统设计书.md`
5. `4 物流系统` - connects `10 Amm`, `4 2`, `4 3 \(3\)`, `4 4 \(3\)`; home: `4 \(6\)`; degree 5; score 50.5
  source files: `/workspace/设计文档/制造建造系统设计书.md`, `/workspace/设计文档/装备系统设计书.md`
6. `4 世界地图分布与场景展示方案` - connects `10 Amm`, `4 3`, `4 4`; home: `4 — Ascii`; degree 6; score 43.5
  source files: `/workspace/设计文档/世界场景设计书.md`, `/workspace/设计文档/装备系统设计书.md`

## God Nodes
1. `装备系统设计书` - 67 edges
2. `2 外星虫子（15 种）` - 16 edges
3. `1 概述` - 14 edges
4. `3 其他文明战斗机械（13 种）` - 14 edges
5. `4 叛变数字生命（12 种）` - 13 edges
6. `2 战斗系统` - 9 edges
7. `4 交易中心详细设计` - 9 edges
8. `最小装备系统装备表` - 9 edges
9. `幻境传说 / MUD 文字冒险引擎` - 9 edges
10. `2 载具系统` - 8 edges

## Surprising Connections
- None detected - all connections are within the same source files.

## Semantic Anomalies
- **[HIGH] Bridge node** - 4 交易中心详细设计 bridges 4 \(4\) and 4 2 \(3\), 4 3 Trade, 4 4 \(5\), 4 5, 4 6 Npc, 4 7.
  _High betweenness centrality \(14.000\) across 7 communities makes this node a likely dependency chokepoint._
- **[HIGH] Bridge node** - 2 战斗系统 bridges 2 \(6\) and 2 1, 2 4, 2 6 Ai, 2 7, 2 8 Mud.
  _High betweenness centrality \(13.000\) across 6 communities makes this node a likely dependency chokepoint._
- **[HIGH] Bridge node** - 1 概述 bridges 1 and Community 72, Community 44, 1 3.
  _High betweenness centrality \(9.500\) across 4 communities makes this node a likely dependency chokepoint._
- **[HIGH] Low-cohesion community** - 10 Amm is weakly connected for its size.
  _Cohesion score 0.08 across 24 nodes suggests this community may mix unrelated responsibilities._
- **[MEDIUM] Low-cohesion community** - 2 15 is weakly connected for its size.
  _Cohesion score 0.13 across 16 nodes suggests this community may mix unrelated responsibilities._

## Communities

### Community 0 - "10 Amm"
Cohesion (entity basis within full-graph community): 0.08
Nodes (24): 装备系统设计书, 10 弹药（AMM）, 11 建筑材料（BLD）, 12 战斗消耗品（POT）, 13 制造链路示例, 15 物品统计, 16 小结, 2. 星发委与先遣体系 (+16 more)

### Community 1 - "2 15"
Cohesion (entity basis within full-graph community): 0.13
Nodes (16): 2.10 虫巢幼虫（Larva）, 2.11 毒雾虫（Toxic Bug）, 2.12 钻地虫（Burrower）, 2.13 裂壳虫（Splitter）, 2.14 共生虫（Symbiote）, 2 外星虫子（15 种）, 2.15 远古虫（Ancient Bug）, 2.1 工虫（Worker Bug） (+8 more)

### Community 2 - "3 13"
Cohesion (entity basis within full-graph community): 0.14
Nodes (14): 3.10 守护者巨像（Colossus Guardian）, 3.11 电磁脉冲机（EMP Emitter）, 3.12 拆解者（Dismantler）, 3 其他文明战斗机械（13 种）, 3.13 未知核心体（Unknown Core）, 3.1 侦察探针（Recon Probe）, 3.2 防御节点（Defense Node）, 3.3 粒子束哨兵（Particle Sentry） (+6 more)

### Community 3 - "4 12"
Cohesion (entity basis within full-graph community): 0.15
Nodes (13): 4.10 黑市改装者（Black Market Modder）, 4.11 裂隙精英（Rift Elite）, 4 叛变数字生命（12 种）, 4.12 叛军领袖（Rebel Leader）, 4.1 游荡者（Wanderer）, 4.2 流亡步枪手（Exile Rifleman）, 4.3 伏击者（Ambusher）, 4.4 叛军工程师（Rebel Engineer） (+5 more)

### Community 4 - "1"
Cohesion (entity basis within full-graph community): 0.18
Nodes (11): 敌人, 设计哲学, 1.1 游戏背景（装备相关）, 1.2 装备系统概述, 1.2 物品属性字段, 1 概述, 1.3 与现有数据衔接, 1.3 与其他系统的关系 (+3 more)

### Community 5 - "Community 5"
Cohesion (entity basis within full-graph community): 0.2
Nodes (10): 附件：, 最小装备系统装备表, 武器类, 电子战设备类, 装甲类, 生成器类, 容器类, 修复器类 (+2 more)

### Community 6 - "Readme"
Cohesion (entity basis within full-graph community): 0.22
Nodes (9): 快速开始, 目录结构, 项目简介, 游戏指令, 技术特点, 当前功能, 开发计划, License (+1 more)

### Community 7 - "2"
Cohesion (entity basis within full-graph community): 0.25
Nodes (8): 2.1 载具类型, 2.2 载具属性, 2.3 接口系统, 2.4 核心舱, 2 载具系统, 2.5 载具自带功能, 2.6 运动能力, 2.7 资源点数

### Community 8 - "4"
Cohesion (entity basis within full-graph community): 0.25
Nodes (8): 4.1 武器, 4 装备分类, 4.2 电子战设备, 4.3 装甲, 4.4 护盾（暂不实现）, 4.5 生成器, 4.6 容器, 4.7 修复器

### Community 9 - "7 1"
Cohesion (entity basis within full-graph community): 0.25
Nodes (8): 7.1.1 基地与交易中心, 7.1.2 物资供需记录（每基地每物资一条）, 7.1.3 订单条目, 7.1.4 价格修正项, 7.1.5 配额记录, 7.1.6 跨基地比价缓存, 7.1 核心数据属性, 7 技术实现要点

### Community 10 - "7 2"
Cohesion (entity basis within full-graph community): 0.25
Nodes (8): 7.2.1 供需状态更新, 7.2.2 价格波动计算, 7.2.3 订单撮合逻辑, 7.2.4 跨基地价差计算, 7.2.5 玩家卖出结算, 7.2.6 玩家买入结算, 7.2.7 配额检查, 7.2 核心计算逻辑

### Community 11 - "4 API"
Cohesion (entity basis within full-graph community): 0.29
Nodes (7): 生命周期, 事件处理器注册, 更新器注册, 事件调度, 持续动作, 推进控制, 4 API 参考

### Community 12 - "2 \(3\)"
Cohesion (entity basis within full-graph community): 0.29
Nodes (7): 2.1 开发树定位, 2.2 开发树结构, 2.3 三层解锁逻辑, 2.4 开发进度与解锁, 2.5 开发树新闻通知, 2 开发树, 2.6 进度推进规则

### Community 13 - "2 2"
Cohesion (entity basis within full-graph community): 0.29
Nodes (7): 2.2 供需子系统, 2.2.1 多基地与多交易中心架构, 2.2.2 三维度核心数值, 2.2.3 需求订单的动态生成, 2.2.4 供应订单的动态生成, 2.2.5 与外部系统的联动触发, 2.2.6 玩家显示格式

### Community 14 - "2 8 Mud"
Cohesion (entity basis within full-graph community): 0.29
Nodes (7): 2.8 MUD战斗指令集, 执行指令, 攻击指令, 防御指令（暂不实现）, 电子战指令（暂不实现）, 队友指令（暂不实现）, 信息指令（不消耗行动）

### Community 15 - "4 5"
Cohesion (entity basis within full-graph community): 0.29
Nodes (7): 4.5.1 开发进度修正, 4.5.2 物流状态修正, 4.5.3 供需状态修正, 4.5.4 时间衰减修正, 4.5 价格波动机制, 4.5.5 跨基地价差机制, 4.5.6 价格波动示例

### Community 16 - "1 \(3\)"
Cohesion (entity basis within full-graph community): 0.33
Nodes (6): 1.1 设计目标, 1.2 社会主义意识形态的表达, 1.3 核心框架, 1.4 与其他系统的关系, 1.5 与制造建造系统的接口, 1 概述

### Community 17 - "2 2 \(3\)"
Cohesion (entity basis within full-graph community): 0.33
Nodes (6): 2.2.1 轨道与自转, 2.2.2 大气成分（还原性大气）, 2.2 星球基础设定, 2.2.3 表面温度, 2.2.4 硅基生命形态, 2.2.5 设定一致性

### Community 18 - "4 3"
Cohesion (entity basis within full-graph community): 0.33
Nodes (6): 4.3.1 场景风貌描述（文本）, 4.3 场景展示方案（图文结合）, 4.3.2 战场雷达（Canvas）, 4.3.3 单位/敌人列表（文本面板）, 4.3.4 时间轴面板（文本）, 4.3.5 跨场景行军展示

### Community 19 - "4 4"
Cohesion (entity basis within full-graph community): 0.33
Nodes (6): 4.4.1 地形（terrain）, 4.4.2 废墟与残骸（cover 类）, 4.4 场景风貌元素库（地形/废墟/残骸/建筑/植物/矿脉）, 4.4.3 建筑结构（交互点/掩体）, 4.4.4 异星植物（地物/危害）, 4.4.5 矿脉（资源点 lootPoints）

### Community 20 - "10"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 10 已解决的关键问题, 移动进度条残留, 首次移动不生效, 武器就绪打断移动, 移动中切换移动不询问开火

### Community 21 - "11"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 11 扩展指南, 新增事件类型, 新增持续动作类型, 接入新系统（如生产制造）, 注意事项

### Community 22 - "2 4"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 效果类型, 叠加规则, 施加与解除, 其他生效加成（暂不实现）, 2.4 状态效果系统

### Community 23 - "14"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 14.1 与敌人战利品的对应, 14.2 与装备系统的对应, 14.3 与世界场景的对应, 14 与其他设计书的对应关系, 14.4 与战斗系统的对应

### Community 24 - "2 4 UI"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 缩放与切换, 2.4 地图UI方案, 第二级：区域地图（Region Map）, 第三级：场景战场（Scene Battlefield）, 第一级：星球总览（World Map）

### Community 25 - "2 6 Ai"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 按敌人类型的行为权重, 集群协同规则, 低血量行为, 2.6 敌人AI行为详细设计（暂不实装）, AI状态机

### Community 26 - "6"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 事件处理器注册, 更新器注册, 生命周期集成, 回合调度, 6 战斗系统作为消费者

### Community 27 - "3"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 3.1 整合理念, 3.2 两类订单的统一展示, 3 交付机制与市场机制整合, 3.3 自动撮合与供需联动, 3.4 整合带来的体验提升

### Community 28 - "3 \(3\)"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 3.1 事件格式, 3.2 交互方式, 3 时间轴系统, 3.3 先手, 3.4 其他交互

### Community 29 - "3 \(5\)"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 3 装备属性, 3.1 基础属性, 3.2 装备属性, 3.3 装备改装与潜力值, 3.4 装备安装与匹配逻辑

### Community 30 - "3 — 10"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 3 特殊地点设计（四大阵营据点/巢穴）, 3.1 人类先遣队据点（10 种）, 3.2 外星虫子巢穴（12 种）, 3.3 叛变数字生命据点（10 种）, 3.4 其他文明遗迹（10 种）

### Community 31 - "4 6 Npc"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 4.6.1 定位, 4.6.2 标签与订单物资, 4.6.3 NPC订单生成, 4.6.4 与NPC系统的关系, 4.6 可交易NPC

### Community 32 - "5"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 5.1 风貌模板结构, 5.2 据点邻近度与风貌漂变, 5.3 地下层与高空层, 5 场景生成与风貌模板, 5.4 动态事件

### Community 33 - "5 3"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 5.3.1 配额内容, 5.3.2 配额解锁方式, 5.3.3 配额领取, 5.3.4 配额奖励选择, 5.3 高级配额

### Community 34 - "6 1"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 6.1.1 开发树节点, 6.1.2 生产设施, 6.1.3 物流线, 6.1 核心数据属性, 6 技术实现要点

### Community 35 - "6 \(3\)"
Cohesion (entity basis within full-graph community): 0.4
Nodes (5): 6.1 虫群战利品表, 6.2 战斗机械战利品表, 6.3 叛军战利品表, 6.4 战利品说明, 6 战利品掉落表汇总

### Community 36 - "5 — Tick"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 推进驱动, 暂停机制, 5 运行机制, Tick 流程

### Community 37 - "2 — Cr"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 2 核心概念, 2.1 信用点（CR）, 2.3 交付机制, 2.4 信用点计算

### Community 38 - "2 \(6\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 2.2 伤害类型, 2.3 伤害方式, 2.5 相关公式, 2 战斗系统

### Community 39 - "2 \(8\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 分层结构, 2 架构, 文件位置, 加载顺序

### Community 40 - "7"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 移动动作的创建, 移动与其他动作的并行, 移动中断, 7 持续动作与移动

### Community 41 - "3 2"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 3.2 生产设施类型, 3.2.1 冶炼炉（金属冶炼）, 3.2.2 化工厂（化工产品）, 3.2.3 制造工厂（工业品）

### Community 42 - "3 3"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 3.3.1 建造流程, 3.3 建造与运行, 3.3.2 建造所需物资, 3.3.3 运行机制

### Community 43 - "3 \(8\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 3 核心数据结构, 时间轴状态, 事件对象, 持续动作对象

### Community 44 - "Community 44"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 地图与战斗场景, 敌人分布模式, 小队、队友, 战斗中的运动

### Community 45 - "8"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 决策点, 决策点行为, 待机机制, 8 玩家决策与暂停

### Community 46 - "9 UI"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 时间轴面板, 时间显示, 刷新机制, 9 UI 渲染集成

### Community 47 - "4 — Ascii"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 4.1 四大阵营分布总览, 4 世界地图分布与场景展示方案, 4.2 分布示意（ASCII 总览图）, 4.5 场景风貌描述样例

### Community 48 - "4 3 Trade"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 4.3.1 trade指令, 4.3.2 订单信息页展示格式, 4.3.3 订单排序规则, 4.3 trade指令与订单展示

### Community 49 - "4 4 \(3\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 4.4.1 事件类型, 4.4.2 事件处理, 4.4 物流线风险事件, 4.4.3 事件通知

### Community 50 - "4 4 \(5\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 4.4.1 撮合逻辑, 4.4.2 撮合示例, 4.4.3 撮合对供需系统的影响, 4.4 自动撮合机制

### Community 51 - "5 \(4\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 外星虫子, 其他文明的战斗机械, 叛变数字生命, 5. 敌对势力

### Community 52 - "4 1 UI"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 时间轴显示, 4.1 战斗信息UI展示, 4 UI显示, 战场简图（Canvas绘制）

### Community 53 - "5 \(6\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 基础载具, 敌人模板, 地图模板, 5 最小可用数据

### Community 54 - "5 \(8\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 5.1 接口概述, 5.2 状态查询接口, 5.3 事件通知接口, 5 与经济系统的接口

### Community 55 - "5 — Scan"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 5.1 遭遇展示（进入场景/接近感知）, 5.3 雷达标记规范, 5 敌人展示方案, 5.4 敌人扫描信息（scan 指令）

### Community 56 - "5 2"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 5.2.1 敌人卡片文本规范, 5.2.2 敌人攻击描述规范, 5.2.3 敌人死亡描述规范, 5.2 战斗中展示（敌人卡片）

### Community 57 - "6 2"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 6.2.1 开发进度计算, 6.2.2 设施产出计算, 6.2.3 物流线事件触发, 6.2 核心计算逻辑

### Community 58 - "7 \(3\)"
Cohesion (entity basis within full-graph community): 0.5
Nodes (4): 7.1 难度梯度, 7.2 集群规模建议, 7.3 与现有数据衔接, 7 敌人平衡与分布建议

### Community 59 - "1 3"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 1.3.1 人物技能等级成长, 1.3 能力成长模式（暂不实现，其他文档中详细描述）, 1.3.2 经济成长

### Community 60 - "2 1"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 装备相关数值, 2.1 数值表, 基本战斗数值

### Community 61 - "2 \(10\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 2.1 星球网格与坐标, 2 世界地图设计, 2.3 地貌类型

### Community 62 - "2 7"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 房间战场数据, 单位状态数据, 2.7 战斗场景数据结构

### Community 63 - "3 \(10\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 3 生产设施, 3.1 生产设施定位, 3.4 规模弹性

### Community 64 - "4 \(4\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 4.1 交易中心定位, 4 交易中心详细设计, 4.8 信用点计算

### Community 65 - "4 2"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 4.2.1 解锁条件, 4.2.2 物流清障任务, 4.2 物流线解锁

### Community 66 - "4 2 \(3\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 4.2.1 供需订单（组织订单）, 4.2.2 市场订单（自由订单）, 4.2 订单类型

### Community 67 - "4 3 \(3\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 4.3.1 运行状态, 4.3.2 物流线管理, 4.3 物流线运行

### Community 68 - "4 7"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 4.7.1 玩家卖出结算, 4.7.2 玩家买入结算, 4.7 交易结算

### Community 69 - "5 2 \(3\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 5.2.1 通用词缀, 5.2.2 特殊词缀, 5.2 装备词缀

### Community 70 - "5 2 \(5\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 5.2.1 配额内容, 5.2.2 配额使用, 5.2 基础配额

### Community 71 - "6 \(5\)"
Cohesion (entity basis within full-graph community): 0.67
Nodes (3): 6.1 经济体系层次, 6.2 玩家体验路径, 6 经济循环总结

### Community 72 - "Community 72"
Cohesion (entity basis within full-graph community): 1
Nodes (2): 战斗模式, 时间轴回合制

### Community 73 - "3 Min"
Cohesion (entity basis within full-graph community): 1
Nodes (2): 3.1 其他备选矿物, 3 矿产（MIN）

### Community 74 - "4 \(6\)"
Cohesion (entity basis within full-graph community): 1
Nodes (2): 4.1 物流系统定位, 4 物流系统

### Community 75 - "5 \(11\)"
Cohesion (entity basis within full-graph community): 1
Nodes (2): 5.1 装备品质, 5 装备品质与词缀

### Community 76 - "5 \(13\)"
Cohesion (entity basis within full-graph community): 1
Nodes (2): 5.1 配额制定位, 5 配额制

### Community 77 - "Mud Game Engine Exec"
Cohesion (entity basis within full-graph community): 1
Nodes (1): exec\(\)

### Community 78 - "Markdown"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 79 - "Armors Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 80 - "Battle Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 81 - "Battle UI Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 82 - "Command System Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 83 - "Enemies Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 84 - "Enemy Ai Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 85 - "Equipment Db Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 86 - "Game Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 87 - "Items Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 88 - "Map Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 89 - "Map System Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 90 - "Messages Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 91 - "Npcs Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 92 - "Player Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 93 - "Skills Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 94 - "Timeline Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 95 - "Utils Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 96 - "Vehicles Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

### Community 97 - "Weapons Js"
Cohesion (entity basis within full-graph community): n/a
Nodes (0): 

## Knowledge Gaps
- **328 weakly connected node(s):** `exec\(\)`, `项目简介`, `当前功能`, `快速开始`, `目录结构` (+323 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 72`** (2 nodes): `战斗模式`, `时间轴回合制`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `3 Min`** (2 nodes): `3.1 其他备选矿物`, `3 矿产（MIN）`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `4 \(6\)`** (2 nodes): `4.1 物流系统定位`, `4 物流系统`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `5 \(11\)`** (2 nodes): `5.1 装备品质`, `5 装备品质与词缀`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `5 \(13\)`** (2 nodes): `5.1 配额制定位`, `5 配额制`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mud Game Engine Exec`** (2 nodes): `main.js`, `exec\(\)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Markdown`** (1 nodes): `装备系统设计书.md`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Armors Js`** (1 nodes): `armors.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle Js`** (1 nodes): `battle.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle UI Js`** (1 nodes): `battle-ui.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Command System Js`** (1 nodes): `command-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Enemies Js`** (1 nodes): `enemies.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Enemy Ai Js`** (1 nodes): `enemy-ai.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Equipment Db Js`** (1 nodes): `equipment-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Game Js`** (1 nodes): `game.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Items Js`** (1 nodes): `items.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Map Js`** (1 nodes): `map.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Map System Js`** (1 nodes): `map-system.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Messages Js`** (1 nodes): `messages.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Npcs Js`** (1 nodes): `npcs.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Player Js`** (1 nodes): `player.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Skills Js`** (1 nodes): `skills.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Timeline Js`** (1 nodes): `timeline.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utils Js`** (1 nodes): `utils.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vehicles Js`** (1 nodes): `vehicles.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Weapons Js`** (1 nodes): `weapons.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does \`4 交易中心详细设计\` connect \`4 \(4\)\` to \`4 2 \(3\)\`, \`4 3 Trade\`, \`4 4 \(5\)\`, \`4 5\`, \`4 6 Npc\`, \`4 7\`?**
  _High betweenness centrality \(14.000\) - this node is a cross-community bridge._
- **Why does \`2 战斗系统\` connect \`2 \(6\)\` to \`2 1\`, \`2 4\`, \`2 6 Ai\`, \`2 7\`, \`2 8 Mud\`?**
  _High betweenness centrality \(13.000\) - this node is a cross-community bridge._
- **Why does \`1 概述\` connect \`1\` to \`Community 72\`, \`Community 44\`, \`1 3\`?**
  _High betweenness centrality \(9.500\) - this node is a cross-community bridge._
- **What connects \`exec\(\)\`, \`项目简介\`, \`当前功能\` to the rest of the system?**
  _328 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should \`10 Amm\` be split into smaller, more focused modules?**
  _Cohesion score 0.08 across 24 entity nodes - this community may mix unrelated responsibilities._
- **Should \`2 15\` be split into smaller, more focused modules?**
  _Cohesion score 0.13 across 16 entity nodes - this community may mix unrelated responsibilities._
- **Should \`3 13\` be split into smaller, more focused modules?**
  _Cohesion score 0.14 across 14 entity nodes - this community may mix unrelated responsibilities._
