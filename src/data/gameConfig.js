export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const MAX_LOGS = 8;

export const DEPLOY_ZONE = {
  x: 120,
  y: 300,
  radius: 100,
};

export const STATUS_LABELS = {
  SETUP: '待空降部署',
  BATTLE: '激烈交战中',
  VICTORY: '大获全胜',
  DEFEAT: '全军覆没',
};

export const SQUAD_TYPES = {
  1: 'infantry',
  2: 'infantry',
  3: 'archer',
  4: 'scout',
};

export const SQUAD_ROLE_NAMES = {
  1: '1组(步兵)',
  2: '2组(步兵)',
  3: '3组(弓箭)',
  4: '4组(斥候)',
};

export const SQUAD_MOVE_LABELS = {
  1: '步兵阵',
  2: '步兵阵',
  3: '弓箭营',
  4: '斥候连',
};

export const SQUAD_BUTTONS = [
  { id: 1, label: '1组 步兵 (抗线)' },
  { id: 2, label: '2组 步兵 (抗线)' },
  { id: 3, label: '3组 弓箭 (高地)' },
  { id: 4, label: '4组 斥候 (探图)' },
];

export const TERRAIN_TIERS = [
  { max: 0.3, level: 0, color: '#1B291D', name: '洼地 (易受伏击)' },
  { max: 0.5, level: 1, color: '#2B422F', name: '平原 (适宜行军)' },
  { max: 0.7, level: 2, color: '#536B46', name: '丘陵 (侧翼掩护)' },
  { max: 0.85, level: 3, color: '#857F5D', name: '高地 (视野射程+)' },
  { max: 1, level: 4, color: '#B3B1A6', name: '险峰 (绝佳阵地)' },
];

export function createSquadTargets() {
  return {
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
  };
}

export function createSetupLogs(level) {
  return [
    `【战役】第 ${level} 战区已锁定。`,
    '【军机处】敌军主力已盘踞右侧高地，切勿无脑仰攻！',
    '【指示】请在左侧【蓝色降落区】内点击部署我军。',
  ];
}

export function getInitialSquadAnchor(groupId, x, y) {
  return {
    x: x + (groupId === 1 ? -50 : groupId === 2 ? 50 : groupId === 3 ? 0 : 80),
    y: y + (groupId === 1 ? -20 : groupId === 2 ? -20 : groupId === 3 ? 40 : 0),
  };
}

export function getArmyCommandAnchor(groupId, x, y) {
  return {
    x: x + (groupId - 2.5) * 30,
    y: y + (groupId % 2) * 20,
  };
}