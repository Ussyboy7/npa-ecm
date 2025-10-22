"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
  animation?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = true
}) => {
  const baseClasses = "bg-gray-200";
  const animationClass = animation ? "animate-pulse" : "";

  let variantClasses = "";
  switch (variant) {
    case "text":
      variantClasses = "h-4 rounded";
      break;
    case "circular":
      variantClasses = "rounded-full";
      break;
    case "rectangular":
    default:
      variantClasses = "rounded";
      break;
  }

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${animationClass} ${className}`}
      style={style}
    />
  );
};

export default Skeleton;

