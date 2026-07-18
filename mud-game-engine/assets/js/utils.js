// ============================================================
//  幻境传说 - MUD 文字冒险引擎
// ============================================================

// ========== 工具函数 ==========
const Utils = {
  rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(val, min, max) { return Math.max(min, Math.min(max, val)); },
  padRight(str, len, ch = ' ') { str = String(str); while (str.length < len) str += ch; return str; },
  // 百分比概率
  chance(pct) { return Math.random() * 100 < pct; },
  // 数值格式化
  fmtNum(n) { return n >= 10000 ? (n/10000).toFixed(1) + '万' : String(n); }
};
