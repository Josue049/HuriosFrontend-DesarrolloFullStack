import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sendVerificationCode, verifyCode } from "../api/auth";
import { saveRole, saveToken } from "../utils/token";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const preEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(preEmail);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setMsg(null);
    if (!email) {
      setMsg("Ingresa un correo primero");
      return;
    }

    setLoading(true);
    try {
      await sendVerificationCode(email);
      setMsg("Te enviamos un nuevo código a tu correo.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMsg(err.message);
      } else {
        setMsg("Error al reenviar código");
      }
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setMsg(null);
    if (!email || !code) {
      setMsg("Completa correo y código");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyCode(email, code);
      saveToken(result.token);
      saveRole(result.role);
      setMsg("Correo verificado. Sesión iniciada, redirigiendo...");
      setTimeout(() => navigate("/"), 800);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMsg(err.message);
      } else {
        setMsg("Error al verificar código");
      }
    } finally {
      setLoading(false);
    }
  };

  const isSuccessMessage =
    !!msg &&
    (msg.toLowerCase().includes("verificado") ||
      msg.toLowerCase().includes("enviamos") ||
      msg.toLowerCase().includes("reenviado"));

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--Primary_0)] via-[var(--Primary_1)] to-[var(--Primary_2)] flex items-center justify-center relative overflow-hidden py-8">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[var(--Primary_3)] rounded-full opacity-15 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[var(--Primary_4)] rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-8 sm:mx-6 md:mx-4">
        <div className="bg-white/90 backdrop-blur-sm shadow-2xl border border-white/20 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[var(--Primary_4)] to-[var(--Primary_5)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--Primary_7)] mb-2">Verificar correo electrónico</h2>
            <p className="text-[var(--Primary_5)] text-sm">Ingresa el código de verificación que llegó a tu correo</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--Primary_6)] mb-2">Correo electrónico</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--Primary_4)] focus:border-transparent transition-all duration-200 bg-white/90"
                placeholder="ejemplo@gmail.com"
                type="email"
              />
            </div>

            <button
              onClick={resend}
              disabled={loading || !email}
              className="w-full bg-gradient-to-r from-[var(--Primary_2)] to-[var(--Primary_3)] text-[var(--Primary_7)] py-3 px-4 rounded-lg font-medium hover:from-[var(--Primary_3)] hover:to-[var(--Primary_4)] hover:text-white transition-all duration-300 transform hover:scale-[1.02] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border border-[var(--Primary_3)]"
            >
              {loading ? "Reenviando..." : "Reenviar código"}
            </button>

            <div>
              <label className="block text-sm font-medium text-[var(--Primary_6)] mb-2">Código de verificación</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--Primary_4)] focus:border-transparent transition-all duration-200 bg-white/90 text-center text-lg font-mono tracking-wider"
                placeholder="123456"
                maxLength={6}
                pattern="[0-9]{6}"
              />
              <p className="text-xs text-[var(--Primary_5)] mt-1 text-center">Ingresa el código de 6 dígitos</p>
            </div>

            <button
              onClick={verify}
              disabled={loading || !email || !code}
              className="w-full bg-gradient-to-r from-[var(--Primary_4)] to-[var(--Primary_5)] text-white py-3 px-4 rounded-lg font-medium hover:from-[var(--Primary_5)] hover:to-[var(--Primary_6)] transition-all duration-300 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Verificando..." : "Verificar código"}
            </button>

            {msg && (
              <div
                className={`p-4 rounded-lg text-sm font-medium ${
                  isSuccessMessage
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {msg}
              </div>
            )}

            <div className="bg-[var(--Primary_0)] border border-[var(--Primary_2)] rounded-lg p-4">
              <div className="text-xs text-[var(--Primary_6)] leading-relaxed">
                <p className="font-medium mb-1">¿No recibiste el correo?</p>
                <p>- Revisa tu bandeja de entrada y la carpeta de spam.</p>
                <p>- Usa "Reenviar código" si necesitas generar uno nuevo.</p>
              </div>
            </div>

            <div className="text-center">
              <a
                href="/login"
                className="text-[var(--Primary_5)] hover:text-[var(--Primary_6)] text-sm font-medium transition-colors duration-200"
              >
                Volver al inicio de sesión
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
