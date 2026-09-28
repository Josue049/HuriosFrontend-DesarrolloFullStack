import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import { useCart } from "../context/CartContext";
import { getToken } from "../utils/token";
import { useRoleProtection } from "../hooks/useRoleProtection";
import { API_BASE_URL } from "../config/api";

type DocumentType = "dni" | "factura";
type DeliveryMethod = "pickup" | "delivery";

interface CheckoutFormData {
    fullName: string;
    phone: string;
    documentType: DocumentType;
    // DNI fields
    dni: string;
    // Factura fields
    companyName: string;
    ruc: string;
    companyAddress: string;
    // Delivery
    deliveryMethod: DeliveryMethod;
    deliveryAddress: string;
    deliveryReference: string;
    deliveryDistrict: string;
}

export function Checkout() {
    useRoleProtection('checkout'); // Bloquear acceso a admins
    const API_BASE = API_BASE_URL;
    const navigate = useNavigate();
    const { items, totalItems, totalPrice } = useCart();
    const [formData, setFormData] = useState<CheckoutFormData>({
        fullName: "",
        phone: "",
        documentType: "dni",
        dni: "",
        companyName: "",
        ruc: "",
        companyAddress: "",
        deliveryMethod: "pickup",
        deliveryAddress: "",
        deliveryReference: "",
        deliveryDistrict: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Verificar autenticacion
    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate("/login", { state: { from: "/checkout" } });
        }
    }, [navigate]);

    // Verificar si el carrito está vacío
    useEffect(() => {
        if (items.length === 0) {
            navigate("/cart");
        }
    }, [items, navigate]);

    const shippingCost = totalPrice >= 200 ? 0 : 10;
    const finalTotal = totalPrice + shippingCost;

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        
        // Validaciones de entrada segun el tipo de campo
        let newValue = value;
        
        // Campos que solo permiten letras (nombres)
        if (name === "fullName" || name === "companyName" || name === "deliveryDistrict") {
            // Permitir solo letras, espacios, tildes y caracteres especiales del espanol
            newValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
        }
        
        // Campos que solo permiten numeros
        if (name === "phone" || name === "dni" || name === "ruc") {
            // Permitir solo numeros
            newValue = value.replace(/[^0-9]/g, "");
        }
        
        // Campos de direccion permiten letras, numeros y caracteres especiales
        // (deliveryAddress, companyAddress, deliveryReference) - no requieren validacion adicional
        
        setFormData((prev) => ({ ...prev, [name]: newValue }));
        // Limpiar error del campo
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validaciones comunes
        if (!formData.fullName.trim()) {
            newErrors.fullName = "El nombre completo es requerido";
        }
        if (!formData.phone.trim()) {
            newErrors.phone = "El número de celular es requerido";
        } else if (!/^\d{9}$/.test(formData.phone)) {
            newErrors.phone = "El número debe tener 9 digitos";
        }

        // Validaciones segun tipo de documento
        if (formData.documentType === "dni") {
            if (!formData.dni.trim()) {
                newErrors.dni = "El DNI es requerido";
            } else if (!/^\d{8}$/.test(formData.dni)) {
                newErrors.dni = "El DNI debe tener 8 dígitos";
            }
        } else {
            if (!formData.companyName.trim()) {
                newErrors.companyName = "El nombre de la empresa es requerido";
            }
            if (!formData.ruc.trim()) {
                newErrors.ruc = "El RUC es requerido";
            } else if (!/^\d{11}$/.test(formData.ruc)) {
                newErrors.ruc = "El RUC debe tener 11 dígitos";
            }
            if (!formData.companyAddress.trim()) {
                newErrors.companyAddress = "La dirección de la empresa es requerida";
            }
        }

        // Validaciones de entrega a domicilio
        if (formData.deliveryMethod === "delivery") {
            if (!formData.deliveryAddress.trim()) {
                newErrors.deliveryAddress = "La dirección de entrega es requerida";
            }
            if (!formData.deliveryDistrict.trim()) {
                newErrors.deliveryDistrict = "El distrito es requerido";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            // Guardar datos en sessionStorage para usar en la pagina de pago
            sessionStorage.setItem("checkoutData", JSON.stringify(formData));
            navigate("/payment");
        }
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-[var(--Primary_0)]">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
                        <button
                            onClick={() => navigate("/cart")}
                            className="text-[var(--Primary_5)] hover:underline text-sm"
                        >
                            ← Volver al carrito
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Formulario principal */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Información personal */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Información Personal
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre Completo *
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                placeholder="Juan Perez Garcia"
                                            />
                                            {errors.fullName && (
                                                <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Número de Celular *
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                placeholder="987654321"
                                                maxLength={9}
                                            />
                                            {errors.phone && (
                                                <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tipo de comprobante */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Tipo de Comprobante
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="documentType"
                                                    value="dni"
                                                    checked={formData.documentType === "dni"}
                                                    onChange={handleInputChange}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm font-medium">Boleta (DNI)</span>
                                            </label>
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="documentType"
                                                    value="factura"
                                                    checked={formData.documentType === "factura"}
                                                    onChange={handleInputChange}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm font-medium">Factura (RUC)</span>
                                            </label>
                                        </div>

                                        {formData.documentType === "dni" ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    DNI *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="dni"
                                                    value={formData.dni}
                                                    onChange={handleInputChange}
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                    placeholder="12345678"
                                                    maxLength={8}
                                                />
                                                {errors.dni && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.dni}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Nombre de la Empresa *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="companyName"
                                                        value={formData.companyName}
                                                        onChange={handleInputChange}
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                        placeholder="Empresa S.A.C."
                                                    />
                                                    {errors.companyName && (
                                                        <p className="text-xs text-red-600 mt-1">
                                                            {errors.companyName}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        RUC *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="ruc"
                                                        value={formData.ruc}
                                                        onChange={handleInputChange}
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                        placeholder="20123456789"
                                                        maxLength={11}
                                                    />
                                                    {errors.ruc && (
                                                        <p className="text-xs text-red-600 mt-1">{errors.ruc}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Dirección Fiscal *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="companyAddress"
                                                        value={formData.companyAddress}
                                                        onChange={handleInputChange}
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                        placeholder="Av. Principal 123, Lima"
                                                    />
                                                    {errors.companyAddress && (
                                                        <p className="text-xs text-red-600 mt-1">
                                                            {errors.companyAddress}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Metodo de entrega */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Metodo de Entrega
                                    </h2>
                                    <div className="space-y-4">
                                        {/* Retiro en tienda */}
                                        <div
                                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                                formData.deliveryMethod === "pickup"
                                                    ? "border-[var(--Primary_5)] bg-blue-50"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    deliveryMethod: "pickup",
                                                }))
                                            }
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="radio"
                                                    name="deliveryMethod"
                                                    value="pickup"
                                                    checked={formData.deliveryMethod === "pickup"}
                                                    onChange={handleInputChange}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        Retiro en Tienda
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Gratis - Disponible desde mañana
                                                    </p>
                                                    {formData.deliveryMethod === "pickup" && (
                                                        <div className="mt-3 bg-white rounded-md p-3 border border-gray-200">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                Dirección de recojo:
                                                            </p>
                                                            <p className="text-sm text-gray-700 mt-1">
                                                                Av. 22 de Agosto 1012, Comas 15312
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-2">
                                                                Tu pedido estará listo para recoger desde el día
                                                                siguiente
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Entrega a domicilio */}
                                        <div
                                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                                formData.deliveryMethod === "delivery"
                                                    ? "border-[var(--Primary_5)] bg-blue-50"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    deliveryMethod: "delivery",
                                                }))
                                            }
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="radio"
                                                    name="deliveryMethod"
                                                    value="delivery"
                                                    checked={formData.deliveryMethod === "delivery"}
                                                    onChange={handleInputChange}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        Entrega a Domicilio
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {totalPrice >= 200
                                                            ? "Gratis - Envío priorizado"
                                                            : "S/ 10.00 - 3-5 días hábiles"}
                                                    </p>
                                                    {formData.deliveryMethod === "delivery" && (
                                                        <div className="mt-3 space-y-3">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Dirección de Entrega *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    name="deliveryAddress"
                                                                    value={formData.deliveryAddress}
                                                                    onChange={handleInputChange}
                                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                                    placeholder="Av. Principal 123"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                {errors.deliveryAddress && (
                                                                    <p className="text-xs text-red-600 mt-1">
                                                                        {errors.deliveryAddress}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Distrito *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    name="deliveryDistrict"
                                                                    value={formData.deliveryDistrict}
                                                                    onChange={handleInputChange}
                                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                                    placeholder="Lima, San Isidro, etc."
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                {errors.deliveryDistrict && (
                                                                    <p className="text-xs text-red-600 mt-1">
                                                                        {errors.deliveryDistrict}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Referencia (Opcional)
                                                                </label>
                                                                <textarea
                                                                    name="deliveryReference"
                                                                    value={formData.deliveryReference}
                                                                    onChange={handleInputChange}
                                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--Primary_5)]"
                                                                    placeholder="Cerca al parque principal, casa de color azul"
                                                                    rows={2}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resumen del pedido */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Resumen de la Compra
                                    </h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">
                                                Productos ({totalItems})
                                            </span>
                                            <span className="font-medium">
                                                S/ {totalPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Envío</span>
                                            <span
                                                className={`font-medium ${
                                                    shippingCost === 0 ? "text-green-600" : ""
                                                }`}
                                            >
                                                {shippingCost === 0
                                                    ? "Gratis"
                                                    : `S/ ${shippingCost.toFixed(2)}`}
                                            </span>
                                        </div>
                                        <div className="border-t border-gray-200 pt-3">
                                            <div className="flex justify-between">
                                                <span className="text-lg font-semibold text-gray-900">
                                                    Total
                                                </span>
                                                <span className="text-lg font-bold text-gray-900">
                                                    S/ {finalTotal.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {totalPrice >= 200 && (
                                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                                <p className="text-xs text-green-700 flex items-center gap-1">
                                                    <svg
                                                        width={16}
                                                        height={16}
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path d="m9 12 2 2 4-4"></path>
                                                        <circle cx={12} cy={12} r={10}></circle>
                                                    </svg>
                                                    !Envío gratis y priorizado!
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            className="w-full bg-[var(--Primary_5)] text-white py-3 px-4 rounded-md font-medium hover:bg-[#1e4a6f] transition-colors mt-4"
                                        >
                                            Ir a pagar
                                        </button>

                                        <p className="text-xs text-gray-500 text-center mt-3">
                                            Al continuar, aceptas nuestros términos y condiciones
                                        </p>
                                    </div>

                                    {/* Lista de productos */}
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                            Productos en tu pedido
                                        </h3>
                                        <div className="space-y-3">
                                            {items.map((item) => {
                                              const imgUrl = item.imageUrl 
                                                  ? (
                                                      item.imageUrl.startsWith('http') ||
                                                      item.imageUrl.startsWith('/assets') ||
                                                      item.imageUrl.startsWith('blob:')
                                                        ? item.imageUrl
                                                        : `${API_BASE}${item.imageUrl}`
                                                    )
                                                  : "/assets/imgs/placeholder.svg";
                                                return (
                                                <div key={item.id} className="flex gap-3">
                                                    <img
                                                        src={imgUrl}
                                                        alt={item.name}
                                                        className="w-16 h-16 object-cover rounded border border-gray-200"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Cantidad: {item.quantity}
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            S/ {(item.price * item.quantity).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </>
    );
}


