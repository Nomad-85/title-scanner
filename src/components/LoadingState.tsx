interface LoadingStateProps {
  status: 'uploading' | 'processing';
  message?: string;
  progress?: number;
}

export default function LoadingState({ status, message, progress }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin">
          <div 
            className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 rounded-full animate-spin"
            style={{ 
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              animationDuration: '1s'
            }}
          />
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">
          {status === 'uploading' ? 'Uploading file...' : 'Processing document...'}
        </p>
        {message && (
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-full max-w-md">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 text-center mt-1">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
} 