
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { getToken, clearToken, getRole } from "../../utils/token";


const categories = [
  { id: 1, name: "Motor" },
  { id: 2, name: "Neumáticos" },
  { id: 3, name: "Carrocería" },
  { id: 4, name: "Filtros" },
  {id:5,name:"Suspensión"},
  {id:6,name:"Frenos"},
  {id:7,name:"Eléctrico"},
  {id:8,name:"Accesorios"},
  {id:9,name:"Transmisión"},
  {id:10,name:"Lubricantes"}
];

const Navbar: React.FC = () => {
  // menuOpen controla si el menú móvil está visible
  const [menuOpen, setMenuOpen] = useState(false);
  // catsOpen controla dropdown de Categorias en desktop
  const [catsOpen, setCatsOpen] = useState(false);
  // userDropdownOpen controla dropdown de usuario
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { totalItems } = useCart();
  // const navigate = useNavigate();
  const userDropdownRef = useRef<HTMLDivElement>(null);
  
  // Verificar si hay sesión activa y rol
  const isAuthenticated = !!getToken();
  const isAdmin = getRole() === 'ADMINISTRADOR';
  
  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('huriosRally_cart'); // Limpiar carrito también
    setUserDropdownOpen(false);
    window.location.href = '/'; // Recargar página
  };

  return (
    <header className="w-full bg-[var(--Primary_5)] text-white sticky top-0 z-50">
      {/* contenedor principal */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* logo */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <img src="/assets/imgs/logo.webp" alt="Hurios Rally" className="h-15 w-auto" />
        </Link>

        {/* nav desktop: oculto en lg- (visible en lg+) */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
          <Link to="/" className="hover:underline">Inicio</Link>
          <Link to="/products" className="hover:underline">Productos</Link>

          {/* dropdown Categorias (desktop) */}
          <div className="relative">
            {/* botón que abre el dropdown */}
            <button
              onClick={() => setCatsOpen(v => !v)}
              onMouseEnter={() => setCatsOpen(true)}
              onMouseLeave={() => setCatsOpen(false)}
              className="flex items-center gap-1 cursor-pointer"
              aria-expanded={catsOpen}
            >
              Categorías
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.04 1.08l-4.25 4a.75.75 0 01-1.04 0l-4.25-4a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {/* lista de categorias; pointer-events por defecto permiten clicks */}
            <ul
              onMouseEnter={() => setCatsOpen(true)}
              onMouseLeave={() => setCatsOpen(false)}
              className={`absolute top-full left-0 mt-2 w-48 bg-white text-gray-800 rounded shadow-md transform transition-all ${
                catsOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
              }`}
              style={{ zIndex: 60 }}
            >
              {categories.map(cat => (
                <li key={cat.id} className="px-4 py-2 hover:bg-gray-100">
                  {/* Link navegable; permite click */}
                  <Link to={`/category/${cat.id}`} className="block">{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <Link to="/about" className="hover:underline">Nosotros</Link>
        </nav>

        {/* acciones (cart, login, hamburger) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* carrito - oculto para admin */}
          {!isAdmin && (
            <Link 
              to="/cart"
              className="inline-flex items-center p-1.5 sm:p-2 rounded hover:bg-white/10 flex-shrink-0 relative"
              aria-label={`Carrito de compras (${totalItems} items)`}
            >
            <svg width={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M6.29977 5H21L19 12H7.37671M20 16H8L6 3H3M9 20C9 20.5523 8.55228 21 8 21C7.44772 21 7 20.5523 7 20C7 19.4477 7.44772 19 8 19C8.55228 19 9 19.4477 9 20ZM20 20C20 20.5523 19.5523 21 19 21C18.4477 21 18 20.5523 18 20C18 19.4477 18.4477 19 19 19C19.5523 19 20 19.4477 20 20Z" stroke="#FFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </g>
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
            </Link>
          )}

          {/* dropdown de usuario */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              aria-label={isAuthenticated ? "Menú de usuario" : "Iniciar sesión"}
              className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white text-[#27557a] hover:scale-105 transition flex-shrink-0 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" />
              </svg>
            </button>
            
            {/* Dropdown menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                {!isAuthenticated ? (
                  /* Usuario no autenticado */
                  <Link
                    to="/login"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                    </svg>
                    <span className="font-medium">Iniciar sesión</span>
                  </Link>
                ) : (
                  /* Usuario autenticado */
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Ver perfil</span>
                    </Link>
                    
                    <Link
                      to="/reset-password"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Restablecer contraseña</span>
                    </Link>
                    
                    <hr className="my-2 border-gray-200" />
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors w-full text-left cursor-pointer"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                      </svg>
                      <span>Cerrar sesión</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* hamburger: visible en mobile/tablet */}
          <button
            className="lg:hidden p-1.5 sm:p-2 rounded text-white/90 hover:bg-white/10 flex-shrink-0 "
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu (visible cuando menuOpen=true) */}
      <div className={`lg:hidden bg-[var(--Primary_5)] text-white ${menuOpen ? "block" : "hidden"}`}>
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <nav className="flex flex-col gap-2">
          <Link to="/" className="py-2 border-b border-white/10">Inicio</Link>
          <Link to="/products" className="py-2 border-b border-white/10">Productos</Link>

          {/* details permite expandir categorias y seguir siendo accesible/clickable */}
          <details className="py-2 border-b border-white/10">
            <summary className="cursor-pointer">Categorías</summary>
            <ul className="pl-4 mt-2">
              {categories.map(c => (
                <li key={c.id} className="py-1">
                  <Link to={`/category/${c.id}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </details>

          <Link to="/about" className="py-2 border-b border-white/10">Nosotros</Link>
          <Link to="/user" className="py-2">Usuario</Link>
        </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

