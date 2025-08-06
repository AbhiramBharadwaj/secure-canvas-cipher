import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

interface ErrorMessageProps {
  type: MessageType;
  message: string;
  details?: string;
  onDismiss?: () => void;
}

const getMessageConfig = (type: MessageType) => {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        className: 'border-green-500/50 bg-green-50/50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
        iconClassName: 'text-green-500'
      };
    case 'error':
      return {
        icon: XCircle,
        className: 'border-red-500/50 bg-red-50/50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
        iconClassName: 'text-red-500'
      };
    case 'warning':
      return {
        icon: AlertCircle,
        className: 'border-yellow-500/50 bg-yellow-50/50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
        iconClassName: 'text-yellow-500'
      };
    case 'info':
      return {
        icon: Info,
        className: 'border-blue-500/50 bg-blue-50/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
        iconClassName: 'text-blue-500'
      };
    default:
      return {
        icon: Info,
        className: 'border-border bg-card/50',
        iconClassName: 'text-muted-foreground'
      };
  }
};

export const ErrorMessage = ({ type, message, details, onDismiss }: ErrorMessageProps) => {
  const config = getMessageConfig(type);
  const Icon = config.icon;

  return (
    <Alert className={`animate-fade-in transition-all duration-300 ${config.className}`}>
      <Icon className={`h-4 w-4 ${config.iconClassName}`} />
      <AlertDescription className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {details && (
            <p className="text-sm opacity-80 mt-1">{details}</p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};