import { useParams } from 'react-router-dom'

function ProductDetailPage() {
    const { id } = useParams()

    return (
        <div>
            <h1>Detalle del repuesto</h1>
            <p>Producto: {id}</p>
        </div>
    )
}

export default ProductDetailPage