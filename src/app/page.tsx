'use client';

import { useState, useCallback } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import 'filepond/dist/filepond.min.css';
import { ProcessingStatus, ExtractedVIN, ProcessingError } from '@/types';
import ProgressBar from '@/components/ProgressBar';
import ResultsTable from '@/components/ResultsTable';
import LoadingState from '@/components/LoadingState';
import { ErrorResponse } from '@/utils/errorHandling';

registerPlugin(FilePondPluginFileValidateType);

export default function Home() {
  const [status, setStatus] = useState<ProcessingStatus>({
    currentPage: 0,
    totalPages: 0,
    status: 'idle'
  });
  const [results, setResults] = useState<ExtractedVIN[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pageImages, setPageImages] = useState<{ [key: number]: string }>({});

  const updateProgress = useCallback((current: number, total: number) => {
    setStatus(prev => ({
      ...prev,
      currentPage: current,
      totalPages: total,
      progress: (current / total) * 100
    }));
  }, []);

  const handleProcessFile = async (error: any, file: any) => {
    if (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
      return;
    }

    setError(null);
    setStatus({
      currentPage: 0,
      totalPages: 0,
      status: 'uploading',
      message: 'Preparing file for processing...'
    });

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: file.file,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setStatus(prev => ({
              ...prev,
              progress,
              message: `Uploading file: ${Math.round(progress)}%`
            }));
          }
        }
      });

      setStatus(prev => ({
        ...prev,
        status: 'processing',
        message: 'Analyzing document...'
      }));

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        throw new Error(errorData.error.message);
      }

      setResults(data.vins);
      setPageImages(data.pageImages);
      
      if (data.errors?.length > 0) {
        setError(
          `Warning: Some pages had issues:\n${data.errors
            .map((e: ProcessingError) => `Page ${e.page}: ${e.error}`)
            .join('\n')}`
        );
      }

      setStatus(prev => ({
        ...prev,
        status: 'complete'
      }));
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setResults([]);
      setStatus(prev => ({
        ...prev,
        status: 'error'
      }));
    }
  };

  const handleVinUpdate = (pageNumber: number, newVin: string) => {
    setResults(prev => 
      prev.map(result => 
        result.pageNumber === pageNumber 
          ? { ...result, vin: newVin }
          : result
      )
    );
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">VIN Extractor</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        <div className="mb-8">
          <FilePond
            allowMultiple={false}
            acceptedFileTypes={['application/pdf']}
            onprocessfile={handleProcessFile}
            labelIdle='Drag & Drop your PDF or <span class="filepond--label-action">Browse</span>'
            disabled={status.status === 'uploading' || status.status === 'processing'}
          />
        </div>

        {(status.status === 'uploading' || status.status === 'processing') && (
          <LoadingState
            status={status.status}
            message={status.message}
            progress={status.progress}
          />
        )}

        {status.status === 'complete' && results.length > 0 && (
          <ResultsTable
            results={results}
            onUpdateVin={handleVinUpdate}
            pageImages={pageImages}
          />
        )}
      </div>
    </main>
  );
} 