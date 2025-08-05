import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export type EncryptionAlgorithm = 'aes' | 'blowfish' | 'lsb' | 'chaos' | 'hybrid';

interface AlgorithmSelectorProps {
  selectedAlgorithm: EncryptionAlgorithm;
  onAlgorithmChange: (algorithm: EncryptionAlgorithm) => void;
}

const algorithms = [
  {
    id: 'aes' as const,
    name: 'AES Encryption',
    description: 'Advanced Encryption Standard - Industry standard symmetric encryption'
  },
  {
    id: 'blowfish' as const,
    name: 'Blowfish',
    description: 'Fast symmetric block cipher with variable-length key'
  },
  {
    id: 'lsb' as const,
    name: 'LSB Steganography',
    description: 'Least Significant Bit hiding for covert image encryption'
  },
  {
    id: 'chaos' as const,
    name: 'Chaos-based',
    description: 'Chaotic map encryption for enhanced security'
  },
  {
    id: 'hybrid' as const,
    name: 'Hybrid Method',
    description: 'Combination of multiple encryption techniques'
  }
];

export const AlgorithmSelector = ({ selectedAlgorithm, onAlgorithmChange }: AlgorithmSelectorProps) => {
  return (
    <Card className="p-6 bg-card/90 backdrop-blur-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Encryption Algorithm
      </h3>
      
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
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor={algorithm.id}
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                {algorithm.name}
              </Label>
              <p className="text-xs text-muted-foreground">
                {algorithm.description}
              </p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </Card>
  );
};