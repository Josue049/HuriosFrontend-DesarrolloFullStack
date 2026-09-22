import { BrowserRouter, Route, Routes } from 'react-router-dom'

import CartPage from '../pages/CartPage'
import HomePage from '../pages/HomePage'
import ProductDetailPage from '../pages/ProductDetailPage'
import ProductsPage from '../pages/ProductsPage'

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/productos" element={<ProductsPage />} />
                <Route path="/productos/:id" element={<ProductDetailPage />} />
                <Route path="/carrito" element={<CartPage />} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRouter