import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CatalogProvider } from './catalog';
import { OrderProvider } from './order';
import './styles/index.css';

// Opt into scroll reveals only when we know they can be undone again, so a
// failed script leaves the page fully visible rather than blank.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('reveal-ready');
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CatalogProvider>
      <OrderProvider>
        <App />
      </OrderProvider>
    </CatalogProvider>
  </React.StrictMode>,
);
