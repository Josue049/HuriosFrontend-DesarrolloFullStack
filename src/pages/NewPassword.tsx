import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";
import Navbar from "../components/layout/Navbar";
import { Input } from "../components/ui/Input";
import ButtonShowPsd from "../components/ui/ButtonShowPwd";

/*
 NewPassword.tsx
 - Página para establecer nueva contraseña usando token del email
 - Recibe token y email por URL params
 - Permite al usuario establecer nueva contraseña
*/

export const NewPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verContra,setVerContra]=useState(false)
  const [verContraConfirm,setVerContraConfirm]=useState(false)
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    // Redirigir si no hay token o email
    if (!token || !email) {
      navigate("/login");
    }
  }, [token, email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);
    
    try {
      await resetPassword(email!, token!, newPassword);
      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordValid = newPassword.length >= 8;
  const isConfirmValid = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = isPasswordValid && isConfirmValid;

  if (!token || !email) {
    return null; // No renderizar nada mientras redirige
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-[var(--Primary_0)] to-[var(--Primary_2)] flex flex-col justify-center items-center relative overflow-hidden">
        {/* Elemento decorativo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[var(--Primary_3)] rounded-full opacity-15 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--Primary_4)] rounded-full opacity-10 blur-3xl"></div>
        </div>

        {/* Contenedor principal */}
        <div className="relative z-10 w-full max-w-md mx-8 sm:mx-6 md:mx-4">
          <div className="bg-white/85 backdrop-blur-sm shadow-xl border border-white/30 rounded-2xl p-8">
            
            {!success ? (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--Primary_4)] to-[var(--Primary_5)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-[var(--Primary_7)] mb-2">
                    Nueva Contraseña
                  </h1>
                  <p className="text-[var(--Primary_5)] text-sm">
                    Establece una nueva contraseña para tu cuenta
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                      type={verContra ? "text" : "password"}
                      label="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      rightIcon={
                      <ButtonShowPsd
                        onClick={() => setVerContra(prev => !prev)}
                        aria-label={verContra ? "Ocultar contraseña" : "Ver contraseña"}
                        className="bg-transparent border-0 cursor-pointer text-inherit p-0 flex items-center"
                        >
                        <span className="material-symbols-outlined"  translate="no">
                          {verContra ? "visibility" : "visibility_off"}
                        </span>
                      </ButtonShowPsd>
                      }
                    />
                    {newPassword.length > 0 && !isPasswordValid && (
                      <p className="text-red-500 text-xs mt-1">La contraseña debe tener al menos 8 caracteres</p>
                    )}
                    <Input
                      label="Confirmar contraseña"
                      type={verContraConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      rightIcon={
                        <ButtonShowPsd
                          onClick={() => setVerContraConfirm(prev => !prev)}
                          aria-label={verContraConfirm ? "Ocultar contraseña confirmada" : "Ver contraseña confirmada"}
                          className="bg-transparent border-0 cursor-pointer text-inherit p-0 flex items-center"
                          >
                          <span className="material-symbols-outlined"  translate="no">
                            {verContraConfirm ? "visibility" : "visibility_off"}
                          </span>
                        </ButtonShowPsd>
                      }
                    />
                    {confirmPassword.length > 0 && !isConfirmValid && (
                      <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
                    )}

                  {/* Error message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="w-full bg-gradient-to-r cursor-pointer from-[var(--Primary_4)] to-[var(--Primary_5)] text-white py-3 px-4 rounded-lg font-medium hover:from-[var(--Primary_5)] hover:to-[var(--Primary_6)] transition-all duration-300 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Actualizando...
                      </div>
                    ) : (
                      "Actualizar contraseña"
                    )}
                  </button>
                </form>

                {/* Enlace de regreso */}
                <div className="text-center mt-6">
                  <a 
                    href="/login" 
                    className="text-[var(--Primary_5)] hover:text-[var(--Primary_6)] text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver al inicio de sesión
                  </a>
                </div>
              </>
            ) : (
              /* Estado de Éxito */
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[var(--Primary_7)] mb-2">
                  ¡Contraseña actualizada!
                </h2>
                <p className="text-[var(--Primary_5)] text-sm mb-6">
                  Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en unos segundos.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-[var(--Primary_5)] border-t-transparent rounded-full animate-spin"></div>
                  Redirigiendo...
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};
