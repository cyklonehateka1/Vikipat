import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CatalogProvider } from './catalog';
import { OrderProvider } from './order';
import './styles/index.css';

// Scroll reveals are only armed when motion is welcome, so a failed script or
// a reduced-motion setting never leaves content hidden.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('can-reveal');
}

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <CatalogProvider>
        <OrderProvider>
          <App />
        </OrderProvider>
      </CatalogProvider>
    </React.StrictMode>,
  );

// The demo build answers API calls inside the page, so it runs with no server.
if (import.meta.env.VITE_DEMO === '1') {
  import('./demo/mockApi').then(({ installDemoApi }) => {
    installDemoApi();
    render();
  });
} else {
  render();
}
