import React, { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import ProductCard from "../components/product/ProductCard";

const mockProducts = [
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

const ProductsPage: React.FC = () => {
  const [products] = useState(mockProducts);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Repuestos y Vehículos</h1>
          <p className="text-gray-600 mt-2">
            Explora repuestos y componentes garantizados para motocicletas y vehículos menores.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductsPage;