// ========== 基地指令处理器 ==========
const BaseCommands = {
  cmdShop(args) {
    Game.shop(args[0] || 'list');
  },
  cmdTrade(args) {
    if (args.length >= 2 && (args[0] === 'buy' || args[1] === 'buy')) {
      const itemName = args[0] === 'buy' ? args[1] : args[0];
      const count = parseInt(args[2]) || 1;
      TradeSystem.playerBuy(itemName, count);
    } else if (args.length >= 2 && (args[0] === 'sell' || args[1] === 'sell')) {
      const itemName = args[0] === 'sell' ? args[1] : args[0];
      const count = parseInt(args[2]) || 1;
      TradeSystem.playerSell(itemName, count);
    } else {
      TradeSystem.showOrders(args);
    }
  },
  cmdReplenish(args) {
    QuotaSystem.replenish(args[0]);
  },
  cmdUpgrade(args) {
    Game.upgrade(args.join(' '));
  },
  cmdIndustry(args) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.industryZone) {
      Msg.warning('当前区域没有工业区。');
      return;
    }
    const zone = room.industryZone;
    Msg.divider();
    Msg.add('🏭 工业区', 'info');
    Msg.info(`总面积: ${zone.area}m²  已用: ${zone.areaUsed}m²  剩余: ${zone.area - zone.areaUsed}m²`);
    Msg.info(`已安装设施: ${zone.facilities.length}个`);

    if (zone.facilities.length > 0) {
      Msg.info('── 设施列表 ──');
      for (const fid of zone.facilities) {
        const facility = FacilitySystem.facilities[fid];
        if (facility) {
          const status = facility.isRunning ? '✅运行中' : '⏸暂停';
          const storage = facility.storage[facility.outputItemId] || 0;
          const itemName = ItemDB.get(facility.outputItemId)?.name || facility.outputItemId;
          Msg.info(`  ${facility.name} ${status} | 产出: ${itemName}(${storage.toFixed(1)}) | ${facility.outputRate}/小时`);
        }
      }
    }

    // Show tech tree status
    Msg.add('🔬 科技树', 'info');
    for (const [id, node] of Object.entries(TechTree.nodes)) {
      if (node.isUnlocked) {
        Msg.info(`  ✅ ${node.name}`);
      } else if (TechTree.canUnlock(id)) {
        Msg.info(`  🔓 ${node.name}（可解锁）`);
      }
    }

    Msg.system('提示: 输入 安装 <设施ID> 安装新设施，使用设施 <设施ID> 操作设施');
  },
  cmdInstall(args) {
    if (!args[0]) {
      Msg.info('可安装的设施：');
      for (const [id, def] of Object.entries(FacilityDB)) {
        const unlocked = TechTree.isNodeUnlocked(def.requiresNode);
        const tag = unlocked ? '✅' : '🔒';
        Msg.info(`  ${tag} ${id} - ${def.name}: ${def.footprint}m²`);
      }
      Msg.info('用法: 安装 <设施ID>');
      return;
    }
    FacilitySystem.install(args[0], Player.room);
  },
  cmdUseFacility(args) {
    const room = MapSystem.getRoom(Player.room);
    if (!room || !room.industryZone || room.industryZone.facilities.length === 0) {
      Msg.warning('当前区域没有可用设施。');
      return;
    }
    if (!args[0]) {
      Msg.info('可用设施：');
      for (const fid of room.industryZone.facilities) {
        const f = FacilitySystem.facilities[fid];
        if (f) {
          Msg.info(`  ${f.facilityId} - ${f.name} (${f.isRunning ? '运行中' : '暂停'})`);
        }
      }
      Msg.info('用法: 使用设施 <设施ID>');
      return;
    }
    const facility = FacilitySystem.facilities[args[0]];
    if (!facility) {
      Msg.error('未找到该设施。');
      return;
    }
    // Collect output from facility storage
    let totalCollected = 0;
    for (const [itemId, count] of Object.entries(facility.storage)) {
      if (count > 0) {
        const existing = Player.inventory.find(i => i.id === itemId);
        if (existing) {
          existing.count += Math.floor(count);
        } else {
          Player.inventory.push({ id: itemId, count: Math.floor(count) });
        }
        totalCollected += Math.floor(count);
        facility.storage[itemId] -= Math.floor(count);
      }
    }
    if (totalCollected > 0) {
      Msg.success(`从 ${facility.name} 收集了 ${totalCollected} 单位产出。`);
    } else {
      Msg.info(`${facility.name} 暂无产出可收集。`);
    }
  },
  cmdSchedule(args) {
    if (!args[0]) {
      Msg.info('用法: 调度 <设施ID> [start|stop]');
      return;
    }
    const facility = FacilitySystem.facilities[args[0]];
    if (!facility) {
      Msg.error('未找到该设施。');
      return;
    }
    const action = args[1] || 'status';
    if (action === 'start') {
      if (facility.isRunning) {
        Msg.info(`${facility.name} 已在运行中。`);
      } else {
        facility.isRunning = true;
        Msg.success(`${facility.name} 已恢复运行。`);
      }
    } else if (action === 'stop') {
      if (!facility.isRunning) {
        Msg.info(`${facility.name} 已暂停。`);
      } else {
        facility.isRunning = false;
        Msg.info(`${facility.name} 已暂停运行。`);
      }
    } else {
      const status = facility.isRunning ? '运行中' : '已暂停';
      Msg.info(`${facility.name}: ${status} | 产出速率: ${facility.outputRate}/小时`);
    }
  },
  cmdQuest(args) {
    if (args.length === 0) {
      // 显示任务列表
      const activeQuests = QuestSystem.getQuestList();
      const availableQuests = Object.values(QuestDB).filter(q => {
        if (QuestSystem.activeQuests[q.id]) return false;
        if (QuestSystem.completedQuests.includes(q.id) && !q.repeatable) return false;
        if (q.prerequisites) {
          return q.prerequisites.every(p => QuestSystem.completedQuests.includes(p));
        }
        return true;
      });

      Msg.divider();
      Msg.add('📋 任务', 'info');

      if (activeQuests.length > 0) {
        Msg.add('── 进行中的任务 ──', 'info');
        for (const q of activeQuests) {
          const typeTag = q.type === 'main' ? '主线' : '支线';
          const statusTag = q.completed ? '✅可交付' : '⏳进行中';
          Msg.info(`  ${statusTag} [${typeTag}] ${q.name}`);
          Msg.info(`    ${q.desc}`);
          for (const obj of q.objectives) {
            const prog = q.progress[obj.id] || 0;
            const pct = Math.min(100, (prog / obj.target) * 100);
            const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
            Msg.info(`    ${obj.desc}: [${bar}] ${prog}/${obj.target}`);
          }
          if (q.rewards) {
            const rewardParts = [];
            if (q.rewards.credits) rewardParts.push(`${q.rewards.credits}G`);
            if (q.rewards.exp) rewardParts.push(`${q.rewards.exp}EXP`);
            if (q.rewards.items) {
              for (const item of q.rewards.items) {
                const itemDef = ItemDB.get(item.id);
                rewardParts.push(`${itemDef ? itemDef.name : item.id} x${item.count || 1}`);
              }
            }
            Msg.info(`    奖励: ${rewardParts.join('、')}`);
          }
        }
      } else {
        Msg.info('  当前没有进行中的任务。');
      }

      if (availableQuests.length > 0) {
        Msg.add('── 可接取的任务 ──', 'info');
        for (const q of availableQuests) {
          const typeTag = q.type === 'main' ? '主线' : '支线';
          const repeatTag = q.repeatable ? ' 🔁可重复' : '';
          Msg.info(`  [${typeTag}] ${q.id} - ${q.name}${repeatTag}`);
          Msg.info(`    ${q.desc}`);
        }
        Msg.info('输入 任务 接取 <任务ID> 接取任务');
      } else {
        Msg.info('  当前没有可接取的任务。');
      }

      Msg.info('输入 任务 交付 <任务ID> 交付已完成的任务');
      return;
    }

    const action = args[0];
    const questId = args[1];

    if (action === '接取' || action === 'accept') {
      if (!questId) {
        Msg.warning('请指定任务ID：任务 接取 <任务ID>');
        return;
      }
      const result = QuestSystem.acceptQuest(questId);
      if (result.ok) {
        Msg.success(`✅ 接取了任务 "${result.quest.name}"！`);
        const q = result.quest;
        Msg.info(`目标：${q.objectives.map(o => o.desc).join('、')}`);
        if (q.rewards) {
          const rewardParts = [];
          if (q.rewards.credits) rewardParts.push(`${q.rewards.credits}G`);
          if (q.rewards.exp) rewardParts.push(`${q.rewards.exp}EXP`);
          if (q.rewards.items) {
            for (const item of q.rewards.items) {
              const itemDef = ItemDB.get(item.id);
              rewardParts.push(`${itemDef ? itemDef.name : item.id} x${item.count || 1}`);
            }
          }
          Msg.info(`奖励：${rewardParts.join('、')}`);
        }
      } else {
        Msg.warning(result.reason);
      }
    } else if (action === '交付' || action === 'deliver' || action === 'complete') {
      if (!questId) {
        Msg.warning('请指定任务ID：任务 交付 <任务ID>');
        return;
      }
      const result = QuestSystem.completeQuest(questId);
      if (result.ok) {
        Msg.success(`🎉 任务 "${result.quest.name}" 完成！`);
        const q = result.quest;
        if (q.rewards) {
          if (q.rewards.credits) Msg.success(`💰 获得 ${q.rewards.credits}G`);
          if (q.rewards.exp) Msg.success(`⭐ 获得 ${q.rewards.exp} 经验`);
          if (q.rewards.items) {
            for (const item of q.rewards.items) {
              const itemDef = ItemDB.get(item.id);
              Msg.success(`📦 获得 ${itemDef ? itemDef.name : item.id} x${item.count || 1}`);
            }
          }
        }
        if (q.repeatable) {
          Msg.info(`🔁 该任务已重新接取，可再次完成。`);
        }
      } else {
        Msg.warning(result.reason);
      }
    } else {
      Msg.warning('用法：任务 [接取|交付] <任务ID>');
    }
  },
  cmdBackup(args) {
    Msg.info('意识备份功能开发中...');
  },
};