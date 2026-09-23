
import React from "react";

/*
 Footer.tsx
 - Pie de página con información básica y enlaces.
*/

const Footer: React.FC = () => {
  return (
    <footer className="bg-[var(--Primary_5)] text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <img src="/assets/imgs/logo.webp" alt="Logo" className="h-10 mb-3" />
          <p className="text-sm text-white/80">Hurios Rally - Repuestos y accesorios. Calidad y respaldo.</p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Enlaces</h3>
          <ul className="space-y-1 text-sm">
            <li><a href="/" className="text-white/80 hover:underline">Inicio</a></li>
            <li><a href="/products" className="text-white/80 hover:underline">Productos</a></li>
            <li><a href="/about" className="text-white/80 hover:underline">Nosotros</a></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Contacto</h3>
          <p className="text-sm text-white/80">Tel: (01) 234-5678</p>
          <p className="text-sm text-white/80">Correo: contacto@hurios.com</p>
        </div>
      </div>

      <div className="border-t border-white/10 text-center py-3 text-sm text-white/60">
        © {new Date().getFullYear()} Hurios Rally. Todos los derechos reservados.
      </div>
    </footer>
  );
};

export default Footer;
