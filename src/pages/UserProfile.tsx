import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getUserProfile, updateUserProfile, type UserProfile as UserProfileType } from "../api/user";
import { getToken } from "../utils/token";
import { ProfileAvatar } from "../components/ui/ProfileAvatar";

export function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Datos que debe ingresar el usuario al formulario
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  useEffect(() => {
    // Verificar autenticación
    if (!getToken()) {
      navigate("/login");
      return;
    }
    // Cargar perfil
    loadProfile();
  }, [navigate]);

  const loadProfile = async () => {
    /*En caso de ser exitosa la carga, muestra todos los datos del usuario */
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProfile();
      setProfile(data);
      setFullName(data.fullName || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al cargar el perfil");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    /*En caso de que se cree de forma exitosa,se muestra un mensaje de que esto ocurría */
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await updateUserProfile({
        fullName,
        phone,
        address,
      });

      setSuccessMessage("Perfil actualizado correctamente");
      setEditing(false);
      // Recargar perfil
      await loadProfile();
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al actualizar el perfil");
      }
    } finally {
      setSaving(false);
    }
  };
  /*Sirve para cancelar los cambios que el usuario quería hacer a su perfil */
  const handleCancel = () => {
    setEditing(false);
    setFullName(profile?.fullName || "");
    setPhone(profile?.phone || "");
    setAddress(profile?.address || "");
    setError(null);
  };
  /*Muestra su perfil cargando */
  if (loading) {
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

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--Primary_0)] py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar con subida de imagen */}
                <ProfileAvatar
                  imageUrl={profile?.profileImage}
                  onImageUpdate={async (_newImageUrl) => {
                    // La imagen ya fue guardada en el backend por uploadProfileImage
                    // Solo recargamos el perfil para reflejar el cambio
                    await loadProfile();
                  }}
                  size="large"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile?.fullName || "Usuario"}
                  </h1>
                  <p className="text-gray-600">{profile?.email}</p>
                  {profile?.createdAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      Miembro desde {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {/*Botón para cambiar datos del perfil*/}
              {!editing && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/my-orders")}
                    className="px-4 py-2 border border-[var(--Primary_5)] text-[var(--Primary_5)] rounded-md hover:bg-[var(--Primary_0)] transition-colors flex items-center gap-2"
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
                      <path d="M9 9h6" />
                      <path d="M9 13h6" />
                      <path d="M9 17h4" />
                      <path d="M15 3h6v6" />
                      <path d="M21 3l-7 7" />
                    </svg>
                    Mis Pedidos
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-[var(--Primary_5)] text-white rounded-md hover:bg-[#1e4a6f] transition-colors flex items-center gap-2"
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Editar perfil
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mensajes de Éxito o de error*/}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {successMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Formulario */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Información personal</h2>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Email (solo lectura) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">El correo no se puede modificar</p>
              </div>

              {/* Nombre completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!editing}
                  placeholder="Ingresa tu nombre completo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--Primary_5)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={phone}
                  maxLength={9}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!editing}
                  placeholder="Ingresa tu número de teléfono"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--Primary_5)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!editing}
                  placeholder="Ingresa tu dirección"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--Primary_5)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                />
              </div>

              {/* Botones */}
              {editing && (
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-[var(--Primary_5)] text-white rounded-md hover:bg-[#1e4a6f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}


