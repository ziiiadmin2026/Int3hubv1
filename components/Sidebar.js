import React from 'react';
import { Plus, CheckCircle, XCircle, AlertTriangle, Edit2, Trash2, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

const getStatusColor = (status) => {
  switch(status) {
    case 'online': return 'text-emerald-400 bg-emerald-900/30 border-emerald-800';
    case 'offline': return 'text-red-400 bg-red-900/30 border-red-800';
    default: return 'text-gray-400 bg-gray-800 border-gray-700';
  }
};

const Sidebar = ({
  firewalls = [],
  onSelectFirewall,
  onDeleteFirewall,
  onDisconnectFirewall,
  onEditFirewall,
  onOpenAddFirewall
}) => {

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0c0c0e] border-r border-gray-800 flex flex-col z-20">
      <div className="h-16 flex items-center px-6 border-b border-gray-800 bg-[#0f0f12]">
        <div className="flex items-center gap-3">
          <img src="https://integrational3.com.mx/logorigen/i3logo25x25.png" alt="Integrational Logo" className="w-11 h-11 object-contain" />
          <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight whitespace-nowrap text-xl" style={{fontFamily: '"JetBrains Mono", monospace'}}>INT3://</span>
        </div>
      </div>
      <div className="flex-1 py-6 space-y-2 px-3">
        <div className="text-xs text-gray-500 mb-2 font-mono">FIREWALLS</div>
        {firewalls.map(fw => (
          <div
            key={fw.id}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800/50 group bg-gray-900/40"
            onClick={() => {
              onSelectFirewall && onSelectFirewall(fw.id);
            }}>
            <div className="flex-1 cursor-pointer">
              <div className="text-gray-100 font-medium group-hover:text-white text-sm flex items-center gap-1">
                {fw.name}
                {fw.status === 'online' && <CheckCircle size={14} className="text-emerald-400 ml-1" />}
                {fw.status === 'offline' && <XCircle size={14} className="text-red-400 ml-1" />}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">{fw.ip}</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFirewall && onEditFirewall(fw.id);
                }}
                className="p-1 hover:bg-blue-900/50 rounded text-blue-400 hover:text-blue-300"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDisconnectFirewall && onDisconnectFirewall(fw.id);
                }}
                className="p-1 hover:bg-yellow-900/50 rounded text-yellow-400 hover:text-yellow-300"
                title="Desconectar"
              >
                <LogOut size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Eliminar ${fw.name}?`)) {
                    onDeleteFirewall && onDeleteFirewall(fw.id);
                  }
                }}
                className="p-1 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {/* status messages are shown in modal; sidebar stays presentational */}
        {onOpenAddFirewall && (
          <button
            className="flex items-center gap-2 px-3 py-2 mt-4 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-xs font-medium w-full"
            onClick={() => { onOpenAddFirewall(); }}
          >
            <Plus size={14} /> Agregar Firewall
          </button>
        )}
        
        <Link href="/settings">
          <button
            className="flex items-center gap-2 px-3 py-2 mt-2 bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 text-xs font-medium w-full border border-blue-800"
          >
            <Settings size={14} /> Configuración
          </button>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
