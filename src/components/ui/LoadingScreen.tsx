import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [stage, setStage] = useState<'gear' | 'brand' | 'fadeout'>('gear');

  useEffect(() => {
    // Fase 1: Engranaje girando (1.5 segundos)
    const gearTimer = setTimeout(() => {
      setStage('brand');
    }, 1500);

    // Fase 2: Mostrar marca y logo (2 segundos)
    const brandTimer = setTimeout(() => {
      setStage('fadeout');
    }, 3500);

    // Fase 3: Fade out (0.5 segundos) y luego completar
    const fadeoutTimer = setTimeout(() => {
      onLoadingComplete();
    }, 4000);

    return () => {
      clearTimeout(gearTimer);
      clearTimeout(brandTimer);
      clearTimeout(fadeoutTimer);
    };
  }, [onLoadingComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-[var(--Primary_5)] to-[var(--Primary_4)] flex items-center justify-center transition-opacity duration-500 ${
        stage === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center">
        {stage === 'gear' && (
          <div className="animate-spin">
            {/* Engranaje SVG */}
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.364-6.364l-4.243 4.243m-4.242 0L3.636 5.636m12.728 12.728l-4.243-4.243m-4.242 0L3.636 18.364" />
            </svg>
          </div>
        )}

        {stage === 'brand' && (
          <div className="animate-fadeIn">
            {/* Logo */}
            <div className="mb-4 flex justify-center">
              <img
                src="/assets/imgs/logo.webp"
                alt="Hurios Rally Logo"
                className="h-32 w-auto"
              />
            </div>
            {/* Nombre de la marca */}
            <h1 className="text-4xl font-bold text-white tracking-wider">
              Hurios Rally
            </h1>
            <p className="text-white/80 mt-2 text-lg">Repuestos de Rally</p>
          </div>
        )}
      </div>
    </div>
  );
}
