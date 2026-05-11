import { Unit } from './entities.js';

export function spawnEnemyCamp(units, centerX, centerY, level) {
  const infantryCount = 8 + level * 2;
  const archerCount = 4 + level * 2;

  for (let index = 0; index < infantryCount; index += 1) {
    units.push(new Unit(centerX + Math.random() * 60 - 30, centerY + Math.random() * 60 - 30, 'red', 'red', 'infantry', index));
  }

  for (let index = 0; index < archerCount; index += 1) {
    units.push(new Unit(centerX + Math.random() * 40 - 20, centerY + Math.random() * 40 - 20, 'red', 'red_archer', 'archer', index));
  }
}

export function spawnPlayerArmy(units, x, y) {
  units.push(new Unit(x, y, 'blue', 0, 'general', 0));

  for (let index = 0; index < 10; index += 1) {
    units.push(new Unit(x - 30 + Math.random() * 20, y - 30 + Math.random() * 20, 'blue', 1, 'infantry', index));
  }

  for (let index = 0; index < 10; index += 1) {
    units.push(new Unit(x + 30 + Math.random() * 20, y + 30 + Math.random() * 20, 'blue', 2, 'infantry', index));
  }

  for (let index = 0; index < 10; index += 1) {
    units.push(new Unit(x - 30 + Math.random() * 20, y + 30 + Math.random() * 20, 'blue', 3, 'archer', index));
  }

  for (let index = 0; index < 5; index += 1) {
    units.push(new Unit(x + 40 + Math.random() * 20, y - 20 + Math.random() * 20, 'blue', 4, 'scout', index));
  }
}