import React, { useState } from 'react';
import { Plus, CheckCircle, XCircle, AlertTriangle, Edit2, Trash2, LogOut } from 'lucide-react';
import AddFirewallModal from './AddFirewallModal';

const getStatusColor = (status) => {
  switch(status) {
    case 'online': return 'text-emerald-400 bg-emerald-900/30 border-emerald-800';
    case 'offline': return 'text-red-400 bg-red-900/30 border-red-800';
    default: return 'text-gray-400 bg-gray-800 border-gray-700';
  }
};

const Sidebar = ({ firewalls = [], onAddFirewall, onSelectFirewall, onDeleteFirewall, onDisconnectFirewall, onEditFirewall }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editFirewall, setEditFirewall] = useState(null);

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0c0c0e] border-r border-gray-800 flex flex-col z-20">
      <div className="h-16 flex items-center px-6 border-b border-gray-800 bg-[#0f0f12]">
        <div className="flex items-center gap-2">
          <img src="https://integrational3.com.mx/logorigen/i3logo25x25.png" alt="Integrational Logo" className="w-7 h-7 object-contain" />
          <span className="font-bold text-gray-100 tracking-wider whitespace-nowrap text-base">INT3 Hub</span>
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
                  setEditFirewall(fw);
                  setModalOpen(true);
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
        <button
          className="flex items-center gap-2 px-3 py-2 mt-4 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-xs font-medium w-full"
          onClick={() => { setEditFirewall(null); setModalOpen(true); }}
        >
          <Plus size={14} /> Agregar Firewall
        </button>
      </div>
      <AddFirewallModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditFirewall(null); }}
        onAdd={(fw, id, summary) => {
          // pass to parent
          onAddFirewall && onAddFirewall(fw, id, summary);
          setModalOpen(false);
          setEditFirewall(null);
        }}
        initialData={editFirewall}
      />
    </aside>
  );
};

export default Sidebar;
