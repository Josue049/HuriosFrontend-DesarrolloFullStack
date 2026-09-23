# Hurios Rally Frontend

Frontend de **Hurios Rally**, una aplicación web orientada a la venta y gestión de repuestos para vehículos menores.

## Descripción

Hurios Rally permite a los usuarios consultar un catálogo de repuestos para vehículos menores, visualizar información de los productos y gestionar sus compras mediante un carrito.

El proyecto forma parte de un desarrollo académico y utiliza una arquitectura frontend basada en componentes y servicios, preparada para consumir una API REST.

## Tecnologías

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* Node.js
* pnpm
* Git
* GitHub

## Requisitos

Para ejecutar el proyecto se necesita tener instalado:

* Node.js
* pnpm
* Git

## Instalación

Clonar el repositorio:

```bash
git clone URL_DEL_REPOSITORIO
```

Ingresar al proyecto:

```bash
cd HuriosRally-Frontend-Avance1
```

Instalar las dependencias:

```bash
pnpm install
```

Crear el archivo `.env` tomando como referencia `.env.example`.

## Variables de entorno

El proyecto utiliza variables de entorno para configurar la URL de la API.

Ejemplo:

```env
VITE_API_URL=http://localhost:8080
```

El archivo `.env` no debe ser incluido en el repositorio. Para configurar el proyecto se debe utilizar `.env.example` como referencia.

## Ejecución

Para iniciar el servidor de desarrollo:

```bash
pnpm dev
```

Para generar la versión de producción:

```bash
pnpm build
```

Para verificar el código mediante ESLint:

```bash
pnpm lint
```

## Rutas principales

Actualmente el frontend cuenta con las siguientes rutas:

* `/` — Página principal con banners promocionales y productos destacados.
* `/productos` — Catálogo de repuestos y componentes con filtros y tarjetas informativas.
* `/productos/:id` — Detalle de un repuesto.
* `/carrito` — Carrito de compras.

## Estructura del proyecto

```text
src/
├── assets/             # Recursos estáticos locales
├── components/
│   ├── layout/         # Componentes estructurales (Navbar, Footer, Hero, MainLayout)
│   ├── product/        # Componentes de negocio (ProductCard, ShopCard, BrandsCarousel)
│   └── ui/             # Componentes reutilizables (Button, Input, Loading, ErrorMessage)
├── config/             # Configuración base de la aplicación y API
├── hooks/              # Hooks personalizados (useReveal)
├── pages/
│   ├── HomePage.tsx
│   ├── ProductsPage.tsx
│   ├── ProductDetailPage.tsx
│   └── CartPage.tsx
├── routes/
│   └── AppRouter.tsx
├── App.tsx
├── index.css
└── main.tsx
```

## Ramas

El proyecto utiliza la siguiente estrategia de ramas:

* `main`: versión estable del proyecto.
* `develop`: rama principal de integración.
* `feature/*`: ramas destinadas al desarrollo de funcionalidades específicas:
  * `feature/setup`: configuración inicial del proyecto y rutas.
  * `feature/ui`: componentes reutilizables, layout y vistas principales.
  * `feature/api`: cliente HTTP y servicios de integración con backend.
  * `feature/state`: gestión de estado global, contexto y formularios.

## Estado del proyecto

Se han implementado con éxito la estructura inicial, dependencias, rutas, layout de la aplicación (`Navbar`, `Footer`, `MainLayout`), componentes reutilizables (`Button`, `Input`, `Loading`, `ErrorMessage`), tarjetas de productos (`ProductCard`, `ShopCard`) y la vista principal (`HomePage`).
