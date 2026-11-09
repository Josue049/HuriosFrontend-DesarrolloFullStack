// src/routes/AppRoutes.tsx
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Home from "../pages/Home";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { VerifyEmail } from "../pages/VerifyEmail";
import { ResetPassword } from "../pages/ResetPassword";
import { NewPassword } from "../pages/NewPassword";
import Products from "../pages/Products";
import { About } from "../pages/About";
import { Cart } from "../pages/Cart";
import { Checkout } from "../pages/Checkout";
import { Payment } from "../pages/Payment";
import { PaymentResult } from "../pages/PaymentResult";
import { CartProvider } from "../context/CartContext";
import CartSidebar from "../components/cart/CartSidebar";
import { UserProfile } from "../pages/UserProfile";
import { AdminProfile } from "../pages/AdminProfile";
import { Profile } from "../pages/Profile";
import { Inventory } from "../pages/Inventory";
import BoletasFacturas from "../pages/BoletasFacturas";
import { Category } from "../pages/Category";
import { MyOrders } from "../pages/MyOrders";
import RealtimeNotifier from "../components/realtime/RealtimeNotifier";
import WhatsAppButton from "../components/whatsapp/WhatsAppButton";

function GlobalNavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const target = (event as CustomEvent<string>).detail;
      if (target) {
        navigate(target, { replace: true });
      }
    };
    window.addEventListener("hurios-navigate", handleNavigate);
    return () => {
      window.removeEventListener("hurios-navigate", handleNavigate);
    };
  }, [navigate]);

  return null;
}

interface AppRoutesProps {
  showFloatingWidgets?: boolean;
}

const AppRoutes: React.FC<AppRoutesProps> = ({ showFloatingWidgets = true }) => (
  <CartProvider>
    <Router>
      <GlobalNavigationListener />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/new-password" element={<NewPassword />} />
        <Route path="/products" element={<Products />} />
        <Route path="/category/:categoryId" element={<Category />} />
        <Route path="/about" element={<About />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/pago/exito" element={<PaymentResult />} />
        <Route path="/pago/fallo" element={<PaymentResult />} />
        <Route path="/pago/pendiente" element={<PaymentResult />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user-profile" element={<UserProfile />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/admin-profile" element={<AdminProfile />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/boletas-facturas" element={<BoletasFacturas />} />

        {/* catch-all: muestra la location en la UI si no hubo match */}
        <Route
          path="*"
          element={
            <div style={{ padding: 24 }}>
              <h2>Ruta no encontrada</h2>
              <p>La ruta solicitada no coincide con ninguna ruta definida.</p>
            </div>
          }
        />
      </Routes>

      {/* CartSidebar global - se muestra en toda la aplicación */}
      <CartSidebar />

      {/* Notificador WebSocket en tiempo real (dentro de Router para navegación SPA sin recarga) y WhatsApp */}
      {showFloatingWidgets && (
        <>
          <RealtimeNotifier />
          <WhatsAppButton />
        </>
      )}
    </Router>
  </CartProvider>
);

export default AppRoutes;
