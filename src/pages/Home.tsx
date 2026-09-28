import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Hero from "../components/layout/Hero";
import BrandsCarousel from "../components/product/BrandsCarousel";
import ShopCard, { type Product } from "../components/product/ShopCard";
import Footer from "../components/layout/Footer";
import useReveal from "../hooks/useReveal";
import { getAllProducts } from "../api/products";

const Home: React.FC = () => {
  useReveal();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllProducts();
        setProducts(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar productos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-grow">
        <Hero />

        {/* Sección: Nuevos repuestos - Pegada al banner pero sin subir encima */}
        <section
          data-reveal
          className="max-w-7xl mx-auto px-4 pt-6 pb-10 opacity-0 transform translate-y-6"
        >
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Nuevos repuestos
          </h2>
          
          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando productos...</div>
          ) : error ? (
            <div className="text-center text-red-600 py-10">{error}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {products.slice(0, 4).map((product) => (
                <ShopCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Marcas (slider) - Reducimos el padding para que todo esté más compacto */}
        <div className="bg-gray-50 py-8">
          <BrandsCarousel />
        </div>

        {/* Sección: Los más vendidos */}
        <section
          data-reveal
          className="max-w-7xl mx-auto px-4 py-10 opacity-0 transform translate-y-6"
        >
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Los más vendidos</h2>
          
          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando productos...</div>
          ) : error ? (
            <div className="text-center text-red-600 py-10">{error}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {products.slice(-4).map((product) => (
                <ShopCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;