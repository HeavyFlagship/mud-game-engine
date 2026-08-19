# 战斗操作阶段 UI 化重构计划

## 摘要

将战斗操作从"命令行消息提示"迁移到"装备 UI + 操作序列 + 执行指令"模型：
1. 操作阶段通过装备栏高亮 + 文字状态体现（武器：就绪/冷却中/待命；机体：待命/移动中/异常）
2. 装备 UI 重新布局（弹药与冷却横向一行，状态集成在冷却进度上，操作按钮集成到装备卡片）
3. 新增"执行"指令（`execute`）与执行按钮，批量提交玩家操作并推进时间轴
4. 新增锁定目标 UI，敌人列表配合调整
5. 命令输入框上方新增可关闭的提示栏（提示不进入命令行记录）

## 用户已确认的设计决策

- **UI 与指令严格对应**：装备 UI 上的每个操作按钮对应一条指令；新增"执行"指令（`execute`）用于提交所有待操作，规范化操作流程。
- **仅"待命"跳到下一事件**：UI 只提供"待命"按钮（等价 `continue` 无参，跳到下一个事件点）；精确秒数延迟继续通过 `continue <秒数>` / `wait <秒数>` 指令实现，UI 不做"待命x秒"按钮。

## 当前状态分析（基于探索）

- **操作阶段判定**：`Timeline.paused === true && Battle.currentActor === 'player'`（battle.js 中 `triggerPlayerDecision` 设置 `paused=true` 后等待输入）。
- **移动开火提示冗余**：`cmdBattleMove`（command-system.js L565-L581）在有就绪武器时设置 `Battle.playerFireHint` 并通过 `Msg.prompt` 输出"武器已就绪..."，全部进入命令行记录，造成冗余。
- **装备 UI 现状**：`Game.updateEquipInfo()`（game.js L1337-L1415）渲染 `#equip-info`，武器仅显示弹药条 + 冷却条 + 状态文本（`weapon-ammo` / `weapon-cooldown`），无操作按钮、无操作阶段高亮；机体仅显示名称。
- **敌人列表现状**：`BattleUI.updateEnemyList()`（battle-ui.js L502-L540）渲染 `#enemy-list`，每卡片有"开火/靠近/查看"按钮，无锁定目标机制。
- **时间轴推进**：`Timeline.scheduleEvent(event, delay)` 以 `this.time + delay` 计算事件时间；`scheduleNext()` 负责推进。武器开火通过调度 `player_fire` 事件实现（battle.js L101-L108），与移动并行（移动开火）。
- **消息系统**：`Msg`（messages.js）所有输出（含 `Msg.prompt`）都进入 `#output` 命令行记录，无独立提示栏。
- **指令注册**：`CommandRegistry`（command-registry.js）三层（global/battle/base），battle 层已有 fire/retreat/timeline/wait/idle/enter/continue/movepredict。

## 目标设计

### 核心概念：操作阶段 (Action Phase) 与操作序列 (Action Queue)

进入操作阶段时（`player_turn` / `triggerPlayerDecision` / 战斗中首次移动），`Battle` 初始化一个操作序列，包含：
- **机体项**（chassis）：始终存在，可操作为"移动（靠近目标/指定坐标）"或"待命"。
- **武器项**（每个就绪武器 slot）：`weaponCooldowns[slot] <= 0` 时可操作"开火（锁定目标）"或"待命"；冷却中武器仅显示状态，不可操作。
- **被动装备**（装甲板等）：无操作项，仅显示名称。

玩家在操作阶段选择各装备的操作（UI 按钮或对应指令），点"执行"（`execute` 指令或执行按钮）时统一提交：
- 机体移动意图 → 启动移动（`startPlayerMove`）
- 武器开火意图 → 调度 `player_fire` 事件（与移动并行 = 移动开火）
- 待命意图 → 跳过（不调度）
- 若全部待命/无操作 → 等价 `continue`（跳到下一事件）

执行后 `Timeline.paused = false` + `scheduleNext()` 推进时间轴，时间轴图形立即反映（`TimelineGraphic.render()` 已由 `BattleUI.update` 触发）。

### 操作阶段与非操作阶段的行为区分

- **操作阶段**（`Timeline.paused && Battle.currentActor === 'player'`）：`move` / `fire` / `lock` 指令记录到操作序列（不立即执行），由 `execute` 统一提交。
- **非操作阶段**：`move` / `fire` 保持现有直接执行行为（不影响场景移动、非战斗移动等）。

### 指令设计（与 UI 按钮严格对应）

| 指令 | 作用 | UI 对应 |
|------|------|---------|
| `execute`（别名 go/执行/endturn） | 提交操作序列并推进时间轴；有未指定操作项时在提示栏提醒 | "执行"按钮 |
| `lock <目标>`（别名 target） | 锁定/切换锁定目标 | 点击敌人卡片锁定 |
| `fire [目标]` | 操作阶段记录开火意图（默认锁定目标）；非操作阶段直接开火 | 武器"开火"按钮 |
| `hold <slot|机体>` | 将指定项标记为"待命" | 武器/机体"待命"按钮 |
| `move <...>` | 操作阶段记录机体移动意图；非操作阶段直接移动 | 机体"靠近目标"按钮 |
| `continue` / `wait` | 保留原语义（跳到下一事件 / 等待） | — |

## 具体改动

### A. HTML（mud-game-engine.html）

1. **装备面板**（`panel-equip`）：在 `#equip-info` 之后、面板内新增执行栏：
   ```html
   <div class="action-execute-bar" id="action-execute-bar" style="display:none;">
     <button class="execute-btn" id="execute-btn" onclick="Battle.executeActions()">▶ 执行</button>
   </div>
   ```
   执行栏仅在操作阶段显示。
2. **输入区**（`input-area`）：在 `.input-row` 上方新增提示栏：
   ```html
   <div class="hint-bar" id="hint-bar" style="display:none;">
     <span class="hint-text" id="hint-text"></span>
     <button class="hint-close" id="hint-close" onclick="Msg.hintClose()" title="关闭提示">✕</button>
   </div>
   ```

### B. CSS（assets/styles.css）

- `.equip-card` 卡片化（边框/内边距），操作阶段高亮（`.equip-card.actionable` 亮边框）。
- 机体状态徽标（`.chassis-status`）：待命(青)/移动中(绿)/异常(红)。
- 武器弹药+冷却横向一行：`.weapon-metrics` 使用 flex 一行容纳弹药条与冷却条，状态文本覆盖/紧贴冷却条（`.weapon-status-tag`）。
- 装备操作按钮组：`.equip-actions`（按钮 `.equip-action-btn`，选中态 `.active`）。
- 执行栏 `.action-execute-bar` 与执行按钮 `.execute-btn`。
- 提示栏 `.hint-bar`（文本 + 关闭按钮）。
- 敌人卡片锁定态 `.enemy-card.locked`（高亮边框 + 🔒）。

### C. battle.js

新增状态与逻辑：
1. 新增字段 `playerActionState`、`lockedTarget`（初始化 null）。
2. `isPlayerActionPhase()`：返回 `this.active && Timeline.paused && this.currentActor === 'player'`。
3. `beginActionPhase()`：初始化 `playerActionState`（机体项 + 就绪武器项），调用 `BattleUI.update()` 渲染装备卡片与执行栏。
   - 在 `triggerPlayerDecision`、`onPlayerTurn`（无 task 分支）、`player_idle_end` 时调用。
4. `setChassisAction(action, target)` / `setWeaponAction(slot, action, target)`：记录操作意图，更新 UI。
5. `executeActions()`：提交操作序列（见"核心概念"），结束后清空操作序列、`Timeline.paused=false`、`scheduleNext()`。供 `execute` 指令与执行按钮调用。
6. `setLockedTarget(id)`：切换 `lockedTarget`，更新敌人列表 UI。
7. **`cmdBattleMove` 触发方式改造**：战斗中首次移动（原 `shouldPromptFire` 分支）不再 `Msg.prompt`，改为调用 `beginActionPhase()` 并把移动记录为机体意图（保留 `playerFireHint` 字段兼容旧逻辑，但不再输出冗余提示）。
8. `move_complete` 后 `onPlayerMoveComplete` → `triggerPlayerDecision`（已会进入操作阶段，保持）。

### D. command-system.js

1. `handleBattleCmd` 增加 `case 'execute': this.cmdBattleExecute(parsed.args)` 和 `case 'lock': this.cmdBattleLock(parsed.args)`、`case 'hold': this.cmdBattleHold(parsed.args)`。
2. `cmdBattleExecute(args)`：
   - 非操作阶段：提示"当前没有待执行的操作"。
   - 操作阶段：遍历操作序列，检查未指定操作项 → `Msg.hint('未指定操作：武器#1（请选择开火或待命）')` 并返回；全部指定 → `Battle.executeActions()`。
   - 支持 `execute force`（跳过未指定检查，全部按待命处理）——可选，标注为扩展点。
3. `cmdBattleLock(args)`：无参列出目标；有参设置 `Battle.setLockedTarget(id)`。
4. `cmdBattleHold(args)`：`hold 机体` 或 `hold <slot>` 将该项标记为待命。
5. `cmdBattleFire` 改造：操作阶段且无目标参数 → 使用 `Battle.lockedTarget`；操作阶段 → 记录武器开火意图（不立即执行）；非操作阶段 → 保持现有直接执行逻辑。
6. `cmdBattleMove` 改造：操作阶段 → 记录机体移动意图（target/靠近锁定目标）；非操作阶段 → 保持现有直接移动逻辑。
7. `cmdBattleContinue` 保留（含移动开火分支），但提示文本改为通过 `Msg.hint` 输出，减少命令行冗余（可选，标注）。

### E. command-registry.js

battle 层新增：
```js
execute: { cmd: 'execute', handler: 'cmdBattleExecute', desc: '执行待操作并推进时间轴' },
lock: { cmd: 'lock', handler: 'cmdBattleLock', desc: '锁定目标', args: '<目标编号>' },
hold: { cmd: 'hold', handler: 'cmdBattleHold', desc: '待命', args: '<机体|接口编号>' },
```
并在 `CommandSystem.aliases`（command-system.js）加 `go:'execute'`、`执行:'execute'`、`endturn:'execute'`、`target:'lock'`、`锁定:'lock'`。

### F. game.js — `updateEquipInfo()`（L1337-L1415 重构）

1. **机体卡片**：名称 + 状态徽标（`Battle` 提供 `getChassisState()`：待命/移动中/异常[有 statusEffects 负面时]/就绪）；操作阶段显示"靠近目标"（需锁定目标）与"待命"按钮。
2. **武器卡片**：弹药与冷却改为横向一行（`weapon-metrics` flex）；状态文本（就绪/冷却x.xs/待命）集成在冷却条上（覆盖条或紧贴标签）；操作阶段显示"开火"（需锁定目标、射程内）与"待命"按钮；冷却中武器仅显示状态、按钮禁用。
3. **被动装备**（非 weapon 且无操作）：仅显示名称，无状态/按钮。
4. 按钮 onclick 调用 `Battle.setChassisAction` / `Battle.setWeaponAction`，并同步在命令区显示对应指令文本（`Msg.cmd('> fire A1')` 可选，标注）。

### G. battle-ui.js

1. `updateEnemyList()`：敌人卡片点击头部 → `Battle.setLockedTarget(id)`；锁定态高亮 + 🔒；卡片"开火/靠近"按钮在锁定该目标时用 `fire`/`move`（无参默认锁定）。
2. 新增 `showHint(text)` / `hideHint()`（或复用 `Msg.hint`）：控制 `#hint-bar` 显示与文本。
3. `update()` 中操作阶段时显示 `#action-execute-bar`，非操作阶段隐藏。

### H. messages.js

新增：
```js
hint(t) {
  const bar = document.getElementById('hint-bar');
  const text = document.getElementById('hint-text');
  if (bar && text) { text.innerHTML = t; bar.style.display = ''; }
},
hintClose() {
  const bar = document.getElementById('hint-bar');
  if (bar) bar.style.display = 'none';
},
```
（提示不调用 `this.add`，因此不进入 `#output` 命令行记录。）

## 假设与决策

- **严格对应**：UI 按钮点击即记录操作意图并（可选）在命令区显示对应指令文本；`execute` 统一提交。
- **移动开火兼容**：`playerFireHint` 字段保留作内部状态，但不再通过 `Msg.prompt` 输出冗余提示；`continue` 的移动开火分支保持可用。
- **锁定目标**：单目标锁定（`Battle.lockedTarget`），点击已锁定目标可取消锁定；`fire`/`move` 无参时默认使用锁定目标。
- **待命语义**：武器"待命"= 跳过该武器本轮开火（保持就绪进入下一事件）；机体"待命"= 本轮不移动；全部待命时 `execute` 等价 `continue` 无参（跳到下一事件）。
- **非战斗/非操作阶段**：所有改动不改变现有直接执行行为，避免影响场景移动、基地交互。
- **不做**：UI 不做"待命x秒"按钮（用户已确认）；不改动 `enemy-ai.js`；不重构 Timeline 内核。

## 验证步骤

1. `python3 serve.py 8080` 启动（禁缓存），浏览器打开 `http://localhost:8080/mud-game-engine.html`。
2. **进入战场**：`move s` ×2 进入 `wasteland_north`。
3. **操作阶段 UI**：输入 `move 100 500` → 装备面板出现执行栏，武器卡片出现"开火/待命"按钮，机体卡片出现"靠近目标/待命"；不再输出冗余"武器已就绪"消息。
4. **锁定目标**：点击敌人卡片锁定（🔒 高亮），输入 `lock` 查看锁定目标。
5. **开火意图**：点武器"开火" → 记录意图；点机体"待命"；点"执行"（或输入 `execute`）→ 时间轴推进，player_fire 圆点出现在时间轴上。
6. **未指定提醒**：只选机体操作不选武器 → 点执行 → 提示栏显示"未指定操作：武器#1"，且不进入命令行记录；点提示栏 ✕ 关闭。
7. **待命**：全部待命 → 执行 → 跳到下一事件（等价 continue）。
8. **指令直通**：操作阶段直接输入 `fire A1`（有锁定目标时 `fire`）→ 记录开火意图；`execute` 提交。非操作阶段 `move` 仍直接移动。
9. **回归**：基地 `call`、`move s` 场景切换、`continue 10` 精确延迟等原功能不受影响。
10. 检查浏览器控制台无 JS 错误。

## 实施顺序建议

1. HTML + CSS（提示栏、执行栏、装备卡片样式）
2. messages.js（Msg.hint）
3. battle.js（操作序列状态机 + 执行 + 锁定）
4. command-system.js + command-registry.js（execute/lock/hold 指令与改造）
5. game.js updateEquipInfo 重构（装备卡片）
6. battle-ui.js（敌人锁定 + 提示栏 + 执行栏显示）
7. 浏览器全流程验证
