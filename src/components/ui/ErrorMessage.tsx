import React from "react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <svg
          className="w-6 h-6 text-red-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 transition cursor-pointer"
        >
          Reintentar
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
