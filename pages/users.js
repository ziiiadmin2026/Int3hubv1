import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Users as UsersIcon, Plus, Edit2, Trash2, Shield, Mail, Calendar, Key, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      setUser(data.user);
      
      if (data.user.role !== 'admin') {
        router.push('/');
        return;
      }
      
      loadUsers();
    } catch (err) {
      console.error('Error checking auth:', err);
      router.push('/login');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Error cargando usuarios');
      
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        email: user.email || '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        email: '',
        role: 'user'
      });
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', email: '', role: 'user' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = editingUser 
        ? `/api/users/${editingUser.id}`
        : '/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password;
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error guardando usuario');
      }

      setSuccess(editingUser ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
      setTimeout(() => {
        handleCloseModal();
        loadUsers();
      }, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error eliminando usuario');
      }

      setSuccess('Usuario eliminado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
      loadUsers();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      user: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      operator: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    };
    
    return styles[role] || styles.user;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-emerald-400 font-mono">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-emerald-400 font-mono mb-2 transition-colors"
            >
              ← Volver al Dashboard
            </button>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400" style={{fontFamily: '"JetBrains Mono", monospace'}}>
              [USER_MANAGEMENT]
            </h1>
            <p className="text-gray-500 text-sm font-mono mt-1">Sistema de gestión de usuarios y permisos</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold rounded hover:shadow-lg hover:shadow-emerald-500/50 transition-all"
          >
            <Plus size={18} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="max-w-7xl mx-auto mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2 text-red-400">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="max-w-7xl mx-auto mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center gap-2 text-emerald-400">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Users Table */}
      <div className="max-w-7xl mx-auto bg-[#121214] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0c0c0e] border-b border-gray-800">
              <tr>
                <th className="text-left p-4 text-xs font-mono text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="text-left p-4 text-xs font-mono text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left p-4 text-xs font-mono text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="text-left p-4 text-xs font-mono text-gray-500 uppercase tracking-wider">Creado</th>
                <th className="text-right p-4 text-xs font-mono text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded flex items-center justify-center text-sm font-bold text-emerald-400">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{u.username}</div>
                        <div className="text-xs text-gray-500 font-mono">ID: {u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Mail size={14} className="text-gray-600" />
                      {u.email || <span className="text-gray-600 italic">Sin email</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border ${getRoleBadge(u.role)}`}>
                      <Shield size={12} />
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Calendar size={14} className="text-gray-600" />
                      {formatDate(u.createdAt)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                        title="Editar usuario"
                      >
                        <Edit2 size={16} />
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <UsersIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-mono">No hay usuarios registrados</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121214] border border-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {editingUser && <span className="text-gray-500 text-xs">(dejar vacío para no cambiar)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="user">User</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold rounded hover:shadow-lg hover:shadow-emerald-500/50 transition-all"
                >
                  {editingUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
