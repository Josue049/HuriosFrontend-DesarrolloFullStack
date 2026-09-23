import clsx from "clsx";

//Propiedades de los botones
type ButtonProps = {
    initialText: string;
    successText: string;
    loadingText?: string;
    disabled: boolean;
    clicked: boolean;
    onClick?: () => void;
};

//Función botón/componente
export function ButtonState({ initialText, successText, loadingText, disabled, clicked, onClick}: ButtonProps) {
    //Constantes para el cambio de texto y deshabilitar el botón
    const text = clicked ? (loadingText ?? successText) : initialText;

    return (
        <button
            type="submit"
            disabled={disabled || clicked}
            onClick={onClick}
            className={clsx(
                "bg-[var(--Primary_3)] w-full text-white rounded-lg py-3 px-3.5",
                disabled || clicked
                    ? "hover:cursor-default"
                    : "hover:cursor-pointer hover:bg-[var(--Primary_4)]"
            )}
        >
            {text}
        </button>
    );
}