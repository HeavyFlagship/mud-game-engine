# 时间轴图形化重构计划

> 创建时间：2026-08-12
> 目标：将当前"跳转式 + 纯文本"的时间轴，重构为"跳转逻辑不变 + 图形化动态时间轴"，并拆分历史记录面板
> 关联代码：/workspace/mud-game-engine/

---

## 1. 概述

### 1.1 痛点与目标

当前时间轴（[timeline.js](file:///workspace/mud-game-engine/assets/js/systems/timeline.js) + [battle-ui.js](file:///workspace/mud-game-engine/assets/js/systems/battle-ui.js#L540-L632)）存在三个问题：

1. **跳转式反馈差**：`tick()` 直接跳到下一个事件时间点并瞬间给出结果，缺乏视觉过程。
2. **文本冗余**："即将到来 / 当前行动 / 持续动作 / 历史记录"四段纯文本，信息密度高、占面板大，且历史记录与命令行消息重复。
3. **安全区/战斗区差异**：每次调整相关代码都易引入场景分支问题。

### 1.2 本次改动范围

- **跳转逻辑不变**：`Timeline.tick()` / `advanceTime()` / `scheduleEvent()` / `continuousActions` 等事件引擎核心**不改动**，仅增加 UI 层的图形化呈现与动画。
- **新增图形化动态时间轴**：独立横向条带，含时间刻度、事件圆点、持续动作线、"现在"标记 + 平滑推进动画。
- **原时间轴面板退化为纯历史记录**：只保留历史记录内容与过滤按钮。
- **跳过按钮、游戏时间**：从原时间轴面板移到图形时间轴区域。
- **敌人行动圆点统一颜色**（本轮不区分攻击/行动，后续可细化）。

### 1.3 明确不做（后续轮次）

- 敌人行动红/黄攻击/行动区分（本轮统一颜色）。
- 时间轴的实时匀速推进引擎改造（保持跳转式）。
- 安全区/战斗区操作逻辑的深度重构（仅保证时间轴图形在各场景下一致渲染）。

---

## 2. 当前状态分析

### 2.1 时间轴引擎（不改）

- `Timeline.time`：当前游戏时间（秒），离散跳变（[timeline.js L6](file:///workspace/mud-game-engine/assets/js/systems/timeline.js#L6)）。
- `Timeline.eventQueue`：`[{ type, time, ...payload }]`，`time` 为绝对游戏时间，含 `player_turn / enemy_turn / weapon_ready / player_fire / move_complete / attack_complete` 等（[timeline.js L8](file:///workspace/mud-game-engine/assets/js/systems/timeline.js#L8)）。
- `Timeline.continuousActions`：`[{ actor, type, startTime, endTime, duration, data }]`（[timeline.js L10](file:///workspace/mud-game-engine/assets/js/systems/timeline.js#L10)）。
- `Timeline.paused`：等待玩家决策时暂停（`triggerPlayerDecision` 置 true）。
- `tick()`：排序 → 跳到下一事件时间 → advanceTime → dispatchEvent → `onTickEnd()`（[timeline.js L145-163](file:///workspace/mud-game-engine/assets/js/systems/timeline.js#L145-L163)）。
- `onTickEnd` 在 [battle.js L49](file:///workspace/mud-game-engine/assets/js/systems/battle.js#L49) 绑定为 `() => BattleUI.update()`。

### 2.2 当前 UI 渲染（待改）

- `BattleUI.updateTimeline()`（[battle-ui.js L540-632](file:///workspace/mud-game-engine/assets/js/systems/battle-ui.js#L540-L632)）向 `#timeline-content` 注入四段文本：
  - 「即将到来」：从 `eventQueue` 过滤 `player_turn/enemy_turn/weapon_ready/player_fire`，取前6条，显示相对时间偏移。
  - 「当前行动」：`currentActions[]` + 跳过按钮（`Battle.active && Timeline.paused && currentActor==='player'`）。
  - 「持续动作」：`continuousActions` 的剩余秒数 + 进度条。
  - 「历史记录」：`historyEvents[]` 过滤后的近8条 + 过滤按钮。
- `addHistory` / `addCurrentAction` / `removeCurrentAction` / `clearCurrentActions`：分别维护 `historyEvents` 与 `currentActions`。
- `updateBattleTime()`（[battle-ui.js L447-451](file:///workspace/mud-game-engine/assets/js/systems/battle-ui.js#L447-L451)）：更新 `#battle-time` 文本。
- `render()` / `remove()`：给 `#timeline-panel` 加/删 `active` 类控制显示。
- `clearBattlePanels()`：战斗结束时清空 `#timeline-content` 等。

### 2.3 当前网格布局（[styles.css L90-98](file:///workspace/mud-game-engine/assets/styles.css#L90-L98)）

3 行 × 6 列：

| 行\列 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 1 | 区域地图 | 单位列表 | 场景地图 | 场景地图 | 命令行 | 查询 |
| 2 | 角色 | 单位/敌人 | 场景地图 | 场景地图 | 命令行 | 查询 |
| 3 | 角色 | —— | 装备 | 时间轴 | 命令行 | 查询 |

---

## 3. 目标布局（扩为 4 行）

图形时间轴为**独立横向条带**，位于场景地图下方、装备/历史上方。网格扩为 4 行：

| 行\列 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 1 | 区域地图 | 单位列表 | 场景地图 | 场景地图 | 命令行 | 查询 |
| 2 | 角色(续) | 单位/敌人 | 场景地图 | 场景地图 | 命令行 | 查询 |
| 3 | 角色(续) | 单位/敌人(续) | **图形时间轴** | **图形时间轴** | 命令行 | 查询 |
| 4 | 角色(续) | 单位/敌人(续) | 装备 | 历史记录 | 命令行 | 查询 |

- 图形时间轴：`grid-column: 3 / span 2; grid-row: 3`（横跨3、4列，位于场景地图下方、装备/历史上方）。
- 装备：移到 `col3, row4`。
- 原时间轴→历史记录：`col4, row4`。
- 角色：`col1, row2 / span 3`；单位列表：`col2, row1 / span 4`；命令行：`col5, row1 / span 4`；查询：`col6, row1 / span 4`。

---

## 4. 图形时间轴设计

### 4.1 视觉构成

- **时间线**：一条水平基准线，从左到右代表时间。
- **刻度**：`1cm ≈ 1 游戏分钟`，在线上绘制刻度线（`PIX_PER_MIN = 40px`，可配置）。
- **现在标记**：固定位于**距左 1/5** 处（`PAST_MIN=3`、`FUTURE_MIN=12`，窗口 `15` 分钟，now 位于 `3/15=20%`）。用竖线 + `▲`/`▼` 标记，当前行动文本标注其下方。
- **事件圆点**（未来，now 右侧）：
  - 敌人行动 → 上方标注 `A1/A2/A3`（按 battlefield.enemies 实例顺序编号），圆点统一颜色**黄色** `#ffd93d`。
  - 玩家行动 → 上方标注 `你`，圆点**绿色** `#00ff88`。
  - 武器就绪（`weapon_ready`）→ 圆点**青色** `#6bc5ff`。
  - 开火（`player_fire`）→ 圆点**橙色** `#ff8844`。
- **过去事件**（now 左侧 1/5）：已发生事件以**淡灰色**小圆点呈现，提供时间上下文。
- **持续动作线**：从 `startTime` 到 `endTime` 的一条水平覆盖线；按 `actor` 分**独立纵向泳道**（各自偏移一行），即使多个单位同时行动也不互相覆盖。玩家线绿色，敌人线黄色。

### 4.2 位置计算

```
常量：PAST_MIN=3, FUTURE_MIN=12, TOTAL=PAST_MIN+FUTURE_MIN=15, PIX_PER_MIN=40
窗口起点 windowStart = now - PAST_MIN
窗口终点 windowEnd   = now + FUTURE_MIN

事件圆点  left% = (evt.time - windowStart) / TOTAL * 100
持续动作  线 left% = (start - windowStart)/TOTAL*100
        线 width% = (end - start)/TOTAL*100
现在标记  left% = PAST_MIN/TOTAL = 20%
```

超窗事件裁剪（不展示）；敌人实例编号 = `battlefield.enemies.indexOf(actor instanceId)+1`。

### 4.3 动态效果

- **跳转逻辑不变**，但 `onTickEnd` 触发图形刷新时，各圆点/线/现在标记用 **CSS transition**（`left/width 0.3s ease`）从当前位置平滑滑动到新位置，形成"快速推进"的视觉。
- **停一下**：`Timeline.actionDelay`（500ms）本就是两次跳转间停顿；配合 `Timeline.paused`（玩家决策时）圆点停在 now 处，等待输入。
- 进入玩家行动时，now 标记高亮 + 当前行动文本（如"你的行动"）显示，配合原有 `actionPulse` 动画。
- 新增圆点淡入（`fadeIn`），过去圆点淡出。

### 4.4 渲染技术选型

- 采用 **DOM + CSS**（非 canvas）：圆点/线/标记用绝对定位的 `<div>`，文本标签（A1/你/刻度）用 CSS 排版，便于 hover、transition 动画与样式复用。
- 容器 `#tl-graphic`（`position:relative`），内部由 JS 生成子元素。

---

## 5. 文件变更清单

### 5.1 新增文件

| 文件 | 用途 |
|------|------|
| `assets/js/systems/timeline-graphic.js` | 图形时间轴渲染引擎（`TimelineGraphic` 对象） |

### 5.2 修改文件

| 文件 | 变更内容 |
|------|----------|
| `mud-game-engine.html` | 新增 `.panel-timeline-graphic` 面板；`#battle-time` 与跳过按钮移入图形面板；原 `#timeline-panel` 标题改为「历史记录」；在 script 列表中新增 `timeline-graphic.js` |
| `assets/styles.css` | 网格扩为 4 行并重排面板（见§3）；新增图形时间轴相关样式（`.panel-timeline-graphic` / `#tl-graphic` / `.tlg-dot` / `.tlg-line` / `.tlg-now` / `.tlg-tick` / `.tlg-lane` 等） |
| `assets/js/systems/battle-ui.js` | `updateTimeline()` 改为仅渲染历史记录；新增调用 `TimelineGraphic.render()`；跳过按钮逻辑移入图形区；`remove()`/`clearBattlePanels()` 调用 `TimelineGraphic.clear()` |

---

## 6. 实施步骤

### 步骤 1：网格布局调整为 4 行（styles.css）
- 修改 `grid-template-rows: 1fr 1fr 1fr 1fr`。
- 重排各 `.panel-*` 的 `grid-column/grid-row` 见 §3。
- 同步更新 `@media (max-width: 768px)` 移动端覆盖中新增的 `.panel-timeline-graphic` 与重排项。

### 步骤 2：HTML 新增图形时间轴面板（mud-game-engine.html）
在场景地图面板之后、装备面板之前插入：

```html
<section class="panel panel-timeline-graphic" id="timeline-graphic-panel">
  <div class="tl-graphic-header">
    <span class="tl-graphic-title">时间轴</span>
    <span id="battle-time" class="battle-time">00:00:00</span>
    <button class="skip-action-btn" id="tl-skip-btn" onclick="BattleUI.execCmd('continue')" style="display:none">跳过</button>
  </div>
  <div class="tl-graphic" id="tl-graphic"></div>
</section>
```

- 将 `#battle-time` 从原 `#timeline-panel` 移到这里（`updateBattleTime()` 靠 id 定位，无需改逻辑）。
- 原 `#timeline-panel` 结构改为仅保留标题 + `#timeline-content`，标题改为「历史记录」。
- 在 script 列表末尾（battle-ui.js 之后）加入 `<script src="assets/js/systems/timeline-graphic.js"></script>`。

### 步骤 3：新增 timeline-graphic.js（图形渲染引擎）
`TimelineGraphic` 对象，含：

- `render()`：读取 `Timeline.eventQueue` / `Timeline.continuousActions` / `Timeline.time` / `Battle.battlefield`，按 §4 计算位置，**增量更新** DOM（为每个事件/线维护节点，变化时更新 `left/width/color/label`，利用 CSS transition 动画）。
- `updateNow()`：更新现在标记位置与当前行动文本（读 `BattleUI.currentActions`）。
- `toggleSkip(show)`：按 `Battle.active && Timeline.paused && Battle.currentActor==='player'` 控制 `#tl-skip-btn` 显示。
- `clear()`：清空 `#tl-graphic` 与 `#tl-skip-btn`。
- 敌人编号：`Battle.battlefield.enemies.findIndex(e=>e.instanceId===evt.actor)+1 → A{n}`。

### 步骤 4：重构 battle-ui.js 的 updateTimeline()
- 删除「即将到来 / 当前行动 / 持续动作」三段文本渲染，`updateTimeline()` 只渲染历史记录（保留过滤按钮逻辑）。
- 在 `update()` 中调用 `TimelineGraphic.render()`（在 `updateTimeline()` 之前或之后）。
- 跳过按钮：从 `updateTimeline()` 中移除，改由 `TimelineGraphic.updateNow()`/`render()` 控制。
- `remove()` 与 `clearBattlePanels()`：增加 `TimelineGraphic.clear()`。
- `currentActions` 仍维护，但改由图形区现在标记处显示文本（避免死代码）。

### 步骤 5：样式（styles.css）
定义图形时间轴样式：面板布局、`.tl-graphic`（相对定位、高度、基准线）、`.tlg-tick`（刻度）、`.tlg-dot`（圆点+标签）、`.tlg-line`（持续动作线）、`.tlg-now`（现在标记）、`.tlg-lane`（泳道），以及 `transition` 与 `fadeIn`/`actionPulse` 动画。历史记录面板沿用现有 `.timeline-*` 样式。

---

## 7. 假设与决策

| 决策 | 理由 |
|------|------|
| 独立横向条带（扩为4行网格） | 用户确认；图形时间轴位于场景地图与装备/历史之间 |
| 敌人行动圆点统一黄色 | 用户确认本轮暂不区分攻击/行动 |
| 采用 DOM+CSS 而非 canvas | 便于文本标签、hover、transition 动画与现有样式复用 |
| 时间轴引擎核心不改 | 用户要求"跳转逻辑不变，仅加动态效果"；降低回归风险 |
| 窗口 `now-3min ~ now+12min`，now 在 1/5 | 精确匹配"靠近左侧1/5处为现在"；`PIX_PER_MIN=40` 使 1cm≈1min |
| 持续动作按 actor 分泳道 | 满足"多个单位线条不互相覆盖" |
| 历史记录保留过滤按钮、标题改"历史记录" | 原时间轴仅保留历史内容，过滤功能价值高 |
| `#battle-time` 与跳过按钮移入图形面板 | 用户明确要求；靠 id 定位，逻辑复用 |

---

## 8. 验证步骤

1. **网格**：页面加载后，图形时间轴横跨3、4列（行3），位于场景地图下方、装备/历史上方；装备在3行4列、历史在4行4列，命令行/查询/单位/角色面板布局正确。
2. **图形时间轴**：进入战场/基地战斗后，出现时间线；刻度按 1cm≈1min 递增；`现在`标记位于左 1/5。
3. **事件圆点**：`enemy_turn`→`A1/A2/A3`黄色圆点、`player_turn`→`你`绿色、`weapon_ready`→青色、`player_fire`→橙色，依次向右排列。
4. **持续动作线**：移动等持续动作显示为覆盖未来时间轴的线，多个单位分泳道不重叠。
5. **动态效果**：时间推进时圆点/线平滑左移（transition），每次跳转后停顿；玩家行动时暂停并高亮 now 标记。
6. **跳过/游戏时间**：跳过按钮与游戏时间显示在图形时间轴区域；跳过按钮仅在玩家行动暂停时出现。
7. **历史记录**：原时间轴面板仅显示历史记录与过滤按钮，过滤功能正常；不再显示"即将到来/当前行动/持续动作"文本。
8. **清理**：战斗结束（`remove()`）后图形时间轴与历史面板清空/隐藏。
9. **回归**：`continue`/`wait`/`fire`/`move` 等指令在安全区与战场均正常，无新增场景分支问题。
10. **JS 语法**：修改文件用 Node `vm.Script` 校验无语法错误。

---

## 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 网格扩为4行导致其他面板高度变化 | 按 §3 精确重排，分步验证 |
| 图形增量更新DOM复杂、易产生闪烁 | 节点复用 + CSS transition；先用简单重渲染，稳定后再优化增量 |
| 敌人编号/事件定位依赖 battlefield 状态 | render 前判空；无 battlefield 时渲染空线 |
| history 与命令行消息重复（历史痛点2） | 本轮仅移除"即将到来/当前/持续"冗余文本，历史记录保留下一步再评估去重 |