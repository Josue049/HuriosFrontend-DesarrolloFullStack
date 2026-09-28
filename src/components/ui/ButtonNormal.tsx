import { useState } from "react";
import clsx from "clsx";

//Propiedades de los botones
type ButtonProps = {
    defaultText?: string; 
};
//Función botón/componente
export function ButtonNormal({defaultText}: ButtonProps) {
    //Constantes para el estado del boton
    const [clicked, setClicked] = useState(false);
    const text = defaultText;
    const handleClick = () => {
        setClicked(true);
    };

    return (
        <button
            onClick={handleClick}
            className={clsx(
                "bg-[var(--Primary_3)] text-white rounded-lg py-3 px-3.5",
                clicked
                    ? "hover:cursor-default"
                    : "hover:cursor-pointer hover:bg-[var(--Primary_4)]"
            )}
        >
            {text}
        </button>
    );
}