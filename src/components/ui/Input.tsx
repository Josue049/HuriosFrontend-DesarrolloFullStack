import React from "react";

//Propiedades de los inputs
type InputProps = {
    label: string;
    type: string;
    placeholder?: string;
    minLength?: number;
    maxLength?:number;
    value?: string;
    inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url';
    pattern?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    rightIcon?: React.ReactNode;
};
//Función input/componente
export function Input({ 
    label, 
    type, 
    placeholder,
    minLength, 
    maxLength,
    value, 
    inputMode, 
    pattern, 
    onChange, 
    onKeyPress,
    rightIcon 
}: InputProps) {
    //Asignar el id del label al input
    const id = label.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="flex flex-col">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="relative flex items-center">  
                <input
                    id={id}
                    type={type}
                    value={value}
                    placeholder={placeholder}
                    minLength={minLength}
                    maxLength={maxLength}
                    inputMode={inputMode}
                    pattern={pattern}
                    onChange={onChange}
                    onKeyPress={onKeyPress}
                    required
                    className="w-full border-2 border-gray-300 rounded-lg outline-none px-3 py-2 focus:border-[var(--Primary_5)] focus:ring-2 focus:ring-[var(--Primary_2)] transition-colors duration-200"
                />
                {rightIcon && (
                    <div className="absolute right-2">{rightIcon}</div>
                )}
            </div>
        </div>
    );
}
