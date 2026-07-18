// ========== 启动 ==========
function exec(cmd) {
  document.getElementById('input').value = cmd;
  CommandSystem.execute(cmd);
  document.getElementById('input').value = '';
  document.getElementById('input').focus();
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
  document.getElementById('input').focus();
});

window.Game = Game;
window.Battle = Battle;
window.exec = exec;
