import React, { useEffect, useRef, useState } from "react";

type Props = {
    value?: string;
    onSave?: (val: string) => void;
    placeholder?: string;
    type?: string;
};

export function EditInput({ value = "", onSave, placeholder = "", type = "text" }: Props) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => setVal(value), [value]);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const handleToggle = () => {
        if (editing) {
            setEditing(false);
            if (onSave) onSave(val);
        } else {
            setEditing(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            setEditing(false);
            if (onSave) onSave(val);
        } else if (e.key === "Escape") {
            setVal(value);
            setEditing(false);
        }
    };

    return (
        <div className="flex items-center justify-between gap-2 border rounded-md px-3 py-2 w-full max-w-sm mx-auto">
            <input
                ref={inputRef}
                className="outline-none bg-transparent w-full"
                type={type}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder={placeholder}
                disabled={!editing}
                onKeyDown={handleKeyDown}
            />
            <button
                type="button"
                onClick={handleToggle}
                aria-label={editing ? "Guardar" : "Editar"}
                className="bg-[var(--Primary_5)] p-2 rounded-md hover:bg-[#1e4a6f] transition-colors flex items-center justify-center cursor-pointer"
            >
                {editing ? (
                    // check icon
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17l-5-5" stroke="#F3F9FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    // edit icon (original)
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                            <path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="#F3F9FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            <path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" stroke="#F3F9FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                        </g>
                    </svg>
                )}
            </button>
        </div>
    );
}