import { CANVAS_HEIGHT, CANVAS_WIDTH, createSquadTargets } from '../../data/gameConfig.js';

export function createEngineState() {
  return {
    state: 'SETUP',
    weather: 'CLEAR',
    units: [],
    arrows: [],
    particles: [],
    corpses: [],
    squadTargets: createSquadTargets(),
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    terrain: new Float32Array(CANVAS_WIDTH * CANVAS_HEIGHT),
    lastLogTime: 0,
    enemyCamps: [],
  };
}