import React, { useEffect, useRef, useState } from 'react';
import { Activity, Edit2, Trash2, LogOut, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import MetricCard from './ui/MetricCard';
import LoadChart from './charts/LoadChart';

const humanBytes = (value) => {
  if (value === null || value === undefined) return 'N/A';
  // Aceptar números en bytes o strings tipo "15.6 GB"
  if (typeof value === 'string') {
    const match = value.match(/([0-9.]+)\s*(B|KB|MB|GB|TB)/i);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const unitOrder = ['B','KB','MB','GB','TB'];
      const idx = unitOrder.indexOf(unit);
      if (idx >= 0) {
        return `${num.toFixed(2)} ${unit}`;
      }
    }
    return value; // devolver tal cual si no se pudo parsear
  }

  if (typeof value !== 'number' || isNaN(value)) return 'N/A';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const FirewallCard = ({ fw, selected, onSelect }) => {
  const uptime = fw.summary?.uptime || 'N/A';
  const mainIp = fw.summary?.primaryIp || fw.summary?.ips?.[0] || fw.ip || 'N/A';
  const interfaces = fw.summary?.interfaces ? fw.summary.interfaces.length : (fw.summary?.ips ? fw.summary.ips.length : 'N/A');
  const gateway = fw.summary?.gateway || 'N/A';
  const gateways = fw.summary?.gateways || [];
  const isActuallyOnline = fw.status === 'online' && !fw.summary?.lastError;

  const uptimeShort = (() => {
    if (!uptime || uptime === 'N/A') return 'N/A';
    // Mantener algo corto: "up X days" + load si existe
    const trimmed = String(uptime).trim();
    const m = trimmed.match(/up\s+([^,]+(?:,\s*[^,]+)?)/i);
    if (m) return `up ${m[1].trim()}`;
    return trimmed.length > 28 ? trimmed.slice(0, 28) + '…' : trimmed;
  })();

  const getGatewayStatusColor = (gw) => {
    if (gw.status === 'online') return 'text-emerald-400 border-emerald-700/30';
    if (gw.status === 'down' || gw.status === 'offline') return 'text-red-400 border-red-700/30';
    if (gw.status === 'degraded') return 'text-amber-400 border-amber-700/30';
    if (gw.loss && parseFloat(gw.loss) > 5) return 'text-amber-400 border-amber-700/30';
    if (gw.delay && parseFloat(gw.delay) > 100) return 'text-amber-400 border-amber-700/30';
    return 'text-gray-400 border-gray-700/30';
  };

  const getGatewayStatusIcon = (gw) => {
    if (gw.status === 'online') return '●';
    if (gw.status === 'down' || gw.status === 'offline') return '○';
    if (gw.status === 'degraded') return '◐';
    if (gw.loss && parseFloat(gw.loss) > 5) return '◐';
    if (gw.delay && parseFloat(gw.delay) > 100) return '◐';
    return '?';
  };

  return (
    <div
      onClick={() => onSelect?.(fw.id)}
      className={`relative bg-gradient-to-br from-[#121214] to-[#0a0a0c] border ${selected ? 'border-emerald-600/80 shadow-lg shadow-emerald-500/10' : 'border-gray-800/50'} rounded-lg p-3 hover:border-gray-700/80 transition-all cursor-pointer group overflow-hidden`}
    >
      {selected && <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent pointer-events-none" />}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest font-semibold">{fw.name}</div>
            {isActuallyOnline ? <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" /> : <XCircle size={12} className="text-red-400 flex-shrink-0" />}
          </div>
          <div className="text-sm font-semibold text-gray-100 mt-0.5 font-mono tracking-tight">{mainIp}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {gateways.length > 0 ? (
              gateways.map((gw, idx) => (
                <span 
                  key={idx}
                  className={`px-1.5 py-0.5 rounded border bg-black/30 text-[9px] font-mono ${getGatewayStatusColor(gw)}`}
                  title={`${gw.name}: ${gw.status}${gw.delay ? ` | ${gw.delay}ms` : ''}${gw.loss ? ` | ${gw.loss}% loss` : ''}`}
                >
                  {getGatewayStatusIcon(gw)} {gw.name}
                </span>
              ))
            ) : (
              <span className="px-1.5 py-0.5 rounded border border-gray-800/50 bg-black/30 text-[9px] text-gray-400 font-mono">
                GW {gateway}
              </span>
            )}
          </div>
        </div>
      </div>
      {fw.summary?.lastError && (
        <div className="mt-2 text-[10px] text-red-300/80 line-clamp-1 font-mono">
          {fw.summary.lastError}
        </div>
      )}
    </div>
  );
};

const DetailsPanel = ({ fw, onEdit, onDelete, onDisconnect, onRefresh }) => {
  const s = fw?.summary || {};
  const last = fw?.lastSeen ? new Date(fw.lastSeen).toLocaleString() : 'N/A';
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshEvery, setRefreshEvery] = useState(15000);
  const refreshInFlightRef = useRef(false);
  const isActuallyOnline = fw?.status === 'online' && !s?.lastError;
  const [failureCount, setFailureCount] = useState(0);

  const effectiveRefreshEvery = (() => {
    // Backoff: base * 2^n, tope 5min. No cambia la validación SSH, solo evita martilleos.
    const base = Number(refreshEvery) || 15000;
    if (!autoRefresh) return base;
    if (failureCount <= 0) return base;
    const factor = Math.pow(2, Math.min(6, failureCount));
    return Math.min(300000, base * factor);
  })();

  const loadSeriesFor = (id) => {
    try {
      const key = `pfhub:metrics:${id}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [loadSeries, setLoadSeries] = useState(() => {
    return fw?.id ? loadSeriesFor(fw.id) : [];
  });

  const appendLoadPoint = (summary) => {
    try {
      const la = summary?.loadAverages;
      if (!la || typeof la.m1 !== 'number') return;
      const point = { ts: Date.now(), m1: la.m1, m5: la.m5, m15: la.m15 };
      const next = [...loadSeries, point].slice(-60);
      setLoadSeries(next);
      localStorage.setItem(`pfhub:metrics:${fw.id}`, JSON.stringify(next));
    } catch {}
  };

  // Cuando cambia el firewall seleccionado, cargar su histórico
  useEffect(() => {
    if (!fw?.id) return;
    setLoadSeries(loadSeriesFor(fw.id));
    setFailureCount(0);
  }, [fw?.id]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !fw?.id) return;
    const timer = setInterval(() => {
      handleRefresh();
    }, effectiveRefreshEvery);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshEvery, effectiveRefreshEvery, fw?.id]);

  const percentNumber = (() => {
    const p = s?.disk?.percent;
    if (p === null || p === undefined) return null;
    if (typeof p === 'number') return p;
    const m = String(p).match(/([0-9.]+)/);
    return m ? Number(m[1]) : null;
  })();

  const handleRefresh = async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setRefreshing(true);
    try {
      const updated = await onRefresh?.(fw.id);
      appendLoadPoint(updated?.summary);

      const attempted = updated?.connectAttempted !== false;
      if (attempted) {
        const failed =
          updated?.connectSuccess === false ||
          updated?.status !== 'online' ||
          Boolean(updated?.summary?.lastError);
        setFailureCount((prev) => (failed ? Math.min(10, prev + 1) : 0));
      }
    } finally {
      refreshInFlightRef.current = false;
      setRefreshing(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(fw.id);
    alert('ID copiado: ' + fw.id);
  };

  return (
    <div className="bg-[#121214] border border-gray-800 rounded-xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <Activity size={20} className="text-gray-500" />
            {fw.name} — {isActuallyOnline ? 'Online (verified)' : 'Offline'}
          </h2>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            ID: <code className="bg-gray-900 px-2 py-1 rounded">{fw.id}</code>
            <button
              onClick={copyId}
              className="text-gray-400 hover:text-gray-200 transition"
              title="Copiar ID"
            >
              📋
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${autoRefresh ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300' : 'bg-gray-900/40 border-gray-700 text-gray-300 hover:bg-gray-900'}`}
            title="Auto-refresh"
          >
            {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
          </button>
          <select
            value={refreshEvery}
            onChange={(e) => setRefreshEvery(Number(e.target.value))}
            className="px-2 py-1.5 rounded text-xs bg-[#0c0c0e] border border-gray-800 text-gray-200"
            title="Intervalo de refresco"
            disabled={!autoRefresh}
          >
            <option value={5000}>Cada 5s</option>
            <option value={15000}>Cada 15s</option>
            <option value={30000}>Cada 30s</option>
            <option value={60000}>Cada 60s</option>
          </select>
          {autoRefresh ? (
            <div className="hidden md:flex items-center px-2 text-[11px] text-gray-500 font-mono">
              {failureCount > 0 ? `Backoff: ${Math.round(effectiveRefreshEvery / 1000)}s` : `Cada ${Math.round(refreshEvery / 1000)}s`}
            </div>
          ) : null}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-900/50 text-green-400 hover:bg-green-900 disabled:opacity-50 rounded text-xs font-medium transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Actualizar
          </button>
          <button
            onClick={() => onEdit?.(fw.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/50 text-blue-400 hover:bg-blue-900 rounded text-xs font-medium transition-colors"
            title="Editar"
          >
            <Edit2 size={14} /> Editar
          </button>
          <button
            onClick={() => onDisconnect?.(fw.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900 rounded text-xs font-medium transition-colors"
            title="Desconectar"
          >
            <LogOut size={14} /> Desconectar
          </button>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar ${fw.name}?`)) {
                onDelete?.(fw.id);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-900/50 text-red-400 hover:bg-red-900 rounded text-xs font-medium transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>

      {fw.summary ? (
        <div className="space-y-5">
          {(fw.status !== 'online' || s.lastError) ? (
            <div className={`border rounded-xl p-4 ${fw.status === 'online' && !s.lastError ? 'border-emerald-700/30 bg-emerald-900/10' : 'border-red-700/30 bg-red-900/10'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Conectividad</div>
                  <div className={`mt-1 font-semibold ${fw.status === 'online' && !s.lastError ? 'text-emerald-300' : 'text-red-300'}`}>
                    {fw.status === 'online' && !s.lastError ? 'Online' : 'Sin conexión'}
                  </div>
                  {s.lastError ? (
                    <div className="mt-1 text-xs text-gray-300">
                      {s.lastError}
                      {s.lastErrorAt ? <span className="text-gray-500"> · {new Date(s.lastErrorAt).toLocaleString()}</span> : null}
                    </div>
                  ) : null}
                </div>
                <div className="text-[11px] text-gray-500 font-mono">Último OK: {last}</div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="IP WAN"
              value={s.primaryIp || fw.ip || 'N/A'}
              sub={s.wanIface ? `Interfaz ${s.wanIface}` : undefined}
              accent="emerald"
              right={<span className="font-mono">GW {s.gateway || 'N/A'}</span>}
            />
            <MetricCard
              title="Uptime"
              value={s.uptime ? s.uptime.split('load averages')[0].trim() : 'N/A'}
              sub={s.loadAverages ? `Load ${s.loadAverages.m1}, ${s.loadAverages.m5}, ${s.loadAverages.m15}` : undefined}
              accent="cyan"
            />

            <MetricCard
              title="Interfaces"
              value={Array.isArray(s.interfaces) ? s.interfaces.length : 'N/A'}
              sub="Hover para detalles"
              accent="violet"
              overflow="visible"
            >
              {(() => {
                if (!Array.isArray(s.interfaces) || s.interfaces.length === 0) return null;

                const order = [];
                const groups = {};
                for (const row of s.interfaces) {
                  const k = row.iface;
                  if (!groups[k]) {
                    groups[k] = { iface: k, name: s.ifaceNames?.[k] || null, ips: [] };
                    order.push(k);
                  }
                  if (row.ip && !groups[k].ips.includes(row.ip)) groups[k].ips.push(row.ip);
                }
                const items = order.map((k) => groups[k]);

                const badgeClass = (iface) => {
                  if (iface === s.wanIface) return 'border-emerald-600/40 bg-emerald-900/15 text-emerald-200';
                  if (/^tun_wg/i.test(iface)) return 'border-violet-600/40 bg-violet-900/15 text-violet-200';
                  if (/^ovpns/i.test(iface)) return 'border-cyan-600/40 bg-cyan-900/15 text-cyan-200';
                  if (/^pfsync/i.test(iface)) return 'border-amber-600/40 bg-amber-900/15 text-amber-200';
                  if (iface === 'lo0') return 'border-gray-700 bg-gray-900/20 text-gray-200';
                  return 'border-gray-800 bg-black/20 text-gray-200';
                };

                return (
                  <div className="flex flex-wrap gap-2">
                    {items.map((it) => {
                      const title = it.name || it.iface;
                      const ipsText = (it.ips.length ? it.ips : ['N/A']).join('\n');
                      return (
                        <div key={it.iface} className="relative group">
                          <div className={`px-2 py-1 rounded-lg border text-[11px] font-mono cursor-default select-none ${badgeClass(it.iface)}`}>
                            {it.iface}
                          </div>

                          <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute z-50 left-0 top-full mt-2 min-w-[220px]">
                            <div className="rounded-xl border border-gray-800 bg-[#121214] shadow-xl shadow-black/40 p-3">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-100 truncate">{title}</div>
                                <div className="text-[11px] text-gray-500 font-mono mt-0.5">{it.iface}{it.iface === s.wanIface ? ' · WAN' : ''}</div>
                              </div>
                              <div className="mt-2 text-[11px] text-gray-300 font-mono whitespace-pre-line">{ipsText}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </MetricCard>
          </div>

          {/* Gráfico de Load - Destacado en su propia fila */}
          <div className="grid grid-cols-1 gap-4">
            <MetricCard
              title="Load Average (1m, 5m, 15m)"
              value={s.loadAverages?.m1 ?? 'N/A'}
              sub={loadSeries.length ? `Histórico de ${loadSeries.length} muestras` : 'Sin histórico aún (pulsa Actualizar)'}
              accent="emerald"
            >
              <LoadChart data={loadSeries} />
            </MetricCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              title="CPU"
              value={s.cpuCount ?? 'N/A'}
              sub="Cores"
              accent="violet"
            />
            <MetricCard
              title="Memoria"
              value={humanBytes(s.memory) || 'N/A'}
              sub="RAM física"
              accent="amber"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricCard
              title="Disco"
              value={s.disk?.percent ?? 'N/A'}
              sub={s.disk ? `${s.disk.used} usados / ${s.disk.size} total` : undefined}
              accent="cyan"
            >
              {s.disk ? (
                <div className="mt-1">
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${Math.min(100, Math.max(0, percentNumber ?? 0))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-gray-400 font-mono">
                    Avail {s.disk.avail} · Mount /
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">N/A</div>
              )}
            </MetricCard>

            <MetricCard
              title="Sistema"
              value={s.uname ? 'FreeBSD/pfSense' : 'N/A'}
              sub={s.uname || undefined}
              accent="violet"
              right={<span className="text-[11px] text-gray-400">Last: {last}</span>}
            />
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Información no disponible. Conectar para obtener detalles.</p>
      )}

    </div>
  );
};

const Dashboard = ({
  firewalls = [],
  selectedId = null,
  onSelectFirewall,
  onEditFirewall,
  onDeleteFirewall,
  onDisconnectFirewall,
  onRefreshStats
}) => {
  const selectedFirewall = firewalls.find(fw => fw.id === selectedId);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {firewalls.map((fw) => (
          <FirewallCard
            key={fw.id}
            fw={fw}
            selected={selectedId === fw.id}
            onSelect={onSelectFirewall}
          />
        ))}
      </div>
      {selectedFirewall ? (
        <DetailsPanel
          fw={selectedFirewall}
          onEdit={onEditFirewall}
          onDelete={onDeleteFirewall}
          onDisconnect={onDisconnectFirewall}
          onRefresh={onRefreshStats}
        />
      ) : (
        <div className="bg-[#121214] border border-gray-800 rounded p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-gray-500" />
            Estado General del Firewall
          </h2>
          <div className="text-gray-400 text-sm">
            {firewalls.length === 0
              ? 'Agrega un firewall para comenzar.'
              : 'Selecciona un firewall para ver detalles verificados por SSH.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
