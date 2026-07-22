// ========== 敌人 AI 系统 ==========
const EnemyAI = {
  update(enemy, battlefield, delta = 1) {
    if (enemy.hp <= 0) return;

    const distToPlayer = this.getDistance(enemy.position, Player.position);
    const canSeePlayer = distToPlayer <= enemy.visionRadius;
    const hpPercent = enemy.hp / enemy.maxHp;

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
