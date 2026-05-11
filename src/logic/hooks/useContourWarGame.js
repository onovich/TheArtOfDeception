import { useEffect, useRef, useState } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEPLOY_ZONE,
  MAX_LOGS,
  SQUAD_MOVE_LABELS,
  SQUAD_ROLE_NAMES,
  SQUAD_TYPES,
  createSetupLogs,
  createSquadTargets,
  getArmyCommandAnchor,
  getInitialSquadAnchor,
} from '../../data/gameConfig.js';
import { Arrow, Particle } from '../engine/entities.js';
import { assignFormationTargets } from '../engine/formation.js';
import { spawnEnemyCamp, spawnPlayerArmy } from '../engine/spawners.js';
import { createEngineState } from '../engine/state.js';
import { getElevation, getHeightTier, hexToRgb, randomizeTerrainSeed } from '../engine/terrain.js';

export function useContourWarGame() {
  const canvasRef = useRef(null);
  const fowCanvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const animationFrameRef = useRef(0);
  const engine = useRef(createEngineState());

  const [gameState, setGameStateState] = useState('SETUP');
  const [level, setLevelState] = useState(1);
  const [logs, setLogs] = useState([]);
  const [selectedSquad, setSelectedSquadState] = useState(0);
  const [hoverElevation, setHoverElevationState] = useState('');
  const [weather, setWeatherState] = useState('CLEAR');

  const gameStateRef = useRef('SETUP');
  const levelRef = useRef(1);
  const selectedSquadRef = useRef(0);
  const hoverElevationRef = useRef('');
  const weatherRef = useRef('CLEAR');

  function setGameState(value) {
    gameStateRef.current = value;
    setGameStateState(value);
  }

  function setLevel(value) {
    levelRef.current = value;
    setLevelState(value);
  }

  function selectSquad(value) {
    selectedSquadRef.current = value;
    setSelectedSquadState(value);
  }

  function setHoverElevation(value) {
    hoverElevationRef.current = value;
    setHoverElevationState(value);
  }

  function setWeather(value) {
    weatherRef.current = value;
    setWeatherState(value);
  }

  function addLog(message) {
    const now = Date.now();

    if (now - engine.current.lastLogTime > 400) {
      setLogs((currentLogs) => [...currentLogs, message].slice(-MAX_LOGS));
      engine.current.lastLogTime = now;
    }
  }

  function initTerrain() {
    const backgroundCanvas = bgCanvasRef.current;
    const fogCanvas = fowCanvasRef.current;

    if (!backgroundCanvas || !fogCanvas) {
      return;
    }

    const backgroundContext = backgroundCanvas.getContext('2d', { alpha: false });
    const fogContext = fogCanvas.getContext('2d');
    const terrain = new Float32Array(CANVAS_WIDTH * CANVAS_HEIGHT);
    const imageData = backgroundContext.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let y = 0; y < CANVAS_HEIGHT; y += 1) {
      for (let x = 0; x < CANVAS_WIDTH; x += 1) {
        const heightValue = getElevation(x, y, CANVAS_WIDTH, CANVAS_HEIGHT);
        terrain[y * CANVAS_WIDTH + x] = heightValue;

        const tier = getHeightTier(heightValue);
        const isContour = heightValue % 0.2 < 0.012 || heightValue % 0.1 < 0.008;
        let rgb = hexToRgb(tier.color);

        if (isContour) {
          rgb = {
            r: rgb.r * 0.5,
            g: rgb.g * 0.5,
            b: rgb.b * 0.5,
          };
        }

        const index = (y * CANVAS_WIDTH + x) * 4;
        imageData.data[index] = rgb.r;
        imageData.data[index + 1] = rgb.g;
        imageData.data[index + 2] = rgb.b;
        imageData.data[index + 3] = 255;
      }
    }

    engine.current.terrain = terrain;
    backgroundContext.putImageData(imageData, 0, 0);
    fogContext.fillStyle = 'rgba(10, 15, 10, 0.98)';
    fogContext.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function getUnitElevation(x, y) {
    const clampedX = Math.floor(Math.max(0, Math.min(engine.current.width - 1, x)));
    const clampedY = Math.floor(Math.max(0, Math.min(engine.current.height - 1, y)));
    return engine.current.terrain[clampedY * engine.current.width + clampedX] || 0;
  }

  function startLevel(currentLevel) {
    randomizeTerrainSeed();

    const currentEngine = engine.current;
    currentEngine.units = [];
    currentEngine.arrows = [];
    currentEngine.particles = [];
    currentEngine.corpses = [];
    currentEngine.squadTargets = createSquadTargets();
    currentEngine.enemyCamps = [];
    currentEngine.state = 'SETUP';
    currentEngine.weather = 'CLEAR';
    currentEngine.lastLogTime = 0;

    setGameState('SETUP');
    setLevel(currentLevel);
    selectSquad(0);
    setHoverElevation('');
    setWeather('CLEAR');

    initTerrain();

    const campCount = 2 + Math.floor((currentLevel - 1) / 2);
    for (let campIndex = 0; campIndex < campCount; campIndex += 1) {
      const centerX = 550 + Math.random() * 200;
      const centerY = 100 + Math.random() * 400;
      spawnEnemyCamp(currentEngine.units, centerX, centerY, currentLevel);
      currentEngine.enemyCamps.push({ x: centerX, y: centerY });
    }

    setLogs(createSetupLogs(currentLevel));
  }

  function deployPlayerSquad(x, y) {
    if (engine.current.state !== 'SETUP') {
      return;
    }

    const distance = Math.hypot(x - DEPLOY_ZONE.x, y - DEPLOY_ZONE.y);
    if (distance > DEPLOY_ZONE.radius) {
      addLog('【警告】空降失败！必须在左侧蓝色信号区内降落！');
      return;
    }

    const currentEngine = engine.current;
    spawnPlayerArmy(currentEngine.units, x, y);
    currentEngine.state = 'BATTLE';
    setGameState('BATTLE');

    [1, 2, 3, 4].forEach((groupId) => {
      const type = SQUAD_TYPES[groupId];
      const anchor = getInitialSquadAnchor(groupId, x, y);
      assignFormationTargets(currentEngine.units, groupId, anchor.x, anchor.y, type);
      currentEngine.squadTargets[groupId] = anchor;
    });

    const general = currentEngine.units.find((unit) => unit.type === 'general');
    if (general) {
      general.targetPos = { x, y };
    }

    addLog('【军令】全军空降成功！各部正在结阵。');
    addLog('【提示】你可以直接点击地图上的[数字阵眼]来控制该小队。');
  }

  function updateFogOfWar(isFog) {
    const fogCanvas = fowCanvasRef.current;

    if (!fogCanvas) {
      return;
    }

    const currentEngine = engine.current;
    const fogContext = fogCanvas.getContext('2d');

    fogContext.globalCompositeOperation = 'source-over';
    fogContext.fillStyle = 'rgba(10, 15, 10, 0.03)';
    fogContext.fillRect(0, 0, currentEngine.width, currentEngine.height);
    fogContext.globalCompositeOperation = 'destination-out';

    currentEngine.units
      .filter((unit) => unit.team === 'blue')
      .forEach((unit) => {
        const tier = getHeightTier(getUnitElevation(unit.x, unit.y));
        let visionRange = unit.baseVision + tier.level * 40;

        if (isFog) {
          visionRange *= 0.4;
        }

        const gradient = fogContext.createRadialGradient(unit.x, unit.y, 0, unit.x, unit.y, visionRange);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        fogContext.fillStyle = gradient;
        fogContext.beginPath();
        fogContext.arc(unit.x, unit.y, visionRange, 0, Math.PI * 2);
        fogContext.fill();
      });

    fogContext.globalCompositeOperation = 'source-over';
  }

  function updateEngine() {
    const currentEngine = engine.current;
    if (currentEngine.state !== 'BATTLE') {
      return;
    }

    const isFog = currentEngine.weather === 'FOG';

    for (let index = currentEngine.particles.length - 1; index >= 0; index -= 1) {
      const particle = currentEngine.particles[index];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 1;

      if (particle.life <= 0) {
        currentEngine.particles.splice(index, 1);
      }
    }

    for (let index = currentEngine.arrows.length - 1; index >= 0; index -= 1) {
      const arrow = currentEngine.arrows[index];
      arrow.progress += arrow.speed;
      arrow.x = arrow.startX + (arrow.targetX - arrow.startX) * arrow.progress;
      arrow.y = arrow.startY + (arrow.targetY - arrow.startY) * arrow.progress;

      if (arrow.progress >= 1) {
        for (let particleIndex = 0; particleIndex < 5; particleIndex += 1) {
          currentEngine.particles.push(new Particle(arrow.targetX, arrow.targetY, '#aaa', 1.5, 10));
        }

        currentEngine.units.forEach((unit) => {
          if (Math.hypot(unit.x - arrow.targetX, unit.y - arrow.targetY) < 18) {
            unit.hp -= arrow.damage;

            if (unit.hp > 0) {
              for (let particleIndex = 0; particleIndex < 3; particleIndex += 1) {
                currentEngine.particles.push(new Particle(unit.x, unit.y, '#f00', 1, 15));
              }
            }
          }
        });

        currentEngine.arrows.splice(index, 1);
      }
    }

    let enemyCount = 0;
    let generalAlive = false;

    for (let index = currentEngine.units.length - 1; index >= 0; index -= 1) {
      const unit = currentEngine.units[index];

      if (unit.hp <= 0) {
        currentEngine.corpses.push({ x: unit.x, y: unit.y, team: unit.team });
        currentEngine.units.splice(index, 1);
        continue;
      }

      if (unit.team === 'red') {
        enemyCount += 1;
      }

      if (unit.type === 'general') {
        generalAlive = true;
      }

      const unitHeight = getUnitElevation(unit.x, unit.y);
      const unitTier = getHeightTier(unitHeight);
      let nearestEnemy = null;
      let minimumDistance = unit.baseRange + unitTier.level * 15;

      if (isFog) {
        minimumDistance *= 0.5;
      }

      currentEngine.units.forEach((enemy) => {
        if (enemy.team !== unit.team && enemy.hp > 0) {
          const distance = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
          if (distance < minimumDistance) {
            minimumDistance = distance;
            nearestEnemy = enemy;
          }
        }
      });

      unit.renderX += (unit.x - unit.renderX) * 0.3;
      unit.renderY += (unit.y - unit.renderY) * 0.3;

      if (nearestEnemy) {
        unit.vx *= 0.1;
        unit.vy *= 0.1;
        unit.attackTimer += 1;

        const enemyHeight = getUnitElevation(nearestEnemy.x, nearestEnemy.y);
        const isHighGround = unitHeight - enemyHeight > 0.15;
        const attackInterval = unit.type === 'archer' ? 90 : 40;

        if (unit.attackTimer > attackInterval) {
          unit.attackTimer = 0;

          let finalDamage = unit.damage;
          if (isHighGround) {
            finalDamage *= 1.8;
          }

          if (enemyHeight - unitHeight > 0.15) {
            finalDamage *= 0.4;
          }

          if (unit.type === 'archer') {
            currentEngine.arrows.push(new Arrow(unit.x, unit.y, nearestEnemy.x, nearestEnemy.y, finalDamage, isHighGround));
          } else {
            unit.renderX = unit.x + (nearestEnemy.x - unit.x) * 0.5;
            unit.renderY = unit.y + (nearestEnemy.y - unit.y) * 0.5;
            nearestEnemy.hp -= finalDamage;
            currentEngine.particles.push(new Particle(nearestEnemy.x, nearestEnemy.y, '#d22', 2, 20));
          }
        }
      } else {
        let forceX = 0;
        let forceY = 0;
        let targetPos = unit.targetPos;

        if (!targetPos && unit.team === 'red') {
          const blueTarget = currentEngine.units.find(
            (otherUnit) => otherUnit.team === 'blue' && Math.hypot(otherUnit.x - unit.x, otherUnit.y - unit.y) < 220
          );

          if (blueTarget) {
            if (unit.type === 'archer') {
              if (Math.hypot(blueTarget.x - unit.x, blueTarget.y - unit.y) < 100) {
                targetPos = {
                  x: unit.x + (unit.x - blueTarget.x),
                  y: unit.y + (unit.y - blueTarget.y),
                };
              } else {
                targetPos = { x: unit.x, y: unit.y };
              }
            } else {
              targetPos = { x: blueTarget.x, y: blueTarget.y };
            }
          } else {
            if (Math.random() < 0.02) {
              unit.patrolTarget = {
                x: unit.baseX + (Math.random() - 0.5) * 100,
                y: unit.baseY + (Math.random() - 0.5) * 100,
              };
            }

            targetPos = unit.patrolTarget || { x: unit.baseX, y: unit.baseY };
          }
        }

        if (targetPos) {
          const deltaX = targetPos.x - unit.x;
          const deltaY = targetPos.y - unit.y;
          const distance = Math.hypot(deltaX, deltaY);

          if (distance > 5) {
            forceX += (deltaX / distance) * unit.speed;
            forceY += (deltaY / distance) * unit.speed;
          }
        }

        currentEngine.units.forEach((otherUnit) => {
          if (otherUnit === unit) {
            return;
          }

          const deltaX = unit.x - otherUnit.x;
          const deltaY = unit.y - otherUnit.y;
          const distance = Math.hypot(deltaX, deltaY);

          if (distance > 0 && distance < 6) {
            forceX += (deltaX / distance) * 2.5;
            forceY += (deltaY / distance) * 2.5;
          }
        });

        const nextHeight = getUnitElevation(unit.x + forceX, unit.y + forceY);
        let movePenalty = 1;

        if (nextHeight - unitHeight > 0.04) {
          movePenalty = 0.3;
        } else if (nextHeight - unitHeight < -0.04) {
          movePenalty = 1.3;
        }

        unit.vx = unit.vx * 0.7 + forceX * 0.3;
        unit.vy = unit.vy * 0.7 + forceY * 0.3;
        unit.x += unit.vx * movePenalty;
        unit.y += unit.vy * movePenalty;
        unit.x = Math.max(5, Math.min(currentEngine.width - 5, unit.x));
        unit.y = Math.max(5, Math.min(currentEngine.height - 5, unit.y));
      }
    }

    updateFogOfWar(isFog);

    if (!generalAlive && currentEngine.state === 'BATTLE') {
      currentEngine.state = 'DEFEAT';
      setGameState('DEFEAT');
      addLog('【噩耗】主将阵亡！残存部队已溃散...');
    } else if (enemyCount === 0 && currentEngine.state === 'BATTLE' && currentEngine.units.length > 0) {
      currentEngine.state = 'VICTORY';
      setGameState('VICTORY');
      addLog('【捷报】成功剿灭敌军！夺取高地！');
    }
  }

  function renderFrame() {
    const canvas = canvasRef.current;
    const backgroundCanvas = bgCanvasRef.current;
    const fogCanvas = fowCanvasRef.current;

    if (!canvas || !backgroundCanvas || !fogCanvas) {
      return;
    }

    const currentEngine = engine.current;
    const context = canvas.getContext('2d');
    const currentSelectedSquad = selectedSquadRef.current;
    const currentHoverElevation = hoverElevationRef.current;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(backgroundCanvas, 0, 0);

    if (currentEngine.state === 'SETUP') {
      context.fillStyle = 'rgba(0, 10, 20, 0.6)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.arc(DEPLOY_ZONE.x, DEPLOY_ZONE.y, DEPLOY_ZONE.radius, 0, Math.PI * 2);
      context.fillStyle = 'rgba(68, 170, 238, 0.15)';
      context.fill();
      context.strokeStyle = `rgba(68, 170, 238, ${0.5 + 0.3 * Math.sin(Date.now() / 200)})`;
      context.lineWidth = 2;
      context.setLineDash([10, 10]);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = '#4ae';
      context.font = 'bold 16px monospace';
      context.textAlign = 'center';
      context.fillText('↓ 战术空降部署区 ↓', DEPLOY_ZONE.x, DEPLOY_ZONE.y - DEPLOY_ZONE.radius - 10);
      context.textAlign = 'left';

      currentEngine.enemyCamps.forEach((camp) => {
        context.beginPath();
        context.arc(camp.x, camp.y, 80, 0, Math.PI * 2);
        context.fillStyle = 'rgba(255, 50, 50, 0.1)';
        context.fill();
        context.strokeStyle = 'rgba(255, 50, 50, 0.4)';
        context.lineWidth = 1;
        context.stroke();
        context.fillStyle = '#f55';
        context.font = '12px monospace';
        context.textAlign = 'center';
        context.fillText('! 敌方主阵地 !', camp.x, camp.y);
      });

      context.textAlign = 'left';
    }

    currentEngine.corpses.forEach((corpse) => {
      context.save();
      context.translate(corpse.x, corpse.y);
      context.globalAlpha = 0.4;
      context.fillStyle = corpse.team === 'blue' ? '#254' : '#522';
      context.beginPath();
      context.moveTo(-3, -3);
      context.lineTo(3, 3);
      context.moveTo(3, -3);
      context.lineTo(-3, 3);
      context.strokeStyle = context.fillStyle;
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    });

    if (currentEngine.state === 'BATTLE' && currentSelectedSquad !== 0) {
      const target = currentEngine.squadTargets[currentSelectedSquad];

      if (target) {
        const units = currentEngine.units.filter(
          (unit) => unit.squadId === currentSelectedSquad && unit.team === 'blue'
        );

        if (units.length > 0) {
          const centerX = units.reduce((sum, unit) => sum + unit.x, 0) / units.length;
          const centerY = units.reduce((sum, unit) => sum + unit.y, 0) / units.length;
          context.beginPath();
          context.moveTo(centerX, centerY);
          context.lineTo(target.x, target.y);
          context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          context.lineWidth = 1;
          context.setLineDash([5, 5]);
          context.stroke();
          context.setLineDash([]);
        }
      }
    }

    for (let groupId = 1; groupId <= 4; groupId += 1) {
      const target = currentEngine.squadTargets[groupId];

      if (target && currentEngine.state !== 'SETUP') {
        context.beginPath();
        context.arc(target.x, target.y, 16, 0, Math.PI * 2);
        context.strokeStyle = groupId === currentSelectedSquad ? 'rgba(68, 170, 238, 0.9)' : 'rgba(255, 255, 255, 0.2)';
        context.lineWidth = groupId === currentSelectedSquad ? 2 : 1;
        context.stroke();
        context.fillStyle = groupId === currentSelectedSquad ? 'rgba(68, 170, 238, 0.2)' : 'rgba(0, 0, 0, 0)';
        context.fill();
        context.fillStyle = groupId === currentSelectedSquad ? '#4ae' : '#aaa';
        context.font = 'bold 12px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(groupId.toString(), target.x, target.y);
        context.textAlign = 'left';
        context.textBaseline = 'alphabetic';
      }
    }

    currentEngine.units.forEach((unit) => {
      if (currentEngine.state === 'SETUP') {
        return;
      }

      context.save();
      context.translate(unit.renderX, unit.renderY);

      if (unit.team === 'blue' && (currentSelectedSquad === 0 || unit.squadId === currentSelectedSquad)) {
        context.beginPath();
        context.arc(0, 0, 8, 0, Math.PI * 2);
        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fill();
      }

      context.fillStyle = unit.team === 'blue' ? '#4A90E2' : '#E24A4A';
      if (unit.type === 'general') {
        context.fillStyle = '#F5A623';
      }

      context.beginPath();
      if (unit.type === 'general') {
        for (let index = 0; index < 5; index += 1) {
          context.lineTo(
            6 * Math.cos(index * 2 * Math.PI / 5 - Math.PI / 2),
            6 * Math.sin(index * 2 * Math.PI / 5 - Math.PI / 2)
          );
        }
      } else if (unit.type === 'scout') {
        context.moveTo(0, -5);
        context.lineTo(3, 3);
        context.lineTo(-3, 3);
      } else if (unit.type === 'archer') {
        context.arc(0, 0, 3.5, 0, Math.PI * 2);
        context.strokeStyle = context.fillStyle;
        context.fillStyle = '#000';
        context.lineWidth = 1.5;
        context.stroke();
      } else {
        context.arc(0, 0, 3, 0, Math.PI * 2);
      }
      context.fill();

      if (unit.hp < unit.maxHp) {
        context.fillStyle = 'rgba(255,0,0,0.8)';
        context.fillRect(-5, -8, 10, 2);
        context.fillStyle = '#0f0';
        context.fillRect(-5, -8, 10 * (Math.max(0, unit.hp) / unit.maxHp), 2);
      }

      context.restore();
    });

    currentEngine.arrows.forEach((arrow) => {
      context.beginPath();
      context.moveTo(arrow.x, arrow.y);
      const tailX = arrow.x - (arrow.targetX - arrow.startX) * 0.08;
      const tailY = arrow.y - (arrow.targetY - arrow.startY) * 0.08;
      context.lineTo(tailX, tailY);
      context.strokeStyle = arrow.isHighGround ? '#F5A623' : '#ddd';
      context.lineWidth = 2;
      context.stroke();
    });

    currentEngine.particles.forEach((particle) => {
      context.fillStyle = particle.color;
      context.globalAlpha = particle.life / particle.maxLife;
      context.fillRect(particle.x, particle.y, 2, 2);
      context.globalAlpha = 1;
    });

    if (currentEngine.state !== 'SETUP') {
      context.drawImage(fogCanvas, 0, 0);
    }

    if (currentEngine.weather === 'FOG') {
      context.fillStyle = 'rgba(200, 210, 220, 0.15)';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (currentHoverElevation) {
      context.fillStyle = 'rgba(0,0,0,0.8)';
      context.fillRect(10, 10, 160, 35);
      context.fillStyle = '#4ae';
      context.font = '12px monospace';
      context.fillText(`地形侦测: ${currentHoverElevation}`, 20, 32);
    }
  }

  function handleCanvasClick(event) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (engine.current.state === 'SETUP') {
      deployPlayerSquad(x, y);
      return;
    }

    if (engine.current.state !== 'BATTLE') {
      return;
    }

    const currentEngine = engine.current;
    let clickedSquadId = null;

    for (let groupId = 1; groupId <= 4; groupId += 1) {
      const target = currentEngine.squadTargets[groupId];
      if (target && Math.hypot(x - target.x, y - target.y) < 20) {
        clickedSquadId = groupId;
        break;
      }
    }

    if (clickedSquadId !== null) {
      selectSquad(clickedSquadId);
      addLog(`【操作】已选中 ${SQUAD_ROLE_NAMES[clickedSquadId]}，请点击地图下达移动指令。`);
      return;
    }

    const targetHeight = getUnitElevation(x, y);
    const tier = getHeightTier(targetHeight);
    const currentSelectedSquad = selectedSquadRef.current;

    if (currentSelectedSquad === 0) {
      [1, 2, 3, 4].forEach((groupId) => {
        const type = SQUAD_TYPES[groupId];
        const anchor = getArmyCommandAnchor(groupId, x, y);
        assignFormationTargets(currentEngine.units, groupId, anchor.x, anchor.y, type);
        currentEngine.squadTargets[groupId] = anchor;
      });

      const general = currentEngine.units.find((unit) => unit.type === 'general');
      if (general) {
        general.targetPos = { x, y };
      }

      addLog(`【军令】全军向 ${tier.name} 区域压进！`);
      return;
    }

    const type = SQUAD_TYPES[currentSelectedSquad];
    assignFormationTargets(currentEngine.units, currentSelectedSquad, x, y, type);
    currentEngine.squadTargets[currentSelectedSquad] = { x, y };

    if (tier.level >= 3 && type === 'archer') {
      addLog('【兵法】占山为王：弓兵前往高地架设阵地。');
    } else if (tier.level === 0 && type === 'infantry') {
      addLog('【警告】洼地凶险：步兵进入低洼区易被集火！');
    } else {
      addLog(`【军令】${SQUAD_MOVE_LABELS[currentSelectedSquad]} 变阵，向目标区移动。`);
    }
  }

  function handleCanvasMouseMove(event) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setHoverElevation(getHeightTier(getUnitElevation(x, y)).name);
  }

  useEffect(() => {
    startLevel(1);

    const loop = () => {
      updateEngine();
      renderFrame();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return {
    bgCanvasRef,
    canvasRef,
    deployZone: DEPLOY_ZONE,
    fowCanvasRef,
    gameState,
    handleCanvasClick,
    handleCanvasMouseMove,
    hoverElevation,
    level,
    logs,
    selectSquad,
    selectedSquad,
    startLevel,
    weather,
  };
}