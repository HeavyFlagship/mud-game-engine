// ========== 开发树系统 ==========
// 对应设计文档：制造生产系统设计书 §2
const TechTree = {
  nodes: {},
  _unlocked: new Set(),

  init() {
    // 加载节点数据
    if (typeof TechTreeDB !== 'undefined' && TechTreeDB.nodes) {
      this.nodes = JSON.parse(JSON.stringify(TechTreeDB.nodes));
    }
    // 标记默认已解锁节点
    for (const [id, node] of Object.entries(this.nodes)) {
      if (node.isUnlocked) {
        this._unlocked.add(id);
      }
    }
  },

  getNode(nodeId) {
    return this.nodes[nodeId] || null;
  },

  isUnlocked(nodeId) {
    return this._unlocked.has(nodeId);
  },

  getUnlocked() {
    return [...this._unlocked].map(id => this.nodes[id]).filter(Boolean);
  },

  // 获取可解锁节点
  getUnlockable() {
    return Object.values(this.nodes).filter(node => {
      if (this._unlocked.has(node.nodeId)) return false;
      return node.prerequisites.every(pre => this._unlocked.has(pre));
    });
  },

  // 获取刚刚解锁的节点（所有前置满足但还没标记为解锁的）
  _getNewlyUnlockable() {
    return Object.values(this.nodes).filter(node => {
      if (this._unlocked.has(node.nodeId)) return false;
      return node.prerequisites.every(pre => this._unlocked.has(pre));
    });
  },

  // 检查玩家是否满足节点解锁条件（玩家直接生产路径）
  checkPlayerUnlock(nodeId) {
    const node = this.nodes[nodeId];
    if (!node || this._unlocked.has(nodeId)) return false;
    if (node.unlockMethod !== 'player') return false;

    // 前置节点必须已解锁
    if (!node.prerequisites.every(pre => this._unlocked.has(pre))) return false;

    // 检查玩家是否拥有足够的目标物品
    if (node.requiredItem && node.requiredCount) {
      const item = Player.inventory.find(i => i.id === node.requiredItem);
      if (!item || item.count < node.requiredCount) return false;
    }

    return true;
  },

  // 解锁节点
  unlock(nodeId) {
    const node = this.nodes[nodeId];
    if (!node || this._unlocked.has(nodeId)) return false;

    this._unlocked.add(nodeId);
    node.isUnlocked = true;

    // 显示新闻
    if (node.newsText) {
      Msg.system(node.newsText);
    }

    // 处理解锁奖励
    if (node.unlockRewards) {
      for (const reward of node.unlockRewards) {
        if (reward.type === 'allow_build') {
          Msg.system(`  → 可建造新设施：${FacilityDB.get(reward.target)?.name || reward.target}`);
        }
        if (reward.type === 'notify_economy') {
          if (typeof SupplyDemand !== 'undefined') {
            SupplyDemand.onNodeUnlocked(reward.target);
          }
        }
      }
    }

    return true;
  },

  // 尝试解锁（消耗所需物品）
  tryUnlock(nodeId) {
    if (!this.checkPlayerUnlock(nodeId)) return false;

    const node = this.nodes[nodeId];
    if (node.requiredItem && node.requiredCount) {
      // 消耗物品
      let remaining = node.requiredCount;
      for (let i = Player.inventory.length - 1; i >= 0 && remaining > 0; i--) {
        const item = Player.inventory[i];
        if (item.id === node.requiredItem) {
          const toRemove = Math.min(remaining, item.count);
          item.count -= toRemove;
          remaining -= toRemove;
          if (item.count <= 0) {
            Player.inventory.splice(i, 1);
          }
        }
      }
    }

    return this.unlock(nodeId);
  },

  // 序列化状态
  getState() {
    return [...this._unlocked];
  },

  // 恢复状态
  applyState(state) {
    if (!state || !Array.isArray(state)) return;
    this._unlocked = new Set();
    for (const nodeId of state) {
      this._unlocked.add(nodeId);
      if (this.nodes[nodeId]) {
        this.nodes[nodeId].isUnlocked = true;
      }
    }
  },
};