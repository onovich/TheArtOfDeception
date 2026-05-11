export default function BattleLogPanel({ logs }) {
  return (
    <div className="col-span-5 bg-[#0d131a] border border-[#246] p-3 rounded flex flex-col">
      <h3 className="text-white text-sm font-bold border-b border-[#246] pb-1 mb-2">【军情急报 - 战场日志】</h3>
      <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs flex flex-col-reverse tracking-wide">
        {logs
          .slice()
          .reverse()
          .map((log, index) => {
            let color = 'text-[#68a]';
            if (index === 0) {
              color = 'text-white';
            }
            if (log.includes('警告') || log.includes('受击') || log.includes('噩耗')) {
              color = 'text-[#e55]';
            }
            if (log.includes('兵法') || log.includes('捷报')) {
              color = 'text-[#fa0]';
            }

            return (
              <div key={`${log}-${index}`} className={`opacity-${100 - index * 15} ${color} leading-relaxed`}>
                <span className="text-[#4ae] mr-1">{'>'}</span>
                {log}
              </div>
            );
          })}
      </div>
    </div>
  );
}