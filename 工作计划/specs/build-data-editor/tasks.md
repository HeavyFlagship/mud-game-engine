# Tasks

- [x] Task 1: 排查数据访问时序与兼容风险
  - [x] SubTask 1.1: 检索所有系统脚本（systems/*.js、main.js）顶层立即执行的数据访问（模块顶层直接调用 `XxxDB.get()`/遍历 DB），确认可安全改为异步装配（结论：系统层无顶层访问，唯一入口 main.js:10 DOMContentLoaded → Game.init）
  - [x] SubTask 1.2: 检索下游对 `ItemDB.consumables`/`ItemDB.questItems`、`EquipmentDB` 直接键访问、`MapDB.rooms`、`MapDB._roomsGenerated` 的引用，确认门面兼容层范围（结论：consumables/questItems 无外部引用；大量 `NPCDB[id]`/`VehicleDB[id]`/`QuestDB[id]` 等直接键访问与 `Object.entries/keys/values(DB)` 遍历，门面须以不可枚举方法兼容）
  - [x] SubTask 1.3: 排查 map.js 是否含生成逻辑（generateRooms 等），确定数据/逻辑切分边界（结论：generateRooms/_setupExits/_updateAreas/_gen*/随机工具为逻辑留 JS；rooms/_grid/_zoneConfig/areas 模板进 JSON）
  - [x] SubTask 1.4: 排查所有 `DOMContentLoaded` 监听器，确认除 main.js 外无其他监听器在数据装配前访问 DB（结论：main.js 是唯一引导监听器；另发现 WeaponDB/ArmorDB 无任何系统引用）

- [x] Task 2: 实现数据加载基础设施
  - [x] SubTask 2.1: 编写 `assets/js/data/data-loader.js`：注册表（库 id → JSON 文件 + 门面装配方式）、fetch 全部 JSON、装配全局变量、刷新派生视图、加载失败报错
  - [x] SubTask 2.2: 改造 `main.js` 为 `async` 初始化：`await DataLoader.loadAll()` 后再 `Game.init()`，失败时展示错误
  - [x] SubTask 2.3: 调整 `mud-game-engine.html` script 标签（新增 data-loader.js，位置在数据门面之后、系统脚本之前）

- [x] Task 3: 迁移核心装备链（EquipmentDB 及派生）
  - [x] SubTask 3.1: `equipment-db.js` → 数据抽出到 `equipment-db.json`，JS 重写为门面（`_data` + `get`/`getByCategory`/`getAll`/`findByName`，保持返回浅拷贝）
  - [x] SubTask 3.2: `weapons.js`/`armors.js` 派生视图改造：初始空对象 + 不可枚举的 `refresh()`，由 data-loader 装配后触发刷新，键集合与迁移前一致

- [x] Task 4: 迁移物品相关库
  - [x] SubTask 4.1: `items.js` → `items.json`（嵌套平化为 `{id: 记录}`，type 字段区分），门面保留 `get`（EquipmentDB→VehicleDB→MaterialDB→AmmoDB→本地回退链）与 `getAllSellable`，按 Task 1 排查结果补兼容访问层（排查确认无需兼容层）
  - [x] SubTask 4.2: `materials.js`、`ammo.js` → JSON + 门面（保留 `get`）

- [x] Task 5: 迁移纯数据库（10 个）
  - [x] SubTask 5.1: `skills.js`、`quests.js`、`vehicles.js`、`enemies.js` → JSON + 轻量门面（var 全局变量 + `_data`）
  - [x] SubTask 5.2: `npcs.js`、`facility-db.js`、`tech-tree-nodes.js`、`craft-recipes.js` → JSON + 门面（craft-recipes 保留 `get`/`getAll`）
  - [x] SubTask 5.3: `loot-tables.js` → `loot-tables.json`（`{敌人id: [条目]}` 结构）+ 门面（保留 `getLoot` 随机逻辑）
  - [x] SubTask 5.4: `map.js` → `map.json`（rooms 数据）+ 门面（保留生成逻辑与 `MapDB.rooms` 访问兼容）

- [x] Task 6: 编写 14 个库的 Schema 字段字典
  - [x] SubTask 6.1: 按 spec 格式规范编写 `equipment-db.schema.json`（66 字段，武器/装甲/核心条件字段 scope 标注）
  - [x] SubTask 6.2: 编写 `items/materials/ammo/skills/quests/vehicles/enemies/npcs/facility-db/tech-tree-nodes/craft-recipes` 共 11 个 schema.json（enum 收集实际取值、跨库引用标注 refDatabase）
  - [x] SubTask 6.3: 编写 `loot-tables.schema.json`（structure: grouped-array）与 `map.schema.json`（rooms 字段，battlefield 等复杂嵌套用 object + 详细注释）
  - [x] SubTask 6.4: 自检：每个 schema 的 fields 覆盖数据文件中实际出现的全部字段，nameZh/comment 非空（14/14 通过）

- [x] Task 7: 开发编辑器后端 `data-editor.js`
  - [x] SubTask 7.1: 搭建单文件 Node.js 原生 http 服务（端口 3100/DE_PORT、路径安全检查限定 data 目录、无外部依赖）
  - [x] SubTask 7.2: 实现 API：`/api/databases`（扫描 schema 自动发现库）、`/api/records`、`/api/records/save`、`/api/schema`、`/api/schema/save`、`/api/validate`
  - [x] SubTask 7.3: 实现保存校验：主键缺失/重复、required 缺失、类型不匹配、enum 越界（阻断）；ref 目标不存在（警告）；JSON 文件写回保持 2 空格缩进与键顺序

- [x] Task 8: 开发编辑器前端 UI（内嵌 HTML）
  - [x] SubTask 8.1: 框架布局：顶栏（标题/当前库/保存/Ctrl+S）+ 左侧库列表（中文名+记录数）+ 主区「数据/元数据」Tab（参考 file-manager 暗色风格）
  - [x] SubTask 8.2: 数据表格：列头中文名（悬浮提示英文名/注释/scope）、按类型渲染控件（number/boolean/enum/ref 下拉/string/array-object JSON 弹窗）、新增记录（默认值预填）、删除记录
  - [x] SubTask 8.3: 元数据表格：字段定义增删改（英文名/中文名/注释/类型/必填/默认值/选项/引用库/scope），保存写回 schema.json
  - [x] SubTask 8.4: 校验结果展示与保存反馈（错误列表、toast、未保存状态提示）

- [x] Task 9: 端到端验证
  - [x] SubTask 9.1: 通过 serve.py 启动游戏，回归验证主要功能（战斗/装备/任务/制造/设施/科技树/地图）数据加载正常（浏览器验证：页面渲染/look/status/技能/装备/弹药/槽位均正常，控制台无 error）
  - [x] SubTask 9.2: 编辑器修改数值→保存→刷新游戏生效（scout maxHp 200→700，游戏 status 显示 700/700，已恢复 200）；新增/删除记录→JSON 正确写回且游戏可加载（API 全量保存往返验证）
  - [x] SubTask 9.3: 元数据新增字段→数据表格出现新列（API 闭环：schema 新增→records 接口反映→删除恢复；前端表格按 schema 渲染已验证）；校验拦截场景逐一验证（主键重复/类型/enum/required/JSON 非法/分组键为空全部拦截，中文错误定位记录）
  - [x] SubTask 9.4: 浏览器控制台无报错；file:// 直接打开时给出明确错误提示（main.js:12-14 检测就位）
- [x] Task 10: 编写 data-editor SKILL.md
  - [x] SubTask 10.1: 编辑器启动方式、端口、目录说明
  - [x] SubTask 10.2: 新数据库接入规范（JSON 数据文件 → schema.json → JS 门面 + data-loader 注册 → HTML script 标签 → 重启编辑器自动发现）
  - [x] SubTask 10.3: Schema 格式规范、类型枚举、ref/enum 维护注意事项、加载顺序约定

# Task Dependencies
- Task 2 depends on Task 1
- Task 3, Task 4, Task 5 depend on Task 2（可并行推进）
- Task 6 depends on Task 3/4/5（schema 需对照最终数据结构；equipment schema 可在 Task 3 后先行）
- Task 7 depends on Task 6（API 依赖 schema 格式与文件就位）
- Task 8 depends on Task 7
- Task 9 depends on Task 8
- Task 10 depends on Task 7（指南在编辑器定型后编写）
