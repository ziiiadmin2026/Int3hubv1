import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Dashboard from '../components/Dashboard';

const Home = () => {
  const router = useRouter();
  const [firewalls, setFirewalls] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [minLoadTime, setMinLoadTime] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Verificar autenticación
  useEffect(() => {
    checkAuth();
    // Delay mínimo para mostrar boot screen (2.5 segundos)
    const timer = setTimeout(() => {
      setMinLoadTime(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        router.replace('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      loadFirewalls();
    } catch (err) {
      router.replace('/login');
    }
  };

  // Auto-actualizar todos los firewalls para obtener WANs
  useEffect(() => {
    if (!user || firewalls.length === 0) return;
    // Esperar 2 segundos y luego actualizar cada firewall
    const timer = setTimeout(() => {
      firewalls.forEach((fw, idx) => {
        setTimeout(() => {
          connectAndFetchStats(fw.id);
        }, idx * 2000);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, firewalls.length]);

  // Cargar firewalls desde BD
  const loadFirewalls = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/firewalls', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFirewalls(data);
      }
    } catch (err) {
      console.error('Error cargando firewalls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFirewall = async (fw, editId = null, summary = null) => {
    const isOnline = summary && Object.keys(summary).length > 0;
    const status = isOnline ? 'online' : 'offline';

    try {
      if (editId) {
        // Actualizar firewall existente
        const res = await fetch(`/api/firewalls/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: fw.name,
            host: fw.host,
            port: fw.port,
            user: fw.user,
            password: fw.password,
            key: fw.key,
            status,
            summary: summary || undefined,
            lastSeen: isOnline ? Date.now() : undefined
          })
        });
        if (res.ok) {
          const updated = await res.json();
          setFirewalls(prev => prev.map(f => f.id === editId ? updated : f));
          // Auto-connect para obtener datos frescos
          if (updated.id) {
            setTimeout(() => connectAndFetchStats(updated.id), 500);
          }
        }
      } else {
        // Agregar nuevo firewall
        const newId = Date.now().toString();
        const res = await fetch(`/api/firewalls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: newId,
            name: fw.name,
            host: fw.host,
            port: fw.port,
            user: fw.user,
            password: fw.password,
            key: fw.key
          })
        });
        if (res.ok) {
          const newFw = await res.json();
          setFirewalls(prev => [...prev, newFw]);
          setSelectedId(newFw.id);
          // Auto-conectar y obtener stats
          setTimeout(() => connectAndFetchStats(newFw.id), 500);
        }
      }
    } catch (err) {
      console.error('Error guardando firewall:', err);
    }
  };

  const connectAndFetchStats = async (id) => {
    try {
      console.log(`[Frontend] Conectando a firewall ${id}...`);
      const res = await fetch(`/api/firewalls/${id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (res.ok) {
        const updated = await res.json();
        console.log(`[Frontend] Datos actualizados:`, updated);
        // SOLO actualizar el firewall específico en memoria, no recargar todo
        setFirewalls(prev => prev.map(f => f.id === id ? updated : f));
        return updated;
      } else {
        const text = await res.text();
        console.error('Error conectando:', text);
        return null;
      }
    } catch (err) {
      console.error('Error en conexión SSH:', err);
      return null;
    }
  };

  const updateFirewallStatus = async (id, status, summary) => {
    try {
      const res = await fetch(`/api/firewalls/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, summary })
      });
      if (res.ok) {
        const updated = await res.json();
        setFirewalls(prev => prev.map(f => f.id === id ? updated : f));
      }
    } catch (err) {
      console.error('Error actualizando status:', err);
    }
  };

  const handleSelectFirewall = (id) => {
    setSelectedId(id);
  };

  const handleDeleteFirewall = async (id) => {
    try {
      const res = await fetch(`/api/firewalls/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setFirewalls(prev => prev.filter(f => f.id !== id));
        if (selectedId === id) setSelectedId(null);
      }
    } catch (err) {
      console.error('Error eliminando firewall:', err);
    }
  };

  const handleDisconnectFirewall = async (id) => {
    try {
      const res = await fetch(`/api/firewalls/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'offline' })
      });
      if (res.ok) {
        const updated = await res.json();
        setFirewalls(prev => prev.map(f => f.id === id ? updated : f));
      }
    } catch (err) {
      console.error('Error desconectando firewall:', err);
    }
  };

  const handleEditFirewall = (id) => {
    const fw = firewalls.find(f => f.id === id);
    return fw;
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    // Mostrar pantalla de logout por 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error logout:', err);
    }
    router.push('/login');
  };

  // Filtrar firewalls por búsqueda
  const filteredFirewalls = firewalls.filter(fw => {
    const name = fw.name?.toLowerCase() || '';
    const host = fw.host?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return name.includes(search) || host.includes(search);
  });

  return (
    <div className="flex h-screen bg-[#09090b] text-gray-300 font-sans text-sm overflow-hidden">
      {loggingOut ? (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#09090b] via-[#0d0d0f] to-[#09090b] animate-fadeIn">
          <div className="text-center space-y-8">
            {/* Logo/Brand */}
            <div className="mb-8 animate-slideDown">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 mb-4 shadow-lg shadow-red-500/20">
                <img src="https://integrational3.com.mx/logorigen/i3logo25x25.png" alt="Integrational Logo" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Cerrando Sesión</h1>
              <p className="text-xs text-gray-500 mt-1 font-mono">SECURE LOGOUT</p>
            </div>

            {/* Loading Animation */}
            <div className="space-y-4 animate-fadeIn" style={{animationDelay: '0.3s'}}>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              
              {/* Logout Messages */}
              <div className="font-mono text-xs text-left space-y-1 max-w-md mx-auto">
                <div className="text-red-400 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.1s'}}>
                  <span className="animate-pulse">●</span>
                  <span>Encriptando datos de sesión...</span>
                </div>
                <div className="text-gray-500 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.3s'}}>
                  <span>✓</span>
                  <span>Desconectando de firewalls</span>
                </div>
                <div className="text-gray-500 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.5s'}}>
                  <span>✓</span>
                  <span>Limpiando credenciales</span>
                </div>
                <div className="text-red-400 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.7s'}}>
                  <span className="animate-pulse">◆</span>
                  <span>Cerrando túneles seguros...</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-xs mx-auto animate-fadeIn" style={{animationDelay: '0.5s'}}>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 animate-progressBar"></div>
              </div>
            </div>
          </div>
        </div>
      ) : !user || loading || minLoadTime ? (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#09090b] via-[#0d0d0f] to-[#09090b] animate-fadeIn">
          <div className="text-center space-y-8">
            {/* Logo/Brand */}
            <div className="mb-8 animate-slideDown">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/20">
                <img src="https://integrational3.com.mx/logorigen/i3logo25x25.png" alt="Integrational Logo" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight" style={{fontFamily: '"JetBrains Mono", "Fira Code", monospace', textShadow: '0 0 20px rgba(16, 185, 129, 0.4)'}}>
                INT3://HUB
              </h1>
              <p className="text-xs text-gray-500 mt-2 font-mono tracking-wider">
                <span className="text-emerald-500">[</span>SYSTEM ONLINE<span className="text-emerald-500">]</span>
              </p>
            </div>

            {/* Loading Animation */}
            <div className="space-y-4 animate-fadeIn" style={{animationDelay: '0.3s'}}>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              
              {/* Boot Messages */}
              <div className="font-mono text-xs text-left space-y-1 max-w-md mx-auto">
                <div className="text-emerald-400 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.1s'}}>
                  <span className="animate-pulse">●</span>
                  <span>Inicializando sistema...</span>
                </div>
                <div className="text-gray-500 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.3s'}}>
                  <span>✓</span>
                  <span>Módulos de seguridad cargados</span>
                </div>
                <div className="text-gray-500 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.5s'}}>
                  <span>✓</span>
                  <span>Verificando credenciales</span>
                </div>
                <div className="text-emerald-400 flex items-center gap-2 animate-fadeIn" style={{animationDelay: '0.7s'}}>
                  <span className="animate-pulse">◆</span>
                  <span>Conectando a firewalls...</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-xs mx-auto animate-fadeIn" style={{animationDelay: '0.5s'}}>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 animate-progressBar"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <Sidebar 
            firewalls={filteredFirewalls} 
            onAddFirewall={handleAddFirewall} 
            onSelectFirewall={handleSelectFirewall}
            onDeleteFirewall={handleDeleteFirewall}
            onDisconnectFirewall={handleDisconnectFirewall}
            onEditFirewall={handleEditFirewall}
          />
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b] relative z-10">
            <Topbar user={user} onLogout={handleLogout} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
              <Dashboard 
                firewalls={filteredFirewalls}
                selectedId={selectedId}
                onSelectFirewall={handleSelectFirewall}
                onDeleteFirewall={handleDeleteFirewall}
                onDisconnectFirewall={handleDisconnectFirewall}
                onEditFirewall={handleEditFirewall}
                onRefreshStats={connectAndFetchStats}
              />
            </div>
          </main>
        </>
      )}
    </div>
  );
};
export default Home;



