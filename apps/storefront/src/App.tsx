import { ComponentType, useEffect, useRef } from 'react';
import {
  createBrowserRouter,
  createHashRouter,
  Navigate,
  Outlet,
  RouteObject,
  RouterProvider,
  useLocation,
  useNavigation,
} from 'react-router-dom';
import Home from './pages/Home';
import { PageLoader } from './components/Dots';
import { ToastProvider } from './components/Toast';

/**
 * Pages other than Home load when first visited, so phones on mobile data
 * start faster. Route `lazy` loads a page before the navigation completes,
 * which also lets each route change run inside a View Transition.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => {
  const module = await load();
  return { Component: module.default };
};

/**
 * On navigation, scroll to the top and move focus into the new page so screen
 * reader and keyboard users land on the content.
 */
function RouteChange() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

/** A thin bar across the top while the next page's code is on its way. */
function RouteProgress() {
  const navigation = useNavigation();
  return navigation.state === 'loading' ? <div className="route-progress" role="progressbar" aria-label="Loading page" /> : null;
}

function Root() {
  return (
    <ToastProvider>
      <RouteChange />
      <RouteProgress />
      <Outlet />
    </ToastProvider>
  );
}

const routes: RouteObject[] = [
  {
    element: <Root />,
    HydrateFallback: PageLoader,
    children: [
      { path: '/', element: <Home /> },
      { path: '/print', lazy: page(() => import('./pages/PrintServices')) },
      { path: '/shop', lazy: page(() => import('./pages/Shop')) },
      { path: '/department/:slug', lazy: page(() => import('./pages/Shop')) },
      { path: '/search', lazy: page(() => import('./pages/Shop')) },
      { path: '/product/:id', lazy: page(() => import('./pages/ProductPage')) },
      { path: '/cart', lazy: page(() => import('./pages/Cart')) },
      { path: '/list', element: <Navigate to="/cart" replace /> },
      { path: '/checkout', lazy: page(() => import('./pages/Checkout')) },
      { path: '/confirmation', lazy: page(() => import('./pages/OrderConfirmation')) },
      { path: '/track-order', lazy: page(() => import('./pages/TrackOrder')) },
      { path: '/faq', lazy: page(() => import('./pages/Faq')) },
      { path: '/about', lazy: page(() => import('./pages/About')) },
      { path: '/contact', lazy: page(() => import('./pages/Contact')) },
      { path: '*', lazy: page(() => import('./pages/NotFound')) },
    ],
  },
];

// The demo is one self-contained file, so its routes live in the hash.
const router = (import.meta.env.VITE_DEMO === '1' ? createHashRouter : createBrowserRouter)(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
