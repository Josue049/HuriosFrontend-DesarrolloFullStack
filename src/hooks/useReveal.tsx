// src/hooks/useReveal.tsx
import { useEffect } from "react";

/*
 useReveal
 - Observa todos los elementos con attribute data-reveal y cuando entran en viewport
   les añade la clase 'reveal' (CSS se encarga de animar).
 - No retorna nada: solo inicializa observer cuando el hook se monta.
*/

export default function useReveal() {
  useEffect(() => {
    // selecciona nodos con data-reveal
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");

    // si no hay nodos, no hacemos nada
    if (!nodes.length) return;

    // crea IntersectionObserver
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // si el elemento entra en viewport
          if (entry.isIntersecting) {
            // añade clase 'reveal' para que CSS lo muestre/animate
            entry.target.classList.add("reveal");
            // dejar de observar para que aparezca solo la primera vez
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 } // 15% visible
    );

    // observar cada nodo
    nodes.forEach(n => io.observe(n));

    // cleanup al desmontar
    return () => io.disconnect();
  }, []);
}
