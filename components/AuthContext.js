import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        // Redirect to login if not on login page
        if (router.pathname !== '/login') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('[Auth] Error checking auth:', err);
      setUser(null);
      if (router.pathname !== '/login') {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Hacer logout en el backend
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      // Limpiar estado localmente
      setUser(null);
      setLoading(false);
      // Pequeño delay para asegurar que la cookie se elimina antes de redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      // Redirigir a login
      await router.push('/login');
    } catch (err) {
      console.error('[Auth] Error logging out:', err);
      setUser(null);
      setLoading(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
