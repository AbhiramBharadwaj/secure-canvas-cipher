import { useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Moon, 
  Sun, 
  History,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ImagePreviewProps {
  title: string;
  imageUrl: string | null;
  isProcessing?: boolean;
  progress?: number;
  onDownload?: () => void;
  showDownload?: boolean;
  enableZoom?: boolean;
}

export const EnhancedImagePreview = ({ 
  title, 
  imageUrl, 
  isProcessing = false,
  progress = 0,
  onDownload,
  showDownload = false,
  enableZoom = false
}: ImagePreviewProps) => {
  return (
    <Card className="image-preview">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          {title}
        </h3>
        {showDownload && imageUrl && onDownload && (
          <div className="flex gap-2">
            <Button
              onClick={() => onDownload?.()}
              variant="outline"
              size="sm"
              className="btn-secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              PNG
            </Button>
            <Button
              onClick={() => onDownload?.()}
              variant="outline"
              size="sm"
              className="btn-secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              JPG
            </Button>
          </div>
        )}
      </div>
      
      {isProcessing && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Processing...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      <div className="aspect-square bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Processing...</p>
          </div>
        ) : imageUrl ? (
          enableZoom ? (
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              centerOnInit
              wheel={{ step: 0.1 }}
              pinch={{ step: 0.1 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => zoomIn()}>
                      <ZoomIn className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => zoomOut()}>
                      <ZoomOut className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => resetTransform()}>
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                  <TransformComponent>
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          ) : (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-contain"
            />
          )
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