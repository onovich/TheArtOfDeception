import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// 1. 核心数学与地形生成 (Math & Terrain)
// ==========================================
let SEED = Math.random(); 
function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) ^ Math.floor(SEED * 10000);
    h = (h ^ (h >> 13)) * 1274126177;
    return h ^ (h >> 16);
}

function noise(x, y) {
    const ix = Math.floor(x); const iy = Math.floor(y);
    const fx = x - ix; const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx); const uy = fy * fy * (3 - 2 * fy);
    const v00 = (hash(ix, iy) % 1000) / 1000; const v10 = (hash(ix + 1, iy) % 1000) / 1000;
    const v01 = (hash(ix, iy + 1) % 1000) / 1000; const v11 = (hash(ix + 1, iy + 1) % 1000) / 1000;
    return v00 * (1 - ux) * (1 - uy) + v10 * ux * (1 - uy) + v01 * (1 - ux) * uy + v11 * ux * uy;
}

function getElevation(x, y, width, height) {
    const nx = x / width;
    const ny = y / height;
    
    let e = 1.0 * noise(nx * 5, ny * 5) + 0.5 * noise(nx * 10, ny * 10) + 0.25 * noise(nx * 20, ny * 20);
    e = e / 1.75; 

    // 策略性地形干预：强制让右侧（敌占区）出现高地，左侧出现低谷/平原
    const bias = (nx - 0.4) * 0.4; 
    
    const waveDirX = (Math.floor(SEED * 10) % 3) + 2; 
    const sineWave = Math.sin(nx * Math.PI * waveDirX + ny * Math.PI * 2) * 0.1;
    return Math.max(0, Math.min(1, e + bias + sineWave));
}

function getHeightTier(h) {
    if (h < 0.3) return { level: 0, color: '#1B291D', name: '洼地 (易受伏击)' };
    if (h < 0.5) return { level: 1, color: '#2B422F', name: '平原 (适宜行军)' };
    if (h < 0.7) return { level: 2, color: '#536B46', name: '丘陵 (侧翼掩护)' };
    if (h < 0.85) return { level: 3, color: '#857F5D', name: '高地 (视野射程+)' };
    return { level: 4, color: '#B3B1A6', name: '险峰 (绝佳阵地)' };
}

// ==========================================
// 2. 游戏实体与视觉系统 (Entities & VFX)
// ==========================================
class Unit {
    constructor(x, y, team, squadId, type, indexInSquad = 0) {
        this.x = x; this.y = y;
        this.renderX = x; this.renderY = y; // 渲染坐标（用于攻击冲刺表现）
        this.baseX = x; this.baseY = y; 
        this.team = team;
        this.squadId = squadId;
        this.type = type; 
        this.indexInSquad = indexInSquad;
        
        this.vx = 0; this.vy = 0;
        this.hp = type === 'general' ? 300 : (type === 'scout' ? 35 : (type === 'archer' ? 45 : 70));
        this.maxHp = this.hp;
        this.attackTimer = 0;
        
        // 数值强化策略性：斥候极快但脆，步兵较慢但肉
        this.speed = type === 'scout' ? 1.8 : (type === 'general' ? 0.9 : 0.6);
        this.baseRange = type === 'archer' ? 150 : 20;
        this.baseVision = type === 'scout' ? 240 : 100;
        this.damage = type === 'scout' ? 4 : (type === 'archer' ? 12 : 8);
        
        this.targetPos = null; 
        this.patrolTarget = null;
    }
}

class Arrow {
    constructor(sx, sy, tx, ty, damage, isHighGround) {
        this.x = sx; this.y = sy;
        this.startX = sx; this.startY = sy;
        this.targetX = tx; this.targetY = ty;
        this.damage = damage;
        this.isHighGround = isHighGround;
        this.progress = 0;
        this.speed = 0.04; 
    }
}

class Particle {
    constructor(x, y, color, speed, life) {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const v = Math.random() * speed;
        this.vx = Math.cos(angle) * v;
        this.vy = Math.sin(angle) * v;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }
}

// ==========================================
// 3. React 主组件 (Game Engine & UI)
// ==========================================
export default function App() {
    const canvasRef = useRef(null);
    const fowCanvasRef = useRef(null); 
    const bgCanvasRef = useRef(null);  
    
    const [gameState, setGameState] = useState('SETUP'); 
    const [level, setLevel] = useState(1);
    const [logs, setLogs] = useState([]);
    const [selectedSquad, setSelectedSquad] = useState(0); 
    const [hoverElevation, setHoverElevation] = useState('');
    const [weather, setWeather] = useState('CLEAR'); 
    
    // 部署区域限制 (左侧)
    const deployZone = { x: 120, y: 300, radius: 100 };
    
    const engine = useRef({
        state: 'SETUP',   
        weather: 'CLEAR', 
        units: [],
        arrows: [],
        particles: [],
        corpses: [], // 尸骸遗迹
        squadTargets: { 0: null, 1: null, 2: null, 3: null, 4: null },
        width: 800, height: 600,
        terrain: [], 
        lastLogTime: 0,
        enemyCamps: [] 
    });

    const addLog = (msg) => {
        const now = Date.now();
        if (now - engine.current.lastLogTime > 400) { 
            setLogs(prev => [...prev, msg].slice(-8));
            engine.current.lastLogTime = now;
        }
    };

    useEffect(() => {
        startLevel(1);
        requestAnimationFrame(gameLoop);
    }, []);

    const startLevel = (currentLevel) => {
        SEED = Math.random(); 
        const eng = engine.current;
        eng.units = []; eng.arrows = []; eng.particles = []; eng.corpses = [];
        eng.squadTargets = { 0: null, 1: null, 2: null, 3: null, 4: null };
        eng.enemyCamps = []; eng.state = 'SETUP'; eng.weather = 'CLEAR';
        
        setGameState('SETUP'); setLevel(currentLevel);
        setSelectedSquad(0); setWeather('CLEAR');
        
        initTerrain();
        
        // 生成敌军：越往后高地弓兵越多
        const numCamps = 2 + Math.floor((currentLevel - 1) / 2); 
        for(let i = 0; i < numCamps; i++) {
            // 敌军固定在右侧高地山脉区域生成
            let cx = 550 + Math.random() * 200;
            let cy = 100 + Math.random() * 400; 
            spawnEnemyCamp(cx, cy, currentLevel);
            eng.enemyCamps.push({x: cx, y: cy});
        }
        
        setLogs([
            `【战役】第 ${currentLevel} 战区已锁定。`,
            '【军机处】敌军主力已盘踞右侧高地，切勿无脑仰攻！', 
            '【指示】请在左侧【蓝色降落区】内点击部署我军。'
        ]);
    };

    const initTerrain = () => {
        const { width, height } = engine.current;
        if (!bgCanvasRef.current || !fowCanvasRef.current) return;
        const bgCtx = bgCanvasRef.current.getContext('2d', { alpha: false });
        engine.current.terrain = new Float32Array(width * height);
        const imageData = bgCtx.createImageData(width, height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const h = getElevation(x, y, width, height);
                engine.current.terrain[y * width + x] = h;
                const tier = getHeightTier(h);
                const isContour = (h % 0.2 < 0.012) || (h % 0.1 < 0.008);
                
                let rgb = hexToRgb(tier.color);
                if (isContour) rgb = { r: rgb.r * 0.5, g: rgb.g * 0.5, b: rgb.b * 0.5 };

                const index = (y * width + x) * 4;
                imageData.data[index] = rgb.r; imageData.data[index+1] = rgb.g;
                imageData.data[index+2] = rgb.b; imageData.data[index+3] = 255;
            }
        }
        bgCtx.putImageData(imageData, 0, 0);
        
        const fowCtx = fowCanvasRef.current.getContext('2d');
        fowCtx.fillStyle = 'rgba(10, 15, 10, 0.98)';
        fowCtx.fillRect(0, 0, width, height);
    };

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
    };

    const spawnEnemyCamp = (cx, cy, level) => {
        const eng = engine.current;
        // 敌军配置：步兵抗线，弓兵守高地
        const infCount = 8 + level * 2;
        const archerCount = 4 + level * 2;
        for(let i=0; i<infCount; i++) eng.units.push(new Unit(cx + Math.random()*60-30, cy + Math.random()*60-30, 'red', 'red', 'infantry', i));
        for(let i=0; i<archerCount; i++) eng.units.push(new Unit(cx + Math.random()*40-20, cy + Math.random()*40-20, 'red', 'red_archer', 'archer', i));
    };

    const deployPlayerSquad = (x, y) => {
        if (engine.current.state !== 'SETUP') return;
        
        // 检查是否在部署区内
        const dist = Math.hypot(x - deployZone.x, y - deployZone.y);
        if (dist > deployZone.radius) {
            addLog('【警告】空降失败！必须在左侧蓝色信号区内降落！');
            return;
        }

        const eng = engine.current;
        eng.units.push(new Unit(x, y, 'blue', 0, 'general', 0));
        for(let i=0; i<10; i++) eng.units.push(new Unit(x-30 + Math.random()*20, y-30 + Math.random()*20, 'blue', 1, 'infantry', i));
        for(let i=0; i<10; i++) eng.units.push(new Unit(x+30 + Math.random()*20, y+30 + Math.random()*20, 'blue', 2, 'infantry', i));
        for(let i=0; i<10; i++) eng.units.push(new Unit(x-30 + Math.random()*20, y+30 + Math.random()*20, 'blue', 3, 'archer', i));
        for(let i=0; i<5; i++) eng.units.push(new Unit(x+40 + Math.random()*20, y-20 + Math.random()*20, 'blue', 4, 'scout', i));
        
        eng.state = 'BATTLE';
        setGameState('BATTLE');
        
        [1,2,3,4].forEach(id => {
            const type = id===3 ? 'archer' : (id===4 ? 'scout' : 'infantry');
            // 散开点阵
            let tx = x + (id===1?-50:(id===2?50:(id===3?0:80)));
            let ty = y + (id===1?-20:(id===2?-20:(id===3?40:0)));
            assignFormationTargets(id, tx, ty, type);
            eng.squadTargets[id] = {x: tx, y: ty};
        });
        const gen = eng.units.find(u => u.type === 'general');
        if(gen) gen.targetPos = {x, y};

        addLog('【军令】全军空降成功！各部正在结阵。');
        addLog('【提示】你可以直接点击地图上的[数字阵眼]来控制该小队。');
    };

    const getUnitElevation = (x, y) => {
        const ix = Math.floor(Math.max(0, Math.min(engine.current.width - 1, x)));
        const iy = Math.floor(Math.max(0, Math.min(engine.current.height - 1, y)));
        return engine.current.terrain[iy * engine.current.width + ix] || 0;
    };

    const assignFormationTargets = (squadId, tx, ty, type) => {
        const squadUnits = engine.current.units.filter(u => u.team === 'blue' && u.squadId === squadId);
        if (squadUnits.length === 0) return;

        squadUnits.forEach(u => {
            let ox = 0, oy = 0;
            if (type === 'archer') {
                ox = (u.indexInSquad - squadUnits.length/2) * 14;
                oy = (u.indexInSquad % 2 === 0 ? 6 : -6);
            } else if (type === 'scout') {
                ox = (Math.random() - 0.5) * 80;
                oy = (Math.random() - 0.5) * 80;
            } else {
                const cols = 5;
                const row = Math.floor(u.indexInSquad / cols);
                const col = u.indexInSquad % cols;
                ox = (col - Math.floor(cols/2)) * 12;
                oy = (row - 1) * 12;
            }
            u.targetPos = { x: tx + ox, y: ty + oy };
        });
    };

    // ==========================================
    // 游戏核心运算逻辑 (更新帧)
    // ==========================================
    const gameLoop = () => {
        updateEngine();
        renderFrame();
        requestAnimationFrame(gameLoop);
    };

    const updateEngine = () => {
        const eng = engine.current;
        if (eng.state !== 'BATTLE') return; 
        const isFog = eng.weather === 'FOG';
        
        // 1. 处理粒子系统 (血液、火花)
        for(let i = eng.particles.length-1; i>=0; i--) {
            let p = eng.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life--;
            if(p.life <= 0) eng.particles.splice(i, 1);
        }

        // 2. 处理飞矢
        for (let i = eng.arrows.length - 1; i >= 0; i--) {
            let arrow = eng.arrows[i];
            arrow.progress += arrow.speed;
            arrow.x = arrow.startX + (arrow.targetX - arrow.startX) * arrow.progress;
            arrow.y = arrow.startY + (arrow.targetY - arrow.startY) * arrow.progress;
            
            if (arrow.progress >= 1) {
                // 箭矢命中爆炸粒子
                for(let k=0; k<5; k++) eng.particles.push(new Particle(arrow.targetX, arrow.targetY, '#aaa', 1.5, 10));
                
                eng.units.forEach(u => {
                    if (Math.hypot(u.x - arrow.targetX, u.y - arrow.targetY) < 18) {
                        u.hp -= arrow.damage;
                        // 飙血粒子
                        if(u.hp > 0) for(let k=0; k<3; k++) eng.particles.push(new Particle(u.x, u.y, '#f00', 1, 15));
                    }
                });
                eng.arrows.splice(i, 1);
            }
        }

        // 3. 单位AI与物理更新
        let enemyCount = 0;
        let generalAlive = false;

        for (let i = eng.units.length - 1; i >= 0; i--) {
            let u = eng.units[i];
            if (u.hp <= 0) {
                // 生成永久尸骸
                eng.corpses.push({x: u.x, y: u.y, team: u.team});
                eng.units.splice(i, 1);
                continue;
            }

            if (u.team === 'red') enemyCount++;
            if (u.type === 'general') generalAlive = true;

            const hUnit = getUnitElevation(u.x, u.y);
            const tierUnit = getHeightTier(hUnit);

            let nearestEnemy = null;
            let minDist = u.baseRange + (tierUnit.level * 15); 
            if (isFog) minDist *= 0.5; 
            
            // 索敌
            for (let e of eng.units) {
                if (e.team !== u.team && e.hp > 0) {
                    let d = Math.hypot(e.x - u.x, e.y - u.y);
                    if (d < minDist) { minDist = d; nearestEnemy = e; }
                }
            }

            // 恢复渲染坐标 (近战动画重置)
            u.renderX += (u.x - u.renderX) * 0.3;
            u.renderY += (u.y - u.renderY) * 0.3;

            if (nearestEnemy) {
                u.vx *= 0.1; u.vy *= 0.1; 
                u.attackTimer += 1;
                
                const hEnemy = getUnitElevation(nearestEnemy.x, nearestEnemy.y);
                const isHighGround = (hUnit - hEnemy) > 0.15; 
                let attackInterval = u.type === 'archer' ? 90 : 40;
                
                if (u.attackTimer > attackInterval) {
                    u.attackTimer = 0;
                    let finalDmg = u.damage;
                    if (isHighGround) finalDmg *= 1.8; // 放大高地收益
                    if ((hEnemy - hUnit) > 0.15) finalDmg *= 0.4; // 仰攻严重削弱

                    if (u.type === 'archer') {
                        eng.arrows.push(new Arrow(u.x, u.y, nearestEnemy.x, nearestEnemy.y, finalDmg, isHighGround));
                    } else {
                        // 近战刺击动画表现 (身体前倾)
                        u.renderX = u.x + (nearestEnemy.x - u.x) * 0.5;
                        u.renderY = u.y + (nearestEnemy.y - u.y) * 0.5;
                        nearestEnemy.hp -= finalDmg;
                        // 飙血
                        eng.particles.push(new Particle(nearestEnemy.x, nearestEnemy.y, '#d22', 2, 20));
                    }
                }
            } else {
                let fx = 0, fy = 0;
                let targetPos = u.targetPos;
                
                // 敌方智能AI：红方弓兵寻找高地，步兵迎击
                if (!targetPos && u.team === 'red') {
                    let redNearest = eng.units.find(e => e.team === 'blue' && Math.hypot(e.x-u.x, e.y-u.y) < 220);
                    if (redNearest) {
                        if (u.type === 'archer') {
                            // 敌方弓兵：保持距离，尝试往高处走
                            if(Math.hypot(redNearest.x-u.x, redNearest.y-u.y) < 100) {
                                targetPos = {x: u.x + (u.x-redNearest.x), y: u.y + (u.y-redNearest.y)}; // 逃跑
                            } else { targetPos = {x: u.x, y: u.y}; } // 原地射击
                        } else {
                            targetPos = {x: redNearest.x, y: redNearest.y}; // 步兵冲锋
                        }
                    } else {
                        if (Math.random() < 0.02) u.patrolTarget = { x: u.baseX + (Math.random()-0.5)*100, y: u.baseY + (Math.random()-0.5)*100 };
                        targetPos = u.patrolTarget || { x: u.baseX, y: u.baseY }; 
                    }
                }

                if (targetPos) {
                    let dx = targetPos.x - u.x; let dy = targetPos.y - u.y;
                    let dist = Math.hypot(dx, dy);
                    if (dist > 5) { fx += (dx / dist) * u.speed; fy += (dy / dist) * u.speed; }
                }

                // 防重叠避让
                for (let other of eng.units) {
                    if (other !== u) {
                        let dx = u.x - other.x; let dy = u.y - other.y;
                        let dist = Math.hypot(dx, dy);
                        if (dist < 6) { fx += (dx / dist) * 2.5; fy += (dy / dist) * 2.5; }
                    }
                }
                
                // 地形阻力
                const nextH = getUnitElevation(u.x + fx, u.y + fy);
                let movePenalty = 1.0;
                if (nextH - hUnit > 0.04) movePenalty = 0.3; // 爬陡坡巨慢
                else if (nextH - hUnit < -0.04) movePenalty = 1.3; 

                u.vx = u.vx * 0.7 + fx * 0.3; u.vy = u.vy * 0.7 + fy * 0.3;
                u.x += u.vx * movePenalty; u.y += u.vy * movePenalty;
                u.x = Math.max(5, Math.min(eng.width-5, u.x));
                u.y = Math.max(5, Math.min(eng.height-5, u.y));
            }
        }
        
        updateFOW(isFog);

        // 胜负判定
        if (!generalAlive && eng.state === 'BATTLE') {
            eng.state = 'DEFEAT'; setGameState('DEFEAT');
            addLog('【噩耗】主将阵亡！残存部队已溃散...');
        } else if (enemyCount === 0 && eng.state === 'BATTLE' && eng.units.length > 0) {
            eng.state = 'VICTORY'; setGameState('VICTORY');
            addLog('【捷报】成功剿灭敌军！夺取高地！');
        }
    };

    const updateFOW = (isFog) => {
        const eng = engine.current;
        const fowCtx = fowCanvasRef.current.getContext('2d');
        
        fowCtx.globalCompositeOperation = 'source-over';
        fowCtx.fillStyle = 'rgba(10, 15, 10, 0.03)';
        fowCtx.fillRect(0, 0, eng.width, eng.height);

        fowCtx.globalCompositeOperation = 'destination-out';
        eng.units.filter(u => u.team === 'blue').forEach(u => {
            const tier = getHeightTier(getUnitElevation(u.x, u.y));
            let visionRange = u.baseVision + (tier.level * 40); 
            if (isFog) visionRange *= 0.4; 
            
            const gradient = fowCtx.createRadialGradient(u.x, u.y, 0, u.x, u.y, visionRange);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            fowCtx.fillStyle = gradient;
            fowCtx.beginPath(); fowCtx.arc(u.x, u.y, visionRange, 0, Math.PI * 2); fowCtx.fill();
        });
        fowCtx.globalCompositeOperation = 'source-over';
    };

    // ==========================================
    // 渲染系统 (Render)
    // ==========================================
    const renderFrame = () => {
        const eng = engine.current;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. 地形底图
        ctx.drawImage(bgCanvasRef.current, 0, 0);

        // ==== SETUP 阶段部署圈 ====
        if (eng.state === 'SETUP') {
            ctx.fillStyle = 'rgba(0, 10, 20, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 蓝色部署圈
            ctx.beginPath();
            ctx.arc(deployZone.x, deployZone.y, deployZone.radius, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(68, 170, 238, 0.15)';
            ctx.fill();
            ctx.strokeStyle = `rgba(68, 170, 238, ${0.5 + 0.3 * Math.sin(Date.now() / 200)})`;
            ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#4ae'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
            ctx.fillText('↓ 战术空降部署区 ↓', deployZone.x, deployZone.y - deployZone.radius - 10);
            ctx.textAlign = 'left';
            
            // 敌方雷达预警
            eng.enemyCamps.forEach(camp => {
                ctx.beginPath(); ctx.arc(camp.x, camp.y, 80, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(255, 50, 50, 0.1)'; ctx.fill();
                ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = '#f55'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('! 敌方主阵地 !', camp.x, camp.y);
            });
            ctx.textAlign = 'left';
        }

        // 2. 绘制尸骸遗迹 (永久留在战场)
        eng.corpses.forEach(c => {
            ctx.save(); ctx.translate(c.x, c.y);
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = c.team === 'blue' ? '#254' : '#522';
            // 画一个倒下的叉叉代表尸体
            ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3);
            ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth=2; ctx.stroke();
            ctx.restore();
        });

        // 3. 选中目标的指令连线 (增强交互反馈)
        if (eng.state === 'BATTLE' && selectedSquad !== 0) {
            const target = eng.squadTargets[selectedSquad];
            if (target) {
                // 找到该组的中心点
                let units = eng.units.filter(u => u.squadId === selectedSquad && u.team === 'blue');
                if (units.length > 0) {
                    let cx = units.reduce((sum, u) => sum + u.x, 0) / units.length;
                    let cy = units.reduce((sum, u) => sum + u.y, 0) / units.length;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx, cy); ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                }
            }
        }

        // 4. 小队阵眼指示器 (可以直接点击的地方)
        for (let i = 1; i <= 4; i++) {
            let target = eng.squadTargets[i];
            if (target && eng.state !== 'SETUP') {
                ctx.beginPath();
                ctx.arc(target.x, target.y, 16, 0, Math.PI*2);
                ctx.strokeStyle = i === selectedSquad ? 'rgba(68, 170, 238, 0.9)' : 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = i === selectedSquad ? 2 : 1;
                ctx.stroke();
                
                // 绘制阵眼底色方便点击
                ctx.fillStyle = i === selectedSquad ? 'rgba(68, 170, 238, 0.2)' : 'rgba(0,0,0,0)';
                ctx.fill();

                ctx.fillStyle = i === selectedSquad ? '#4ae' : '#aaa';
                ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(i.toString(), target.x, target.y);
                ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            }
        }

        // 5. 存活单位绘制
        eng.units.forEach(u => {
            if (eng.state === 'SETUP') return;
            ctx.save();
            ctx.translate(u.renderX, u.renderY); // 使用渲染坐标以体现冲撞动画
            
            // 选中光环
            if (u.team === 'blue' && (selectedSquad === 0 || u.squadId === selectedSquad)) {
                ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
            }

            ctx.fillStyle = u.team === 'blue' ? '#4A90E2' : '#E24A4A';
            if (u.type === 'general') ctx.fillStyle = '#F5A623'; 
            
            ctx.beginPath();
            if (u.type === 'general') { // 菱形将军
                for(let i=0; i<5; i++) ctx.lineTo(6 * Math.cos(i * 2 * Math.PI / 5 - Math.PI/2), 6 * Math.sin(i * 2 * Math.PI / 5 - Math.PI/2));
            } else if (u.type === 'scout') {  // 细长三角
                ctx.moveTo(0, -5); ctx.lineTo(3, 3); ctx.lineTo(-3, 3);
            } else if (u.type === 'archer') { // 空心带点
                ctx.arc(0, 0, 3.5, 0, Math.PI*2);
                ctx.strokeStyle = ctx.fillStyle; ctx.fillStyle = '#000';
                ctx.lineWidth = 1.5; ctx.stroke();
            } else { // 步兵实心
                ctx.arc(0, 0, 3, 0, Math.PI*2);
            }
            ctx.fill();
            
            // 血条
            if (u.hp < u.maxHp) {
                ctx.fillStyle = 'rgba(255,0,0,0.8)'; ctx.fillRect(-5, -8, 10, 2);
                ctx.fillStyle = '#0f0'; ctx.fillRect(-5, -8, 10 * (Math.max(0, u.hp)/u.maxHp), 2);
            }
            ctx.restore();
        });

        // 6. 飞矢与粒子绘制
        eng.arrows.forEach(a => {
            ctx.beginPath(); ctx.moveTo(a.x, a.y);
            const tailX = a.x - (a.targetX - a.startX) * 0.08;
            const tailY = a.y - (a.targetY - a.startY) * 0.08;
            ctx.lineTo(tailX, tailY);
            ctx.strokeStyle = a.isHighGround ? '#F5A623' : '#ddd'; // 高地箭矢变金色
            ctx.lineWidth = 2; ctx.stroke();
        });

        eng.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillRect(p.x, p.y, 2, 2);
            ctx.globalAlpha = 1;
        });

        // 7. 迷雾与 UI 滤镜
        if (eng.state !== 'SETUP') ctx.drawImage(fowCanvasRef.current, 0, 0);

        if (eng.weather === 'FOG') {
            ctx.fillStyle = 'rgba(200, 210, 220, 0.15)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        if (hoverElevation) {
           ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(10, 10, 160, 35);
           ctx.fillStyle = '#4ae'; ctx.font = '12px monospace';
           ctx.fillText(`地形侦测: ${hoverElevation}`, 20, 32);
        }
    };

    // ==========================================
    // 鼠标交互系统 (直接点击沙盘操作)
    // ==========================================
    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;

        if (engine.current.state === 'SETUP') {
            deployPlayerSquad(x, y);
        } else if (engine.current.state === 'BATTLE') {
            const eng = engine.current;
            
            // 1. 优先判定是否点中了某个“阵眼”（用于切换选择的小队）
            let clickedSquadId = null;
            for (let i = 1; i <= 4; i++) {
                let target = eng.squadTargets[i];
                if (target && Math.hypot(x - target.x, y - target.y) < 20) {
                    clickedSquadId = i;
                    break;
                }
            }

            if (clickedSquadId !== null) {
                // 点中了阵眼，切换选择
                setSelectedSquad(clickedSquadId);
                const roleName = {1:'1组(步兵)', 2:'2组(步兵)', 3:'3组(弓箭)', 4:'4组(斥候)'}[clickedSquadId];
                addLog(`【操作】已选中 ${roleName}，请点击地图下达移动指令。`);
                return; // 直接返回，不触发移动
            }

            // 2. 如果没点中阵眼，则是下达移动/攻击指令
            const targetH = getUnitElevation(x, y);
            const tier = getHeightTier(targetH);

            if (selectedSquad === 0) {
                 [1,2,3,4].forEach(id => {
                     const type = id===3 ? 'archer' : (id===4 ? 'scout' : 'infantry');
                     assignFormationTargets(id, x + (id-2.5)*30, y + (id%2)*20, type);
                     eng.squadTargets[id] = {x: x + (id-2.5)*30, y: y + (id%2)*20};
                 });
                 const gen = eng.units.find(u => u.type === 'general');
                 if(gen) gen.targetPos = {x, y};
                 addLog(`【军令】全军向 ${tier.name} 区域压进！`);
            } else {
                 const type = selectedSquad===3 ? 'archer' : (selectedSquad===4 ? 'scout' : 'infantry');
                 assignFormationTargets(selectedSquad, x, y, type);
                 eng.squadTargets[selectedSquad] = {x, y};
                 
                 const roleName = {1:'步兵阵', 2:'步兵阵', 3:'弓箭营', 4:'斥候连'}[selectedSquad];
                 
                 if (tier.level >= 3 && type === 'archer') addLog(`【兵法】占山为王：弓兵前往高地架设阵地。`);
                 else if (tier.level === 0 && type === 'infantry') addLog(`【警告】洼地凶险：步兵进入低洼区易被集火！`);
                 else addLog(`【军令】${roleName} 变阵，向目标区移动。`);
            }
        }
    };

    const handleCanvasMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        const h = getUnitElevation(x, y);
        setHoverElevation(getHeightTier(h).name);
    };

    return (
        <div className="min-h-screen bg-[#080b0e] text-[#4ae] font-mono flex flex-col items-center py-6 selection:bg-[#4ae] selection:text-black relative">
            
            <div className="w-full max-w-[800px] flex justify-between items-end mb-2 border-b border-[#246] pb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-[0.2em] text-white drop-shadow-[0_0_8px_rgba(68,170,238,0.8)]">
                        GENERAL: CONTOUR WAR
                    </h1>
                    <p className="text-xs tracking-widest text-[#4ae] opacity-70">战术推演终端 V2.0 | 策略重构版 - 第 {level} 战</p>
                </div>
                <div className="text-right text-xs text-[#68a]">
                    <p>状态: <span className="text-white font-bold">{
                        gameState === 'SETUP' ? '待空降部署' : 
                        gameState === 'BATTLE' ? '激烈交战中' : 
                        gameState === 'VICTORY' ? '大获全胜' : '全军覆没'
                    }</span></p>
                </div>
            </div>

            <div className="relative border-2 border-[#246] shadow-[0_0_40px_rgba(0,30,60,1)] bg-black overflow-hidden group">
                
                {(gameState === 'VICTORY' || gameState === 'DEFEAT') && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                        <div className="bg-[#0a0f14] border-2 border-[#246] p-8 rounded shadow-2xl text-center flex flex-col items-center">
                            {gameState === 'VICTORY' ? (
                                <>
                                    <h2 className="text-4xl font-bold text-yellow-500 mb-2">大获全胜</h2>
                                    <p className="text-sm text-[#8ab] mb-6 tracking-widest">"兵之胜败，在于地利。"</p>
                                    <button onClick={() => startLevel(level + 1)} className="px-6 py-2 bg-[#1a3a5a] text-white border border-[#4ae] hover:bg-[#4ae] hover:text-black transition font-bold">
                                        挺进下一高地 (Lv.{level + 1})
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-4xl font-bold text-red-500 mb-2">主将阵亡</h2>
                                    <p className="text-sm text-[#8ab] mb-6 tracking-widest">"贪功冒进，丧师辱国..."</p>
                                    <button onClick={() => startLevel(1)} className="px-6 py-2 bg-[#3a1a1a] text-white border border-[#e55] hover:bg-[#e55] hover:text-black transition font-bold">
                                        重整旗鼓 (回到 Lv.1)
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <canvas ref={bgCanvasRef} width={800} height={600} className="hidden" />
                <canvas ref={fowCanvasRef} width={800} height={600} className="hidden" />
                
                {/* 修改鼠标样式以提示交互 */}
                <canvas 
                    ref={canvasRef} width={800} height={600} 
                    onClick={handleCanvasClick} onMouseMove={handleCanvasMouseMove}
                    className={`relative z-10 ${gameState === 'SETUP' ? 'cursor-crosshair' : 'cursor-crosshair'}`}
                />
                
                <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,20,40,0.15)_50%),linear-gradient(90deg,rgba(0,100,255,0.03),rgba(0,255,200,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]"></div>
            </div>

            <div className="w-full max-w-[800px] mt-4 grid grid-cols-12 gap-4">
                
                <div className="col-span-3 bg-[#0d131a] border border-[#246] p-3 rounded flex flex-col">
                    <h3 className="text-white text-xs font-bold border-b border-[#246] pb-1 mb-2 text-center">【战前必读 - 兵法】</h3>
                    <ul className="text-[11px] space-y-2 text-[#68a] list-decimal pl-4">
                        <li><span className="text-white">地形压制：</span>右侧必有高地。步兵仰攻高地会受到严重削弱，弓兵居高临下伤害翻倍。</li>
                        <li><span className="text-white">快捷指挥：</span>你可以<span className="text-yellow-500">直接点击沙盘上带数字的圈(阵眼)</span>来切换控制的部队，也可点击下方兵牌。</li>
                        <li><span className="text-white">兵种协同：</span>用步兵在洼地吸引敌军下山，派弓箭兵占领侧翼高地输出。</li>
                    </ul>
                </div>

                <div className="col-span-4 bg-[#0d131a] border border-[#246] p-3 rounded flex flex-col gap-2">
                    <h3 className="text-white text-sm font-bold border-b border-[#246] pb-1 mb-2">【统帅部 - 兵牌】</h3>
                    <button 
                        onClick={() => setSelectedSquad(0)}
                        className={`py-1.5 px-3 text-xs text-left border border-[#246] transition-colors ${selectedSquad === 0 ? 'bg-[#246] text-white font-bold shadow-[inset_2px_0_0_#4ae]' : 'hover:bg-[#152535]'}`}
                        disabled={gameState !== 'BATTLE'}
                    >
                        [0] 帅旗 (全军统御)
                    </button>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <button onClick={() => setSelectedSquad(1)} disabled={gameState !== 'BATTLE'} className={`py-1.5 px-1 text-[11px] border border-[#246] transition-colors ${selectedSquad === 1 ? 'bg-[#1a3a5a] text-white shadow-[inset_2px_0_0_#4ae]' : 'hover:bg-[#152535]'}`}>1组 步兵 (抗线)</button>
                        <button onClick={() => setSelectedSquad(2)} disabled={gameState !== 'BATTLE'} className={`py-1.5 px-1 text-[11px] border border-[#246] transition-colors ${selectedSquad === 2 ? 'bg-[#1a3a5a] text-white shadow-[inset_2px_0_0_#4ae]' : 'hover:bg-[#152535]'}`}>2组 步兵 (抗线)</button>
                        <button onClick={() => setSelectedSquad(3)} disabled={gameState !== 'BATTLE'} className={`py-1.5 px-1 text-[11px] border border-[#246] transition-colors ${selectedSquad === 3 ? 'bg-[#1a3a5a] text-white shadow-[inset_2px_0_0_#4ae]' : 'hover:bg-[#152535]'}`}>3组 弓箭 (高地)</button>
                        <button onClick={() => setSelectedSquad(4)} disabled={gameState !== 'BATTLE'} className={`py-1.5 px-1 text-[11px] border border-[#246] transition-colors ${selectedSquad === 4 ? 'bg-[#1a3a5a] text-white shadow-[inset_2px_0_0_#4ae]' : 'hover:bg-[#152535]'}`}>4组 斥候 (探图)</button>
                    </div>
                </div>

                <div className="col-span-5 bg-[#0d131a] border border-[#246] p-3 rounded flex flex-col">
                    <h3 className="text-white text-sm font-bold border-b border-[#246] pb-1 mb-2">【军情急报 - 战场日志】</h3>
                    <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs flex flex-col-reverse tracking-wide">
                        {logs.slice().reverse().map((log, i) => {
                            let color = 'text-[#68a]';
                            if (i === 0) color = 'text-white';
                            if (log.includes('警告') || log.includes('受击') || log.includes('噩耗')) color = 'text-[#e55]';
                            if (log.includes('兵法') || log.includes('捷报')) color = 'text-[#fa0]';
                            
                            return (
                                <div key={i} className={`opacity-${100 - i*15} ${color} leading-relaxed`}>
                                    <span className="text-[#4ae] mr-1">{'>'}</span>{log}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}