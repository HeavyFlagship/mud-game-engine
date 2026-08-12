// ========== 图形化时间轴 ==========
// 在场景地图下方绘制一条横向动态时间线：
//   - 现在标记固定于距左 1/5 处
//   - 事件圆点（敌人/玩家/武器就绪/开火）按时间排序向右排列
//   - 持续动作线按 actor 分泳道展示
// 跳转逻辑仍由 Timeline 驱动，此处仅负责图形化呈现与平滑动画。
const TimelineGraphic = {
  // 时间窗口：现在左侧 3 分钟（过去），右侧 12 分钟（未来），共 15 分钟
  PAST_MIN: 3,
  FUTURE_MIN: 12,
  // 1 游戏分钟对应的像素宽度（约 1cm），用于刻度密度
  PIX_PER_MIN: 40,

  // 事件圆点颜色
  COLOR: {
    player: '#00ff88',
    enemy: '#ffd93d',
    weapon: '#6bc5ff',
    fire: '#ff8844',
    past: '#556070'
  },

  // 容器与静态层
  _container: null,
  _dotsLayer: null,
  _linesLayer: null,

  _nowPct() {
    return (this.PAST_MIN / (this.PAST_MIN + this.FUTURE_MIN)) * 100;
  },

  // 构建静态基准层（时间线 + 刻度 + 现在标记），仅需一次
  _ensureBase() {
    const container = document.getElementById('tl-graphic');
    if (!container) return;
    this._container = container;
    if (container.dataset.built) return;

    const total = this.PAST_MIN + this.FUTURE_MIN;
    let html = '<div class="tlg-base"></div>';

    // 刻度：每 1 分钟一个刻度线（等分），代表窗口内相对分钟
    html += '<div class="tlg-ticks">';
    for (let i = 0; i <= total; i++) {
      const pct = (i / total) * 100;
      const label = i % 5 === 0 ? `<span class="tlg-tick-label">${i - this.PAST_MIN}</span>` : '';
      html += `<div class="tlg-tick" style="left:${pct}%"><span class="tlg-tick-line"></span>${label}</div>`;
    }
    html += '</div>';

    // 现在标记
    html += `<div class="tlg-now" style="left:${this._nowPct()}%"><span class="tlg-now-marker">▼</span><span class="tlg-now-label">现在</span></div>`;

    // 动态层
    html += '<div class="tlg-dots"></div>';
    html += '<div class="tlg-lines"></div>';

    container.innerHTML = html;
    this._dotsLayer = container.querySelector('.tlg-dots');
    this._linesLayer = container.querySelector('.tlg-lines');
    container.dataset.built = '1';
  },

  // 事件到屏幕位置（百分比）
  _leftPct(t) {
    const now = Timeline.time || 0;
    const total = this.PAST_MIN + this.FUTURE_MIN;
    const windowStart = now - this.PAST_MIN;
    return ((t - windowStart) / total) * 100;
  },

  // 敌人实例编号 → A1/A2/A3
  _enemyLabel(actor) {
    if (!Battle.battlefield) return 'A?';
    const idx = Battle.battlefield.enemies.findIndex(e => e.instanceId === actor);
    return idx >= 0 ? `A${idx + 1}` : actor;
  },

  // 事件标签与颜色
  _eventInfo(evt) {
    if (evt.type === 'enemy_turn') {
      return { label: this._enemyLabel(evt.actor), color: this.COLOR.enemy };
    }
    if (evt.type === 'player_turn') {
      return { label: '你', color: this.COLOR.player };
    }
    if (evt.type === 'weapon_ready') {
      const weapon = Player.equipment[evt.slot]?.equip;
      return { label: '装填', color: this.COLOR.weapon };
    }
    if (evt.type === 'player_fire') {
      return { label: '开火', color: this.COLOR.fire };
    }
    return null;
  },

  // 渲染事件圆点（增量更新，利用 CSS transition 平滑左移）
  _renderDots() {
    if (!this._dotsLayer) return;
    const now = Timeline.time || 0;
    const relevant = (Timeline.eventQueue || []).filter(
      evt => evt.type === 'player_turn' || evt.type === 'enemy_turn' ||
             evt.type === 'weapon_ready' || evt.type === 'player_fire'
    );

    const desired = new Map();
    for (const evt of relevant) {
      const info = this._eventInfo(evt);
      if (!info) continue;
      const left = this._leftPct(evt.time);
      // 超出窗口：丢弃（未来超过 100% 或过去早于 0%）
      if (left < 0 || left > 100) continue;
      const key = `${evt.type}|${evt.actor || ''}|${evt.time}`;
      const isPast = evt.time < now;
      desired.set(key, {
        left,
        label: info.label,
        color: isPast ? this.COLOR.past : info.color,
        isPast
      });
    }

    // 移除不再需要的节点
    for (const child of Array.from(this._dotsLayer.children)) {
      if (!desired.has(child.dataset.key)) child.remove();
    }

    // 更新/创建节点
    for (const [key, d] of desired) {
      let el = this._dotsLayer.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'tlg-dot';
        el.dataset.key = key;
        el.innerHTML = `<span class="tlg-dot-label"></span><span class="tlg-dot-dot"></span>`;
        this._dotsLayer.appendChild(el);
        // 新节点淡入
        el.classList.add('entering');
        requestAnimationFrame(() => el.classList.remove('entering'));
      }
      el.style.left = `${d.left}%`;
      el.querySelector('.tlg-dot-label').textContent = d.label;
      el.querySelector('.tlg-dot-label').style.color = d.color;
      el.querySelector('.tlg-dot-dot').style.background = d.color;
    }
  },

  // 渲染持续动作线（按 actor 分泳道，互不覆盖）
  _renderLines() {
    if (!this._linesLayer) return;
    const actions = Timeline.continuousActions || [];
    const now = Timeline.time || 0;

    // 为不同 actor 分配泳道（纵向偏移）
    const actors = [...new Set(actions.map(a => a.actor))];
    const laneOf = new Map(actors.map((a, i) => [a, i]));

    const desired = new Map();
    for (const act of actions) {
      const left = this._leftPct(act.startTime);
      const right = this._leftPct(act.endTime);
      const width = right - left;
      if (right < 0 || left > 100) continue;
      const key = `${act.actor}|${act.type}|${act.startTime}`;
      const isPlayer = act.actor === 'player';
      desired.set(key, {
        left: Math.max(0, left),
        width: Math.min(100 - Math.max(0, left), width),
        color: isPlayer ? this.COLOR.player : this.COLOR.enemy,
        lane: laneOf.get(act.actor) || 0
      });
    }

    for (const child of Array.from(this._linesLayer.children)) {
      if (!desired.has(child.dataset.key)) child.remove();
    }

    for (const [key, d] of desired) {
      let el = this._linesLayer.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'tlg-line';
        el.dataset.key = key;
        this._linesLayer.appendChild(el);
      }
      el.style.left = `${d.left}%`;
      el.style.width = `${d.width}%`;
      el.style.top = `${d.lane * 14 + 4}px`;
      el.style.background = d.color;
      el.style.boxShadow = `0 0 4px ${d.color}66`;
    }
  },

  // 更新现在标记的当前行动文本
  _updateNow() {
    if (!this._container) return;
    const nowEl = this._container.querySelector('.tlg-now');
    if (!nowEl) return;
    const label = nowEl.querySelector('.tlg-now-label');

    // 当前行动文本：取 BattleUI.currentActions 最近一条
    const acts = BattleUI.currentActions || [];
    const text = acts.length > 0 ? acts[acts.length - 1].text : '现在';
    label.textContent = text;
    label.style.color = acts.length > 0 ? (acts[acts.length - 1].color || '#0ff') : 'var(--muted)';

    // 高亮：进入玩家行动时
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
    this._renderDots();
    this._renderLines();
    this._updateNow();
    this._updateSkip();
  },

  // 清空（战斗结束）
  clear() {
    const btn = document.getElementById('tl-skip-btn');
    if (btn) btn.style.display = 'none';
    if (this._container) {
      this._container.innerHTML = '';
      this._container.dataset.built = '';
    }
    this._dotsLayer = null;
    this._linesLayer = null;
  }
};