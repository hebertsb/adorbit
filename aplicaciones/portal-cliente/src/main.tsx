import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacion } from './aplicacion';
import { ErrorApi } from './api/cliente-http';
import { ProveedorAutenticacion } from './autenticacion/contexto';
import './estilos/global.css';

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      // Con el service worker, "sin conexion" igual puede responderse desde la cache: siempre se intenta el fetch.
      networkMode: 'always',
      staleTime: 30_000,
      retry: (intento, error) =>
        !(error instanceof ErrorApi && [401, 403, 404].includes(error.estado)) && intento < 2,
    },
  },
});

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorAutenticacion>
        <Aplicacion />
      </ProveedorAutenticacion>
    </QueryClientProvider>
  </StrictMode>,
);
