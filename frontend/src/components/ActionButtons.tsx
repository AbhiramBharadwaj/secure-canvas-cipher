import { Button } from '@/components/ui/button';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

interface ActionButtonsProps {
  onEncrypt: () => void;
  onDecrypt: () => void;
  onReset: () => void;
  canEncrypt: boolean;
  canDecrypt: boolean;
  isProcessing: boolean;
}

export const ActionButtons = ({
  onEncrypt,
  onDecrypt,
  onReset,
  canEncrypt,
  canDecrypt,
  isProcessing
}: ActionButtonsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        onClick={onEncrypt}
        disabled={!canEncrypt || isProcessing}
        className="btn-primary px-8 py-3 text-sm font-medium"
        size="lg"
      >
        <Lock className="w-4 h-4 mr-2" />
        {isProcessing ? 'Encrypting...' : 'Encrypt Image'}
      </Button>
      
      <Button
        onClick={onDecrypt}
        disabled={!canDecrypt || isProcessing}
        variant="outline"
        className="btn-secondary px-8 py-3 text-sm font-medium"
        size="lg"
      >
        <Unlock className="w-4 h-4 mr-2" />
        Decrypt Image
      </Button>
      
      <Button
        onClick={onReset}
        variant="ghost"
        className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        size="lg"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </Button>
    </div>
  );
};
