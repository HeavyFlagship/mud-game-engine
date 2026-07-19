// ========== 消息系统 ==========
const Msg = {
  el: null,
  queryEl: null,
  queryTitleEl: null,
  target: 'main',
  init() {
    this.el = document.getElementById('output');
    this.queryEl = document.getElementById('query-output');
    this.queryTitleEl = document.getElementById('query-title');
  },
  getTargetEl(target = this.target) {
    if (target === 'query' && this.queryEl) return this.queryEl;
    return this.el;
  },
  add(text, cls = 'info', target = this.target) {
    const targetEl = this.getTargetEl(target);
    if (!targetEl) return;
    const div = document.createElement('div');
    div.className = 'msg ' + cls;
    div.innerHTML = text;
    targetEl.appendChild(div);
    targetEl.scrollTop = targetEl.scrollHeight;
  },
  system(t) { this.add(t, 'system'); },
  info(t) { this.add(t, 'info'); },
  success(t) { this.add(t, 'success'); },
  warning(t) { this.add(t, 'warning'); },
  warn(t) { this.add(t, 'warning'); },
  danger(t) { this.add(t, 'danger'); },
  error(t) { this.add(t, 'danger'); },
  magic(t) { this.add(t, 'magic'); },
  loot(t) { this.add(t, 'loot'); },
  story(t) { this.add(t, 'story'); },
  damage(t) { this.add(t, 'damage', 'main'); },
  damageEnemy(t) { this.add(t, 'damage-enemy', 'main'); },
  miss(t) { this.add(t, 'miss', 'main'); },
  missEnemy(t) { this.add(t, 'miss-enemy', 'main'); },
  prompt(t) { this.add(t, 'prompt'); },
  cmd(t) { this.add(t, 'command', 'main'); },
  queryCmd(t) { this.add(t, 'command', 'query'); },
  divider() { this.add('─'.repeat(40), 'divider'); },
  clear() { if (this.el) this.el.innerHTML = ''; },
  clearQuery() {
    if (this.queryEl) this.queryEl.innerHTML = '<div class="msg system">查询类指令的信息会显示在这里。</div>';
    if (this.queryTitleEl) this.queryTitleEl.textContent = '查询窗口';
  },
  withQuery(title, raw, callback) {
    if (!this.queryEl) {
      callback();
      return;
    }
    this.queryEl.innerHTML = '';
    if (this.queryTitleEl) this.queryTitleEl.textContent = title || '查询窗口';
    this.queryCmd(`查询：> ${raw}`);
    const previousTarget = this.target;
    this.target = 'query';
    try {
      callback();
    } finally {
      this.target = previousTarget;
      this.queryEl.scrollTop = this.queryEl.scrollHeight;
    }
  }
};
