import React, { useState } from 'react';
import { Search, Bell, LogOut, User, Settings, Users, Shield, ChevronDown } from 'lucide-react';

const Topbar = ({ user, onLogout, searchTerm, onSearchChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-[#09090b]">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white tracking-tight uppercase">Dashboard pfSense</h1>
        <span className="h-4 w-px bg-gray-700 mx-2"></span>
        <div className="flex items-center text-xs text-gray-500 font-mono">
          <span className="mr-2">MULTI-FIREWALL</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar firewall..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#121214] border border-gray-700 text-sm rounded-sm pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-gray-600 text-gray-300"
          />
        </div>
        <button className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-sm hover:bg-gray-800 transition-colors">
          <Bell size={16} />
        </button>
        
        {/* User info & logout */}
        <div className="flex items-center gap-2 border-l border-gray-700 pl-4 relative">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 px-2 py-1 rounded transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-sm flex items-center justify-center text-xs font-bold text-emerald-400">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-gray-300">{user?.username}</p>
              <p className="text-[10px] text-gray-500 font-mono">{user?.role || 'operator'}</p>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#121214] border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-800 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded flex items-center justify-center text-sm font-bold text-emerald-400">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{user?.username}</p>
                      <p className="text-xs text-gray-500 font-mono uppercase">{user?.role || 'operator'}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button 
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors flex items-center gap-3 group"
                    onClick={() => {
                      setMenuOpen(false);
                      // TODO: Navegar a perfil de usuario
                      console.log('Perfil de usuario');
                    }}
                  >
                    <User size={16} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                    <div>
                      <div className="font-medium">Mi Perfil</div>
                      <div className="text-xs text-gray-500 font-mono">Configuración personal</div>
                    </div>
                  </button>

                  <button 
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors flex items-center gap-3 group"
                    onClick={() => {
                      setMenuOpen(false);
                      window.location.href = '/users';
                    }}
                  >
                    <Users size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                    <div>
                      <div className="font-medium">Gestión de Usuarios</div>
                      <div className="text-xs text-gray-500 font-mono">Admin panel</div>
                    </div>
                  </button>

                  <button 
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors flex items-center gap-3 group"
                    onClick={() => {
                      setMenuOpen(false);
                      // TODO: Navegar a configuración del sistema
                      console.log('Configuración del sistema');
                    }}
                  >
                    <Settings size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                    <div>
                      <div className="font-medium">Configuración</div>
                      <div className="text-xs text-gray-500 font-mono">System settings</div>
                    </div>
                  </button>

                  <button 
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors flex items-center gap-3 group"
                    onClick={() => {
                      setMenuOpen(false);
                      // TODO: Navegar a seguridad
                      console.log('Seguridad y logs');
                    }}
                  >
                    <Shield size={16} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                    <div>
                      <div className="font-medium">Seguridad</div>
                      <div className="text-xs text-gray-500 font-mono">Logs & audit trail</div>
                    </div>
                  </button>
                </div>

                {/* Logout Section */}
                <div className="border-t border-gray-800 py-2">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-red-950/30 hover:text-red-400 transition-colors flex items-center gap-3 group"
                  >
                    <LogOut size={16} className="text-gray-500 group-hover:text-red-400 transition-colors" />
                    <div>
                      <div className="font-medium">Cerrar Sesión</div>
                      <div className="text-xs text-gray-500 font-mono">Disconnect</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
