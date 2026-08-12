// ========== 图形化时间轴 ==========
// 世界时间滚动 + 多轨道(泳道)展示：
//   - 时间轴刻度显示世界时间，随游戏时间行进"滚动"（标签前进）
//   - 玩家与每个敌人各占一条水平轨道，行动圆点与持续行动线画在各自轨道上
//   - "现在"标记固定于距左约 1/5 处，事件锚定世界时间向左滑动
// 跳转逻辑仍由 Timeline 驱动，此处仅负责图形化呈现与平滑动画。
const TimelineGraphic = {
  // 时间窗口：过去 10 秒 + 未来 60 秒，共 70 秒
  PAST_SEC: 10,
  FUTURE_SEC: 60,
  // 刻度间隔（秒）
  TICK_SEC: 10,
  // 布局尺寸（px）
  SCALE_H: 18,
  TRACK_H: 10,
  LABEL_W: 30,

  // 事件圆点颜色
  COLOR: {
    player: '#00ff88',
    enemy: '#ffd93d',
    weapon: '#6bc5ff',
    fire: '#ff8844',
    past: '#556070'
  },

  // 容器引用
  _container: null,
  // 已完成的行动点记录：actor -> [{ time, color }]（用于灰度展示在"现在"左侧）
  _past: {},
  // 是否已订阅 dispatchEvent 钩子
  _subscribed: false,

  TOTAL_SEC() { return this.PAST_SEC + this.FUTURE_SEC; },

  // 现在标记位置（过去时间占比）
  _nowPct() {
    return (this.PAST_SEC / this.TOTAL_SEC()) * 100;
  },

  // 当前轨道对应的行为单位：[player, ...存活敌人 instanceId]
  _actors() {
    const list = ['player'];
    const enemies = (typeof Battle !== 'undefined' && Battle.battlefield) ? Battle.battlefield.enemies : [];
    for (const e of enemies) {
      if (e.hp > 0) list.push(e.instanceId);
    }
    return list;
  },

  // 敌人实例编号 → A1/A2/A3
  _enemyLabel(actor) {
    if (!Battle.battlefield) return 'A?';
    const idx = Battle.battlefield.enemies.findIndex(e => e.instanceId === actor);
    return idx >= 0 ? `A${idx + 1}` : actor;
  },

  // 世界时间标签：整分钟点显示 MM:00，亚分钟点只显示秒数
  _timeLabel(worldSec) {
    const totalSec = Math.max(0, Math.floor(worldSec));
    const m = Math.floor(totalSec / 60) % 60;
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return s === 0 ? `${pad(m)}:00` : String(s);
  },

  // 构建静态结构（刻度 + 轨道 + 现在标记），轨道列表变化时重建
  _ensureBase() {
    const container = document.getElementById('tl-graphic');
    if (!container) return;
    this._container = container;

    const actors = this._actors();
    const key = actors.join('|');
    if (container.dataset.built === key) return;
    container.dataset.built = key;

    // 刻度层（顶部）
    let html = '<div class="tlg-scale"></div>';
    // 轨道层（每个单位一条）
    for (let a = 0; a < actors.length; a++) {
      const label = actors[a] === 'player' ? '你' : this._enemyLabel(actors[a]);
      html += `<div class="tlg-track" data-actor="${actors[a]}" style="top:${this.SCALE_H + a * this.TRACK_H}px">`;
      html += `<span class="tlg-track-label">${label}</span>`;
      html += `<span class="tlg-track-line"></span>`;
      html += `<span class="tlg-track-lane"></span>`;
      html += `</div>`;
    }
    // 现在标记（贯穿高度）
    html += `<div class="tlg-now" style="left:${this._nowPct()}%"><span class="tlg-now-marker">▼</span><span class="tlg-now-label">现在</span></div>`;

    container.innerHTML = html;
  },

  // 更新刻度（世界时间锚定，随推进向左滚动）
  _renderTicks() {
    if (!this._container) return;
    const now = Timeline.time || 0;
    const total = this.TOTAL_SEC();
    const windowStart = now - this.PAST_SEC;
    const layers = this._container.querySelector('.tlg-scale');
    if (!layers) return;

    // 站点落在整 TICK 秒上的世界时刻，出现在窗口内
    const desired = new Map();
    const first = Math.ceil(windowStart / this.TICK_SEC) * this.TICK_SEC;
    for (let W = first - this.TICK_SEC; W <= now + this.FUTURE_SEC; W += this.TICK_SEC) {
      const left = (W - windowStart) / total * 100;
      if (left > 100) break;
      desired.set(W, { left, label: this._timeLabel(W) });
    }

    // 移除已滑出窗口的节点
    for (const child of Array.from(layers.children)) {
      if (!desired.has(Number(child.dataset.w))) child.remove();
    }
    // 更新/创建节点（CSS transition 使位置平滑滑动）
    for (const [W, d] of desired) {
      let el = layers.querySelector(`[data-w="${W}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'tlg-tick';
        el.dataset.w = W;
        el.innerHTML = '<span class="tlg-tick-line"></span><span class="tlg-tick-label"></span>';
        layers.appendChild(el);
      }
      el.style.left = `${d.left}%`;
      el.querySelector('.tlg-tick-label').textContent = d.label;
    }
  },

  // 事件归属信息：该事件是否属于此轨道，及其颜色
  _eventInfo(evt, actor) {
    if (evt.actor !== actor) return null;
    if (evt.type === 'player_turn') return { color: this.COLOR.player };
    if (evt.type === 'enemy_turn') return { color: this.COLOR.enemy };
    if (evt.type === 'weapon_ready') return { color: this.COLOR.weapon };
    if (evt.type === 'player_fire') return { color: this.COLOR.fire };
    return null;
  },

  // 事件类型 → 颜色（非展示类型返回 null）
  _eventColor(type) {
    if (type === 'player_turn') return this.COLOR.player;
    if (type === 'enemy_turn') return this.COLOR.enemy;
    if (type === 'weapon_ready') return this.COLOR.weapon;
    if (type === 'player_fire') return this.COLOR.fire;
    return null;
  },

  // 记录已完成的行动点（用于灰度展示在"现在"左侧，保持动画连贯）
  _recordPast(evt) {
    const color = this._eventColor(evt.type);
    if (!color || !evt.actor) return;
    if (!this._past[evt.actor]) this._past[evt.actor] = [];
    this._past[evt.actor].push({ time: evt.time, color });
    if (this._past[evt.actor].length > 30) this._past[evt.actor].shift();
  },

  // 增量更新单条轨道（复用节点保持平滑过渡）
  _renderLane(lane, actor) {
    const now = Timeline.time || 0;
    const total = this.TOTAL_SEC();
    const windowStart = now - this.PAST_SEC;

    const desired = new Map();
    // 持续行动线
    for (const act of (Timeline.continuousActions || [])) {
      if (act.actor !== actor) continue;
      const color = actor === 'player' ? this.COLOR.player : this.COLOR.enemy;
      // 过去部分（现在左侧）画灰色
      if (act.startTime < now) {
        const l = (act.startTime - windowStart) / total * 100;
        const r = (Math.min(act.endTime, now) - windowStart) / total * 100;
        if (r > 0 && l < 100) {
          desired.set(`Lp|${act.actor}|${act.type}|${act.startTime}`, {
            kind: 'line',
            left: Math.max(0, l),
            width: Math.min(100 - Math.max(0, l), r - l),
            color: this.COLOR.past
          });
        }
      }
      // 未来部分（现在右侧）画主题色
      const futStart = Math.max(act.startTime, now);
      if (futStart < act.endTime) {
        const l = (futStart - windowStart) / total * 100;
        const r = (act.endTime - windowStart) / total * 100;
        if (r > 0 && l < 100) {
          desired.set(`Lf|${act.actor}|${act.type}|${act.startTime}`, {
            kind: 'line',
            left: Math.max(0, l),
            width: Math.min(100 - Math.max(0, l), r - l),
            color
          });
        }
      }
      // 持续行动收尾绘制圆点标记
      const endLeft = (act.endTime - windowStart) / total * 100;
      if (endLeft >= 0 && endLeft <= 100) {
        desired.set(`E|${act.actor}|${act.type}|${act.endTime}`, {
          kind: 'dot',
          left: endLeft,
          color
        });
      }
    }
    // 行动圆点
    for (const evt of (Timeline.eventQueue || [])) {
      const info = this._eventInfo(evt, actor);
      if (!info) continue;
      const left = (evt.time - windowStart) / total * 100;
      if (left < 0 || left > 100) continue;
      const isPast = evt.time < now;
      desired.set(`D|${evt.type}|${evt.actor || ''}|${evt.time}`, {
        kind: 'dot',
        left,
        color: isPast ? this.COLOR.past : info.color
      });
    }
    // 已完成的行动点（灰度，位于"现在"左侧，保持动画连贯）
    const pastList = this._past[actor] || [];
    pastList.forEach((p, i) => {
      const left = (p.time - windowStart) / total * 100;
      if (left < 0 || left > 100) return;
      desired.set(`P|${actor}|${i}|${p.time}`, {
        kind: 'dot',
        left,
        color: this.COLOR.past
      });
    });

    // 移除不再需要的节点
    for (const child of Array.from(lane.children)) {
      if (!desired.has(child.dataset.key)) child.remove();
    }
    // 更新/创建节点
    for (const [key, d] of desired) {
      let el = lane.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (!el) {
        el = document.createElement('div');
        el.dataset.key = key;
        el.className = d.kind === 'line' ? 'tlg-line' : 'tlg-dot';
        lane.appendChild(el);
        if (d.kind === 'dot') {
          el.classList.add('entering');
          requestAnimationFrame(() => el.classList.remove('entering'));
        }
      }
      if (d.kind === 'line') {
        el.style.left = `${d.left}%`;
        el.style.width = `${d.width}%`;
        el.style.background = d.color;
      } else {
        el.style.left = `${d.left}%`;
        el.style.background = d.color;
      }
    }
  },

  // 更新所有轨道
  _renderTracks() {
    if (!this._container) return;
    const lanes = this._container.querySelectorAll('.tlg-track-lane');
    lanes.forEach(lane => {
      const actor = lane.parentElement.dataset.actor;
      this._renderLane(lane, actor);
    });
  },

  // 更新现在标记的当前行动文本
  _updateNow() {
    if (!this._container) return;
    const nowEl = this._container.querySelector('.tlg-now');
    if (!nowEl) return;
    const label = nowEl.querySelector('.tlg-now-label');

    const acts = BattleUI.currentActions || [];
    const text = acts.length > 0 ? acts[acts.length - 1].text : '现在';
    label.textContent = text;
    label.style.color = acts.length > 0 ? (acts[acts.length - 1].color || '#0ff') : 'var(--muted)';

    const isPlayerTurn = Battle.active && Timeline.paused && Battle.currentActor === 'player';
    nowEl.classList.toggle('highlight', isPlayerTurn);
  },

  // 控制跳过按钮显示
  _updateSkip() {
    const btn = document.getElementById('tl-skip-btn');
    if (!btn) return;
    const show = Battle.active && Timeline.paused && Battle.currentActor === 'player';
    btn.style.display = show ? 'inline-block' : 'none';
  },

  // 主渲染入口（由 BattleUI.update 调用）
  render() {
    this._ensureBase();
    if (!this._container) return;
    // 订阅一次事件分发钩子，记录已完成的行动点
    if (!this._subscribed) {
      this._subscribed = true;
      if (typeof Timeline !== 'undefined') {
        Timeline.onEventDispatched = (evt) => this._recordPast(evt);
      }
    }
    this._renderTicks();
    this._renderTracks();
    this._updateNow();
    this._updateSkip();
  },

  // 清空（战斗结束）
  clear() {
    const btn = document.getElementById('tl-skip-btn');
    if (btn) btn.style.display = 'none';
    if (this._container) {
      this._container.innerHTML = '';
      delete this._container.dataset.built;
    }
    this._past = {};
    this._subscribed = false;
    if (typeof Timeline !== 'undefined') Timeline.onEventDispatched = null;
  }
};