import { SQUAD_BUTTONS } from '../../data/gameConfig.js';

export default function CommandPanel({ gameState, onSelectSquad, selectedSquad }) {
  return (
    <div className="col-span-4 bg-[#0d131a] border border-[#246] p-3 rounded flex flex-col gap-2">
      <h3 className="text-white text-sm font-bold border-b border-[#246] pb-1 mb-2">【统帅部 - 兵牌】</h3>
      <button
        onClick={() => onSelectSquad(0)}
        className={`py-1.5 px-3 text-xs text-left border border-[#246] transition-colors ${selectedSquad === 0 ? 'bg-[#246] text-white font-bold shadow-[inset_2px_0_0_#4ae]' : 'hover:bg-[#152535]'}`}
        disabled={gameState !== 'BATTLE'}
      >
        [0] 帅旗 (全军统御)
      </button>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {SQUAD_BUTTONS.map((button) => (
          <button
            key={button.id}
            onClick={() => onSelectSquad(button.id)}
            disabled={gameState !== 'BATTLE'}
            className={`py-1.5 px-1 text-[11px] border border-[#246] transition-colors ${selectedSquad === button.id ? 'bg-[#1a3a5a] text-white shadow-[inset_2px_0_0_#4ae]' : 'hover:bg-[#152535]'}`}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}