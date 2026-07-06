"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Shield, AlertCircle } from "lucide-react";
import { validateSerialNumber } from "@/lib/api/seal-verification";
import { toast } from "sonner";

interface VerifyFormProps {
  onVerify?: (serial: string) => void;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
  placeholder?: string;
}

export function VerifyForm({ 
  onVerify, 
  className = "",
  showLabel = true,
  compact = false,
  placeholder = "NPA-20241201-A8F3B2C1"
}: VerifyFormProps) {
  const router = useRouter();
  const [serialInput, setSerialInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSerialInput(value);
    
    // Clear validation error when user types
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleVerify = () => {
    const trimmed = serialInput.trim();
    
    if (!trimmed) {
      setValidationError('Serial number is required');
      return;
    }

    // Validate format
    const validation = validateSerialNumber(trimmed);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid serial number format');
      toast.error(validation.error || 'Invalid serial number format');
      return;
    }

    setValidationError(null);
    
    if (onVerify) {
      onVerify(trimmed);
    } else {
      router.push(`/verify/${trimmed}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <Label htmlFor="serial-input" className="text-sm font-medium">
          Serial Number
        </Label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="serial-input"
          type="text"
          value={serialInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`pl-10 ${compact ? 'h-10 text-sm' : 'h-12 text-base'} font-mono ${
            validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
          }`}
          aria-label="Enter seal serial number"
          aria-invalid={!!validationError}
          aria-describedby={validationError ? "serial-error" : undefined}
        />
      </div>
      {validationError && (
        <p id="serial-error" className="text-xs text-red-500 flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3" />
          {validationError}
        </p>
      )}
      {!validationError && (
        <p className="text-xs text-muted-foreground">
          Format: NPA-YYYYMMDD-XXXXXXXX
        </p>
      )}
      <Button 
        onClick={handleVerify} 
        disabled={!serialInput.trim() || !!validationError}
        className={`w-full ${compact ? 'h-10' : 'h-12'} bg-emerald-600 hover:bg-emerald-700 text-base`}
        size={compact ? "default" : "lg"}
        aria-label="Verify seal"
      >
        <Shield className="h-5 w-5 mr-2" />
        Verify Seal
      </Button>
    </div>
  );
}

