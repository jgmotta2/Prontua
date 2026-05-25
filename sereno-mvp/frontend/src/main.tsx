import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from '@app/providers/QueryProvider';
import { AppRoutes } from '@app/routes/AppRoutes';
import '@/styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado no DOM');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <AppRoutes />
      </QueryProvider>
    </BrowserRouter>
  </StrictMode>,
);
