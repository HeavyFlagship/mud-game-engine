// ========== 战斗 UI 系统 ==========
const BattleUI = {
  container: null,
  radarEl: null,
  statusEl: null,
  timelineEl: null,
  enemiesEl: null,

  render() {
    const output = document.getElementById('output');
    if (!output || !output.parentNode) return;
    const gameArea = output.parentNode;

    let container = document.getElementById('battle-ui');
    if (!container) {
      container = document.createElement('div');
      container.id = 'battle-ui';
      container.style.cssText = `
        display: flex;
        gap: 12px;
        padding: 12px;
        background: rgba(0,0,0,0.85);
        border: 1px solid #444;
        border-radius: 6px;
        margin-bottom: 10px;
        font-size: 13px;
      `;
      output.parentNode.insertBefore(container, output);
    }
    this.container = container;

    container.innerHTML = '';

    const radar = document.createElement('div');
    radar.id = 'battle-radar';
    radar.style.cssText = `
      flex: 0 0 200px;
      background: #0a1a0a;
      border: 1px solid #2d5;
      border-radius: 4px;
      padding: 8px;
      position: relative;
    `;
    radar.innerHTML = `<div style="color:#2d5;font-weight:bold;margin-bottom:4px;">📡 雷达 (1000m)</div>
      <canvas id="radar-canvas" width="184" height="184" style="background:#051005;border-radius:50%;border:1px solid #2d5;"></canvas>`;
    container.appendChild(radar);
    this.radarEl = radar;

    const status = document.createElement('div');
    status.id = 'battle-status';
    status.style.cssText = `
      flex: 1;
      background: #111;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 8px;
      color: #ddd;
    `;
    container.appendChild(status);
    this.statusEl = status;

    const timeline = document.createElement('div');
    timeline.id = 'battle-timeline';
    timeline.style.cssText = `
      flex: 0 0 200px;
      background: #111;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 8px;
      color: #ddd;
    `;
    timeline.innerHTML = `<div style="font-weight:bold;color:#fc0;margin-bottom:6px;">⏱ 时间轴</div>
      <div id="timeline-content" style="font-size:11px;"></div>`;
    container.appendChild(timeline);
    this.timelineEl = timeline;

    this.update();
  },

  update() {
    if (!this.container || !Battle.active || !Battle.battlefield) return;

    this.updateRadar();
    this.updateStatus();
    this.updateTimeline();
  },

  updateRadar() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas || !Battle.battlefield) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const scale = Math.min(w, h) / 1000;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#1a4a1a';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, w / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    const px = cx + (Player.position[0] - 500) * scale;
    const py = cy + (Player.position[1] - 500) * scale;
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    if (Battle.battlefield.covers) {
      ctx.fillStyle = '#555';
      for (const cover of Battle.battlefield.covers) {
        const cpx = cx + (cover.pos[0] - 500) * scale;
        const cpy = cy + (cover.pos[1] - 500) * scale;
        ctx.fillRect(cpx - 3, cpy - 3, 6, 6);
      }
    }

    for (const enemy of Battle.battlefield.enemies) {
      if (enemy.hp <= 0) continue;
      const dist = Battle.getDistance(Player.position, enemy.position);
      if (dist > Player.visionRadius) continue;
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
      ctx.moveTo(ex, ey - 5);
      ctx.lineTo(ex + 4, ey + 3);
      ctx.lineTo(ex - 4, ey + 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.instanceId, ex, ey - 7);
    }
  },

  updateStatus() {
    if (!this.statusEl) return;
    const room = MapSystem.getRoom(Battle.roomId);
    const hpPct = (Player.hp / Player.maxHp * 100).toFixed(0);
    const arPct = Player.maxArmor > 0 ? (Player.armor / Player.maxArmor * 100).toFixed(0) : 0;
    const enPct = (Player.energy / Player.maxEnergy * 100).toFixed(0);

    const priWep = Player.equipment.primary;
    const secWep = Player.equipment.secondary;

    let html = `<div style="font-weight:bold;color:#4af;margin-bottom:6px;">` +
      `🚀 ${Player.name} | ${room ? room.name : ''} | 时间: ${Battle.battlefield.time.toFixed(0)}t</div>`;

    html += `<div style="margin-bottom:4px;">结构值: ${Player.hp}/${Player.maxHp} `;
    html += `<div style="display:inline-block;width:120px;height:10px;background:#333;border-radius:2px;vertical-align:middle;">`;
    html += `<div style="width:${hpPct}%;height:100%;background:${hpPct>50?'#4f4':hpPct>25?'#fa2':'#f44'};border-radius:2px;"></div></div></div>`;

    html += `<div style="margin-bottom:4px;">装甲: ${Player.armor}/${Player.maxArmor} `;
    html += `<div style="display:inline-block;width:120px;height:10px;background:#333;border-radius:2px;vertical-align:middle;">`;
    html += `<div style="width:${arPct}%;height:100%;background:#88f;border-radius:2px;"></div></div></div>`;

    html += `<div style="margin-bottom:4px;">能量: ${Math.floor(Player.energy)}/${Player.maxEnergy} `;
    html += `<div style="display:inline-block;width:120px;height:10px;background:#333;border-radius:2px;vertical-align:middle;">`;
    html += `<div style="width:${enPct}%;height:100%;background:#fd4;border-radius:2px;"></div></div></div>`;

    html += `<div style="margin-top:6px;font-size:11px;">`;
    html += `速度: ${Player.currentSpeed.toFixed(1)} | 视野: ${Player.visionRadius}m</div>`;

    html += `<div style="margin-top:6px;border-top:1px solid #333;padding-top:4px;">`;
    html += `<div style="color:#fc0;">武器:</div>`;
    if (priWep) {
      const cd = Player.weaponCooldowns.primary;
      html += `<div>主: ${priWep.name} ${cd > 0 ? `[冷却:${cd.toFixed(1)}]` : '[就绪]'}</div>`;
    } else {
      html += `<div>主: 空</div>`;
    }
    if (secWep) {
      const cd = Player.weaponCooldowns.secondary;
      html += `<div>副: ${secWep.name} ${cd > 0 ? `[冷却:${cd.toFixed(1)}]` : '[就绪]'}</div>`;
    } else {
      html += `<div>副: 空</div>`;
    }
    html += `</div>`;

    const aliveEnemies = Battle.battlefield.enemies.filter(e => e.hp > 0);
    html += `<div style="margin-top:6px;border-top:1px solid #333;padding-top:4px;color:#f66;">`;
    html += `敌人: ${aliveEnemies.length}/${Battle.battlefield.enemies.length}</div>`;

    this.statusEl.innerHTML = html;
  },

  updateTimeline() {
    const content = document.getElementById('timeline-content');
    if (!content || !Battle.eventQueue) return;

    const sorted = [...Battle.eventQueue].sort((a, b) => a.time - b.time).slice(0, 8);
    let html = '';
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
    if (sorted.length === 0) {
      html = '<div style="color:#666;">暂无事件</div>';
    }
    content.innerHTML = html;
  },

  remove() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.radarEl = null;
    this.statusEl = null;
    this.timelineEl = null;
  }
};
