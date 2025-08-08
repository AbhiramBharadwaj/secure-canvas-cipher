import { useState, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UploadZoneProps {
  onImageUpload: (file: File) => void;
  uploadedImage: File | null;
}

export const UploadZone = ({ onImageUpload, uploadedImage }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (uploadedImage) {
      const url = URL.createObjectURL(uploadedImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [uploadedImage]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Accept typical image formats + possibly encrypted images in PNG format
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp'];

    if (validTypes.includes(file.type)) {
      onImageUpload(file);
    } else {
      toast.error('Invalid file type. Please upload JPG, PNG, or BMP files.');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div
      className={`upload-zone cursor-pointer ${isDragOver ? 'drag-over' : ''} p-6 rounded-md border border-dashed border-border flex flex-col items-center justify-center`}
      onClick={handleButtonClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleButtonClick(); }}
      aria-label="Upload image"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.bmp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {previewUrl ? (
        <img src={previewUrl} alt="Uploaded preview" className="max-w-full max-h-48 rounded-md mb-4" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {uploadedImage ? 'Image Uploaded' : 'Upload Your Image'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {uploadedImage
            ? `${uploadedImage.name} (${(uploadedImage.size / 1024 / 1024).toFixed(2)} MB)`
            : 'Drag and drop or click to select JPG, PNG, or BMP files'}
        </p>
      </div>

      <Button variant="default" className="btn-primary px-6 py-2">
        {uploadedImage ? 'Change Image' : 'Select Image'}
      </Button>
    </div>
  );
};
