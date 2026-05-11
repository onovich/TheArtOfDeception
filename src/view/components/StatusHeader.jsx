import { STATUS_LABELS } from '../../data/gameConfig.js';

export default function StatusHeader({ gameState, level }) {
  return (
    <div className="w-full max-w-[800px] flex justify-between items-end mb-2 border-b border-[#246] pb-2">
      <div>
        <h1 className="text-3xl font-bold tracking-[0.2em] text-white drop-shadow-[0_0_8px_rgba(68,170,238,0.8)]">
          GENERAL: CONTOUR WAR
        </h1>
        <p className="text-xs tracking-widest text-[#4ae] opacity-70">战术推演终端 V2.0 | 策略重构版 - 第 {level} 战</p>
      </div>
      <div className="text-right text-xs text-[#68a]">
        <p>
          状态:
          <span className="text-white font-bold"> {STATUS_LABELS[gameState]}</span>
        </p>
      </div>
    </div>
  );
}