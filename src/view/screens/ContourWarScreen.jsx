import { useContourWarGame } from '../../logic/hooks/useContourWarGame.js';
import BattlefieldCanvas from '../components/BattlefieldCanvas.jsx';
import BattleLogPanel from '../components/BattleLogPanel.jsx';
import BattleBriefing from '../components/BattleBriefing.jsx';
import CommandPanel from '../components/CommandPanel.jsx';
import StatusHeader from '../components/StatusHeader.jsx';

export default function ContourWarScreen() {
  const {
    bgCanvasRef,
    canvasRef,
    fowCanvasRef,
    gameState,
    handleCanvasClick,
    handleCanvasMouseMove,
    level,
    logs,
    selectSquad,
    selectedSquad,
    startLevel,
  } = useContourWarGame();

  return (
    <div className="min-h-screen bg-[#080b0e] text-[#4ae] font-mono flex flex-col items-center py-6 selection:bg-[#4ae] selection:text-black relative">
      <StatusHeader gameState={gameState} level={level} />
      <BattlefieldCanvas
        bgCanvasRef={bgCanvasRef}
        canvasRef={canvasRef}
        fowCanvasRef={fowCanvasRef}
        gameState={gameState}
        handleCanvasClick={handleCanvasClick}
        handleCanvasMouseMove={handleCanvasMouseMove}
        level={level}
        onAdvanceLevel={() => startLevel(level + 1)}
        onRestart={() => startLevel(1)}
      />
      <div className="w-full max-w-[800px] mt-4 grid grid-cols-12 gap-4">
        <BattleBriefing />
        <CommandPanel gameState={gameState} onSelectSquad={selectSquad} selectedSquad={selectedSquad} />
        <BattleLogPanel logs={logs} />
      </div>
    </div>
  );
}