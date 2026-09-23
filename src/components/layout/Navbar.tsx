import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const categories = [
  { id: 1, name: "Motor" },
  { id: 2, name: "Neumáticos" },
  { id: 3, name: "Carrocería" },
  { id: 4, name: "Filtros" },
  { id: 5, name: "Suspensión" },
  { id: 6, name: "Frenos" },
  { id: 7, name: "Eléctrico" },
  { id: 8, name: "Accesorios" },
  { id: 9, name: "Transmisión" },
  { id: 10, name: "Lubricantes" },
];

export const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-[var(--Primary_5)] text-white sticky top-0 z-50 shadow-md">
      {/* Contenedor principal */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <img src="/assets/imgs/logo.webp" alt="Hurios Rally" className="h-12 md:h-14 w-auto object-contain" />
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link to="/" className="hover:text-blue-200 transition-colors">
            Inicio
          </Link>
          <Link to="/productos" className="hover:text-blue-200 transition-colors">
            Productos
          </Link>

          {/* Dropdown Categorías */}
          <div className="relative">
            <button
              onClick={() => setCatsOpen((v) => !v)}
              onMouseEnter={() => setCatsOpen(true)}
              onMouseLeave={() => setCatsOpen(false)}
              className="flex items-center gap-1 cursor-pointer hover:text-blue-200 transition-colors"
              aria-expanded={catsOpen}
            >
              Categorías
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.04 1.08l-4.25 4a.75.75 0 01-1.04 0l-4.25-4a.75.75 0 01-.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <ul
              onMouseEnter={() => setCatsOpen(true)}
              onMouseLeave={() => setCatsOpen(false)}
              className={`absolute top-full left-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl py-2 transform transition-all duration-200 ${
                catsOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
              }`}
              style={{ zIndex: 60 }}
            >
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/productos?categoria=${cat.id}`}
                    className="block px-4 py-2 hover:bg-gray-100 text-sm transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link to="/" className="hover:text-blue-200 transition-colors">
            Nosotros
          </Link>
        </nav>

        {/* Acciones (Carrito, Usuario, Hamburguesa) */}
        <div className="flex items-center gap-3">
          {/* Enlace Carrito */}
          <Link
            to="/carrito"
            className="inline-flex items-center p-2 rounded-lg hover:bg-white/10 transition relative cursor-pointer"
            aria-label="Carrito de compras"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6.3 5H21l-2 7H7.4M20 16H8L6 3H3m6 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm11 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Menú Usuario */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              aria-label="Menú de usuario"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white text-[var(--Primary_5)] hover:bg-gray-100 transition shadow cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z" />
              </svg>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 text-gray-800">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cuenta
                </div>
                <Link
                  to="/"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition"
                >
                  Iniciar sesión
                </Link>
              </div>
            )}
          </div>

          {/* Botón Móvil */}
          <button
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition cursor-pointer"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú Móvil */}
      {menuOpen && (
        <div className="lg:hidden bg-[var(--Primary_5)] border-t border-white/10 px-4 py-3">
          <nav className="flex flex-col gap-2">
            <Link to="/" className="py-2 border-b border-white/10 hover:text-blue-200">
              Inicio
            </Link>
            <Link to="/productos" className="py-2 border-b border-white/10 hover:text-blue-200">
              Productos
            </Link>
            <details className="py-2 border-b border-white/10">
              <summary className="cursor-pointer hover:text-blue-200">Categorías</summary>
              <ul className="pl-4 mt-2 space-y-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link to={`/productos?categoria=${c.id}`} className="block py-1 text-sm text-white/90 hover:text-white">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <Link to="/" className="py-2 hover:text-blue-200">
              Nosotros
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
