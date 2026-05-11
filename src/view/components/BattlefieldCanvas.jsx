import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../data/gameConfig.js';

export default function BattlefieldCanvas({
  bgCanvasRef,
  canvasRef,
  fowCanvasRef,
  gameState,
  handleCanvasClick,
  handleCanvasMouseMove,
  level,
  onAdvanceLevel,
  onRestart,
}) {
  return (
    <div className="relative border-2 border-[#246] shadow-[0_0_40px_rgba(0,30,60,1)] bg-black overflow-hidden group">
      {(gameState === 'VICTORY' || gameState === 'DEFEAT') && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0f14] border-2 border-[#246] p-8 rounded shadow-2xl text-center flex flex-col items-center">
            {gameState === 'VICTORY' ? (
              <>
                <h2 className="text-4xl font-bold text-yellow-500 mb-2">大获全胜</h2>
                <p className="text-sm text-[#8ab] mb-6 tracking-widest">"兵之胜败，在于地利。"</p>
                <button
                  onClick={onAdvanceLevel}
                  className="px-6 py-2 bg-[#1a3a5a] text-white border border-[#4ae] hover:bg-[#4ae] hover:text-black transition font-bold"
                >
                  挺进下一高地 (Lv.{level + 1})
                </button>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold text-red-500 mb-2">主将阵亡</h2>
                <p className="text-sm text-[#8ab] mb-6 tracking-widest">"贪功冒进，丧师辱国..."</p>
                <button
                  onClick={onRestart}
                  className="px-6 py-2 bg-[#3a1a1a] text-white border border-[#e55] hover:bg-[#e55] hover:text-black transition font-bold"
                >
                  重整旗鼓 (回到 Lv.1)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <canvas ref={bgCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />
      <canvas ref={fowCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className="relative z-10 cursor-crosshair"
      />
      <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,20,40,0.15)_50%),linear-gradient(90deg,rgba(0,100,255,0.03),rgba(0,255,200,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]"></div>
    </div>
  );
}