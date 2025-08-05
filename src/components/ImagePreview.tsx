import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';

interface ImagePreviewProps {
  title: string;
  imageUrl: string | null;
  isProcessing?: boolean;
  onDownload?: () => void;
  showDownload?: boolean;
}

export const ImagePreview = ({ 
  title, 
  imageUrl, 
  isProcessing = false, 
  onDownload,
  showDownload = false 
}: ImagePreviewProps) => {
  return (
    <Card className="image-preview">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          {title}
        </h3>
        {showDownload && imageUrl && onDownload && (
          <Button
            onClick={onDownload}
            variant="outline"
            size="sm"
            className="btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
      </div>
      
      <div className="aspect-square bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Processing...</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-muted-foreground/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <Eye className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No image available</p>
          </div>
        )}
      </div>
    </Card>
  );
};