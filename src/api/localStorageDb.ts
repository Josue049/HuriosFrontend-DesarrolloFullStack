export type UserRole = "CLIENTE" | "ADMINISTRADOR";

export interface LocalUser {
  id: number;
  email: string;
  password: string;
  role: UserRole;
  fullName?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  profileImage?: string;
  isVerified: boolean;
  verificationCode?: string;
  resetToken?: string;
}

export interface LocalProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  category?: string;
  createdAt?: string;
  expectedArrival?: string;
}

export interface LocalOrder {
  orderId: string;
  createdAt: string;
  customerEmail?: string;
  paymentMethod: string;
  finalTotal: number;
  items: Array<{ productId: number; quantity: number; price: number }>;
}

const USERS_KEY = "hurios_local_users_v1";
const PRODUCTS_KEY = "hurios_local_products_v1";
const ORDERS_KEY = "hurios_local_orders_v1";
export const CURRENT_EMAIL_KEY = "hurios_current_email";

function isBrowser() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function createVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function seedUsers(): LocalUser[] {
  return [
    {
      id: 1,
      email: "huiriosadmin@gmail.com",
      password: "admin123",
      role: "ADMINISTRADOR",
      fullName: "Administrador Principal",
      phone: "999000111",
      createdAt: new Date().toISOString(),
      isVerified: true,
    },
    {
      id: 2,
      email: "admin@huriosrally.com",
      password: "Admin12345",
      role: "ADMINISTRADOR",
      fullName: "Administrador Hurios",
      phone: "999111222",
      createdAt: new Date().toISOString(),
      isVerified: true,
    },
    {
      id: 3,
      email: "cliente@huriosrally.com",
      password: "Cliente12345",
      role: "CLIENTE",
      fullName: "Cliente Demo",
      phone: "999222333",
      createdAt: new Date().toISOString(),
      isVerified: true,
    },
  ];
}

function seedProducts(): LocalProduct[] {
  const now = new Date();
  return [
    {
      id: 1,
      name: "Llanta deportiva rally",
      description: "Llanta reforzada para uso urbano y carretera.",
      price: 159.9,
      stock: 12,
      category: "Neumaticos",
      imageUrl: "/assets/imgs/llanta.webp",
      createdAt: now.toISOString(),
      expectedArrival: now.toISOString(),
    },
    {
      id: 2,
      name: "Tubo de escape premium",
      description: "Mejor flujo de gases y sonido deportivo.",
      price: 219.5,
      stock: 8,
      category: "Motor",
      imageUrl: "/assets/imgs/tubo_de_escape.webp",
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      expectedArrival: new Date(now.getTime() + 86400000 * 7).toISOString(),
    },
    {
      id: 3,
      name: "Mascara Invicta moderna",
      description: "Acabado resistente para frontal de moto.",
      price: 89.0,
      stock: 15,
      category: "Carroceria",
      imageUrl: "/assets/imgs/mascara_invicta_moderna.webp",
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      expectedArrival: new Date(now.getTime() + 86400000 * 10).toISOString(),
    },
    {
      id: 4,
      name: "Filtros de aire universal",
      description: "Filtro reutilizable para alto rendimiento.",
      price: 45.0,
      stock: 20,
      category: "Filtros",
      imageUrl: "/assets/imgs/filtros_de_aire_universal.webp",
      createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
      expectedArrival: new Date(now.getTime() + 86400000 * 3).toISOString(),
    },
  ];
}

export function initLocalDb() {
  const users = readJson<LocalUser[]>(USERS_KEY, []);
  if (users.length === 0) {
    writeJson(USERS_KEY, seedUsers());
  } else {
    const hasRequiredAdmin = users.some(
      (u) => u.email.toLowerCase() === "huiriosadmin@gmail.com"
    );
    if (!hasRequiredAdmin) {
      const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      users.unshift({
        id: nextId,
        email: "huiriosadmin@gmail.com",
        password: "admin123",
        role: "ADMINISTRADOR",
        fullName: "Administrador Principal",
        phone: "999000111",
        createdAt: new Date().toISOString(),
        isVerified: true,
      });
      writeJson(USERS_KEY, users);
    }
  }

  const products = readJson<LocalProduct[]>(PRODUCTS_KEY, []);
  if (products.length === 0) writeJson(PRODUCTS_KEY, seedProducts());

  const orders = readJson<LocalOrder[]>(ORDERS_KEY, []);
  if (!Array.isArray(orders)) writeJson(ORDERS_KEY, []);
}

export function getUsers(): LocalUser[] {
  initLocalDb();
  return readJson<LocalUser[]>(USERS_KEY, []);
}

export function saveUsers(users: LocalUser[]) {
  writeJson(USERS_KEY, users);
}

export function getProducts(): LocalProduct[] {
  initLocalDb();
  return readJson<LocalProduct[]>(PRODUCTS_KEY, []);
}

export function saveProducts(products: LocalProduct[]) {
  writeJson(PRODUCTS_KEY, products);
}

export function getOrders(): LocalOrder[] {
  initLocalDb();
  return readJson<LocalOrder[]>(ORDERS_KEY, []);
}

export function saveOrders(orders: LocalOrder[]) {
  writeJson(ORDERS_KEY, orders);
}

export function getCurrentEmail(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(CURRENT_EMAIL_KEY);
}

export function setCurrentEmail(email: string) {
  if (!isBrowser()) return;
  localStorage.setItem(CURRENT_EMAIL_KEY, email);
}

export function clearCurrentEmail() {
  if (!isBrowser()) return;
  localStorage.removeItem(CURRENT_EMAIL_KEY);
}

export function nextUserId(): number {
  const users = getUsers();
  return users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
}

export function nextProductId(): number {
  const products = getProducts();
  return products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
}

export function generateCode() {
  return createVerificationCode();
}

