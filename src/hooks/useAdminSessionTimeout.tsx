import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/token';

const TIMEOUT_DURATION = 2 * 60 * 1000// 2 minutos en milisegundos

/**
 * Hook para cerrar sesión automáticamente después de 2 minutos de inactividad
 * Solo debe usarse en páginas del administrador
 */
export function useAdminSessionTimeout() {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      // Limpiar temporizador anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Crear nuevo temporizador
      timeoutRef.current = window.setTimeout(() => {
        // Cerrar sesión y redirigir
        clearToken();
        navigate('/login', { state: { message: 'Sesión cerrada por inactividad' } });
      }, TIMEOUT_DURATION);
    };

    // Eventos que reinician el temporizador
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Iniciar temporizador
    resetTimer();

    // Agregar listeners para resetear el temporizador
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Cleanup
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


