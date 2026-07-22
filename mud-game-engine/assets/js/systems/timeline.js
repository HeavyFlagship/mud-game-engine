// ========== 时间轴系统（通用时间/事件引擎） ==========
// 与战斗系统解耦：负责时间流逝、事件队列、持续动作。
// 战斗系统、场景移动、未来的生产制造等系统通过注册 handler/updater 使用时间轴。
const Timeline = {
  // 当前游戏时间（秒）
  time: 0,
  // 事件队列：[{ type, time, ...payload }]
  eventQueue: [],
  // 持续动作列表（移动、生产等有时长的动作）
  continuousActions: [],
  // 是否暂停（等待玩家决策等）
  paused: false,
  // 事件推进间隔（毫秒，实时感）
  actionDelay: 500,
  // setTimeout 句柄
  actionTimeout: null,

  // 事件处理器注册表：type -> handler(event)
  handlers: {},
  // 时间推进更新器注册表：name -> fn(delta)
  updaters: {},
  // 每次 tick 后的 UI 刷新回调
  onTickEnd: null,

  init() {
    this.time = 0;
    this.eventQueue = [];
    this.continuousActions = [];
    this.paused = false;
    this.stopLoop();
    this.handlers = {};
    this.updaters = {};
  },

  // 启动时间轴（不自动推进，需 scheduleNext）
  start(initialTime = 0) {
    this.time = initialTime;
    this.eventQueue = [];
    this.continuousActions = [];
    this.paused = false;
  },

  // 停止时间轴，清空所有事件/动作/处理器
  stop() {
    this.stopLoop();
    this.eventQueue = [];
    this.continuousActions = [];
    this.paused = false;
    this.handlers = {};
    this.updaters = {};
  },

  pause() { this.paused = true; },

  resume() {
    this.paused = false;
    this.scheduleNext();
  },

  // ===== 事件处理器注册 =====
  on(type, handler) { this.handlers[type] = handler; },
  off(type) { delete this.handlers[type]; },
  offAll() { this.handlers = {}; },

  // ===== 时间推进更新器注册 =====
  addUpdater(name, fn) { this.updaters[name] = fn; },
  removeUpdater(name) { delete this.updaters[name]; },
  removeAllUpdaters() { this.updaters = {}; },

  // ===== 事件调度 =====
  scheduleEvent(event, delay) {
    event.time = this.time + delay;
    this.eventQueue.push(event);
  },

  // 取消满足条件的事件
  cancelEvents(predicate) {
    this.eventQueue = this.eventQueue.filter(e => !predicate(e));
  },

  // 取消指定类型的所有事件
  cancelEventsByType(type) {
    this.eventQueue = this.eventQueue.filter(e => e.type !== type);
  },

  // ===== 持续动作 =====
  createContinuousAction(actor, type, startTime, duration, data, onPosition) {
    return {
      actor,
      type,
      startTime,
      endTime: startTime + duration,
      duration,
      data,
      onPosition,
      getPosition: (currentTime) => {
        if (type !== 'move') return null;
        const elapsed = currentTime - startTime;
        const ratio = Math.min(1, elapsed / duration);
        return [
          data.startPos[0] + (data.endPos[0] - data.startPos[0]) * ratio,
          data.startPos[1] + (data.endPos[1] - data.startPos[1]) * ratio
        ];
      },
      isActive: (currentTime) => currentTime >= startTime && currentTime <= startTime + duration
    };
  },

  addContinuousAction(action) { this.continuousActions.push(action); },

  removeContinuousAction(actor, type) {
    this.continuousActions = this.continuousActions.filter(
      a => !(a.actor === actor && a.type === type)
    );
  },

  // ===== 时间推进 =====
  stopLoop() {
    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
      this.actionTimeout = null;
    }
  },

  // 推进时间 delta 秒：更新持续动作位置、调用所有 updaters
  advanceTime(delta) {
    if (delta <= 0) return;
    this.time += delta;
    const currentTime = this.time;

    for (const action of this.continuousActions) {
      if (action.isActive(currentTime)) {
        const pos = action.getPosition(currentTime);
        if (pos && action.onPosition) action.onPosition(pos);
      }
    }
    this.continuousActions = this.continuousActions.filter(a => a.isActive(currentTime));

    for (const fn of Object.values(this.updaters)) {
      fn(delta);
    }
  },

  // 处理队列中下一个事件
  tick() {
    if (this.paused) return;
    if (this.eventQueue.length === 0) return;

    this.eventQueue.sort((a, b) => a.time - b.time);
    const next = this.eventQueue[0];
    const delta = next.time - this.time;

    if (delta > 0) {
      this.advanceTime(delta);
    }

    this.eventQueue.shift();
    this.dispatchEvent(next);
    // 事件处理后再清理一次已结束的持续动作（endTime === currentTime 的情况）
    this.continuousActions = this.continuousActions.filter(a => a.endTime > this.time);
    // tick 结束后刷新 UI（雷达/时间轴/装备面板等）
    if (this.onTickEnd) this.onTickEnd();
  },

  // 分发事件到注册的 handler
  dispatchEvent(event) {
    const handler = this.handlers[event.type];
    if (handler) {
      handler(event);
    }
  },

  // 调度下一次推进
  scheduleNext() {
    if (this.paused) return;
    this.stopLoop();
    this.actionTimeout = setTimeout(() => {
      this.tick();
    }, this.actionDelay);
  }
};
