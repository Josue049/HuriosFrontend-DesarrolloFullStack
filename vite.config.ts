import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

const SPA_ROUTES = [
  'login',
  'register',
  'verify-email',
  'reset-password',
  'new-password',
  'products',
  'about',
  'cart',
  'checkout',
  'payment',
  'pago/exito',
  'pago/fallo',
  'pago/pendiente',
  'profile',
  'user-profile',
  'my-orders',
  'admin-profile',
  'inventario',
  'boletas-facturas',
]

function spaStaticFallbackPlugin() {
  return {
    name: 'spa-static-fallback',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist')
      const indexHtmlPath = path.join(distDir, 'index.html')
      if (!fs.existsSync(indexHtmlPath)) {
        return
      }

      const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')

      // Crear 404.html en la raíz de dist/
      fs.writeFileSync(path.join(distDir, '404.html'), htmlContent, 'utf-8')

      // Crear <ruta>/index.html para que al recargar (F5) en Render Static Site nunca devuelva Not Found
      for (const route of SPA_ROUTES) {
        const routeDir = path.join(distDir, route)
        fs.mkdirSync(routeDir, { recursive: true })
        fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent, 'utf-8')
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spaStaticFallbackPlugin(),
  ],
})
