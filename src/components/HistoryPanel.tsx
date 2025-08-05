import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, ChevronDown, ChevronUp, Download, Eye } from 'lucide-react';

interface HistoryItem {
  id: string;
  originalName: string;
  algorithm: string;
  timestamp: Date;
  encryptedUrl?: string;
  decryptedUrl?: string;
  metrics?: {
    encryptionTime: number;
    decryptionTime: number;
    psnr: number;
    ssim: number;
  };
}

interface HistoryPanelProps {
  history: HistoryItem[];
  onItemSelect: (item: HistoryItem) => void;
  onDownload: (url: string, filename: string) => void;
}

export const HistoryPanel = ({ history, onItemSelect, onDownload }: HistoryPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-card/90 backdrop-blur-sm border border-border">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="font-medium">Recent Encryptions</span>
          <Badge variant="secondary" className="text-xs">
            {history.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-4">
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 cursor-pointer"
                  onClick={() => onItemSelect(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.originalName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.algorithm.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleString()}
                      </p>
                      {item.metrics && (
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Enc: {item.metrics.encryptionTime.toFixed(0)}ms</span>
                          <span>PSNR: {item.metrics.psnr.toFixed(1)}dB</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {item.encryptedUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(item.encryptedUrl!, `encrypted-${item.originalName}`);
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemSelect(item);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
};