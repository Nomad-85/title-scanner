import { useState } from 'react';
import { ExtractedVIN } from '@/types';
import { utils, writeFile } from 'xlsx';
import VINReviewModal from './VINReviewModal';

interface ResultsTableProps {
  results: ExtractedVIN[];
  onUpdateVin: (pageNumber: number, newVin: string) => void;
  pageImages: { [key: number]: string }; // Base64 encoded images
}

export default function ResultsTable({ results, onUpdateVin, pageImages }: ResultsTableProps) {
  const [reviewVin, setReviewVin] = useState<ExtractedVIN | null>(null);

  const downloadExcel = () => {
    const worksheet = utils.json_to_sheet(results);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'VINs');
    writeFile(workbook, 'extracted_vins.xlsx');
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Extracted VINs</h2>
        <button
          onClick={downloadExcel}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Download Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b text-left">Page</th>
              <th className="px-6 py-3 border-b text-left">VIN</th>
              <th className="px-6 py-3 border-b text-left">Confidence</th>
              <th className="px-6 py-3 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.pageNumber} className="hover:bg-gray-50">
                <td className="px-6 py-4 border-b">{result.pageNumber}</td>
                <td className="px-6 py-4 border-b font-mono">{result.vin}</td>
                <td className="px-6 py-4 border-b">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${
                          result.confidence >= 90 ? 'bg-green-600' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                    {result.confidence}%
                  </div>
                </td>
                <td className="px-6 py-4 border-b">
                  <button
                    onClick={() => setReviewVin(result)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewVin && (
        <VINReviewModal
          pageNumber={reviewVin.pageNumber}
          originalVin={reviewVin.vin}
          confidence={reviewVin.confidence}
          imageData={pageImages[reviewVin.pageNumber]}
          onSave={onUpdateVin}
          onClose={() => setReviewVin(null)}
        />
      )}
    </div>
  );
} 