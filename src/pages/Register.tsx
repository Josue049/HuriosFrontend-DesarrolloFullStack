import React, { useState } from "react";
import { ButtonState } from "../components/ui/ButtonState";
import { Input } from "../components/ui/Input";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";

/*
  Register.tsx
  - formulario de registro (nombre, correo, celular, clave)
  - al registrar exitosamente: redirige a /verify-email?email=<email>
  - llama al endpoint POST /auth/register en el backend
  - usa import.meta.env.VITE_API_URL si está definido, sino http://localhost:8080
*/

export function Register() {
  const navigate = useNavigate(); // hook para navegar programáticamente
  // campos del formulario
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [clave, setClave] = useState("");
  const [repetirClave, setRepetirClave] = useState("");

  // estados UI
  const [clicked, setClicked] = useState(false); // para ButtonState (animación)
  const [loading, setLoading] = useState(false);  // para bloquear UI mientras se hace la llamada
  const [error, setError] = useState<string | null>(null); // mostrar errores al usuario

  // validaciones locales
  const isEmailValid = (() => {
    // Lista de dominios válidos conocidos
    const validDomains = [
      'gmail', 'yahoo', 'hotmail', 'outlook', 'live', 'msn', 'icloud', 'me',
      'aol', 'protonmail', 'tutanota', 'zoho', 'yandex', 'mail', 'gmx',
      // Dominios educativos
      'upc', 'unmsm', 'pucp', 'ulima', 'usil', 'utp', 'tecsup', 'senati',
      // Dominios gubernamentales y empresariales peruanos
      'gob', 'minsa', 'sunat', 'reniec', 'essalud', 'produce', 'minedu',
      // Dominios corporativos conocidos
      'empresa', 'company', 'corp', 'business', 'work', 'office'
    ];
    
    // Expresión regular para extraer el dominio
    const emailPattern = /^[^\s@]+@([^\s@]+)\.([a-z]{2,})$/i;
    const match = correo.match(emailPattern);
    
    if (!match) return false;
    
    const domain = match[1].toLowerCase();
    const extension = match[2].toLowerCase();
    
    // Verificar extensión válida
    const validExtensions = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'co', 'es', 'pe', 'cl', 'ar', 'mx'];
    const isValidExtension = validExtensions.includes(extension);
    
    // Verificar dominio válido
    const isValidDomain = validDomains.includes(domain);
    
    return isValidExtension && isValidDomain;
  })();
  
  const isPasswordMatch = clave.length >= 8 && clave === repetirClave;
  // Validación para números de celular peruanos (inician con 9 y tienen 9 dígitos)
  const isCelularValid = celular.length === 9 && /^9[0-9]{8}$/.test(celular);
  const isFormValid =
    nombre.trim() !== "" &&
    isEmailValid &&
    isCelularValid &&
    isPasswordMatch;

  // manejador del submit: hace POST /auth/register y redirige a verify-email
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // si el formulario no es válido, no intentar
    if (!isFormValid) {
      setError("Completa correctamente todos los campos.");
      return;
    }

    setLoading(true);
    setClicked(true); // activar animación del botón (si tu componente lo usa)

    try {
      await registerUser({
        fullName: nombre,
        email: correo,
        password: clave,
        phone: celular,
      });

      // respuesta OK -> redirigir al formulario de verificación
      // pasamos el email por query para autocompletar el campo en VerifyEmail
      navigate(`/verify-email?email=${encodeURIComponent(correo)}`);

    } catch (err: unknown) {
      // error de red u otro
      if (err instanceof Error) {
        setError(err.message || "Error de conexión al registrar");
      } else {
        setError("Error de conexión al registrar");
      }
      setClicked(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--Primary_0)] via-[var(--Primary_1)] to-[var(--Primary_2)] flex flex-col justify-center items-center relative overflow-hidden py-8">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--Primary_3)] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[var(--Primary_4)] rounded-full opacity-15 blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[var(--Primary_2)] rounded-full opacity-10 blur-2xl"></div>
      </div>

      {/* Contenedor principal del formulario */}
      <div className="relative z-10 w-full max-w-lg mx-8 sm:mx-6 md:mx-4">
        <div className="bg-white/90 backdrop-blur-sm shadow-2xl border border-white/20 rounded-2xl p-6 sm:p-8 md:p-10">
          {/* Header con logo */}
          <div className="text-center mb-6">
            <div className="mb-4">
              <img 
                src="/assets/imgs/logo.webp" 
                className="h-16 w-auto mx-auto drop-shadow-lg" 
                alt="Hurios Rally Logo" 
                title="Logo Hurios Rally"
              />
            </div>
            <h1 className="text-2xl font-bold text-[var(--Primary_7)] mb-2">
              Crear cuenta nueva
            </h1>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Input para nombre */}
              <div className="sm:col-span-2">
                <Input 
                  label="Nombre completo" 
                  type="text" 
                  onChange={(e) => setNombre(e.target.value)} 
                  placeholder="Tu nombre completo"
                />
              </div>

              {/* Input para correo */}
              <div className="sm:col-span-2">
                <Input 
                  label="Correo electrónico" 
                  type="email" 
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)} 
                  placeholder="ejemplo@gmail.com" 
                />
                {/* Validación visual del correo */}
                {correo.length > 0 && (
                  <div className="mt-1 text-xs">
                    <p className={`${isEmailValid ? 'text-green-600' : 'text-red-500'}`}>
                      Válido (gmail, yahoo, hotmail, outlook, etc.) {isEmailValid ? "OK" : "X"}
                    </p>
                    {!isEmailValid && correo.includes('@') && correo.includes('.') && (
                      <p className="text-amber-600 text-xs mt-1">
                        Usa proveedores conocidos: gmail.com, yahoo.com, hotmail.com, outlook.com
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Input para celular */}
              <div className="sm:col-span-2">
                <Input 
                  label="Número de celular" 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={celular}
                  onChange={(e) => {
                    // Solo permitir números, eliminar cualquier caracter que no sea número
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    // Limitar a máximo 9 dígitos
                    if (value.length <= 9) {
                      setCelular(value);
                    }
                  }}
                  onKeyPress={(e) => {
                    // Prevenir entrada de caracteres no numéricos
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Ej: 987654321"
                />
                {/* Validación visual del celular */}
                {celular.length > 0 && (
                  <div className="mt-1 text-xs">
                    <p className={`${isCelularValid ? 'text-green-600' : 'text-red-500'}`}>
                      {isCelularValid ? "OK Número válido" : 
                        celular.length !== 9 ? `${celular.length}/9 dígitos - Número incompleto` :
                        !celular.startsWith('9') ? 'Debe iniciar con 9 (celulares peruanos)' :
                        'Formato inválido'
                      }
                    </p>
                    {!isCelularValid && (
                      <p className="text-gray-500 text-xs mt-1">
                        Ejemplo: 987654321
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Input para clave */}
              <div className="sm:col-span-1">
                <Input 
                  label="Contraseña" 
                  type="password" 
                  onChange={(e) => setClave(e.target.value)} 
                  placeholder="********" 
                  minLength={8} 
                />
              </div>

              {/* Input para repetir clave */}
              <div className="sm:col-span-1">
                <Input 
                  label="Confirmar contraseña" 
                  type="password" 
                  onChange={(e) => setRepetirClave(e.target.value)} 
                  placeholder="********" 
                  minLength={8} 
                />
              </div>
            </div>

            {/* Indicador de validez de contraseña */}
            {clave.length > 0 && (
              <div className="text-xs text-[var(--Primary_5)] bg-[var(--Primary_0)] p-3 rounded-lg">
                <p className={`${clave.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
                  - Mínimo 8 caracteres {clave.length >= 8 ? "OK" : "X"}
                </p>
                {repetirClave.length > 0 && (
                  <p className={`${clave === repetirClave ? 'text-green-600' : 'text-red-500'}`}>
                    - Las contraseñas coinciden {clave === repetirClave ? "OK" : "X"}
                  </p>
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botón principal */}
           <div className="pt-2 [&_button]:bg-orange-500 [&_button]:hover:bg-orange-600">
  <ButtonState
    initialText="Crear cuenta"
    successText="Creando cuenta..."
    disabled={!isFormValid || loading}
    clicked={clicked}
  />
</div>

            {/* Enlaces adicionales */}
            <div className="text-center pt-4 space-y-3">
              <p className="text-sm text-[var(--Primary_5)]">
                ¿Ya tienes una cuenta?
              </p>
              <a 
                href="/login" 
                className="block w-full text-center border-2 border-[var(--Primary_4)] text-[var(--Primary_4)] py-3 rounded-lg hover:bg-[var(--Primary_4)] hover:text-white transition-all duration-300 transform hover:scale-[1.02] font-medium"
              >
                Iniciar sesión
              </a>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[var(--Primary_5)] text-sm">
            Al registrarte aceptas nuestros terminos y condiciones
          </p>
        </div>
      </div>
    </main>
  );
}


