"use client";

import React, { forwardRef } from "react";

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    children,
    variant = "primary",
    size = "md",
    loading = false,
    loadingText = "Loading...",
    fullWidth = false,
    icon,
    iconPosition = "left",
    disabled,
    className = "",
    type = "button",
    ...props
  }, ref) => {
    const baseClasses = "inline-flex items-center justify-center border border-transparent font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

    const variantClasses = {
      primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border-blue-600",
      secondary: "text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 border-gray-300",
      danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 border-red-600",
      ghost: "text-gray-600 bg-transparent hover:bg-gray-100 focus:ring-gray-500 border-transparent"
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };

    const widthClass = fullWidth ? "w-full" : "";
    const isDisabled = disabled || loading;

    const buttonContent = (
      <>
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText}
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="mr-2" aria-hidden="true">
                {icon}
              </span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className="ml-2" aria-hidden="true">
                {icon}
              </span>
            )}
          </>
        )}
      </>
    );

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
        aria-disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

export default AccessibleButton;

