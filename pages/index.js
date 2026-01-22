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

  // Cargar firewalls al iniciar
  useEffect(() => {
    loadFirewalls();
  }, []);

  // Auto-actualizar todos los firewalls para obtener WANs
  useEffect(() => {
    if (firewalls.length > 0) {
      // Esperar 2 segundos y luego actualizar cada firewall
      const timer = setTimeout(() => {
        firewalls.forEach((fw, idx) => {
          // Actualizar uno por uno con delay para no saturar
          setTimeout(() => {
            connectAndFetchStats(fw.id);
          }, idx * 2000);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [firewalls.length]); // Solo cuando cambia la cantidad de firewalls

  // Cargar firewalls desde BD
  const loadFirewalls = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/firewalls');
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
        headers: { 'Content-Type': 'application/json' }
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
        method: 'DELETE'
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

  return (
    <div className="flex h-screen bg-[#09090b] text-gray-300 font-sans text-sm overflow-hidden">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-100 mb-2">Cargando...</div>
            <p className="text-gray-400">Inicializando base de datos...</p>
          </div>
        </div>
      ) : (
        <>
          <Sidebar 
            firewalls={firewalls} 
            onAddFirewall={handleAddFirewall} 
            onSelectFirewall={handleSelectFirewall}
            onDeleteFirewall={handleDeleteFirewall}
            onDisconnectFirewall={handleDisconnectFirewall}
            onEditFirewall={handleEditFirewall}
          />
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b] relative z-10">
            <Topbar user={{ username: 'admin', role: 'admin' }} />
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
              <Dashboard 
                firewalls={firewalls}
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



