import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllProducts } from "../api/products";
import ShopCard, { type Product } from "../components/product/ShopCard";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const CATEGORIES = [
  "Motor",
  "Neumáticos",
  "Carrocería",
  "Filtros",
  "Suspensión",
  "Frenos",
  "Eléctrico",
  "Accesorios",
  "Transmisión",
  "Lubricantes",
];

type SortOption = "name" | "price-asc" | "price-desc" | "rating-desc";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const highlightedProductId = highlightParam ? Number(highlightParam) : null;

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<number, { avg: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const handleRatingLoaded = useCallback((productId: number, avg: number, total: number) => {
    setRatingsMap((prev) => {
      const existing = prev[productId];
      if (existing && existing.avg === avg && existing.total === total) return prev;
      return { ...prev, [productId]: { avg, total } };
    });
  }, []);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const data = await getAllProducts();
        setProducts(data);
        setFilteredProducts(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar productos");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();

    const handleRealtimeEvent = () => {
      fetchCatalog();
    };
    window.addEventListener("hurios-realtime-event", handleRealtimeEvent);
    return () => {
      window.removeEventListener("hurios-realtime-event", handleRealtimeEvent);
    };
  }, []);

  useEffect(() => {
    let filtered = [...products];

    if (selectedCategory) {
      filtered = filtered.filter(
        (p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (minRating > 0) {
      filtered = filtered.filter((p) => (ratingsMap[p.id]?.avg || 0) >= minRating);
    }

    filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating-desc") {
      filtered.sort((a, b) => {
        const rA = ratingsMap[a.id]?.avg || 0;
        const rB = ratingsMap[b.id]?.avg || 0;
        if (rB !== rA) return rB - rA;
        return (ratingsMap[b.id]?.total || 0) - (ratingsMap[a.id]?.total || 0);
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, minRating, priceRange, sortBy, ratingsMap]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setMinRating(0);
    setPriceRange([0, 10000]);
    setSortBy("name");
    if (highlightParam) {
      setSearchParams({});
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-2xl font-bold mb-6">Catálogo de Productos</h1>

          {loading ? (
            <div className="text-center py-8">Cargando productos...</div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">{error}</div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre o descripción..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                    >
                      <option value="">Todas</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                    >
                      <option value="name">Nombre (A-Z)</option>
                      <option value="rating-desc">Mejor valorados</option>
                      <option value="price-asc">Precio: Menor a Mayor</option>
                      <option value="price-desc">Precio: Mayor a Menor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valoración</label>
                    <select
                      value={minRating}
                      onChange={(e) => setMinRating(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                    >
                      <option value={0}>Todas las calificaciones</option>
                      <option value={4}>4 estrellas o más</option>
                      <option value={3}>3 estrellas o más</option>
                      <option value={5}>5 estrellas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio máx: S/ {priceRange[1]}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="50"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
                  <p className="text-sm text-gray-600">
                    Mostrando {filteredProducts.length} de {products.length} productos
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="text-sm text-[var(--Primary_5)] hover:underline cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No se encontraron productos con los filtros aplicados</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredProducts.map((p) => (
                    <ShopCard
                      key={p.id}
                      product={p}
                      autoOpen={highlightedProductId === p.id}
                      onRatingLoaded={handleRatingLoaded}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
