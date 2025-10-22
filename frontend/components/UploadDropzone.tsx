"use client";

import { useState, useRef } from "react";
import { Upload, Check, X, FileText } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  uploadedFile: File | null;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  className?: string;
}

export default function UploadDropzone({
  onFileSelect,
  onFileRemove,
  uploadedFile,
  acceptedTypes = ".pdf,.doc,.docx,.txt,.rtf,.odt,.jpg,.jpeg,.png,.tiff,.tif,.bmp",
  maxSize = 50,
  className = ""
}: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = acceptedTypes.split(',').map(type => type.trim());
    
    if (!acceptedExtensions.some(ext => fileExtension === ext || ext === `*${fileExtension}`)) {
      setError(`File type not supported. Accepted types: ${acceptedTypes}`);
      return;
    }

    setError("");
    onFileSelect(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive 
            ? "border-blue-400 bg-blue-50" 
            : uploadedFile 
              ? "border-green-400 bg-green-50" 
              : error
                ? "border-red-400 bg-red-50"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={acceptedTypes}
          className="hidden"
        />

        {uploadedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Remove File
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                error ? "bg-red-100" : "bg-gray-100"
              }`}>
                <Upload className={`h-8 w-8 ${error ? "text-red-600" : "text-gray-400"}`} />
              </div>
            </div>
            <div>
              <p className={`text-lg font-medium ${
                error ? "text-red-700" : "text-gray-900"
              }`}>
                {error ? "Upload Error" : "Drag and drop your document here"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                or click to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500">
        Supported formats: {acceptedTypes.replace(/\./g, '').toUpperCase()} (Max {maxSize}MB)
      </div>
    </div>
  );
}
