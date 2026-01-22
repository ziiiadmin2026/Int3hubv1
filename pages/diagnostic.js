import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

const DiagnosticPage = () => {
  const [firewallId, setFirewallId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runDiagnostic = async () => {
    if (!firewallId.trim()) {
      setError('Ingresa un ID de firewall');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/firewalls/${firewallId}/diagnostic`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Error en diagnostic');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-900 text-gray-100 min-h-screen font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-green-400">🔧 Diagnostic SSH</h1>

        {/* Input */}
        <div className="bg-gray-800 p-6 rounded mb-6 border border-gray-700">
          <label className="block text-sm mb-2 text-gray-300">ID del Firewall:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={firewallId}
              onChange={(e) => setFirewallId(e.target.value)}
              placeholder="Ej: 1769031914182"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              onKeyDown={(e) => e.key === 'Enter' && runDiagnostic()}
            />
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-semibold"
            >
              {loading ? 'Conectando...' : 'Ejecutar'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 p-4 rounded mb-6 text-red-200">
            ❌ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-800 p-6 rounded border border-gray-700">
              <h2 className="text-lg font-bold mb-3 text-blue-400">📊 Summary</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Success:</span>
                  <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                    {' '}{result.success ? '✓' : '✗'}
                  </span>
                </div>
                {result.error && (
                  <div>
                    <span className="text-gray-400">Error:</span>
                    <span className="text-red-400"> {result.error}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Bytes Recibidos:</span>
                  <span className="text-white"> {result.bytesReceived}</span>
                </div>
                <div>
                  <span className="text-gray-400">Líneas:</span>
                  <span className="text-white"> {result.linesReceived}</span>
                </div>
              </div>
            </div>

            {/* Parsed Summary */}
            {result.summary && (
              <div className="bg-gray-800 p-6 rounded border border-gray-700">
                <h2 className="text-lg font-bold mb-3 text-blue-400">✅ Datos Parseados</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Uptime:</span>
                    <span className="text-white"> {result.summary.uptime || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">CPU Cores:</span>
                    <span className="text-white"> {result.summary.cpuCount || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Memory:</span>
                    <span className="text-white"> {result.summary.memory || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">IPs:</span>
                    <span className="text-white"> {result.summary.ips?.join(', ') || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Interfaces:</span>
                    <span className="text-white"> {result.summary.interfaces?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Gateway:</span>
                    <span className="text-white"> {result.summary.gateway || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Output */}
            <div className="bg-gray-800 p-6 rounded border border-gray-700">
              <h2 className="text-lg font-bold mb-3 text-blue-400">📝 Raw SSH Output</h2>
              <div className="bg-black p-4 rounded border border-gray-600 max-h-96 overflow-auto">
                <pre className="text-xs text-green-400 whitespace-pre-wrap">
                  {result.rawOutput || '[No output]'}
                </pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.rawOutput);
                  alert('Raw output copiado al portapapeles');
                }}
                className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                📋 Copiar Output
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!result && !error && (
          <div className="bg-gray-800 p-6 rounded border border-gray-700 text-gray-400 text-sm">
            <p>1. Agrega un firewall en la app principal</p>
            <p>2. Copia su ID desde la BD o console del navegador</p>
            <p>3. Pégalo aquí para ver exactamente qué retorna SSH</p>
            <p>4. Si ves menú de pfSense, significa que los comandos no se están ejecutando</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticPage;
