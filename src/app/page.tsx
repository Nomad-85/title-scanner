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

  const downloadResults = () => {
    if (results.length === 0) return;

    const worksheet = utils.json_to_sheet(results.map(r => ({
      'Page Number': r.pageNumber,
      'VIN': r.vin
    })));
    
    const colWidths = [
      { wch: 12 },
      { wch: 20 },
    ];
    worksheet['!cols'] = colWidths;
    
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'VINs');
    writeFile(workbook, 'extracted_vins.xlsx');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tesla VIN Extractor</h1>
          <p className="text-gray-600">Upload vehicle title PDFs to extract VINs automatically</p>
        </div>
        
        {error && (
          <div className="mb-8 mx-auto max-w-3xl">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 mx-auto max-w-3xl">
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <FilePond
                allowMultiple={false}
                acceptedFileTypes={['application/pdf']}
                server={{
                  process: async (fieldName, file, metadata, load, error, progress) => {
                    try {
                      setStatus({ status: 'processing', currentPage: 0, totalPages: 1 });
                      setError(null);
                      
                      const formData = new FormData();
                      formData.append('file', file);

                      try {
                        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url.onrender.com';

                        const response = await fetch(`${API_URL}/api/process`, {
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
                          throw new Error(errorData?.detail?.message || `Server error (${response.status})`);
                        }

                        const data = await response.json();
                        console.log('Processing results:', data);

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
                        setError(networkError.message || 'Failed to connect to processing server');
                        error('Connection failed');
                      }
                    } catch (err) {
                      console.error('Error:', err);
                      setError(err instanceof Error ? err.message : 'Failed to process file');
                      setStatus({ status: 'error', currentPage: 0, totalPages: 0 });
                      error('Failed to process file');
                    }
                  }
                }}
                labelIdle='<span class="filepond--label-action">Upload PDF</span> or drag & drop'
                className="custom-filepond"
              />
            </div>
          </div>
        </div>

        {status.status === 'processing' && (
          <div className="flex justify-center mb-8">
            <LoadingState status="processing" message="Processing document..." />
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white shadow rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Extracted VINs</h2>
              <button
                onClick={downloadResults}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VIN
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.pageNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                        {result.vin}
                      </td>
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