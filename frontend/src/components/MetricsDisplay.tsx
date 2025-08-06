import { Card } from '@/components/ui/card';
import { Clock, TrendingUp, Target } from 'lucide-react';

interface MetricsData {
  encryptionTime: number;
  decryptionTime: number;
  psnr: number;
  ssim: number;
}

interface MetricsDisplayProps {
  metrics: MetricsData | null;
  isVisible: boolean;
}

export const MetricsDisplay = ({ metrics, isVisible }: MetricsDisplayProps) => {
  if (!isVisible || !metrics) {
    return null;
  }

  const metricCards = [
    {
      title: 'Encryption Time',
      value: `${metrics.encryptionTime.toFixed(2)}ms`,
      icon: Clock,
      description: 'Time taken to encrypt'
    },
    {
      title: 'Decryption Time',
      value: `${metrics.decryptionTime.toFixed(2)}ms`,
      icon: Clock,
      description: 'Time taken to decrypt'
    },
    {
      title: 'PSNR',
      value: `${metrics.psnr.toFixed(2)} dB`,
      icon: Target,
      description: 'Peak Signal-to-Noise Ratio'
    },
    {
      title: 'SSIM',
      value: metrics.ssim.toFixed(4),
      icon: TrendingUp,
      description: 'Structural Similarity Index'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      {metricCards.map((metric, index) => (
        <Card
          key={metric.title}
          className="metrics-card transform transition-all duration-300 hover:scale-105"
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
              <metric.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{metric.title}</p>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-bold text-primary">{metric.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};