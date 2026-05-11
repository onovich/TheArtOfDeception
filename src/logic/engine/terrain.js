import { TERRAIN_TIERS } from '../../data/gameConfig.js';

let seed = Math.random();

function hash(x, y) {
  let hashed = (x * 374761393 + y * 668265263) ^ Math.floor(seed * 10000);
  hashed = (hashed ^ (hashed >> 13)) * 1274126177;
  return hashed ^ (hashed >> 16);
}

function noise(x, y) {
  const integerX = Math.floor(x);
  const integerY = Math.floor(y);
  const fractionX = x - integerX;
  const fractionY = y - integerY;
  const blendX = fractionX * fractionX * (3 - 2 * fractionX);
  const blendY = fractionY * fractionY * (3 - 2 * fractionY);
  const value00 = (hash(integerX, integerY) % 1000) / 1000;
  const value10 = (hash(integerX + 1, integerY) % 1000) / 1000;
  const value01 = (hash(integerX, integerY + 1) % 1000) / 1000;
  const value11 = (hash(integerX + 1, integerY + 1) % 1000) / 1000;

  return value00 * (1 - blendX) * (1 - blendY)
    + value10 * blendX * (1 - blendY)
    + value01 * (1 - blendX) * blendY
    + value11 * blendX * blendY;
}

export function randomizeTerrainSeed() {
  seed = Math.random();
  return seed;
}

export function getElevation(x, y, width, height) {
  const normalizedX = x / width;
  const normalizedY = y / height;
  let elevation = 1.0 * noise(normalizedX * 5, normalizedY * 5)
    + 0.5 * noise(normalizedX * 10, normalizedY * 10)
    + 0.25 * noise(normalizedX * 20, normalizedY * 20);

  elevation /= 1.75;

  const bias = (normalizedX - 0.4) * 0.4;
  const waveDirectionX = (Math.floor(seed * 10) % 3) + 2;
  const sineWave = Math.sin(normalizedX * Math.PI * waveDirectionX + normalizedY * Math.PI * 2) * 0.1;

  return Math.max(0, Math.min(1, elevation + bias + sineWave));
}

export function getHeightTier(heightValue) {
  return TERRAIN_TIERS.find((tier) => heightValue < tier.max) ?? TERRAIN_TIERS[TERRAIN_TIERS.length - 1];
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}