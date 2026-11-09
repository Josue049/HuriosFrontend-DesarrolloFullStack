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
  'category/1',
  'category/2',
  'category/3',
  'category/4',
  'category/5',
  'category/6',
  'category/7',
  'category/8',
  'category/9',
  'category/10',
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

      // Crear tanto <ruta>.html como <ruta>/index.html para que cualquier recarga (F5),
      // query string (?highlight=4723) o retroceso del navegador en Render Static Site responda 200 OK
      for (const route of SPA_ROUTES) {
        const routeDir = path.join(distDir, route)
        fs.mkdirSync(routeDir, { recursive: true })
        fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent, 'utf-8')
        fs.writeFileSync(path.join(distDir, `${route}.html`), htmlContent, 'utf-8')
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
