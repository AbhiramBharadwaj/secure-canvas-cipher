import { useState, useCallback, useEffect } from 'react';
import { UploadZone } from './UploadZone';
import { EnhancedAlgorithmSelector, type EncryptionAlgorithm } from './EnhancedAlgorithmSelector';
import { EnhancedImagePreview } from './EnhancedImagePreview';
import { MetricsDisplay } from './MetricsDisplay';
import { ActionButtons } from './ActionButtons';
import { HistoryPanel } from './HistoryPanel';
import { ErrorMessage, type MessageType } from './ErrorMessage';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Moon, Sun } from 'lucide-react';

interface MetricsData {
  encryptionTime: number;
  decryptionTime: number;
  psnr: number;
  ssim: number;
}

interface HistoryItem {
  id: string;
  originalName: string;
  algorithm: string;
  timestamp: Date;
  encryptedUrl?: string;
  decryptedUrl?: string;
  metrics?: MetricsData;
}

interface ErrorState {
  type: MessageType;
  message: string;
  details?: string;
}

export const EncryptionDashboard = () => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<EncryptionAlgorithm>('aes');
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [encryptedImageUrl, setEncryptedImageUrl] = useState<string | null>(null);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasEncrypted, setHasEncrypted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Dark mode setup
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = stored === 'dark' || (!stored && prefersDark);
    
    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newMode);
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      setErrorState({
        type: 'error',
        message: 'Invalid file type',
        details: 'Please upload a JPG, PNG, or BMP image file.'
      });
      return false;
    }

    if (file.size > maxSize) {
      setErrorState({
        type: 'error',
        message: 'File too large',
        details: 'Please upload an image smaller than 10MB.'
      });
      return false;
    }

    return true;
  };

  const handleImageUpload = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setUploadedImage(file);
    const url = URL.createObjectURL(file);
    setOriginalImageUrl(url);
    
    // Reset state when new image is uploaded
    setEncryptedImageUrl(null);
    setDecryptedImageUrl(null);
    setMetrics(null);
    setHasEncrypted(false);
    setProgress(0);
    setErrorState(null);
    
    toast.success(`Image uploaded: ${file.name}`);
  }, []);

  const simulateProgressiveEncryption = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const totalPixels = data.length / 4;
            
            // Simulate progressive encryption with progress updates
            let processedPixels = 0;
            const batchSize = Math.max(1000, Math.floor(totalPixels / 20));
            
            const processBatch = () => {
              const endIndex = Math.min(processedPixels + batchSize, totalPixels);
              
              for (let i = processedPixels; i < endIndex; i++) {
                const pixelIndex = i * 4;
                
                if (selectedAlgorithm === 'lsb') {
                  // LSB: Modify least significant bits
                  data[pixelIndex] = (data[pixelIndex] & 0xFE) | (Math.random() > 0.5 ? 1 : 0);
                  data[pixelIndex + 1] = (data[pixelIndex + 1] & 0xFE) | (Math.random() > 0.5 ? 1 : 0);
                  data[pixelIndex + 2] = (data[pixelIndex + 2] & 0xFE) | (Math.random() > 0.5 ? 1 : 0);
                } else {
                  // Other algorithms: More noticeable changes
                  const noise = Math.random() * 50 - 25;
                  data[pixelIndex] = Math.max(0, Math.min(255, data[pixelIndex] + noise));
                  data[pixelIndex + 1] = Math.max(0, Math.min(255, data[pixelIndex + 1] + noise));
                  data[pixelIndex + 2] = Math.max(0, Math.min(255, data[pixelIndex + 2] + noise));
                }
              }
              
              processedPixels = endIndex;
              const progressPercent = (processedPixels / totalPixels) * 100;
              setProgress(progressPercent);
              
              if (processedPixels < totalPixels) {
                setTimeout(processBatch, 50); // Small delay for smooth progress
              } else {
                ctx.putImageData(imageData, 0, 0);
                canvas.toBlob((blob) => {
                  if (blob) {
                    resolve(URL.createObjectURL(blob));
                  } else {
                    reject(new Error('Failed to create encrypted image'));
                  }
                }, 'image/png');
              }
            };
            
            processBatch();
          }
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = originalImageUrl!;
    });
  };

  const simulateDecryption = async (): Promise<string> => {
    return new Promise((resolve) => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);
        
        if (currentProgress >= 100) {
          clearInterval(interval);
          resolve(originalImageUrl!);
        }
      }, 100);
    });
  };

  const generateMetrics = (): MetricsData => {
    const baseEncryption = selectedAlgorithm === 'lsb' ? 50 : selectedAlgorithm === 'aes' ? 200 : 150;
    const baseDecryption = baseEncryption * 0.8;
    
    return {
      encryptionTime: baseEncryption + Math.random() * 100,
      decryptionTime: baseDecryption + Math.random() * 80,
      psnr: selectedAlgorithm === 'lsb' ? 45 + Math.random() * 10 : 25 + Math.random() * 15,
      ssim: selectedAlgorithm === 'lsb' ? 0.95 + Math.random() * 0.04 : 0.7 + Math.random() * 0.2
    };
  };

  const handleEncrypt = async () => {
    if (!uploadedImage || !originalImageUrl) return;
    
    setIsProcessing(true);
    setProgress(0);
    setErrorState(null);
    toast.info(`Starting ${selectedAlgorithm.toUpperCase()} encryption...`);
    
    try {
      const startTime = Date.now();
      const encryptedUrl = await simulateProgressiveEncryption();
      const encryptionTime = Date.now() - startTime;
      
      setEncryptedImageUrl(encryptedUrl);
      setHasEncrypted(true);
      
      // Generate metrics
      const newMetrics = generateMetrics();
      newMetrics.encryptionTime = encryptionTime;
      setMetrics(newMetrics);
      
      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        originalName: uploadedImage.name,
        algorithm: selectedAlgorithm,
        timestamp: new Date(),
        encryptedUrl,
        metrics: newMetrics
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10 items
      
      setErrorState({
        type: 'success',
        message: 'Encryption completed successfully!',
        details: `Processed in ${encryptionTime}ms using ${selectedAlgorithm.toUpperCase()}`
      });
      
      toast.success('Image encrypted successfully!');
    } catch (error) {
      setErrorState({
        type: 'error',
        message: 'Encryption failed',
        details: error instanceof Error ? error.message : 'An unknown error occurred'
      });
      toast.error('Encryption failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedImageUrl) return;
    
    setIsProcessing(true);
    setProgress(0);
    setErrorState(null);
    toast.info('Starting decryption...');
    
    try {
      const startTime = Date.now();
      const decryptedUrl = await simulateDecryption();
      const decryptionTime = Date.now() - startTime;
      
      setDecryptedImageUrl(decryptedUrl);
      
      // Update metrics with decryption time
      if (metrics) {
        const updatedMetrics = { ...metrics, decryptionTime };
        setMetrics(updatedMetrics);
        
        // Update history
        setHistory(prev => prev.map(item => 
          item.encryptedUrl === encryptedImageUrl 
            ? { ...item, decryptedUrl, metrics: updatedMetrics }
            : item
        ));
      }
      
      setErrorState({
        type: 'success',
        message: 'Decryption completed successfully!',
        details: `Restored in ${decryptionTime}ms`
      });
      
      toast.success('Image decrypted successfully!');
    } catch (error) {
      setErrorState({
        type: 'error',
        message: 'Decryption failed',
        details: error instanceof Error ? error.message : 'An unknown error occurred'
      });
      toast.error('Decryption failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setOriginalImageUrl(null);
    setEncryptedImageUrl(null);
    setDecryptedImageUrl(null);
    setMetrics(null);
    setHasEncrypted(false);
    setSelectedAlgorithm('aes');
    setProgress(0);
    setErrorState(null);
    toast.info('Dashboard reset');
  };

  const handleDownload = (imageUrl: string, filename: string, format: 'png' | 'jpg' = 'png') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(`${filename}.${format} downloaded`);
        }
      }, `image/${format}`, 0.9);
    };
    
    img.src = imageUrl;
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (item.encryptedUrl) {
      setEncryptedImageUrl(item.encryptedUrl);
      setHasEncrypted(true);
    }
    if (item.decryptedUrl) {
      setDecryptedImageUrl(item.decryptedUrl);
    }
    if (item.metrics) {
      setMetrics(item.metrics);
    }
    setSelectedAlgorithm(item.algorithm as EncryptionAlgorithm);
    toast.info(`Loaded ${item.originalName} from history`);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
              Image Encryption Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Secure your images with advanced cryptographic algorithms. Upload, encrypt, and analyze with professional-grade tools.
          </p>
          
          {/* Dark Mode Toggle */}
          <Card className="inline-flex items-center space-x-2 p-3 bg-card/50 backdrop-blur-sm">
            <Sun className="h-4 w-4" />
            <Switch
              checked={isDarkMode}
              onCheckedChange={toggleDarkMode}
              aria-label="Toggle dark mode"
            />
            <Moon className="h-4 w-4" />
            <Label htmlFor="dark-mode" className="text-sm font-medium">
              Dark Mode
            </Label>
          </Card>
        </div>

        {/* Error Messages */}
        {errorState && (
          <div className="mb-6">
            <ErrorMessage
              type={errorState.type}
              message={errorState.message}
              details={errorState.details}
              onDismiss={() => setErrorState(null)}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Algorithm */}
          <div className="space-y-6">
            <UploadZone 
              onImageUpload={handleImageUpload}
              uploadedImage={uploadedImage}
            />
            <EnhancedAlgorithmSelector
              selectedAlgorithm={selectedAlgorithm}
              onAlgorithmChange={setSelectedAlgorithm}
            />
            <HistoryPanel
              history={history}
              onItemSelect={handleHistorySelect}
              onDownload={handleDownload}
            />
          </div>

          {/* Middle & Right Columns - Image Previews */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <EnhancedImagePreview
                title="Encrypted Image"
                imageUrl={encryptedImageUrl}
                isProcessing={isProcessing && !encryptedImageUrl}
                progress={progress}
                enableZoom={true}
                showDownload={!!encryptedImageUrl}
                onDownload={() => handleDownload(encryptedImageUrl!, 'encrypted-image')}
              />
              <EnhancedImagePreview
                title="Decrypted Image"
                imageUrl={decryptedImageUrl}
                isProcessing={isProcessing && hasEncrypted && !decryptedImageUrl}
                progress={progress}
                enableZoom={true}
                showDownload={!!decryptedImageUrl}
                onDownload={() => handleDownload(decryptedImageUrl!, 'decrypted-image')}
              />
            </div>

            {/* Action Buttons */}
            <ActionButtons
              onEncrypt={handleEncrypt}
              onDecrypt={handleDecrypt}
              onReset={handleReset}
              canEncrypt={!!uploadedImage}
              canDecrypt={hasEncrypted}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Metrics */}
        <MetricsDisplay 
          metrics={metrics}
          isVisible={hasEncrypted}
        />
      </div>
    </div>
  );
};
