# 数值数据编辑器与数据规范化 Spec

## Why
当前 16 个游戏数值数据库（装备/载具/物品/工厂/技能/任务等）以 JS 全局变量形式散落管理：字段无中文名称、无注释、无类型约束，主键命名不统一（`id`/`facilityId`/`nodeId`），修改数值只能直接编辑 JS 源码，易出错且不可视化。需要建立「JSON 数据文件 + Schema 字段字典 + Web 数值编辑器」的规范化管理体系。

## What Changes
- **数据与逻辑分离（14 个库）**：将含独立数据的 14 个数据库的纯数据部分从 JS 迁移为 JSON 文件；JS 保留为轻量门面（查询方法 + 派生逻辑）。`weapons.js`/`armors.js` 为 EquipmentDB 派生视图，无独立数据，不迁移、只改造为可刷新模式。
- **新增异步数据加载器** `data-loader.js`：启动时 fetch 全部 JSON 并装配到全局变量，`main.js` 初始化流程异步化。
- **新增 Schema 元数据体系**：每个库一份 `xxx.schema.json` 字段字典（与数据文件同目录），字段含英文名/中文名/注释/类型/必填/默认值，作为编辑器与数据规范的唯一事实来源。
- **新增数值编辑器** `data-editor.js`：参考 file-manager 的单文件 Node.js 原生 http 服务架构（无外部依赖、内嵌前端），Web UI 支持 14 个库的数据记录增删查改 + 元数据（字段字典）增删查改 + 保存前校验，直接写回云端工作区文件。
- **新增 data-editor Skill**：说明编辑器启动方式与新数据库接入规范，后续新增库时按规范更新。
- **BREAKING（内部）**：数据文件从 JS 改为 JSON，游戏必须通过 HTTP 服务访问（`serve.py`），`file://` 协议不再支持。对外全局变量名与查询方法签名保持不变，下游系统代码原则上无需改动。

## Impact
- Affected code:
  - `mud-game-engine/assets/js/data/*.js` — 16 个文件全部重写为门面（数据移出）
  - `mud-game-engine/assets/js/data/*.json` — 新增 14 个数据文件 + 14 个 schema 文件
  - `mud-game-engine/assets/js/data/data-loader.js` — 新增
  - `mud-game-engine/assets/js/main.js` — 初始化流程异步化
  - `mud-game-engine/mud-game-engine.html` — script 标签调整
  - `/workspace/.trae/skills/data-editor/` — 新增编辑器服务与 SKILL.md

## 术语定义（已与用户确认）
- **元数据（字段字典 / Schema）**：每个数据库一份字段定义清单，每个字段包含英文名（`name`，如 `damage`）、中文名（`nameZh`，如"伤害值"）、注释（`comment`）、数据类型（`type`）、是否必填（`required`）、默认值（`default`）等属性。元数据的增删查改即管理这份字典（例如给装备库新增一个"耐久度"字段定义）。
- **数据记录**：数据库中的一条具体数值条目（如一件装备、一个敌人），编辑器支持完整增删查改。

## ADDED Requirements

### Requirement: JSON 数据文件存储
系统 SHALL 将 14 个含独立数据的数据库的纯数据存储为 JSON 文件，位于 `mud-game-engine/assets/js/data/` 目录，与原 JS 文件同名（`equipment-db.json`、`materials.json`、`ammo.json`、`skills.json`、`quests.json`、`vehicles.json`、`enemies.json`、`npcs.json`、`facility-db.json`、`tech-tree-nodes.json`、`craft-recipes.json`、`loot-tables.json`、`items.json`、`map.json`）。

#### Scenario: 数据文件结构
- **WHEN** 查看 `skills.json`
- **THEN** 内容为纯数据对象 `{ "<技能id>": { 记录字段... } }`，不含任何函数/方法/注释，2 空格缩进 UTF-8 编码

#### Scenario: 特殊结构适配
- **WHEN** 迁移 `items.js`（原嵌套 `consumables`/`questItems` 分类）
- **THEN** 平化为顶层 `{ "<物品id>": { 记录含 type 字段 } }`，门面保留兼容访问层（排查下游对 `ItemDB.consumables` 的直接引用并兼容）
- **WHEN** 迁移 `map.js`
- **THEN** 仅 `rooms` 数据进 JSON，生成逻辑（若有）保留在 JS 门面中

### Requirement: JS 门面与派生视图
每个库 SHALL 保留同名 JS 门面文件，维持原全局变量名（如 `EquipmentDB`）与原查询方法签名（`get`/`getByCategory`/`getAll`/`findByName`/`getLoot` 等），方法内部改为读取装配后的 JSON 数据。`weapons.js`/`armors.js` 派生视图 SHALL 改造为「初始为空对象 + 由加载器装配完成后刷新」的模式，刷新方法不可枚举（不污染 `for...in` 遍历）。

#### Scenario: 门面方法兼容
- **WHEN** 下游代码调用 `EquipmentDB.get('xxx')` 或 `ItemDB.get('xxx')`（跨库回退查询）
- **THEN** 行为与迁移前一致，返回浅拷贝记录

#### Scenario: 派生视图刷新
- **WHEN** 数据加载器完成 EquipmentDB 装配
- **THEN** `WeaponDB`/`ArmorDB` 自动重算派生内容，键集合与迁移前一致

### Requirement: 异步数据加载器
系统 SHALL 提供 `data-loader.js`（位于 `assets/js/data/`，在 HTML 中先于系统脚本加载），由 `main.js` 在 `DOMContentLoaded` 中 `await DataLoader.loadAll()` 后再执行 `Game.init()`。加载器负责 fetch 全部 JSON、装配各门面全局变量、触发派生视图刷新。

#### Scenario: 正常启动
- **WHEN** 通过 `serve.py` 以 HTTP 访问游戏页面
- **THEN** 所有 14 个库数据装配完成、派生视图就绪后游戏才初始化，游戏功能与迁移前一致

#### Scenario: 加载失败
- **WHEN** 任一 JSON fetch 或解析失败
- **THEN** 页面显示明确的错误信息（含失败文件名），游戏不静默初始化

### Requirement: Schema 元数据文件
每个含独立数据的库 SHALL 有一份同目录 `xxx.schema.json` 字段字典，格式如下：

```json
{
  "id": "equipment",
  "nameZh": "装备库",
  "description": "所有装备数据（武器/装甲/电子战/发电机/核心等）",
  "globalVar": "EquipmentDB",
  "dataFile": "equipment-db.json",
  "primaryKey": "id",
  "recordNameZh": "装备",
  "structure": "records",
  "fields": [
    {
      "name": "damage",
      "nameZh": "伤害值",
      "comment": "单次攻击的基础伤害数值",
      "type": "number",
      "required": false,
      "default": 0,
      "options": [],
      "refDatabase": null,
      "scope": "仅武器类装备"
    }
  ]
}
```

- `type` 枚举：`string` / `number` / `boolean` / `enum`（选项在 `options`）/ `ref`（引用其他库主键，`refDatabase` 指定库 id）/ `array` / `object`
- `structure` 枚举：`records`（默认，`{主键: 记录}`）/ `grouped-array`（`{分组键: [记录]}`，仅 `loot-tables` 使用，分组键=敌人 id，条目字段为 `item/chance/min/max`）
- `scope` 标注条件字段（如"仅武器类装备有此字段"）
- 主键不统一现状（`id`/`facilityId`/`nodeId`）在 schema 的 `primaryKey` 字段中如实标注，**不做破坏性改名**

#### Scenario: 字段全覆盖
- **WHEN** 检查任一 schema.json
- **THEN** 其 `fields` 覆盖对应数据文件中出现的全部字段，每字段均有非空 `nameZh` 与 `comment`

### Requirement: 数值编辑器服务
系统 SHALL 提供单文件 Node.js 编辑器 `/workspace/.trae/skills/data-editor/data-editor.js`，参考 file-manager 架构：原生 `http` 模块、无外部依赖、内嵌前端 HTML/CSS/JS、路径安全检查（数据目录限定为 `mud-game-engine/assets/js/data/`）。默认端口 3100（环境变量 `DE_PORT` 可覆盖）。

#### Scenario: 库自动发现
- **WHEN** 启动编辑器并访问首页
- **THEN** 扫描 data 目录全部 `*.schema.json`，左侧展示 14 个库（中文名 + 记录数），新增库接入后重启编辑器即可被发现

#### Scenario: 编辑器与游戏服务共存
- **WHEN** file-manager（3000）、serve.py、编辑器（3100）同时运行
- **THEN** 互不冲突

### Requirement: 数据记录编辑
编辑器 SHALL 提供表格化数据编辑：行=记录、列头=字段中文名（悬浮提示英文名+注释+作用域），支持新增记录（按 schema `default` 预填）、删除记录、编辑字段值。字段值控件按类型渲染：`number`→数字输入、`boolean`→开关、`enum`→下拉、`ref`→下拉（列出目标库记录）、`string`→文本输入、`array`/`object`→JSON 编辑弹窗（带格式校验）。

#### Scenario: 修改数值并生效
- **WHEN** 用户在编辑器中修改某武器 `damage` 值并保存，然后刷新游戏页面
- **THEN** JSON 数据文件已更新，游戏读取到新数值

#### Scenario: 新增/删除记录
- **WHEN** 用户新增一条技能记录（自动预填默认值）或删除一条敌人记录并保存
- **THEN** 数据文件正确写回，主键唯一性保持

### Requirement: 元数据编辑
编辑器 SHALL 提供元数据管理界面：以表格展示字段定义（英文名/中文名/注释/类型/必填/默认值/选项/引用库/作用域），支持新增字段定义、修改字段属性、删除字段定义，保存写回 schema.json。

#### Scenario: 新增字段定义
- **WHEN** 用户为装备库新增字段"耐久度"（英文名 `durability`，类型 number，默认 100）并保存
- **THEN** `equipment-db.schema.json` 更新，数据表格出现"耐久度"列，已有记录该列显示为空（不强制回填）

#### Scenario: 元数据驱动渲染
- **WHEN** schema 中字段的 `nameZh`/`comment`/`options` 被修改并保存
- **THEN** 重新打开数据表格时列头与控件随之更新

### Requirement: 保存校验
编辑器 SHALL 在保存数据前校验并阻止或警告：主键缺失/重复（阻断）、`required` 字段缺失（阻断）、`number`/`boolean` 类型不匹配（阻断）、`enum` 值越界（阻断）、`ref` 引用的目标记录不存在（警告不阻断）、`array`/`object` 非法 JSON（阻断）。

#### Scenario: 校验拦截
- **WHEN** 用户保存的记录中两条主键相同
- **THEN** 保存被拒绝，错误列表明确指出冲突记录

### Requirement: data-editor Skill
系统 SHALL 在 `/workspace/.trae/skills/data-editor/SKILL.md` 提供编辑器使用指南与新数据库接入规范：创建 JSON 数据文件 → 创建 schema.json（格式规范）→ 如需查询方法则创建 JS 门面并在 data-loader 注册 → HTML 添加 script 标签 → 编辑器自动发现。

#### Scenario: 新库接入
- **WHEN** 后续按 SKILL.md 规范新增一个数据库（数据+schema+门面+注册）
- **THEN** 重启编辑器后新库出现在库列表，可直接进行数值与元数据编辑

## 非目标（Out of Scope）
- 不统一 `facilityId`/`nodeId` 主键命名（避免破坏性改动，仅 schema 如实标注）
- 不消除 `enemies.js` 的 `loot` 字段与 `loot-tables.js` 的数据冗余（保持现状，后续可另行处理）
- 不在编辑器内创建全新数据库（新库接入走 SKILL.md 手动流程）
- 不做编辑器的多用户/鉴权/撤销历史
