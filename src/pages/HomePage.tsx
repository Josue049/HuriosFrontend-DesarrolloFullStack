import React, { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import Hero from "../components/layout/Hero";
import BrandsCarousel from "../components/product/BrandsCarousel";
import ShopCard, { type Product } from "../components/product/ShopCard";
import useReveal from "../hooks/useReveal";

// Datos de demostración iniciales para renderizar la UI mientras se integra con la API (P3)
const initialProducts: Product[] = [
  {
    id: 1,
    name: "Corona con Ruster",
    price: 85.0,
    description: "Corona de transmisión reforzada para mototaxi y vehículos menores.",
    imageUrl: "/assets/imgs/corona_con_ruster.webp",
    stock: 12,
  },
  {
    id: 2,
    name: "Filtros de Aire Universal",
    price: 25.0,
    description: "Filtro de alto flujo para protección del motor contra polvo y partículas.",
    imageUrl: "/assets/imgs/filtros_de_aire_universal.webp",
    stock: 5,
  },
  {
    id: 3,
    name: "Llanta Timsun Todo Terreno",
    price: 130.0,
    description: "Neumático de alta adherencia y durabilidad para pista y trocha.",
    imageUrl: "/assets/imgs/llanta.webp",
    stock: 8,
  },
  {
    id: 4,
    name: "Tanque Carguero",
    price: 210.0,
    description: "Tanque metálico resistente de alta capacidad para motos de carga.",
    imageUrl: "/assets/imgs/tanque_carguero.webp",
    stock: 3,
  },
  {
    id: 5,
    name: "Asiento Ergonómico Carguero",
    price: 75.0,
    description: "Asiento acolchado impermeable para jornadas largas de conducción.",
    imageUrl: "/assets/imgs/asiento_carguero.webp",
    stock: 15,
  },
  {
    id: 6,
    name: "Tapa Lateral Bera",
    price: 45.0,
    description: "Repuesto original en fibra de alta resistencia contra impactos.",
    imageUrl: "/assets/imgs/tapa_lateral_bera.webp",
    stock: 7,
  },
  {
    id: 7,
    name: "Trapecio Bross Reforzado",
    price: 110.0,
    description: "Trapecio de suspensión con anclajes dobles para terrenos difíciles.",
    imageUrl: "/assets/imgs/trapecio_bross.webp",
    stock: 4,
  },
  {
    id: 8,
    name: "Tubo de Escape Deportivo",
    price: 95.0,
    description: "Sistema de escape de acero inoxidable con reducción de contrapresión.",
    imageUrl: "/assets/imgs/tubo_de_escape.webp",
    stock: 6,
  },
];

const HomePage: React.FC = () => {
  useReveal();
  const [products] = useState<Product[]>(initialProducts);

  const handleAddToCart = (product: Product) => {
    alert(`¡"${product.name}" añadido al carrito!`);
  };

  return (
    <MainLayout>
      {/* Banner Principal / Hero */}
      <Hero />

      {/* Sección: Nuevos repuestos */}
      <section
        data-reveal
        className="max-w-7xl mx-auto px-4 pt-10 pb-8 opacity-0 transform translate-y-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Nuevos repuestos
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Últimas novedades y piezas garantizadas para vehículos menores.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product) => (
            <ShopCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </section>

      {/* Marcas asociadas (Slider / Carrusel) */}
      <div className="bg-gray-100 py-6 border-y border-gray-200">
        <BrandsCarousel />
      </div>

      {/* Sección: Los más vendidos */}
      <section
        data-reveal
        className="max-w-7xl mx-auto px-4 py-12 opacity-0 transform translate-y-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Los más vendidos
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Los productos favoritos y de mayor rotación entre nuestros clientes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(4, 8).map((product) => (
            <ShopCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;