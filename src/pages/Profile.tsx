// src/pages/Profile.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getRole } from "../utils/token";
import { getUserProfile } from "../api/user";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
export function Profile() {
  const navigate = useNavigate();
  useEffect(() => {
    const redirectToCorrectProfile = async () => {
      // Verificar autenticación
      if (!getToken()) {
        navigate("/login");
        return;
      }
      try {
        // Intentar obtener el rol del localStorage primero
        let userRole = getRole();
        // Si no hay rol en localStorage, obtenerlo del backend
        if (!userRole) {
          const profile = await getUserProfile();
          userRole = profile.role || "CLIENTE";
        }
        // Redirigir según el rol
        if (userRole === "ADMINISTRADOR") {
          navigate("/admin-profile", { replace: true });
        } else {
          navigate("/user-profile", { replace: true });
        }
      } catch (error) {
        console.error("Error al obtener el perfil:", error);
        navigate("/login");
      }
    };

    redirectToCorrectProfile();
  }, [navigate]);
  // Mostrar loading mientras se determina el rol
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--Primary_0)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--Primary_5)]"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </main>
      <Footer />
    </>
  );
}


