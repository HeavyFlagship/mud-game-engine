const BattleUI = {
  container: null,
  timelineEl: null,
  historyEvents: [],
  currentActions: [],
  contextMenuTarget: null,

  init() {
    this.updateRadar();
    setInterval(() => this.updateRadar(), 500);
    this._initContextMenu();
    this._initRadarClick();
  },

  _initRadarClick() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('click', (e) => {
      if (!Battle.active || !Battle.battlefield) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const scale = Math.min(w, h) / 1000;
      let targetX = Math.round((x - cx) / scale + 500);
      let targetY = Math.round((y - cy) / scale + 500);
      const [bw, bh] = Battle.battlefield.size;
      targetX = Math.max(0, Math.min(bw, targetX));
      targetY = Math.max(0, Math.min(bh, targetY));
      this.fillInput(`move ${targetX} ${targetY}`);
    });
  },

  _initContextMenu() {
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('unit-context-menu');
      if (!menu) return;
      if (!menu.contains(e.target) && !e.target.closest('.unit-card') && !e.target.closest('.enemy-card')) {
        this.hideContextMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideContextMenu();
    });
  },

  showUnitMenu(target, x, y) {
    const menu = document.getElementById('unit-context-menu');
    if (!menu) return;
    this.contextMenuTarget = target;

    let actions = [];
    if (target.type === 'npc') {
      const dist = target.dist;
      actions = [
        { label: '-move 移动到', cmd: `move ${target.id}`, disabled: false },
        { label: '-call 通信', cmd: `call ${target.id}`, disabled: dist > 100 },
        { label: 'look 查看', cmd: `look ${target.id}`, disabled: false }
      ];
    } else if (target.type === 'enemy') {
      const dist = target.dist;
      const primaryWeapon = Player.getEquippedWeapons()[0];
      const inRange = primaryWeapon && dist <= primaryWeapon.range;
      actions = [
        { label: 'lock 锁定', cmd: `lock ${target.id}`, disabled: target.dead },
        { label: 'fire 开火', cmd: `fire ${target.id}`, disabled: !inRange || target.dead },
        { label: 'look 查看', cmd: `look ${target.id}`, disabled: target.dead },
        { label: 'move 靠近', cmd: `move ${target.id}`, disabled: target.dead }
      ];
    }

    let html = `<div class="unit-context-menu-header">${target.name}</div>`;
    for (const act of actions) {
      const cls = act.disabled ? 'unit-context-menu-item disabled' : 'unit-context-menu-item';
      html += `<div class="${cls}" data-cmd="${act.cmd}">${act.label}</div>`;
    }
    menu.innerHTML = html;

    menu.classList.add('active');
    const menuRect = menu.getBoundingClientRect();
    let posX = x, posY = y;
    if (posX + menuRect.width > window.innerWidth) posX = window.innerWidth - menuRect.width - 4;
    if (posY + menuRect.height > window.innerHeight) posY = window.innerHeight - menuRect.height - 4;
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';

    const items = menu.querySelectorAll('.unit-context-menu-item:not(.disabled)');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const cmd = item.getAttribute('data-cmd');
        this.fillInput(cmd);
        this.hideContextMenu();
      });
    });
  },

  hideContextMenu() {
    const menu = document.getElementById('unit-context-menu');
    if (menu) menu.classList.remove('active');
    this.contextMenuTarget = null;
  },

  fillInput(cmd) {
    const input = document.getElementById('input');
    if (!input) return;
    input.value = cmd;
    input.focus();
    const len = cmd.length;
    try { input.setSelectionRange(len, len); } catch (e) {}
  },

  quickDirMove(dir) {
    if (!Battle.active || !Battle.battlefield) return;
    CommandSystem.execute(`move ${dir}`);
  },

  // 锁定敌人后绘制武器散布扇形（示意）：
  // 扇形自玩家指向锁定目标、随最大射程延伸；最佳射程内为绿色，超出最佳射程渐变到红色
  drawSpreadSector(ctx, cx, cy, scale) {
    if (!Battle.active || !Battle.battlefield) return;
    const enemy = Battle.getLockedEnemy();
    if (!enemy) return;
    const weapon = Player.getEquippedWeapons()[0];
    if (!weapon || !weapon.range) return;

    const px = cx + (Player.position[0] - 500) * scale;
    const py = cy + (Player.position[1] - 500) * scale;
    const ex = cx + (enemy.position[0] - 500) * scale;
    const ey = cy + (enemy.position[1] - 500) * scale;

    const angle = Math.atan2(ey - py, ex - px);
    const range = weapon.range;
    // 散布半角（弧度）：spread 为每米散布系数，半角 ≈ spread；
    // 零散布/高精度武器给出最小示意宽度保证可见
    const halfAngle = Math.max(weapon.spread || 0, 0.02);

    const endX = px + Math.cos(angle) * range * scale;
    const endY = py + Math.sin(angle) * range * scale;

    // 扇形路径：玩家位置 → 沿 ±halfAngle 两条边延伸到最大射程末端
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, range * scale, angle - halfAngle, angle + halfAngle);
    ctx.closePath();

    // 绿色(最佳射程内) → 红色(射程末端) 渐变
    const tOpt = weapon.optimalRange > 0 ? Math.min(1, weapon.optimalRange / range) : 0;
    const grad = ctx.createLinearGradient(px, py, endX, endY);
    grad.addColorStop(0, 'rgba(0, 255, 136, 0.18)');
    grad.addColorStop(tOpt, 'rgba(0, 255, 136, 0.18)');
    grad.addColorStop(1, 'rgba(255, 60, 40, 0.18)');

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 标注最佳射程/最大射程边界刻度（虚线弧）
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 0.8;
    if (weapon.optimalRange > 0) {
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.55)';
      ctx.beginPath();
      ctx.arc(px, py, weapon.optimalRange * scale, angle - halfAngle, angle + halfAngle);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 60, 40, 0.65)';
    ctx.beginPath();
    ctx.arc(px, py, range * scale, angle - halfAngle, angle + halfAngle);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  },

  updateRadar() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const scale = Math.min(w, h) / 1000;

    ctx.clearRect(0, 0, w, h);

    // 方格背景 (10x10)
    ctx.fillStyle = '#051005';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 0.5;
    const gridCount = 10;
    const gridSize = w / gridCount;
    // 网格固定在世界坐标，不随玩家位置滚动
    const gridOffsetX = cx - 500 * scale;
    const gridOffsetY = cy - 500 * scale;
    for (let i = -2; i <= gridCount + 2; i++) {
      const x = gridOffsetX + i * gridSize;
      const y = gridOffsetY + i * gridSize;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 边框
    ctx.strokeStyle = '#2d5';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // 危害区域
    if (Battle.active && Battle.battlefield && Battle.battlefield.hazards) {
      for (const hazard of Battle.battlefield.hazards) {
        const hx = cx + (hazard.pos[0] - 500) * scale;
        const hy = cy + (hazard.pos[1] - 500) * scale;
        const hr = (hazard.radius || 100) * scale;
        let color, alpha;
        if (hazard.type === 'acid_pool') { color = '255, 68, 68'; alpha = 0.12; }
        else if (hazard.type === 'emi' || hazard.type === 'em_interference') { color = '68, 136, 255'; alpha = 0.10; }
        else if (hazard.type === 'toxic_fog') { color = '68, 255, 68'; alpha = 0.10; }
        else { color = '136, 136, 136'; alpha = 0.08; }
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${color}, 0.6)`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        // 标签
        const label = hazard.label || '';
        if (label) {
          ctx.fillStyle = `rgb(${color})`;
          ctx.font = `${Math.round(9 * (canvas.width / 200))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(label, hx, hy - hr - 2);
        }
      }
    }

    // 玩家位置
    let playerX = 500, playerY = 500;
    if (Battle.active && Battle.battlefield) {
      playerX = Player.position[0];
      playerY = Player.position[1];
    }
    const px = cx + (playerX - 500) * scale;
    const py = cy + (playerY - 500) * scale;

    // 玩家视野圈
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
    ctx.fillStyle = 'rgba(0, 255, 136, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, Player.visionRadius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 锁定目标后绘制武器散布扇形（位于敌人标记下层）
    this.drawSpreadSector(ctx, cx, cy, scale);

    // 显示场景中的NPC
    if (Battle.active && Battle.battlefield) {
      const npcs = Battle.battlefield.npcs || [];
      for (const npcUnit of npcs) {
        const npcDef = NPCDB[npcUnit.npcId];
        if (!npcDef) continue;
        const dist = Battle.getDistance(Player.position, npcUnit.position);
        const broadcast = npcDef.broadcastPosition === true;
        if (!broadcast && dist > Player.visionRadius) continue;

        const nx = cx + (npcUnit.position[0] - 500) * scale;
        const ny = cy + (npcUnit.position[1] - 500) * scale;
        ctx.fillStyle = '#8cf';
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.round(9 * (canvas.width / 200))}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(npcUnit.instanceId, nx, ny - 7);
      }

      // 敌人
      for (const enemy of Battle.battlefield.enemies) {
        if (enemy.hp <= 0) continue;
        const dist = Battle.getDistance(Player.position, enemy.position);
        if (dist > Player.visionRadius * 1.5) continue;
        const ex = cx + (enemy.position[0] - 500) * scale;
        const ey = cy + (enemy.position[1] - 500) * scale;

        if (dist <= enemy.attackRange) {
          ctx.fillStyle = '#f44';
        } else if (enemy.state === 'pursue' || enemy.state === 'alert') {
          ctx.fillStyle = '#fa2';
        } else {
          ctx.fillStyle = '#fd0';
        }

        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${Math.round(9 * (canvas.width / 200))}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(enemy.instanceId, ex, ey - 7);
      }
    } else {
      // 非战斗状态下显示房间NPC（按广播/视野过滤）
      const room = MapSystem.getRoom(Player.room);
      if (room && room.npcs && room.npcs.length > 0) {
        for (let i = 0; i < room.npcs.length; i++) {
          const npcId = room.npcs[i];
          const npc = NPCDB[npcId];
          if (!npc) continue;
          const nx = cx + (150 + i * 200 - 500) * scale;
          const ny = cy + (400 - 500) * scale;
          ctx.fillStyle = '#8cf';
          ctx.beginPath();
          ctx.arc(nx, ny, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `${Math.round(9 * (canvas.width / 200))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('NPC', nx, ny - 7);
        }
      }
    }

    // 玩家标记（画在最上层）
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.stroke();

    const legendEl = document.getElementById('radar-legend');
    if (legendEl) {
      if (Battle.active) {
        const alive = Battle.battlefield ? Battle.battlefield.enemies.filter(e => e.hp > 0).length : 0;
        const npcCount = Battle.battlefield ? (Battle.battlefield.npcs || []).length : 0;
        legendEl.innerHTML = `<span style="color:#0ff;">●</span> 玩家 &nbsp; <span style="color:#8cf;">●</span> NPC &nbsp; <span style="color:#f44;">●</span> 威胁 &nbsp; <span style="color:#fd0;">●</span> 未警觉`;
      } else {
        const room = MapSystem.getRoom(Player.room);
        const npcCount = room && room.npcs ? room.npcs.length : 0;
        legendEl.innerHTML = `<span style="color:#0ff;">●</span> 玩家 &nbsp; <span style="color:#8cf;">●</span> NPC &nbsp; NPC: ${npcCount}`;
      }
    }
  },

  updateUnitList() {
    const unitEl = document.getElementById('unit-list');
    if (!unitEl) return;
    if (!Battle.active || !Battle.battlefield) {
      unitEl.innerHTML = '<div style="color:var(--muted);font-style:italic;font-size:var(--font-hint);">未在场景中</div>';
      return;
    }
    const npcs = Battle.battlefield.npcs || [];
    if (npcs.length === 0) {
      unitEl.innerHTML = '<div style="color:var(--muted);font-style:italic;font-size:var(--font-hint);">无可交互单位</div>';
      return;
    }
    let html = '';
    for (const npcUnit of npcs) {
      const npcDef = NPCDB[npcUnit.npcId];
      if (!npcDef) continue;
      const dist = Battle.getDistance(Player.position, npcUnit.position);
      const broadcast = npcDef.broadcastPosition === true;
      const visible = broadcast || dist <= Player.visionRadius;
      if (!visible) continue;
      const inCallRange = dist <= 100;
      const shopIcon = npcDef.shopItems ? '🛒' : '';
      const broadcastTag = broadcast ? '📡' : '';
      const nameText = `${npcUnit.instanceId} ${npcDef.name} ${broadcastTag}${shopIcon}`;
      const id = npcUnit.instanceId;
      const callDisabled = inCallRange ? '' : ' disabled';
      html += `<div class="unit-card">
        <div class="unit-card-header">
          <span class="name" style="color:#8cf;" title="${nameText}">${nameText}</span>
          <span class="dist" style="color:var(--muted);font-size:var(--font-enemy-header);">${dist.toFixed(0)}m ${inCallRange ? '📞' : '📏'}</span>
        </div>
        <div class="unit-card-sub" style="color:var(--muted-bright);">${npcDef.title || ''}</div>
        <div class="unit-quick-actions">
          <button class="quick-action-btn" onclick="BattleUI.execCmd('move ${id}')" title="移动到附近">移动</button>
          <button class="quick-action-btn call${callDisabled}" onclick="BattleUI.execCmd('call ${id}')"${callDisabled ? ' disabled' : ''} title="通信">通信</button>
          <button class="quick-action-btn" onclick="BattleUI.execCmd('look ${id}')" title="查看">查看</button>
        </div>
      </div>`;
    }
    unitEl.innerHTML = html || '<div style="color:var(--muted);font-style:italic;font-size:var(--font-hint);">视野内无单位</div>';
  },

  execCmd(cmd) {
    CommandSystem.execute(cmd);
  },

  getStatusEffectsHTML(statusEffects) {
    if (!statusEffects || statusEffects.length === 0) return '';
    const iconMap = {
      burn: { icon: '🔥', name: '灼烧', color: '#f80' },
      ion_disrupt: { icon: '🔌', name: 'EMP', color: '#8af' },
      slow: { icon: '🐌', name: '减速', color: '#88f' },
      corrosion: { icon: '🧪', name: '腐蚀', color: '#0f0' },
      poison: { icon: '☠', name: '中毒', color: '#8f0' },
      shock: { icon: '⚡', name: '电击', color: '#ff0' },
      stun: { icon: '💫', name: '眩晕', color: '#f0f' }
    };
    let html = '<span class="status-effects-tags">';
    for (const eff of statusEffects) {
      const info = iconMap[eff.type] || { icon: '❓', name: eff.type, color: '#aaa' };
      const stacks = eff.stacks ? `x${eff.stacks}` : '';
      const dur = (eff.duration || 0).toFixed(0);
      html += `<span class="status-tag" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}44;" title="${info.name}${stacks}: 剩余${dur}秒">${info.icon}${info.name}${stacks} ${dur}s</span>`;
    }
    html += '</span>';
    return html;
  },

  render() {
    this.historyEvents = [];
    this.currentActions = [];
    const tlPanel = document.getElementById('timeline-panel');
    if (tlPanel) tlPanel.classList.add('active');
    this.update();
  },

  formatGameTime(seconds, format = 'mm:ss') {
    const totalSec = Math.floor(Number(seconds) || 0);
    const h = Math.floor(totalSec / 3600) % 24;
    const m = Math.floor(totalSec / 60) % 60;
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    if (format === 'mm:ss') return `${pad(m)}:${pad(s)}`;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  },

  activeFilters: { attack: true, move: true, system: true, loot: true },

  addHistory(text, color = '#aaa', actionType = null, category = 'system') {
    const time = Timeline.time || 0;
    const formattedTime = this.formatGameTime(time, 'mm:ss');
    const displayText = actionType ? `${text}行动：${actionType}` : `${text}`;
    this.historyEvents.unshift({ time: formattedTime, text: displayText, color, category });
    if (this.historyEvents.length > 30) {
      this.historyEvents.pop();
    }
  },

  toggleFilter(category) {
    this.activeFilters[category] = !this.activeFilters[category];
    this.updateTimeline();
  },

  clearCurrentActions() {
    // 只清空当前行动，不加入历史记录（addHistory 已在动作开始时记录）
    this.currentActions = [];
  },

  removeCurrentAction(text) {
    // 只从当前行动中移除，不加入历史记录（addHistory 已在动作开始时记录）
    const index = this.currentActions.findIndex(a => a.text === text);
    if (index !== -1) {
      this.currentActions.splice(index, 1);
    }
  },

  addCurrentAction(text, color = '#fff') {
    const time = (Timeline.time || 0).toFixed(0);
    this.currentActions.push({ time, text, color });
    // 不再因为溢出就塞进历史记录
    if (this.currentActions.length > 5) {
      this.currentActions.shift();
    }
    this.updateTimeline();
  },

  update() {
    this.updateRadar();
    if (typeof Game !== 'undefined') {
      if (Game.updatePlayerInfo) Game.updatePlayerInfo();
      if (Game.updateEquipInfo) Game.updateEquipInfo();
    }
    this.updatePlayerStatusEffects();
    if (!Battle.active || !Battle.battlefield) {
      this.clearBattlePanels();
      return;
    }
    this.updateBattleTime();
    this.updateUnitList();
    this.updateEnemyList();
    this.updateTimeline();
    if (typeof TimelineGraphic !== 'undefined') TimelineGraphic.render();
  },

  // 每帧高频动态刷新（由 Timeline.onTickEnd 调用）：
  // 仅更新随连续时间流逝而变化的内容，避免 60fps 重建静态 DOM
  updateDynamic() {
    if (typeof Game !== 'undefined' && Game.updateEquipInfoDynamic) {
      Game.updateEquipInfoDynamic();
    }
    this.updateBattleTime();
    if (typeof TimelineGraphic !== 'undefined') TimelineGraphic.render();
  },

  updateBattleTime() {
    const el = document.getElementById('battle-time');
    if (!el) return;
    el.textContent = this.formatGameTime(Timeline.time || 0, 'hh:mm:ss');
  },

  updatePlayerStatusEffects() {
    const el = document.getElementById('player-status-effects');
    if (!el) return;
    const effects = Player.statusEffects || [];
    const section = document.getElementById('player-status-section');
    if (effects.length === 0) {
      if (section) section.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    if (section) section.style.display = '';

    const iconMap = {
      burn: { icon: '🔥', name: '灼烧', color: '#f80', desc: '持续受到热能伤害，热能易伤' },
      ion_disrupt: { icon: '🔌', name: 'EMP干扰', color: '#8af', desc: '能量系统受干扰' },
      slow: { icon: '🐌', name: '减速', color: '#88f', desc: '移动速度降低' },
      corrosion: { icon: '🧪', name: '腐蚀', color: '#0f0', desc: '装甲持续受损' },
      poison: { icon: '☠', name: '中毒', color: '#8f0', desc: '持续受到结构伤害' },
      shock: { icon: '⚡', name: '电击', color: '#ff0', desc: '收到震荡伤害' },
      stun: { icon: '💫', name: '眩晕', color: '#f0f', desc: '无法行动' }
    };
    let html = '<div class="status-effects-tags">';
    for (const eff of effects) {
      const info = iconMap[eff.type] || { icon: '❓', name: eff.type, color: '#aaa', desc: '' };
      const stacks = eff.stacks ? `x${eff.stacks}` : '';
      const dur = (eff.duration || 0).toFixed(0);
      html += `<div class="status-tag" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}44;margin:2px 0;" title="${info.desc}">${info.icon} ${info.name}${stacks} · ${dur}秒</div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  },

  clearBattlePanels() {
    const enemyEl = document.getElementById('enemy-list');
    if (enemyEl) {
      enemyEl.innerHTML = '<div style="color:var(--muted);font-style:italic;">未在场景中</div>';
    }
    const unitEl = document.getElementById('unit-list');
    if (unitEl) {
      unitEl.innerHTML = '<div style="color:var(--muted);font-style:italic;">未在场景中</div>';
    }
    const timelineEl = document.getElementById('timeline-content');
    if (timelineEl) {
      timelineEl.innerHTML = '<div style="color:var(--muted);font-style:italic;">未在场景中</div>';
    }
    if (typeof TimelineGraphic !== 'undefined') TimelineGraphic.clear();
  },

  updateEnemyList() {
    const enemyEl = document.getElementById('enemy-list');
    if (!enemyEl || !Battle.battlefield) return;
    let html = '<div class="enemy-list-inner">';
    html += `<div style="color:var(--muted);font-size:var(--font-enemy-header);margin-bottom:6px;">存活 ${Battle.battlefield.enemies.filter(e => e.hp > 0).length}/${Battle.battlefield.enemies.length}</div>`;
    for (const enemy of Battle.battlefield.enemies) {
      const dist = Battle.getDistance(Player.position, enemy.position);
      const hpPct = (enemy.hp / enemy.maxHp * 100).toFixed(0);
      const arPct = enemy.maxArmor > 0 ? (enemy.armor / enemy.maxArmor * 100).toFixed(0) : 0;
      const dead = enemy.hp <= 0;
      const primaryWeapon = Player.getEquippedWeapons()[0];
      const inRange = primaryWeapon && dist <= primaryWeapon.range;
      const nameText = `${enemy.instanceId} ${enemy.name}`;
      const distText = `${dist.toFixed(0)}m ${inRange ? '🎯' : '📏'}`;
      const id = enemy.instanceId;
      const disabledStyle = dead ? 'background:#222;opacity:0.5;' : '';
      const locked = Battle.lockedTarget === enemy.instanceId;
      html += `<div class="enemy-card${locked ? ' locked' : ''}" style="${disabledStyle}">
        <div class="unit-card-header">
          <span class="name" style="color:${dead ? '#666' : '#f66'};" title="${nameText}">${nameText}</span>
          <span class="dist" style="color:var(--muted);font-size:var(--font-enemy-header);">${distText}</span>
        </div>
        <div class="enemy-bars">
          <div class="enemy-bar">
            <span class="enemy-bar-label">结构</span>
            <div class="enemy-bar-track"><div class="enemy-bar-fill hp" style="width:${hpPct}%"></div><span class="enemy-bar-text">${enemy.hp}/${enemy.maxHp}</span></div>
          </div>
          <div class="enemy-bar">
            <span class="enemy-bar-label">装甲</span>
            <div class="enemy-bar-track"><div class="enemy-bar-fill ar" style="width:${arPct}%"></div><span class="enemy-bar-text">${enemy.armor}/${enemy.maxArmor}</span></div>
          </div>
        </div>
        ${this.getStatusEffectsHTML(enemy.statusEffects)}
        <div class="unit-quick-actions">
          <button class="quick-action-btn lock${locked ? ' active' : ''}" onclick="BattleUI.execCmd('lock ${id}')" title="锁定/取消锁定目标">锁定</button>
          <button class="quick-action-btn" onclick="BattleUI.execCmd('look ${id}')" title="查看">查看</button>
        </div>
      </div>`;
    }
    html += '</div>';
    enemyEl.innerHTML = html;
  },

  updateTimeline() {
    const content = document.getElementById('timeline-content');
    if (!content) return;

    let html = '';
    html += '<div class="timeline-section timeline-history">';
    html += '<div class="timeline-divider">— 历史记录 —';
    const catNames = { attack: '攻击', move: '移动', system: '系统', loot: '战利品' };
    for (const [cat, catLabel] of Object.entries(catNames)) {
      const active = this.activeFilters[cat];
      html += ` <button class="filter-btn ${active ? 'active' : ''}" onclick="BattleUI.toggleFilter('${cat}')" title="${active ? '隐藏' : '显示'}${catLabel}">${catLabel}</button>`;
    }
    html += '</div>';
    const filteredHistory = this.historyEvents.filter(h => this.activeFilters[h.category]);
    for (const h of filteredHistory.slice(0, 8)) {
      const dotColor = { attack: '#f84', move: '#4f4', system: '#8af', loot: '#f8f' }[h.category] || h.color;
      html += `<div class="timeline-item history" style="color:${h.color};opacity:0.7;"><span class="log-dot" style="background:${dotColor};"></span>${h.time} ${h.text}</div>`;
    }
    if (filteredHistory.length === 0 && this.historyEvents.length === 0) {
      html += '<div class="timeline-item history" style="color:#555;opacity:0.5;">（无）</div>';
    } else if (filteredHistory.length === 0) {
      html += '<div class="timeline-item history" style="color:#555;opacity:0.5;">（已过滤）</div>';
    }
    html += '</div>';

    content.innerHTML = html;
  },

  remove() {
    this.historyEvents = [];
    this.currentActions = [];
    const tlPanel = document.getElementById('timeline-panel');
    if (tlPanel) tlPanel.classList.remove('active');
    if (typeof TimelineGraphic !== 'undefined') TimelineGraphic.clear();
    this.clearBattlePanels();
    this.updateRadar();
  }
};