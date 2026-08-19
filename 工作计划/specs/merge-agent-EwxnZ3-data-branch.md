# 合并 trae/agent-EwxnZ3 分支（数据值以该分支为准）实施方案

## Summary

将 `trae/agent-EwxnZ3` 分支（16 个提交、约三天开发量，基于旧版数据格式）合并入当前 `trae-demo2` 分支（已完成「JSON 数据 + Schema 元数据 + 数值编辑器」重构）。核心矛盾：EwxnZ3 对 7 个数据 JS 文件的数值调整发生在旧版内联格式上，而 demo2 已把这些文件重写为门面 + JSON。方案：**git merge 承接全部系统/UI 改动，数据 JS 冲突保留 demo2 门面，再从 EwxnZ3 提取数据重新生成 JSON，同步更新 Schema**。

## Current State Analysis（探索结论）

### EwxnZ3 分支改动全景（merge-base `4eca0bc`，16 提交）
- **数据 JS（旧格式，7 个文件）**：equipment-db.js（292 行）、materials.js、items.js、ammo.js、vehicles.js、npcs.js、map.js
- **系统代码（10 个文件，demo2 未动，可干净合并）**：battle-ui.js、battle.js、command-registry.js、command-system.js、global-commands.js、game.js、map-system.js、player.js、timeline-graphic.js、timeline.js
- **UI**：styles.css、mud-game-engine.html（110 行，全部在 UI 标记区，**未触碰 script 标签区**，与 demo2 新增的 data-loader script 行不冲突）
- **文档**：新增 4 个 md 至 `工作计划/demo20260809/`（与 demo2 新增的 `工作计划/specs/` 无冲突）

### 数据变更明细（数据值以 EwxnZ3 为准）
| 文件 | 变更 |
|---|---|
| equipment-db | 34→36 条（新增 `ion_generator_tiny`、`armor_repairer_tiny`）；**全库删除 7 个废弃字段**：`slot`/`bayReq`/`startupReq`/`potential`/`baseAccuracy`/`armorPen` + 电容器的 `chargeCoeff`；`cargoVolume` 全量重新调值（单位语义调整，如 0.5→0.08）；`radar_jammer` jamStrength 2.0→0.5；若干 desc 文案（"每秒"→"每个周期"） |
| materials | 15→17 条（新增 `armor_molten_filler` 通用装甲熔铸剂、`structure_nano_repairant` 结构纳米修复剂）；全部 +cargoVolume |
| items | 7 条消耗品全部 +cargoVolume |
| ammo | 4 条弹药全部 +cargoVolume |
| vehicles | cargo 值单位调整：200→0.2、250→0.3、350→0.5、150→0.15（m³） |
| npcs | commander 商店 +13 件装备、engineer 商店 +5 件修复器/材料 |
| map | `outpost_central` 房间 battlefield 新增 `entities` 数组（工业区/交易中心两个地图实体图块） |

### 关键验证结论（决定方案可行性）
1. **新系统代码不再引用已删除的 7 个字段**（battle.js/command-system.js 中的 `slot` 均为玩家装备槽结构键，非 DB 记录字段）→ 从 JSON+Schema 中删除安全
2. **新系统代码依赖新数据字段**：player.js/game.js 读 `cargoVolume`、battle-ui.js/map-system.js 读 `battlefield.entities`、player.js 读 `repairMaterial` 系列 → 数据必须同步更新，否则新功能静默失效
3. **demo2 的 JSON 数据值 == merge-base 数据值**（当初迁移保证值不变，后续提交只加了 schema/文档）→ 直接用 EwxnZ3 数据重新生成 JSON 即为正确的合并结果，无需逐字段三方合并
4. EwxnZ3 未改任何数据文件的查询方法（get/getByCategory/getLoot 等签名与行为不变）→ demo2 门面无需改动
5. git merge 预计冲突 8 个文件：7 个数据 JS（保留 ours 门面即可）+ 可能的 html（不同区域，大概率自动合并）

## Proposed Changes

### 第 1 步：git merge 承接系统/UI/文档改动
```
git merge FETCH_HEAD   # trae/agent-EwxnZ3 (a54cf1a)
```
- 7 个数据 JS 冲突 → `git checkout --ours` 保留 demo2 门面版本
- html/styles.css/systems/文档 → 自动合并（如 html 出现冲突，两侧改动不同区域，手工保留两者：EwxnZ3 的 UI 标记 + demo2 的 data-loader script 行）
- 合并后暂不 commit，完成数据再生成后一并提交

### 第 2 步：从 EwxnZ3 重新生成 7 个 JSON 数据文件
用 Node vm 沙箱加载 `git show FETCH_HEAD:` 版本的 7 个数据 JS（无依赖，直接求值取全局变量），按既有规则生成 JSON（UTF-8、2 空格缩进、末尾换行）：
- `equipment-db.json` = JSON.stringify(EquipmentDB)（方法自动剔除）
- `materials.json`/`ammo.json`/`npcs.json`/`vehicles.json` 同理
- `items.json` = 平化 `{...consumables, ...questItems}`
- `map.json` = `{rooms, _grid, _zoneConfig, areas}`（不调用 generateRooms，只取手写数据）

生成后逐库自检：记录数与 EwxnZ3 键集一致（36/17/7/4/4/3/14 房间）、废弃字段已消失、新记录就位。

### 第 3 步：同步更新 6 个 Schema 文件
- `equipment-db.schema.json`：删除 7 个字段定义（slot/bayReq/startupReq/potential/baseAccuracy/armorPen/chargeCoeff）
- `materials.schema.json`/`items.schema.json`/`ammo.schema.json`：新增 `cargoVolume`（number，注释注明单位 m³）
- `vehicles.schema.json`：cargo 字段 comment 更新（货舱容量单位 m³）
- `map.schema.json`：battlefield 字段 comment 补充 entities 结构说明
- `npcs.schema.json`：shopItems comment 补充（含装备类 id）
- 自检：schema fields 与新 JSON 实际字段集双向核对（无遗漏、无已删字段残留）

### 第 4 步：验证
1. `node --check` 全部改动 JS
2. vm 沙箱装配测试：data-loader 加 14 库 JSON → 关键断言（EquipmentDB 36 条、get('ion_generator_tiny') 可取、MaterialDB 17 条、`'75mm_cannon'` 无 slot 字段、vehicles cargo=0.2、npcs 商店含新装备、MapDB rooms.outpost_central.battlefield.entities 存在）
3. 数值编辑器 API：`/api/databases` 14 库、equipment records 36 条、schema 无已删字段
4. 浏览器冒烟（serve.py 8080 + 编辑器 3100）：游戏正常启动、控制台无 error、shop 命令可见新上架装备（离子容器/修复器等）、status/look 正常
5. `git diff` 复核数据文件变更仅为预期清单内容

### 第 5 步：提交推送
单个合并提交推送到 `origin/trae-demo2`；EwxnZ3 分支保持原样不删。

## Assumptions & Decisions

1. **合并方向**：EwxnZ3 → trae-demo2（在 trae-demo2 上执行 merge），保留 demo2 的编辑器体系结构 ✅（符合用户"数据值以 EwxnZ3 为准、结构保留"的要求）
2. **废弃字段删除**：EwxnZ3 有明确提交"移除废弃slot属性"，且新代码不再引用 → 数据与 Schema 一并删除，不做兼容保留。**这是不可逆方向，如需保留废弃字段请提出**
3. **数据再生成而非逐字段 merge**：已验证 demo2 JSON 值==merge-base 值，整体再生成等价于三方合并且更可靠
4. `radar_jammer` jamStrength 语义变化（2.0→0.5，"降低精度"→"降低精度与命中率50%"）视为 EwxnZ3 有意调整，直接采用
5. EwxnZ3 的 4 个新文档（含"无限资源功能计划.md"等）仅作为文档并入，不实施其内容
6. `工作计划/specs/`（demo2 的编辑器归档）与 EwxnZ3 无交集，保留

## Verification（用户可复核的点）
- 合并后 `git log --graph` 可见两分支汇聚
- 游戏内 shop 列表出现新装备；装备详情（item 指令）显示修复器字段
- 编辑器装备库 36 条、材料库 17 条，表头无已删字段
