export class Unit {
  constructor(x, y, team, squadId, type, indexInSquad = 0) {
    this.x = x;
    this.y = y;
    this.renderX = x;
    this.renderY = y;
    this.baseX = x;
    this.baseY = y;
    this.team = team;
    this.squadId = squadId;
    this.type = type;
    this.indexInSquad = indexInSquad;
    this.vx = 0;
    this.vy = 0;
    this.hp = type === 'general' ? 300 : type === 'scout' ? 35 : type === 'archer' ? 45 : 70;
    this.maxHp = this.hp;
    this.attackTimer = 0;
    this.speed = type === 'scout' ? 1.8 : type === 'general' ? 0.9 : 0.6;
    this.baseRange = type === 'archer' ? 150 : 20;
    this.baseVision = type === 'scout' ? 240 : 100;
    this.damage = type === 'scout' ? 4 : type === 'archer' ? 12 : 8;
    this.targetPos = null;
    this.patrolTarget = null;
  }
}

export class Arrow {
  constructor(sx, sy, tx, ty, damage, isHighGround) {
    this.x = sx;
    this.y = sy;
    this.startX = sx;
    this.startY = sy;
    this.targetX = tx;
    this.targetY = ty;
    this.damage = damage;
    this.isHighGround = isHighGround;
    this.progress = 0;
    this.speed = 0.04;
  }
}

export class Particle {
  constructor(x, y, color, speed, life) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * speed;
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    this.color = color;
    this.life = life;
    this.maxLife = life;
  }
}