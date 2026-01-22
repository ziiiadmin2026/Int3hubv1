import React from 'react';
import { Search, Bell, LogOut, User } from 'lucide-react';
import { useAuth } from './AuthContext';

const Topbar = ({ user }) => {
  const { logout } = useAuth();

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
            className="bg-[#121214] border border-gray-700 text-sm rounded-sm pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-gray-500 transition-colors placeholder:text-gray-600 text-gray-300"
          />
        </div>
        <button className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-sm hover:bg-gray-800 transition-colors">
          <Bell size={16} />
        </button>
        
        {/* User info & logout */}
        <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-sm flex items-center justify-center text-xs font-bold text-emerald-400">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-gray-300">{user?.username}</p>
              <p className="text-[10px] text-gray-500">{user?.role || 'user'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-400 border border-gray-700 rounded-sm hover:bg-red-950/30 hover:border-red-500/30 transition-colors group"
            title="Cerrar sesión"
          >
            <LogOut size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
