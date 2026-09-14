import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Pedidos from './pages/Pedidos';
import NuevoPedido from './pages/NuevoPedido';
import DetallePedido from './pages/DetallePedido';
import Establecimientos from './pages/Establecimientos';
import Usuarios from './pages/Usuarios';

function RutaPrivada({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RutaPrivada>
                <Pedidos />
              </RutaPrivada>
            }
          />
          <Route
            path="/nuevo-pedido"
            element={
              <ProtectedRoute roles={['DESPACHADOR', 'ADMIN']}>
                <Layout>
                  <NuevoPedido />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pedidos/:id"
            element={
              <RutaPrivada>
                <DetallePedido />
              </RutaPrivada>
            }
          />
          <Route
            path="/establecimientos"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <Layout>
                  <Establecimientos />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <Layout>
                  <Usuarios />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}