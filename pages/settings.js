import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthContext';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { Bell, Mail, Plus, X, Save, ArrowLeft } from 'lucide-react';

export default function Settings() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [settings, setSettings] = useState({
    notifications_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    alert_emails: [],
    monitor_interval: 300000
  });
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchSettings();
    }
  }, [user, loading]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '✓ Configuración guardada correctamente' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar configuración' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmail = () => {
    if (newEmail && !settings.alert_emails.includes(newEmail)) {
      setSettings({
        ...settings,
        alert_emails: [...settings.alert_emails, newEmail]
      });
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email) => {
    setSettings({
      ...settings,
      alert_emails: settings.alert_emails.filter(e => e !== email)
    });
  };

  const handleTestEmail = async () => {
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: '✓ Email de prueba enviado' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: `Error: ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar email de prueba' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-blue-400" />
                <h1 className="text-3xl font-bold">Configuración de Notificaciones</h1>
              </div>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                Volver al Dashboard
              </button>
            </div>

            {message.text && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-6 space-y-6">
              {/* Activar notificaciones */}
              <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                <div>
                  <h3 className="text-lg font-semibold">Activar Notificaciones</h3>
                  <p className="text-sm text-gray-400">Recibir alertas cuando un firewall falle o se recupere</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled}
                    onChange={(e) => setSettings({...settings, notifications_enabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Configuración SMTP */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Servidor SMTP
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Host SMTP</label>
                    <input
                      type="text"
                      value={settings.smtp_host}
                      onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="smtp.titan.email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Puerto</label>
                    <input
                      type="number"
                      value={settings.smtp_port}
                      onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Usuario SMTP</label>
                    <input
                      type="email"
                      value={settings.smtp_user}
                      onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Contraseña SMTP</label>
                    <input
                      type="password"
                      value={settings.smtp_pass}
                      onChange={(e) => setSettings({...settings, smtp_pass: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email Remitente</label>
                  <input
                    type="email"
                    value={settings.smtp_from}
                    onChange={(e) => setSettings({...settings, smtp_from: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="notificaciones@ejemplo.com"
                  />
                </div>
              </div>

              {/* Lista de correos de alerta */}
              <div className="space-y-4 border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold">Correos de Alerta</h3>
                <p className="text-sm text-gray-400">Estos correos recibirán las notificaciones de alertas</p>
                
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="nuevo@ejemplo.com"
                  />
                  <button
                    onClick={handleAddEmail}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  {settings.alert_emails.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No hay correos configurados</p>
                  ) : (
                    settings.alert_emails.map((email, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-700 rounded px-4 py-2">
                        <span>{email}</span>
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Intervalo de monitoreo */}
              <div className="border-t border-gray-700 pt-4">
                <label className="block text-sm text-gray-400 mb-1">Intervalo de Monitoreo (minutos)</label>
                <input
                  type="number"
                  value={settings.monitor_interval / 60000}
                  onChange={(e) => setSettings({...settings, monitor_interval: parseInt(e.target.value) * 60000})}
                  className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">Cada cuánto tiempo verificar el estado de los firewalls</p>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 border-t border-gray-700 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
                
                <button
                  onClick={handleTestEmail}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Enviar Email de Prueba
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
