import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prevent console statements
      "no-console": ["warn", { 
        allow: ["warn", "error"] // Allow console.warn/error for critical errors only
      }],
      
      // Prevent explicit any types
      "@typescript-eslint/no-explicit-any": ["warn", {
        ignoreRestArgs: false
      }],
      
      // Enforce React hooks dependencies
      "react-hooks/exhaustive-deps": "warn",
      
      // Additional code quality rules
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      
      // Prefer const
      "prefer-const": "warn",
      
      // No var
      "no-var": "error",
    },
  },
];

export default eslintConfig;

