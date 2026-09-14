import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from './types';
import { get, post, guardarSesion, cerrarSesion, getToken } from './api';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCargando(false);
      return;
    }
    get<Usuario>('/auth/perfil')
      .then(setUsuario)
      .catch(() => cerrarSesion())
      .finally(() => setCargando(false));
  }, []);

  async function login(email: string, password: string) {
    const respuesta = await post<LoginResponse>('/auth/login', { email, password });
    guardarSesion(respuesta.accessToken);
    setUsuario(respuesta.usuario);
  }

  function logout() {
    cerrarSesion();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}