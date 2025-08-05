import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type EncryptionAlgorithm = 'aes' | 'blowfish' | 'lsb' | 'chaos' | 'hybrid';

interface AlgorithmSelectorProps {
  selectedAlgorithm: EncryptionAlgorithm;
  onAlgorithmChange: (algorithm: EncryptionAlgorithm) => void;
}

const algorithms = [
  {
    id: 'aes' as const,
    name: 'AES Encryption',
    description: 'Advanced Encryption Standard - Industry standard symmetric encryption',
    details: 'Military-grade encryption with 256-bit keys. Highly secure and widely adopted.',
    security: 'High'
  },
  {
    id: 'blowfish' as const,
    name: 'Blowfish',
    description: 'Fast symmetric block cipher with variable-length key',
    details: 'Lightweight and fast encryption, suitable for applications with speed requirements.',
    security: 'Medium-High'
  },
  {
    id: 'lsb' as const,
    name: 'LSB Steganography',
    description: 'Least Significant Bit hiding for covert image encryption',
    details: 'Hides data in image pixels with minimal visual impact. Good for steganography.',
    security: 'Medium'
  },
  {
    id: 'chaos' as const,
    name: 'Chaos-based',
    description: 'Chaotic map encryption for enhanced security',
    details: 'Uses mathematical chaos theory for unpredictable encryption patterns.',
    security: 'High'
  },
  {
    id: 'hybrid' as const,
    name: 'Hybrid Method',
    description: 'Combination of multiple encryption techniques',
    details: 'Combines multiple algorithms for maximum security and robustness.',
    security: 'Very High'
  }
];

const getSecurityBadgeColor = (security: string) => {
  switch (security) {
    case 'Very High': return 'bg-green-500 text-white';
    case 'High': return 'bg-blue-500 text-white';
    case 'Medium-High': return 'bg-yellow-500 text-white';
    case 'Medium': return 'bg-orange-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

export const EnhancedAlgorithmSelector = ({ selectedAlgorithm, onAlgorithmChange }: AlgorithmSelectorProps) => {
  return (
    <Card className="p-6 bg-card/90 backdrop-blur-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Encryption Algorithm
      </h3>
      
      <TooltipProvider>
        <RadioGroup
          value={selectedAlgorithm}
          onValueChange={(value) => onAlgorithmChange(value as EncryptionAlgorithm)}
          className="space-y-3"
        >
          {algorithms.map((algorithm) => (
            <div
              key={algorithm.id}
              className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-card/50 transition-all duration-200"
            >
              <RadioGroupItem
                value={algorithm.id}
                id={algorithm.id}
                className="mt-1 data-[state=checked]:border-primary data-[state=checked]:text-primary"
              />
              <div className="flex-1 grid gap-1.5 leading-none">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={algorithm.id}
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    {algorithm.name}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getSecurityBadgeColor(algorithm.security)}`}>
                      {algorithm.security}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Info className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{algorithm.details}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {algorithm.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </TooltipProvider>
    </Card>
  );
};