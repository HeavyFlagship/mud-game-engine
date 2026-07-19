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
      const inRange = Player.equipment.primary && dist <= Player.equipment.primary.range;
      actions = [
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
    const gridOffsetX = cx - (Player.position[0] - 500) * scale;
    const gridOffsetY = cy - (Player.position[1] - 500) * scale;
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
      const target = {
        type: 'npc', id: npcUnit.instanceId, name: nameText, dist
      };
      html += `<div class="unit-card" onclick='BattleUI.showUnitMenu(${JSON.stringify(target)}, event.clientX, event.clientY)'>
        <span class="name" style="color:#8cf;" title="${nameText}">${nameText}</span>
        <span class="dist" style="color:var(--muted);font-size:var(--font-enemy-header);">${dist.toFixed(0)}m ${inCallRange ? '📞' : '📏'}</span>
        <span class="sub" style="color:var(--muted-bright);">${npcDef.title || ''}</span>
      </div>`;
    }
    unitEl.innerHTML = html || '<div style="color:var(--muted);font-style:italic;font-size:var(--font-hint);">视野内无单位</div>';
  },

  render() {
    this.historyEvents = [];
    this.currentActions = [];
    const tlPanel = document.getElementById('timeline-panel');
    if (tlPanel) tlPanel.classList.add('active');
    this.update();
  },

  addHistory(text, color = '#aaa') {
    const time = Battle.battlefield ? Battle.battlefield.time.toFixed(0) : '?';
    this.historyEvents.unshift({ time, text, color });
    if (this.historyEvents.length > 30) {
      this.historyEvents.pop();
    }
  },

  addCurrentAction(text, color = '#fff') {
    const time = Battle.battlefield ? Battle.battlefield.time.toFixed(0) : '?';
    this.currentActions.push({ time, text, color });
    if (this.currentActions.length > 5) {
      const oldest = this.currentActions.shift();
      this.historyEvents.unshift(oldest);
      if (this.historyEvents.length > 30) {
        this.historyEvents.pop();
      }
    }
    this.updateTimeline();
  },

  update() {
    this.updateRadar();
    if (typeof Game !== 'undefined' && Game.updatePlayerInfo) {
      Game.updatePlayerInfo();
    }
    if (!Battle.active || !Battle.battlefield) {
      this.clearBattlePanels();
      return;
    }
    this.updateUnitList();
    this.updateEnemyList();
    this.updateTimeline();
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
  },

  updateEnemyList() {
    const enemyEl = document.getElementById('enemy-list');
    if (!enemyEl || !Battle.battlefield) return;
    let html = `<div style="color:var(--muted);font-size:var(--font-enemy-header);margin-bottom:6px;">存活 ${Battle.battlefield.enemies.filter(e => e.hp > 0).length}/${Battle.battlefield.enemies.length}</div>`;
    for (const enemy of Battle.battlefield.enemies) {
      const dist = Battle.getDistance(Player.position, enemy.position);
      const hpPct = (enemy.hp / enemy.maxHp * 100).toFixed(0);
      const arPct = enemy.maxArmor > 0 ? (enemy.armor / enemy.maxArmor * 100).toFixed(0) : 0;
      const dead = enemy.hp <= 0;
      const inRange = Player.equipment.primary && dist <= Player.equipment.primary.range;
      const nameText = `${enemy.instanceId} ${enemy.name}`;
      const distText = `${dist.toFixed(0)}m ${inRange ? '🎯' : '📏'}`;
      const target = {
        type: 'enemy', id: enemy.instanceId, name: nameText, dist, dead
      };
      const targetJson = JSON.stringify(target).replace(/'/g, "&#39;");
      html += `<div class="enemy-card" style="background:${dead ? '#222' : '#1a1a1a'};opacity:${dead ? 0.5 : 1};" onclick='BattleUI.showUnitMenu(${targetJson}, event.clientX, event.clientY)'>
        <span class="name" style="color:${dead ? '#666' : '#f66'};" title="${nameText}">${nameText}</span>
        <span class="dist" style="color:var(--muted);font-size:var(--font-enemy-header);">${distText}</span>
        <span class="sub" style="color:var(--muted-bright);">结构: ${enemy.hp}/${enemy.maxHp}
          <div style="display:inline-block;width:90px;height:7px;background:#333;border-radius:2px;vertical-align:middle;margin-left:4px;">
          <div style="width:${hpPct}%;height:7px;background:${hpPct>50?'#4f4':hpPct>25?'#fa2':'#f44'};border-radius:2px;"></div></div>
        </span>
        <span class="sub" style="color:var(--muted-bright);">装甲: ${enemy.armor}/${enemy.maxArmor}
          <div style="display:inline-block;width:90px;height:7px;background:#333;border-radius:2px;vertical-align:middle;margin-left:4px;">
          <div style="width:${arPct}%;height:7px;background:#88f;border-radius:2px;"></div></div>
        </span>
      </div>`;
    }
    enemyEl.innerHTML = html;
  },

  updateTimeline() {
    const content = document.getElementById('timeline-content');
    if (!content || !Battle.eventQueue || !Battle.battlefield) return;

    let html = '';

    const upcoming = [...Battle.eventQueue].sort((a, b) => a.time - b.time).slice(0, 5);
    html += '<div class="timeline-section timeline-upcoming">';
    html += '<div class="timeline-divider">— 即将到来 —</div>';
    for (const evt of upcoming) {
      const timeOffset = (evt.time - Battle.battlefield.time).toFixed(0);
      let label = '';
      let color = '#aaa';
      if (evt.type === 'player_turn') {
        label = '你的行动';
        color = '#0ff';
      } else if (evt.type === 'enemy_turn') {
        const enemy = Battle.battlefield.enemies.find(e => e.instanceId === evt.actor);
        label = enemy ? `${enemy.name}[${evt.actor}]行动` : `敌人[${evt.actor}]行动`;
        color = '#f66';
      } else if (evt.type === 'move_complete') {
        label = evt.actor === 'player' ? '移动完成' : `${evt.actor}移动完成`;
        color = '#8f8';
      } else if (evt.type === 'attack_complete') {
        label = evt.actor === 'player' ? '攻击完成' : `${evt.actor}攻击完成`;
        color = '#fa4';
      } else if (evt.type === 'npc_call') {
        label = '通信完成';
        color = '#8cf';
      }
      html += `<div class="timeline-item upcoming" style="color:${color};">+${timeOffset}秒 ${label}</div>`;
    }
    if (upcoming.length === 0) {
      html += '<div class="timeline-item upcoming" style="color:#555;">（无）</div>';
    }
    html += '</div>';

    html += '<div class="timeline-section timeline-current">';
    html += '<div class="timeline-divider current-divider">▶ 当前行动</div>';
    for (const act of this.currentActions) {
      html += `<div class="timeline-item current" style="color:${act.color};">${act.text}</div>`;
    }
    if (this.currentActions.length === 0) {
      html += '<div class="timeline-item current" style="color:#555;">（等待中）</div>';
    }
    html += '</div>';

    html += '<div class="timeline-section timeline-history">';
    html += '<div class="timeline-divider">— 历史记录 —</div>';
    for (const h of this.historyEvents.slice(0, 8)) {
      html += `<div class="timeline-item history" style="color:${h.color};opacity:0.7;">${h.time}秒 ${h.text}</div>`;
    }
    if (this.historyEvents.length === 0) {
      html += '<div class="timeline-item history" style="color:#555;opacity:0.5;">（无）</div>';
    }
    html += '</div>';

    content.innerHTML = html;
  },

  remove() {
    this.historyEvents = [];
    this.currentActions = [];
    const tlPanel = document.getElementById('timeline-panel');
    if (tlPanel) tlPanel.classList.remove('active');
    this.clearBattlePanels();
    this.updateRadar();
  }
};