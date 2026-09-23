import React from "react";

interface LoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const Loading: React.FC<LoadingProps> = ({
  message = "Cargando...",
  size = "md",
}) => {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-3 text-gray-600">
      <div
        className={`${sizeMap[size]} border-4 border-[var(--Primary_2)] border-t-[var(--Primary_5)] rounded-full animate-spin`}
      />
      {message && <p className="text-sm font-medium text-gray-600">{message}</p>}
    </div>
  );
};

export default Loading;
