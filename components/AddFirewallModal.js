import React, { useState, useEffect, useRef } from 'react';

import { Loader2, CheckCircle, XCircle } from 'lucide-react';
let socket = null;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

const AddFirewallModal = ({ open, onClose, onAdd, initialData }) => {
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: '22',
    user: '',
    password: '',
    key: ''
  });
  const [log, setLog] = useState('');
  const [status, setStatus] = useState(''); // '', 'pending', 'success', 'error'
  const [canAdd, setCanAdd] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        host: initialData.ip || initialData.host || '',
        port: initialData.port || '22',
        user: initialData.user || '',
        password: initialData.password || '',
        key: initialData.key || ''
      });
    } else {
      setForm({ name: '', host: '', port: '22', user: '', password: '', key: '' });
    }
    setLog('');
    setStatus('');
    setCanAdd(false);
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }, [initialData, open]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTestConnection = (e) => {
    e.preventDefault();
    setLog('');
    setStatus('pending');
    setCanAdd(false);
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    import('socket.io-client').then(({ io }) => {
      socket = io(API_BASE);
      socket.emit('ssh-connect', form);
      socket.on('ssh-log', (msg) => {
        setLog((prev) => prev + (prev ? '\n' : '') + msg);
      });
      socket.on('ssh-summary', (summary) => {
        // store parsed summary
        setSummary(summary);
      });

      socket.on('ssh-end', (data) => {
        if (data.success) {
          setStatus('success');
          setCanAdd(true);
        } else {
          setStatus('error');
          setCanAdd(false);
        }
      });
    });
  };

  const [summary, setSummary] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    if (canAdd) {
      onAdd(form, initialData?.id, summary);
      onClose();
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    }
  };


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#18181b] border border-gray-700 rounded-lg shadow-lg w-full max-w-md p-6 relative animate-enter">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl">×</button>
        <h2 className="text-lg font-bold text-gray-100 mb-4">Agregar Firewall pfSense</h2>
        <form onSubmit={handleTestConnection} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre</label>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">IP o Dominio</label>
            <input name="host" value={form.host} onChange={handleChange} required className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Usuario SSH</label>
              <input name="user" value={form.user} onChange={handleChange} required className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-400 mb-1">Puerto</label>
              <input name="port" value={form.port} onChange={handleChange} required className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Contraseña SSH</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Clave Privada (opcional)</label>
            <textarea name="key" value={form.key} onChange={handleChange} rows={2} className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
          </div>
          <button type="submit" className="w-full py-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors" disabled={status === 'pending'}>
            {status === 'pending' ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Conectando...</span>
            ) : 'Probar Conexión'}
          </button>
        </form>
        <div ref={logRef} className="mt-4 p-3 rounded text-xs whitespace-pre-line bg-gray-900 text-gray-200 max-h-40 overflow-y-auto border border-gray-800" style={{ minHeight: 60 }}>
          {log || 'Esperando prueba de conexión...'}
        </div>
        <button
          className={`w-full py-2 mt-2 font-bold rounded transition-colors ${canAdd ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
          onClick={handleAdd}
          disabled={!canAdd}
        >
          <span className="flex items-center justify-center gap-2">
            {status === 'success' && <CheckCircle className="text-emerald-400" size={18} />}Agregar Firewall
          </span>
        </button>
        {status === 'error' && (
          <div className="mt-2 text-xs text-red-400 flex items-center gap-2"><XCircle size={16} /> Error de conexión, revisa los datos e inténtalo de nuevo.</div>
        )}
      </div>
    </div>
  );
};

export default AddFirewallModal;
