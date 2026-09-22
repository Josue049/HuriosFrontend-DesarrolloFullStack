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

* `/` — Página principal.
* `/productos` — Catálogo de repuestos.
* `/productos/:id` — Detalle de un repuesto.
* `/carrito` — Carrito de compras.

## Estructura del proyecto

```text
src/
├── pages/
│   ├── HomePage.tsx
│   ├── ProductsPage.tsx
│   ├── ProductDetailPage.tsx
│   └── CartPage.tsx
│
├── routes/
│   └── AppRouter.tsx
│
├── App.tsx
├── index.css
└── main.tsx
```

## Ramas

El proyecto utiliza la siguiente estrategia de ramas:

* `main`: versión estable del proyecto.
* `develop`: rama principal de integración.
* `feature/*`: ramas destinadas al desarrollo de funcionalidades específicas.

## Estado del proyecto

El proyecto se encuentra en desarrollo. La estructura inicial, configuración del entorno, dependencias principales y rutas de la aplicación se encuentran implementadas.

Las siguientes etapas incorporarán los componentes reutilizables, integración con la API REST, gestión del estado, formularios, validaciones y funcionalidades relacionadas con los productos y el carrito.
