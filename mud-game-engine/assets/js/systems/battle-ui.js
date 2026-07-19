// ========== 战斗 UI 系统 ==========
const BattleUI = {
  historyEvents: [],

  init() {
    this.updateRadar();
    this.updateEnemyList();
    this.updateTimeline();
    setInterval(() => {
      this.updateRadar();
      if (Battle.active) {
        this.updateEnemyList();
        this.updateTimeline();
        if (typeof Game !== 'undefined' && Game.updatePlayerInfo) {
          Game.updatePlayerInfo();
        }
      }
    }, 500);
  },

  updateRadar() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const scale = Math.min(w, h) / 1000;
    const offsetX = (w - 1000 * scale) / 2;
    const offsetY = (h - 1000 * scale) / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#051005';
    ctx.fillRect(offsetX, offsetY, 1000 * scale, 1000 * scale);

    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 0.5;
    const gridSize = 200;
    for (let x = 0; x <= 1000; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * scale, offsetY);
      ctx.lineTo(offsetX + x * scale, offsetY + 1000 * scale);
      ctx.stroke();
    }
    for (let y = 0; y <= 1000; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * scale);
      ctx.lineTo(offsetX + 1000 * scale, offsetY + y * scale);
      ctx.stroke();
    }

    ctx.strokeStyle = '#2d5';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, 1000 * scale, 1000 * scale);

    let playerX = 500, playerY = 500;
    if (Battle.active && Battle.battlefield) {
      playerX = Player.position[0];
      playerY = Player.position[1];
    }

    const px = offsetX + playerX * scale;
    const py = offsetY + playerY * scale;
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.stroke();

    if (Battle.active && Battle.battlefield) {
      for (const enemy of Battle.battlefield.enemies) {
        if (enemy.hp <= 0) continue;
        const ex = offsetX + enemy.position[0] * scale;
        const ey = offsetY + enemy.position[1] * scale;
        const dist = Battle.getDistance(Player.position, enemy.position);

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
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.instanceId, ex, ey - 7);
      }
    } else {
      const room = MapSystem.getRoom(Player.room);
      if (room && room.npcs && room.npcs.length > 0) {
        for (let i = 0; i < room.npcs.length; i++) {
          const npcId = room.npcs[i];
          const npc = NPCDB[npcId];
          if (!npc) continue;
          const nx = offsetX + (150 + i * 200) * scale;
          const ny = offsetY + 400 * scale;
          ctx.fillStyle = '#8cf';
          ctx.beginPath();
          ctx.arc(nx, ny, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('NPC', nx, ny - 7);
        }
      }
    }

    const legendEl = document.getElementById('radar-legend');
    if (legendEl) {
      if (Battle.active) {
        const alive = Battle.battlefield ? Battle.battlefield.enemies.filter(e => e.hp > 0).length : 0;
        legendEl.innerHTML = `<span style="color:#0ff;">●</span> 玩家 &nbsp; <span style="color:#f44;">●</span> 威胁 &nbsp; <span style="color:#fd0;">●</span> 未警觉 &nbsp; 敌人: ${alive}`;
      } else {
        const room = MapSystem.getRoom(Player.room);
        const npcCount = room && room.npcs ? room.npcs.length : 0;
        legendEl.innerHTML = `<span style="color:#0ff;">●</span> 玩家 &nbsp; <span style="color:#8cf;">●</span> NPC &nbsp; NPC: ${npcCount}`;
      }
    }
  },

  updateEnemyList() {
    const el = document.getElementById('enemy-list');
    if (!el) return;

    if (!Battle.active || !Battle.battlefield) {
      el.innerHTML = '<div style="color:#666;font-size:11px;">非战斗状态</div>';
      return;
    }

    let html = '';
    for (const enemy of Battle.battlefield.enemies) {
      const dist = Battle.getDistance(Player.position, enemy.position);
      const hpPct = (enemy.hp / enemy.maxHp * 100).toFixed(0);
      const arPct = enemy.maxArmor > 0 ? (enemy.armor / enemy.maxArmor * 100).toFixed(0) : 0;
      const dead = enemy.hp <= 0;
      const inRange = Player.equipment.primary && dist <= Player.equipment.primary.range;
      html += `<div style="margin-bottom:6px;padding:4px;background:${dead ? '#222' : '#1a1a1a'};border-radius:3px;opacity:${dead ? 0.5 : 1};">
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <span style="color:${dead ? '#666' : '#f66'};font-weight:bold;">${enemy.instanceId} ${enemy.name}</span>
          <span style="color:#888;font-size:11px;">${dist.toFixed(0)}m ${inRange ? '🎯' : '📏'}</span>
        </div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">结构: ${enemy.hp}/${enemy.maxHp}
          <div style="display:inline-block;width:60px;height:5px;background:#333;border-radius:2px;vertical-align:middle;margin-left:4px;">
          <div style="width:${hpPct}%;height:5px;background:${hpPct>50?'#4f4':hpPct>25?'#fa2':'#f44'};border-radius:2px;"></div></div>
        </div>
        <div style="font-size:10px;color:#aaa;">装甲: ${enemy.armor}/${enemy.maxArmor}
          <div style="display:inline-block;width:60px;height:5px;background:#333;border-radius:2px;vertical-align:middle;margin-left:4px;">
          <div style="width:${arPct}%;height:5px;background:#88f;border-radius:2px;"></div></div>
        </div>
      </div>`;
    }
    el.innerHTML = html;
  },

  addHistory(text, color = '#aaa') {
    const time = Battle.battlefield ? Battle.battlefield.time.toFixed(0) : '?';
    this.historyEvents.unshift({ time, text, color });
    if (this.historyEvents.length > 30) {
      this.historyEvents.pop();
    }
  },

  updateTimeline() {
    const content = document.getElementById('timeline-content');
    if (!content) return;

    if (!Battle.active || !Battle.eventQueue) {
      content.innerHTML = '<div style="color:#666;">非战斗状态</div>';
      return;
    }

    let html = '<div style="color:#888;margin-bottom:4px;border-bottom:1px solid #333;padding-bottom:2px;">— 即将到来 —</div>';

    const sorted = [...Battle.eventQueue].sort((a, b) => a.time - b.time).slice(0, 5);
    for (const evt of sorted) {
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
      }
      html += `<div style="color:${color};padding:1px 0;">+${timeOffset}t ${label}</div>`;
    }

    if (this.historyEvents.length > 0) {
      html += '<div style="color:#888;margin:6px 0 4px;border-bottom:1px solid #333;padding-bottom:2px;">— 历史记录 —</div>';
      for (const h of this.historyEvents.slice(0, 8)) {
        html += `<div style="color:${h.color};padding:1px 0;opacity:0.7;">${h.time}t ${h.text}</div>`;
      }
    }

    content.innerHTML = html;
  },

  render() {
    this.historyEvents = [];
    this.updateRadar();
    this.updateEnemyList();
    this.updateTimeline();
  },

  remove() {
    this.historyEvents = [];
    this.updateRadar();
    this.updateEnemyList();
    this.updateTimeline();
  }
};
