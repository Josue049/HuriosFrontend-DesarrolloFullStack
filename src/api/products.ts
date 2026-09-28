// src/api/products.ts
import {
  getProducts as dbGetProducts,
  saveProducts,
  nextProductId,
  type LocalProduct,
} from "./localStorageDb";

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  category?: string;
  createdAt?: string;
}

// Simula latencia de red para que se sienta real (opcional)
const delay = (ms = 150) => new Promise((res) => setTimeout(res, ms));

// Helper para normalizar texto (saca tildes, lowercase, trim)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function getAllProducts(category?: string): Promise<Product[]> {
  await delay();
  const all = dbGetProducts();
  if (!category?.trim()) return all;
  const cat = normalize(category);
  return all.filter((p) => p.category && normalize(p.category) === cat);
}

export async function searchProducts(query: string): Promise<Product[]> {
  await delay();
  const q = query.trim().toLowerCase();
  if (!q) return dbGetProducts();
  return dbGetProducts().filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
  );
}

export async function getProductById(id: number): Promise<Product> {
  await delay();
  const product = dbGetProducts().find((p) => p.id === id);
  if (!product) throw new Error("Producto no encontrado");
  return product;
}

export async function createProduct(productData: {
  name: string;
  price: number;
  description?: string;
  stock?: number;
  imageUrl?: string;
}): Promise<Product> {
  await delay();
  const products = dbGetProducts();
  const newProduct: LocalProduct = {
    id: nextProductId(),
    name: productData.name,
    price: productData.price,
    description: productData.description,
    stock: productData.stock ?? 0,
    imageUrl: productData.imageUrl,
    createdAt: new Date().toISOString(),
  };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export async function updateProduct(
  productId: number,
  productData: { name?: string; description?: string; price?: number; imageUrl?: string }
): Promise<Product> {
  await delay();
  const products = dbGetProducts();
  const idx = products.findIndex((p) => p.id === productId);
  if (idx === -1) throw new Error("Producto no encontrado");
  products[idx] = { ...products[idx], ...productData };
  saveProducts(products);
  return products[idx];
}

export async function deleteProduct(
  productId: number
): Promise<{ message: string; id: number }> {
  await delay();
  const products = dbGetProducts();
  const filtered = products.filter((p) => p.id !== productId);
  saveProducts(filtered);
  return { message: "Producto eliminado", id: productId };
}

export async function addStockToProduct(
  productId: number,
  quantity: number
): Promise<{ message: string; newStock: number }> {
  await delay();
  const products = dbGetProducts();
  const idx = products.findIndex((p) => p.id === productId);
  if (idx === -1) throw new Error("Producto no encontrado");
  products[idx].stock = (products[idx].stock ?? 0) + quantity;
  saveProducts(products);
  return {
    message: "Stock actualizado",
    newStock: products[idx].stock ?? 0,
  };
}

export async function uploadImage(file: File): Promise<{ imageUrl: string; filename: string }> {
  // Convertimos la imagen a base64 y la guardamos como dataURL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        imageUrl: reader.result as string,
        filename: file.name,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}