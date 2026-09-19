import { useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Department from "./pages/Department";
import Search from "./pages/Search";
import ProductPage from "./pages/ProductPage";
import OrderList from "./pages/OrderList";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Faq from "./pages/Faq";
import NotFound from "./pages/NotFound";
import TrackOrder from "./pages/TrackOrder";
import PrintServices from "./pages/PrintServices";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";

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
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteChange />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/print" element={<PrintServices />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/department/:slug" element={<Department />} />
        <Route path="/search" element={<Search />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/list" element={<OrderList />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirmation" element={<OrderConfirmation />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
