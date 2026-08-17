# 修复：场景地图绘制工业区/交易区等地图实体 + 掩体

## 摘要

用户澄清：工业区/交易区不是改区域地图图标，而是要在**场景地图（radar-canvas）**中把工业区、交易区等作为**地图实体（功能图块）**绘制出来，使一个场景内能同时包含多个功能区。同时保留原需求#2：**掩体**在场景地图上补画（数据与文本描述已有，仅缺可视化）。

## 当前状态分析

- 场景地图由 `BattleUI.updateRadar()` 绘制（battle-ui.js#L181-L365）：方格背景 → 边框 → 危害区域(圆) → 玩家视野圈 → 散布扇形 → NPC/敌人(圆点) → 玩家标记。**未绘制任何区域/实体图块**。
- 掩体数据 `battlefield.covers`（含 pos/size/height/durability/label）在 `cmdBattleLook` 文本中已显示"掩体：N处"（command-system.js#L963-L964），但雷达上不可见。
- 战场状态由 `MapSystem.initBattlefield()`（map-system.js#L97）从房间 `battlefield` 配置克隆生成，当前只克隆 `covers/hazards/lootPoints` 等，**没有 entities 字段**。
- 房间数据（map.js）中 `outpost_hub` 已有 `industryZone`（逻辑容量，无位置），交易中心是纯命令（trade），二者均无场景内实体。

## 修改方案

### 修改 1：数据 — 为基地添加地图实体（map.js）

在 `outpost_hub.battlefield` 中新增 `entities` 数组，定义工业区与交易中心两个功能图块（位于 1000x1000 世界坐标）：

```javascript
entities: [
  { id:'industry_zone', type:'industry', name:'工业区', pos:[180,260], size:[300,220] },
  { id:'trade_zone',    type:'trade',    name:'交易中心', pos:[760,260], size:[220,190] }
],
```

`type` 可扩展（industry/trade/…），为后续"一个地图包含多个地图实体"提供通用机制。设施的实际安装逻辑仍走现有 `industryZone`/`FacilitySystem`。

### 修改 2：战场状态克隆 entities（map-system.js）

`initBattlefield()` 在 state 中增加克隆，使 `Battle.battlefield.entities` 可用：

```javascript
entities: JSON.parse(JSON.stringify(bf.entities || [])),
```

### 修改 3：场景雷达绘制地图实体图块（battle-ui.js `updateRadar`）

在 `updateRadar` 中，绘制完边框（L216）之后、危害区域之前，插入实体图块绘制。按类型配色（半透明填充 + 虚线边框 + 名称标签），与危害区域风格统一：

```javascript
// 地图实体图块（工业区/交易区等）
const entityStyle = {
  industry: { fill: 'rgba(255, 180, 60, 0.12)',  stroke: 'rgba(255, 180, 60, 0.6)' },
  trade:    { fill: 'rgba(0, 200, 255, 0.12)',   stroke: 'rgba(0, 200, 255, 0.6)' },
  default:  { fill: 'rgba(136, 136, 136, 0.12)', stroke: 'rgba(136, 136, 136, 0.5)' }
};
if (Battle.active && Battle.battlefield && Battle.battlefield.entities) {
  for (const ent of Battle.battlefield.entities) {
    const style = entityStyle[ent.type] || entityStyle.default;
    const ex = cx + (ent.pos[0] - 500) * scale;
    const ey = cy + (ent.pos[1] - 500) * scale;
    const ew = (ent.size[0] || 200) * scale;
    const eh = (ent.size[1] || 150) * scale;
    ctx.fillStyle = style.fill;
    ctx.fillRect(ex - ew / 2, ey - eh / 2, ew, eh);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(ex - ew / 2, ey - eh / 2, ew, eh);
    ctx.setLineDash([]);
    // 名称 + 设施数量（工业区显示已安装设施数）
    let label = ent.name || ent.type;
    if (ent.type === 'industry') {
      const room = Battle.battlefield.roomId ? MapSystem.getRoom(Battle.battlefield.roomId) : null;
      const n = room && room.industryZone ? (room.industryZone.facilities || []).length : 0;
      label += n > 0 ? ` (${n}设施)` : ' (空)';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${Math.round(11 * (canvas.width / 200))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ex, ey);
  }
}
```

> 说明：设施暂无单独坐标，先在工业区图块标签中显示设施数量作为"实际表现"；如需逐个绘制设施方块，可在标签下方按简单网格绘制，本方案先做数量标注，避免引入设施位置数据。

### 修改 4：场景雷达绘制掩体图块（battle-ui.js `updateRadar`）

在危害区域（L250）之后、玩家视野圈之前，插入掩体绘制：

```javascript
// 掩体
if (Battle.active && Battle.battlefield && Battle.battlefield.covers) {
  for (const cover of Battle.battlefield.covers) {
    const mx = cx + (cover.pos[0] - 500) * scale;
    const my = cy + (cover.pos[1] - 500) * scale;
    const mw = (cover.size[0] || 80) * scale;
    const mh = (cover.size[1] || 60) * scale;
    ctx.fillStyle = 'rgba(136, 204, 255, 0.14)';
    ctx.fillRect(mx - mw / 2, my - mh / 2, mw, mh);
    ctx.strokeStyle = 'rgba(136, 204, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(mx - mw / 2, my - mh / 2, mw, mh);
    ctx.setLineDash([]);
    const label = cover.label || '掩体';
    ctx.fillStyle = 'rgba(136, 204, 255, 0.8)';
    ctx.font = `${Math.round(8 * (canvas.width / 200))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(label, mx, my - mh / 2 - 3);
  }
}
```

## 涉及文件

| 文件 | 修改点 | 内容 |
|------|--------|------|
| `/workspace/mud-game-engine/assets/js/data/map.js` | `outpost_hub.battlefield` | 新增 `entities`（工业区、交易中心） |
| `/workspace/mud-game-engine/assets/js/systems/map-system.js` | `initBattlefield` | 克隆 `entities` 进战场状态 |
| `/workspace/mud-game-engine/assets/js/systems/battle-ui.js` | `updateRadar` | 绘制地图实体图块 + 掩体图块 |

## 验证方式

- 无需浏览器测试，由用户手动验证（进入前哨基地看工业区/交易中心图块，进入荒原看掩体图块）
- 语法检查：`node --check` 确认无语法错误

## 决策与假设

- 地图实体以 `battlefield.entities` 数组承载（与 covers/hazards 同级），`type` 驱动配色，通用可扩展
- 实体图块仅当前绘制于 `outpost_hub`；其他房间可后续按需添加，无需改动渲染代码
- 工业区设施先以数量标注体现（不改设施数据结构、不新增位置字段）
- 不改区域地图图标、CSS、HTML
