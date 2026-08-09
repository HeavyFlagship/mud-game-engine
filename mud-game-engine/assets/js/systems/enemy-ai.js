// ========== 敌人 AI 系统 ==========
const EnemyAI = {
  update(enemy, battlefield, delta = 1) {
    if (enemy.hp <= 0) return;

    const distToPlayer = this.getDistance(enemy.position, Player.position);
    const canSeePlayer = distToPlayer <= enemy.visionRadius;
    const hpPercent = enemy.hp / enemy.maxHp;

    // Boss timers (decrement every update cycle)
    if (enemy.aiType && enemy.aiType.startsWith('boss_')) {
      this.updateBossTimers(enemy, delta);
    }

    if (enemy.state === 'idle') {
      if (canSeePlayer) {
        enemy.state = 'alert';
        enemy.alertTimer = 30;
      } else if (enemy.patrolPattern === 'patrol' && enemy.patrolPath) {
        this.doPatrol(enemy, battlefield);
      }
    } else if (enemy.state === 'alert') {
      enemy.alertTimer = (enemy.alertTimer || 0) - delta;
      if (canSeePlayer) {
        enemy.state = 'pursue';
        enemy.alertTimer = 0;
      } else if (enemy.alertTimer <= 0) {
        enemy.state = 'idle';
      }
    } else if (enemy.state === 'pursue') {
      if (!canSeePlayer && distToPlayer > enemy.visionRadius * 1.5) {
        enemy.state = 'search';
        enemy.searchTimer = 100;
        enemy.searchPos = [...Player.position];
      } else if (hpPercent < 0.3 && enemy.category !== 'bug') {
        const hasCover = this.findNearbyCover(enemy, battlefield);
        if (hasCover) {
          enemy.state = 'cover';
        } else if (hpPercent < 0.15) {
          enemy.state = 'retreat';
        }
      }
    } else if (enemy.state === 'search') {
      enemy.searchTimer = (enemy.searchTimer || 0) - delta;
      if (canSeePlayer) {
        enemy.state = 'pursue';
      } else if (enemy.searchTimer <= 0) {
        enemy.state = 'idle';
      }
    } else if (enemy.state === 'cover') {
      if (canSeePlayer && distToPlayer <= enemy.attackRange) {
        enemy.state = 'pursue';
      } else if (hpPercent >= 0.5) {
        enemy.state = 'pursue';
      }
    } else if (enemy.state === 'retreat') {
      if (!canSeePlayer && distToPlayer > enemy.visionRadius * 2) {
        enemy.state = 'idle';
      }
    } else if (enemy.state === 'berserk') {
      if (!canSeePlayer && distToPlayer > enemy.visionRadius * 2) {
        enemy.state = 'idle';
      }
    }
  },

  takeTurn(enemy, battlefield) {
    if (enemy.hp <= 0) return;

    const distToPlayer = this.getDistance(enemy.position, Player.position);
    const enemyLabel = `${enemy.name}[${enemy.instanceId}]`;
    const hpPercent = enemy.hp / enemy.maxHp;

    // Boss AI routing
    if (enemy.aiType === 'boss_guardian') {
      this.bossGuardianTurn(enemy, battlefield, distToPlayer, enemyLabel, hpPercent);
      return;
    }
    if (enemy.aiType === 'boss_colossus') {
      this.bossColossusTurn(enemy, battlefield, distToPlayer, enemyLabel, hpPercent);
      return;
    }

    if (enemy.state === 'pursue' || enemy.state === 'alert') {
      if (distToPlayer <= enemy.attackRange && enemy.attackTimer <= 0) {
        Battle.enemyAttack(enemy, Player.position);
      } else if (distToPlayer > enemy.attackRange * 0.5) {
        this.moveTowardPlayer(enemy, battlefield);
      } else {
        BattleUI.addHistory(enemyLabel, '#aaa', '待机');
        Battle.scheduleNextEnemyTurn(enemy);
      }
    } else if (enemy.state === 'search') {
      if (enemy.searchPos) {
        const searchDist = this.getDistance(enemy.position, enemy.searchPos);
        if (searchDist > 20) {
          this.moveToward(enemy, enemy.searchPos, battlefield);
        } else {
          BattleUI.addHistory(enemyLabel, '#aa8', '搜索');
          Battle.scheduleNextEnemyTurn(enemy);
        }
      } else {
        BattleUI.addHistory(enemyLabel, '#aaa', '待机');
        Battle.scheduleNextEnemyTurn(enemy);
      }
    } else if (enemy.state === 'cover') {
      const cover = this.findNearbyCover(enemy, battlefield);
      if (cover) {
        const coverDist = this.getDistance(enemy.position, cover.pos);
        if (coverDist > 15) {
          this.moveToward(enemy, cover.pos, battlefield);
        } else {
          BattleUI.addHistory(enemyLabel, '#6a8', '掩护');
          Battle.scheduleNextEnemyTurn(enemy);
        }
      } else {
        enemy.state = 'pursue';
        this.takeTurn(enemy, battlefield);
      }
    } else if (enemy.state === 'retreat') {
      const dx = enemy.position[0] - Player.position[0];
      const dy = enemy.position[1] - Player.position[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = Math.min(dist, enemy.speed * 5);
      const ratio = moveDist / dist;
      const newPos = [
        enemy.position[0] + dx * ratio,
        enemy.position[1] + dy * ratio
      ];
      BattleUI.addHistory(enemyLabel, '#a66', '撤退');
      Battle.startEnemyMove(enemy, newPos);
    } else if (enemy.state === 'berserk') {
      if (distToPlayer <= enemy.attackRange && enemy.attackTimer <= 0) {
        const berserkDamage = Math.floor(enemy.damage * 1.5);
        const originalDamage = enemy.damage;
        enemy.damage = berserkDamage;
        Battle.enemyAttack(enemy, Player.position);
        enemy.damage = originalDamage;
      } else {
        const moveDist = Math.min(distToPlayer, enemy.speed * 1.2 * 5);
        const ratio = moveDist / distToPlayer;
        const newPos = [
          enemy.position[0] + (Player.position[0] - enemy.position[0]) * ratio,
          enemy.position[1] + (Player.position[1] - enemy.position[1]) * ratio
        ];
        BattleUI.addHistory(enemyLabel, '#f44', '狂暴冲锋');
        Battle.startEnemyMove(enemy, newPos);
      }
    } else if (enemy.patrolPattern === 'patrol' && enemy.patrolPath) {
      this.doPatrolMove(enemy, battlefield);
    } else {
      BattleUI.addHistory(enemyLabel, '#aaa', '待机');
      Battle.scheduleNextEnemyTurn(enemy);
    }
  },

  // ========== Boss AI: 巨型守卫虫 ==========
  bossGuardianTurn(enemy, battlefield, distToPlayer, enemyLabel, hpPercent) {
    // Ensure maxArmor is tracked for reference
    if (enemy.maxArmor === undefined) enemy.maxArmor = enemy.armor;

    // Phase 2 activation (HP < 50%)
    if (!enemy.phase2 && hpPercent < 0.5) {
      enemy.phase2 = true;
      enemy.attackCooldown = Math.floor(enemy.attackCooldown * 0.7);
      enemy.damage = Math.floor(enemy.damage * 1.2);
      BattleUI.addHistory(enemyLabel, '#f90', '⚠ 进入狂暴状态');
      if (typeof Msg !== 'undefined') {
        Msg.warn('⚠ 巨型守卫虫进入狂暴状态！攻速和伤害大幅提升！');
      }
    }

    // Special: 震地冲击 (Earthquake Impact)
    // Range 200m, damage 30, slow 3s, cooldown 25s
    if (enemy.specialTimer <= 0 && distToPlayer <= 200) {
      BattleUI.addHistory(enemyLabel, '#f90', '🌍 震地冲击');
      if (typeof Msg !== 'undefined') {
        Msg.damageEnemy('🌍 巨型守卫虫释放震地冲击！');
      }

      const result = Battle.dealDamage(Player, 30, 'kinetic', { armorPierce: 0.5 });
      Battle.applySlowEffect(Player, 3, 0.5);

      if (typeof Msg !== 'undefined' && result) {
        Msg.damageEnemy(`震地冲击造成 ${result.total} 点伤害！`);
      }
      enemy.specialTimer = 25;
      Battle.scheduleNextEnemyTurn(enemy);
      return;
    }

    // Normal melee behavior: pursue and attack
    if (distToPlayer <= enemy.attackRange && enemy.attackTimer <= 0) {
      Battle.enemyAttack(enemy, Player.position);
    } else if (distToPlayer > enemy.attackRange) {
      this.moveTowardPlayer(enemy, battlefield);
    } else {
      BattleUI.addHistory(enemyLabel, '#aaa', '待机');
      Battle.scheduleNextEnemyTurn(enemy);
    }
  },

  // ========== Boss AI: 守护者巨像 ==========
  bossColossusTurn(enemy, battlefield, distToPlayer, enemyLabel, hpPercent) {
    // Ensure maxArmor is tracked for shield regen
    if (enemy.maxArmor === undefined) enemy.maxArmor = enemy.armor;

    // Phase 2 activation (HP < 50%)
    if (!enemy.phase2 && hpPercent < 0.5) {
      enemy.phase2 = true;
      BattleUI.addHistory(enemyLabel, '#f90', '⚡ 高能模式');
      if (typeof Msg !== 'undefined') {
        Msg.warn('⚡ 守护者巨像激活高能模式！攻击附带离子伤害！');
      }
    }

    // Shield regeneration: restore 100 armor (up to maxArmor)
    const shieldRegenCD = enemy.phase2 ? 20 : 30;
    if (enemy.shieldRegenTimer <= 0) {
      const regenAmount = 100;
      const beforeArmor = enemy.armor;
      enemy.armor = Math.min(enemy.maxArmor, enemy.armor + regenAmount);
      const restored = enemy.armor - beforeArmor;
      BattleUI.addHistory(enemyLabel, '#6cf', '🛡 护盾再生');
      if (typeof Msg !== 'undefined' && restored > 0) {
        Msg.info(`🛡 守护者巨像启动护盾再生！恢复 ${restored} 点装甲。`);
      }
      enemy.shieldRegenTimer = shieldRegenCD;
    }

    // Special: 粒子束轰炸 (Particle Beam Bombardment)
    // Range 300m, damage 80, cooldown 30s
    if (enemy.specialTimer <= 0 && distToPlayer <= 300) {
      BattleUI.addHistory(enemyLabel, '#f90', '💥 粒子束轰炸');
      if (typeof Msg !== 'undefined') {
        Msg.damageEnemy('💥 守护者巨像发射粒子束轰炸！');
      }
      const result = Player.takeDamage(80, 'thermal');
      if (typeof Msg !== 'undefined' && result) {
        Msg.damageEnemy(`粒子束轰炸造成 ${result.total} 点伤害！`);
      }
      enemy.specialTimer = 30;
      Battle.scheduleNextEnemyTurn(enemy);
      return;
    }

    // Normal behavior: keep distance, attack when in range
    if (distToPlayer <= enemy.attackRange && enemy.attackTimer <= 0) {
      Battle.enemyAttack(enemy, Player.position);
      // Phase 2: additional ion damage after normal attack
      if (enemy.phase2) {
        const ionDmg = 20;
        const ionResult = Player.takeDamage(ionDmg, 'ion');
        if (typeof Msg !== 'undefined' && ionResult) {
          Msg.damageEnemy(`高能模式离子伤害附加 ${ionResult.total} 点！`);
        }
      }
    } else if (distToPlayer > enemy.attackRange) {
      // Player out of range, move closer
      this.moveTowardPlayer(enemy, battlefield);
    } else if (distToPlayer < enemy.attackRange * 0.35) {
      // Player too close, back away to maintain distance
      const dx = enemy.position[0] - Player.position[0];
      const dy = enemy.position[1] - Player.position[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = Math.min(dist, enemy.speed * 5);
      const ratio = moveDist / dist;
      const newPos = [
        enemy.position[0] + dx * ratio,
        enemy.position[1] + dy * ratio
      ];
      BattleUI.addHistory(enemyLabel, '#8af', '保持距离');
      Battle.startEnemyMove(enemy, newPos);
    } else {
      BattleUI.addHistory(enemyLabel, '#aaa', '待机');
      Battle.scheduleNextEnemyTurn(enemy);
    }
  },

  // ========== Boss Timer Management ==========
  updateBossTimers(enemy, delta) {
    if (enemy.aiType === 'boss_guardian') {
      if (enemy.specialTimer === undefined) enemy.specialTimer = 0;
      enemy.specialTimer = Math.max(0, enemy.specialTimer - delta);
    } else if (enemy.aiType === 'boss_colossus') {
      if (enemy.specialTimer === undefined) enemy.specialTimer = 0;
      if (enemy.shieldRegenTimer === undefined) enemy.shieldRegenTimer = 0;
      enemy.specialTimer = Math.max(0, enemy.specialTimer - delta);
      enemy.shieldRegenTimer = Math.max(0, enemy.shieldRegenTimer - delta);
    }
  },

  moveTowardPlayer(enemy, battlefield) {
    const dx = Player.position[0] - enemy.position[0];
    const dy = Player.position[1] - enemy.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveDist = Math.min(dist, enemy.speed * 5);
    const ratio = moveDist / dist;
    const newPos = [
      enemy.position[0] + dx * ratio,
      enemy.position[1] + dy * ratio
    ];
    Battle.startEnemyMove(enemy, newPos);
  },

  moveToward(enemy, target, battlefield) {
    const dx = target[0] - enemy.position[0];
    const dy = target[1] - enemy.position[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveDist = Math.min(dist, enemy.speed * 5);
    const ratio = moveDist / dist;
    const newPos = [
      enemy.position[0] + dx * ratio,
      enemy.position[1] + dy * ratio
    ];
    Battle.startEnemyMove(enemy, newPos);
  },

  doPatrol(enemy, battlefield) {
    if (!enemy.patrolPath || enemy.patrolPath.length === 0) return;
    if (enemy.patrolTimer > 0) {
      enemy.patrolTimer--;
      return;
    }
    const target = enemy.patrolPath[enemy.patrolIndex];
    const dist = this.getDistance(enemy.position, target);
    if (dist < 30) {
      enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
      enemy.patrolTimer = 30;
    }
  },

  findNearbyCover(enemy, battlefield) {
    if (!battlefield || !battlefield.covers) return null;
    let closestCover = null;
    let closestDist = Infinity;
    for (const cover of battlefield.covers) {
      const dist = this.getDistance(enemy.position, cover.pos);
      if (dist < 100 && dist < closestDist) {
        closestDist = dist;
        closestCover = cover;
      }
    }
    return closestCover;
  },

  doPatrolMove(enemy, battlefield) {
    const enemyLabel = `${enemy.name}[${enemy.instanceId}]`;
    if (!enemy.patrolPath || enemy.patrolPath.length === 0) {
      BattleUI.addHistory(enemyLabel, '#aaa', '待机');
      Battle.scheduleNextEnemyTurn(enemy);
      return;
    }
    const target = enemy.patrolPath[enemy.patrolIndex];
    const dist = this.getDistance(enemy.position, target);
    if (dist < 20) {
      enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
      BattleUI.addHistory(enemyLabel, '#8a8', '巡逻');
      Battle.scheduleNextEnemyTurn(enemy);
    } else {
      this.moveToward(enemy, target, battlefield);
    }
  },

  getDistance(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
};