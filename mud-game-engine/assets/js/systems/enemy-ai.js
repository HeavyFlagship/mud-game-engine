// ========== 敌人 AI 系统 ==========
const EnemyAI = {
  update(enemy, battlefield, delta = 1) {
    if (enemy.hp <= 0) return;

    const distToPlayer = this.getDistance(enemy.position, Player.position);
    const canSeePlayer = distToPlayer <= enemy.visionRadius;

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
      }
    } else if (enemy.state === 'search') {
      enemy.searchTimer = (enemy.searchTimer || 0) - delta;
      if (canSeePlayer) {
        enemy.state = 'pursue';
      } else if (enemy.searchTimer <= 0) {
        enemy.state = 'idle';
      }
    }
  },
 
  takeTurn(enemy, battlefield) {
    if (enemy.hp <= 0) return;
 
    const distToPlayer = this.getDistance(enemy.position, Player.position);
 
    if (enemy.state === 'pursue' || enemy.state === 'alert') {
      if (distToPlayer <= enemy.attackRange && enemy.attackTimer <= 0) {
        Battle.enemyAttack(enemy, Player.position);
      } else if (distToPlayer > enemy.attackRange * 0.5) {
        this.moveTowardPlayer(enemy, battlefield);
      } else {
        Battle.scheduleNextEnemyTurn(enemy);
      }
    } else if (enemy.state === 'search') {
      if (enemy.searchPos) {
        const searchDist = this.getDistance(enemy.position, enemy.searchPos);
        if (searchDist > 20) {
          this.moveToward(enemy, enemy.searchPos, battlefield);
        } else {
          Battle.scheduleNextEnemyTurn(enemy);
        }
      } else {
        Battle.scheduleNextEnemyTurn(enemy);
      }
    } else if (enemy.patrolPattern === 'patrol' && enemy.patrolPath) {
      this.doPatrolMove(enemy, battlefield);
    } else {
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
  },
 
  doPatrolMove(enemy, battlefield) {
    if (!enemy.patrolPath || enemy.patrolPath.length === 0) {
      Battle.scheduleNextEnemyTurn(enemy);
      return;
    }
    const target = enemy.patrolPath[enemy.patrolIndex];
    const dist = this.getDistance(enemy.position, target);
    if (dist < 20) {
      enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
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
