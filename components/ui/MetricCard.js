export default function MetricCard({ title, value, sub, right, accent = 'emerald', overflow = 'hidden', children }) {
  const accentMap = {
    emerald: 'from-emerald-500/15 to-emerald-500/0 border-emerald-500/20',
    cyan: 'from-cyan-500/15 to-cyan-500/0 border-cyan-500/20',
    violet: 'from-violet-500/15 to-violet-500/0 border-violet-500/20',
    amber: 'from-amber-500/15 to-amber-500/0 border-amber-500/20',
    red: 'from-red-500/15 to-red-500/0 border-red-500/20',
  };

  const accentClass = accentMap[accent] || accentMap.emerald;

  const overflowClass = overflow === 'visible' ? 'overflow-visible' : 'overflow-hidden';

  return (
    <div className={`bg-[#121214] border border-gray-800 rounded-xl ${overflowClass} relative`}
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset' }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accentClass}`} />
      <div className="relative p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">{title}</div>
            <div className="mt-0.5 text-lg font-semibold text-gray-100 leading-tight">{value}</div>
            {sub ? <div className="mt-0.5 text-xs text-gray-400">{sub}</div> : null}
          </div>
          {right ? <div className="text-xs text-gray-300">{right}</div> : null}
        </div>
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </div>
  );
}
