# 时间轴动态效果优化方案

## 概述

将时间轴从离散跳跃式推进改造为 60fps 连续推进，使时间流逝、冷却进度条、事件动画等呈现平滑动态效果，同时保持时间轴与其他系统（战斗系统、指令系统）的交互逻辑完全不变。

---

## 当前状态分析

### 时间轴推进机制（timeline.js）

- `scheduleNext()` → `tickAdvance()`（瞬间跳到下一事件时间点）→ `setTimeout(80ms)` → `tickDispatch()` → `scheduleNext()` ...
- 时间推进是离散的：一次跳到下一事件点，没有中间过渡
- `actionDelay: 500` 未被使用
- `paused` 控制是否跳过推进

### 图形化渲染（timeline-graphic.js）

- `render()` 由 `BattleUI.update()` 调用，后者挂在 `Timeline.onTickEnd` 回调上
- 刻度、圆点、持续行动线使用 CSS `transition: left 0.3s ease` / `width 0.3s ease` 做平滑位移
- 新增圆点有 `entering` 类触发 `tlgFadeIn` 动画（0.3s 淡入缩放）

### UI 更新频率（battle-ui.js / game.js）

- `BattleUI.update()` 只在离散 tick 结束后触发（`onTickEnd`）
- 雷达更新独立 500ms 间隔
- 冷却进度条、弹药条使用 `transition: width 0.3s linear`，但底层 `cdPct` 计算只在更新时刷新

### 交互方（无变化）

- `Battle.js` 通过 `scheduleNext()`、`paused`、`time` 与时间轴交互
- `CommandSystem.js` 通过同样的接口
- `EnemyAI.js` 通过 `Battle.scheduleNextEnemyTurn()` 等

---

## 改动方案

### 1. timeline.js — 核心循环改造

**核心思路**: 用 `requestAnimationFrame` 驱动连续循环，每帧推进 `delta * TIMESCALE` 秒，实时检查事件触发。

#### 新增常量

```javascript
const TIMESCALE = 3;        // 真实秒 → 游戏秒倍率（可配置）
const MAX_FRAME_DELTA = 0.1; // 防止卡顿时 delta 过大（100ms 封顶）
```

#### 新增/修改方法

| 方法 | 变更 |
|------|------|
| `startLoop()` | **新增**。启动 `requestAnimationFrame` 循环，记录 `_lastFrameTime` |
| `_loop(timestamp)` | **新增**。每帧回调：计算 `rawDelta = (timestamp - _lastFrameTime)/1000`，钳制 `delta = Math.min(rawDelta, MAX_FRAME_DELTA)`，`advanceTime(delta * TIMESCALE)`，`_checkAndDispatch()`，`onTickEnd()`，`requestAnimationFrame` 继续 |
| `_checkAndDispatch()` | **新增**。按时间排序事件队列，循环 `while queue[0].time <= time` 时 `shift().dispatch()` |
| `scheduleNext()` | **修改**。等效于 `startLoop()`——确保循环正在运行即可 |
| `pause()` | **修改**。`paused = true` 后，循环标记跳过 `advanceTime`；同时设置 `_pausedAt = time` 用于 `resume` 时保持 `_lastFrameTime` 连续性 |
| `resume()` | **修改**。恢复 `paused = false`，重置 `_lastFrameTime`（避免恢复时跳一大段），调用 `startLoop()` |
| `stopLoop()` / `stop()` | 不变。仅清理 `requestAnimationFrame` id |
| `tickAdvance()` / `tickDispatch()` | **删除**。不再需要离散推进 |

#### 循环伪代码

```javascript
_loop(timestamp) {
  this._rafId = requestAnimationFrame(ts => this._loop(ts));

  if (this.paused) return;

  const rawDelta = (timestamp - this._lastFrameTime) / 1000;
  this._lastFrameTime = timestamp;
  const delta = Math.min(rawDelta, MAX_FRAME_DELTA);

  this.advanceTime(delta * TIMESCALE);
  this._checkAndDispatch();

  if (this.onTickEnd) this.onTickEnd();
}

_checkAndDispatch() {
  this.eventQueue.sort((a, b) => a.time - b.time);
  while (this.eventQueue.length > 0 && this.eventQueue[0].time <= this.time) {
    const evt = this.eventQueue.shift();
    this.dispatchEvent(evt);
    // 结束的持续动作清理
    this.continuousActions = this.continuousActions.filter(a => a.endTime > this.time);
  }
}
```

#### 关键保证

- `time` 递增逻辑不变（`advanceTime` 内部 `this.time += delta`）
- 事件触发时机从「离散跳到该时间点触发」变为「连续逼近，时间到达时触发」——语义完全等价
- `paused = true` 时时间停止，`resume` 时重置 `_lastFrameTime` 防止跳帧
- `onTickEnd` 每帧调用，驱动 UI 60fps 更新

---

### 2. timeline-graphic.js — 事件闪烁动效

#### 新增闪烁动画

`_renderLane()` 中，检测新创建的圆点（`weapon_ready` / `enemy_turn` 类型），添加 `flicker` 类：

```javascript
// 在创建节点分支中
if (!el) {
  el = document.createElement('div');
  el.dataset.key = key;
  el.className = d.kind === 'line' ? 'tlg-line' : 'tlg-dot';
  lane.appendChild(el);
  if (d.kind === 'dot') {
    // 判断是否是需要闪烁的事件类型
    const isFlicker = evt && (evt.type === 'weapon_ready' || evt.type === 'enemy_turn');
    if (isFlicker) {
      el.classList.add('flicker');
      setTimeout(() => el.classList.remove('flicker'), 600);
    } else {
      el.classList.add('entering');
      requestAnimationFrame(() => el.classList.remove('entering'));
    }
  }
}
```

#### 渲染优化

- CSS 过渡 `transition: left 0.3s ease` 已能平滑处理刻度/圆点/线条的位移
- 连续循环下每帧调用 `render()`，`_ensureBase()` 使用 `container.dataset.built` 缓存，轨道不变时不会重建 DOM
- 坐标计算中 `now = Timeline.time` 连续变化，圆点/刻度/持续行动线持续滑动

---

### 3. battle-ui.js — 高频渲染优化

`update()` 每帧被 `onTickEnd` 调用，需要做性能优化：

- **`updateRadar()`**：跳过（雷达有自己的 500ms 间隔）或加帧率控制
- **`updateEquipInfo()`**：每帧调用，冷却进度条 CSS 过渡 `width 0.3s linear` 已保障平滑；连续推进下 `cdPct` 每帧细微变化，进度条自然平滑流动
- **`TimelineGraphic.render()`**：每帧调用，依赖 DOM 缓存和增量更新

修改 `update()` 方法：

```javascript
update() {
  // 雷达按自己的间隔更新，不在每帧重复
  // this.updateRadar();  // 移除（雷达独立 500ms 间隔）
  if (typeof Game !== 'undefined') {
    if (Game.updatePlayerInfo) Game.updatePlayerInfo();
    if (Game.updateEquipInfo) Game.updateEquipInfo();  // 每帧刷新，CSS transition 平滑
  }
  this.updatePlayerStatusEffects();
  if (!Battle.active || !Battle.battlefield) {
    this.clearBattlePanels();
    return;
  }
  // 以下轻量更新每帧执行
  this.updateBattleTime();         // 文本更新，无开销
  this.updateUnitList();           // 保留（仅 DOM 文本替换）
  this.updateEnemyList();          // 保留
  this.updateTimeline();           // 保留
  if (typeof TimelineGraphic !== 'undefined') TimelineGraphic.render();
}
```

---

### 4. styles.css — 新增闪烁 + 过渡微调

```css
/* 新增闪烁动画 */
@keyframes tlgFlicker {
  0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 currentColor; }
  25%  { opacity: 1; transform: translate(-50%, -50%) scale(1.4); box-shadow: 0 0 8px 2px currentColor; }
  50%  { opacity: 0.8; transform: translate(-50%, -50%) scale(0.9); box-shadow: 0 0 4px 1px currentColor; }
  75%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); box-shadow: 0 0 6px 1px currentColor; }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 currentColor; }
}
.tlg-dot.flicker {
  animation: tlgFlicker 0.5s ease;
}
```

---

### 5. 不变的部分

| 文件 | 原因 |
|------|------|
| `battle.js` | 仅通过 `scheduleNext()`、`paused`、`time`、`onTickEnd` 与时间轴交互，接口不变 |
| `command-system.js` | 同上，仅使用 `scheduleNext()`、`paused`、`time` |
| `enemy-ai.js` | 通过 `Battle.scheduleNextEnemyTurn()` 等间接调用 `scheduleNext()` |
| `game.js` | `updateEquipInfo()` 逻辑不变，只是被调用频率从离散变为连续 |
| `mud-game-engine.html` | 无需修改 DOM 结构 |

---

## 边界情况处理

1. **页面切换/失去焦点**：`requestAnimationFrame` 在后台标签页自动暂停，恢复后 `_lastFrameTime` 可能落后。`MAX_FRAME_DELTA` 钳制确保不会跳超大 delta。
2. **暂停恢复**：`resume()` 中重置 `_lastFrameTime = performance.now()`，避免恢复时瞬间跳一大段。
3. **事件时间重叠**：`_checkAndDispatch()` 使用 `while` 循环，一次多个事件可同时触发（如 `move_complete` 和 `weapon_ready` 同时到达）。
4. **连续推进中调度新事件**：`scheduleEvent()` 往后推 `delay` 秒，在循环中自然会被 `_checkAndDispatch()` 在到达时触发。
5. **持续动作（移动）**：`advanceTime()` 每帧更新 `continuousActions` 位置，`timeline-graphic.js` 中持续行动线每帧重新计算 `left + width`，连续滑动。

---

## 验证步骤

1. 启动游戏，进入战斗场景，观察时间轴刻度是否连续向左滑动
2. 观察冷却进度条是否平滑填充，而非跳跃式变化
3. 到达玩家操作点时，是否暂停推进（时间刻度停止、冷却条停止）
4. 新增 `weapon_ready` 事件到时间轴时，对应圆点是否有闪烁动效
5. 执行 `execute` 后，是否自动恢复推进
6. 长时间挂机测试（模拟后台恢复），确认不会出现时间跳跃异常