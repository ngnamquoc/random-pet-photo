"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
}

export function FileUpload({ onFileSelect, accept = ".jpg,.jpeg,.png,.webp", className }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload-input"
      />
      
      {/* Clickable upload area */}
      <label
        htmlFor="file-upload-input"
        className="w-56 h-32 cursor-pointer transition-all hover:scale-105 border-2 border-dashed border-default-300 hover:border-primary rounded-lg bg-background shadow-sm flex items-center justify-center"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center py-4 px-4">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-default-400" />
            <p className="text-sm text-default-600">Drop or click to upload</p>
          </div>
        </div>
      </label>
    </div>
  );
}
