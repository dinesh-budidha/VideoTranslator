
import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, Film } from 'lucide-react';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';

interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  file: File | null;
  disabled?: boolean;
  className?: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  onFileSelected,
  file,
  disabled = false,
  className,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const previewRef = React.useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const handleFileDrop = useCallback(
    (file: File) => {
      if (disabled) return;

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast.error('Invalid file type. Please upload an MP4, WebM, or OGG video.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File is too large. Maximum size is 100MB.');
        return;
      }

      onFileSelected(file);
      
      // Create preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    },
    [disabled, onFileSelected]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileDrop(file);
      }
    },
    [handleFileDrop]
  );

  const clearFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onFileSelected(null as any);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelected, previewUrl]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileDrop(file);
      }
    },
    [disabled, handleFileDrop]
  );

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} bytes`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  return (
    <div
      className={cn(
        "w-full", 
        className
      )}
    >
      <div
        className={cn(
          "drop-area flex flex-col items-center justify-center min-h-[200px]",
          isDragging ? "drop-area-active" : "",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          file ? "bg-primary/5" : ""
        )}
        onClick={() => !disabled && !file && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={ACCEPTED_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={disabled}
        />

        {!file && (
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="font-medium mb-1">Upload Video</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              MP4, WebM or OGG (max 100MB)
            </p>
          </div>
        )}

        {file && previewUrl && (
          <div className="w-full animate-fade-in">
            <div className="mb-3 relative overflow-hidden rounded-lg aspect-video bg-black">
              <video
                ref={previewRef}
                src={previewUrl}
                className="w-full h-full object-contain"
                controls
                muted
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex-1 truncate mr-2">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              
              {!disabled && (
                <button 
                  onClick={clearFile}
                  className="p-2 rounded-full hover:bg-destructive/10 text-destructive button-transition"
                  title="Remove file"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
