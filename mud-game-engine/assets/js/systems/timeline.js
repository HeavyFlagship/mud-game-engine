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
  // requestAnimationFrame 句柄
  _rafId: null,
  // 上一帧时间戳（performance.now）
  _lastFrameTime: 0,

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

  pause() {
    this.paused = true;
    this._pausedAt = this.time;
  },

  resume() {
    this.paused = false;
    this._lastFrameTime = 0; // 下次 _loop 时重置
    this.startLoop();
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

  // ===== 60fps 连续推进循环 =====

  /** 真实秒 → 游戏秒倍率（可配置） */
  TIMESCALE: 10,
  /** 防止卡顿时 delta 过大（100ms 封顶） */
  MAX_FRAME_DELTA: 0.1,

  // 启动 requestAnimationFrame 循环
  startLoop() {
    if (this._rafId) return; // 已运行
    this._lastFrameTime = 0; // 首帧建立基准，避免恢复时跳帧
    const loop = (timestamp) => {
      this._rafId = requestAnimationFrame(loop);
      this._loop(timestamp);
    };
    this._rafId = requestAnimationFrame(loop);
  },

  // 停止循环
  stopLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  },

  // 每帧回调：计算 delta，推进时间，检查事件
  _loop(timestamp) {
    if (this.paused) return;

    // 首次或 resume 后重置 _lastFrameTime 避免跳帧
    if (this._lastFrameTime === 0) {
      this._lastFrameTime = timestamp;
      return;
    }

    const rawDelta = (timestamp - this._lastFrameTime) / 1000;
    this._lastFrameTime = timestamp;
    const delta = Math.min(rawDelta, this.MAX_FRAME_DELTA);

    this.advanceTime(delta * this.TIMESCALE);
    this._checkAndDispatch();

    if (this.onTickEnd) this.onTickEnd();
  },

  // 检查并分发已到达的事件
  _checkAndDispatch() {
    this.eventQueue.sort((a, b) => a.time - b.time);
    while (this.eventQueue.length > 0 && this.eventQueue[0].time <= this.time) {
      const evt = this.eventQueue.shift();
      this.dispatchEvent(evt);
      // 结束的持续动作清理
      this.continuousActions = this.continuousActions.filter(a => a.endTime > this.time);
    }
  },

  // ===== 时间推进（delta 秒） =====
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

  // 分发事件到注册的 handler
  dispatchEvent(event) {
    const handler = this.handlers[event.type];
    if (handler) {
      handler(event);
    }
    // 可选通知钩子（用于记录已完成的行动点等 UI 用途）
    if (this.onEventDispatched) {
      this.onEventDispatched(event);
    }
  },

  // 调度下一次推进：启动 60fps 循环，确保时间轴开始流动
  scheduleNext() {
    if (this.paused) return;
    if (this.eventQueue.length === 0) return;
    this.startLoop();
  }
};