import dynamic from 'next/dynamic';

// Recharts necesita DOM; evitamos SSR.
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LoadChart({ data = [] }) {
  const safe = Array.isArray(data) ? data : [];

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safe} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="ts"
            tickFormatter={formatTime}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: '#0b0b0d',
              border: '1px solid #1f2937',
              borderRadius: 8,
              color: '#e5e7eb',
              fontSize: 12,
            }}
            labelFormatter={(label) => formatTime(label)}
          />
          <Area type="monotone" dataKey="m1" stroke="#34d399" fill="url(#loadFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
