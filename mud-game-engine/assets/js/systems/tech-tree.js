// ========== 科技树系统 ==========
const TechTree = {
  nodes: {},
  unlockedFacilities: [],

  init() {
    // Load nodes from TechTreeDB
    this.nodes = {};
    this.unlockedFacilities = [];
    for (const [id, node] of Object.entries(TechTreeDB)) {
      if (typeof node === 'object' && node.nodeId) {
        this.nodes[id] = { ...node };
      }
    }
    // Initialize state: iron_ore is unlocked by default
    if (this.nodes['iron_ore']) {
      this.nodes['iron_ore'].isUnlocked = true;
    }
  },

  isNodeUnlocked(nodeId) {
    return this.nodes[nodeId]?.isUnlocked || false;
  },

  canUnlock(nodeId) {
    const node = this.nodes[nodeId];
    if (!node || node.isUnlocked) return false;
    if (!node.prerequisites || node.prerequisites.length === 0) return true;
    return node.prerequisites.every(preId => this.isNodeUnlocked(preId));
  },

  unlockNode(nodeId) {
    const node = this.nodes[nodeId];
    if (!node || node.isUnlocked) return false;
    if (!this.canUnlock(nodeId)) return false;

    node.isUnlocked = true;

    // Apply unlock rewards
    if (node.unlockRewards) {
      for (const reward of node.unlockRewards) {
        if (reward.type === 'allow_build') {
          this.unlockedFacilities.push(reward.target);
        }
        if (reward.type === 'notify_economy') {
          // Notify economy system - placeholder for future SupplyDemand system
        }
      }
    }

    // News notification
    if (node.newsText) {
      Msg.info(`📰 ${node.newsText}`);
    }

    return true;
  },

  tryUnlockNode(nodeId) {
    if (this.canUnlock(nodeId)) {
      return this.unlockNode(nodeId);
    }
    return false;
  },

  getUnlockedNodes() {
    const unlocked = [];
    for (const [id, node] of Object.entries(this.nodes)) {
      if (node.isUnlocked) unlocked.push(node);
    }
    return unlocked;
  },

  getAvailableNodes() {
    const available = [];
    for (const [id, node] of Object.entries(this.nodes)) {
      if (!node.isUnlocked && this.canUnlock(id)) {
        available.push(node);
      }
    }
    return available;
  },

  getState() {
    return {
      nodes: this.nodes,
      unlockedFacilities: this.unlockedFacilities || []
    };
  },

  loadState(state) {
    if (state && state.nodes) {
      this.nodes = state.nodes;
    }
    if (state && state.unlockedFacilities) {
      this.unlockedFacilities = state.unlockedFacilities;
    }
  }
};