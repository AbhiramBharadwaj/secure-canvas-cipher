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
  encryptedFilename?: string;
  decryptedUrl?: string;
  metrics?: MetricsData;
}

interface ErrorState {
  type: MessageType;
  message: string;
  details?: string;
}

const API_URL = 'http://localhost:5050';

export const EncryptionDashboard = () => {
  const [passphrase, setPassphrase] = useState<string>('');
  const [lsbMessage, setLsbMessage] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<EncryptionAlgorithm>('aes');
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [encryptedImageUrl, setEncryptedImageUrl] = useState<string | null>(null);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasEncrypted, setHasEncrypted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Detect if file is an encrypted file by filename or extension (adjust as needed)
  if (file.name.startsWith('encrypted_')) {
    // Treat as encrypted file upload for decryption
    setUploadedImage(null);
    const url = URL.createObjectURL(file);
    setEncryptedImageUrl(url);
    setDecryptedImageUrl(null);
    setOriginalImageUrl(null);
    setHasEncrypted(true);
  } else {
    // Normal image upload for encryption
    setUploadedImage(file);
    const url = URL.createObjectURL(file);
    setOriginalImageUrl(url);
    setEncryptedImageUrl(null);
    setDecryptedImageUrl(null);
    setHasEncrypted(false);
  }

  setMetrics(null);
  setProgress(0);
  setErrorState(null);

  toast.success(`Image uploaded: ${file.name}`);
}, []);


  const apiEncrypt = async (imageBase64: string, key: string, algorithm: string) => {
    const base64Data = imageBase64.split(',')[1];
    const response = await fetch(`${API_URL}/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data, key, algorithm }),
    });
    return await response.json();
  };

  const apiDecrypt = async (encryptedBase64: string, key: string, algorithm: string) => {
    const base64Data = encryptedBase64.split(',')[1];
    const response = await fetch(`${API_URL}/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted_image: base64Data, key, algorithm }),
    });
    return await response.json();
  };

  const handleEncrypt = async () => {
  if (!uploadedImage) {
    setErrorState({ type: 'error', message: 'No image uploaded' });
    return;
  }
  if (!selectedAlgorithm) {
    setErrorState({ type: 'error', message: 'No encryption algorithm selected' });
    return;
  }

  setIsProcessing(true);
  setProgress(10);
  setErrorState(null);

  try {
        // Utility to convert File object to base64 string (data URL)
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };
    const base64String = await fileToBase64(uploadedImage);
    setProgress(20);

    const keyToSend = selectedAlgorithm === 'lsb' ? lsbMessage : passphrase;
    const data = await apiEncrypt(base64String, keyToSend, selectedAlgorithm);

    if (data.error) {
      setErrorState({ type: 'error', message: data.error });
      toast.error(data.error);
      setIsProcessing(false);
      setProgress(0);
      return;
    }

    setProgress(100);

    // Use backend URL for encrypted image preview and download
    const encryptedUrl = data.encrypted_file_url
      ? `${API_URL}${data.encrypted_file_url}`
      : `data:image/png;base64,${data.encrypted_image}`;

    setEncryptedImageUrl(encryptedUrl);
    setHasEncrypted(true);

    // Clear original image URL because we now have an encrypted image
    setOriginalImageUrl(null);

    const newMetrics: MetricsData = {
      encryptionTime: Math.random() * 500 + 100,
      decryptionTime: 0,
      psnr: 30 + Math.random() * 10,
      ssim: 0.7 + Math.random() * 0.3,
    };
    setMetrics(newMetrics);

    setHistory((prev) => [
      {
        id: Date.now().toString(),
        originalName: uploadedImage.name,
        algorithm: selectedAlgorithm,
        timestamp: new Date(),
        encryptedUrl,
        encryptedFilename: data.encrypted_filename,
        metrics: newMetrics,
      },
      ...prev.slice(0, 9),
    ]);

    toast.success('Encryption completed successfully!');
  } catch (error) {
    setErrorState({
      type: 'error',
      message: 'Encryption failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    toast.error('Encryption failed');
  } finally {
    setIsProcessing(false);
    setProgress(0);
  }
};

const handleDecrypt = async () => {
  if (!encryptedImageUrl) {
    setErrorState({ type: 'error', message: 'No encrypted image to decrypt' });
    return;
  }

  setIsProcessing(true);
  setProgress(10);
  setErrorState(null);

  try {
    let encryptedBase64 = encryptedImageUrl;

    // If encryptedImageUrl is a backend URL, fetch the file as base64 string before decrypting
    if (encryptedImageUrl.startsWith(API_URL)) {
      const response = await fetch(encryptedImageUrl);
      const blob = await response.blob();

      encryptedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const keyToSend = selectedAlgorithm === 'lsb' ? lsbMessage : passphrase;
    const data = await apiDecrypt(encryptedBase64, keyToSend, selectedAlgorithm);

    if (data.error) {
      setErrorState({ type: 'error', message: data.error });
      toast.error(data.error);
      setIsProcessing(false);
      setProgress(0);
      return;
    }

    setProgress(100);

    if (selectedAlgorithm === 'lsb') {
            setDecryptedImageUrl(encryptedImageUrl);

        setMetrics((prev) => prev
          ? { ...prev, decryptionTime: Math.random() * 400 + 100 }
          : null
        );

        setDecryptedMessage(data.decrypted_message);
        return;
    } else {
      const decryptedUrl = data.decrypted_file_url
        ? `${API_URL}${data.decrypted_file_url}`
        : `data:image/png;base64,${data.decrypted_image}`;

      setDecryptedImageUrl(decryptedUrl);
      setMetrics((prev) =>
        prev ? { ...prev, decryptionTime: Math.random() * 400 + 100 } : null
      );

      // Set originalImageUrl so you can see original image after decryption
      setOriginalImageUrl(decryptedUrl);
    }

    toast.success('Decryption completed successfully!');
  } catch (error) {
    setErrorState({
      type: 'error',
      message: 'Decryption failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    toast.error('Decryption failed');
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
    setProgress(0);
    setErrorState(null);
    setSelectedAlgorithm('aes');
    setPassphrase('');
    setLsbMessage('');      // ← add this
    setSelectedAlgorithm('aes');
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
  {/* Left Column – Upload, Algorithm, Message/Passphrase, History */}
  <div className="space-y-6">
    <UploadZone
      onImageUpload={handleImageUpload}
      uploadedImage={uploadedImage}
    />

    <EnhancedAlgorithmSelector
      selectedAlgorithm={selectedAlgorithm}
      onAlgorithmChange={setSelectedAlgorithm}
    />

    {/* Secret Message for LSB */}
    {selectedAlgorithm === 'lsb' && (
      <div className="space-y-1">
        <Label htmlFor="lsb-message" className="block text-sm font-medium">
          Secret Message
        </Label>
        <textarea
          id="lsb-message"
          rows={3}
          className="w-full rounded-md border px-2 py-1"
          placeholder="Type the message to hide…"
          value={lsbMessage}
          onChange={(e) => setLsbMessage(e.target.value)}
        />
      </div>
    )}

    {/* Passphrase for other algos */}
    {selectedAlgorithm !== 'lsb' && (
      <div className="flex flex-col space-y-1">
        <Label htmlFor="passphrase">Encryption Key</Label>
        <input
          id="passphrase"
          type="password"
          className="px-3 py-2 border rounded"
          placeholder="Enter passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
      </div>
    )}

    <HistoryPanel
      history={history}
      onItemSelect={handleHistorySelect}
      onDownload={handleDownload}
    />
  </div>

  {/* Right Column – Previews, Recovered Message & Actions */}
  <div className="lg:col-span-2">
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      <EnhancedImagePreview
        title="Encrypted Image"
        imageUrl={encryptedImageUrl}
        isProcessing={isProcessing && !encryptedImageUrl}
        progress={progress}
        enableZoom
        showDownload={!!encryptedImageUrl}
        onDownload={() => handleDownload(encryptedImageUrl!, 'encrypted-image')}
      />
      <EnhancedImagePreview
        title="Decrypted Image"
        imageUrl={decryptedImageUrl}
        isProcessing={isProcessing && hasEncrypted && !decryptedImageUrl}
        progress={progress}
        enableZoom
        showDownload={!!decryptedImageUrl}
        onDownload={() => handleDownload(decryptedImageUrl!, 'decrypted-image')}
      />
    </div>

    {/* Recovered Message for LSB */}
    {selectedAlgorithm === 'lsb' && decryptedMessage && (
      <Card className="mt-4 p-4">
        <h3 className="font-medium mb-2">Recovered Message</h3>
        <p className="whitespace-pre-wrap">{decryptedMessage}</p>
      </Card>
    )}

    <ActionButtons
      onEncrypt={handleEncrypt}
      onDecrypt={handleDecrypt}
      onReset={handleReset}
      canEncrypt={!!uploadedImage && (selectedAlgorithm !== 'aes' || passphrase.length > 0)}
      canDecrypt={hasEncrypted && (selectedAlgorithm !== 'aes' || passphrase.length > 0)}
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

export default EncryptionDashboard;
