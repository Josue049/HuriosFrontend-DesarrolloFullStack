import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAllProducts } from "../api/products";
import ShopCard, { type Product } from "../components/product/ShopCard";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const CATEGORIES: { [key: string]: string } = {
  "1": "Motor",
  "2": "Neumáticos",
  "3": "Carrocería",
  "4": "Filtros",
  "5":"Suspensión",
  "6":"Frenos",
  "7":"Eléctrico",
  "8":"Accesorios",
  "9":"Transmisión",
  "10":"Lubricantes"
};

export function Category() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryName = categoryId ? CATEGORIES[categoryId] : undefined;

  useEffect(() => {
    if (!categoryName) {
      navigate("/products");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const allProducts = await getAllProducts();
        const filtered = allProducts.filter(
          (product) =>
            (product.category || "").toLowerCase() === categoryName.toLowerCase()
        );
        setProducts(filtered);
      } catch (err: any) {
        setError(err.message || "Error al cargar productos");
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryName, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="mb-8">
            <button
              onClick={() => navigate("/products")}
              className="text-[var(--Primary_5)] hover:underline mb-4 flex items-center gap-2"
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Volver a productos
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
            <p className="text-gray-600 mt-2">
              {products.length} {products.length === 1 ? "producto" : "productos"} encontrado
              {products.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--Primary_5)]"></div>
              <p className="mt-4 text-gray-600">Cargando productos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg inline-block">
                {error}
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No se encontraron productos en esta categoría</p>
              <button
                onClick={() => navigate("/products")}
                className="mt-4 px-6 py-2 bg-[var(--Primary_5)] text-white rounded-md hover:bg-[#1e4a6f] transition-colors"
              >
                Ver todos los productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ShopCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
