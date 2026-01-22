import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Lock, User, AlertCircle, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (res.ok) {
        // Usuario ya está autenticado, redirigir al dashboard
        router.replace('/');
      }
      // Si no es ok (401), mantener en login page - no hacer nada
    } catch (err) {
      // Error de conexión - mantener en login page
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('[Login] Enviando credenciales...', { username, password: '***' });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      console.log('[LOGIN] Status:', res.status);
      console.log('[LOGIN] Response headers received:');
      for (const [key, value] of res.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }
      
      const data = await res.json();
      console.log('[LOGIN] Response data:', data);

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      // Success - la cookie es HttpOnly así que no aparece en document.cookie (esto es correcto)
      console.log('[LOGIN] ✓ Login exitoso!');
      console.log('[LOGIN] Redirigiendo al dashboard...');
      
      // Redirigir inmediatamente - el AuthContext se encargará de verificar la sesión
      router.push('/');
    } catch (err) {
      console.error('[Login] Error:', err);
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] flex">
      {/* Left side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 mb-4">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              pfSense Hub
            </h1>
            <p className="text-gray-400 text-sm">
              Gestión multi-firewall centralizada
            </p>
          </div>

          {/* Login card */}
          <div className="bg-[#121214] border border-gray-800 rounded-xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6">
              Iniciar Sesión
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#1a1a1c] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="admin"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1a1a1c] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/20"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-gray-500 text-xs mt-6">
            v1.0 • Gestión segura de firewalls pfSense
          </p>
        </div>
      </div>

      {/* Right side - Branding / Advertising space */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900/20 via-cyan-900/20 to-violet-900/20 items-center justify-center p-12 border-l border-gray-800">
        <div className="max-w-lg text-center space-y-8">
          {/* Main branding */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-xl shadow-emerald-500/30 mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white">
              Gestión Centralizada
            </h2>
            <p className="text-xl text-gray-400">
              Monitorea múltiples firewalls pfSense desde una sola interfaz
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 mt-12">
            {[
              { title: 'SSH Seguro', desc: 'Conexiones encriptadas' },
              { title: 'Tiempo Real', desc: 'Métricas en vivo' },
              { title: 'Multi-Firewall', desc: 'Gestión unificada' },
              { title: 'Analytics', desc: 'Históricos y gráficos' }
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-[#121214]/50 border border-gray-800 rounded-lg p-4 backdrop-blur-sm"
              >
                <h3 className="text-emerald-400 font-semibold text-sm mb-1">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-xs">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Optional advertising space */}
          <div className="mt-12 p-6 bg-[#121214]/30 border border-gray-800 rounded-xl backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-2">
              💼 Espacio publicitario disponible
            </p>
            <p className="text-gray-600 text-xs">
              Contacta para más información sobre soluciones enterprise
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
