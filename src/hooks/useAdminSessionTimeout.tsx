import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/token';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos

/**
 * Hook para cerrar sesión automáticamente después de 30 minutos de inactividad
 * Solo debe usarse en páginas del administrador
 */
export function useAdminSessionTimeout() {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        clearToken();
        navigate('/login', { state: { message: 'Sesión cerrada por inactividad' } });
      }, TIMEOUT_DURATION);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    resetTimer();

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate]);
}
