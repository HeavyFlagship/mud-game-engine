# Checklist

## 数据迁移（JSON 替代 JS）
- [x] 14 个含独立数据的库完成 JSON 迁移（数据与逻辑分离），JSON 文件为纯数据、2 空格缩进、无函数（vm 沙箱抽取 + 记录数三方比对一致）
- [x] JS 门面保留原全局变量名与查询方法签名，下游系统代码无需改动（vm 沙箱 49 项断言 + 浏览器游戏回归通过）
- [x] weapons/armors 派生视图改为装配后刷新模式，键集合与迁移前一致（8 武器/6 装甲），refresh 不可枚举
- [x] items 嵌套结构平化，下游兼容访问层按排查结果补齐（排查确认 consumables/questItems 无外部引用，无需兼容层）
- [x] map 数据进 JSON、生成逻辑留 JS 门面（generateRooms 输出 100 房间与迁移前逐字节一致）
- [x] data-loader.js 装配全部 14 个库并刷新派生视图，任一 JSON 加载失败时页面显示明确错误（含失败文件名）
- [x] 通过 serve.py 启动游戏后主要功能（战斗/装备/任务/制造/设施/科技树/地图）回归正常，控制台无报错（浏览器验证 look/status/技能/装备/弹药/槽位均正常）

## Schema 元数据
- [x] 14 个 schema.json 与数据文件同目录，格式符合 spec 规范（id/nameZh/description/globalVar/dataFile/primaryKey/recordNameZh/structure/fields，两组自检 14/14 通过）
- [x] 每个库的全部实际字段均有定义，nameZh 与 comment 非空（脚本遍历核对字段全集无遗漏）
- [x] 类型标注正确（string/number/boolean/enum/ref/array/object），enum 含 options、ref 含 refDatabase
- [x] 条件字段标注 scope；主键不统一（id/facilityId/nodeId）在 primaryKey 如实标注（未做破坏性改名）

## 数值编辑器
- [x] data-editor.js 单文件、Node 原生模块、无外部依赖，默认端口 3100（DE_PORT 可覆盖），路径安全检查限定 data 目录
- [x] 自动扫描 schema 发现全部 14 个库，左侧列表显示中文名与记录数（浏览器验证通过）
- [x] 数据表格：列头显示中文名，悬浮提示英文名/注释/scope；控件按类型渲染（number/boolean 开关/enum 下拉/ref 下拉/string/array-object JSON 弹窗，浏览器验证数字输入与下拉渲染正常）
- [x] 数据记录完整增删查改：新增（默认值预填）、删除、编辑，保存写回 JSON（浏览器改值保存 + API 全量往返 + 14 库原样保存零 diff 验证）
- [x] 元数据（字段定义）完整增删查改，保存写回 schema.json；新增字段后数据表格出现对应新列（API 闭环验证：schema 新增→records 反映→删除恢复；前端表格按 schema 渲染已验证）
- [x] 保存校验：主键缺失/重复、required 缺失、类型不匹配、enum 越界、非法 JSON 阻断保存；ref 引用缺失仅警告（API 实测全部拦截，中文错误定位到记录与字段中文名）
- [x] Ctrl+S 快捷键保存、未保存状态提示、错误列表与 toast 反馈（实现就位，保存按钮与保存成功反馈浏览器实测通过）

## 端到端
- [x] 编辑器修改数值→保存→刷新游戏页面后新数值生效（scout maxHp 200→700：编辑器保存→vehicles.json 写入→游戏 status 显示 700/700，验证后已恢复 200）
- [x] 编辑器新增/删除记录→JSON 正确写回且游戏正常加载（records/save 全量保存机制实测，skills 数值往返恢复无痕迹）
- [x] 编辑器（3100）与 file-manager（3000）、serve.py 可同时运行互不冲突（验证期间三服务并存）
- [x] file:// 协议直接打开游戏时显示明确错误提示（而非静默失败）（main.js:12-14 协议检测与中文提示就位）

## Skill 文档
- [x] SKILL.md 位于 /workspace/.trae/skills/data-editor/，含编辑器启动方式
- [x] SKILL.md 含新数据库接入五步规范（JSON 数据 → schema → 门面 + loader 注册 → HTML 标签 → 重启编辑器）
- [x] SKILL.md 含 Schema 格式规范、类型枚举说明、加载顺序与 ref/enum 维护注意事项
