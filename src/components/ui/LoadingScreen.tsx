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
          <div className="relative h-24 w-24">
            {/* Anillo exterior girando */}
            <div className="absolute inset-0 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
            {/* Anillo interior girando al revés */}
            <div
              className="absolute inset-2 rounded-full border-4 border-white/20 border-b-white animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
            ></div>
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
