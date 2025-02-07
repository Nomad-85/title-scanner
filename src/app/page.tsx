'use client';

import { useState } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import 'filepond/dist/filepond.min.css';
import { ProcessingStatus, ExtractedVIN } from '@/types';
import LoadingState from '@/components/LoadingState';
import { utils, writeFile } from 'xlsx';

registerPlugin(FilePondPluginFileValidateType);

export default function Home() {
  const [status, setStatus] = useState<ProcessingStatus>({
    currentPage: 0,
    totalPages: 0,
    status: 'idle'
  });
  const [results, setResults] = useState<ExtractedVIN[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const downloadResults = () => {
    if (results.length === 0) return;

    const worksheet = utils.json_to_sheet(results.map(r => ({
      'Page Number': r.pageNumber,
      'VIN': r.vin,
      'Confidence': r.confidence
    })));
    
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'VINs');
    writeFile(workbook, 'extracted_vins.xlsx');
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">VIN Extractor</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        <div className="mb-8">
          <FilePond
            allowMultiple={false}
            acceptedFileTypes={['application/pdf']}
            server={{
              process: async (fieldName, file, metadata, load, error, progress) => {
                try {
                  setStatus({ status: 'processing', currentPage: 0, totalPages: 1 });
                  setError(null);
                  setProcessedImage(null);
                  setImageLoading(true);
                  
                  const formData = new FormData();
                  formData.append('file', file);

                  try {
                    const response = await fetch('http://localhost:8000/api/process', {
                      method: 'POST',
                      body: formData,
                      headers: {
                        'Accept': 'application/json',
                      },
                      mode: 'cors'
                    });

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({
                        detail: {
                          message: 'Unknown server error',
                          error: `HTTP ${response.status}`
                        }
                      }));
                      
                      console.error('Server error:', errorData);
                      
                      const errorMessage = typeof errorData.detail === 'object' 
                        ? `${errorData.detail.message}: ${errorData.detail.error}`
                        : errorData.detail || `Server error (${response.status}): Please ensure Tesseract and Poppler are installed`;
                      
                      throw new Error(errorMessage);
                    }

                    const data = await response.json();
                    console.log('Processing results:', data);

                    if (data.processedImage) {
                      setProcessedImage(data.processedImage);
                    }

                    if (data.success) {
                      setResults(data.vins);
                      setStatus({ status: 'complete', currentPage: 1, totalPages: 1 });
                      load(data);
                    } else {
                      setError(data.error?.message || 'Failed to process file');
                      error('Processing failed');
                    }
                  } catch (networkError) {
                    console.error('Network error:', networkError);
                    setError(networkError.message || 'Failed to connect to processing server. Please ensure the Python backend is running.');
                    error('Connection failed');
                  }
                } catch (err) {
                  console.error('Error:', err);
                  setError(err instanceof Error ? err.message : 'Failed to process file');
                  setStatus({ status: 'error', currentPage: 0, totalPages: 0 });
                  error('Failed to process file');
                } finally {
                  setImageLoading(false);
                }
              }
            }}
            labelIdle='Drag & Drop your PDF or <span class="filepond--label-action">Browse</span>'
          />
        </div>

        {status.status === 'processing' && (
          <LoadingState status="processing" message="Processing document..." />
        )}

        {processedImage && (
          <div className="mt-8 border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Processed Image</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    window.open(processedImage, '_blank');
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  View Full Size
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = processedImage;
                    link.download = 'processed-image.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Download Image
                </button>
              </div>
            </div>
            <div className="relative">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              )}
              <img 
                src={processedImage} 
                alt="Processed document"
                className="max-w-full h-auto rounded"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setError('Failed to load processed image');
                }}
              />
              <p className="mt-2 text-sm text-gray-600">
                This is the processed image that OCR is analyzing. If the VIN is not being detected, 
                check if it's clearly visible in this image.
              </p>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Extracted VINs</h2>
              <button
                onClick={downloadResults}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Download Excel
              </button>
            </div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">{result.pageNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">{result.vin}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{Math.round(result.confidence * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 