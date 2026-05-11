export default function BattleBriefing() {
  return (
    <div className="col-span-3 bg-[#0d131a] border border-[#246] p-3 rounded flex flex-col">
      <h3 className="text-white text-xs font-bold border-b border-[#246] pb-1 mb-2 text-center">【战前必读 - 兵法】</h3>
      <ul className="text-[11px] space-y-2 text-[#68a] list-decimal pl-4">
        <li><span className="text-white">地形压制：</span>右侧必有高地。步兵仰攻高地会受到严重削弱，弓兵居高临下伤害翻倍。</li>
        <li><span className="text-white">快捷指挥：</span>你可以<span className="text-yellow-500">直接点击沙盘上带数字的圈(阵眼)</span>来切换控制的部队，也可点击下方兵牌。</li>
        <li><span className="text-white">兵种协同：</span>用步兵在洼地吸引敌军下山，派弓箭兵占领侧翼高地输出。</li>
      </ul>
    </div>
  );
}