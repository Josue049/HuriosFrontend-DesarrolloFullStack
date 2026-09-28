import React, { useState, useRef } from 'react';
import { uploadProfileImage } from '../../api/user';
import { API_BASE_URL } from '../../config/api';
/*Clase que permite utilizar de forma más fácil las propiedades y método de ProfileAvatar */
interface ProfileAvatarProps {
  imageUrl?: string;
  onImageUpdate: (newImageUrl: string) => void;
  size?: 'small' | 'medium' | 'large';
}
export function ProfileAvatar({ imageUrl, onImageUpdate, size = 'large' }: ProfileAvatarProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHover, setShowHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE = API_BASE_URL;

  // Construir URL completa de la imagen
  const fullImageUrl = imageUrl
    ? imageUrl.startsWith("http") || imageUrl.startsWith("/assets") || imageUrl.startsWith("blob:")
      ? imageUrl
      : `${API_BASE}${imageUrl}`
    : undefined;

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20',
  };
  //Establece el tamaño de los íconos
  const iconSizes = {
    small: 24,
    medium: 32,
    large: 48,
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Valida tamaño de la imagen a colocar (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }
    //Aqui se quiere colocar una imagen como foto de perfil del empleado
    try {
      setUploading(true);
      setError(null);
      const response = await uploadProfileImage(file);
      onImageUpdate(response.imageUrl);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al subir la imagen');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    /*Esta va a ser la forma en que se vea la foto de perfil del personal */
    <div className="relative">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden relative cursor-pointer shadow-lg group`}
        onMouseEnter={() => setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
        onClick={handleClick}
      >
        {fullImageUrl ? (
          <img
            src={fullImageUrl}
            alt="Perfil"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--Primary_4)] to-[var(--Primary_5)] flex items-center justify-center">
            <svg
              width={iconSizes[size]}
              height={iconSizes[size]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        )}

        {/* Overlay con lápiz en hover */}
        <div
          className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity ${
            showHover && !uploading ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <svg
            width={iconSizes[size] / 2}
            height={iconSizes[size] / 2}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>

        {/* Spinner de carga */}
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Mensaje de error */}
      {error && (
        <p className="text-xs text-red-600 mt-2 absolute whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}

