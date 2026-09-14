const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  status: number;
  detalles?: unknown;

  constructor(message: string, status: number, detalles?: unknown) {
    super(message);
    this.status = status;
    this.detalles = detalles;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('ishoes_token');
}

export function guardarSesion(token: string): void {
  localStorage.setItem('ishoes_token', token);
}

export function cerrarSesion(): void {
  localStorage.removeItem('ishoes_token');
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const respuesta = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!respuesta.ok) {
    let mensaje = 'Error de servidor';
    let detalles: unknown;
    try {
      const cuerpo = await respuesta.json();
      if (Array.isArray(cuerpo.message)) {
        mensaje = cuerpo.message.join(', ');
      } else {
        mensaje = cuerpo.message ?? mensaje;
      }
      detalles = cuerpo;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    if (respuesta.status === 401) {
      cerrarSesion();
    }
    throw new ApiError(mensaje, respuesta.status, detalles);
  }
  return respuesta.json() as Promise<T>;
}

export function get<T = unknown>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function patch<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function del<T = unknown>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export async function subirFoto(archivo: File): Promise<string> {
  const form = new FormData();
  form.append('file', archivo);
  const respuesta = await fetch(`${BASE}/storage/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!respuesta.ok) {
    throw new ApiError('No se pudo subir la foto', respuesta.status);
  }
  const cuerpo = await respuesta.json();
  return cuerpo.url as string;
}