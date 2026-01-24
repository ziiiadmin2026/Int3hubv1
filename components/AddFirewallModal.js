import React, { useState, useEffect, useRef } from 'react';

import { Loader2, CheckCircle, XCircle } from 'lucide-react';
let socket = null;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

const AddFirewallModal = ({ open, onClose, onAdd, initialData }) => {
  const isEditing = Boolean(initialData?.id);
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: '22',
    user: '',
    password: '',
    key: '',
    alert_emails: []
  });
  const [initialSshSnapshot, setInitialSshSnapshot] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [log, setLog] = useState('');
  const [status, setStatus] = useState(''); // '', 'pending', 'success', 'error'
  const [canAdd, setCanAdd] = useState(false);
  const [summary, setSummary] = useState(null);
  const logRef = useRef(null);

  const normalizeEmail = (email) => (email || '').trim().toLowerCase();

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        host: initialData.ip || initialData.host || '',
        port: initialData.port || '22',
        user: initialData.user || '',
        // Por seguridad, normalmente NO tenemos password/key al editar.
        // Se dejan en blanco para no sobrescribir credenciales existentes.
        password: '',
        key: '',
        alert_emails: initialData.alert_emails || []
      });
    } else {
      setForm({ name: '', host: '', port: '22', user: '', password: '', key: '', alert_emails: [] });
    }
    setLog('');
    setStatus('');
    setCanAdd(false);
    setNewEmail('');
    setSummary(null);
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }, [initialData, open]);

  // Si estamos editando: permitir guardar sin test, a menos que cambien campos SSH.
  useEffect(() => {
    if (!open) return;

    if (!isEditing) {
      setInitialSshSnapshot(null);
      return;
    }

    // Tomar snapshot al abrir.
    if (!initialSshSnapshot) {
      setInitialSshSnapshot({
        host: (initialData?.ip || initialData?.host || '').toString(),
        port: (initialData?.port || '22').toString(),
        user: (initialData?.user || '').toString()
      });
      // En modo editar, por defecto sí se puede guardar (sin probar SSH).
      setCanAdd(true);
      return;
    }

    const hostChanged = String(form.host || '') !== String(initialSshSnapshot.host || '');
    const portChanged = String(form.port || '') !== String(initialSshSnapshot.port || '');
    const userChanged = String(form.user || '') !== String(initialSshSnapshot.user || '');
    const passwordProvided = Boolean(form.password && form.password.trim().length > 0);
    const keyProvided = Boolean(form.key && form.key.trim().length > 0);
    const sshChanged = hostChanged || portChanged || userChanged || passwordProvided || keyProvided;

    // Si el usuario cambió SSH (o ingresó nuevas credenciales), pedimos test.
    if (sshChanged) {
      setCanAdd(status === 'success');
    } else {
      setCanAdd(true);
    }
  }, [open, isEditing, initialData, initialSshSnapshot, form.host, form.port, form.user, form.password, form.key, status]);

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
    
    console.log('[Modal] Iniciando test de conexión con:', { host: form.host, port: form.port, user: form.user });
    
    import('socket.io-client').then(({ io }) => {
      socket = io(API_BASE);
      
      socket.on('connect', () => {
        console.log('[Modal] WebSocket conectado');
        const sshData = {
          host: form.host,
          port: form.port,
          user: form.user,
          password: form.password,
          key: form.key
        };
        console.log('[Modal] Emitiendo ssh-connect con:', sshData);
        socket.emit('ssh-connect', sshData);
      });
      
      socket.on('connect_error', (err) => {
        console.error('[Modal] Error de conexión WebSocket:', err);
        setLog('Error: No se pudo conectar al servidor WebSocket');
        setStatus('error');
      });
      
      socket.on('ssh-log', (msg) => {
        setLog((prev) => prev + (prev ? '\n' : '') + msg);
      });
      
      socket.on('ssh-summary', (summary) => {
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

  const handleAdd = (e) => {
    e.preventDefault();
    if (canAdd) {
      const pendingEmail = normalizeEmail(newEmail);
      const baseEmails = Array.isArray(form.alert_emails) ? form.alert_emails : [];
      const normalizedExisting = new Set(baseEmails.map(normalizeEmail));
      const alert_emails = pendingEmail && !normalizedExisting.has(pendingEmail)
        ? [...baseEmails, pendingEmail]
        : baseEmails;

      const payload = {
        ...form,
        alert_emails,
        // En edición: si el usuario deja vacío, NO sobrescribimos credenciales.
        password: isEditing && !form.password ? undefined : form.password,
        key: isEditing && !form.key ? undefined : form.key
      };
      onAdd(payload, initialData?.id, summary);
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
        <h2 className="text-lg font-bold text-gray-100 mb-4">{isEditing ? 'Editar Firewall pfSense' : 'Agregar Firewall pfSense'}</h2>
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
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder={isEditing ? 'Dejar en blanco para conservar la actual' : ''} className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Clave Privada (opcional)</label>
            <textarea name="key" value={form.key} onChange={handleChange} rows={2} placeholder={isEditing ? 'Dejar en blanco para conservar la actual' : ''} className="w-full px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">📧 Correos de Alerta (opcional)</label>
            <p className="text-xs text-gray-500 mb-2">Correos específicos para este firewall. Si está vacío, usa los correos globales de settings.</p>
            <div className="flex gap-2 mb-2">
              <input 
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const emailToAdd = normalizeEmail(newEmail);
                    const normalizedExisting = new Set((form.alert_emails || []).map(normalizeEmail));
                    if (emailToAdd && !normalizedExisting.has(emailToAdd)) {
                      setForm({ ...form, alert_emails: [...(form.alert_emails || []), emailToAdd] });
                      setNewEmail('');
                    }
                  }
                }}
                placeholder="correo@ejemplo.com"
                className="flex-1 px-3 py-2 bg-[#121214] border border-gray-700 rounded text-gray-100 focus:outline-none text-sm"
              />
              <button 
                type="button"
                onClick={() => {
                  const emailToAdd = normalizeEmail(newEmail);
                  const normalizedExisting = new Set((form.alert_emails || []).map(normalizeEmail));
                  if (emailToAdd && !normalizedExisting.has(emailToAdd)) {
                    setForm({ ...form, alert_emails: [...(form.alert_emails || []), emailToAdd] });
                    setNewEmail('');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                +
              </button>
            </div>
            {normalizeEmail(newEmail) && !(form.alert_emails || []).map(normalizeEmail).includes(normalizeEmail(newEmail)) && (
              <div className="text-[11px] text-yellow-400/90 mb-2">
                Tip: presiona <span className="font-mono">Enter</span> o <span className="font-mono">+</span> para agregarlo al listado (o se guardará automáticamente al guardar).
              </div>
            )}
            {form.alert_emails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.alert_emails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded text-sm">
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, alert_emails: form.alert_emails.filter((_, i) => i !== idx) })}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(!form.alert_emails || form.alert_emails.length === 0) && (
              <div className="mt-2 text-[11px] text-gray-400 bg-gray-900/40 border border-gray-800 rounded px-3 py-2">
                No hay correos específicos configurados para este firewall. Se usarán los correos globales definidos en <span className="font-mono">Configuración</span>.
              </div>
            )}
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
            {status === 'success' && <CheckCircle className="text-emerald-400" size={18} />}{isEditing ? 'Guardar Cambios' : 'Agregar Firewall'}
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
