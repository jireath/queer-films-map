'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';

export default function ImageUpload({ 
  onImageChange,
  existingImageUrl = null,
  className = ""
}) {
  const [preview, setPreview] = useState(existingImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    setIsUploading(true);

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);

    // Pass the file up to the parent component
    onImageChange(file);
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageChange(null);
  };

  return (
    <div className={`relative border-2 border-dashed border-input rounded-md p-4 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={isUploading}
      />

      {preview ? (
        // Preview container
        <div className="relative">
          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
            <img
              src={preview}
              alt="Film preview"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              clearImage();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // Upload placeholder
        <div className="flex flex-col items-center justify-center py-4">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="bg-muted rounded-full p-3 mb-2">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">Upload film image</p>
              <p className="text-xs text-muted-foreground text-center">
                Drag and drop or click to browse<br />
                JPG, PNG or GIF (max. 5MB)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}