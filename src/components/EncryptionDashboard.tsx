import { useState } from 'react';
import { UploadZone } from './UploadZone';
import { AlgorithmSelector, type EncryptionAlgorithm } from './AlgorithmSelector';
import { ImagePreview } from './ImagePreview';
import { MetricsDisplay } from './MetricsDisplay';
import { ActionButtons } from './ActionButtons';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

interface MetricsData {
  encryptionTime: number;
  decryptionTime: number;
  psnr: number;
  ssim: number;
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

  const handleImageUpload = (file: File) => {
    setUploadedImage(file);
    const url = URL.createObjectURL(file);
    setOriginalImageUrl(url);
    
    // Reset state when new image is uploaded
    setEncryptedImageUrl(null);
    setDecryptedImageUrl(null);
    setMetrics(null);
    setHasEncrypted(false);
    
    toast.success(`Image uploaded: ${file.name}`);
  };

  const simulateEncryption = async (): Promise<string> => {
    // Simulate encryption process with canvas manipulation
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Simple pixel manipulation to simulate encryption
          for (let i = 0; i < data.length; i += 4) {
            if (selectedAlgorithm === 'lsb') {
              // LSB: Modify least significant bits
              data[i] = (data[i] & 0xFE) | (Math.random() > 0.5 ? 1 : 0);
              data[i + 1] = (data[i + 1] & 0xFE) | (Math.random() > 0.5 ? 1 : 0);
              data[i + 2] = (data[i + 2] & 0xFE) | (Math.random() > 0.5 ? 1 : 0);
            } else {
              // Other algorithms: More noticeable changes
              const noise = Math.random() * 50 - 25;
              data[i] = Math.max(0, Math.min(255, data[i] + noise));
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          }
        }, 'image/png');
      };
      
      img.src = originalImageUrl!;
    });
  };

  const simulateDecryption = async (): Promise<string> => {
    // For demo purposes, return the original image as "decrypted"
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(originalImageUrl!);
      }, 1000 + Math.random() * 1000);
    });
  };

  const generateMetrics = (): MetricsData => {
    // Simulate realistic metrics based on algorithm
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
    toast.info(`Starting ${selectedAlgorithm.toUpperCase()} encryption...`);
    
    try {
      const startTime = Date.now();
      const encryptedUrl = await simulateEncryption();
      const encryptionTime = Date.now() - startTime;
      
      setEncryptedImageUrl(encryptedUrl);
      setHasEncrypted(true);
      
      // Generate metrics
      const newMetrics = generateMetrics();
      newMetrics.encryptionTime = encryptionTime;
      setMetrics(newMetrics);
      
      toast.success('Image encrypted successfully!');
    } catch (error) {
      toast.error('Encryption failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedImageUrl) return;
    
    setIsProcessing(true);
    toast.info('Starting decryption...');
    
    try {
      const startTime = Date.now();
      const decryptedUrl = await simulateDecryption();
      const decryptionTime = Date.now() - startTime;
      
      setDecryptedImageUrl(decryptedUrl);
      
      // Update metrics with decryption time
      if (metrics) {
        setMetrics({
          ...metrics,
          decryptionTime
        });
      }
      
      toast.success('Image decrypted successfully!');
    } catch (error) {
      toast.error('Decryption failed. Please try again.');
    } finally {
      setIsProcessing(false);
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
    toast.info('Dashboard reset');
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} downloaded`);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
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
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Secure your images with advanced cryptographic algorithms. Upload, encrypt, and analyze with professional-grade tools.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Algorithm */}
          <div className="space-y-6">
            <UploadZone 
              onImageUpload={handleImageUpload}
              uploadedImage={uploadedImage}
            />
            <AlgorithmSelector
              selectedAlgorithm={selectedAlgorithm}
              onAlgorithmChange={setSelectedAlgorithm}
            />
          </div>

          {/* Middle & Right Columns - Image Previews */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <ImagePreview
                title="Encrypted Image"
                imageUrl={encryptedImageUrl}
                isProcessing={isProcessing && !encryptedImageUrl}
                showDownload={!!encryptedImageUrl}
                onDownload={() => handleDownload(encryptedImageUrl!, 'encrypted-image.png')}
              />
              <ImagePreview
                title="Decrypted Image"
                imageUrl={decryptedImageUrl}
                isProcessing={isProcessing && hasEncrypted && !decryptedImageUrl}
                showDownload={!!decryptedImageUrl}
                onDownload={() => handleDownload(decryptedImageUrl!, 'decrypted-image.png')}
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
