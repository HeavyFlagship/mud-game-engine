// ========== 启动 ==========
function exec(cmd) {
  document.getElementById('input').value = cmd;
  CommandSystem.execute(cmd);
  document.getElementById('input').value = '';
  document.getElementById('input').focus();
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async () => {
  // file: 协议下 fetch 无法读取本地 JSON，必须通过 HTTP 服务访问
  if (location.protocol === 'file:') {
    document.getElementById('output').innerHTML =
      '<div class="msg warning">检测到以 file: 协议直接打开页面，数据文件无法加载。必须通过 HTTP 服务访问（如 python serve.py）。</div>';
    return;
  }
  // 先装配数据，成功后才初始化游戏
  try {
    await DataLoader.loadAll();
  } catch (e) {
    document.getElementById('output').innerHTML =
      '<div class="msg warning">游戏数据加载失败，无法启动：' + (e && e.message ? e.message : e) + '</div>';
    return;
  }
  Game.init();
  document.getElementById('input').focus();
});

window.Game = Game;
window.Battle = Battle;
window.exec = exec;
