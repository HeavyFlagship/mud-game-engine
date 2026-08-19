---
name: "data-editor"
description: "启动基于 Web 的游戏数值编辑器，管理 mud-game-engine 数值数据库的数据记录与元数据（Schema 字段字典），支持保存前自动校验。当用户想要通过浏览器编辑游戏数值时调用。使用 node data-editor.js 启动服务。"
---

# 游戏数值数据编辑器

## 功能

在浏览器中提供图形化界面，直接编辑 `mud-game-engine` 的 14 个数值数据库（装备/物品/材料/弹药/技能/任务/载具/敌人/NPC/设施/科技树/制造配方/掉落表/地图）。

- 数据记录增删查改（左栏选库，数据 Tab 表格编辑）
- 元数据（Schema 字段字典）增删查改：字段中文名/注释/类型/必填/默认值/枚举/引用/作用域
- 保存前自动校验：主键唯一、必填、类型、枚举越界
- Ctrl+S 快捷保存当前 Tab

## 使用方式

### 启动服务

```bash
cd /workspace && node .trae/skills/data-editor/data-editor.js
```

服务默认监听 `http://localhost:3100`。

### 自定义端口

```bash
DE_PORT=3200 node .trae/skills/data-editor/data-editor.js
```

编辑器须与游戏服务 `serve.py`（8080 端口）同时运行，二者互不冲突；保存后刷新游戏页面即可看到编辑后的数值（serve.py 已禁用缓存）。

## 体系结构

- 数据：`mud-game-engine/assets/js/data/xxx.json`（纯数据，2 空格缩进）
- 元数据：同目录 `xxx.schema.json`（字段字典，编辑器据此渲染中文表头与类型控件）
- JS 门面：`xxx.js`（查询方法，由 `data-loader.js` 在游戏启动时 fetch JSON 装配全局变量）

## 新数据库接入规范

新库接入按以下五步操作：

**第 1 步：创建数据文件** `assets/js/data/xxx.json`，结构为 `{主键值: {记录}}`，2 空格缩进纯数据。

**第 2 步：创建同目录** `xxx.schema.json` 字段字典，完整格式模板：

```json
{
  "id": "xxx",
  "nameZh": "XX库",
  "description": "库用途说明",
  "globalVar": "XxxDB",
  "dataFile": "xxx.json",
  "primaryKey": "id",
  "recordNameZh": "XX",
  "structure": "records",
  "fields": [
    {
      "name": "id",
      "nameZh": "标识",
      "comment": "字段说明",
      "type": "string",
      "required": true,
      "default": "",
      "options": [],
      "refDatabase": null,
      "scope": null
    }
  ]
}
```

type 七种取值：`string` / `number` / `boolean` / `enum`（需 options）/ `ref`（需 refDatabase）/ `array` / `object`；`structure` 取 `records` 或 `grouped-array`。

**第 3 步：如需查询方法或含生成逻辑，创建** `xxx.js` 门面。模式：`var` 全局变量 + 不可枚举的 `_data`/`_load`/查询方法，参照现有 `skills.js` 或 `equipment-db.js`；纯数据可无查询方法，但门面文件仍需 `_load` 供装配。

**第 4 步：在** `assets/js/data/data-loader.js` 的 `registry` 数组注册，并在 `mud-game-engine.html` 数据脚本区添加引用：

```js
{ json: 'xxx.json', db: 'XxxDB' },
```

```html
<script src="assets/js/data/xxx.js"></script>
```

**第 5 步：重启数值编辑器**（自动扫描 schema 发现新库），新库出现在左侧列表即可编辑。

## Schema 维护注意事项

- enum 的 `options` 必须覆盖数据中实际取值（保存校验会拦截）
- ref 的 `refDatabase` 指目标库 schema id（如 `equipment`/`items`/`enemies`...）
- `scope` 用于标注条件字段（如"仅武器类装备"）
- 改字段类型需同步检查存量数据兼容性
- 主键命名保持各库现状（facility 用 `facilityId`、tech-tree 用 `nodeId`）

## 注意事项

- 每次启动 TRAE Work 新会话后需要重新运行启动命令
- 编辑器直接写云端工作区文件；保存前自动校验，ref 引用缺失仅警告不阻断
- 数据文件被编辑器保存后会规范化为 2 空格缩进
